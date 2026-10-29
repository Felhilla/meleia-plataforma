/* Contrato propio de los módulos II y III: no modifica el contrato de Excel. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kit-validacion.js'));
  else root.KitEstudios = factory(root.KitValidacion);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (V) {
  'use strict';
  const colecciones = {
    ddhh: ['ddhh-evaluaciones','ddhh-indicadores','ddhh-componentes','ddhh-dimensiones','ddhh-resultados'],
    materialidad: ['materialidad-temas','materialidad-impacto','materialidad-financiera','materialidad-participacion']
  };
  const copiar = x => JSON.parse(JSON.stringify(x));
  function escala(cat, ejeId) {
    const eje = cat.ejes.find(e => e.id === ejeId);
    const s = cat.estandares.find(s => s.id === eje?.estandar)?.escala;
    if (!s) throw Error('No hay una escala configurada para este eje.');
    return s;
  }
  function reglaEscala(s, etiqueta) {
    return s.tipo === 'lista' ? {tipo:'lista', valores:s.valores, etiqueta, obligatorio:true}
      : {tipo:'decimal',min:s.min,max:s.max,etiqueta,obligatorio:true};
  }
  function esquema(base, c, cat, registro = {}) {
    const s = copiar(base);
    if(c==='ddhh-indicadores')s.campos.indicador.valores=cat.indicadores.map(i=>i.id);
    if(c==='ddhh-componentes')s.campos.componente.valores=cat.ejes.flatMap(e=>e.componentes.map(x=>x.id));
    if(c==='ddhh-dimensiones')s.campos.dimension.valores=[...cat.dimensiones.grandes,...cat.ejes].map(x=>x.id);
    if(c==='materialidad-temas')s.campos.ejes.valores=cat.ejes.map(e=>e.id);
    if (c === 'ddhh-evaluaciones') {
      for (const k of Object.keys(s.campos)) if (!['id','nombre','fecha','origen'].includes(k)) delete s.campos[k];
      cat.ejes.forEach(e => { s.campos[e.id] = reglaEscala(escala(cat,e.id),e.nombre); });
    }
    if (c === 'ddhh-indicadores' || c === 'ddhh-componentes') {
      const eje = c === 'ddhh-indicadores' ? cat.indicadores.find(i => i.id === registro.indicador)?.eje
        : cat.ejes.find(e => e.componentes.some(x => x.id === registro.componente))?.id;
      if (eje) s.campos.calificacion = {...reglaEscala(escala(cat,eje),'Calificación'),obligatorio:base.campos.calificacion.obligatorio};
    }
    return s;
  }
  function validar(entrada, s, referencias = {}) {
    const r = {...entrada};
    for (const [k,v] of Object.entries(s.campos)) if (v.tipo === 'decimal' && typeof r[k] === 'string') r[k] = r[k].replace(',', '.');
    const resultado = V.validar(r,s,referencias);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(r.id || '')) resultado.errores.push({campo:'id',mensaje:'Usa un código de hasta 80 letras, números, guiones o guiones bajos.'});
    resultado.ok = !resultado.errores.length;
    return resultado;
  }
  function posicion(valor,s) {
    if (s.tipo === 'lista') { const i=s.valores.indexOf(valor); return i<0 ? null : (s.valores.length===1 ? 5 : i/(s.valores.length-1)*5); }
    return typeof valor==='number' && valor>=s.min && valor<=s.max ? (valor-s.min)/(s.max-s.min)*5 : null;
  }
  function mostrar(valor,s) { return posicion(valor,s)===null ? 'Sin información' : s.tipo==='lista' ? valor : new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(valor); }
  function empresa(texto,nombre) { return typeof texto==='string' ? texto.replaceAll('{empresa}',nombre) : texto; }
  function reemplazar(obj,nombre) {
    if (typeof obj==='string') return empresa(obj,nombre);
    if (Array.isArray(obj)) return obj.map(x=>reemplazar(x,nombre));
    if (obj && typeof obj==='object') return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,reemplazar(v,nombre)]));
    return obj;
  }
  function ddhh(cat,listas,evaluacion) {
    const ev = listas['ddhh-evaluaciones'] || [];
    const dims = copiar(cat.dimensiones);
    const hallazgos = (listas['ddhh-dimensiones']||[]).filter(r=>r.evaluacion===evaluacion);
    [...dims.grandes,...Object.entries(dims.ejes).map(([id,v])=>Object.assign(v,{id}))].forEach(d=>{
      const r=hallazgos.find(r=>r.dimension===d.id);
      d.hallazgos=(r?.hallazgos||'').split('\n').filter(Boolean); d.brechas=(r?.brechas||'').split('\n').filter(Boolean);
    });
    const ejes=cat.ejes.map(e=>{
      const indicadores=cat.indicadores.filter(i=>i.eje===e.id).map(i=>({...i,...(listas['ddhh-indicadores']||[]).find(r=>r.evaluacion===evaluacion&&r.indicador===i.id)}));
      const criterios=e.componentes.map(c=>({...c,calificacion:(listas['ddhh-componentes']||[]).find(r=>r.evaluacion===evaluacion&&r.componente===c.id)?.calificacion}));
      return {...e,criterios,hallazgos:e.componentes.length?{grupos:e.componentes.map(c=>({nombre:c.nombre,indicadores:indicadores.filter(i=>i.componente===c.id)}))}:{indicadores}};
    });
    return {dimensiones:dims,estandares:{ejes,escala:cat.estandares[0].escala.niveles||[]},umbrales:cat.umbrales,
      caso:{metodologia:{calificacion:cat.calificacion}},evaluaciones:ev.map(r=>({...r,fecha:r.fecha.slice(0,7),puntajes:Object.fromEntries(cat.ejes.map(e=>[e.id,r[e.id]]))}))};
  }
  // Puntajes de una evaluación desde sus indicadores (decisión del 29-oct-2026): la calificación en blanco
  // vale 0; un criterio es el promedio de sus indicadores; un eje con criterios, el promedio de sus criterios,
  // y un eje sin criterios, el promedio de sus indicadores. Así no se escriben promedios a mano.
  function calcular(cat,indicadores) {
    const valores=new Map(indicadores.map(r=>[r.indicador,typeof r.calificacion==='number'?r.calificacion:0]));
    const promedio=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0, valor=i=>valores.get(i.id)??0;
    const componentes=Object.fromEntries(cat.ejes.flatMap(e=>e.componentes).map(c=>[c.id,promedio(cat.indicadores.filter(i=>i.componente===c.id).map(valor))]));
    const puntajes=Object.fromEntries(cat.ejes.map(e=>[e.id,e.componentes.length?promedio(e.componentes.map(c=>componentes[c.id])):promedio(cat.indicadores.filter(i=>i.eje===e.id).map(valor))]));
    return {componentes,puntajes};
  }
  function materialidad(cat,listas) {
    return {grupos:cat.grupos,evaluadores_financieros:cat.evaluadores_financieros,temas:(listas['materialidad-temas']||[]).map(t=>({...t,
      evaluacion_impacto:Object.fromEntries((listas['materialidad-impacto']||[]).filter(r=>r.tema===t.id).map(r=>[r.grupo,r])),
      evaluacion_financiera:Object.fromEntries((listas['materialidad-financiera']||[]).filter(r=>r.tema===t.id).map(r=>[r.evaluador,r]))}))};
  }
  return {colecciones,escala,reglaEscala,esquema,validar,posicion,mostrar,empresa,reemplazar,ddhh,materialidad,calcular};
}));
