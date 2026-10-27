/* Lecturas de resultados publicados, consultadas únicamente por vista activa. */
(function(){
  'use strict';
  const el=App.el,U=KitEstudiosUI,M=KitMaterialidad;
  const numero=v=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(v);
  const colecciones={doble:['materialidad-temas','materialidad-convergencia'],impacto:['materialidad-impacto-top'],financiera:['materialidad-financiera-top']};
  function tabla(titulo,columnas,filas){
    const t=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');t.append(el('caption',titulo));
    columnas.forEach(x=>{const h=el('th',x);h.scope='col';tr.append(h);});head.append(tr);
    filas.forEach(f=>{const r=el('tr');f.forEach((v,i)=>{const n=el(i?'td':'th',v);if(!i)n.scope='row';r.append(n);});body.append(r);});
    t.append(head,body);const cont=el('div',null,'mat-tabla-scroll');cont.append(t);return cont;
  }
  function barra(r,valor,max,umbral){
    const b=el('article',null,'mat-barra'),pista=el('div',null,'mat-pista'),relleno=el('span',null,'mat-relleno');
    b.append(el('h3',r.aspecto),el('strong',numero(valor)+' / '+max,'mat-valor'));
    pista.setAttribute('role','img');pista.setAttribute('aria-label',`${r.aspecto}: ${numero(valor)} de ${max}${umbral===undefined?'':'; umbral '+numero(umbral)}`);
    relleno.style.width=Math.max(0,Math.min(100,valor/max*100))+'%';pista.append(relleno);
    if(umbral!==undefined){const marca=el('span',null,'mat-marca');marca.style.left=umbral/max*100+'%';pista.append(marca);}
    b.append(pista,el('p',(max===25?'Impacto promedio: '+numero(r.impacto_promedio)+' · ':'')+'Probabilidad: '+numero(r.probabilidad),'mat-detalle'));return b;
  }
  function ficha(t,boton,vigente){
    const fondo=el('div',null,'fondo-dialogo centrado'),d=el('section',null,'panel materialidad mat-ficha'),cerrar=U.boton('Cerrar ×',()=>limpiar());
    d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','mat-titulo');
    const h=el('h2',t.nombre);h.id='mat-titulo';
    d.append(cerrar,h,el('p',t.tipo+' · '+t.dimension),el('h3','Descripción'),el('p',t.descripcion||'El informe no incluye la ficha de este tema'),el('h3','Indicadores'),el('p',t.indicadores||'El informe no incluye indicadores para este tema'),el('h3','Estándar GRI'),el('p',t.estandar_gri));
    const regiones=[...document.querySelectorAll('body > header, body > main, body > footer, body > .saltar')],inertes=regiones.map(n=>n.inert);regiones.forEach(n=>{n.inert=true;});
    fondo.append(d);document.body.append(fondo);document.body.classList.add('dialogo-abierto');cerrar.focus();let limpio=false;
    function limpiar(){if(limpio)return;limpio=true;document.removeEventListener('keydown',teclado);regiones.forEach((n,i)=>{n.inert=inertes[i];});fondo.remove();document.body.classList.remove('dialogo-abierto');if(vigente())boton.focus();}
    function teclado(e){if(e.key==='Escape'){e.preventDefault();limpiar();}if(e.key==='Tab'){e.preventDefault();cerrar.focus();}}
    fondo.onclick=e=>{if(e.target===fondo)limpiar();};document.addEventListener('keydown',teclado);return limpiar;
  }
  async function montar(c,_,p,sub){
    let activo=true,limpieza;const vigente=()=>activo&&p.vigente();
    try{
      const [listas,nombre]=await Promise.all([U.cargar(p,['materialidad-resumen',...colecciones[sub]]),U.nombre(p)]);
      if(!vigente())return;
      const datos=KitEstudios.reemplazar(listas,nombre),resumen=datos['materialidad-resumen'].find(r=>r.id==='resumen');
      const raiz=el('div',null,'materialidad');c.append(raiz);
      const principal=datos[colecciones[sub][0]];
      if(!resumen||!principal.length)U.vacio(raiz,p,'materialidad');
      else if(sub==='doble'){
        const cab=el('div',null,'seccion-cabeza mat-cabeza');cab.append(el('h2',M.frase(principal)),el('p','Resultados publicados del estudio; no se dispone de las calificaciones de todos los temas para dibujar cuadrantes.'));raiz.append(cab);
        const grupos=el('div',null,'mat-grupos');
        ['Doble','Impacto','Financiera'].forEach(tipo=>{
          const bloque=el('section',null,'tarjeta mat-bloque');bloque.dataset.tipo=tipo;bloque.append(el('h3',tipo));
          M.ordenar(principal.filter(t=>t.tipo===tipo),'orden').forEach(t=>{const item=el('article',null,'mat-tema'),b=U.boton(t.nombre,()=>{if(vigente()){limpieza?.();limpieza=ficha(t,b,vigente);}});b.id='mat-tema-'+t.id;item.append(b,el('p',t.dimension+' · '+t.estandar_gri));bloque.append(item);});grupos.append(bloque);
        });raiz.append(grupos);
        const convergencia=M.ordenar(datos['materialidad-convergencia'],'dimensiones',true);
        raiz.append(el('h2','Convergencia'));
        if(convergencia.length)raiz.append(tabla('Coincidencia entre las tres dimensiones',['Aspecto','Grupos de interés','Rentabilidad','Gasto operativo','Dimensiones'],convergencia.map(r=>[r.aspecto,...['grupos_interes','rentabilidad','gasto'].map(k=>r[k]==='Sí'?'✓ Sí':'— No'),numero(r.dimensiones)])));
        else raiz.append(el('p','El informe no incluye datos de convergencia.'));
        raiz.append(el('p',`Principio de doble entrada: un tema puede ser material por impacto, por su efecto financiero o por ambos; umbral de impacto ${numero(resumen.umbral_impacto)} y financiero ${numero(resumen.umbral_financiero)} (escala ${resumen.escala}).`,'nota'));
      }else if(sub==='impacto'){
        const filas=M.ordenar(principal,'puesto').slice(0,10);raiz.append(el('h2','Los aspectos de mayor importancia de impacto'),el('p','Umbral de impacto: '+numero(resumen.umbral_impacto)+'. La línea en cada barra marca este umbral.'));
        const bloque=el('section',null,'tarjeta mat-bloque');filas.forEach(r=>bloque.append(barra(r,r.importancia,5,resumen.umbral_impacto)));raiz.append(bloque,tabla('Top de impacto',['Aspecto','Puesto','Importancia','Probabilidad'],filas.map(r=>[r.aspecto,numero(r.puesto),numero(r.importancia),numero(r.probabilidad)])));
      }else{
        raiz.append(el('h2','Los aspectos de mayor efecto financiero'),el('p','Índice = impacto promedio × probabilidad. Las barras muestran el índice sobre un máximo de 25.'));
        for(const [variable,titulo] of [['rentabilidad','Rentabilidad'],['gasto','Gasto operativo']]){
          const bloque=el('section',null,'tarjeta mat-bloque');bloque.append(el('h3',titulo));const filas=M.ordenar(principal.filter(r=>r.variable===variable),'indice',true).slice(0,5);
          filas.forEach(r=>bloque.append(barra(r,r.indice,25)));if(!filas.length)bloque.append(el('p','No hay resultados publicados para esta variable.'));raiz.append(bloque);
        }
      }
      raiz.append(el('p','Fuente: '+(resumen?.fuente||'No disponible'),'nota mat-fuente'));
    }catch(e){if(vigente())U.error(c,e);}
    return()=>{activo=false;limpieza?.();};
  }
  ['doble','impacto','financiera'].forEach(sub=>App.registrarVista('materialidad/'+sub,{render:(c,d,p)=>montar(c,d,p,sub)}));
}());
