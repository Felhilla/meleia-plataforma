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
    r.avisos = [];
    // Solo los servidores públicos llevan nombre. En la carga se descarta en silencio; en el formulario es error.
    if ((r.registro.nombre_servidor || r.registro.fecha_verificacion) && !(cfg.nombreServidor?.categorias || []).includes(r.registro.categoria)) {
      if (origen === 'carga') { delete r.registro.nombre_servidor; delete r.registro.fecha_verificacion; r.avisos.push('Nombre descartado: solo se registra el de servidores públicos.'); }
      else r.errores.push({ campo: 'nombre_servidor', mensaje: 'Solo se registra el nombre de servidores públicos (Instituciones gubernamentales).' });
    }
    if (r.registro.fecha_verificacion && !r.registro.nombre_servidor) r.errores.push({ campo: 'fecha_verificacion', mensaje: 'La fecha de verificación va solo con un nombre.' });
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
  // E41 (5-nov): la organización agrupa a sus actores. Su resultado es el promedio de ellos y
  // se puede modificar libremente con justificación escrita y nombre de quien modifica.
  const EJES = ['dependencia', 'tension', 'responsabilidad', 'influencia', 'impacto'];
  const slug = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '');
  const idOrganizacion = nombre => 'org-' + (slug(nombre) || 'sin-nombre');
  function promedio(valores) {
    const v = valores.map(nivel).filter(x => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
  }
  function posicionFrecuente(actores, cfg) {
    const orden = cfg.organizacion?.desempatePosicion || ['Desfavorable', 'Neutral', 'Favorable'];
    const cuenta = p => actores.filter(a => a.posicion === p).length, max = Math.max(0, ...orden.map(cuenta));
    return max ? orden.find(p => cuenta(p) === max) : null;
  }
  function cuadrante(influencia, impacto, cfg) {
    if (typeof influencia !== 'number' || typeof impacto !== 'number') return null;
    return cfg.niveles.find(n => n.influencia === (influencia >= cfg.corte ? 'alta' : 'baja') && n.impacto === (impacto >= cfg.corte ? 'alto' : 'bajo'))?.nombre || null;
  }
  const tieneAjuste = r => !!r && typeof r.ajuste_influencia === 'number' && typeof r.ajuste_impacto === 'number' && typeof r.ajuste_justificacion === 'string' && !!r.ajuste_justificacion.trim() && typeof r.ajuste_autor === 'string' && !!r.ajuste_autor.trim();
  function organizaciones(actores, registros, cfg) {
    const porId = new Map((registros || []).map(r => [r.id, r])), grupos = new Map();
    (actores || []).forEach(a => { const id = idOrganizacion(a.institucion); if (!grupos.has(id)) grupos.set(id, []); grupos.get(id).push(a); });
    (registros || []).forEach(r => { if (!grupos.has(r.id)) grupos.set(r.id, []); });
    return [...grupos].map(([id, lista]) => {
      const r = porId.get(id) || null, promedios = Object.fromEntries(EJES.map(e => [e, promedio(lista.map(a => a[e]))])), ajustado = tieneAjuste(r);
      const influencia = ajustado ? r.ajuste_influencia : promedios.influencia, impacto = ajustado ? r.ajuste_impacto : promedios.impacto;
      return { id, nombre: r?.nombre || lista[0]?.institucion || '', categoria: r?.categoria || lista[0]?.categoria || '', posicion: r?.posicion || posicionFrecuente(lista, cfg),
        caracterizacion: r?.caracterizacion || '', actores: lista, promedios, influencia, impacto, ajustado,
        ajuste: ajustado ? { justificacion: r.ajuste_justificacion.trim(), autor: r.ajuste_autor.trim(), fecha: r.ajuste_fecha || null } : null,
        cuadrante: cuadrante(influencia, impacto, cfg), registro: r };
    });
  }
  function validarOrganizacion(org, esquema) {
    const limpio = Object.fromEntries(Object.keys(esquema.campos).filter(k => Object.hasOwn(org, k)).map(k => [k, org[k]]));
    if (org.id !== undefined) limpio.id = org.id;
    const r = V.validar(limpio, esquema), campos = ['ajuste_influencia', 'ajuste_impacto', 'ajuste_justificacion', 'ajuste_autor'];
    const presentes = campos.filter(c => r.registro[c] !== undefined && r.registro[c] !== null && String(r.registro[c]).trim() !== '');
    if (presentes.length && presentes.length < campos.length) campos.filter(c => !presentes.includes(c)).forEach(c => r.errores.push({ campo: c, mensaje: 'Para modificar el resultado se necesitan influencia, impacto, justificación y nombre de quien modifica.' }));
    if (org.id !== undefined && org.id !== idOrganizacion(r.registro.nombre)) r.errores.push({ campo: 'nombre', mensaje: 'El identificador no corresponde al nombre de la organización.' });
    r.ok = !r.errores.length; return r;
  }
  const api = { nivel, nivelCalculado, permitidos, validarAjuste, validar, nivelFinal, alerta, indicadores, EJES, idOrganizacion, promedio, posicionFrecuente, cuadrante, organizaciones, validarOrganizacion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitActores = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
