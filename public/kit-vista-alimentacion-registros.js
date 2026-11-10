(function (root) {
  'use strict';
  // E61 (8-nov): Alimentación por secciones de los Módulos I y IV (réplica del Módulo II, E60).
  // En estos módulos se califican registros que ya existen (actores, riesgos). Cada sección lista sus registros y deja
  // calificarlos en el sitio. Cada registro se guarda solo, validado con las funciones del contrato (KitActores.validar,
  // KitRiesgos.preparar), y sus evidencias por enlace van en <modulo>-evidencias. El avance va en <modulo>-avance.
  // Registrar, editar a fondo o borrar registros sigue en el editor de siempre ("Registrar, editar o borrar").
  // Mientras haya un proceso abierto, la pestaña Resultados muestra "En proceso" (kit-vista-portada-resultados.js).
  const vacio = v => v === undefined || v === null || v === '';
  const json = async ruta => { const r = await root.fetch(ruta); if (!r.ok) throw Error('No se pudo cargar ' + ruta); return r.json(); };
  const hora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const enlaceValido = u => typeof u === 'string' && u.length <= 500 && /^https?:\/\/[^\s]+\.[^\s]+$/i.test(u.trim());
  const ESTADO = { 'sin-empezar': 'Sin empezar', 'en-curso': 'En curso', completa: 'Completa' };

  // ---------- Configuración de cada módulo ----------
  // secciones(listas) -> [{ id, titulo, items: [{ id, titulo, sub, registro }], campos, completo(item), guardar }]
  // campo: { id, etiqueta, tipo: 'escala' | 'lista' | 'texto', niveles: [{ valor, descripcion }], valores }
  const MODULOS = {
    async actores(d, p) {
      const [cfg, esquema] = await Promise.all([json('config/kit-actores-config.json'), json('config/esquemas/actores.json')]);
      const ejes = ['influencia', 'impacto', 'dependencia', 'tension', 'responsabilidad'];
      const campos = [...ejes.map(k => ({ id: k, etiqueta: esquema.campos[k].etiqueta, tipo: 'escala', niveles: (cfg.escalas[k] || []).map((t, i) => ({ valor: i + 1, descripcion: t })) })),
        { id: 'posicion', etiqueta: esquema.campos.posicion.etiqueta, tipo: 'lista', valores: esquema.campos.posicion.valores }];
      const completo = it => ejes.every(k => !vacio(it.registro[k])) && !vacio(it.registro.posicion);
      return {
        romano: 'I', unidad: 'actores', colecciones: ['actores'],
        secciones: L => esquema.campos.categoria.valores.map((cat, k) => ({
          id: 'cat-' + (k + 1), titulo: cat, campos, completo,
          items: (L.actores || []).filter(a => a.categoria === cat).sort((a, b) => String(a.institucion).localeCompare(String(b.institucion), 'es'))
            .map(a => ({ id: a.id, titulo: a.institucion, sub: [a.cargo, a.dependencia_area].filter(Boolean).join(', '), registro: a })) })).filter(s => s.items.length),
        async guardar(it) {
          const r = root.KitActores.validar(it.registro, cfg, esquema, 'manual');
          if (!r.ok) throw Error(r.errores.map(e => e.mensaje).join(' '));
          await d.guardar(p.empresa, 'actores', it.id, { ...it.registro, ...r.registro, id: it.id });
        }
      };
    },
    async riesgos(d, p) {
      const [cfg, crit, esqR, esqC, esqV, esqM] = await Promise.all([json('config/kit-riesgos-config.json'), json('config/criticidad-config.json'),
        ...['riesgos', 'riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas'].map(n => json('config/esquemas/' + n + '.json'))]);
      const P = crit.gravedad?.parametros || {}, limpio = t => String(t || '').replace(/\s*\/\/\s*/g, '. ').replace(/\s+/g, ' ').trim();
      const nivelesDe = k => (P[k] || P[{ irremediabilidad: 'irreparable' }[k]] || []).map(n => ({ valor: n.valor, descripcion: limpio(n.descripcion) })).sort((a, b) => a.valor - b.valor);
      const camposCal = [...cfg.gravedad.criterios.map(k => ({ id: k, etiqueta: esqC.campos[k].etiqueta, tipo: 'escala', niveles: nivelesDe(k) })),
        ...['probabilidad', 'tipo_impacto', 'vinculacion'].map(k => ({ id: k, etiqueta: esqC.campos[k].etiqueta, tipo: 'lista', valores: esqC.campos[k].valores })),
        { id: 'justificacion', etiqueta: esqC.campos.justificacion.etiqueta, tipo: 'texto' }];
      const obligatorios = s => Object.entries(s.campos).filter(([, c]) => c.obligatorio).map(([k]) => k);
      const listas = {};
      return {
        romano: 'IV', unidad: 'riesgos', colecciones: ['riesgos', 'riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas', 'riesgos-grupos'],
        secciones: L => {
          Object.assign(listas, L);
          const riesgos = [...(L.riesgos || [])].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es'));
          const titulo = r => `${r.codigo}. ${r.nombre}`;
          const cal = id => (L['riesgos-calificacion'] || []).find(c => c.riesgo === id) || { riesgo: id };
          return [
            { id: 'identificacion', titulo: 'Identificación de los riesgos', campos: [], items: riesgos.map(r => ({ id: r.id, titulo: titulo(r), sub: r.derecho_humano || '', registro: r })),
              completo: it => obligatorios(esqR).every(k => !vacio(it.registro[k])), ayuda: 'Revise que cada riesgo tenga sus datos obligatorios. Se registran y editan en el editor de abajo.' },
            { id: 'calificacion', titulo: 'Calificación técnica', campos: camposCal, items: riesgos.map(r => ({ id: r.id, titulo: titulo(r), sub: r.derecho_humano || '', registro: cal(r.id), coleccion: 'riesgos-calificacion' })),
              completo: it => obligatorios(esqC).filter(k => k !== 'riesgo').every(k => !vacio(it.registro[k])) },
            { id: 'validacion', titulo: 'Validación con los grupos', campos: [], items: riesgos.map(r => ({ id: r.id, titulo: titulo(r), sub: root.KitRiesgos.validacion(r.id, L['riesgos-validaciones'] || [], cfg).texto, registro: r })),
              completo: it => (L['riesgos-validaciones'] || []).some(v => v.riesgo === it.id), ayuda: 'Cada riesgo debe tener al menos una validación con un grupo. Se registran en el editor de abajo.' },
            { id: 'medidas', titulo: 'Plan de medidas', campos: [], items: riesgos.map(r => { const n = (L['riesgos-medidas'] || []).filter(m => (m.riesgos || []).includes(r.id)).length;
                return { id: r.id, titulo: titulo(r), sub: n ? `${n} ${n === 1 ? 'medida' : 'medidas'}` : 'Sin medidas', registro: r, n }; }),
              completo: it => it.n > 0, ayuda: 'Cada riesgo debe tener al menos una medida. Se registran en el editor de abajo.' }];
        },
        async guardar(it) {
          const original = (listas['riesgos-calificacion'] || []).find(c => c.riesgo === it.id);
          const r = root.KitRiesgos.preparar('riesgos-calificacion', { ...it.registro, riesgo: it.id }, { esquema: esqC, cfg, listas, original, modo: 'formulario' });
          if (!r.ok) throw Error(r.errores.map(e => e.mensaje).join(' '));
          await d.guardar(p.empresa, 'riesgos-calificacion', r.registro.id, r.registro);
          if (!original) (listas['riesgos-calificacion'] ||= []).push(r.registro);
        }
      };
    }
  };

  async function render(modulo, c, d, p, original) {
    const el = root.App.el;
    // E64 (9-nov, Felipe): sin permiso de edición, y en los casos de muestra, la Alimentación se ve como ejemplo de solo
    // lectura (sus Resultados los ven los clientes y no se modifican). Se prueba de verdad en la Empresa de demostración.
    let RO = !p.puedeEditar;
    if (!RO) { const emp = (await d.empresas?.())?.find?.(x => x.id === p.empresa); RO = !!emp?.muestra_comercial && p.empresa !== 'empresa-demo'; }
    const M = await MODULOS[modulo](d, p), AV = modulo + '-avance', EV = modulo + '-evidencias', BO = modulo + '-borrador';
    const cargar = async () => Object.fromEntries(await Promise.all([...M.colecciones, AV, EV, BO].map(async n => [n, RO && [AV, EV, BO].includes(n) ? [] : await d.listar(p.empresa, n)])));
    let L = await cargar();
    if (p.vigente && !p.vigente()) return;
    const zona = el('div', null, 'kit-ali'), otros = el('details', null, 'kit-ali-otros'), cuerpoOriginal = el('div');
    otros.append(el('summary', `Registrar, editar a fondo o borrar ${M.unidad}, y cargar la plantilla de Excel`), cuerpoOriginal);
    c.append(zona); if (!RO) c.append(otros);
    const desmontar = RO ? undefined : await original.render(cuerpoOriginal, d, p);
    const guardarAv = reg => RO ? reg : d.guardar(p.empresa, AV, reg.id, reg);
    // E64 (9-nov, Felipe): agregar un actor (o un riesgo) sin buscar el editor. Abre el editor de abajo en su formulario
    // de alta; al cerrarlo, el tablero se vuelve a calcular con el registro nuevo.
    const agregar = () => { const b = el('button', modulo === 'actores' ? '+ Agregar actor' : '+ Agregar riesgo', 'kit-ali-secundario kit-ali-agregar'); b.type = 'button';
      b.onclick = () => { otros.open = true; const alta = [...(cuerpoOriginal.querySelectorAll?.('button') || [])].find(x => /^(Agregar|Registrar|Nuevo)/.test(String(x.textContent).trim())); if (alta) { alta.click?.(); const f = cuerpoOriginal.querySelector?.('form'); (f || alta).scrollIntoView?.({ block: 'start' }); } else otros.scrollIntoView?.({ block: 'start' }); };
      return b; };
    otros.addEventListener?.('toggle', async () => { if (!otros.open && !RO) { L = await cargar(); tablero(); } });
    const estado = () => { const meta = (L[AV] || []).find(a => a.id === 'evaluacion') || null;
      return { meta, ciclo: meta?.ciclo || 0, enProceso: meta?.estado === 'en-proceso', nueva: meta?.estado === 'en-proceso' && meta?.tipo === 'nueva', sec: id => (L[AV] || []).find(a => a.id === 'sec-' + id && a.ciclo === meta?.ciclo) || { estado: 'sin-empezar' } }; };
    const evidencias = id => (L[EV] || []).find(e => e.id === id)?.enlaces || [];
    // E64: "Nueva evaluación" parte en blanco. Las calificaciones van a <modulo>-borrador y los registros vigentes no se tocan
    // hasta "Terminar". "Editar la evaluación vigente" califica directo sobre los registros (como antes).
    const claveB = (S, x, it) => claveBorrador(S.ciclo, x.id, it.id);
    const secciones = () => { const S = estado(), secs = M.secciones(L); if (!S.nueva) return secs;
      return secs.map(x => !x.campos.length ? x : { ...x, items: x.items.map(it => { const b = (L[BO] || []).find(r => r.id === claveB(S, x, it)), reg = { ...it.registro };
        x.campos.forEach(cp => { reg[cp.id] = b?.valores?.[cp.id]; }); return { ...it, registro: reg, borrador: true }; }) }); };
    const guardarItem = async (x, it) => { const S = estado(); if (RO) return;
      if (!S.nueva) return M.guardar(it);
      const r = { id: claveB(S, x, it), ciclo: S.ciclo, seccion: x.id, item: it.id, valores: Object.fromEntries(x.campos.map(cp => [cp.id, it.registro[cp.id]]).filter(([, v]) => !vacio(v))), actualizado: new Date().toISOString() };
      await d.guardar(p.empresa, BO, r.id, r); const k = (L[BO] ||= []).findIndex(y => y.id === r.id); if (k < 0) L[BO].push(r); else L[BO][k] = r; };
    // Al terminar una evaluación nueva, lo calificado pasa a los registros (validado). Lo que no se calificó conserva su valor.
    async function aplicarBorrador() { const S = estado(); if (!S.nueva) return;
      for (const x of M.secciones(L)) { if (!x.campos.length) continue;
        for (const it of x.items) { const b = (L[BO] || []).find(r => r.id === claveB(S, x, it)); if (!b || !Object.keys(b.valores || {}).length) continue;
          await M.guardar({ ...it, registro: { ...it.registro, ...b.valores } }); } } }
    const cifrasDe = (secs, S) => { const items = secs.flatMap(x => x.items.map(it => ({ x, it }))), hechos = items.filter(({ x, it }) => x.completo(it)).length;
      return { items, hechos, sinEv: items.filter(({ x, it }) => x.campos.length && !evidencias(it.id).length).length, completas: secs.filter(x => S.sec(x.id).estado === 'completa').length }; };

    // Evaluación vigente (sin proceso abierto): avance real de los datos cargados y las dos opciones.
    function opciones(s, S) {
      const secs = M.secciones(L), { items, hechos } = cifrasDe(secs, S);
      s.append(el('h2', RO ? 'Así se alimenta este caso' : 'Evaluación vigente', 'kit-met-titulo'),
        el('p', RO ? 'Caso de muestra: puede recorrer las secciones y ver cómo se calificó cada registro. Sus datos no se modifican desde aquí.'
          : `Los Resultados que se ven hoy salen de estos datos. Puede corregirlos o empezar una evaluación nueva. Para agregar ${M.unidad}, use el editor de abajo.`, 'kit-met-texto'));
      const tiles = el('ul', null, 'kit-met-tiles');
      [[(items.length ? Math.round(hechos * 100 / items.length) : 0) + ' %', 'Datos cargados', `${hechos} de ${items.length} registros con todos sus datos`], [String(secs.length), 'Secciones', 'en que se organiza la calificación']].forEach(([a, r, t]) => {
        const li = el('li'), x = el('div', null, 'kit-met-tile kit-ali-cifra'); x.append(el('span', a, 'kit-met-tile-num'), el('span', r, 'kit-met-tile-rotulo'), el('span', t, 'kit-met-tile-sub')); li.append(x); tiles.append(li); });
      s.append(tiles);
      const dos = el('div', null, 'kit-ali-opciones');
      const tarjeta = (titulo, texto, rotulo, tipo) => {
        const f = el('form', null, 'kit-ali-opcion'), b = el('button', rotulo, 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota'), n = el('input');
        n.type = 'text'; n.maxLength = 80; n.placeholder = tipo === 'nueva' ? 'Nombre, por ejemplo Evaluación 2027' : 'Nombre, por ejemplo Corrección de noviembre'; n.setAttribute('aria-label', 'Nombre de la ' + titulo.toLowerCase());
        b.type = 'submit'; aviso.setAttribute('role', 'status');
        f.append(el('h3', titulo, 'kit-ali-opcion-titulo'), el('p', texto, 'kit-met-texto'), n, b, aviso);
        if (RO) { b.disabled = true; n.disabled = true; aviso.textContent = 'Disponible en la cuenta de la empresa.'; }
        f.onsubmit = async ev => { ev?.preventDefault?.(); if (RO) return; if (!n.value.trim()) { aviso.textContent = 'Escribe un nombre.'; return; }
          b.disabled = true; try { await guardarAv({ id: 'evaluacion', ciclo: S.ciclo + 1, estado: 'en-proceso', tipo, nombre: n.value.trim(), iniciada: new Date().toISOString() }); L = await cargar(); tablero(); }
          catch (e) { aviso.textContent = e.message || 'No se pudo empezar.'; b.disabled = false; } };
        return f; };
      dos.append(tarjeta('Editar la evaluación vigente', 'Corrige o completa los datos ya cargados. El avance parte de lo que ya está.', 'Editar', 'edicion'),
        tarjeta('Nueva evaluación', `Califica de nuevo a los mismos ${M.unidad}, desde cero. Los Resultados vigentes se mantienen hasta terminar; lo que no se califique conserva su valor anterior.`, 'Empezar', 'nueva'));
      s.append(dos); if (!RO) { const fila = el('div', null, 'kit-ali-acciones'); fila.append(agregar()); s.append(fila); }
      return listaSecciones(secs, S, true);
    }
    function listaSecciones(secs, S, vigente) {
      const lista = el('ol', null, 'kit-ali-secciones');
      secs.forEach((x, k) => {
        const n = x.items.filter(it => x.completo(it)).length, st = vigente ? (n === x.items.length ? 'completa' : 'en-curso') : S.sec(x.id).estado, b = el('button', null, 'kit-ali-seccion estado-' + st); b.type = 'button';
        const barra = el('span', null, 'kit-ali-barra'), relleno = el('span'); relleno.style?.setProperty?.('width', (x.items.length ? n * 100 / x.items.length : 0) + '%'); barra.append(relleno);
        b.append(el('span', String(k + 1).padStart(2, '0'), 'kit-mono'), el('span', x.titulo, 'kit-ali-seccion-titulo'), barra, el('span', `${n} de ${x.items.length}`, 'kit-ali-seccion-n'), el('span', vigente ? (st === 'completa' ? 'Con datos' : 'Datos faltantes') : ESTADO[st] || 'En curso', 'kit-ali-estado'));
        b.setAttribute('aria-label', `${x.titulo}: ${n} de ${x.items.length} completos. Abrir la sección`);
        b.onclick = () => seccion(x.id, vigente); const li = el('li'); li.append(b); lista.append(li);
      });
      return lista;
    }

    function tablero() {
      const S = estado(), secs = secciones(), s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-tablero');
      s.append(el('p', RO ? `Módulo ${M.romano}, alimentación de ejemplo` : `Módulo ${M.romano}, alimentación`, 'kit-mono'));
      if (!S.enProceso || RO) { const lista = opciones(s, S); zona.replaceChildren(s, lista); return; }
      const { items, hechos, sinEv, completas } = cifrasDe(secs, S);
      s.append(el('h2', S.meta.nombre, 'kit-met-titulo'), el('p', `${S.nueva ? 'Evaluación nueva, empieza en blanco' : 'Edición de la evaluación vigente'}. En proceso desde ${String(S.meta.iniciada || '').slice(0, 10)}. Lo que se califica queda guardado de inmediato.`, 'kit-met-texto'));
      const tiles = el('ul', null, 'kit-met-tiles');
      [[(items.length ? Math.round(hechos * 100 / items.length) : 0) + ' %', 'Avance', `${hechos} de ${items.length} registros completos`], [`${completas}/${secs.length}`, 'Secciones completas', 'marcadas por la empresa'],
        [String(sinEv), 'Sin evidencia', 'registros calificados sin enlace'], [String(items.length - hechos), 'Por completar', 'registros con datos faltantes']].forEach(([a, r, t]) => {
        const li = el('li'), x = el('div', null, 'kit-met-tile kit-ali-cifra'); x.append(el('span', a, 'kit-met-tile-num'), el('span', r, 'kit-met-tile-rotulo'), el('span', t, 'kit-met-tile-sub')); li.append(x); tiles.append(li); });
      s.append(tiles);
      const acc = el('div', null, 'kit-ali-acciones'), pend = secs.find(x => S.sec(x.id).estado !== 'completa'), aviso = el('p', null, 'kit-met-nota kit-ali-aviso'); aviso.setAttribute('role', 'status');
      if (pend) { const b = el('button', 'Seguir donde quedé', 'kit-met-pastilla'); b.type = 'button'; b.onclick = () => seccion(pend.id); acc.append(b); }
      const fin = el('button', 'Terminar y ver los Resultados', 'kit-met-pastilla kit-ali-calcular'); fin.type = 'button'; fin.disabled = completas < secs.length;
      fin.title = fin.disabled ? 'Se habilita cuando todas las secciones estén completas.' : '';
      fin.onclick = async () => { fin.disabled = true; try { await aplicarBorrador(); await guardarAv({ ...S.meta, estado: 'publicada', publicada: new Date().toISOString() }); L = await cargar(); tablero(); aviso.textContent = 'Listo. Los Resultados ya se ven en la pestaña Resultados.'; }
        catch (e) { aviso.textContent = e.message || 'No se pudo terminar.'; fin.disabled = false; } };
      acc.append(fin, agregar()); s.append(acc, aviso);
      const lista = listaSecciones(secs, S, false);
      zona.replaceChildren(s, lista);
    }

    function seccion(id, vigente = false) {
      const S = estado(), x = (vigente ? M.secciones(L) : secciones()).find(y => y.id === id); if (!x) return tablero();
      const cab = el('section', null, 'kit-banda kit-banda-oscura kit-ali-cabeza'), guardado = el('p', RO || vigente ? 'Vista de consulta: para calificar, abra una evaluación en el tablero.' : x.ayuda || 'Los cambios se guardan solos.', 'kit-met-nota kit-ali-guardado'); guardado.setAttribute('role', 'status');
      const volver = () => { const v = el('button', '← Volver al tablero', 'kit-ali-secundario'); v.type = 'button'; v.onclick = () => tablero(); return v; };
      cab.append(volver(), el('p', 'Sección', 'kit-mono'), el('h2', x.titulo, 'kit-met-titulo'), guardado, ...(RO ? [] : [agregar()]));
      const cuerpo = el('div', null, 'kit-ali-preguntas'), tiempos = new Map();
      const enCurso = async () => { if (RO) return; if (S.sec(x.id).estado === 'sin-empezar') { const a = { id: 'sec-' + x.id, ciclo: S.ciclo, estado: 'en-curso', actualizado: new Date().toISOString() }; await guardarAv(a); (L[AV] ||= []).push(a); } };
      const programar = (it, fn) => { root.clearTimeout?.(tiempos.get(it.id)); tiempos.set(it.id, root.setTimeout(async () => { tiempos.delete(it.id);
        try { await fn(); await enCurso(); guardado.textContent = 'Guardado a las ' + hora(); } catch (e) { guardado.textContent = 'No se guardó ' + it.titulo + ': ' + (e.message || 'error'); } }, 900)); };
      x.items.forEach(it => {
        const caja = el('article', null, 'kit-ali-pregunta' + (x.completo(it) ? ' completo' : '')), cabI = el('header');
        cabI.append(el('span', x.completo(it) ? 'Completo' : 'Por completar', 'kit-mono kit-pro-etiqueta'), el('div'));
        cabI.lastChild.append(el('p', it.titulo, 'kit-ali-texto'), ...(it.sub ? [el('p', it.sub, 'kit-met-nota')] : []));
        caja.append(cabI);
        if (x.campos.length) {
          const reg = it.registro, guardarIt = () => { if (!RO && !vigente) programar(it, () => guardarItem(x, it)); };
          const det = el('div', null, 'kit-ali-detalle');
          x.campos.forEach(cp => {
            if (cp.tipo === 'escala') {
              const fila = el('div', null, 'kit-ali-escala'), n = cp.niveles.length; fila.setAttribute('role', 'radiogroup'); fila.setAttribute('aria-label', cp.etiqueta);
              fila.append(el('span', cp.etiqueta, 'kit-mono kit-ali-escala-rotulo'));
              const bs = cp.niveles.map((nv, i) => { const b = el('button', String(nv.valor), 'kit-ali-nivel'); b.type = 'button'; b.setAttribute('role', 'radio');
                b.style?.setProperty?.('--color', `var(--nivel-${5 - Math.round((n > 1 ? i / (n - 1) : 1) * 5)})`); b.title = `${nv.valor}. ${nv.descripcion}`;
                b.setAttribute('aria-checked', String(reg[cp.id] === nv.valor));
                b.onclick = () => { reg[cp.id] = nv.valor; bs.forEach(y => y.setAttribute('aria-checked', String(y.textContent === String(nv.valor)))); guardarIt(); }; return b; });
              fila.append(...bs); det.append(fila);
            } else if (cp.tipo === 'lista') {
              const s = el('select', null, 'kit-ali-campo'); s.setAttribute('aria-label', cp.etiqueta);
              [['', cp.etiqueta + ': sin responder'], ...cp.valores.map(v => [v, cp.etiqueta + ': ' + v])].forEach(([v, t]) => { const o = el('option', t); o.value = v; s.append(o); });
              s.value = reg[cp.id] || ''; s.onchange = () => { reg[cp.id] = s.value || undefined; guardarIt(); }; det.append(s);
            } else {
              const l = el('label', null, 'kit-ali-area'), t = el('textarea'); t.rows = 2; t.maxLength = 4000; t.value = reg[cp.id] || '';
              t.oninput = () => { reg[cp.id] = t.value; guardarIt(); }; l.append(el('span', cp.etiqueta, 'kit-mono'), t); det.append(l);
            }
          });
          // Evidencias: enlaces a la nube del cliente.
          const ev = el('div', null, 'kit-ali-evidencias'), ul = el('ul'), url = el('input'), add = el('button', 'Agregar enlace', 'kit-ali-secundario'), msg = el('span', null, 'kit-met-nota');
          url.type = 'url'; url.placeholder = 'https://… (Drive, SharePoint, sitio web)'; url.setAttribute('aria-label', 'Enlace de la evidencia'); add.type = 'button';
          let enlaces = [...evidencias(it.id)];
          const guardarEv = () => programar({ id: it.id + '-ev', titulo: it.titulo }, async () => { const r = { id: it.id, enlaces, actualizado: new Date().toISOString() }; await d.guardar(p.empresa, EV, it.id, r);
            const k = (L[EV] ||= []).findIndex(e => e.id === it.id); if (k < 0) L[EV].push(r); else L[EV][k] = r; });
          const pintar = () => ul.replaceChildren(...enlaces.map((u, k) => { const li = el('li'), a = el('a', u); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
            const q = el('button', '×', 'kit-ali-quitar'); q.type = 'button'; q.setAttribute('aria-label', 'Quitar el enlace'); q.onclick = () => { enlaces.splice(k, 1); pintar(); guardarEv(); }; li.append(a, q); return li; }));
          add.onclick = () => { const u = url.value.trim(); if (!enlaceValido(u)) { msg.textContent = 'Escribe un enlace completo que empiece por https://'; return; }
            if (enlaces.length >= 10) { msg.textContent = 'Máximo 10 enlaces.'; return; } enlaces = [...enlaces, u]; url.value = ''; msg.textContent = ''; pintar(); guardarEv(); };
          pintar(); const fila = el('div', null, 'kit-ali-fila'); fila.append(url, add); ev.append(el('span', 'Evidencias: enlaces', 'kit-mono'), ul, fila, msg); det.append(ev);
          caja.append(det);
        }
        cuerpo.append(caja);
      });
      if (!x.items.length) cuerpo.append(el('p', 'Esta sección no tiene registros todavía.', 'kit-met-nota'));
      const pie = el('div', null, 'kit-ali-pie'), b = el('button', S.sec(x.id).estado === 'completa' ? 'Sección completa ✓' : 'Marcar la sección como completa', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
      b.type = 'button'; aviso.setAttribute('role', 'status'); let confirmar = false;
      b.onclick = async () => {
        const faltan = M.secciones(L).find(y => y.id === x.id).items.filter(it => !x.completo(it)).length;
        if (faltan && !confirmar) { confirmar = true; aviso.textContent = `Hay ${faltan} registros con datos faltantes. Toque de nuevo para marcarla como completa de todas formas.`; return; }
        b.disabled = true;
        try { const a = { id: 'sec-' + x.id, ciclo: S.ciclo, estado: 'completa', actualizado: new Date().toISOString() }; await guardarAv(a); L = await cargar(); tablero(); }
        catch (e) { aviso.textContent = e.message || 'No se pudo marcar la sección.'; b.disabled = false; }
      };
      pie.append(volver(), ...(RO || vigente ? [] : [b, aviso]));
      if (RO || vigente) cuerpo.querySelectorAll?.('button, input, select, textarea').forEach(n => { n.disabled = true; });
      zona.replaceChildren(cab, cuerpo, pie); zona.scrollIntoView?.({ block: 'start' });
    }
    tablero();
    return desmontar;
  }

  const VISTA = { actores: 'actores/alimentacion', riesgos: 'riesgos/alimentacion' };
  function instalar() {
    Object.entries(VISTA).forEach(([modulo, clave]) => { const original = root.App?.vista?.(clave); if (original) root.App.registrarVista(clave, { render: (c, d, p) => render(modulo, c, d, p, original) }); });
  }
  // Para la pestaña Resultados: ¿hay un proceso abierto en este módulo?
  async function enProceso(d, empresa, modulo) {
    const av = await d.listar(empresa, modulo + '-avance'), meta = av.find(a => a.id === 'evaluacion');
    if (meta?.estado !== 'en-proceso') return null;
    return { nombre: meta.nombre, completas: av.filter(a => a.ciclo === meta.ciclo && a.estado === 'completa' && a.id !== 'evaluacion').length, total: null };
  }
  instalar();
  // E64: solo lectura para los Módulos II y III (sus vistas tienen su propio código). Deshabilita lo que edita cada vez que
  // la zona se vuelve a pintar; la navegación (secciones, volver, seguir) sigue activa. Es comodidad: la barrera real es RLS.
  function soloLectura(zona) {
    const apagar = () => zona.querySelectorAll?.('.kit-ali-preguntas input, .kit-ali-preguntas select, .kit-ali-preguntas textarea, .kit-ali-preguntas button, .kit-ali-calcular, .kit-ali-pie .kit-met-pastilla, .kit-ali-dimensiones input, .kit-ali-dimensiones textarea').forEach(n => { n.disabled = true; });
    if (root.MutationObserver) new root.MutationObserver(apagar).observe(zona, { childList: true, subtree: true });
  }
  // E68 (9-nov): el id del borrador debe cumplir la regla de la base (^[a-z0-9-]{1,80}$, kit-datos.js). Antes usaba «:» y
  // la base lo rechazaba («Identificador inválido»): «Nueva evaluación» de los Módulos I y IV no guardaba nada.
  function claveBorrador(ciclo, seccion, item) { return `c${ciclo}-${seccion}-${item}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 80); }
  const api = { MODULOS, enlaceValido, enProceso, VISTA, soloLectura, claveBorrador };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitAlimentacionRegistros = api;
}(typeof window !== 'undefined' ? window : globalThis));
