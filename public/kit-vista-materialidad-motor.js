/* Resultados publicados: no reconstruye puntuaciones ni cuadrantes ausentes. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./kit-vista-ddhh-modelo.js'));
  else root.KitMaterialidad=factory(root.KitEstudios);
}(typeof globalThis!=='undefined'?globalThis:this,function(K){
  'use strict';
  const colecciones=['materialidad-resumen','materialidad-temas','materialidad-impacto-top','materialidad-financiera-top','materialidad-convergencia'];
  function validar(r,s,refs={}){
    const v=K.validar(r,s,refs);
    if(s.registroUnico&&r.id!==s.registroUnico)v.errores.push({campo:'id',mensaje:'El resumen usa el código resumen.'});
    if(s.campos.dimensiones&&['grupos_interes','rentabilidad','gasto'].every(k=>['Sí','No'].includes(r[k]))&&Number(r.dimensiones)!==['grupos_interes','rentabilidad','gasto'].filter(k=>r[k]==='Sí').length)v.errores.push({campo:'dimensiones',mensaje:'Las dimensiones deben coincidir con las marcas Sí.'});
    v.ok=!v.errores.length;return v;
  }
  const ordenar=(rs,campo,desc=false)=>[...rs].sort((a,b)=>(desc?-1:1)*(a[campo]-b[campo])||a.id.localeCompare(b.id));
  function frase(temas){const n=t=>temas.filter(r=>r.tipo===t).length;return `${temas.length} temas materiales: ${n('Doble')} de doble materialidad, ${n('Impacto')} de impacto y ${n('Financiera')} financieros`;}
  return {colecciones,validar,ordenar,frase};
}));
