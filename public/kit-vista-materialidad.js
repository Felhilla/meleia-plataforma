/* Tablero de materialidad: una consulta inicial, tres lecturas en memoria. */
(function(){
  'use strict';
  const el=App.el,U=KitEstudiosUI,M=KitMaterialidad;
  const numero=(v,d=2)=>new Intl.NumberFormat('es-CO',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
  const titulos={doble:'Doble materialidad',impacto:'Materialidad de impacto',financiera:'Materialidad financiera'};
  const cuadrantes={Doble:'Doble materialidad',Impacto:'Material por impacto',Financiera:'Material financiero','No material':'No material'};
  const variables={
    doble:[['financiera','Materialidad financiera'],['importancia','Materialidad de impacto']],
    impacto:[['probabilidad','Probabilidad'],['importancia','Importancia']],
    financiera:[['rentabilidad','Impacto en la rentabilidad'],['gasto','Impacto en el gasto operativo']]
  };
  function svg(tag,attrs={},texto){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(texto!==undefined)n.textContent=texto;return n;}
  function tabla(titulo,columnas,filas){
    const t=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');t.append(el('caption',titulo));
    columnas.forEach(x=>{const h=el('th',x);h.scope='col';tr.append(h);});head.append(tr);
    filas.forEach(f=>{const r=el('tr');f.forEach((v,i)=>{const n=el(i?'td':'th');if(!i)n.scope='row';if(typeof v==='object')n.append(v);else n.textContent=v;r.append(n);});body.append(r);});
    t.append(head,body);const cont=el('div',null,'mat-tabla');cont.append(t);return cont;
  }
  function calificacion(valor){
    const nivel=M.nivel(valor),n=el('span',null,'mat-calificacion'),circulo=el('span',numero(valor,1),'mat-circulo mat-nivel-'+nivel.numero);
    n.append(circulo,el('span',nivel.etiqueta));return n;
  }
  function ficha(a,tema,tipo,boton,vigente){
    const fondo=el('div',null,'fondo-dialogo centrado'),d=el('section',null,'panel materialidad mat-ficha'),cerrar=U.boton('Cerrar ×',()=>limpiar());
    d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','mat-ficha-titulo');
    const h=el('h2',a.nombre);h.id='mat-ficha-titulo';
    const cab=el('header',null,'mat-ficha-cab');const dimension=el('div',null,'mat-dimension');dimension.append(el('span','Dimensión ESG'),el('strong',a.dimension));cab.append(h,dimension);
    const validado=a.validado==='Sí',descripcion=validado&&tema?.descripcion?.trim()?tema.descripcion:a.definicion;
    d.append(cerrar,cab,el('h3','Descripción'),el('p',descripcion));
    const medio=el('div',null,'mat-ficha-medio'),notas=el('div'),referencias=el('div');
    const campos=tipo==='doble'?[variables.doble[1],variables.doble[0]]:tipo==='impacto'?[variables.impacto[1],variables.impacto[0]]:variables.financiera;
    campos.forEach(([k,l])=>{const r=el('div',null,'mat-nota');r.append(el('h3',l),calificacion(a[k]));notas.append(r);});
    const ul=el('ul'),indicadores=validado&&tema?.indicadores?.trim()?tema.indicadores.split(';'):a.marco.split(' / ');
    indicadores.map(x=>x.trim()).filter(Boolean).forEach(x=>ul.append(el('li',x)));
    const estado=el('div',null,'mat-estado');estado.append(el('strong',cuadrantes[a.cuadrante]));if(validado)estado.append(el('p','Validado por el comité como tema material'));
    referencias.append(el('h3','Estándares relacionados'),ul,estado);medio.append(notas,referencias);d.append(medio);
    if(tipo!=='financiera')d.append(tabla('Calificación de los grupos de interés',['Grupo','Importancia','Probabilidad'],[['col','Colaboradores'],['cli','Clientes'],['pro','Proveedores']].map(([k,l])=>[l,calificacion(a[k+'_importancia']),calificacion(a[k+'_probabilidad'])])));
    if(tipo!=='impacto')d.append(tabla('Calificación del taller financiero',['Variable','Calificación'],variables.financiera.map(([k,l])=>[l,calificacion(a[k])])));
    d.append(el('p','Escala de 0 (nulo) a 5 (muy alto).','mat-micro'));
    const regiones=[...document.querySelectorAll('body > header, body > main, body > footer, body > .saltar')],inertes=regiones.map(n=>n.inert);regiones.forEach(n=>{n.inert=true;});
    fondo.append(d);document.body.append(fondo);document.body.classList.add('dialogo-abierto');cerrar.focus();let limpio=false;
    function limpiar(){if(limpio)return;limpio=true;document.removeEventListener('keydown',teclado);regiones.forEach((n,i)=>{n.inert=inertes[i];});fondo.remove();document.body.classList.remove('dialogo-abierto');if(vigente())boton.focus();}
    function teclado(e){if(e.key==='Escape'){e.preventDefault();limpiar();}if(e.key==='Tab'){e.preventDefault();cerrar.focus();}}
    fondo.onclick=e=>{if(e.target===fondo)limpiar();};document.addEventListener('keydown',teclado);return limpiar;
  }
  function forma(dimension,x,y,numerado){
    const attrs={class:numerado?'mat-forma':'mat-hueco'};
    if(!numerado)return svg('circle',{...attrs,cx:x,cy:y,r:5});
    if(dimension==='Ambiental')return svg('polygon',{...attrs,points:`${x},${y-19} ${x-18},${y+14} ${x+18},${y+14}`});
    if(dimension==='Gobernanza')return svg('rect',{...attrs,x:x-14,y:y-14,width:28,height:28});
    return svg('circle',{...attrs,cx:x,cy:y,r:15});
  }
  function grafico(aspectos,lista,tipo,resumen,abrir,ancho=650){
    const [vx,vy]=variables[tipo],s=svg('svg',{viewBox:`0 0 ${ancho} ${Math.min(640,ancho+40)}`,role:'group','aria-label':titulos[tipo],class:'mat-mapa'});
    const alto=Math.min(640,ancho+40),izquierda=ancho<500?44:90,arriba=50;
    const w=ancho-izquierda-(ancho<500?20:60),h=alto-140;
    const X=x=>izquierda+x*w/5,Y=y=>arriba+h-y*h/5;
    const rect=(x,y,rw,rh,clase)=>svg('rect',{x:X(x),y:Y(y+rh),width:rw*w/5,height:rh*h/5,class:clase});
    const linea=(a,b,clase)=>svg('line',{x1:X(a[0]),y1:Y(a[1]),x2:X(b[0]),y2:Y(b[1]),class:clase});
    const rotulo=(x,y,t,ancla='start')=>svg('text',{x:X(x),y:Y(y),'text-anchor':ancla,class:'mat-cuadrante'},t);
    const u=resumen.umbral_financiero,v=resumen.umbral_impacto;
    s.append(rect(0,0,5,5,'mat-zona-base'));
    if(tipo==='doble'){
      s.append(rect(0,v,u,5-v,'mat-zona-impacto'),rect(u,0,5-u,v,'mat-zona-financiera'),rect(u,v,5-u,5-v,'mat-zona-doble'));
      s.append(linea([u,0],[u,5],'mat-umbral'),linea([0,v],[5,v],'mat-umbral'));
      s.append(rotulo(.08,4.8,'Material por impacto'),rotulo(4.92,4.8,'Doble materialidad','end'),rotulo(.08,.14,'No material'),rotulo(4.92,.14,'Material financiero','end'));
    }else if(tipo==='impacto'){
      s.append(rect(0,v,5,5-v,'mat-zona-doble'),linea([0,v],[5,v],'mat-umbral'),rotulo(.08,4.8,'Material por impacto'));
    }else{
      const [a,b]=M.diagonal(u),poligono=2*u<=5?[a,[0,5],[5,5],[5,0],b]:[a,[5,5],b];
      s.append(svg('polygon',{points:poligono.map(([x,y])=>X(x)+','+Y(y)).join(' '),class:'mat-zona-financiera'}));
      s.append(linea(a,b,'mat-umbral'),rotulo(4.92,4.8,'Material financiero','end'));
    }
    for(let i=0;i<=5;i++){
      s.append(linea([i,0],[i,5],'mat-rejilla'),linea([0,i],[5,i],'mat-rejilla'));
      s.append(svg('text',{x:X(i),y:alto-65,'text-anchor':'middle',class:'mat-eje'},String(i)),svg('text',{x:izquierda-12,y:Y(i)+5,'text-anchor':'end',class:'mat-eje'},String(i)));
    }
    s.append(svg('text',{x:izquierda+w/2,y:alto-25,'text-anchor':'middle',class:'mat-eje'},vx[1]),svg('text',{x:14,y:arriba+h/2,transform:`rotate(-90 14 ${arriba+h/2})`,'text-anchor':'middle',class:'mat-eje'},vy[1]));
    const region=([px,py])=>{
      const x=px*5/w,y=5-py*5/h;
      return tipo==='doble'?`${x>=u}:${y>=v}`:tipo==='impacto'?String(y>=v):String(x+y>=2*u);
    };
    const posiciones=M.posiciones(lista.map(a=>[a[vx[0]]*w/5,(5-a[vy[0]])*h/5]),{ancho:w,alto:h,region});
    const indices=new Map(lista.map((a,i)=>[a.id,i]));
    // Los numerados se dibujan al final para conservar su legibilidad.
    const orden=[...aspectos.filter(a=>!indices.has(a.id)),...lista];
    // El ancla exacta va debajo de las etiquetas numeradas: encima tapaba los números.
    let anclas=false;
    orden.forEach(a=>{
      if(indices.has(a.id)&&!anclas){anclas=true;lista.forEach(b=>s.append(svg('circle',{cx:X(b[vx[0]]),cy:Y(b[vy[0]]),r:3,class:'mat-real','data-aspecto':b.id,'pointer-events':'none'})));}
      const i=indices.get(a.id),numerado=i!==undefined,real=[X(a[vx[0]]),Y(a[vy[0]])],pos=numerado?[izquierda+posiciones[i][0],arriba+posiciones[i][1]]:real;
      if(Math.hypot(pos[0]-real[0],pos[1]-real[1])>.1)s.append(svg('line',{x1:real[0],y1:real[1],x2:pos[0],y2:pos[1],class:'mat-guia'}));
      const g=svg('g',{tabindex:0,role:'button','aria-label':a.nombre+'; '+vx[1]+': '+numero(a[vx[0]])+'; '+vy[1]+': '+numero(a[vy[0]]),class:'mat-punto','data-aspecto':a.id,'data-numero':numerado?i+1:''});
      g.append(svg('circle',{cx:pos[0],cy:pos[1],r:20,class:'mat-toque'}),forma(a.dimension,...pos,numerado));
      if(numerado)g.append(svg('text',{x:pos[0],y:pos[1]+5,'text-anchor':'middle',class:'mat-numero'},String(i+1)));
      g.onclick=()=>abrir(a,g);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();abrir(a,g);}};
      s.append(g);
    });

    return s;
  }
  async function montar(c,_,p){
    let activo=true,limpieza,observador;const vigente=()=>activo&&p.vigente();
    try{
      const [listas,nombre]=await Promise.all([U.cargar(p,M.colecciones),U.nombre(p)]);
      if(!vigente())return;
      const datos=KitEstudios.reemplazar(listas,nombre),resumen=datos['materialidad-resumen'].find(r=>r.id==='resumen'),aspectos=datos['materialidad-aspectos'],temas=datos['materialidad-temas'];
      const raiz=el('div',null,'materialidad');c.append(raiz);
      if(!resumen||!aspectos.length){U.vacio(raiz,p,'materialidad');return()=>{activo=false;};}
      const banda=el('div',null,'mat-cifras');
      M.cifras(aspectos).forEach(x=>{const n=el('div');n.append(el('strong',String(x.valor)),el('span',x.etiqueta));banda.append(n);});raiz.append(banda);
      const tarjeta=el('article',null,'tarjeta mat-tablero'),lateral=el('aside',null,'mat-lateral'),derecha=el('div',null,'mat-resultado'),label=el('label','Materialidad'),selector=el('select');
      label.htmlFor='mat-tipo';selector.id='mat-tipo';
      Object.entries(titulos).forEach(([k,t])=>{const o=el('option',t);o.value=k;selector.append(o);});selector.value='doble';
      const listado=el('section'),grupos=el('section');grupos.append(el('h3','Grupos de interés consultados','antetitulo'));
      const ul=el('ul');[['colaboradores','Colaboradores'],['clientes','Clientes'],['proveedores','Proveedores'],['taller','Directivos (taller financiero)']].forEach(([k,l])=>ul.append(el('li',l+(resumen['participantes_'+k]==null?'':' · '+resumen['participantes_'+k]))));grupos.append(ul);
      lateral.append(label,selector,listado,grupos);tarjeta.append(lateral,derecha);raiz.append(tarjeta);
      let anchoMapa=650;
      function dibujar(){
        limpieza?.();const tipo=selector.value,lista=M.top(aspectos,tipo);
        const abrir=(a,b)=>{if(vigente()){limpieza?.();limpieza=ficha(a,temas.find(t=>t.id===a.tema_id),tipo,b,vigente);}};
        listado.replaceChildren(el('h3',tipo==='doble'?'Temas materiales':tipo==='impacto'?'Top 10 por importancia':'Top 10 financiero','antetitulo'));
        const ol=el('ol');lista.forEach((a,i)=>{const li=el('li'),b=U.boton(a.nombre,()=>abrir(a,b));b.id='mat-aspecto-'+a.id;b.dataset.numero=String(i+1);b.dataset.aspecto=a.id;li.append(b);if(tipo!=='doble'&&a.validado==='Sí')li.append(el('span','✓ validado','mat-validado'));ol.append(li);});listado.append(ol);
        const h=el('h2',titulos[tipo]);h.tabIndex=-1;
        const umbrales=tipo==='doble'?'Umbral de impacto '+numero(resumen.umbral_impacto)+' · financiero '+numero(resumen.umbral_financiero):tipo==='impacto'?'Umbral de impacto '+numero(resumen.umbral_impacto):'Umbral financiero '+numero(resumen.umbral_financiero);
        derecha.replaceChildren(h,el('p',umbrales,'mat-umbrales'),grafico(aspectos,lista,tipo,resumen,abrir,anchoMapa));
        const leyenda=el('div',null,'mat-leyenda');
        ['Ambiental','Social','Gobernanza'].forEach(dim=>{const item=el('span'),s=svg('svg',{viewBox:'0 0 44 44','aria-hidden':'true'});s.append(forma(dim,22,22,true));item.append(s,el('span',dim));leyenda.append(item);});
        derecha.append(leyenda,el('p','Toque un tema para ver su detalle.','mat-umbrales'));
        const detalles=el('details');detalles.append(el('summary','Ver puntajes de los '+aspectos.length+' aspectos'));
        detalles.append(tabla('Puntajes exactos',['Aspecto','Dimensión','Importancia','Probabilidad','Rentabilidad','Gasto operativo','Financiera','Cuadrante','Validado'],M.ordenados(aspectos,tipo).map(a=>[a.nombre,a.dimension,...['importancia','probabilidad','rentabilidad','gasto','financiera'].map(k=>numero(a[k])),a.cuadrante,a.validado])));
        derecha.append(detalles);
      }
      selector.onchange=dibujar;dibujar();
      if(typeof ResizeObserver!=='undefined'){
        observador=new ResizeObserver(entradas=>{
          const ancho=Math.round(entradas[0].contentRect.width);
          if(!vigente()||ancho<=0||ancho===anchoMapa)return;
          anchoMapa=ancho;
          const tipo=selector.value,lista=M.top(aspectos,tipo);
          const abrir=(a,b)=>{if(vigente()){limpieza?.();limpieza=ficha(a,temas.find(t=>t.id===a.tema_id),tipo,b,vigente);}};
          derecha.querySelector('.mat-mapa').replaceWith(grafico(aspectos,lista,tipo,resumen,abrir,anchoMapa));
        });
        observador.observe(derecha);
      }
      if(p.puedeEditar){const a=el('a','Alimentación','boton secundario');a.href=U.ruta('materialidad',p,'alimentacion');raiz.append(a);}
      raiz.append(el('p','Fuente: '+resumen.fuente,'nota mat-fuente'));
      const metodo=el('details');metodo.append(el('summary','Cómo se calculó'));String(resumen.notas||'').split('\n').filter(Boolean).forEach(l=>metodo.append(el('p',l,'mat-umbrales')));raiz.append(metodo);
    }catch(e){if(vigente())U.error(c,e);}
    return()=>{activo=false;observador?.disconnect();limpieza?.();};
  }
  App.registrarVista('materialidad/resultados',{render:montar});
}());
