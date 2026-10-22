(function (root) {
  'use strict';
  const V = typeof module !== 'undefined' && module.exports ? require('./kit-validacion.js') : root.KitValidacion;
  function nivel(valor) {
    const r = V.validar({ valor }, { campos: { valor: { tipo: 'nivel', escala: 5, obligatorio: true } } });
    return r.ok ? r.registro.valor : null;
  }
  function nivelCalculado(actor, cfg) {
    const i = nivel(actor.influencia), m = nivel(actor.impacto);
    if (i === null || m === null) return null;
    return cfg.niveles.find(n => n.influencia === (i >= cfg.corte ? 'alta' : 'baja') && n.impacto === (m >= cfg.corte ? 'alto' : 'bajo'))?.nombre || null;
  }
  const permitidos = (actor, cfg) => cfg.subidas[nivelCalculado(actor, cfg)] || [];
  function validarAjuste(actor, cfg, esquema, origen = 'manual') {
    const errores = [], error = (campo, mensaje) => errores.push({ campo, mensaje });
    if (actor.nivel_ajustado) {
      if (!permitidos(actor, cfg).includes(actor.nivel_ajustado)) error('nivel_ajustado', 'El ajuste debe subir un solo paso desde el nivel calculado.');
      const regla = esquema.campos.motivo_ajuste;
      if (!(origen === 'carga' ? regla.valores : regla.valoresManual).includes(actor.motivo_ajuste)) error('motivo_ajuste', 'Selecciona un motivo admitido para este ajuste.');
      if (typeof actor.explicacion_ajuste !== 'string' || !actor.explicacion_ajuste.trim()) error('explicacion_ajuste', 'Explica el ajuste en una o dos frases.');
    } else if (actor.motivo_ajuste || actor.explicacion_ajuste) error('nivel_ajustado', 'Selecciona el nivel ajustado o retira el motivo y la explicación.');
    return { ok: !errores.length, errores };
  }
  function validar(actor, cfg, esquema, origen = 'manual') {
    // KitValidacion conserva campos desconocidos: esta frontera usa una lista permitida.
    const limpio = Object.fromEntries(Object.keys(esquema.campos).filter(k => Object.hasOwn(actor, k)).map(k => [k, actor[k]]));
    if (actor.id !== undefined) limpio.id = actor.id;
    const r = V.validar(limpio, esquema);
    r.errores.push(...validarAjuste(r.registro, cfg, esquema, origen).errores);
    if (actor.id !== undefined && !/^act-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(actor.id)) r.errores.push({ campo: 'institucion', mensaje: 'El identificador del actor no es válido.' });
    r.ok = !r.errores.length; return r;
  }
  function nivelFinal(actor, cfg) {
    return actor.nivel_ajustado && permitidos(actor, cfg).includes(actor.nivel_ajustado) && cfg.motivosAjuste.includes(actor.motivo_ajuste) && typeof actor.explicacion_ajuste === 'string' && actor.explicacion_ajuste.trim() ? actor.nivel_ajustado : nivelCalculado(actor, cfg);
  }
  const alerta = (actor, cfg) => actor.posicion === cfg.alerta.posicion && nivel(actor.tension) >= cfg.alerta.tensionMinima;
  function indicadores(actores, cfg) {
    const contar = (valores, fn) => valores.map(nombre => { const cantidad = actores.filter(a => fn(a) === nombre).length; return { nombre, cantidad, porcentaje: actores.length ? cantidad * 100 / actores.length : 0 }; });
    return { total: actores.length, cuadrantes: contar(cfg.niveles.map(n => n.nombre), a => nivelFinal(a, cfg)), posiciones: contar(['Favorable', 'Neutral', 'Desfavorable'], a => a.posicion), categorias: contar([...new Set(actores.map(a => a.categoria))], a => a.categoria), alertas: actores.filter(a => alerta(a, cfg)).length };
  }
  const api = { nivel, nivelCalculado, permitidos, validarAjuste, validar, nivelFinal, alerta, indicadores };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitActores = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
