(function (root) {
  'use strict';
  const App = root.App, K = root.KitActores, el = App.el;
  const numero = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
  const recursos = new Map();
  function json(ruta) {
    if (!recursos.has(ruta)) recursos.set(ruta, root.fetch(ruta).then(r => { if (!r.ok) throw Error('No se pudo cargar la configuración.'); return r.json(); }).catch(e => { recursos.delete(ruta); throw e; }));
    return recursos.get(ruta).then(x => JSON.parse(JSON.stringify(x)));
  }
  const boton = (texto, fn) => { const b = el('button', texto, 'boton secundario'); b.type = 'button'; b.onclick = fn; return b; };
  const texto = (n, valor) => n.append(el('p', valor));
  function mensaje(n, valor) { const p = el('p', valor, 'ka-mensaje'); p.setAttribute('role', 'status'); n.append(p); return p; }
  function bloque(n, titulo) { const s = el('section', null, 'ka-bloque'); s.append(el('h3', titulo)); n.append(s); return s; }
  function ruta(empresa, vista) { return '#/actores/' + encodeURIComponent(empresa) + '/' + vista; }
  function enlace(n, empresa) { const a = el('a', 'Ir a Alimentación'); a.href = ruta(empresa, 'alimentacion'); n.append(a); }
  function tabla(n, cabeceras, filas) {
    const marco = el('div', null, 'ka-tabla'), t = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
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
      const anterior = origen, fondo = el('div', null, 'ka-fondo'), panel = el('section', null, 'ka-dialogo');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'ka-dialogo-titulo'); panel.tabIndex = -1;
      const h = el('h2', titulo); h.id = 'ka-dialogo-titulo';
      const regiones = [...root.document.body.children].map(n => [n, n.inert]); regiones.forEach(([n]) => { n.inert = true; });
      const cerrar = () => { root.document.removeEventListener('keydown', teclado); fondo.remove(); regiones.forEach(([n, previo]) => { n.inert = previo; }); if (activo()) { if (anterior?.isConnected) anterior.focus(); else contenedor.focus(); } cerrarDialogo = () => {}; focoOrigen = null; };
      const teclado = e => {
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        if (e.key === 'Tab') {
          const focos = [...panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(n => !n.disabled && !n.hidden && !n.closest('[hidden]'));
          const primero = focos[0], ultimo = focos.at(-1);
          if (e.shiftKey && (root.document.activeElement === primero || root.document.activeElement === panel)) { e.preventDefault(); ultimo?.focus(); }
          else if (!e.shiftKey && root.document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
        }
      };
      const b = boton('Cerrar', cerrar); panel.append(b, h); fondo.append(panel); root.document.body.append(fondo);
      root.document.addEventListener('keydown', teclado); b.focus(); cerrarDialogo = cerrar;
      ctx.panelActual = panel;
      return panel;
    };
    ctx.limpiar = () => { cerrado = true; cerrarDialogo(); };
    return ctx;
  }
  function ficha(ctx, a) {
    const p = ctx.dialogo(a.institucion);
    if (a.nombre_servidor && ctx.cfg.nombreServidor?.categorias.includes(a.categoria)) texto(p, `${ctx.esquema.campos.nombre_servidor.etiqueta}: ${a.nombre_servidor}${a.fecha_verificacion ? ` (verificado el ${a.fecha_verificacion})` : ''}`);
    ['dependencia_area', 'cargo', 'categoria', 'subgrupo', 'orden', 'posicion', 'caracterizacion'].forEach(k => texto(p, `${ctx.esquema.campos[k].etiqueta}: ${a[k] || 'Sin información'}`));
    Object.entries(ctx.cfg.escalas).forEach(([k, definiciones]) => texto(p, `${ctx.esquema.campos[k].etiqueta}: ${K.nivel(a[k]) ?? 'Sin calificar'} · ${definiciones[K.nivel(a[k]) - 1] || ''}`));
    texto(p, 'Nivel calculado: ' + (K.nivelCalculado(a, ctx.cfg) || 'Sin calificar'));
    if (a.nivel_ajustado) texto(p, `Ajustado a ${a.nivel_ajustado} · Motivo: ${a.motivo_ajuste} · Explicación: ${a.explicacion_ajuste}`);
    texto(p, ctx.cfg.niveles.find(n => n.nombre === K.nivelFinal(a, ctx.cfg))?.descripcion || '');
  }
  async function preparar(contenedor, datos, params) {
    const [cfg, esquema] = await Promise.all([json('config/kit-actores-config.json'), json('config/esquemas/actores.json')]);
    if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); ctx.esquema = esquema;
    if (cfg.categoriasPorEmpresa?.[params.empresa]) ctx.esquema.campos.categoria.valores = [...cfg.categoriasPorEmpresa[params.empresa]];
    await ctx.cargar(['actores']); if (!ctx.activo()) return;
    contenedor.classList.add('ka'); return ctx;
  }
  async function mapa(contenedor, datos, params) {
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    const actores = ctx.listas.actores;
    if (!actores.length) { texto(contenedor, 'Esta empresa aún no tiene actores registrados. Agrega su institución, cargo y calificaciones para construir el mapa.'); if (params.puedeEditar) enlace(contenedor, params.empresa); return ctx.limpiar; }
    const filtros = el('div', null, 'ka-filtros'), controlesLista = el('div', null, 'ka-controles-lista'), selects = {};
    ['categoria', 'orden', 'posicion', 'subgrupo'].forEach(k => { selects[k] = seleccionar(k === 'subgrupo' ? controlesLista : filtros, ctx.esquema.campos[k].etiqueta, [{ id: '', nombre: 'Todos' }, ...[...new Set(actores.map(a => a[k]).filter(Boolean))].sort()]); });
    const soloLabel = el('label', null, 'ka-solo-alertas'), solo = el('input'); solo.type = 'checkbox'; soloLabel.append(solo, el('span', 'Solo alertas')); filtros.append(soloLabel);
    const resumen = el('div', null, 'ka-resumen'), mapa = el('div', null, 'ka-mapa'), lista = el('div'), distribucion = el('div', null, 'ka-distribucion');
    resumen.setAttribute('aria-live', 'polite');
    mapa.setAttribute('aria-label', 'Mapa 360°: influencia alta arriba, impacto alto a la derecha');
    const orden = seleccionar(controlesLista, 'Ordenar lista por', ['institucion', 'cargo', 'categoria', 'nivel', 'posicion'].map((id, i) => ({ id, nombre: ['Institución', 'Cargo', 'Categoría', 'Nivel final', 'Posición'][i] })), 'institucion');
    const sentido = seleccionar(controlesLista, 'Sentido', ['Ascendente', 'Descendente'], 'Ascendente');
    function pintar() {
      const visibles = actores.filter(a => Object.entries(selects).every(([k,s]) => !s.value || a[k] === s.value) && (!solo.checked || K.alerta(a, ctx.cfg)));
      resumen.replaceChildren(); mapa.replaceChildren(); lista.replaceChildren();
      const ind = K.indicadores(visibles, ctx.cfg);
      const estrategicos = ind.cuadrantes.find(v => v.nombre === 'Involucramiento estratégico')?.cantidad || 0;
      const desfavorables = ind.posiciones.find(v => v.nombre === 'Desfavorable')?.cantidad || 0;
      [[ind.total, 'Actores visibles'], [estrategicos, 'Involucramiento estratégico'], [desfavorables, 'Desfavorables'], [ind.alertas, 'Alertas']].forEach(([valor, etiqueta]) => {
        const dato = el('div', null, 'ka-dato'); dato.append(el('strong', numero(valor)), el('span', etiqueta)); resumen.append(dato);
      });
      distribucion.replaceChildren();
      for (const [titulo, valores] of [['Por categoría', ind.categorias], ['Por posición', ind.posiciones]]) {
        const s = bloque(distribucion, titulo); valores.forEach(v => {
          const fila = el('div', null, 'ka-distribucion-fila'), pista = el('div', null, 'ka-barra'), relleno = el('span');
          relleno.style.width = v.porcentaje + '%'; pista.setAttribute('aria-hidden', 'true'); pista.append(relleno);
          fila.append(el('span', v.nombre), el('span', `${v.cantidad} · ${numero(v.porcentaje)} %`), pista); s.append(fila);
        });
      }
      ctx.cfg.niveles.forEach(n => {
        const q = el('section', null, 'ka-cuadrante'); q.dataset.cuadrante = n.nombre; q.style.gridRow = n.fila; q.style.gridColumn = n.columna;
        q.dataset.intensidad = n.fila === 1 && n.columna === 2 ? 'estrategico' : n.fila === 2 && n.columna === 1 ? 'periferico' : 'intermedio';
        q.append(el('h3', n.nombre), el('p', n.descripcion, 'ka-relacionamiento'));
        const fichas = el('div', null, 'ka-fichas'); fichas.tabIndex = 0; fichas.setAttribute('role', 'region'); fichas.setAttribute('aria-label', 'Actores de ' + n.nombre);
        const miembros = visibles.filter(a => K.nivelFinal(a, ctx.cfg) === n.nombre);
        const cantidad = el('p', null, 'ka-cantidad'); cantidad.append(el('strong', numero(miembros.length)), el('span', ` ${miembros.length === 1 ? 'actor' : 'actores'} · ${numero(ind.total ? miembros.length / ind.total * 100 : 0)} %`)); q.append(cantidad);
        miembros.forEach(a => {
          const alerta = K.alerta(a, ctx.cfg), b = boton(null, () => ficha(ctx, a));
          b.className = 'ka-actor'; b.title = `${a.institucion} · ${a.cargo} · ${a.posicion}${alerta ? ' · Alerta' : ''}`; b.setAttribute('aria-label', b.title);
          const punto = el('span', null, 'ka-punto ka-' + a.posicion.toLowerCase()); punto.setAttribute('aria-hidden', 'true');
          b.append(punto, el('span', a.institucion, 'ka-institucion'));
          if (alerta) { const icono = el('span', '⚠', 'ka-alerta'); icono.setAttribute('aria-hidden', 'true'); b.append(icono); } fichas.append(b);
        });
        if (!miembros.length) texto(fichas, 'Sin actores en este cuadrante.'); q.append(fichas); mapa.append(q);
      });
      const valor = a => orden.value === 'nivel' ? K.nivelFinal(a, ctx.cfg) : a[orden.value];
      visibles.sort((a,b) => String(valor(a) || '').localeCompare(String(valor(b) || ''), 'es') * (sentido.value === 'Descendente' ? -1 : 1));
      tabla(lista, ['Institución', 'Cargo', 'Categoría', 'Nivel final', 'Posición'], visibles.map(a => [boton(a.institucion, () => ficha(ctx,a)), a.cargo, a.categoria, K.nivelFinal(a, ctx.cfg) || 'Sin calificar', a.posicion]));
      if (!visibles.length) texto(lista, 'No hay actores con estos filtros.');
    }
    [...Object.values(selects), solo, orden, sentido].forEach(s => { s.onchange = pintar; });
    const marco = el('div', null, 'ka-marco-mapa');
    marco.append(el('span', 'Influencia ↑', 'ka-eje-influencia'), mapa, el('span', 'Impacto →', 'ka-eje-impacto'));
    const leyenda = el('div', null, 'ka-leyenda'); leyenda.setAttribute('aria-label', 'Leyenda del mapa');
    ['Favorable', 'Neutral', 'Desfavorable'].forEach(p => { const item = el('span'); item.append(el('span', null, 'ka-punto ka-' + p.toLowerCase()), el('span', p)); leyenda.append(item); }); leyenda.append(el('span', '⚠ Alerta de atención'));
    const detalle = el('details', null, 'ka-distribucion-detalle'); detalle.append(el('summary', 'Ver distribución'), distribucion);
    contenedor.append(resumen, el('h2', 'Mapa 360°'), marco, leyenda, detalle, el('h2', 'Lista de actores'), filtros, controlesLista, lista); pintar(); return ctx.limpiar;
  }
  function formulario(ctx, n, original, alGuardar) {
    const form = el('form', null, 'ka-form'), controles = {}, errores = {}; form.noValidate = true;
    Object.entries(ctx.esquema.campos).forEach(([k,r]) => {
      const row = el('div', null, 'ka-campo'), label = el('label', r.etiqueta + (r.obligatorio ? ' *' : ''));
      const input = el(r.tipo === 'lista' ? 'select' : r.tipo === 'texto-largo' ? 'textarea' : 'input');
      if (r.tipo === 'lista') [{ id:'', nombre:'Sin seleccionar' }, ...(r.valoresManual || r.valores).map(id => ({ id, nombre:id }))].forEach(o => { const op = el('option', o.nombre); op.value = o.id; input.append(op); });
      input.name = k; input.id = 'ka-' + k; input.value = original?.[k] ?? ''; label.htmlFor = input.id;
      const error = el('p', '', 'ka-error'); error.id = 'ka-error-' + k; error.setAttribute('aria-live', 'polite'); input.setAttribute('aria-describedby', error.id);
      row.append(label, input, error);
      if (ctx.cfg.escalas[k]) { const ul = el('ul', null, 'ka-ayuda'); ul.id = 'ka-ayuda-' + k; ctx.cfg.escalas[k].forEach((d,i) => ul.append(el('li', `${i+1}: ${d}`))); row.append(ul); input.setAttribute('aria-describedby', error.id + ' ' + ul.id); }
      controles[k] = input; errores[k] = error; form.append(row);
    });
    if (original?.motivo_ajuste === ctx.esquema.campos.motivo_ajuste.valores[4]) {
      controles.motivo_ajuste.value = ''; texto(form, 'Este actor proviene de un mapeo original. Para guardar una edición, selecciona un motivo manual o retira el ajuste.');
    }
    const vivo = el('p'), previa = el('div'), aviso = el('p'); vivo.setAttribute('role','status'); aviso.setAttribute('role','status');
    const leer = () => Object.fromEntries(Object.entries(controles).map(([k,c]) => [k,c.value]));
    const actualizar = () => {
      previa.replaceChildren(); const a = leer(); vivo.textContent = 'Nivel calculado: ' + (K.nivelCalculado(a, ctx.cfg) || 'Completa influencia e impacto con valores de 1 a 5.');
      const ajuste = controles.nivel_ajustado, previo = ajuste.value, permitidos = K.permitidos(a,ctx.cfg);
      ajuste.replaceChildren(); ['', ...permitidos].forEach(v => { const op = el('option', v || 'Sin ajuste'); op.value = v; ajuste.append(op); }); ajuste.value = permitidos.includes(previo) ? previo : '';
      if (!ajuste.value) { controles.motivo_ajuste.value = ''; controles.explicacion_ajuste.value = ''; }
      controles.motivo_ajuste.disabled = controles.explicacion_ajuste.disabled = !ajuste.value;
    };
    Object.values(controles).forEach(c => { c.oninput = actualizar; c.onchange = actualizar; });
    const guardar = boton('Revisar y guardar'); guardar.type = 'submit'; form.append(vivo, aviso, guardar, previa); n.append(form); actualizar();
    form.onsubmit = e => {
      e.preventDefault(); if (!ctx.activo() || !ctx.params.puedeEditar) return;
      previa.replaceChildren(); Object.keys(errores).forEach(k => { errores[k].textContent = ''; controles[k].setAttribute('aria-invalid','false'); });
      const r = K.validar({ ...leer(), id: original?.id || 'act-' + root.crypto.randomUUID() }, ctx.cfg, ctx.esquema);
      if (!r.ok) { r.errores.forEach(e => { errores[e.campo].textContent = 'Actores, fila 1: ' + e.mensaje; controles[e.campo].setAttribute('aria-invalid','true'); }); controles[r.errores[0].campo].focus(); return; }
      Object.entries(ctx.esquema.campos).forEach(([k,regla]) => { if (r.registro[k]) texto(previa, `${regla.etiqueta}: ${r.registro[k]}`); });
      texto(previa, 'Nivel final: ' + K.nivelFinal(r.registro, ctx.cfg));
      const confirmar = boton('Confirmar guardado', async () => {
        if (!ctx.activo() || !ctx.params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
        try { await ctx.datos.guardar(ctx.params.empresa, 'actores', r.registro.id, r.registro); if (!ctx.activo()) return; ctx.listas.actores = [...ctx.listas.actores.filter(a => a.id !== r.registro.id), r.registro]; alGuardar(); }
        catch(e) { ctx.error(aviso,e); confirmar.disabled = false; }
      }); previa.append(confirmar); confirmar.focus();
    };
  }
  async function alimentacion(contenedor, datos, params) {
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    const zona = el('section'), historial = el('section');
    function pintar() {
      zona.replaceChildren(); const editor = el('section'), aviso = el('div');
      const editar = a => { editor.replaceChildren(el('h3', a ? 'Editar actor' : 'Agregar actor')); formulario(ctx, editor, a, pintar); editor.querySelectorAll('select')[0]?.focus(); };
      zona.append(boton('Agregar', () => editar(null)), aviso);
      if (!ctx.listas.actores.length) texto(zona, 'Aún no hay actores. Usa Agregar para registrar el primero.');
      tabla(zona, ['Institución', 'Cargo', 'Nivel final', 'Acciones'], ctx.listas.actores.map(a => {
        const acciones = el('div', null, 'ka-acciones'); acciones.append(boton('Editar', () => editar(a)), boton('Borrar', () => {
          aviso.replaceChildren(); texto(aviso, `¿Borrar ${a.institucion}? Esta acción quedará en el historial.`);
          const confirmar = boton('Confirmar borrado', async () => {
            if (!ctx.activo() || !params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
            try { await datos.borrar(params.empresa, 'actores', a.id); if (!ctx.activo()) return; ctx.listas.actores = ctx.listas.actores.filter(x => x.id !== a.id); pintar(); }
            catch(e) { ctx.error(aviso,e); confirmar.disabled = false; }
          }); aviso.append(confirmar, boton('Cancelar', () => aviso.replaceChildren())); confirmar.focus();
        })); return [a.institucion, a.cargo, K.nivelFinal(a,ctx.cfg), acciones];
      })); zona.append(editor);
    }
    const verHistorial = boton('Historial de cambios', async () => {
      historial.replaceChildren(el('p','Cargando historial…'));
      try {
        const cambios = await datos.historial(params.empresa, { coleccion:'actores', limite:50 }); if (!ctx.activo()) return;
        historial.replaceChildren(el('h3','Últimos cambios del módulo'));
        if (!cambios.length) texto(historial,'Todavía no hay cambios registrados.');
        tabla(historial, ['Fecha','Acción','Actor'], cambios.map(c => [new Intl.DateTimeFormat('es-CO', {dateStyle:'short',timeStyle:'short'}).format(new Date(c.fecha)), ({INSERT:'Creación',UPDATE:'Edición',DELETE:'Borrado'})[c.accion] || 'Cambio', ctx.listas.actores.find(a => a.id === c.registro_id)?.institucion || 'Actor retirado']));
      } catch(e) { historial.replaceChildren(); ctx.error(historial,e); }
    });
    contenedor.append(zona, verHistorial, historial); const excel = bloque(contenedor,'Carga por Excel'); texto(excel,'La carga por Excel estará disponible pronto. Por ahora, usa las fichas manuales.'); pintar(); return ctx.limpiar;
  }
  App.registrarVista('actores/mapa', {render:mapa});
  App.registrarVista('actores/alimentacion', {render:alimentacion});
}(typeof globalThis !== 'undefined' ? globalThis : this));
