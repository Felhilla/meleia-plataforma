/* Motor de cuestionarios por pasos. API: montar(contenedor, opciones) -> { destruir() }.
 * opciones: { titulo, pasos, estado, revisar, guardar, persistencia, alTerminar, alCancelar }.
 * Cada paso recibe pintar(zona, estado, api) y validar(estado), que devuelve errores {campo,mensaje}.
 */
(function (root, factory) {
  const api = factory(root, root.document);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KitCuestionario = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root, documento) {
  'use strict';
  const vacio = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  function nodo(tag, texto, clase) { const n = documento.createElement(tag); if (texto != null) n.textContent = texto; if (clase) n.className = clase; return n; }
  function ruta(objeto, clave, valor) { const partes = clave.split('.'); let destino = objeto; partes.slice(0, -1).forEach(k => { destino[k] ||= {}; destino = destino[k]; }); if (arguments.length === 3) destino[partes.at(-1)] = valor; return partes.reduce((a, k) => a?.[k], objeto); }
  function montar(contenedor, opciones) {
    const pasos = opciones.pasos || [], persistencia = opciones.persistencia;
    let estado = opciones.estado || {}, actual = 0, destruido = false, guardando = false, errores = [], confirmarCancelacion = false, sucio = false, alCambiarPaso = () => {};
    const leerBorrador = () => { try { const v = root[persistencia.almacen === 'local' ? 'localStorage' : 'sessionStorage']?.getItem(persistencia.clave); if (v) { Object.assign(estado, JSON.parse(v)); sucio = true; } } catch (_) {} };
    const persistir = () => { try { root[persistencia.almacen === 'local' ? 'localStorage' : 'sessionStorage']?.setItem(persistencia.clave, JSON.stringify(estado)); } catch (_) {} };
    const borrar = () => { try { root[persistencia.almacen === 'local' ? 'localStorage' : 'sessionStorage']?.removeItem(persistencia.clave); } catch (_) {} };
    if (persistencia) leerBorrador();
    const raiz = nodo('section', null, 'kq'), cabecera = nodo('header', null, 'kq-cabecera'), indicador = nodo('nav', null, 'kq-pasos'), zona = nodo('section', null, 'kq-zona'), pie = nodo('footer', null, 'kq-pie'), aviso = nodo('p', '', 'kq-aviso');
    indicador.setAttribute('aria-label', 'Pasos del cuestionario'); raiz.append(cabecera, indicador, zona, aviso, pie); contenedor.append(raiz);
    const api = {
      cambiar(clave, valor) { ruta(estado, clave, valor); sucio = true; persistir(); alCambiarPaso(estado, clave, valor); }, valor(clave, alterno = '') { const v = ruta(estado, clave); return v === undefined ? alterno : v; },
      texto: (padre, clave, regla = {}) => campo(padre, clave, regla, 'texto'), textoLargo: (padre, clave, regla = {}) => campo(padre, clave, regla, 'texto-largo'),
      fecha: (padre, clave, regla = {}) => campo(padre, clave, regla, 'fecha'), numero: (padre, clave, regla = {}) => campo(padre, clave, regla, 'entero'),
      lista: (padre, clave, regla = {}) => campo(padre, clave, regla, 'lista'), multiple: (padre, clave, regla = {}) => campo(padre, clave, { ...regla, multiple: true }, 'lista'),
      referencia: (padre, clave, regla = {}) => campo(padre, clave, regla, 'referencia'),
      escala(padre, clave, regla = {}) { return escala(padre, clave, regla, api); }, estado: () => estado, repintar: pintar,
      alCambiar(fn) { alCambiarPaso = typeof fn === 'function' ? fn : () => {}; }
    };
    function etiqueta(regla, clave) { return regla.pregunta || regla.etiqueta || clave; }
    function campo(padre, clave, regla, tipo) {
      const fila = nodo('div', null, 'kq-campo'), id = 'kq-' + clave.replaceAll('.', '-'), label = nodo('label', etiqueta(regla, clave)); label.htmlFor = id;
      let control;
      if (tipo === 'lista' || tipo === 'referencia') {
        control = nodo('select'); control.multiple = !!regla.multiple;
        if (!regla.multiple) { const inicial = nodo('option', 'Selecciona…'); inicial.value = ''; control.append(inicial); }
        (regla.opciones || regla.valores || []).forEach(opcion => { const dato = typeof opcion === 'object' ? opcion : { id: opcion, nombre: opcion }; const op = nodo('option', dato.nombre ?? dato.id); op.value = dato.id; op.selected = regla.multiple ? (api.valor(clave, []) || []).includes(dato.id) : api.valor(clave) === dato.id; control.append(op); });
      } else { control = nodo(tipo === 'texto-largo' ? 'textarea' : 'input'); if (control.tagName !== 'TEXTAREA') control.type = tipo === 'fecha' ? 'date' : tipo === 'entero' ? 'number' : 'text'; if (regla.min != null) control.min = regla.min; if (regla.max != null) control.max = regla.max; if (tipo === 'entero') control.step = '1'; control.value = api.valor(clave, ''); }
      control.id = id; control.name = clave; control.disabled = !!regla.deshabilitado; const error = nodo('p', '', 'kq-error'); error.id = id + '-error'; error.setAttribute('aria-live', 'polite'); control.setAttribute('aria-describedby', error.id);
      const actualizar = () => { api.cambiar(clave, control.multiple ? [...control.options].filter(o => o.selected).map(o => o.value) : control.value); };
      control.oninput = actualizar; control.onchange = actualizar; fila.append(label, control); if (regla.ayuda) fila.append(nodo('p', regla.ayuda, 'kq-ayuda')); fila.append(error); padre.append(fila); return control;
    }
    function escala(padre, clave, regla, apiLocal) {
      const fieldset = nodo('fieldset', null, 'kq-campo kq-escala'), legend = nodo('legend', etiqueta(regla, clave)); fieldset.append(legend); const error = nodo('p', '', 'kq-error'); error.id = 'kq-' + clave.replaceAll('.', '-') + '-error'; error.setAttribute('aria-live', 'polite');
      (regla.opciones || []).forEach(o => { const label = nodo('label'), input = nodo('input'); input.type = 'radio'; input.name = clave; input.value = String(o.valor); input.checked = String(apiLocal.valor(clave, '')) === String(o.valor); input.onchange = () => apiLocal.cambiar(clave, input.value); label.append(input, nodo('span', `${o.valor} · ${o.descripcion}`)); fieldset.append(label); }); fieldset.append(error); padre.append(fieldset); return fieldset;
    }
    function pintarErrores() {
      let primero, sueltos = [];
      errores.forEach(e => {
        const control = zona.querySelector?.(`[name="${e.campo}"]`) || zona.querySelector?.('#kq-' + String(e.campo).replaceAll('.', '-'));
        const mensaje = zona.querySelector?.('#kq-' + String(e.campo).replaceAll('.', '-') + '-error');
        if (control && mensaje) { control.setAttribute('aria-invalid', 'true'); mensaje.textContent = e.mensaje; primero ||= control; } else sueltos.push(e.mensaje);
      });
      aviso.textContent = sueltos.join(' '); primero?.focus();
    }
    function revisar() {
      const r = opciones.revisar?.(estado) || { secciones: [], nuevos: 0, actualizados: 0, errores: [] }; const resumen = nodo('div', null, 'kq-revision');
      r.secciones?.forEach(s => { const bloque = nodo('section'); bloque.append(nodo('h3', s.titulo)); const lista = nodo('dl'); s.filas.forEach(([rotulo, valor]) => { lista.append(nodo('dt', rotulo), nodo('dd', Array.isArray(valor) ? valor.join(', ') : String(valor ?? '—'))); }); bloque.append(lista); resumen.append(bloque); }); resumen.append(nodo('p', `${r.nuevos || 0} nuevos, ${r.actualizados || 0} actualizados.`));
      if (r.errores?.length) { const l = nodo('ul', null, 'kq-errores-revision'); r.errores.forEach(e => { const item = nodo('li', `${e.mensaje} `); const b = nodo('button', 'Ir al paso', 'boton secundario'); b.type = 'button'; b.onclick = () => { actual = e.paso ?? 0; pintar(); }; item.append(b); l.append(item); }); resumen.append(l); } zona.append(resumen); return r;
    }
    function pintar() {
      if (destruido) return; const paso = pasos[actual]; cabecera.replaceChildren(); const titulo = nodo('h2', `Paso ${actual + 1} de ${pasos.length} · ${paso.titulo}`); titulo.tabIndex = -1; const progreso = nodo('div', null, 'kq-progreso'); progreso.setAttribute('role', 'progressbar'); progreso.setAttribute('aria-valuemin', '1'); progreso.setAttribute('aria-valuemax', String(pasos.length)); progreso.setAttribute('aria-valuenow', String(actual + 1)); progreso.setAttribute('aria-label', `Paso ${actual + 1} de ${pasos.length}`); const barra = nodo('i'); barra.style.transform = `scaleX(${(actual + 1) / pasos.length})`; progreso.append(barra); cabecera.append(titulo, progreso);
      indicador.replaceChildren(); pasos.forEach((p, i) => { const b = nodo('button', `${i + 1}. ${p.titulo}`, 'kq-paso'); b.type = 'button'; b.disabled = i > actual && !p.visitado; b.setAttribute('aria-current', i === actual ? 'step' : 'false'); b.onclick = () => { actual = i; pintar(); }; indicador.append(b); });
      zona.replaceChildren(); errores = []; let resultadoRevision;
      if (paso.revision) resultadoRevision = revisar(); else paso.pintar?.(zona, estado, api);
      pie.replaceChildren(); const cancelar = nodo('button', 'Cancelar', 'boton secundario'); cancelar.type = 'button'; cancelar.onclick = () => { if (!confirmarCancelacion && sucio) { confirmarCancelacion = true; pintar(); return; } borrar(); opciones.alCancelar?.(); };
      if (confirmarCancelacion) { aviso.textContent = '¿Cancelar y borrar lo escrito?'; const confirmar = nodo('button', 'Sí, cancelar', 'boton secundario'); confirmar.type = 'button'; confirmar.onclick = () => { borrar(); opciones.alCancelar?.(); }; const seguir = nodo('button', 'Seguir respondiendo', 'boton secundario'); seguir.type = 'button'; seguir.onclick = () => { confirmarCancelacion = false; aviso.textContent = ''; pintar(); }; pie.append(confirmar, seguir); }
      const anterior = nodo('button', 'Anterior', 'boton secundario'); anterior.type = 'button'; anterior.disabled = actual === 0; anterior.onclick = () => { actual--; pintar(); };
      const siguiente = nodo('button', paso.revision ? 'Guardar' : 'Siguiente', 'boton'); siguiente.type = 'button'; siguiente.disabled = guardando || (!!paso.revision && !!resultadoRevision?.errores?.length);
      siguiente.onclick = async () => { if (paso.revision) { guardando = true; siguiente.disabled = true; aviso.textContent = 'Guardando…'; try { const resultado = await opciones.guardar(estado); borrar(); aviso.textContent = 'Cambios guardados.'; opciones.alTerminar?.(resultado); } catch (e) { aviso.textContent = `No se pudieron guardar los cambios: ${e.message || 'error desconocido'}. Puedes reintentar.`; guardando = false; siguiente.disabled = false; } return; } errores = paso.validar?.(estado) || []; if (errores.length) { pintarErrores(); return; } paso.visitado = true; actual++; pintar(); };
      pie.append(cancelar, anterior, siguiente); if (!paso.revision) { if (typeof root.setTimeout === 'function') root.setTimeout(() => titulo.focus(), 0); else titulo.focus(); } if (errores.length) pintarErrores();
    }
    pintar(); return { destruir() { destruido = true; raiz.remove(); }, get estado() { return estado; } };
  }
  return { montar };
}));
