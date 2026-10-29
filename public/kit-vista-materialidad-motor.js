/* Cálculos de presentación puros. Los puntajes y cuadrantes provienen del estudio. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./kit-vista-ddhh-modelo.js'));
  else root.KitMaterialidad=factory(root.KitEstudios);
}(typeof globalThis!=='undefined'?globalThis:this,function(K){
  'use strict';
  const colecciones=['materialidad-resumen','materialidad-temas','materialidad-aspectos'];
  function validar(r,s,refs={}){
    const v=K.validar(r,s,refs);
    if(s.registroUnico&&r.id!==s.registroUnico)v.errores.push({campo:'id',mensaje:'El resumen usa el código resumen.'});
    if(s.campos.validado && ((r.validado==='Sí'&&!String(r.tema_id||'').trim())||(r.validado==='No'&&String(r.tema_id||'').trim())))
      v.errores.push({campo:'tema_id',mensaje:'Un aspecto validado exige tema_id; uno no validado debe dejarlo vacío.'});
    v.ok=!v.errores.length;return v;
  }
  const variables={
    doble:[['financiera','Materialidad financiera','umbral_financiero'],['importancia','Materialidad de impacto','umbral_impacto']],
    impacto:[['probabilidad','Probabilidad','umbral_probabilidad'],['importancia','Importancia','umbral_impacto']],
    financiera:[['probabilidad','Probabilidad','umbral_probabilidad'],['financiera','Materialidad financiera','umbral_financiero']]
  };
  function umbrales(resumen,aspectos,tipo){
    const probabilidad=resumen.umbral_probabilidad??(aspectos.length?aspectos.reduce((s,a)=>s+a.probabilidad,0)/aspectos.length:0);
    return variables[tipo].map(([, ,campo])=>campo==='umbral_probabilidad'?probabilidad:resumen[campo]);
  }
  function estado(a,tipo,[u,v]){
    if(tipo==='doble')return {Doble:'Doble materialidad',Impacto:'Material por impacto',Financiera:'Material financiero','No material':'No material'}[a.cuadrante];
    const altaX=a.probabilidad>u,altaY=a[variables[tipo][1][0]]>v;
    const nombre=tipo==='impacto'?'importancia':'materialidad financiera';
    return `${altaY?'Alta':'Baja'} ${nombre}${altaX===altaY?' y ':', '}${altaX?'alta':'baja'} probabilidad`;
  }
  function ordenados(aspectos,tipo){
    const [[x],[y]]=variables[tipo],promedio=a=>(a[x]+a[y])/2;
    return [...aspectos].sort((a,b)=>promedio(b)-promedio(a)||a.orden-b.orden||a.id.localeCompare(b.id));
  }
  const top=(rs,tipo)=>ordenados(rs,tipo).slice(0,10);
  function nivel(valor){
    const numero=Math.max(0,Math.min(5,Math.round(valor)));
    return {numero,etiqueta:['Nulo','Muy bajo','Bajo','Medio','Alto','Muy alto'][numero],color:['gris','verde','amarillo','ambar','naranja','rojo'][numero]};
  }
  // Solo los empates exactos se corren en horizontal, 0,06 por marcador, alternando lados (+, −, +2, −2…).
  function posiciones(puntos){
    const usados=new Map();
    return puntos.map(([x,y])=>{
      const clave=JSON.stringify([x,y]),n=usados.get(clave)||0;
      usados.set(clave,n+1);
      const paso=Math.ceil(n/2)*.06*(n%2?1:-1);
      return [Math.min(5,Math.max(0,x+paso)),y];
    });
  }
  // Doble materialidad desde las respuestas crudas (decisiones del 28 y 29-oct-2026). Nadie escribe promedios a mano.
  // - Blanco = 0: una casilla vacía, o una persona que no calificó un aspecto, cuenta como 0.
  // - Importancia de una respuesta: la que viene escrita o, si no, el promedio de escala y alcance (impacto
  //   positivo) o de escala, alcance e irremediabilidad (impacto negativo).
  // - Si una persona calificó el mismo aspecto dos veces, cuenta la respuesta de mayor importancia.
  // - Los participantes y los evaluadores vienen en listas propias: quien no respondió nada cuenta con 0.
  // - Cada grupo promedia a sus participantes; importancia y probabilidad son el promedio simple de los grupos.
  // - Financiera = promedio de rentabilidad y gasto operativo, cada uno promedio de los evaluadores del taller.
  // - Umbral de cada eje = promedio de los aspectos; material si supera el umbral de impacto o el financiero.
  function calcular({aspectos,grupos,participantes:lista,evaluadores,consulta,taller}){
    const n=v=>typeof v==='number'&&Number.isFinite(v)?v:0, promedio=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
    const importancia=r=>typeof r.importancia==='number'?r.importancia:promedio([r.escala,r.alcance,...(r.signo==='Negativo'?[r.irremediabilidad]:[])].map(n));
    const participantes=Object.fromEntries(grupos.map(g=>[g,lista.filter(p=>p.grupo===g).map(p=>p.codigo)]));
    const respuesta=(persona,aspecto)=>consulta.filter(r=>r.participante===persona&&r.aspecto===aspecto).reduce((mejor,r)=>!mejor||importancia(r)>importancia(mejor)?r:mejor,null);
    const conGrupos=grupos.filter(g=>participantes[g].length);
    const resultado=aspectos.map(aspecto=>{
      const por_grupo=Object.fromEntries(conGrupos.map(g=>{
        const rs=participantes[g].map(p=>respuesta(p,aspecto));
        return [g,{importancia:promedio(rs.map(r=>r?importancia(r):0)),probabilidad:promedio(rs.map(r=>r?n(r.probabilidad):0))}];
      }));
      const fila=e=>taller.find(r=>r.evaluador===e&&r.aspecto===aspecto)||{};
      const rentabilidad=promedio(evaluadores.map(e=>n(fila(e).rentabilidad))),gasto=promedio(evaluadores.map(e=>n(fila(e).gasto)));
      return {aspecto,por_grupo,importancia:promedio(conGrupos.map(g=>por_grupo[g].importancia)),probabilidad:promedio(conGrupos.map(g=>por_grupo[g].probabilidad)),rentabilidad,gasto,financiera:(rentabilidad+gasto)/2};
    });
    const umbral={impacto:promedio(resultado.map(a=>a.importancia)),financiero:promedio(resultado.map(a=>a.financiera)),probabilidad:promedio(resultado.map(a=>a.probabilidad))};
    resultado.forEach(a=>{const i=a.importancia>umbral.impacto,f=a.financiera>umbral.financiero;a.cuadrante=i&&f?'Doble':i?'Impacto':f?'Financiera':'No material';});
    return {aspectos:resultado,umbral,participantes:Object.fromEntries(grupos.map(g=>[g,participantes[g].length])),evaluadores:evaluadores.length};
  }
  return {colecciones,validar,variables,umbrales,estado,ordenados,top,nivel,posiciones,calcular};
}));
