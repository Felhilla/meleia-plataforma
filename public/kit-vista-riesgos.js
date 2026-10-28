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
  async function matriz(contenedor, datos, params) {
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg);
    await ctx.cargar(['riesgos', 'riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas']); if (!ctx.activo()) return;
    const riesgos = ctx.listas.riesgos; contenedor.classList.add('kr');
    if (!riesgos.length) texto(contenedor, 'Esta empresa aún no tiene riesgos registrados. Registra el riesgo y su calificación técnica para ubicarlo en la matriz.');

    const marco = el('div', null, 'kr-marco'); marco.append(el('div', 'Gravedad', 'kr-eje-gravedad'));
    const mapa = el('div', null, 'kr-mapa'); mapa.setAttribute('role', 'table'); mapa.setAttribute('aria-label', 'Matriz de riesgos: gravedad en filas, probabilidad en columnas');
    const cab = el('div', null, 'kr-fila'); cab.setAttribute('role', 'row'); cab.append(el('span'));
    cfg.probabilidades.forEach((p, i) => { const h = el('strong', `${i + 1} · ${p}`); h.setAttribute('role', 'columnheader'); cab.append(h); });
    cfg.niveles.forEach(g => {
      const fila = el('div', null, 'kr-fila'); fila.setAttribute('role', 'row'); const rotulo = el('strong', `${cfg.niveles.length - cfg.niveles.indexOf(g)} · ${g}`); rotulo.setAttribute('role', 'rowheader'); fila.append(rotulo);
      cfg.probabilidades.forEach(p => {
        const prio = cfg.prioridad[g][p], celda = el('div', null, 'kr-celda kr-' + prio.toLowerCase()); celda.dataset.celda = g + '|' + p; celda.setAttribute('role', 'cell'); celda.setAttribute('aria-label', `Gravedad ${g}, probabilidad ${p}, prioridad ${prio}`);
        celda.append(el('small', 'Prioridad ' + prio));
        riesgos.filter(r => K.gravedad(tecnica(ctx, r.id), cfg)?.nivel === g && tecnica(ctx, r.id)?.probabilidad === p).forEach(r => { const b = boton(r.codigo, () => fichaRiesgo(ctx, r)); b.title = r.nombre; celda.append(b); }); fila.append(celda);
      }); mapa.append(fila);
    }); mapa.append(cab); marco.append(mapa, el('div', 'Probabilidad', 'kr-eje-probabilidad')); contenedor.append(marco);
    const pendientes = riesgos.filter(r => !K.prioridad(tecnica(ctx, r.id), cfg));
    if (pendientes.length) { const s = bloque(contenedor, 'Sin calificación técnica'); pendientes.forEach(r => s.append(boton(`${r.codigo} · ${r.nombre}`, () => fichaRiesgo(ctx, r)))); }
    const filtros = el('div', null, 'kr-filtros'), lista = el('div');
    const opciones = valores => [{ id: '', nombre: 'Todos' }, ...valores];
    const derecho = seleccionar(filtros, 'Derecho', opciones([...new Set(riesgos.map(r => r.derecho_humano))]));
    const ambito = seleccionar(filtros, 'Ámbito', opciones([...new Set(riesgos.flatMap(r => r.ambitos || []))]));
    const prio = seleccionar(filtros, 'Prioridad', opciones([...cfg.niveles, 'Sin calificación']));
    const validado = seleccionar(filtros, 'Estado de validación', opciones(['Pendiente', 'Revisado', 'Con ajustes', 'Todos confirman']));
    const pintar = () => {
      lista.replaceChildren();
      const filtrados = riesgos.filter(r => {
        const v = K.validacion(r.id, ctx.listas['riesgos-validaciones'], cfg), estado = validado.value;
        return (!derecho.value || derecho.value === r.derecho_humano) && (!ambito.value || r.ambitos?.includes(ambito.value)) && (!prio.value || prioridad(ctx, r.id) === prio.value) && (!estado || (estado === 'Pendiente' && !v.revisados) || (estado === 'Revisado' && v.revisados) || (estado === 'Con ajustes' && v.revisados > v.confirman) || (estado === 'Todos confirman' && v.revisados > 0 && v.confirman === v.revisados));
      });
      // El orden explícito deja los pendientes al final.
      filtrados.sort((a, b) => (cfg.niveles.indexOf(prioridad(ctx, a.id)) < 0 ? cfg.niveles.length : cfg.niveles.indexOf(prioridad(ctx, a.id))) - (cfg.niveles.indexOf(prioridad(ctx, b.id)) < 0 ? cfg.niveles.length : cfg.niveles.indexOf(prioridad(ctx, b.id))) || a.id.localeCompare(b.id));
      tabla(lista, ['Riesgo', 'Prioridad', 'Validación'], filtrados.map(r => [boton(`${r.codigo} · ${r.nombre}`, () => fichaRiesgo(ctx, r)), prioridad(ctx, r.id), K.validacion(r.id, ctx.listas['riesgos-validaciones'], cfg).texto]));
      if (!filtrados.length) texto(lista, 'No hay riesgos con estos filtros.');
    };
    [derecho, ambito, prio, validado].forEach(s => { s.onchange = pintar; }); const desplegable = el('details', null, 'kr-lista'); desplegable.append(el('summary', 'Ver lista de riesgos'), filtros, lista); contenedor.append(desplegable); accesos(contenedor, params); pintar(); return ctx.limpiar;
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
  async function alimentacion(contenedor, datos, params) {
    volver(contenedor, params.empresa);
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const cfg = await json('config/kit-riesgos-config.json'); if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); contenedor.classList.add('kr');
    const nav = el('nav', null, 'kr-subtabs'), zona = el('section'); nav.setAttribute('aria-label', 'Tipos de registro'); let revision = 0;
    const dependencias = { riesgos: [], 'riesgos-calificacion': ['riesgos'], 'riesgos-grupos': [], 'riesgos-validaciones': ['riesgos', 'riesgos-grupos', 'riesgos-calificacion'], 'riesgos-medidas': ['riesgos'] };
    async function abrir(coleccion) {
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
    const excel = bloque(contenedor, 'Carga por Excel'); texto(excel, 'Aquí podrás cargar y revisar las cinco hojas de la plantilla. Esta opción estará disponible pronto. Por ahora, usa las fichas manuales.');
    await abrir('riesgos'); return ctx.limpiar;
  }
  root.KitVistaRiesgos = { matriz, medidas, alimentacion, validarRegistro };
  App.registrarVista('riesgos/matriz', { render: matriz });
  App.registrarVista('riesgos/medidas', { render: medidas });
  App.registrarVista('riesgos/alimentacion', { render: alimentacion });
}(typeof globalThis !== 'undefined' ? globalThis : this));
