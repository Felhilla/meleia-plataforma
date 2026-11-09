(function (root) {
  'use strict';
  // E62 (8-nov): Alimentación del Módulo III por secciones, sobre las respuestas crudas (decisión de Felipe del 29-oct:
  // la plataforma calcula la doble materialidad y los grupos de interés son variables). Réplica de E60 y E61.
  // Secciones: Grupos y participantes, una por grupo de interés (cada participante califica cada aspecto) y Comité
  // financiero. Con todas completas se calcula con KitMaterialidad.calcular (motor E38, validado 339/339).
  // Colecciones nuevas en la tabla datos (mismos permisos e historial): materialidad-grupos, materialidad-participantes,
  // materialidad-consulta, materialidad-evaluadores, materialidad-taller y materialidad-avance. Los participantes y los
  // evaluadores se identifican con códigos, nunca con nombres de personas.
  const C = { grupos: 'materialidad-grupos', part: 'materialidad-participantes', consulta: 'materialidad-consulta', evals: 'materialidad-evaluadores', taller: 'materialidad-taller', av: 'materialidad-avance' };
  const vacio = v => v === undefined || v === null || v === '';
  const hora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const ESTADO = { 'sin-empezar': 'Sin empezar', 'en-curso': 'En curso', completa: 'Completa' };
  const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'grupo';
  const color = v => `var(--nivel-${5 - v})`;

  // Calcula y arma los registros que lee la pestaña Resultados (aspectos y resumen). Función pura para probarla.
  function calcularRegistros(L) {
    const grupos = [...(L[C.grupos] || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0)), aspectos = L['materialidad-aspectos'] || [];
    const R = root.KitMaterialidad.calcular({ aspectos: aspectos.map(a => a.id), grupos: grupos.map(g => g.id),
      participantes: (L[C.part] || []).map(p => ({ codigo: p.id, grupo: p.grupo })), evaluadores: (L[C.evals] || []).map(e => e.id),
      consulta: (L[C.consulta] || []).map(r => ({ ...r, signo: r.signo })), taller: (L[C.taller] || []).map(r => ({ ...r })) });
    const nombre = id => grupos.find(g => g.id === id)?.nombre || id;
    const fijos = { colaboradores: 'col', clientes: 'cli', proveedores: 'pro' };
    const r2 = n => Math.round(n * 100) / 100;
    const aspectosOut = aspectos.map(a => { const x = R.aspectos.find(y => y.aspecto === a.id), out = { ...a };
      Object.assign(out, { importancia: r2(x.importancia), probabilidad: r2(x.probabilidad), rentabilidad: r2(x.rentabilidad), gasto: r2(x.gasto), financiera: r2(x.financiera), cuadrante: x.cuadrante,
        por_grupo: grupos.filter(g => x.por_grupo[g.id]).map(g => ({ nombre: g.nombre, importancia: r2(x.por_grupo[g.id].importancia), probabilidad: r2(x.por_grupo[g.id].probabilidad) })) });
      // Compatibilidad con los campos fijos (col, cli, pro) de la vista anterior.
      ['col', 'cli', 'pro'].forEach(k => { const g = grupos.find(gr => fijos[slug(gr.nombre)] === k); out[k + '_importancia'] = g ? r2(x.por_grupo[g.id]?.importancia || 0) : (out[k + '_importancia'] ?? 0); out[k + '_probabilidad'] = g ? r2(x.por_grupo[g.id]?.probabilidad || 0) : (out[k + '_probabilidad'] ?? 0); });
      return out; });
    const anterior = (L['materialidad-resumen'] || [])[0] || {};
    const resumen = { ...anterior, id: 'resumen', fuente: 'Calculado en la plataforma con las respuestas de la Alimentación', escala: '0 a 5',
      umbral_impacto: r2(R.umbral.impacto), umbral_financiero: r2(R.umbral.financiero), umbral_probabilidad: r2(R.umbral.probabilidad), participantes_taller: R.evaluadores,
      grupos: grupos.map(g => ({ nombre: g.nombre, participantes: R.participantes[g.id] || 0 })),
      notas: ['Una calificación en blanco cuenta como 0.', 'Cada grupo promedia a sus participantes. La importancia y la probabilidad son el promedio simple de los grupos.',
        'Materialidad financiera: promedio de la rentabilidad y el gasto operativo, calificados por el comité.', `Umbral de cada eje: promedio de los ${aspectos.length} aspectos. Un aspecto es material si supera el umbral de impacto o el financiero.`].join('\n') };
    return { aspectos: aspectosOut, resumen, nombre };
  }

  async function render(c, d, p, original) {
    const el = root.App.el;
    // E64 (9-nov, Felipe): sin permiso, y en los casos de muestra, la Alimentación se ve como ejemplo. El caso de muestra del III
    // se cargó con el formato anterior (sin las respuestas crudas por participante), así que se dice tal cual y se muestra
    // cómo se organiza la consulta, sin inventar cifras.
    let RO = !p.puedeEditar;
    if (!RO) { const emp = (await d.empresas?.())?.find?.(x => x.id === p.empresa); RO = !!emp?.muestra_comercial && p.empresa !== 'empresa-demo'; }
    if (RO) {
      const s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-tablero');
      s.append(el('p', 'Módulo III, alimentación de ejemplo', 'kit-mono'), el('h2', 'Así se alimenta la consulta', 'kit-met-titulo'),
        el('p', 'Caso de muestra: sus Resultados se cargaron con el formato anterior, antes de la Alimentación por secciones, así que aquí no se ven sus respuestas una por una. La consulta se llena en estas secciones:', 'kit-met-texto'));
      const lista = el('ol', null, 'kit-ali-secciones');
      [['Grupos y participantes', 'quiénes califican y en qué grupo de interés'], ['Una sección por grupo de interés', 'cada participante califica el impacto de cada aspecto'], ['Comité financiero', 'las áreas califican el efecto financiero de cada aspecto']].forEach(([t, sub], k) => {
        const li = el('li'), x = el('div', null, 'kit-ali-seccion estado-completa'); x.append(el('span', String(k + 1).padStart(2, '0'), 'kit-mono'), el('span', t, 'kit-ali-seccion-titulo'), el('span', sub, 'kit-ali-seccion-n')); li.append(x); lista.append(li); });
      const caja = el('div', null, 'kit-ali'); caja.append(s, lista); c.append(caja); return;
    }
    const nombres = ['materialidad-aspectos', 'materialidad-resumen', ...Object.values(C)];
    const cargar = async () => Object.fromEntries(await Promise.all(nombres.map(async n => [n, await d.listar(p.empresa, n)])));
    let L = await cargar(); if (p.vigente && !p.vigente()) return;
    const zona = el('div', null, 'kit-ali'), otros = el('details', null, 'kit-ali-otros'), cuerpoOriginal = el('div');
    otros.append(el('summary', 'Registrar o editar los aspectos y los temas materiales'), cuerpoOriginal); c.append(zona, otros);
    const desmontar = await original.render(cuerpoOriginal, d, p);
    const guardar = async (col, r) => { await d.guardar(p.empresa, col, r.id, r); const l = (L[col] ||= []), k = l.findIndex(x => x.id === r.id); if (k < 0) l.push(r); else l[k] = r; };
    const meta = () => (L[C.av] || []).find(a => a.id === 'evaluacion') || null;
    const sec = id => (L[C.av] || []).find(a => a.id === 'sec-' + id && a.ciclo === meta()?.ciclo) || { estado: 'sin-empezar' };
    const aspectos = () => [...(L['materialidad-aspectos'] || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const grupos = () => [...(L[C.grupos] || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const partes = g => (L[C.part] || []).filter(x => x.grupo === g).sort((a, b) => a.id.localeCompare(b.id));
    const secciones = () => [{ id: 'grupos', titulo: 'Grupos y participantes', n: grupos().length && grupos().every(g => partes(g.id).length) ? 1 : 0, total: 1 },
      ...grupos().map(g => { const ps = partes(g.id), hechas = (L[C.consulta] || []).filter(r => ps.some(x => x.id === r.participante)).length; return { id: 'g-' + g.id, grupo: g, titulo: g.nombre, n: hechas, total: ps.length * aspectos().length }; }),
      { id: 'taller', titulo: 'Comité financiero', n: (L[C.taller] || []).length, total: (L[C.evals] || []).length * aspectos().length }];
    const volverB = () => { const v = el('button', '← Volver al tablero', 'kit-ali-secundario'); v.type = 'button'; v.onclick = () => tablero(); return v; };
    const enCurso = async id => { if (sec(id).estado === 'sin-empezar') await guardar(C.av, { id: 'sec-' + id, ciclo: meta().ciclo, estado: 'en-curso', actualizado: new Date().toISOString() }); };

    function tablero() {
      const M = meta(), s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-tablero'); s.append(el('p', 'Módulo III, alimentación', 'kit-mono'));
      if (M?.estado !== 'en-proceso') {
        s.append(el('h2', 'Nueva consulta de materialidad', 'kit-met-titulo'), el('p', `Se llena por secciones y se guarda sola. Los grupos de interés califican el impacto de cada aspecto y el comité califica su efecto financiero. Hay ${aspectos().length} aspectos registrados${aspectos().length ? '' : ': regístrelos primero en el editor de abajo'}.`, 'kit-met-texto'));
        const f = el('form', null, 'kit-ali-inicio'), n = el('input'), b = el('button', 'Empezar', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
        n.type = 'text'; n.maxLength = 80; n.placeholder = 'Nombre, por ejemplo Consulta 2026'; n.setAttribute('aria-label', 'Nombre de la consulta'); b.type = 'submit'; aviso.setAttribute('role', 'status'); f.append(n, b, aviso);
        f.onsubmit = async ev => { ev?.preventDefault?.(); if (!n.value.trim()) { aviso.textContent = 'Escribe un nombre.'; return; } if (!aspectos().length) { aviso.textContent = 'Primero registre los aspectos.'; return; }
          b.disabled = true; try { await guardar(C.av, { id: 'evaluacion', ciclo: (M?.ciclo || 0) + 1, estado: 'en-proceso', nombre: n.value.trim(), iniciada: new Date().toISOString() }); tablero(); } catch (e) { aviso.textContent = e.message || 'No se pudo empezar.'; b.disabled = false; } };
        s.append(f); zona.replaceChildren(s); return;
      }
      const S = secciones(), total = S.slice(1).reduce((t, x) => t + x.total, 0), hechas = S.slice(1).reduce((t, x) => t + x.n, 0), completas = S.filter(x => sec(x.id).estado === 'completa').length;
      s.append(el('h2', M.nombre, 'kit-met-titulo'), el('p', `En proceso desde ${String(M.iniciada || '').slice(0, 10)}. Lo que se califica queda guardado de inmediato.`, 'kit-met-texto'));
      const tiles = el('ul', null, 'kit-met-tiles');
      [[(total ? Math.round(hechas * 100 / total) : 0) + ' %', 'Avance', `${hechas} de ${total} calificaciones`], [`${completas}/${S.length}`, 'Secciones completas', 'marcadas por la empresa'],
        [String(grupos().length), 'Grupos de interés', `${(L[C.part] || []).length} participantes`], [String((L[C.evals] || []).length), 'Comité financiero', 'áreas que califican']].forEach(([a, r, t]) => {
        const li = el('li'), x = el('div', null, 'kit-met-tile kit-ali-cifra'); x.append(el('span', a, 'kit-met-tile-num'), el('span', r, 'kit-met-tile-rotulo'), el('span', t, 'kit-met-tile-sub')); li.append(x); tiles.append(li); });
      const acc = el('div', null, 'kit-ali-acciones'), aviso = el('p', null, 'kit-met-nota kit-ali-aviso'); aviso.setAttribute('role', 'status');
      const pend = S.find(x => sec(x.id).estado !== 'completa'); if (pend) { const b = el('button', 'Seguir donde quedé', 'kit-met-pastilla'); b.type = 'button'; b.onclick = () => abrir(pend.id); acc.append(b); }
      const calc = el('button', 'Calcular los Resultados', 'kit-met-pastilla kit-ali-calcular'); calc.type = 'button'; calc.disabled = completas < S.length;
      calc.title = calc.disabled ? 'Se habilita cuando todas las secciones estén completas.' : '';
      calc.onclick = async () => { calc.disabled = true; aviso.textContent = 'Calculando…';
        try { const R = calcularRegistros(L); await d.guardarVarios(p.empresa, 'materialidad-aspectos', R.aspectos); await d.guardarVarios(p.empresa, 'materialidad-resumen', [R.resumen]);
          await guardar(C.av, { ...M, estado: 'publicada', publicada: new Date().toISOString() }); L = await cargar(); tablero(); }
        catch (e) { aviso.textContent = e.message || 'No se pudo calcular.'; calc.disabled = false; } };
      acc.append(calc); s.append(tiles, acc, aviso);
      const lista = el('ol', null, 'kit-ali-secciones');
      S.forEach((x, k) => { const st = sec(x.id).estado, b = el('button', null, 'kit-ali-seccion estado-' + st); b.type = 'button';
        const barra = el('span', null, 'kit-ali-barra'), r = el('span'); r.style?.setProperty?.('width', (x.total ? x.n * 100 / x.total : 0) + '%'); barra.append(r);
        b.append(el('span', String(k + 1).padStart(2, '0'), 'kit-mono'), el('span', x.titulo, 'kit-ali-seccion-titulo'), barra, el('span', x.id === 'grupos' ? '' : `${x.n} de ${x.total}`, 'kit-ali-seccion-n'), el('span', ESTADO[st], 'kit-ali-estado'));
        b.onclick = () => abrir(x.id); const li = el('li'); li.append(b); lista.append(li); });
      zona.replaceChildren(s, lista);
    }
    function marcar(id) {
      const pie = el('div', null, 'kit-ali-pie'), b = el('button', sec(id).estado === 'completa' ? 'Sección completa ✓' : 'Marcar la sección como completa', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
      b.type = 'button'; aviso.setAttribute('role', 'status'); let ok = false;
      b.onclick = async () => { const x = secciones().find(y => y.id === id); if (x && x.n < x.total && !ok) { ok = true; aviso.textContent = `Faltan ${x.total - x.n} calificaciones: contarán como 0. Toque de nuevo para marcarla como completa.`; return; }
        b.disabled = true; try { await guardar(C.av, { id: 'sec-' + id, ciclo: meta().ciclo, estado: 'completa', actualizado: new Date().toISOString() }); tablero(); } catch (e) { aviso.textContent = e.message || 'No se pudo marcar.'; b.disabled = false; } };
      pie.append(volverB(), b, aviso); return pie;
    }
    function cabeza(titulo, ayuda) { const s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-cabeza'), g = el('p', ayuda, 'kit-met-nota kit-ali-guardado'); g.setAttribute('role', 'status'); s.append(volverB(), el('p', 'Sección', 'kit-mono'), el('h2', titulo, 'kit-met-titulo'), g); return [s, g]; }
    function abrir(id) { if (id === 'grupos') return seccionGrupos(); if (id === 'taller') return seccionCalificar(id, 'Comité financiero', L[C.evals] || [], 'evaluador'); const g = grupos().find(x => 'g-' + x.id === id); if (g) seccionCalificar(id, g.nombre, partes(g.id), 'participante'); }

    // Grupos y participantes: nombres de los grupos y cuántos participantes tiene cada uno (con códigos, sin nombres).
    function seccionGrupos() {
      const [cab, guardado] = cabeza('Grupos y participantes', 'Los participantes se identifican con códigos, nunca con su nombre.');
      const cuerpo = el('div', null, 'kit-ali-preguntas');
      const fila = (g, k) => { const caja = el('article', null, 'kit-ali-pregunta'), n = el('input'), m = el('input'), q = el('input');
        n.type = 'text'; n.value = g?.nombre || ''; n.placeholder = 'Grupo, por ejemplo Colaboradores'; n.maxLength = 60; n.setAttribute('aria-label', 'Nombre del grupo');
        m.type = 'text'; m.value = g?.mecanismo || ''; m.placeholder = 'Mecanismo: encuesta, entrevista o taller'; m.maxLength = 80; m.setAttribute('aria-label', 'Mecanismo de consulta');
        q.type = 'number'; q.min = '1'; q.max = '200'; q.value = g ? String(partes(g.id).length || '') : ''; q.placeholder = 'Participantes'; q.setAttribute('aria-label', 'Número de participantes');
        const b = el('button', g ? 'Guardar' : 'Agregar grupo', 'kit-ali-secundario'); b.type = 'button';
        b.onclick = async () => { const nombre = n.value.trim(), cant = parseInt(q.value, 10);
          if (!nombre || !(cant >= 1 && cant <= 200)) { guardado.textContent = 'Escribe el nombre del grupo y un número de participantes entre 1 y 200.'; return; }
          const id = g?.id || slug(nombre); if (!g && grupos().some(x => x.id === id)) { guardado.textContent = 'Ese grupo ya existe.'; return; }
          try { await guardar(C.grupos, { id, orden: g?.orden ?? k + 1, nombre, mecanismo: m.value.trim() });
            const actuales = partes(id); for (let i = actuales.length; i < cant; i++) await guardar(C.part, { id: `${id}-p${String(i + 1).padStart(2, '0')}`, grupo: id });
            await enCurso('grupos'); guardado.textContent = 'Guardado a las ' + hora(); seccionGrupos(); } catch (e) { guardado.textContent = e.message || 'No se pudo guardar.'; } };
        const linea = el('div', null, 'kit-ali-fila'); linea.append(n, m, q, b); caja.append(linea);
        if (g) caja.append(el('p', `Códigos: ${partes(g.id).map(x => x.id.toUpperCase()).join(', ')}`, 'kit-met-nota')); return caja; };
      grupos().forEach((g, k) => cuerpo.append(fila(g, k))); cuerpo.append(fila(null, grupos().length));
      // Comité financiero: áreas que califican (sin nombres de personas).
      const comite = el('article', null, 'kit-ali-pregunta'), area = el('input'), add = el('button', 'Agregar área del comité', 'kit-ali-secundario'); area.type = 'text'; area.maxLength = 60; area.placeholder = 'Área, por ejemplo Finanzas'; area.setAttribute('aria-label', 'Área del comité financiero'); add.type = 'button';
      add.onclick = async () => { const a = area.value.trim(); if (!a) return; const id = 'e-' + slug(a); if ((L[C.evals] || []).some(x => x.id === id)) { guardado.textContent = 'Esa área ya está.'; return; }
        try { await guardar(C.evals, { id, area: a }); await enCurso('grupos'); seccionGrupos(); } catch (e) { guardado.textContent = e.message || 'No se pudo guardar.'; } };
      const fl = el('div', null, 'kit-ali-fila'); fl.append(area, add);
      comite.append(el('h3', 'Comité financiero', 'kit-pro-grupo'), el('p', (L[C.evals] || []).map(e => e.area).join(', ') || 'Sin áreas todavía.', 'kit-met-nota'), fl); cuerpo.append(comite);
      zona.replaceChildren(cab, cuerpo, marcar('grupos'));
    }

    // Calificar: se elige el participante (o el área del comité) y se califica cada aspecto de 0 a 5.
    function seccionCalificar(id, titulo, personas, tipo, actual = personas[0]?.id) {
      const [cab, guardado] = cabeza(titulo, tipo === 'participante' ? 'Cada participante califica el impacto de cada aspecto. En blanco cuenta como 0.' : 'Cada área califica el efecto financiero de cada aspecto. En blanco cuenta como 0.');
      const cuerpo = el('div', null, 'kit-ali-preguntas');
      if (!personas.length) { cuerpo.append(el('p', 'Primero agregue participantes o áreas en la sección Grupos y participantes.', 'kit-met-nota')); zona.replaceChildren(cab, cuerpo, marcar(id)); return; }
      const sel = el('select', null, 'kit-ali-campo'); sel.setAttribute('aria-label', tipo === 'participante' ? 'Participante' : 'Área del comité');
      personas.forEach(x => { const col = tipo === 'participante' ? C.consulta : C.taller, n = (L[col] || []).filter(r => r[tipo] === x.id).length;
        const o = el('option', `${tipo === 'participante' ? x.id.toUpperCase() : x.area} (${n} de ${aspectos().length})`); o.value = x.id; sel.append(o); });
      sel.value = actual; sel.onchange = () => seccionCalificar(id, titulo, personas, tipo, sel.value); cab.append(sel);
      const col = tipo === 'participante' ? C.consulta : C.taller, vars = tipo === 'participante' ? [['escala', 'Escala'], ['alcance', 'Alcance'], ['irremediabilidad', 'Irremediabilidad'], ['probabilidad', 'Probabilidad']] : [['rentabilidad', 'Rentabilidad'], ['gasto', 'Gasto operativo']];
      const tiempos = new Map();
      aspectos().forEach(a => {
        const rid = `${actual}--${a.id}`, r = { ...((L[col] || []).find(x => x.id === rid) || { id: rid, [tipo]: actual, aspecto: a.id }) };
        const caja = el('article', null, 'kit-ali-pregunta'), h = el('header'); h.append(el('span', String(a.orden || '').padStart(2, '0'), 'kit-mono kit-pro-etiqueta'), el('div'));
        h.lastChild.append(el('p', a.nombre, 'kit-ali-texto'), el('p', a.definicion || '', 'kit-met-nota')); caja.append(h);
        const det = el('div', null, 'kit-ali-detalle');
        const programar = () => { root.clearTimeout?.(tiempos.get(rid)); tiempos.set(rid, root.setTimeout(async () => { try { await guardar(col, { ...r, actualizado: new Date().toISOString() }); await enCurso(id); guardado.textContent = 'Guardado a las ' + hora(); } catch (e) { guardado.textContent = e.message || 'No se pudo guardar.'; } }, 700)); };
        if (tipo === 'participante') { const s = el('select', null, 'kit-ali-campo'); s.setAttribute('aria-label', 'Tipo de impacto');
          [['', 'Tipo de impacto: sin responder'], ['Negativo', 'Tipo de impacto: Negativo'], ['Positivo', 'Tipo de impacto: Positivo']].forEach(([v, t]) => { const o = el('option', t); o.value = v; s.append(o); });
          s.value = r.signo || ''; s.onchange = () => { r.signo = s.value || null; filas.irremediabilidad?.toggleAttribute?.('hidden', r.signo === 'Positivo'); if (r.signo === 'Positivo') r.irremediabilidad = null; programar(); }; det.append(s); }
        const filas = {};
        vars.forEach(([k, et]) => { const f = el('div', null, 'kit-ali-escala'); f.setAttribute('role', 'radiogroup'); f.setAttribute('aria-label', et); f.append(el('span', et, 'kit-mono kit-ali-escala-rotulo'));
          const bs = [0, 1, 2, 3, 4, 5].map(v => { const b = el('button', String(v), 'kit-ali-nivel'); b.type = 'button'; b.setAttribute('role', 'radio'); b.style?.setProperty?.('--color', color(v)); b.setAttribute('aria-checked', String(r[k] === v));
            b.onclick = () => { r[k] = r[k] === v ? null : v; bs.forEach(y => y.setAttribute('aria-checked', String(r[k] === Number(y.textContent)))); programar(); }; return b; });
          f.append(...bs); if (k === 'irremediabilidad' && r.signo === 'Positivo') f.hidden = true; filas[k] = f; det.append(f); });
        caja.append(det); cuerpo.append(caja);
      });
      zona.replaceChildren(cab, cuerpo, marcar(id)); zona.scrollIntoView?.({ block: 'start' });
    }
    tablero();
    return desmontar;
  }
  function instalar() { const original = root.App?.vista?.('materialidad/alimentacion'); if (original) root.App.registrarVista('materialidad/alimentacion', { render: (c, d, p) => render(c, d, p, original) }); }
  async function enProceso(d, empresa) { const av = await d.listar(empresa, C.av), m = av.find(a => a.id === 'evaluacion'); if (m?.estado !== 'en-proceso') return null;
    return { nombre: m.nombre, completas: av.filter(a => a.ciclo === m.ciclo && a.estado === 'completa' && a.id !== 'evaluacion').length, total: null }; }
  instalar();
  const api = { calcularRegistros, enProceso, C };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitAlimentacionMaterialidad = api;
}(typeof window !== 'undefined' ? window : globalThis));
