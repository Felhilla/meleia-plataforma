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
  function cifras(rs){
    const v=rs.filter(r=>r.validado==='Sí'),n=q=>v.filter(r=>r.cuadrante===q).length;
    return [{valor:v.length,etiqueta:v.length===1?'Tema material':'Temas materiales'},{valor:n('Doble'),etiqueta:'de doble materialidad'},{valor:n('Impacto'),etiqueta:'de impacto'},{valor:n('Financiera'),etiqueta:n('Financiera')===1?'financiero':'financieros'}];
  }
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
  return {colecciones,validar,variables,umbrales,estado,ordenados,top,cifras,nivel,posiciones};
}));
