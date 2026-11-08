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
    if (!p.puedeEditar) return original.render(c, d, p);
    const M = await MODULOS[modulo](d, p), AV = modulo + '-avance', EV = modulo + '-evidencias';
    const cargar = async () => Object.fromEntries(await Promise.all([...M.colecciones, AV, EV].map(async n => [n, await d.listar(p.empresa, n)])));
    let L = await cargar();
    if (p.vigente && !p.vigente()) return;
    const zona = el('div', null, 'kit-ali'), otros = el('details', null, 'kit-ali-otros'), cuerpoOriginal = el('div');
    otros.append(el('summary', 'Registrar, editar a fondo o borrar registros, y cargar la plantilla de Excel'), cuerpoOriginal);
    c.append(zona, otros);
    const desmontar = await original.render(cuerpoOriginal, d, p);
    const guardarAv = reg => d.guardar(p.empresa, AV, reg.id, reg);
    const estado = () => { const meta = (L[AV] || []).find(a => a.id === 'evaluacion') || null;
      return { meta, ciclo: meta?.ciclo || 0, enProceso: meta?.estado === 'en-proceso', sec: id => (L[AV] || []).find(a => a.id === 'sec-' + id && a.ciclo === meta?.ciclo) || { estado: 'sin-empezar' } }; };
    const evidencias = id => (L[EV] || []).find(e => e.id === id)?.enlaces || [];

    function tablero() {
      const S = estado(), secs = M.secciones(L), s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-tablero');
      s.append(el('p', `Módulo ${M.romano}, alimentación`, 'kit-mono'));
      if (!S.enProceso) {
        s.append(el('h2', 'Nueva actualización', 'kit-met-titulo'), el('p', `Se califica por secciones y se guarda solo. Puede hacerlo en varios días y desde cualquier equipo. Los Resultados se muestran de nuevo cuando todas las secciones estén completas. Para agregar ${M.unidad}, use el editor de abajo.`, 'kit-met-texto'));
        const f = el('form', null, 'kit-ali-inicio'), n = el('input'), b = el('button', 'Empezar', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
        n.type = 'text'; n.maxLength = 80; n.placeholder = 'Nombre, por ejemplo Actualización 2026'; n.setAttribute('aria-label', 'Nombre de la actualización'); b.type = 'submit'; aviso.setAttribute('role', 'status');
        f.append(n, b, aviso);
        f.onsubmit = async ev => { ev?.preventDefault?.(); if (!n.value.trim()) { aviso.textContent = 'Escribe un nombre.'; return; }
          b.disabled = true; try { await guardarAv({ id: 'evaluacion', ciclo: S.ciclo + 1, estado: 'en-proceso', nombre: n.value.trim(), iniciada: new Date().toISOString() }); L = await cargar(); tablero(); }
          catch (e) { aviso.textContent = e.message || 'No se pudo empezar.'; b.disabled = false; } };
        s.append(f); zona.replaceChildren(s); return;
      }
      const items = secs.flatMap(x => x.items.map(it => ({ x, it }))), hechos = items.filter(({ x, it }) => x.completo(it)).length;
      const sinEv = items.filter(({ x, it }) => x.campos.length && !evidencias(it.id).length).length, completas = secs.filter(x => S.sec(x.id).estado === 'completa').length;
      s.append(el('h2', S.meta.nombre, 'kit-met-titulo'), el('p', `En proceso desde ${String(S.meta.iniciada || '').slice(0, 10)}. Lo que se califica queda guardado de inmediato.`, 'kit-met-texto'));
      const tiles = el('ul', null, 'kit-met-tiles');
      [[(items.length ? Math.round(hechos * 100 / items.length) : 0) + ' %', 'Avance', `${hechos} de ${items.length} registros completos`], [`${completas}/${secs.length}`, 'Secciones completas', 'marcadas por la empresa'],
        [String(sinEv), 'Sin evidencia', 'registros calificados sin enlace'], [String(items.length - hechos), 'Por completar', 'registros con datos faltantes']].forEach(([a, r, t]) => {
        const li = el('li'), x = el('div', null, 'kit-met-tile kit-ali-cifra'); x.append(el('span', a, 'kit-met-tile-num'), el('span', r, 'kit-met-tile-rotulo'), el('span', t, 'kit-met-tile-sub')); li.append(x); tiles.append(li); });
      s.append(tiles);
      const acc = el('div', null, 'kit-ali-acciones'), pend = secs.find(x => S.sec(x.id).estado !== 'completa'), aviso = el('p', null, 'kit-met-nota kit-ali-aviso'); aviso.setAttribute('role', 'status');
      if (pend) { const b = el('button', 'Seguir donde quedé', 'kit-met-pastilla'); b.type = 'button'; b.onclick = () => seccion(pend.id); acc.append(b); }
      const fin = el('button', 'Terminar y ver los Resultados', 'kit-met-pastilla kit-ali-calcular'); fin.type = 'button'; fin.disabled = completas < secs.length;
      fin.title = fin.disabled ? 'Se habilita cuando todas las secciones estén completas.' : '';
      fin.onclick = async () => { fin.disabled = true; try { await guardarAv({ ...S.meta, estado: 'publicada', publicada: new Date().toISOString() }); L = await cargar(); tablero(); aviso.textContent = 'Listo. Los Resultados ya se ven en la pestaña Resultados.'; }
        catch (e) { aviso.textContent = e.message || 'No se pudo terminar.'; fin.disabled = false; } };
      acc.append(fin); s.append(acc, aviso);
      const lista = el('ol', null, 'kit-ali-secciones');
      secs.forEach((x, k) => {
        const n = x.items.filter(it => x.completo(it)).length, st = S.sec(x.id).estado, b = el('button', null, 'kit-ali-seccion estado-' + st); b.type = 'button';
        const barra = el('span', null, 'kit-ali-barra'), relleno = el('span'); relleno.style?.setProperty?.('width', (x.items.length ? n * 100 / x.items.length : 0) + '%'); barra.append(relleno);
        b.append(el('span', String(k + 1).padStart(2, '0'), 'kit-mono'), el('span', x.titulo, 'kit-ali-seccion-titulo'), barra, el('span', `${n} de ${x.items.length}`, 'kit-ali-seccion-n'), el('span', ESTADO[st] || 'En curso', 'kit-ali-estado'));
        b.setAttribute('aria-label', `${x.titulo}: ${n} de ${x.items.length} completos, ${ESTADO[st] || st}. Abrir la sección`);
        b.onclick = () => seccion(x.id); const li = el('li'); li.append(b); lista.append(li);
      });
      zona.replaceChildren(s, lista);
    }

    function seccion(id) {
      const S = estado(), x = M.secciones(L).find(y => y.id === id); if (!x) return tablero();
      const cab = el('section', null, 'kit-banda kit-banda-oscura kit-ali-cabeza'), guardado = el('p', x.ayuda || 'Los cambios se guardan solos.', 'kit-met-nota kit-ali-guardado'); guardado.setAttribute('role', 'status');
      const volver = () => { const v = el('button', '← Volver al tablero', 'kit-ali-secundario'); v.type = 'button'; v.onclick = () => tablero(); return v; };
      cab.append(volver(), el('p', 'Sección', 'kit-mono'), el('h2', x.titulo, 'kit-met-titulo'), guardado);
      const cuerpo = el('div', null, 'kit-ali-preguntas'), tiempos = new Map();
      const enCurso = async () => { if (S.sec(x.id).estado === 'sin-empezar') { const a = { id: 'sec-' + x.id, ciclo: S.ciclo, estado: 'en-curso', actualizado: new Date().toISOString() }; await guardarAv(a); (L[AV] ||= []).push(a); } };
      const programar = (it, fn) => { root.clearTimeout?.(tiempos.get(it.id)); tiempos.set(it.id, root.setTimeout(async () => { tiempos.delete(it.id);
        try { await fn(); await enCurso(); guardado.textContent = 'Guardado a las ' + hora(); } catch (e) { guardado.textContent = 'No se guardó ' + it.titulo + ': ' + (e.message || 'error'); } }, 900)); };
      x.items.forEach(it => {
        const caja = el('article', null, 'kit-ali-pregunta' + (x.completo(it) ? ' completo' : '')), cabI = el('header');
        cabI.append(el('span', x.completo(it) ? 'Completo' : 'Por completar', 'kit-mono kit-pro-etiqueta'), el('div'));
        cabI.lastChild.append(el('p', it.titulo, 'kit-ali-texto'), ...(it.sub ? [el('p', it.sub, 'kit-met-nota')] : []));
        caja.append(cabI);
        if (x.campos.length) {
          const reg = it.registro, guardarIt = () => programar(it, () => M.guardar(it));
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
      pie.append(volver(), b, aviso); zona.replaceChildren(cab, cuerpo, pie); zona.scrollIntoView?.({ block: 'start' });
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
  const api = { MODULOS, enlaceValido, enProceso, VISTA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitAlimentacionRegistros = api;
}(typeof window !== 'undefined' ? window : globalThis));
