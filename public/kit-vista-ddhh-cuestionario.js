/* E47 (6-nov): cuestionario guiado del Módulo II (debida diligencia en DDHH) sobre el motor KitCuestionario.
 * Un paso por etapa o tema, con la pregunta de cada indicador y su escala; hallazgos por dimensión; revisión con los
 * puntajes que calcula la plataforma. Valida y calcula con KitEstudios.prepararDdhh, el mismo camino de la carga por Excel.
 * La calificación en blanco vale 0 (decisión del 29-oct). Si ya hay evaluaciones, parte de la más reciente para actualizarla.
 */
(function (root) {
  'use strict';
  const COLECCIONES = ['ddhh-evaluaciones', 'ddhh-indicadores', 'ddhh-componentes', 'ddhh-dimensiones'];
  const vacio = v => v === undefined || v === null || v === '';

  // Estado inicial: la evaluación más reciente (si existe) o vacío. La fecha siempre es la de hoy.
  function estadoInicial(cat, existentes, hoy) {
    const evs = [...(existentes['ddhh-evaluaciones'] || [])].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const ultima = evs[0], estado = { evaluacion: { nombre: '', fecha: hoy }, ind: {}, dim: {}, base: ultima ? ultima.nombre + ' (' + String(ultima.fecha).slice(0, 7) + ')' : '' };
    if (ultima) {
      (existentes['ddhh-indicadores'] || []).filter(r => r.evaluacion === ultima.id).forEach(r => { estado.ind[r.indicador] = { calificacion: r.calificacion == null ? '' : String(r.calificacion), incorporado: r.incorporado || '', documentos: r.documentos || '', descripcion: r.descripcion || '', brecha: r.brecha || '' }; });
      (existentes['ddhh-dimensiones'] || []).filter(r => r.evaluacion === ultima.id).forEach(r => { estado.dim[r.dimension] = { hallazgos: r.hallazgos || '', brechas: r.brechas || '' }; });
    }
    return estado;
  }

  // Del estado del cuestionario a los datos planos que recibe KitEstudios.prepararDdhh.
  function entradaDesde(cat, estado) {
    return {
      evaluacion: { nombre: estado.evaluacion?.nombre, fecha: estado.evaluacion?.fecha },
      indicadores: cat.indicadores.map(i => { const r = estado.ind?.[i.id] || {}; return { indicador: i.id, incorporado: r.incorporado, documentos: r.documentos, descripcion: r.descripcion, brecha: r.brecha, calificacion: vacio(r.calificacion) ? null : Number(r.calificacion) }; }),
      dimensiones: [...cat.dimensiones.grandes, ...cat.ejes].map(d => ({ dimension: d.id, hallazgos: estado.dim?.[d.id]?.hallazgos, brechas: estado.dim?.[d.id]?.brechas })).filter(d => !vacio(d.hallazgos) || !vacio(d.brechas))
    };
  }

  function montar(zona, ctx) {
    const { cat, esquemas, existentes, empresa, guardar, alVolver } = ctx, K = root.KitEstudios, el = root.App.el;
    const hoy = new Date().toISOString().slice(0, 10), estado = estadoInicial(cat, existentes, hoy);
    const reglaInc = esquemas['ddhh-indicadores'].campos.incorporado;
    const textoInc = { si: 'Sí', no: 'No', parcial: 'Parcial' };
    const preparar = () => K.prepararDdhh(cat, esquemas, existentes, entradaDesde(cat, estado));
    const pasoDe = { evaluacion: 0, dimensiones: cat.ejes.length + 1 };

    const pasoEvaluacion = {
      id: 'evaluacion', titulo: 'Evaluación',
      pintar(p, _e, api) {
        p.append(el('p', estado.base ? `Partimos de la evaluación «${estado.base}». Cambia solo lo que haya cambiado y guarda con la fecha de hoy.` : 'Responde cada pregunta con la escala de 0 a 5. Lo que dejes en blanco cuenta como 0 en los promedios.', 'kq-ayuda'));
        api.texto(p, 'evaluacion.nombre', { pregunta: '¿Cómo se llama esta evaluación?', ayuda: 'Ejemplo: Línea base 2026.' });
        api.fecha(p, 'evaluacion.fecha', { pregunta: '¿En qué fecha se hace?', ayuda: 'Si ya existe una evaluación del mismo mes, esta la reemplaza.' });
      },
      validar(e) {
        const err = [];
        if (vacio(e.evaluacion?.nombre?.trim?.())) err.push({ campo: 'evaluacion.nombre', mensaje: 'Escribe un nombre para la evaluación.' });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.evaluacion?.fecha || '')) err.push({ campo: 'evaluacion.fecha', mensaje: 'Elige una fecha.' });
        return err;
      }
    };
    const pasosEjes = cat.ejes.map((eje, n) => ({
      id: eje.id, titulo: eje.id.startsWith('etapa') ? 'Etapa ' + eje.id.split('-').pop() : eje.nombre.trim(),
      pintar(p, _e, api) {
        const s = K.escala(cat, eje.id), estandar = cat.estandares.find(x => x.id === eje.estandar);
        p.append(el('p', estandar?.nombre || '', 'kit-mono'), el('h3', eje.nombre.replace(/\s+/g, ' ').trim(), 'kq-eje'));
        const niveles = s.niveles || [];
        cat.indicadores.filter(i => i.eje === eje.id).forEach((ind, k) => {
          const caja = el('section', null, 'kq-indicador');
          const comp = eje.componentes.find(c => c.id === ind.componente);
          if (comp && (k === 0 || cat.indicadores.filter(i => i.eje === eje.id)[k - 1].componente !== ind.componente)) p.append(el('p', comp.nombre, 'kq-criterio'));
          api.escala(caja, `ind.${ind.id}.calificacion`, { pregunta: `${ind.etiqueta || ind.codigo || ''} ${ind.pregunta}`.trim(), opciones: niveles });
          api.lista(caja, `ind.${ind.id}.incorporado`, { pregunta: '¿Está incorporado?', opciones: reglaInc.valores.map(v => ({ id: v, nombre: textoInc[v] || v })) });
          const mas = el('details', null, 'kq-mas'); mas.append(el('summary', 'Evidencia, hallazgo y brecha'));
          api.texto(mas, `ind.${ind.id}.documentos`, { pregunta: 'Documentos analizados' });
          api.textoLargo(mas, `ind.${ind.id}.descripcion`, { pregunta: 'Hallazgo' });
          api.textoLargo(mas, `ind.${ind.id}.brecha`, { pregunta: 'Brecha y recomendación' });
          if (['documentos', 'descripcion', 'brecha'].some(c => !vacio(estado.ind?.[ind.id]?.[c]))) mas.open = true;
          caja.append(mas); p.append(caja);
        });
      },
      validar() { const r = preparar(); return r.errores.filter(x => x.seccion === 'indicadores' && x.indicador && cat.indicadores.find(i => i.id === x.indicador)?.eje === eje.id).map(x => ({ campo: `ind.${x.indicador}.${x.campo}`, mensaje: x.mensaje })); }
    }));
    const pasoDimensiones = {
      id: 'dimensiones', titulo: 'Hallazgos por dimensión', opcional: true,
      pintar(p, _e, api) {
        p.append(el('p', 'Opcional. Resume los hallazgos y las brechas de cada dimensión, uno por línea. Se muestran en los Resultados.', 'kq-ayuda'));
        [...cat.dimensiones.grandes.map(g => ({ id: g.id, nombre: g.titulo })), ...cat.ejes].forEach(d => {
          const mas = el('details', null, 'kq-mas'); mas.append(el('summary', d.nombre.replace(/\s+/g, ' ').trim()));
          api.textoLargo(mas, `dim.${d.id}.hallazgos`, { pregunta: 'Hallazgos (uno por línea)' });
          api.textoLargo(mas, `dim.${d.id}.brechas`, { pregunta: 'Brechas (una por línea)' });
          if (estado.dim?.[d.id]?.hallazgos || estado.dim?.[d.id]?.brechas) mas.open = true;
          p.append(mas);
        });
      },
      validar() { return preparar().errores.filter(x => x.seccion === 'dimensiones').map(x => ({ campo: 'dimensiones', mensaje: x.mensaje })); }
    };
    const pasos = [pasoEvaluacion, ...pasosEjes, pasoDimensiones, { id: 'revision', titulo: 'Revisión', revision: true }];

    root.KitCuestionario.montar(zona, {
      titulo: 'Evaluación de debida diligencia en DDHH', pasos, estado,
      persistencia: { clave: 'kq:ddhh:' + empresa, almacen: 'sesion' },
      revisar() {
        const r = preparar(), ev = r.registros['ddhh-evaluaciones'][0];
        const sinCalificar = cat.indicadores.filter(i => vacio(estado.ind?.[i.id]?.calificacion)).length;
        const secciones = [{ titulo: 'Evaluación', filas: [['Nombre', estado.evaluacion?.nombre], ['Fecha', estado.evaluacion?.fecha], ['Indicadores sin calificar (cuentan como 0)', String(sinCalificar)]] }];
        if (ev) secciones.push({ titulo: 'Puntajes calculados (0 a 5)', filas: cat.ejes.map(e => [e.nombre.replace(/\s+/g, ' ').trim(), K.mostrar(ev[e.id], K.escala(cat, e.id))]) });
        const errores = r.errores.map(x => ({ mensaje: x.mensaje, paso: x.seccion === 'evaluacion' ? 0 : x.seccion === 'dimensiones' ? pasoDe.dimensiones : 1 + Math.max(0, cat.ejes.findIndex(e => e.id === cat.indicadores.find(i => i.id === x.indicador)?.eje)) }));
        return { secciones, nuevos: r.nuevos, actualizados: r.actualizados, errores };
      },
      async guardar() {
        const r = preparar(); if (r.errores.length) throw Error('Corrige los errores indicados antes de guardar.');
        await guardar(r.registros); return r;
      },
      alTerminar() { alVolver('Evaluación guardada. Los puntajes ya se ven en Resultados.'); },
      alCancelar() { alVolver(''); }
    });
  }
  const api = { montar, estadoInicial, entradaDesde, COLECCIONES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitCuestionarioDdhh = api;
})(typeof window !== 'undefined' ? window : globalThis);
