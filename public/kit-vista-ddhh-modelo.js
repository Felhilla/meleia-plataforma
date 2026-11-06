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

  // Un solo camino para el Módulo II (E47, 6-nov): la carga por Excel y el cuestionario entregan los mismos datos
  // planos y esta función valida, calcula los promedios y arma los registros. Si hay cualquier error no devuelve
  // registros: un promedio calculado con datos a medias sería engañoso.
  // entrada = { evaluacion: {nombre, fecha, fila}, indicadores: [{fila, indicador, incorporado, documentos, descripcion, calificacion, brecha}], dimensiones: [{fila, dimension, hallazgos, brechas}] }
  // Cada error lleva la sección (evaluacion, indicadores o dimensiones), la fila de origen si existe, el campo y el mensaje.
  function prepararDdhh(cat,esquemas,existentes,entrada,opciones={}) {
    const presente=v=>v!==undefined&&v!==null&&!(typeof v==='string'&&!v.trim());
    const normalizar=v=>String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
    const texto=v=>presente(v)?String(v).trim():'';
    const pista=opciones.pistas||{};
    const errores=[],avisos=[],cols=colecciones.ddhh.slice(0,4);
    const vacio={registros:Object.fromEntries(cols.map(c=>[c,[]])),nuevos:0,actualizados:0,errores,avisos};
    const sch=(c,r)=>esquema(esquemas[c],c,cat,r);
    const ev=entrada.evaluacion||{},fecha=texto(ev.fecha);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){errores.push({seccion:'evaluacion',fila:ev.fila,campo:'fecha',mensaje:`Fecha = ${JSON.stringify(fecha)}, se esperaba una fecha (AAAA-MM-DD).`});return vacio;}
    const idEvaluacion='eval-'+fecha.slice(0,7),referencias={'ddhh-evaluaciones':new Set([idEvaluacion])};
    const catalogo=new Set(cat.indicadores.map(i=>i.id)),vistos=new Map(),registrosIndicadores=[];let enBlanco=0;
    for(const fila of entrada.indicadores||[]){
      const codigo=texto(fila.indicador);
      if(!catalogo.has(codigo)){errores.push({seccion:'indicadores',fila:fila.fila,campo:'indicador',mensaje:`Código = ${JSON.stringify(codigo)}, no corresponde a ningún indicador.`+(pista.codigo||'')});continue;}
      if(vistos.has(codigo)){errores.push({seccion:'indicadores',fila:fila.fila,campo:'indicador',mensaje:`Indicador repetido${vistos.get(codigo)?': ya está en la fila '+vistos.get(codigo):''}. Deja una sola fila.`});continue;}
      vistos.set(codigo,fila.fila);
      let calificacion=fila.calificacion;if(!presente(calificacion)){calificacion=0;enBlanco++;}
      let incorporado=fila.incorporado;
      if(presente(incorporado)){const valores=esquemas['ddhh-indicadores'].campos.incorporado.valores;incorporado=valores.find(v=>normalizar(v)===normalizar(incorporado))??incorporado;}
      const e={id:idEvaluacion+'--'+codigo,evaluacion:idEvaluacion,indicador:codigo,incorporado:texto(incorporado),documentos:texto(fila.documentos),descripcion:texto(fila.descripcion),calificacion,brecha:texto(fila.brecha),nota:'',origen:'cargada',...(fila.fila!==undefined?{fila_fuente:fila.fila}:{})};
      const r=validar(e,sch('ddhh-indicadores',e),referencias);
      if(!r.ok){r.errores.forEach(x=>errores.push({seccion:'indicadores',fila:fila.fila,campo:x.campo,mensaje:x.mensaje,indicador:codigo}));continue;}
      registrosIndicadores.push(r.registro);
    }
    const faltantes=cat.indicadores.filter(i=>!vistos.has(i.id));
    if((entrada.indicadores||[]).length&&faltantes.length)errores.push({seccion:'indicadores',mensaje:`Faltan ${faltantes.length} indicadores (${faltantes.slice(0,3).map(i=>i.id).join(', ')}${faltantes.length>3?'…':''}).`+(pista.faltantes||'')});
    if(enBlanco)avisos.push({seccion:'indicadores',mensaje:`${enBlanco} ${enBlanco===1?'indicador sin calificación cuenta':'indicadores sin calificación cuentan'} como 0 en los promedios.`});
    const dims=new Map(),registrosDimensiones=[];
    for(const fila of entrada.dimensiones||[]){
      const codigo=texto(fila.dimension);
      if(dims.has(codigo)){errores.push({seccion:'dimensiones',fila:fila.fila,campo:'dimension',mensaje:`Dimensión repetida${dims.get(codigo)?': ya está en la fila '+dims.get(codigo):''}. Deja una sola fila.`});continue;}
      dims.set(codigo,fila.fila);
      const e={id:idEvaluacion+'--'+codigo,evaluacion:idEvaluacion,dimension:codigo,hallazgos:texto(fila.hallazgos),brechas:texto(fila.brechas)};
      const r=validar(e,sch('ddhh-dimensiones',e),referencias);
      if(!r.ok){r.errores.forEach(x=>errores.push({seccion:'dimensiones',fila:fila.fila,campo:x.campo,mensaje:x.mensaje}));continue;}
      registrosDimensiones.push(r.registro);
    }
    const {componentes,puntajes}=calcular(cat,registrosIndicadores);
    const entradaEvaluacion={id:idEvaluacion,nombre:texto(ev.nombre),fecha,origen:'cargada',...puntajes};
    const validada=validar(entradaEvaluacion,sch('ddhh-evaluaciones',entradaEvaluacion),referencias);
    validada.errores.filter(x=>['nombre','fecha','id'].includes(x.campo)).forEach(x=>errores.push({seccion:'evaluacion',fila:ev.fila,campo:x.campo,mensaje:x.mensaje}));
    if(errores.length)return vacio;
    if(!validada.ok)throw Error('Los puntajes calculados no pasaron la validación: '+validada.errores.map(x=>x.mensaje).join('; '));
    const registrosComponentes=Object.entries(componentes).map(([componente,calificacion])=>{
      const e={id:idEvaluacion+'--'+componente,evaluacion:idEvaluacion,componente,calificacion};
      const r=validar(e,sch('ddhh-componentes',e),referencias);
      if(!r.ok)throw Error('Un criterio calculado no pasó la validación: '+componente);
      return r.registro;
    });
    const registros={'ddhh-evaluaciones':[validada.registro],'ddhh-indicadores':registrosIndicadores,'ddhh-componentes':registrosComponentes,'ddhh-dimensiones':registrosDimensiones};
    const conteos={nuevos:0,actualizados:0};
    for(const c of cols){const ex=new Set((existentes?.[c]||[]).map(r=>r.id));registros[c].forEach(r=>{if(ex.has(r.id))conteos.actualizados++;else conteos.nuevos++;});}
    if(conteos.actualizados)avisos.push({seccion:'evaluacion',mensaje:`Ya existe una evaluación de ${fecha.slice(0,7)} (${idEvaluacion}); se reemplazan sus datos.`});
    return {registros,...conteos,errores,avisos};
  }
  function materialidad(cat,listas) {
    return {grupos:cat.grupos,evaluadores_financieros:cat.evaluadores_financieros,temas:(listas['materialidad-temas']||[]).map(t=>({...t,
      evaluacion_impacto:Object.fromEntries((listas['materialidad-impacto']||[]).filter(r=>r.tema===t.id).map(r=>[r.grupo,r])),
      evaluacion_financiera:Object.fromEntries((listas['materialidad-financiera']||[]).filter(r=>r.tema===t.id).map(r=>[r.evaluador,r]))}))};
  }
  return {colecciones,escala,reglaEscala,esquema,validar,posicion,mostrar,empresa,reemplazar,ddhh,materialidad,calcular,prepararDdhh};
}));
