/* Módulo IV: cálculos puros. Toda regla de negocio se recibe como configuración. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KitRiesgos = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function nivel(promedio, cfg) {
    return cfg.gravedad.cortes.find(c => c.menor_que === null || promedio < c.menor_que)?.nivel;
  }
  function gravedad(calificacion, cfg) {
    const valores = cfg.gravedad.criterios.map(k => calificacion?.[k]);
    if (!valores.every(v => Number.isInteger(v) && v >= cfg.gravedad.minimo && v <= cfg.gravedad.maximo)) return null;
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    return { promedio, nivel: nivel(promedio, cfg) };
  }
  function prioridad(calificacion, cfg) {
    const g = gravedad(calificacion, cfg);
    return g ? cfg.prioridad[g.nivel]?.[calificacion.probabilidad] || null : null;
  }
  function validacion(riesgo, validaciones, cfg) {
    const grupos = new Map(validaciones.filter(v => v.riesgo === riesgo).map(v => [v.grupo, v]));
    const revisados = grupos.size, confirman = [...grupos.values()].filter(v => v.resultado === cfg.resultadoConfirma).length;
    return { revisados, confirman, texto: revisados ? `${confirman} de ${revisados} grupos confirman` : 'pendiente de validación' };
  }
  function ajuste(tecnica, propuesta, cfg) {
    const campos = Object.fromEntries(Object.entries(propuesta).filter(([k, v]) => k.startsWith('propuesta_') && v !== '' && v != null).map(([k, v]) => [k.slice(10), v]));
    const calificacion = { ...tecnica, ...campos };
    return { calificacion, gravedad: gravedad(calificacion, cfg), prioridad: prioridad(calificacion, cfg) };
  }
  function plazo(medida, calificaciones, cfg, fechaBase) {
    if (medida.plazo) return { fecha: medida.plazo, propuesto: false };
    const ids = medida.riesgos || [];
    const prioridades = ids.map(id => prioridad(calificaciones.find(c => c.riesgo === id), cfg));
    // No presentar un plazo de baja prioridad cuando falta alguna calificación.
    if (ids.length && prioridades.some(p => !p)) return { fecha: null, meses: null, propuesto: true };
    const p = cfg.niveles.find(n => prioridades.includes(n));
    const meses = cfg.plazos[p || 'sinRiesgo'];
    if (!fechaBase) return { meses, propuesto: true };
    const base = new Date(fechaBase + 'T00:00:00Z');
    if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0, 10) !== fechaBase) throw Error('Fecha base inválida');
    const dia = base.getUTCDate(); base.setUTCDate(1); base.setUTCMonth(base.getUTCMonth() + meses);
    const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    base.setUTCDate(Math.min(dia, ultimo));
    return { meses, fecha: base.toISOString().slice(0, 10), propuesto: true };
  }
  function componentes(cfg, empresa) { return cfg.componentesPorEmpresa?.[empresa] || cfg.componentes; }
  function avance(medidas, cfg, empresa) {
    const contar = lista => { const cumplidas = lista.filter(a => a.estado === cfg.estadoCumplido).length; return { total: lista.length, cumplidas, porcentaje: lista.length ? cumplidas / lista.length * 100 : 0 }; };
    return { ...contar(medidas), componentes: componentes(cfg, empresa).map(c => ({ ...c, ...contar(medidas.filter(a => a.componente === c.id)) })) };
  }
  function sinMedida(riesgos, medidas) { const atendidos = new Set(medidas.flatMap(a => a.riesgos || [])); return riesgos.filter(r => !atendidos.has(r.id)); }
  return { nivel, gravedad, prioridad, validacion, ajuste, plazo, componentes, avance, sinMedida };
}));
