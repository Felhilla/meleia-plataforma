/* Doble materialidad ilustrativa. Módulo puro, sin DOM ni dependencias. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KitMaterialidad = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const exigir = (ok, mensaje) => { if (!ok) throw new Error(mensaje); };
  const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const promedio = valores => valores.reduce((a, b) => a + b, 0) / valores.length;
  const mismas = (a, b) => Array.isArray(a) && a.length === b.length && new Set(a).size === b.length && b.every(k => a.includes(k));
  function validar(cfg) {
    const error = 'Configuración de materialidad inválida: ';
    exigir(objeto(cfg), error + 'se requiere un objeto');
    exigir(objeto(cfg.escala) && cfg.escala.minimo === 0 && cfg.escala.maximo === 5, error + 'escala 0–5');
    exigir(objeto(cfg.impacto) && mismas(cfg.impacto.severidad, ['escala', 'alcance', 'irremediabilidad']), error + 'variables de severidad');
    exigir(cfg.impacto.agregacion_severidad === 'promedio' && cfg.impacto.agregacion_grupos === 'promedio' && cfg.impacto.importancia === 'promedio(severidad, probabilidad)', error + 'agregación de impacto no soportada');
    exigir(objeto(cfg.financiera) && mismas(cfg.financiera.variables, ['rentabilidad', 'gasto_operativo']) && cfg.financiera.agregacion === 'promedio' && cfg.financiera.agregacion_evaluadores === 'promedio', error + 'agregación financiera no soportada');
    exigir(objeto(cfg.umbral) && ['fijo', 'promedio_universo'].includes(cfg.umbral.metodo) && cfg.umbral.regla === 'doble_entrada', error + 'regla de umbral no soportada');
    exigir(cfg.umbral.metodo === 'fijo' ? Number.isFinite(cfg.umbral.valor_fijo) && cfg.umbral.valor_fijo >= 0 && cfg.umbral.valor_fijo <= 5 : cfg.umbral.valor_fijo === null, error + 'valor_fijo');
  }
  function valor(ev, k, cfg) {
    exigir(objeto(ev) && Number.isFinite(ev[k]) && ev[k] >= cfg.escala.minimo && ev[k] <= cfg.escala.maximo, 'Evaluación: ' + k + ' fuera de escala 0–5 o ausente');
    return ev[k];
  }
  function evaluaciones(tema, clave) {
    exigir(objeto(tema) && objeto(tema[clave]) && Object.keys(tema[clave]).length > 0, 'Tema: ' + clave + ' debe contener evaluaciones por id');
    return Object.entries(tema[clave]);
  }
  function severidad(ev, cfg) {
    validar(cfg);
    return promedio(cfg.impacto.severidad.map(k => valor(ev, k, cfg)));
  }
  function porGrupo(tema, cfg) {
    validar(cfg);
    return Object.fromEntries(evaluaciones(tema, 'evaluacion_impacto').map(([id, ev]) => [id, promedio([severidad(ev, cfg), valor(ev, 'probabilidad', cfg)])]));
  }
  function importanciaImpacto(tema, cfg) {
    return promedio(Object.values(porGrupo(tema, cfg)));
  }
  function variablesFinancieras(tema, cfg) {
    validar(cfg);
    const evs = evaluaciones(tema, 'evaluacion_financiera').map(([, ev]) => ev);
    return Object.fromEntries(cfg.financiera.variables.map(k => [k, promedio(evs.map(ev => valor(ev, k, cfg)))]));
  }
  function puntajeFinanciero(tema, cfg) {
    return promedio(Object.values(variablesFinancieras(tema, cfg)));
  }
  function puntajes(temas, cfg) {
    validar(cfg);
    exigir(Array.isArray(temas) && temas.length > 0, 'Universo de temas vacío o inválido');
    exigir(temas.every(t => objeto(t) && typeof t.id === 'string' && t.id.trim()) && new Set(temas.map(t => t.id)).size === temas.length, 'Ids de temas ausentes o duplicados');
    return temas.map(t => ({ id: t.id, impacto: importanciaImpacto(t, cfg), financiera: puntajeFinanciero(t, cfg), ...variablesFinancieras(t, cfg) }));
  }
  function limites(filas, cfg) {
    return Object.fromEntries(['impacto', 'financiera'].map(k => [k, cfg.umbral.metodo === 'fijo' ? cfg.umbral.valor_fijo : promedio(filas.map(f => f[k]))]));
  }
  function umbrales(temas, cfg) {
    return limites(puntajes(temas, cfg), cfg);
  }
  function clasificar(temas, cfg) {
    const filas = puntajes(temas, cfg), cortes = limites(filas, cfg);
    const variables = ['impacto', 'rentabilidad', 'gasto_operativo'];
    const medias = Object.fromEntries(variables.map(k => [k, promedio(filas.map(f => f[k]))]));
    return filas.map(f => {
      const i = f.impacto > cortes.impacto, n = f.financiera > cortes.financiera;
      return { id: f.id, impacto: f.impacto, financiera: f.financiera,
        cuadrante: i && n ? 'doble' : i ? 'impacto' : n ? 'financiera' : 'no-material',
        material: i || n, convergencia: variables.filter(k => f[k] > medias[k]).length };
    });
  }
  function listaCorta(temas, cfg) {
    return clasificar(temas, cfg).filter(t => t.material).sort((a, b) => (b.impacto + b.financiera) - (a.impacto + a.financiera) || a.id.localeCompare(b.id));
  }
  function cruce(tema, { riesgos, plan, estandares }) {
    exigir(objeto(tema) && Array.isArray(tema.riesgos) && Array.isArray(tema.ejes), 'Tema: vínculos inválidos');
    exigir(Array.isArray(riesgos) && Array.isArray(plan) && objeto(estandares) && Array.isArray(estandares.ejes), 'Cruce: colecciones inválidas');
    const rs = new Set(tema.riesgos), es = new Set(tema.ejes);
    const unicos = filas => [...new Map(filas.map(f => [f.id, f])).values()].sort((a, b) => a.id.localeCompare(b.id));
    return { riesgos: unicos(riesgos.filter(r => rs.has(r.id))), ejes: unicos(estandares.ejes.filter(e => es.has(e.id))),
      acciones: unicos(plan.filter(a => (a.riesgos || []).some(id => rs.has(id)) || (a.ejes || []).some(id => es.has(id)))) };
  }
  // Coordenadas reales y desplazadas; búsqueda radial estable, independiente del orden.
  function posicionesMatriz(clasificados, ancho, alto, margen) {
    exigir([ancho, alto, margen].every(Number.isFinite) && margen >= 0 && ancho > 2 * margen && alto > 2 * margen, 'Área de matriz inválida');
    const puestos = [];
    const limitar = (v, max) => Math.max(margen, Math.min(max - margen, v));
    [...clasificados].sort((a, b) => a.id.localeCompare(b.id)).forEach(f => {
      const realX = margen + f.impacto / 5 * (ancho - 2 * margen);
      const realY = alto - margen - f.financiera / 5 * (alto - 2 * margen);
      let x = limitar(realX, ancho), y = limitar(realY, alto), encontrado = false;
      for (let radio = 0; radio <= Math.hypot(ancho, alto) && !encontrado; radio += 15) {
        const pasos = Math.max(1, Math.ceil(2 * Math.PI * radio / 7));
        for (let j = 0; j < pasos; j++) {
          const cx = limitar(realX + radio * Math.cos(j * 2 * Math.PI / pasos), ancho);
          const cy = limitar(realY + radio * Math.sin(j * 2 * Math.PI / pasos), alto);
          if (puestos.every(p => Math.hypot(cx - p.x, cy - p.y) >= 14)) { x = cx; y = cy; encontrado = true; break; }
        }
      }
      exigir(encontrado, 'Área insuficiente para separar los temas');
      puestos.push({...f, x, y, realX, realY});
    });
    return puestos;
  }
  function resumen(temas, cfg) {
    const filas = clasificar(temas, cfg);
    const porCuadrante = Object.fromEntries(['doble', 'impacto', 'financiera', 'no-material'].map(k => [k, filas.filter(f => f.cuadrante === k).length]));
    return {evaluados: filas.length, materiales: filas.filter(f => f.material).length, noMateriales: filas.filter(f => !f.material).length, porCuadrante, umbrales: umbrales(temas, cfg)};
  }
  function filtrar(clasificados, temas, filtros = {}) {
    const dimensiones = new Map(temas.map(t => [t.id, t.dimension_esg]));
    return clasificados.filter(f => (!filtros.cuadrante || f.cuadrante === filtros.cuadrante) && (!filtros.dimension || dimensiones.get(f.id) === filtros.dimension) && (![true, '1', 'true'].includes(filtros.materiales) || f.material));
  }
  function ordenar(clasificados, criterio = 'impacto') {
    const clave = criterio === 'financiera' ? criterio : 'impacto';
    return [...clasificados].sort((a, b) => b[clave] - a[clave] || a.id.localeCompare(b.id));
  }
  // Cada mapa es un arreglo de puntos con .umbrales = {x, y}; los cortes
  // geométricos son medias del universo, independientes del criterio material.
  function mapaDimension(temas, cfg, dimension) {
    const cortes = umbrales(temas, cfg);
    const puntos = temas.map(t => {
      const evs = Object.values(t.evaluacion_impacto);
      const fin = variablesFinancieras(t, cfg);
      return {id: t.id,
        x: dimension === 'impacto' ? promedio(evs.map(e => valor(e, 'probabilidad', cfg))) : fin.gasto_operativo,
        y: dimension === 'impacto' ? promedio(evs.map(e => severidad(e, cfg))) : fin.rentabilidad,
        material: (dimension === 'impacto' ? importanciaImpacto(t, cfg) : puntajeFinanciero(t, cfg)) > cortes[dimension]};
    });
    puntos.umbrales = {x: promedio(puntos.map(p => p.x)), y: promedio(puntos.map(p => p.y))};
    return puntos;
  }
  function mapaImpacto(temas, cfg) { return mapaDimension(temas, cfg, 'impacto'); }
  function mapaFinanciero(temas, cfg) { return mapaDimension(temas, cfg, 'financiera'); }
  function matrizGrupos(temas, cfg) {
    puntajes(temas, cfg);
    return temas.map(t => ({id: t.id, celdas: porGrupo(t, cfg), total: importanciaImpacto(t, cfg)}))
      .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  }
  function matrizEvaluadores(temas, cfg) {
    puntajes(temas, cfg);
    return temas.map(t => ({id: t.id, celdas: Object.fromEntries(evaluaciones(t, 'evaluacion_financiera')
      .map(([id, ev]) => [id, promedio(cfg.financiera.variables.map(k => valor(ev, k, cfg)))])), total: puntajeFinanciero(t, cfg)}))
      .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  }
  function tonoCalor(valor, min, max) {
    exigir([valor, min, max].every(Number.isFinite) && max >= min, 'Escala de calor inválida');
    return max === min ? 0 : Math.max(0, Math.min(4, Math.floor((valor - min) / (max - min) * 5)));
  }
  return { mapaImpacto, mapaFinanciero, matrizGrupos, matrizEvaluadores, tonoCalor, severidad, importanciaImpacto, puntajeFinanciero, umbrales, clasificar, listaCorta, cruce, porGrupo, posicionesMatriz, resumen, filtrar, ordenar };
}));
