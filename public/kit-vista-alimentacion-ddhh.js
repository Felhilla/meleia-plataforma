(function (root) {
  'use strict';
  // E60 (8-nov): Alimentación del Módulo II por secciones (propuesta E58 con las decisiones de Felipe).
  // - Tablero de avance y una sección por etapa o derecho (16). Se puede retomar otro día y desde otro equipo.
  // - Cada pregunta se guarda sola en la base (colección ddhh-borrador, id = su etiqueta): dos personas pueden trabajar
  //   en secciones distintas sin pisarse, y ningún registro pasa el límite de 50 KB de la base.
  // - Evidencias: enlaces a la nube del cliente (decisión de Felipe: si el cliente borra el archivo, es su responsabilidad).
  // - La empresa marca cada sección como completa (sin revisión de Meleia). Con las 16 completas se calculan los
  //   Resultados con KitEstudios.prepararDdhh, el mismo camino del cuestionario y del Excel.
  // - Mientras hay una evaluación en proceso, la pestaña Resultados muestra "En proceso" (kit-vista-portada-resultados.js).
  const BORRADOR = 'ddhh-borrador', AVANCE = 'ddhh-avance';
  const COLECCIONES = ['ddhh-evaluaciones', 'ddhh-indicadores', 'ddhh-componentes', 'ddhh-dimensiones'];
  const vacio = v => v === undefined || v === null || v === '';
  const idDe = etiqueta => String(etiqueta).toLowerCase();
  const enlaceValido = u => typeof u === 'string' && u.length <= 500 && /^https?:\/\/[^\s]+\.[^\s]+$/i.test(u.trim());
  const json = async ruta => { const r = await root.fetch(ruta); if (!r.ok) throw Error('No se pudo cargar ' + ruta); return r.json(); };
  const hora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const num = n => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

  // Estado de la evaluación en proceso a partir de lo guardado. Lo que no se ha tocado en este ciclo parte de la
  // última evaluación publicada (para actualizarla sin volver a escribir todo).
  function armar(cat, existentes, borrador, avance) {
    const meta = avance.find(a => a.id === 'evaluacion') || null, ciclo = meta?.ciclo || 0;
    const base = root.KitCuestionarioDdhh.estadoInicial(cat, existentes, new Date().toISOString().slice(0, 10));
    const propios = new Map(borrador.filter(b => b.ciclo === ciclo && b.indicador).map(b => [b.indicador, b]));
    const ind = {};
    cat.indicadores.forEach(i => { const b = propios.get(i.id), x = b || base.ind[i.id] || {};
      ind[i.id] = { calificacion: vacio(x.calificacion) ? '' : String(x.calificacion), incorporado: x.incorporado || '', documentos: x.documentos || '', descripcion: x.descripcion || '', brecha: x.brecha || '', enlaces: b?.enlaces || [] }; });
    const dim = { ...base.dim };
    borrador.filter(b => b.ciclo === ciclo && b.dimension).forEach(b => { dim[b.dimension] = { hallazgos: b.hallazgos || '', brechas: b.brechas || '' }; });
    const secciones = Object.fromEntries(cat.ejes.map(e => { const a = avance.find(x => x.id === e.id && x.ciclo === ciclo); return [e.id, a || { estado: 'sin-empezar' }]; }));
    return { meta, ciclo, ind, dim, secciones, enProceso: meta?.estado === 'en-proceso' };
  }
  // Cifras del tablero.
  function cifras(cat, E) {
    const total = cat.indicadores.length, cal = cat.indicadores.filter(i => !vacio(E.ind[i.id].calificacion)).length;
    const sinEvidencia = cat.indicadores.filter(i => vacio(E.ind[i.id].documentos?.trim?.()) && !(E.ind[i.id].enlaces || []).length).length;
    const completas = cat.ejes.filter(e => E.secciones[e.id].estado === 'completa').length;
    return { total, cal, avance: total ? Math.round(cal * 100 / total) : 0, enBlanco: total - cal, sinEvidencia, completas, secciones: cat.ejes.length };
  }
  const titulo = eje => eje.id.startsWith('etapa') ? `Etapa ${eje.id.split('-').pop()}. ${eje.nombre.replace(/\s+/g, ' ').trim()}` : eje.nombre.replace(/\s+/g, ' ').trim();

  async function render(c, d, p, original) {
    const App = root.App, el = App.el;
    // E64 (9-nov, Felipe): sin permiso, y en los casos de muestra, la Alimentación se ve como ejemplo de solo lectura con las
    // respuestas del caso. No se guarda nada (y la base lo impide igual: RLS).
    let RO = !p.puedeEditar;
    if (!RO) { const emp = (await d.empresas?.())?.find?.(x => x.id === p.empresa); RO = !!emp?.muestra_comercial && p.empresa !== 'empresa-demo'; }
    const [cat, esquemasL, existentesL, borrador, avance] = await Promise.all([
      json('config/kit-ddhh-catalogo.json'), Promise.all(COLECCIONES.map(n => json('config/esquemas/' + n + '.json'))),
      Promise.all(COLECCIONES.map(n => d.listar(p.empresa, n))), RO ? [] : d.listar(p.empresa, BORRADOR), RO ? [] : d.listar(p.empresa, AVANCE)]);
    if (p.vigente && !p.vigente()) return;
    const esquemas = Object.fromEntries(COLECCIONES.map((n, i) => [n, esquemasL[i]])), existentes = Object.fromEntries(COLECCIONES.map((n, i) => [n, existentesL[i]]));
    const niveles = (cat.estandares[0]?.escala?.niveles || []).slice().sort((a, b) => a.valor - b.valor);
    const nombresNivel = Object.fromEntries((cat.calificacion?.brechas?.niveles || []).map(n => [n.valor, n.nombre]));
    // En el ejemplo se muestra la evaluación más reciente que tenga respuestas (una evaluación vacía no enseña nada).
    if (RO) { const con = new Set((existentes['ddhh-indicadores'] || []).map(r => r.evaluacion)); existentes['ddhh-evaluaciones'] = (existentes['ddhh-evaluaciones'] || []).filter(e => con.has(e.id)); }
    let E = armar(cat, existentes, borrador, avance);
    if (RO) { E.enProceso = true; E.meta = { nombre: 'Así se alimenta este caso', iniciada: '' }; cat.ejes.forEach(e => { E.secciones[e.id] = { estado: 'completa' }; }); }
    const zona = el('div', null, 'kit-ali'), otros = el('details', null, 'kit-ali-otros');
    otros.append(el('summary', 'Otras formas de cargar: plantilla de Excel y cuestionario de una sola sentada'));
    const cuerpoOriginal = el('div'); otros.append(cuerpoOriginal);
    c.append(zona); if (!RO) c.append(otros);
    const desmontar = RO ? undefined : await original.render(cuerpoOriginal, d, p);
    const guardar = (col, reg) => RO ? Promise.resolve(reg) : d.guardar(p.empresa, col, reg.id, reg);
    if (RO) root.KitAlimentacionRegistros?.soloLectura?.(zona);

    // ---------- Tablero ----------
    function tablero() {
      const s = el('section', null, 'kit-banda kit-banda-oscura kit-ali-tablero');
      s.append(el('p', RO ? 'Módulo II, alimentación de ejemplo' : 'Módulo II, alimentación', 'kit-mono'));
      if (!E.enProceso) {
        s.append(el('h2', 'Nueva evaluación', 'kit-met-titulo'),
          el('p', 'Se llena por secciones y se guarda sola. Puede hacerlo en varios días y desde cualquier equipo. Los Resultados se calculan cuando las 16 secciones estén completas.', 'kit-met-texto'));
        const f = el('form', null, 'kit-ali-inicio'), n = el('input'), fe = el('input'), b = el('button', 'Empezar', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
        n.type = 'text'; n.maxLength = 80; n.placeholder = 'Nombre, por ejemplo Línea base 2026'; n.setAttribute('aria-label', 'Nombre de la evaluación');
        fe.type = 'date'; fe.value = new Date().toISOString().slice(0, 10); fe.setAttribute('aria-label', 'Fecha de la evaluación'); b.type = 'submit'; aviso.setAttribute('role', 'status');
        f.append(n, fe, b, aviso);
        f.onsubmit = async ev => { ev?.preventDefault?.();
          if (!n.value.trim()) { aviso.textContent = 'Escribe un nombre para la evaluación.'; return; }
          b.disabled = true; aviso.textContent = 'Creando…';
          try { await guardar(AVANCE, { id: 'evaluacion', ciclo: (E.meta?.ciclo || 0) + 1, estado: 'en-proceso', nombre: n.value.trim(), fecha: fe.value, iniciada: new Date().toISOString() });
            E = armar(cat, existentes, await d.listar(p.empresa, BORRADOR), await d.listar(p.empresa, AVANCE)); tablero(); }
          catch (e) { aviso.textContent = e.message || 'No se pudo crear la evaluación.'; b.disabled = false; } };
        s.append(f); zona.replaceChildren(s); return;
      }
      const C = cifras(cat, E);
      s.append(el('h2', E.meta.nombre, 'kit-met-titulo'), el('p', RO ? 'Caso de muestra: puede recorrer las 16 secciones y ver cómo se respondió cada pregunta, con su calificación y su evidencia. Sus datos no se modifican desde aquí.' : `En proceso desde ${String(E.meta.iniciada || '').slice(0, 10)}. Lo que se responde queda guardado de inmediato.`, 'kit-met-texto'));
      const tiles = el('ul', null, 'kit-met-tiles');
      [[C.avance + ' %', 'Avance', `${num(C.cal)} de ${num(C.total)} preguntas calificadas`], [`${C.completas}/${C.secciones}`, 'Secciones completas', 'marcadas como completas por la empresa'],
        [num(C.sinEvidencia), 'Sin evidencia', 'preguntas sin documento ni enlace'], [num(C.enBlanco), 'En blanco', 'valdrán 0 al calcular']].forEach(([n, r, t]) => {
        const li = el('li'), x = el('div', null, 'kit-met-tile kit-ali-cifra'); x.append(el('span', n, 'kit-met-tile-num'), el('span', r, 'kit-met-tile-rotulo'), el('span', t, 'kit-met-tile-sub')); li.append(x); tiles.append(li); });
      s.append(tiles);
      const acciones = el('div', null, 'kit-ali-acciones');
      const pendiente = cat.ejes.find(e => E.secciones[e.id].estado !== 'completa');
      if (pendiente) { const b = el('button', 'Seguir donde quedé', 'kit-met-pastilla'); b.type = 'button'; b.onclick = () => seccion(pendiente); acciones.append(b); }
      const bd = el('button', 'Hallazgos por dimensión (opcional)', 'kit-ali-secundario'); bd.type = 'button'; bd.onclick = () => dimensiones(); acciones.append(bd);
      const calc = el('button', 'Calcular los Resultados', 'kit-met-pastilla kit-ali-calcular'); calc.type = 'button'; calc.disabled = C.completas < C.secciones;
      calc.title = calc.disabled ? 'Se habilita cuando las 16 secciones estén completas.' : ''; calc.onclick = () => publicar(calc);
      acciones.append(calc); s.append(acciones);
      const aviso = el('p', null, 'kit-met-nota kit-ali-aviso'); aviso.setAttribute('role', 'status'); s.append(aviso);
      // Secciones con su barra de avance.
      const lista = el('ol', null, 'kit-ali-secciones');
      cat.ejes.forEach((eje, k) => {
        const ids = cat.indicadores.filter(i => i.eje === eje.id), hechas = ids.filter(i => !vacio(E.ind[i.id].calificacion)).length, sec = E.secciones[eje.id];
        const b = el('button', null, 'kit-ali-seccion estado-' + sec.estado); b.type = 'button';
        const barra = el('span', null, 'kit-ali-barra'), relleno = el('span'); relleno.style?.setProperty?.('width', (ids.length ? hechas * 100 / ids.length : 0) + '%'); barra.append(relleno);
        b.append(el('span', String(k + 1).padStart(2, '0'), 'kit-mono'), el('span', titulo(eje), 'kit-ali-seccion-titulo'), barra,
          el('span', `${hechas} de ${ids.length}`, 'kit-ali-seccion-n'), el('span', { 'sin-empezar': 'Sin empezar', 'en-curso': 'En curso', completa: 'Completa' }[sec.estado] || 'En curso', 'kit-ali-estado'));
        b.setAttribute('aria-label', `${titulo(eje)}: ${hechas} de ${ids.length} calificadas, ${sec.estado.replace('-', ' ')}. Abrir la sección`);
        b.onclick = () => seccion(eje); const li = el('li'); li.append(b); lista.append(li);
      });
      zona.replaceChildren(s, lista);
      tablero.aviso = aviso;
    }

    // ---------- Sección ----------
    function seccion(eje) {
      const ids = cat.indicadores.filter(i => i.eje === eje.id), comps = eje.componentes || [];
      const cab = el('section', null, 'kit-banda kit-banda-oscura kit-ali-cabeza');
      const volver = el('button', '← Volver al tablero', 'kit-ali-secundario'); volver.type = 'button'; volver.onclick = () => tablero();
      const guardado = el('p', 'Los cambios se guardan solos.', 'kit-met-nota kit-ali-guardado'); guardado.setAttribute('role', 'status');
      cab.append(volver, el('p', eje.id.startsWith('etapa') ? 'Etapa de debida diligencia' : 'Derecho', 'kit-mono'), el('h2', titulo(eje), 'kit-met-titulo'), guardado);
      const cuerpo = el('div', null, 'kit-ali-preguntas');
      const pendientes = new Map();
      const marcarEnCurso = async () => { if (E.secciones[eje.id].estado === 'sin-empezar') { const a = { id: eje.id, ciclo: E.ciclo, estado: 'en-curso', actualizado: new Date().toISOString() }; E.secciones[eje.id] = a; await guardar(AVANCE, a); } };
      // Guardado automático: cada pregunta se guarda sola, un momento después del último cambio.
      const programar = ind => {
        root.clearTimeout?.(pendientes.get(ind.id));
        pendientes.set(ind.id, root.setTimeout(async () => {
          pendientes.delete(ind.id); const r = E.ind[ind.id];
          try { await guardar(BORRADOR, { id: idDe(ind.etiqueta), indicador: ind.id, etiqueta: ind.etiqueta, ciclo: E.ciclo, calificacion: vacio(r.calificacion) ? null : Number(r.calificacion), incorporado: r.incorporado || null, documentos: r.documentos || '', descripcion: r.descripcion || '', brecha: r.brecha || '', enlaces: r.enlaces || [], actualizado: new Date().toISOString() });
            await marcarEnCurso(); guardado.textContent = 'Guardado a las ' + hora(); }
          catch (e) { guardado.textContent = 'No se pudo guardar: ' + (e.message || 'error') + '. Revise su conexión.'; }
        }, 900));
      };
      const pregunta = ind => {
        const r = E.ind[ind.id], caja = el('article', null, 'kit-ali-pregunta');
        const cabP = el('header'); cabP.append(el('span', ind.etiqueta, 'kit-mono kit-pro-etiqueta'), el('p', ind.pregunta, 'kit-ali-texto'));
        // Escala de 0 a 5 con el color de cada nivel y su descripción al pasar el cursor.
        const escala = el('div', null, 'kit-ali-escala'); escala.setAttribute('role', 'radiogroup'); escala.setAttribute('aria-label', 'Calificación de 0 a 5');
        const botones = niveles.map(nv => { const b = el('button', String(nv.valor), 'kit-ali-nivel'); b.type = 'button'; b.setAttribute('role', 'radio');
          b.style?.setProperty?.('--color', `var(--nivel-${nv.valor})`); b.title = `${nv.valor}. ${nombresNivel[nv.valor] || ''}: ${nv.descripcion}`;
          b.setAttribute('aria-checked', String(String(nv.valor) === r.calificacion));
          b.onclick = () => { r.calificacion = r.calificacion === String(nv.valor) ? '' : String(nv.valor); botones.forEach(x => x.setAttribute('aria-checked', String(x.textContent === r.calificacion))); programar(ind); };
          return b; });
        escala.append(...botones, el('span', 'Sin calificar vale 0', 'kit-met-nota'));
        const inc = el('select', null, 'kit-ali-campo'); inc.setAttribute('aria-label', 'Incorporado');
        [['', 'Incorporado: sin responder'], ['si', 'Incorporado: Sí'], ['parcial', 'Incorporado: Parcial'], ['no', 'Incorporado: No']].forEach(([v, t]) => { const o = el('option', t); o.value = v; inc.append(o); });
        inc.value = r.incorporado || ''; inc.onchange = () => { r.incorporado = inc.value; programar(ind); };
        const area = (campo, etiqueta) => { const l = el('label', null, 'kit-ali-area'), t = el('textarea'); t.rows = 2; t.maxLength = 4000; t.value = r[campo] || '';
          t.oninput = () => { r[campo] = t.value; programar(ind); }; l.append(el('span', etiqueta, 'kit-mono'), t); return l; };
        // Evidencias: enlaces a la nube del cliente.
        const evid = el('div', null, 'kit-ali-evidencias'), lista = el('ul'), url = el('input'), add = el('button', 'Agregar enlace', 'kit-ali-secundario'), msg = el('span', null, 'kit-met-nota');
        url.type = 'url'; url.placeholder = 'https://… (Drive, SharePoint, sitio web)'; url.setAttribute('aria-label', 'Enlace de la evidencia'); add.type = 'button';
        const pintarEnlaces = () => lista.replaceChildren(...(r.enlaces || []).map((u, k) => { const li = el('li'), a = el('a', u); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
          const q = el('button', '×', 'kit-ali-quitar'); q.type = 'button'; q.setAttribute('aria-label', 'Quitar el enlace'); q.onclick = () => { r.enlaces.splice(k, 1); pintarEnlaces(); programar(ind); }; li.append(a, q); return li; }));
        add.onclick = () => { const u = url.value.trim(); if (!enlaceValido(u)) { msg.textContent = 'Escribe un enlace completo que empiece por https://'; return; }
          if ((r.enlaces || []).length >= 10) { msg.textContent = 'Máximo 10 enlaces por pregunta.'; return; }
          r.enlaces = [...(r.enlaces || []), u]; url.value = ''; msg.textContent = ''; pintarEnlaces(); programar(ind); };
        pintarEnlaces(); const fila = el('div', null, 'kit-ali-fila'); fila.append(url, add);
        evid.append(el('span', 'Evidencias: enlaces', 'kit-mono'), lista, fila, msg);
        const detalle = el('div', null, 'kit-ali-detalle'); detalle.append(inc, area('documentos', 'Documentos analizados'), area('descripcion', 'Hallazgo'), area('brecha', 'Brecha y recomendación'), evid);
        caja.append(cabP, escala, detalle); return caja;
      };
      const grupos = comps.length ? comps.map((cp, k) => ({ titulo: `C${k + 1}. ${cp.nombre}`, ids: ids.filter(i => i.componente === cp.id) })) : [{ titulo: '', ids }];
      grupos.forEach(g => { if (g.titulo) cuerpo.append(el('h3', g.titulo, 'kit-pro-grupo')); g.ids.forEach(i => cuerpo.append(pregunta(i))); });
      const pie = el('div', null, 'kit-ali-pie'), completa = el('button', E.secciones[eje.id].estado === 'completa' ? 'Sección completa ✓' : 'Marcar la sección como completa', 'kit-met-pastilla'), aviso = el('p', null, 'kit-met-nota');
      completa.type = 'button'; aviso.setAttribute('role', 'status'); let confirmar = false;
      completa.onclick = async () => {
        const blancos = ids.filter(i => vacio(E.ind[i.id].calificacion)).length;
        if (blancos && !confirmar) { confirmar = true; aviso.textContent = `Hay ${blancos} preguntas sin calificar: contarán como 0. Toque de nuevo para marcarla como completa.`; return; }
        completa.disabled = true;
        try { await Promise.all([...pendientes.keys()].map(k => { root.clearTimeout?.(pendientes.get(k)); pendientes.delete(k); const ind = ids.find(i => i.id === k); return ind ? guardarYa(ind) : null; }));
          const a = { id: eje.id, ciclo: E.ciclo, estado: 'completa', actualizado: new Date().toISOString() }; await guardar(AVANCE, a); E.secciones[eje.id] = a; tablero(); }
        catch (e) { aviso.textContent = e.message || 'No se pudo marcar la sección.'; completa.disabled = false; }
      };
      const guardarYa = ind => { const r = E.ind[ind.id]; return guardar(BORRADOR, { id: idDe(ind.etiqueta), indicador: ind.id, etiqueta: ind.etiqueta, ciclo: E.ciclo, calificacion: vacio(r.calificacion) ? null : Number(r.calificacion), incorporado: r.incorporado || null, documentos: r.documentos || '', descripcion: r.descripcion || '', brecha: r.brecha || '', enlaces: r.enlaces || [], actualizado: new Date().toISOString() }); };
      const volver2 = el('button', '← Volver al tablero', 'kit-ali-secundario'); volver2.type = 'button'; volver2.onclick = () => tablero();
      pie.append(volver2, completa, aviso);
      zona.replaceChildren(cab, cuerpo, pie);
      zona.scrollIntoView?.({ block: 'start' });
    }

    // ---------- Hallazgos por dimensión (opcional) ----------
    function dimensiones() {
      const cab = el('section', null, 'kit-banda kit-banda-oscura kit-ali-cabeza'), v = el('button', '← Volver al tablero', 'kit-ali-secundario'); v.type = 'button'; v.onclick = () => tablero();
      const guardado = el('p', 'Uno por línea. Los cambios se guardan solos.', 'kit-met-nota'); guardado.setAttribute('role', 'status');
      cab.append(v, el('p', 'Opcional', 'kit-mono'), el('h2', 'Hallazgos por dimensión', 'kit-met-titulo'), guardado);
      const cuerpo = el('div', null, 'kit-ali-preguntas'), t = {};
      [...cat.dimensiones.grandes.map(g => ({ id: g.id, nombre: g.titulo })), ...cat.ejes].forEach(dm => {
        const caja = el('article', null, 'kit-ali-pregunta'), x = E.dim[dm.id] || (E.dim[dm.id] = { hallazgos: '', brechas: '' });
        const area = (campo, et) => { const l = el('label', null, 'kit-ali-area'), ta = el('textarea'); ta.rows = 3; ta.maxLength = 4000; ta.value = x[campo] || '';
          ta.oninput = () => { x[campo] = ta.value; root.clearTimeout?.(t[dm.id]); t[dm.id] = root.setTimeout(async () => {
            try { await guardar(BORRADOR, { id: 'dim-' + dm.id, dimension: dm.id, ciclo: E.ciclo, hallazgos: x.hallazgos, brechas: x.brechas, actualizado: new Date().toISOString() }); guardado.textContent = 'Guardado a las ' + hora(); }
            catch (e) { guardado.textContent = 'No se pudo guardar: ' + (e.message || 'error'); } }, 900); };
          l.append(el('span', et, 'kit-mono'), ta); return l; };
        caja.append(el('h3', dm.nombre.replace(/\s+/g, ' ').trim(), 'kit-pro-grupo'), area('hallazgos', 'Hallazgos'), area('brechas', 'Brechas')); cuerpo.append(caja);
      });
      zona.replaceChildren(cab, cuerpo);
    }

    // ---------- Calcular los Resultados ----------
    async function publicar(boton) {
      const aviso = tablero.aviso; boton.disabled = true; aviso.textContent = 'Calculando…';
      try {
        const estado = { evaluacion: { nombre: E.meta.nombre, fecha: E.meta.fecha }, ind: E.ind, dim: E.dim };
        const r = root.KitEstudios.prepararDdhh(cat, esquemas, existentes, root.KitCuestionarioDdhh.entradaDesde(cat, estado));
        if (r.errores.length) { aviso.textContent = 'Hay datos por corregir: ' + r.errores.slice(0, 3).map(x => x.mensaje).join(' '); boton.disabled = false; return; }
        for (const n of COLECCIONES) if (r.registros[n]?.length) await d.guardarVarios(p.empresa, n, r.registros[n]);
        await guardar(AVANCE, { ...E.meta, estado: 'publicada', publicada: new Date().toISOString(), evaluacion: r.registros['ddhh-evaluaciones'][0]?.id || null });
        aviso.textContent = 'Listo. Los Resultados ya se ven en la pestaña Resultados.';
        const [b2, a2, ...ex] = await Promise.all([d.listar(p.empresa, BORRADOR), d.listar(p.empresa, AVANCE), ...COLECCIONES.map(n => d.listar(p.empresa, n))]);
        COLECCIONES.forEach((n, i) => { existentes[n] = ex[i]; }); E = armar(cat, existentes, b2, a2); tablero();
      } catch (e) { aviso.textContent = e.message || 'No se pudieron calcular los Resultados.'; boton.disabled = false; }
    }

    tablero();
    return desmontar;
  }

  // Envuelve la Alimentación del Módulo II (la carga por Excel y el cuestionario quedan como otras formas de cargar).
  function instalar() {
    const original = root.App?.vista?.('ddhh/alimentacion');
    if (!original) return;
    root.App.registrarVista('ddhh/alimentacion', { render: (c, d, p) => render(c, d, p, original) });
  }
  // Para la pestaña Resultados: ¿hay una evaluación en proceso y cuánto lleva?
  async function enProceso(d, empresa, total = 16) {
    const avance = await d.listar(empresa, AVANCE), meta = avance.find(a => a.id === 'evaluacion');
    if (meta?.estado !== 'en-proceso') return null;
    const completas = avance.filter(a => a.ciclo === meta.ciclo && a.estado === 'completa').length;
    return { nombre: meta.nombre, completas, total };
  }
  instalar();
  const api = { armar, cifras, enlaceValido, enProceso, BORRADOR, AVANCE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitAlimentacionDdhh = api;
}(typeof window !== 'undefined' ? window : globalThis));
