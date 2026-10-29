(function (root) {
  'use strict';
  const App = root.App, el = App.el, Carga = root.KitCargaExcel;
  const boton = texto => { const b = el('button', texto, 'boton secundario'); b.type = 'button'; return b; };

  function tablaErrores(contenedor, errores) {
    const marco = el('div', null, 'kce-tabla'), tabla = el('table'), cabeza = el('thead'), filaCabeza = el('tr'), cuerpo = el('tbody');
    ['Hoja', 'Fila', 'Campo', 'Mensaje'].forEach(c => { const th = el('th', c); th.scope = 'col'; filaCabeza.append(th); });
    errores.forEach(({ hoja, fila, campo, mensaje }) => {
      const filaTabla = el('tr');
      [hoja, fila, campo || '—', mensaje].forEach(valor => { const td = el('td'); td.append(el('span', String(valor ?? '—'))); filaTabla.append(td); });
      cuerpo.append(filaTabla);
    });
    cabeza.append(filaCabeza); tabla.append(cabeza, cuerpo); marco.append(tabla); contenedor.append(marco);
  }

  function seccion(contenedor, opciones) {
    const { modulo, contexto, guardar, error, rutaPlantilla, nombrePlantilla } = opciones;
    const caja = el('section', null, 'kce'), etiqueta = el('label', 'Elige un archivo Excel (.xlsx)'), input = el('input'), aviso = el('p'), previa = el('div');
    caja.append(el('h3', 'Carga por Excel'));
    if (rutaPlantilla) {
      const plantilla = el('a', 'Descargar plantilla', 'kce-plantilla');
      plantilla.href = rutaPlantilla; plantilla.download = nombrePlantilla || ''; caja.append(plantilla);
    }
    input.type = 'file'; input.accept = '.xlsx'; etiqueta.append(input);
    aviso.setAttribute('role', 'status'); caja.append(etiqueta, aviso, previa); contenedor.append(caja);

    input.onchange = async () => {
      previa.replaceChildren(); aviso.textContent = 'Leyendo archivo…';
      try {
        const archivo = input.files[0], buffer = await archivo.arrayBuffer(), contextoResuelto = await contexto();
        const resultado = await Carga.leer(buffer, modulo, contextoResuelto);
        const { nuevos, actualizados, errores, avisos } = resultado;
        aviso.textContent = '';
        previa.append(el('p', `${nuevos} ${nuevos === 1 ? 'registro nuevo' : 'registros nuevos'}, ${actualizados} ${actualizados === 1 ? 'actualizado' : 'actualizados'}.`));
        if (errores.length) { previa.append(el('h4', 'Errores')); tablaErrores(previa, errores); }
        if (avisos.length) {
          const lista = el('ul', null, 'kce-avisos');
          previa.append(el('h4', 'Avisos'));
          avisos.forEach(({ hoja, fila, mensaje }) => lista.append(el('li', fila ? `${hoja}, fila ${fila}: ${mensaje}` : `${hoja}: ${mensaje}`)));
          previa.append(lista);
        }
        if (nuevos + actualizados > 0) {
          const confirmar = boton('Confirmar carga');
          confirmar.onclick = async () => {
            confirmar.disabled = true; aviso.textContent = 'Guardando…';
            try {
              await guardar(resultado.registros);
              aviso.textContent = `Se guardaron ${nuevos} nuevos y ${actualizados} actualizados.`;
              previa.replaceChildren(); input.value = '';
            } catch (e) { error(aviso, e); confirmar.disabled = false; }
          };
          previa.append(confirmar);
        } else if (!errores.length) previa.append(el('p', 'El archivo no tiene registros para cargar.'));
      } catch (e) { previa.replaceChildren(); error(aviso, e); }
    };
  }

  root.KitVistaCargaExcel = { seccion };
})(typeof globalThis !== 'undefined' ? globalThis : this);
