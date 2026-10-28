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
  function ordenados(aspectos,tipo){
    const grupos=['Doble','Impacto','Financiera','No material'];
    return [...aspectos].sort((a,b)=>(tipo==='doble' ? grupos.indexOf(a.cuadrante)-grupos.indexOf(b.cuadrante)||(b.importancia+b.financiera)-(a.importancia+a.financiera) : b[tipo==='impacto'?'importancia':'financiera']-a[tipo==='impacto'?'importancia':'financiera'])||a.orden-b.orden||a.id.localeCompare(b.id));
  }
  const top=(rs,tipo)=>tipo==='doble'?ordenados(rs.filter(r=>r.validado==='Sí'),tipo):ordenados(rs,tipo).slice(0,10);
  function cifras(rs){
    const v=rs.filter(r=>r.validado==='Sí'),n=q=>v.filter(r=>r.cuadrante===q).length;
    return [{valor:v.length,etiqueta:v.length===1?'Tema material':'Temas materiales'},{valor:n('Doble'),etiqueta:'de doble materialidad'},{valor:n('Impacto'),etiqueta:'de impacto'},{valor:n('Financiera'),etiqueta:n('Financiera')===1?'financiero':'financieros'}];
  }
  function nivel(valor){
    const numero=Math.max(0,Math.min(5,Math.round(valor)));
    return {numero,etiqueta:['Nulo','Muy bajo','Bajo','Medio','Alto','Muy alto'][numero],color:['gris','verde','amarillo','ambar','naranja','rojo'][numero]};
  }
  // Intersecciones de x+y=2u con el cuadrado [0,5]².
  function diagonal(u){const s=2*u;return [[Math.max(0,s-5),Math.min(5,s)],[Math.min(5,s),Math.max(0,s-5)]];}
  function posiciones(puntos,{ancho=500,alto=500,region=()=>'',separacion=40,margen=19}={}){
    const usados=[];
    return puntos.map(([x,y])=>{
      const original=[x,y],zona=region(original);
      const libre=p=>!usados.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<separacion);
      let p=original;
      if(!libre(p)){
        for(let i=0;i<4000;i++){
          const radio=3*Math.sqrt(i+1),angulo=i*2.399963;
          const candidato=[x+radio*Math.cos(angulo),y+radio*Math.sin(angulo)];
          if(candidato[0]<margen||candidato[0]>ancho-margen||candidato[1]<margen||candidato[1]>alto-margen)continue;
          if(region(candidato)===zona&&libre(candidato)){p=candidato;break;}
        }
      }
      usados.push(p);return p;
    });
  }
  return {colecciones,validar,ordenados,top,cifras,nivel,diagonal,posiciones};
}));
