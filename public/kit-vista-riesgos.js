/* Kit E17. Adapta el mapa, fichas y pilares del Demo A a KitDatos. */
(function (root) {
  'use strict';
  const App = root.App, K = root.KitRiesgos, V = root.KitValidacion;
  const el = App.el, colecciones = ['riesgos', 'riesgos-calificacion', 'riesgos-grupos', 'riesgos-validaciones', 'riesgos-medidas'];
  const titulos = ['Riesgos', 'Calificación técnica', 'Grupos', 'Validaciones', 'Medidas'];
  const numero = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
  const recursos = new Map();
  function json(ruta) {
    if (!recursos.has(ruta)) recursos.set(ruta, root.fetch(ruta).then(r => { if (!r.ok) throw Error('No se pudo cargar la configuración.'); return r.json(); }).catch(e => { recursos.delete(ruta); throw e; }));
    return recursos.get(ruta).then(x => JSON.parse(JSON.stringify(x)));
  }
  const boton = (texto, fn) => { const b = el('button', texto, 'boton secundario'); b.type = 'button'; b.onclick = fn; return b; };
  const texto = (n, valor) => n.append(el('p', valor));
  function mensaje(n, valor) { const p = el('p', valor, 'kr-mensaje'); p.setAttribute('role', 'status'); n.append(p); return p; }
  function bloque(n, titulo) { const s = el('section', null, 'kr-bloque'); s.append(el('h3', titulo)); n.append(s); return s; }
  function ruta(empresa, vista) { return '#/e/' + encodeURIComponent(empresa) + '/riesgos/' + vista; }
  function enlace(n, empresa) { const a = el('a', 'Ir a Alimentación'); a.href = ruta(empresa, 'alimentacion'); n.append(a); }
  function volver(n, empresa) {
    const a = el('a', '← Volver a la matriz'); a.href = ruta(empresa, 'matriz'); n.append(a);
  }
  function accesos(n, params) {
    const pie = el('div', null, 'kr-acciones');
    [['medidas', 'Medidas de gestión'], ...(params.puedeEditar ? [['alimentacion', 'Alimentación']] : [])].forEach(([vista, nombre]) => {
      const a = el('a', nombre, 'boton secundario'); a.href = ruta(params.empresa, vista); pie.append(a);
    }); n.append(pie);
  }
  function tabla(n, cabeceras, filas) {
    const marco = el('div', null, 'kr-tabla'), t = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
    cabeceras.forEach(c => { const th = el('th', c); th.scope = 'col'; tr.append(th); }); head.append(tr);
    filas.forEach(f => { const row = el('tr'); f.forEach(v => { const td = el('td'); td.append(typeof v === 'object' ? v : el('span', String(v ?? '—'))); row.append(td); }); body.append(row); });
    t.append(head, body); marco.append(t); n.append(marco);
  }
  function seleccionar(n, etiqueta, opciones, valor = '') {
    const label = el('label', etiqueta), select = el('select');
    opciones.forEach(o => { const op = el('option', typeof o === 'string' ? o : o.nombre); op.value = typeof o === 'string' ? o : o.id; select.append(op); });
    select.value = valor; label.append(select); n.append(label); return select;
  }
  function contexto(contenedor, datos, params, cfg) {
    let cerrado = false, cerrarDialogo = () => {}, focoOrigen;
    const activo = () => !cerrado && params.vigente();
    const error = (n, e) => { if (!activo()) return; if (e.sesionCerrada) { App.actualizarVista(); return; } mensaje(n, e.message || 'No se pudo completar la operación.'); };
    const ctx = { contenedor, datos, params, cfg, activo, error, listas: {} };
    ctx.cargar = async nombres => { await Promise.all(nombres.map(async c => { if (!ctx.listas[c]) ctx.listas[c] = await datos.listar(params.empresa, c); })); };
    ctx.dialogo = titulo => {
      const origen = focoOrigen?.isConnected ? focoOrigen : root.document.activeElement;
      cerrarDialogo();
      focoOrigen = origen;
      const anterior = origen, fondo = el('div', null, 'kr-fondo'), panel = el('section', null, 'kr-dialogo kit-ficha');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'kr-dialogo-titulo'); panel.tabIndex = -1;
      const cab = el('header', null, 'kit-caja kit-caja-destacada kit-ficha-encabezado'); const h = el('h2', titulo); cab.append(h); h.id = 'kr-dialogo-titulo';
      const regiones = [...root.document.body.children].map(n => [n, n.inert]); regiones.forEach(([n]) => { n.inert = true; });
      const cerrar = () => { root.document.removeEventListener('keydown', teclado); fondo.remove(); regiones.forEach(([n, previo]) => { n.inert = previo; }); if (activo()) { if (anterior?.isConnected) anterior.focus(); else contenedor.focus(); } cerrarDialogo = () => {}; focoOrigen = null; };
      const teclado = e => {
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        if (e.key === 'Tab') {
          const focos = [...panel.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex="0"]')].filter(n => !n.disabled && !n.hidden && !n.closest('[hidden]'));
          const primero = focos[0], ultimo = focos.at(-1);
          if (e.shiftKey && (root.document.activeElement === primero || root.document.activeElement === panel)) { e.preventDefault(); ultimo?.focus(); }
          else if (!e.shiftKey && root.document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
        }
      };
      const b = boton('×', cerrar); b.className = 'kit-cerrar'; b.setAttribute('aria-label', 'Cerrar'); panel.append(b, cab); fondo.onclick = e => { if (e.target === fondo) cerrar(); }; fondo.append(panel); root.document.body.append(fondo);
      root.document.addEventListener('keydown', teclado); b.focus(); cerrarDialogo = cerrar;
      ctx.panelActual = panel;
      return panel;
    };
    ctx.limpiar = () => { cerrado = true; cerrarDialogo(); };
    return ctx;
  }
  const tecnica = (ctx, id) => ctx.listas['riesgos-calificacion'].find(c => c.riesgo === id);
  const prioridad = (ctx, id) => K.prioridad(tecnica(ctx, id), ctx.cfg) || 'Sin calificación';
  const calTexto = (c, cfg) => { const g = K.gravedad(c, cfg); return g ? `Gravedad ${numero(g.promedio)} (${g.nivel}) · Probabilidad ${c.probabilidad || 'sin asignar'} · Prioridad ${K.prioridad(c, cfg) || 'sin asignar'}` : 'Completa los tres criterios con enteros de 1 a 3.'; };
  function detalles(n, registro, esquema) {
    Object.entries(esquema.campos).forEach(([k, r]) => { if (registro[k] !== undefined && registro[k] !== '') texto(n, `${r.etiqueta}: ${Array.isArray(registro[k]) ? registro[k].join(' · ') : registro[k]}`); });
  }
  function caja(n, titulo) { const s = el('section', null, 'kit-caja'); s.append(el('h3', titulo)); n.append(s); return s; }
  async function fichaRiesgo(ctx, r) {
    const panel = ctx.dialogo(`${r.codigo} · ${r.nombre}`);
    panel.classList.add('kr-ficha-riesgo');
    caja(panel, 'Descripción del riesgo').append(el('p', r.descripcion || 'Sin descripción.', 'kr-descripcion'));
    const columnas = el('div', null, 'kit-ficha-rejilla'), izquierda = el('div', null, 'kit-ficha-pila'), derecha = el('div', null, 'kit-ficha-pila');
    columnas.append(izquierda, derecha); panel.append(columnas);
    const c = tecnica(ctx, r.id), g = K.gravedad(c, ctx.cfg), oficial = caja(izquierda, 'Calificación técnica');
    const tablaTecnica = el('table', null, 'kit-mini-tabla kr-tecnica'), cuerpo = el('tbody');
    tablaTecnica.setAttribute('aria-label', 'Calificación técnica');
    function filaTecnica(nombre, nivel, valor = nivel) {
      const fila = el('tr'), th = el('th', nombre), td = el('td', valor || 'Sin calificar');
      th.scope = 'row';
      if (['Alta', 'Media', 'Baja'].includes(nivel)) td.className = 'kr-' + nivel.toLowerCase();
      fila.append(th, td); cuerpo.append(fila);
    }
    filaTecnica('Gravedad', g?.nivel, g ? g.nivel + ' · promedio ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(g.promedio) : null);
    filaTecnica('Probabilidad', c?.probabilidad);
    filaTecnica('Prioridad', K.prioridad(c, ctx.cfg));
    const subtitulo = el('tr'), th = el('th', 'Criterios de gravedad', 'kr-tecnica-subtitulo');
    th.setAttribute('colspan', '2'); subtitulo.append(th); cuerpo.append(subtitulo);
    ctx.cfg.gravedad.criterios.forEach(k => {
      const nivel = ({ 1: 'Baja', 2: 'Media', 3: 'Alta' })[c?.[k]];
      filaTecnica(({ escala: 'Escala', alcance: 'Alcance', irremediabilidad: 'Carácter de irremediabilidad' })[k], nivel, nivel ? c[k] + ' · ' + nivel : null);
    });
    tablaTecnica.append(cuerpo); oficial.append(tablaTecnica);
    function dato(n, nombre, valores) { const d = el('div', null, 'kit-ficha-dato'); d.append(el('span', nombre, 'kit-ficha-rotulo')); valores.forEach(v => d.append(el('p', v))); n.append(d); return d; }
    const derechos = caja(derecha, 'Afectación');
    dato(derechos, 'Derecho humano afectado', [r.derecho_humano || 'Sin asignar']);
    dato(derechos, 'Relación', [(c?.vinculacion || 'Sin calificar') + (c?.tipo_impacto ? ' · impacto ' + c.tipo_impacto.toLowerCase() : '')]);
    dato(derechos, 'Grupos de interés afectados', r.ambitos?.length ? r.ambitos : ['Sin registrar']);
    const medidas = caja(derecha, 'Medidas de gestión'), lista = ctx.listas['riesgos-medidas'].filter(a => a.riesgos?.includes(r.id));
    if (!lista.length) texto(medidas, 'Sin medidas asociadas');
    [...new Set(lista.map(a => a.componente))].forEach(id => {
      const grupo = dato(medidas, 'Pilar', [K.componentes(ctx.cfg, ctx.params.empresa).find(p => p.id === id)?.nombre || id]);
      lista.filter(a => a.componente === id).forEach(a => { const medida = el('div', null, 'kit-ficha-dato'); medida.append(el('p', `${a.codigo} · ${a.titulo}`), el('span', a.estado, 'kit-ficha-nota')); grupo.append(medida); });
    });
    const validaciones = caja(derecha, 'Validación de los grupos de interés');
    const registros = ctx.listas['riesgos-validaciones'].filter(v => v.riesgo === r.id);
    validaciones.append(el('span', registros.length ? 'Validado' : 'Sin validar', 'kr-etiqueta ' + (registros.length ? 'kr-baja' : 'kr-sin-validar')));
    const mas = el('details', null, 'kr-mas'); mas.append(el('summary', 'Más información')); panel.append(mas);
    if (c) {
      texto(mas, calTexto(c, ctx.cfg));
      texto(mas, c.justificacion || 'Sin justificación.');
      texto(mas, 'Tipos de medida: ' + (ctx.cfg.tiposMedida[c.vinculacion]?.[c.tipo_impacto] || []).join(' · '));
    }
    const control = caja(mas, 'Contexto y controles');
    ['localizacion', 'actividades', 'medidas_control', 'analisis_controles'].forEach(k => { if (r[k]) texto(control, r[k]); });
    const propuestas = caja(mas, 'Validación y propuestas de los grupos');
    texto(propuestas, K.validacion(r.id, ctx.listas['riesgos-validaciones'], ctx.cfg).texto);
    try {
      await ctx.cargar(['riesgos-grupos']);
      if (!ctx.activo() || ctx.panelActual !== panel || !panel.isConnected) return;
      ctx.listas['riesgos-validaciones'].filter(v => v.riesgo === r.id).forEach(v => {
        const grupo = ctx.listas['riesgos-grupos'].find(g => g.id === v.grupo), s = caja(propuestas, grupo?.nombre || v.grupo);
        validaciones.append(el('p', `${grupo?.nombre || v.grupo}: ${v.resultado}`, 'kr-validacion-detalle kit-ficha-nota'));
        texto(s, v.resultado); texto(s, v.comentario || 'Sin comentario.');
        if (v.resultado === ctx.cfg.resultadoAjuste) {
          Object.entries(v).filter(([k, valor]) => k.startsWith('propuesta_') && valor !== '' && valor != null).forEach(([k, valor]) => texto(s, `${k.slice(10).replaceAll('_', ' ')} propuesto: ${valor}`));
          texto(s, 'Con el ajuste: ' + calTexto(K.ajuste(c, v, ctx.cfg).calificacion, ctx.cfg));
          texto(s, 'La propuesta no cambia la calificación oficial.');
        }
      });
    } catch (e) { ctx.error(validaciones, e); }

  }
  // E67 (Felipe, 9-nov): misma lectura que los módulos I y III (E65, E66). La matriz 3 × 3 de gravedad y probabilidad
  // se lee por celdas: en cada una, un círculo por relación de la empresa con el impacto (causa, contribuye,
  // directamente vinculada). El punto de color de cada riesgo es su tipo de impacto (potencial o manifestado).
  const CIRC = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const icono = (d, color) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`);
  const VINCULOS = [
    ['Causa', 'Causa el impacto', '#6E3A6E', CIRC(12, 12, 8) + CIRC(12, 12, 4.5) + CIRC(12, 12, 1)],
    ['Contribuye', 'Contribuye al impacto', '#B78D36', CIRC(8, 8, 2.5) + CIRC(16, 8, 2.5) + 'M3 19c0-3 2-5 5-5s5 2 5 5M11 19c0-3 2-5 5-5s5 2 5 5'],
    ['Directamente vinculada', 'Directamente vinculada', '#2F5D7C', 'M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6l-1.2 1.2M14 10a4 4 0 0 1 0 5.6l-2.4 2.4a4 4 0 0 1-5.6-5.6l1.2-1.2']
  ].map(([id, nombre, color, d]) => ({ id, nombre, color, icono: icono(d, '#1F241B') }));
  const SIN_VINCULO = { id: '', nombre: 'Sin relación asignada', color: '#7C7F70', icono: icono(CIRC(12, 12, 8), '#1F241B') };
  const TIPOS = [['Potencial', 'potencial'], ['Manifestado', 'manifestado']];
  const RANGOS = { Baja: [1, 1.5], Media: [1.5, 2.5], Alta: [2.5, 3] };
  function filaResumen(cifra, rotulo, clase) { const d = el('details', null, 'ka-res-fila ' + clase), s = el('summary'); s.append(el('span', '#', 'ka-res-icono'), el('strong', cifra), el('span', rotulo, 'ka-res-rotulo')); d.append(s); return d; }
  async function matriz(contenedor, datos, params) {
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg), KC = root.KitCuadrantes;
    await ctx.cargar(['riesgos', 'riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas']); if (!ctx.activo()) return;
    const riesgos = ctx.listas.riesgos; contenedor.classList.add('kr');
    if (!riesgos.length) { texto(contenedor, 'Esta empresa aún no tiene riesgos registrados. Registra el riesgo y su calificación técnica para ubicarlo en la matriz.'); accesos(contenedor, params); return ctx.limpiar; }
    const vinculo = r => VINCULOS.find(v => v.id === tecnica(ctx, r.id)?.vinculacion) || SIN_VINCULO;
    const tipo = r => tecnica(ctx, r.id)?.tipo_impacto || 'Potencial';
    const medidasDe = lista => { const ids = new Set(lista.map(r => r.id)); return ctx.listas['riesgos-medidas'].filter(a => a.riesgos?.some(id => ids.has(id))); };
    const abrir = r => fichaRiesgo(ctx, r);
    const raiz = el('div', null, 'ka-resultados kr-tablero'), lateral = el('aside', null, 'ka-lateral'), figura = el('figure', null, 'ka-matriz');
    const vinculosPresentes = VINCULOS.filter(v => riesgos.some(r => vinculo(r) === v));
    const vista = seleccionar(lateral, 'Vista', [{ id: '', nombre: 'General' }, ...vinculosPresentes.map(v => ({ id: v.id, nombre: v.nombre }))]);
    const filtro = seleccionar(lateral, 'Filtro', [{ id: '', nombre: 'Todos los tipos de impacto' }, ...TIPOS.map(([t]) => ({ id: t, nombre: t === 'Potencial' ? 'Potenciales' : 'Manifestados' }))]);
    [...lateral.children].forEach(l => { l.className = 'ka-vista'; });
    const tarjeta = el('section', null, 'ka-resumen-tarjeta'), met = el('a', null, 'ka-met-tarjeta'); met.href = '#/riesgos/' + encodeURIComponent(params.empresa) + '/metodologia';
    const ico = root.KitVistaMetodologia?.ICONOS?.balanza; if (ico) { const s = KC.svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'ka-met-icono' }); s.append(KC.svg('path', { d: ico })); met.append(s); }
    met.append(el('strong', 'Metodología'), el('span', 'Debida diligencia: cómo se calificó la gravedad y la probabilidad de cada riesgo.'));
    lateral.append(tarjeta, met);
    const marco = el('div', null, 'ka-marco-oro'), leyenda = el('figcaption', null, 'ka-convenciones'), verMatriz = el('button', 'Matriz de riesgos', 'ka-ver-matriz'); verMatriz.type = 'button';
    figura.append(marco, leyenda, verMatriz); raiz.append(lateral, figura); contenedor.append(raiz);
    const visiblesAhora = () => riesgos.filter(r => (!vista.value || vinculo(r).id === vista.value) && (!filtro.value || tipo(r) === filtro.value));
    const descripcion = () => [vista.value ? VINCULOS.find(v => v.id === vista.value).nombre : 'Todas las relaciones', filtro.value ? (filtro.value === 'Potencial' ? 'potenciales' : 'manifestados') : 'todos los tipos de impacto'].join(' · ');
    const etiquetaRiesgo = r => `${r.codigo} · ${r.nombre}`;
    function zoomDe(c) {
      const lista = visiblesAhora().filter(r => K.gravedad(tecnica(ctx, r.id), cfg)?.nivel === c.gravedad && tecnica(ctx, r.id)?.probabilidad === c.probabilidad);
      const w = KC.ventana(`Gravedad ${c.gravedad.toLowerCase()} · probabilidad ${c.probabilidad.toLowerCase()}`, 'ka-zoom kr-zoom kr-zoom-' + c.prioridad.toLowerCase(), el);
      const med = medidasDe(lista);
      w.panel.append(el('p', `Prioridad ${c.prioridad.toLowerCase()} · ${descripcion()}`, 'ka-zoom-vista'), KC.resumen([[numero(lista.length), lista.length === 1 ? 'Riesgo en la celda' : 'Riesgos en la celda', 'total'], [numero(med.length), 'Medidas asociadas', 'actores'],
        [numero(med.filter(a => a.estado === cfg.estadoCumplido).length), 'Medidas cumplidas', 'favorable'], ...TIPOS.map(([t, s]) => [numero(lista.filter(r => tipo(r) === t).length), t === 'Potencial' ? 'Impactos potenciales' : 'Impactos manifestados', 'tip-' + s])], el));
      if (!lista.length) { w.panel.append(el('p', 'No hay riesgos en esta celda con la vista y el filtro elegidos.', 'nota')); return; }
      const ordenados = [...lista].sort((a, b) => (K.gravedad(tecnica(ctx, b.id), cfg)?.promedio || 0) - (K.gravedad(tecnica(ctx, a.id), cfg)?.promedio || 0) || a.codigo.localeCompare(b.codigo, 'es'));
      w.panel.append(KC.zoom({ numero, ejeX: 'Probabilidad ' + c.probabilidad.toLowerCase(), ejeY: 'Gravedad (promedio de los tres criterios)', etiqueta: `${lista.length} riesgos en su posición`, xr: [0, 1], yr: RANGOS[c.gravedad], marcasX: false, abrir,
        puntos: ordenados.map(r => { const v = vinculo(r), g = K.gravedad(tecnica(ctx, r.id), cfg), t = tipo(r);
          return { id: r.id, dato: r, nombre: etiquetaRiesgo(r), x: .5, y: g.promedio, color: v.color, icono: v.icono, clase: 'ka-tip-' + t.toLowerCase(), etiqueta: `${etiquetaRiesgo(r)}. ${v.nombre}. Impacto ${t.toLowerCase()}. Gravedad ${numero(g.promedio)}. Abrir ficha` }; }) }),
        KC.leyenda(TIPOS.map(([t, s]) => ['Impacto ' + t.toLowerCase(), 'ka-tip-' + s]), el));
      w.panel.append(el('p', 'Cada riesgo está a la altura de su gravedad (promedio de los tres criterios). La probabilidad es una categoría, por eso los riesgos de la celda comparten columna; el punto negro marca su posición real.', 'nota ka-zoom-nota'));
    }
    verMatriz.onclick = () => {
      const w = KC.ventana('Matriz de riesgos', 'ka-matriz-dialogo kr-matriz-dialogo', el), filtros = el('div', null, 'kr-filtros'), lista = el('div');
      const base = visiblesAhora(), opciones = valores => [{ id: '', nombre: 'Todos' }, ...valores];
      const derecho = seleccionar(filtros, 'Derecho', opciones([...new Set(base.map(r => r.derecho_humano))]));
      const ambito = seleccionar(filtros, 'Ámbito', opciones([...new Set(base.flatMap(r => r.ambitos || []))]));
      const prio = seleccionar(filtros, 'Prioridad', opciones([...cfg.niveles, 'Sin calificación']));
      const validado = seleccionar(filtros, 'Estado de validación', opciones(['Pendiente', 'Revisado', 'Con ajustes', 'Todos confirman']));
      const pintarLista = () => {
        lista.replaceChildren();
        const filtrados = base.filter(r => {
          const v = K.validacion(r.id, ctx.listas['riesgos-validaciones'], cfg), estado = validado.value;
          return (!derecho.value || derecho.value === r.derecho_humano) && (!ambito.value || r.ambitos?.includes(ambito.value)) && (!prio.value || prioridad(ctx, r.id) === prio.value) && (!estado || (estado === 'Pendiente' && !v.revisados) || (estado === 'Revisado' && v.revisados) || (estado === 'Con ajustes' && v.revisados > v.confirman) || (estado === 'Todos confirman' && v.revisados > 0 && v.confirman === v.revisados));
        });
        const orden = r => { const i = cfg.niveles.indexOf(prioridad(ctx, r.id)); return i < 0 ? cfg.niveles.length : i; };
        filtrados.sort((a, b) => orden(a) - orden(b) || a.id.localeCompare(b.id));
        tabla(lista, ['Riesgo', 'Derecho afectado', 'Grupos afectados', 'Relación', 'Tipo de impacto', 'Gravedad', 'Probabilidad', 'Prioridad', 'Medidas', 'Validación'], filtrados.map(r => {
          const c = tecnica(ctx, r.id), g = K.gravedad(c, cfg), b = boton(etiquetaRiesgo(r), () => abrir(r)); b.className = 'ka-principal';
          return [b, r.derecho_humano, (r.ambitos || []).join(' · ') || 'Sin registrar', c?.vinculacion || 'Sin calificar', c?.tipo_impacto || 'Sin calificar', g ? `${g.nivel} · ${numero(g.promedio)}` : 'Sin calificar', c?.probabilidad || 'Sin calificar', prioridad(ctx, r.id), numero(medidasDe([r]).length), K.validacion(r.id, ctx.listas['riesgos-validaciones'], cfg).texto];
        }));
        if (!filtrados.length) texto(lista, 'No hay riesgos con estos filtros.');
      };
      [derecho, ambito, prio, validado].forEach(s => { s.onchange = pintarLista; });
      w.panel.append(el('p', `${descripcion()}.`, 'nota'), filtros, lista); pintarLista();
    };
    function pintar() {
      const visibles = visiblesAhora(), calificados = visibles.filter(r => K.prioridad(tecnica(ctx, r.id), cfg)), med = medidasDe(visibles);
      tarjeta.replaceChildren(el('h2', 'Resumen'), el('p', descripcion(), 'nota'));
      const pr = filaResumen(numero(visibles.length), 'Prioridad', 'ka-res-fav'), ul = el('ul');
      [...cfg.niveles, 'Sin calificación'].forEach(n => { const k = visibles.filter(r => prioridad(ctx, r.id) === n).length; if (n === 'Sin calificación' && !k) return; const li = el('li', null, 'kr-res-' + (n === 'Sin calificación' ? 'sin' : n.toLowerCase())); li.append(el('strong', numero(k)), el('span', n === 'Sin calificación' ? n : 'Prioridad ' + n.toLowerCase())); ul.append(li); });
      pr.append(ul, el('p', 'Riesgos según su prioridad (gravedad × probabilidad).', 'nota'));
      const rs = filaResumen(numero(visibles.length), visibles.length === 1 ? 'Riesgo' : 'Riesgos', 'ka-res-gi');
      [...VINCULOS, SIN_VINCULO].forEach(v => { const de = visibles.filter(r => vinculo(r) === v); if (!de.length) return; const sec = el('div', null, 'ka-res-grupo'), cab = el('div', null, 'ka-res-grupo-cabeza'), img = el('img'), chips = el('div', null, 'ka-chips'); img.src = v.icono; img.alt = ''; img.className = 'ka-res-grupo-icono'; cab.style.setProperty('--gi', v.color); cab.append(img, el('span', v.nombre)); de.forEach(r => { const b = boton(etiquetaRiesgo(r), () => abrir(r)); b.className = 'ka-chip'; chips.append(b); }); sec.append(cab, chips); rs.append(sec); });
      const derechos = [...new Set(visibles.map(r => r.derecho_humano).filter(Boolean))], dr = filaResumen(numero(derechos.length), derechos.length === 1 ? 'Derecho afectado' : 'Derechos afectados', 'ka-res-actores'), dl = el('ul', null, 'kr-res-lista');
      derechos.forEach(d => dl.append(el('li', `${d}: ${visibles.filter(r => r.derecho_humano === d).map(r => r.codigo).join(', ')}`))); dr.append(dl);
      const md = filaResumen(numero(med.length), med.length === 1 ? 'Medida de gestión' : 'Medidas de gestión', 'ka-res-medidas'), ml = el('ul', null, 'kr-res-lista');
      med.forEach(a => ml.append(el('li', `${a.codigo} · ${a.titulo} (${a.estado})`))); const ir = el('a', 'Ver el plan de medidas', 'kr-res-ir'); ir.href = '#/riesgos/' + encodeURIComponent(params.empresa) + '/medidas'; md.append(ml, ir);
      tarjeta.append(pr, rs, dr, md);
      const celdas = [];
      cfg.niveles.forEach((g, fila) => cfg.probabilidades.forEach((p, columna) => {
        const prioridadCelda = cfg.prioridad[g][p], en = calificados.filter(r => K.gravedad(tecnica(ctx, r.id), cfg)?.nivel === g && tecnica(ctx, r.id)?.probabilidad === p);
        celdas.push({ fila, columna, gravedad: g, probabilidad: p, prioridad: prioridadCelda, dato: g + '|' + p, nombre: 'Prioridad ' + prioridadCelda.toLowerCase(), clase: 'kr-zona-' + prioridadCelda.toLowerCase(), cuenta: `${numero(en.length)} ${en.length === 1 ? 'riesgo' : 'riesgos'}`,
          grupos: [...VINCULOS, SIN_VINCULO].map(v => ({ nombre: v.nombre, color: v.color, icono: v.icono, n: en.filter(r => vinculo(r) === v).length })) });
      }));
      marco.replaceChildren(KC.general({ numero, filas: cfg.niveles.length, columnas: cfg.probabilidades.length, ejeX: 'Probabilidad', ejeY: 'Gravedad', etiquetasX: cfg.probabilidades, etiquetasY: cfg.niveles, etiqueta: `Matriz de riesgos: gravedad en filas, probabilidad en columnas, con ${numero(calificados.length)} riesgos calificados`, cuadrantes: celdas, alZoom: zoomDe }));
      leyenda.replaceChildren();
      vinculosPresentes.forEach(v => { const s = el('span', v.nombre, 'ka-conv-gi'); s.style.setProperty('--gi', v.color); leyenda.append(s); });
      leyenda.append(el('span', 'El color de cada celda es su prioridad. El tamaño del círculo es el número de riesgos según la relación de la empresa con el impacto. Haz clic en una celda para ampliarla.', 'nota'));
    }
    vista.onchange = pintar; filtro.onchange = pintar; pintar();
    const pendientes = riesgos.filter(r => !K.prioridad(tecnica(ctx, r.id), cfg));
    if (pendientes.length) { const s = bloque(contenedor, 'Sin calificación técnica'); pendientes.forEach(r => s.append(boton(etiquetaRiesgo(r), () => abrir(r)))); }
    accesos(contenedor, params);
    const limpiar = ctx.limpiar; return () => { limpiar(); KC.ventana.cerrarTodas(); };
  }
  async function esquema(ctx, coleccion) {
    const derechos = coleccion === 'riesgos' ? await json('data/derechos.json') : undefined;
    return K.esquema(await json('config/esquemas/' + coleccion + '.json'), coleccion, { derechos, riesgos: ctx.listas.riesgos, cfg: ctx.cfg, empresa: ctx.params.empresa });
  }
  function validarRegistro(registro, s, referencias, coleccion, fila = 1) {
    const resultado = V.validar(registro, s, referencias);
    resultado.errores.forEach(e => { e.mensaje = `${s.titulo}, fila ${fila}: ${e.mensaje}`; });
    return resultado;
  }
  function propuestaVisible(registro, cfg) { return registro.resultado === cfg.resultadoAjuste; }
  async function formulario(ctx, n, coleccion, original, alGuardar, camposLimitados) {
    const s = await esquema(ctx, coleccion);
    let ayuda;
    if (['riesgos-calificacion', 'riesgos-validaciones'].includes(coleccion)) ayuda = (await json('config/criticidad-config.json')).gravedad.parametros;
    if (!ctx.activo() || !n.isConnected) return;
    const form = el('form', null, 'kr-form'), controles = {}, errores = {}, filas = {};
    form.noValidate = true;
    const campos = camposLimitados || Object.keys(s.campos), nuevo = !original;
    campos.forEach(k => {
      const regla = s.campos[k], row = el('div', null, 'kr-campo'), label = el('label', regla.etiqueta + (regla.obligatorio ? ' *' : ''));
      let input;
      if (['lista', 'referencia'].includes(regla.tipo)) {
        input = el('select'); input.multiple = !!regla.multiple;
        if (!input.multiple) { const op = el('option', 'Selecciona…'); op.value = ''; input.append(op); }
        const opciones = regla.tipo === 'referencia' ? ctx.listas[regla.coleccion].map(r => ({ id: r.id, nombre: r.codigo ? `${r.codigo} · ${r.nombre || r.titulo || ''}` : r.nombre })) : regla.valores.map(id => ({ id, nombre: k === 'componente' ? K.componentes(ctx.cfg, ctx.params.empresa).find(c => c.id === id)?.nombre || id : k === 'riesgos' ? ctx.listas.riesgos.find(r => r.id === id)?.codigo || id : id }));
        opciones.forEach(o => { const op = el('option', o.nombre); op.value = o.id; op.selected = regla.multiple ? !!original?.[k]?.includes(o.id) : original?.[k] === o.id; input.append(op); });
      } else { input = el(regla.tipo === 'texto-largo' ? 'textarea' : 'input'); if (input.tagName !== 'TEXTAREA') input.type = regla.tipo === 'fecha' ? 'date' : regla.tipo === 'entero' ? 'number' : 'text'; if (regla.min !== undefined) input.min = regla.min; if (regla.max !== undefined && regla.tipo === 'entero') input.max = regla.max; if (regla.tipo === 'entero') input.step = '1'; }
      input.name = k; input.id = 'kr-campo-' + k;
      if (!regla.multiple) input.value = original?.[k] ?? '';
      if (!nuevo && ['codigo', 'riesgo', 'grupo'].includes(k)) input.disabled = true;
      const error = el('p', '', 'kr-error'); error.id = 'kr-error-' + k; error.setAttribute('aria-live', 'polite'); input.setAttribute('aria-describedby', error.id);
      label.htmlFor = input.id; row.append(label, input, error);
      const criterio = k.replace('propuesta_', ''), definiciones = ayuda?.[criterio === 'irremediabilidad' ? 'irreparable' : criterio];
      if (definiciones) { const ul = el('ul', null, 'kr-ayuda'); definiciones.forEach(d => ul.append(el('li', `${d.valor}: ${d.descripcion}`))); row.append(ul); }
      form.append(row); controles[k] = input; errores[k] = error; filas[k] = row;
    });
    if (coleccion === 'riesgos-grupos' && !s.campos.categoria.valores.length) texto(form, 'El catálogo de categorías del Módulo I está pendiente de definición. Es necesario configurarlo antes de guardar grupos.');
    const vivo = el('p', '', 'kr-vivo'); vivo.setAttribute('role', 'status');
    const aviso = el('p'); aviso.setAttribute('role', 'status'); const preview = el('div', null, 'kr-previa');
    const leer = () => {
      const r = { ...original };
      campos.forEach(k => { r[k] = controles[k].multiple ? [...controles[k].options].filter(o => o.selected).map(o => o.value) : controles[k].value; });
      if (coleccion === 'riesgos-validaciones' && !propuestaVisible(r, ctx.cfg)) Object.keys(r).filter(k => k.startsWith('propuesta_')).forEach(k => { delete r[k]; });
      return r;
    };
    const actualizar = () => {
      preview.replaceChildren(); aviso.textContent = '';
      const r = leer();
      Object.keys(filas).filter(k => k.startsWith('propuesta_')).forEach(k => { filas[k].hidden = !propuestaVisible(r, ctx.cfg); });
      const numerico = x => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, ctx.cfg.gravedad.criterios.includes(k.replace('propuesta_', '')) && v !== '' ? Number(v) : v]));
      if (coleccion === 'riesgos-calificacion') vivo.textContent = calTexto(numerico(r), ctx.cfg);
      if (coleccion === 'riesgos-validaciones' && propuestaVisible(r, ctx.cfg)) vivo.textContent = 'Con el ajuste: ' + calTexto(K.ajuste(tecnica(ctx, r.riesgo), numerico(r), ctx.cfg).calificacion, ctx.cfg);
      else if (coleccion === 'riesgos-validaciones') vivo.textContent = '';
    };
    Object.values(controles).forEach(i => { i.oninput = actualizar; i.onchange = actualizar; });
    const guardar = boton('Revisar y guardar'); guardar.type = 'submit';
    form.append(vivo, aviso, guardar, preview); n.append(form); actualizar();
    form.onsubmit = async e => {
      e.preventDefault(); if (!ctx.activo() || !ctx.params.puedeEditar) return;
      Object.keys(errores).forEach(k => { errores[k].textContent = ''; controles[k].setAttribute('aria-invalid', 'false'); }); preview.replaceChildren();
      const resultado = K.preparar(coleccion, leer(), { esquema: s, cfg: ctx.cfg, listas: ctx.listas, original });
      const r = resultado.registro;
      if (resultado.errores.length) {
        resultado.errores.forEach(e => { if (errores[e.campo]) { errores[e.campo].textContent = e.mensaje; controles[e.campo].setAttribute('aria-invalid', 'true'); } else aviso.textContent = e.mensaje; });
        controles[resultado.errores[0].campo]?.focus(); return;
      }
      preview.append(el('h3', 'Revisa antes de guardar')); detalles(preview, r, s);
      const confirmar = boton('Confirmar guardado', async () => {
        if (!ctx.activo() || !ctx.params.puedeEditar) return;
        confirmar.disabled = true; guardar.disabled = true; aviso.textContent = 'Guardando…';
        try {
          const guardado = await ctx.datos.guardar(ctx.params.empresa, coleccion, r.id, r);
          if (!ctx.activo() || !form.isConnected) return;
          const lista = ctx.listas[coleccion] || [], indice = lista.findIndex(x => x.id === r.id);
          if (indice < 0) lista.push(guardado); else lista[indice] = guardado;
          ctx.listas[coleccion] = lista; aviso.textContent = 'Cambios guardados.'; await alGuardar(guardado);
        } catch (error) { ctx.error(aviso, error); confirmar.disabled = false; guardar.disabled = false; }
      }); preview.append(confirmar); confirmar.focus();
    };
    controles[campos[0]]?.focus();
  }
  function anillo(n, porcentaje) {
    const a = el('div', numero(porcentaje) + ' %', 'kr-anillo'); a.style.setProperty('--avance', porcentaje + '%'); a.setAttribute('aria-label', 'Avance: ' + numero(porcentaje) + ' por ciento'); n.append(a);
  }
  async function medidas(contenedor, datos, params) {
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); await ctx.cargar(['riesgos', 'riesgos-calificacion', 'riesgos-medidas']); if (!ctx.activo()) return;
    contenedor.classList.add('kr');
    const plazoTexto = a => { const p = K.plazo(a, ctx.listas['riesgos-calificacion'], cfg); return p.propuesto ? p.meses ? `Plazo propuesto: ${p.meses} meses desde la aprobación de la medida` : 'Completa la calificación de los riesgos para proponer el plazo' : `Plazo: ${new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC' }).format(new Date(p.fecha + 'T00:00:00Z'))}`; };
    function fichaAccion(a) {
      const panel = ctx.dialogo(`${a.codigo} · ${a.titulo}`);
      const detalle = caja(panel, 'Descripción'); texto(detalle, a.descripcion || 'Sin descripción.'); texto(detalle, `${a.estado} · Responsable: ${a.responsable || 'sin asignar'}`); texto(detalle, plazoTexto(a));
      const links = caja(panel, 'Riesgos que atiende');
      if (!a.riesgos?.length) texto(links, 'Sin riesgo vinculado.');
      (a.riesgos || []).forEach(id => { const r = ctx.listas.riesgos.find(x => x.id === id); texto(links, `${r?.codigo || id} · ${r?.nombre || 'Riesgo no disponible'} · Prioridad ${prioridad(ctx, id)}`); });
      if (params.puedeEditar) panel.append(boton('Editar acción', async function () { this.disabled = true; const zona = caja(panel, 'Actualizar acción'); try { await formulario(ctx, zona, 'riesgos-medidas', a, guardado => { pintar(); fichaAccion(guardado); }, ['estado', 'plazo', 'responsable']); } catch (e) { ctx.error(zona, e); this.disabled = false; } }));
    }
    function fichaPilar(c) {
      const panel = ctx.dialogo(c.nombre), lista = ctx.listas['riesgos-medidas'].filter(a => a.componente === c.id);
      anillo(panel, c.porcentaje);
      if (!lista.length) texto(panel, 'Este componente aún no tiene medidas.');
      tabla(panel, ['Acción', 'Responsable', 'Plazo', 'Estado'], lista.map(a => [boton(`${a.codigo} · ${a.titulo}`, () => fichaAccion(a)), a.responsable, plazoTexto(a), a.estado]));
    }
    function pintar() {
      contenedor.replaceChildren(); volver(contenedor, params.empresa); const lista = ctx.listas['riesgos-medidas'], avance = K.avance(lista, cfg, params.empresa);
      contenedor.append(el('h2', 'Plan de acción y pilares de intervención'));
      const cuerpo = el('div', null, 'kr-plan'), global = el('section', null, 'tarjeta kr-global'), pilares = el('section', null, 'kr-pilares');
      global.append(el('h3', 'Avance general')); anillo(global, avance.porcentaje); texto(global, `${avance.cumplidas} de ${avance.total} medidas cumplidas`); texto(global, 'Las medidas en curso aún no suman al avance.');
      if (!lista.length) { texto(global, 'Aún no hay medidas de gestión.'); if (params.puedeEditar) enlace(global, params.empresa); }
      avance.componentes.forEach((c, i) => { const b = boton('', () => fichaPilar(c)); b.className = 'kr-pilar'; const t = el('span'); t.append(el('small', `Pilar ${i + 1}`, 'antetitulo'), el('strong', c.nombre), el('span', `${c.total} ${c.total === 1 ? 'medida' : 'medidas'}`)); b.append(t); anillo(b, c.porcentaje); pilares.append(b); });
      cuerpo.append(global, pilares); contenedor.append(cuerpo);
      const sin = K.sinMedida(ctx.listas.riesgos, lista);
      if (sin.length) { const alerta = bloque(contenedor, 'Riesgos sin medida'); alerta.setAttribute('role', 'status'); sin.forEach(r => texto(alerta, `${r.codigo} · ${r.nombre} · Prioridad ${prioridad(ctx, r.id)}`)); if (params.puedeEditar) enlace(alerta, params.empresa); }
    }
    pintar(); return ctx.limpiar;
  }
  async function edicionTabla(contenedor, datos, params) {
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); contenedor.classList.add('kr');
    const nav = el('nav', null, 'kr-subtabs'), zona = el('section'); nav.setAttribute('aria-label', 'Tipos de registro'); let revision = 0, coleccionActual = 'riesgos';
    const dependencias = { riesgos: [], 'riesgos-calificacion': ['riesgos'], 'riesgos-grupos': [], 'riesgos-validaciones': ['riesgos', 'riesgos-grupos', 'riesgos-calificacion'], 'riesgos-medidas': ['riesgos'] };
    async function abrir(coleccion) {
      coleccionActual = coleccion;
      const turno = ++revision; zona.replaceChildren(el('p', 'Cargando…'));
      [...nav.children].forEach((b, i) => b.setAttribute('aria-pressed', String(colecciones[i] === coleccion)));
      try {
        await ctx.cargar([coleccion, ...dependencias[coleccion]]); const s = await esquema(ctx, coleccion);
        if (!ctx.activo() || turno !== revision) return;
        zona.replaceChildren(el('h2', s.titulo));
        const editor = el('section'), aviso = el('div');
        const editar = async registro => { editor.replaceChildren(el('h3', registro ? 'Editar registro' : 'Agregar registro')); try { await formulario(ctx, editor, coleccion, registro, () => abrir(coleccion)); } catch (e) { ctx.error(editor, e); } };
        zona.append(boton('Agregar', () => editar(null)), aviso);
        const registros = ctx.listas[coleccion];
        if (!registros.length) texto(zona, 'Aún no hay registros en esta sección.');
        tabla(zona, ['Registro', 'Contenido', 'Acciones'], registros.map(r => {
          const acciones = el('div', null, 'kr-acciones'); acciones.append(boton('Editar', () => editar(r)), boton('Borrar', async () => {
            aviso.replaceChildren();
            try {
              // Evita referencias huérfanas; estas lecturas solo ocurren al solicitar un borrado.
              const refs = coleccion === 'riesgos' ? ['riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas'] : coleccion === 'riesgos-grupos' ? ['riesgos-validaciones'] : [];
              await ctx.cargar(refs); if (!ctx.activo() || turno !== revision) return;
              const vinculado = refs.some(c => ctx.listas[c].some(x => coleccion === 'riesgos' ? x.riesgo === r.id || x.riesgos?.includes(r.id) : x.grupo === r.id));
              if (vinculado) { mensaje(aviso, 'Este registro tiene referencias. Elimina primero sus calificaciones o validaciones y retíralo de las medidas vinculadas.'); return; }
              texto(aviso, `¿Borrar ${r.codigo || r.nombre || r.id}? Esta acción quedará en el historial.`);
              const confirmar = boton('Confirmar borrado', async () => {
                if (!ctx.activo() || !params.puedeEditar || turno !== revision) return;
                confirmar.disabled = true;
                try { await datos.borrar(params.empresa, coleccion, r.id); if (!ctx.activo() || turno !== revision) return; ctx.listas[coleccion] = registros.filter(x => x.id !== r.id); await abrir(coleccion); }
                catch (e) { ctx.error(aviso, e); confirmar.disabled = false; }
              }); aviso.append(confirmar, boton('Cancelar', () => aviso.replaceChildren())); confirmar.focus();
            } catch (e) { ctx.error(aviso, e); }
          }));
          return [r.codigo || r.nombre || r.id, r.titulo || r.nombre || r.resultado || r.probabilidad || '', acciones];
        })); zona.append(editor);
      } catch (e) { if (turno === revision) { zona.replaceChildren(); ctx.error(zona, e); zona.append(boton('Reintentar', () => abrir(coleccion))); } }
    }
    colecciones.forEach((c, i) => nav.append(boton(titulos[i], () => abrir(c))));
    const historial = el('div'), enlaceHistorial = boton('Historial de cambios', async () => {
      historial.replaceChildren(el('p', 'Cargando historial…'));
      try {
        const cambios = (await Promise.all(colecciones.map(coleccion => datos.historial(params.empresa, { coleccion, limite: 50 })))).flat().sort((a, b) => Number(b.n) - Number(a.n)).slice(0, 50);
        if (!ctx.activo()) return; historial.replaceChildren(el('h3', 'Últimos cambios del módulo'));
        if (!cambios.length) texto(historial, 'Todavía no hay cambios registrados.');
        tabla(historial, ['Fecha', 'Acción', 'Registro'], cambios.map(c => [new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(c.fecha)), ({ INSERT: 'Creación', UPDATE: 'Edición', DELETE: 'Borrado' })[c.accion] || c.accion, `${titulos[colecciones.indexOf(c.coleccion)]} · ${c.registro_id}`]));
      } catch (e) { historial.replaceChildren(); ctx.error(historial, e); }
    });
    contenedor.append(nav, zona, enlaceHistorial, historial);
    await abrir('riesgos'); return ctx.limpiar;
  }
  function cargaExcel(contenedor, ctx, datos, params, alGuardar) {
    root.KitVistaCargaExcel.seccion(contenedor, {
      modulo: 'riesgos',
      rutaPlantilla: 'plantillas/plantilla-modulo-iv.xlsx',
      nombrePlantilla: 'plantilla-modulo-iv.xlsx',
      contexto: async () => {
        await ctx.cargar(colecciones);
        const esquemas = {};
        for (const c of colecciones) esquemas[c] = await json('config/esquemas/' + c + '.json');
        return {
          cfg: ctx.cfg,
          derechos: await json('data/derechos.json'),
          empresa: params.empresa,
          esquemas,
          existentes: Object.fromEntries(colecciones.map(c => [c, ctx.listas[c] || []]))
        };
      },
      guardar: async registrosPorColeccion => {
        const hechas = [];
        for (const c of colecciones) {
          const lista = registrosPorColeccion[c] || [];
          if (!lista.length) continue;
          try { await datos.guardarVarios(params.empresa, c, lista); }
          catch (e) { throw Error((hechas.length ? `Se guardaron ${hechas.join(', ')}, pero falló ${c}: ` : '') + e.message + ' Puedes volver a subir el mismo archivo: no duplica registros.'); }
          hechas.push(c);
          const porId = new Map(lista.map(r => [r.id, r]));
          ctx.listas[c] = [...(ctx.listas[c] || []).filter(r => !porId.has(r.id)), ...lista];
        }
        await alGuardar();
      },
      error: ctx.error
    });
  }
  function copia(v) { return JSON.parse(JSON.stringify(v || {})); }
  function textoCampo(textos, coleccion, campo, regla, extras = {}) { return { ...regla, ...(textos.riesgos?.[coleccion]?.[campo] || {}), ...extras }; }
  function listasConRiesgo(ctx, riesgo, grupo) {
    return { ...ctx.listas, riesgos: [...(ctx.listas.riesgos || []).filter(x => x.id !== riesgo.id), riesgo], 'riesgos-grupos': grupo ? [...(ctx.listas['riesgos-grupos'] || []).filter(x => x.id !== grupo.id), grupo] : (ctx.listas['riesgos-grupos'] || []) };
  }
  async function cuestionarioRiesgo(ctx, zona, original, textos, alVolver) {
    // En la revisión, las referencias se muestran con su código y nombre, no con el identificador interno.
    const nombreRevision = (campo, valor, salida) => {
      const riesgo = id => [...(salida.riesgos || []), ...(ctx.listas.riesgos || [])].find(x => x.id === id);
      const grupo = id => [...(salida['riesgos-grupos'] || []), ...(ctx.listas['riesgos-grupos'] || [])].find(x => x.id === id);
      if (campo === 'riesgo') { const x = riesgo(valor); return x ? x.codigo + ' · ' + x.nombre : valor; }
      if (campo === 'riesgos' && Array.isArray(valor)) return valor.map(id => riesgo(id)?.codigo || id);
      if (campo === 'grupo') return grupo(valor)?.nombre || valor;
      return valor;
    };
    const base = {};
    for (const c of colecciones) base[c] = await json('config/esquemas/' + c + '.json');
    const derechos = await json('data/derechos.json'), parametros = (await json('config/criticidad-config.json')).gravedad.parametros;
    if (!ctx.activo()) return;
    const existenteCal = original && ctx.listas['riesgos-calificacion'].find(x => x.riesgo === original.id);
    const existenteVal = original && ctx.listas['riesgos-validaciones'].find(x => x.riesgo === original.id);
    const existentesMedidas = original ? ctx.listas['riesgos-medidas'].filter(x => x.riesgos?.includes(original.id)) : [];
    const estado = {
      riesgo: copia(original), calificacion: copia(existenteCal || { riesgo: original?.id || '' }), validacion: { ...copia(existenteVal), grupoSeleccion: existenteVal?.grupo || '' }, grupoNuevo: {},
      medidas: existentesMedidas.map(m => ({ ...copia(m), __original: m.id })), originales: { riesgo: original, calificacion: existenteCal, validacion: existenteVal, medidas: existentesMedidas }
    };
    const preparado = () => {
      const salida = {}, errores = [], conteos = { nuevos: 0, actualizados: 0 };
      const sinPrefijo = (mensaje, titulo) => String(mensaje).replace(new RegExp('^' + String(titulo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', fila 1:\\s*'), '');
      const agregar = (coleccion, registro, originalRegistro, paso, prefijo, lista = ctx.listas) => {
        const s = K.esquema(base[coleccion], coleccion, { derechos, riesgos: lista.riesgos || [], cfg: ctx.cfg, empresa: ctx.params.empresa });
        const r = K.preparar(coleccion, registro, { esquema: s, cfg: ctx.cfg, listas: lista, original: originalRegistro, modo: 'formulario' });
        if (!r.ok) errores.push(...r.errores.map(e => ({ ...e, campo: e.campo ? prefijo + '.' + e.campo : '', mensaje: sinPrefijo(e.mensaje, s.titulo), paso })));
        else { (salida[coleccion] ||= []).push(r.registro); conteos[r.existe ? 'actualizados' : 'nuevos']++; }
        return r;
      };
      const riesgo = agregar('riesgos', estado.riesgo, estado.originales.riesgo, 0, 'riesgo');
      if (!riesgo.ok) return { salida, errores, ...conteos };
      const listasRiesgo = listasConRiesgo(ctx, riesgo.registro), cal = { ...estado.calificacion, riesgo: riesgo.registro.id };
      const calificacion = agregar('riesgos-calificacion', cal, estado.originales.calificacion, 1, 'calificacion', listasRiesgo);
      if (!calificacion.ok) return { salida, errores, ...conteos };
      const tieneValidacion = estado.validacion?.grupoSeleccion || estado.validacion?.grupo;
      let grupo;
      if (tieneValidacion) {
        if (estado.validacion.grupoSeleccion === '__nuevo__') grupo = agregar('riesgos-grupos', estado.grupoNuevo, undefined, 2, 'grupoNuevo', listasRiesgo);
        const grupoId = grupo?.registro.id || estado.validacion.grupoSeleccion || estado.validacion.grupo;
        const { grupoSeleccion, ...validacion } = estado.validacion;
        if (!grupo || grupo.ok) agregar('riesgos-validaciones', { ...validacion, riesgo: riesgo.registro.id, grupo: grupoId }, estado.originales.validacion, 2, 'validacion', listasConRiesgo(ctx, riesgo.registro, grupo?.registro));
      }
      (estado.medidas || []).forEach((m, i) => { const { __original, ...medida } = m; agregar('riesgos-medidas', { ...medida, riesgos: [...new Set([...(medida.riesgos || []), riesgo.registro.id])] }, estado.originales.medidas.find(x => x.id === __original), 3, 'medidas.' + i, listasRiesgo); });
      return { salida, errores, ...conteos };
    };
    const validar = paso => () => preparado().errores.filter(e => e.paso === paso);
    const regla = (coleccion, campo, extras) => textoCampo(textos, coleccion, campo, base[coleccion].campos[campo], extras);
    const pintarColeccion = (api, padre, coleccion, prefijo, campos, listas, bloqueados = {}) => campos.forEach(campo => {
      const r = { ...regla(coleccion, campo, listas?.[campo]), deshabilitado: !!bloqueados[campo] }; const clave = prefijo + '.' + campo;
      if (r.tipo === 'texto-largo') api.textoLargo(padre, clave, r);
      else if (r.tipo === 'fecha') api.fecha(padre, clave, r);
      else if (r.tipo === 'entero') api.numero(padre, clave, r);
      else if (r.tipo === 'lista') (r.multiple ? api.multiple : api.lista)(padre, clave, r);
      else if (r.tipo === 'referencia') api.referencia(padre, clave, r);
      else api.texto(padre, clave, r);
    });
    const pasos = [
      { id: 'riesgo', titulo: 'El riesgo', validar: validar(0), pintar(p, _e, api) { pintarColeccion(api, p, 'riesgos', 'riesgo', Object.keys(base.riesgos.campos), null, original ? { codigo: true } : {}); } },
      { id: 'calificacion', titulo: 'Calificación', validar: validar(1), pintar(p, _e, api) {
        ['escala', 'alcance', 'irremediabilidad'].forEach(campo => api.escala(p, 'calificacion.' + campo, regla('riesgos-calificacion', campo, { opciones: parametros[campo === 'irremediabilidad' ? 'irreparable' : campo] })));
        pintarColeccion(api, p, 'riesgos-calificacion', 'calificacion', ['probabilidad', 'tipo_impacto', 'vinculacion', 'justificacion']);
        const vivo = el('p', '', 'kq-ayuda'), actualizar = () => { vivo.textContent = calTexto({ ...estado.calificacion, escala: Number(estado.calificacion.escala), alcance: Number(estado.calificacion.alcance), irremediabilidad: Number(estado.calificacion.irremediabilidad) }, ctx.cfg); }; actualizar(); api.alCambiar((_estado, clave) => { if (clave.startsWith('calificacion.')) actualizar(); }); vivo.setAttribute('role', 'status'); p.append(vivo);
      } },
      { id: 'validacion', titulo: 'Validación', opcional: true, validar: validar(2), pintar(p, _e, api) {
        const grupos = [{ id: '', nombre: 'No agregar validación ahora' }, ...(ctx.listas['riesgos-grupos'] || []).map(g => ({ id: g.id, nombre: g.nombre })), { id: '__nuevo__', nombre: 'Crear un grupo nuevo' }];
        const selector = api.lista(p, 'validacion.grupoSeleccion', { pregunta: '¿Qué grupo revisó este riesgo?', opciones: grupos }); selector.onchange = () => { api.cambiar('validacion.grupoSeleccion', selector.value); api.repintar(); };
        if (estado.validacion.grupoSeleccion === '__nuevo__') pintarColeccion(api, p, 'riesgos-grupos', 'grupoNuevo', Object.keys(base['riesgos-grupos'].campos));
        if (estado.validacion.grupoSeleccion) {
          pintarColeccion(api, p, 'riesgos-validaciones', 'validacion', ['resultado']);
          const resultado = p.querySelector?.('[name="validacion.resultado"]');
          if (resultado) resultado.onchange = () => { api.cambiar('validacion.resultado', resultado.value); api.repintar(); };
          if (K.propuestaVisible(estado.validacion, ctx.cfg)) pintarColeccion(api, p, 'riesgos-validaciones', 'validacion', Object.keys(base['riesgos-validaciones'].campos).filter(k => k.startsWith('propuesta_') || k === 'comentario'));
          if (K.propuestaVisible(estado.validacion, ctx.cfg)) { const vivo = el('p', '', 'kq-ayuda'), actualizar = () => { const tecnicaActual = { ...estado.calificacion, escala: Number(estado.calificacion.escala), alcance: Number(estado.calificacion.alcance), irremediabilidad: Number(estado.calificacion.irremediabilidad) }; vivo.textContent = 'Con el ajuste: ' + calTexto(K.ajuste(tecnicaActual, estado.validacion, ctx.cfg).calificacion, ctx.cfg); }; actualizar(); api.alCambiar((_estado, clave) => { if (clave.startsWith('validacion.') || clave.startsWith('calificacion.')) actualizar(); }); p.append(vivo); }
        }
      } },
      { id: 'medidas', titulo: 'Medidas', opcional: true, validar: validar(3), pintar(p, _e, api) {
        (estado.medidas || []).forEach((medida, i) => { const bloque = el('section', null, 'kit-caja'); bloque.append(el('h3', `Medida ${i + 1}`)); const actual = estado.riesgo.codigo ? { id: String(estado.riesgo.codigo).toLowerCase(), codigo: estado.riesgo.codigo, nombre: estado.riesgo.nombre || '' } : null; const opcionesRiesgo = [...(ctx.listas.riesgos || []).filter(r => r.id !== actual?.id), ...(actual ? [actual] : [])].map(r => ({ id: r.id, nombre: r.codigo + ' · ' + r.nombre })); pintarColeccion(api, bloque, 'riesgos-medidas', 'medidas.' + i, Object.keys(base['riesgos-medidas'].campos), { riesgos: { opciones: opcionesRiesgo } }, medida.__original ? { codigo: true } : {}); if (medida.__original) texto(bloque, 'Esta medida ya está guardada. Para borrarla usa «Edición por tabla».'); else bloque.append(boton('Quitar medida', () => { estado.medidas.splice(i, 1); api.cambiar('medidas', estado.medidas); api.repintar(); })); p.append(bloque); });
        p.append(boton('Agregar medida', () => { estado.medidas.push({ riesgos: [] }); api.cambiar('medidas', estado.medidas); api.repintar(); }));
      } },
      { id: 'revision', titulo: 'Revisión', revision: true }
    ];
    const clave = 'kq:riesgos:' + ctx.params.empresa + ':' + (original?.id || 'nuevo');
    root.KitCuestionario.montar(zona, {
      titulo: original ? `Editar ${original.codigo}` : 'Nuevo riesgo', pasos, estado,
      persistencia: { clave, almacen: 'sesion' },
      revisar() { const r = preparado(), secciones = []; for (const c of colecciones) if (r.salida[c]?.length) secciones.push({ titulo: titulos[colecciones.indexOf(c)], filas: r.salida[c].flatMap(x => Object.entries(x).filter(([k]) => k !== 'id' && base[c].campos[k]).map(([k, v]) => [base[c].campos[k].etiqueta || k, nombreRevision(k, v, r.salida)])) }); return { secciones, nuevos: r.nuevos, actualizados: r.actualizados, errores: r.errores }; },
      async guardar() { if (!ctx.activo() || !ctx.params.puedeEditar) throw Error('Tu sesión ya no permite guardar.'); const r = preparado(); if (r.errores.length) throw Error('Corrige los campos indicados antes de guardar.'); const hechas = []; for (const c of colecciones) { const lista = r.salida[c] || []; if (!lista.length) continue; try { if (ctx.datos.guardarVarios) await ctx.datos.guardarVarios(ctx.params.empresa, c, lista); else for (const registro of lista) await ctx.datos.guardar(ctx.params.empresa, c, registro.id, registro); } catch (e) { throw Error((hechas.length ? `Se guardaron ${hechas.join(', ')}, pero falló ${c}: ` : '') + e.message + ' Puedes reintentar.'); } hechas.push(c); const ids = new Set(lista.map(x => x.id)); ctx.listas[c] = [...(ctx.listas[c] || []).filter(x => !ids.has(x.id)), ...lista]; } return r.salida; },
      alTerminar() { alVolver('Cambios guardados.'); }, alCancelar() { alVolver(''); }
    });
  }
  async function alimentacion(contenedor, datos, params) {
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); contenedor.classList.add('kr'); await ctx.cargar(colecciones); if (!ctx.activo()) return;
    const textos = await json('config/kit-cuestionario.json'); if (!ctx.activo()) return;
    const opciones = el('div', null, 'kr-acciones'), zona = el('section'), aviso = el('p'); aviso.setAttribute('role', 'status');
    const lista = () => { zona.replaceChildren(el('h2', 'Riesgos de la empresa')); const riesgos = ctx.listas.riesgos || []; if (!riesgos.length) texto(zona, 'Aún no hay riesgos registrados.'); riesgos.forEach(r => { const fila = el('div', null, 'kit-caja'); fila.append(el('p', `${r.codigo} · ${r.nombre}`), boton('Editar', () => editor(r))); zona.append(fila); }); zona.append(boton('Agregar riesgo', () => editor(null))); };
    const editor = r => { zona.replaceChildren(); cuestionarioRiesgo(ctx, zona, r, textos, mensaje => { lista(); aviso.textContent = mensaje; }); };
    const cuestionario = boton('Responder el cuestionario', lista), excel = boton('Subir plantilla de Excel', () => { zona.replaceChildren(); cargaExcel(zona, ctx, datos, params, lista); });
    opciones.append(cuestionario, excel); contenedor.append(opciones, aviso, zona); texto(zona, 'Elige cómo quieres registrar o actualizar los riesgos.');
    const detalle = el('details'); detalle.append(el('summary', 'Edición por tabla')); const tecnico = el('div'); detalle.append(tecnico); contenedor.append(detalle); await edicionTabla(tecnico, datos, params); return ctx.limpiar;
  }
  root.KitVistaRiesgos = { matriz, medidas, alimentacion, validarRegistro };
  App.registrarVista('riesgos/matriz', { render: matriz });
  App.registrarVista('riesgos/medidas', { render: medidas });
  App.registrarVista('riesgos/alimentacion', { render: alimentacion });
}(typeof globalThis !== 'undefined' ? globalThis : this));
