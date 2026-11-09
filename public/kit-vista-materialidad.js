/* Tablero de materialidad: una consulta inicial, tres lecturas en memoria. */
(function(){
  'use strict';
  const el=App.el,U=KitEstudiosUI,M=KitMaterialidad;
  const numero=(v,d=2)=>new Intl.NumberFormat('es-CO',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
  const titulos={doble:'Doble materialidad',impacto:'Materialidad de impacto',financiera:'Materialidad financiera'};
  const variables=M.variables;
  const taller=[['rentabilidad','Impacto en la rentabilidad'],['gasto','Impacto en el gasto operativo']];
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
  function ficha(a,tema,tipo,boton,vigente,umbrales){
    const fondo=el('div',null,'fondo-dialogo centrado'),d=el('section',null,'panel materialidad mat-ficha dim-ficha'),cerrar=U.boton('×',()=>limpiar());
    cerrar.className='kit-cerrar';cerrar.type='button';cerrar.setAttribute('aria-label','Cerrar');
    d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','mat-ficha-titulo');
    const h=el('h2',a.nombre);h.id='mat-ficha-titulo';
    const cab=el('header',null,'dim-ficha-cabeza'),titulo=el('div',null,'dim-ficha-titulo');
    const validado=a.validado==='Sí',descripcion=validado&&tema?.descripcion?.trim()?tema.descripcion:a.definicion;
    titulo.append(el('p',a.dimension,'antetitulo'),h,el('p',descripcion,'nota'));
    const campos=tipo==='doble'?[variables.doble[1],variables.doble[0]]:tipo==='impacto'?[variables.impacto[1],variables.impacto[0]]:[variables.financiera[1],variables.financiera[0]];
    const notas=el('div',null,'dim-ficha-calif sem-fondo-'+M.nivel(a[campos[0][0]]).color);
    campos.forEach(([k,l])=>{const n=el('div',null,'mat-nota');n.append(el('span',l,'dim-ficha-rotulo'),el('strong',numero(a[k],1)),el('span',M.nivel(a[k]).etiqueta,'dim-ficha-nivel'));notas.append(n);});
    cab.append(titulo,notas);
    const estado=el('section',null,'dim-ficha-hallazgos mat-ficha-estado');estado.append(el('h3','Estado'),el('p',M.estado(a,tipo,umbrales),'mat-estado'));
    const ul=el('ul'),indicadores=validado&&tema?.indicadores?.trim()?tema.indicadores.split(';'):a.marco.split(' / ');
    indicadores.map(x=>x.trim()).filter(Boolean).forEach(x=>ul.append(el('li',x)));
    const estandares=el('section',null,'dim-ficha-estandares-fila');estandares.append(el('h3','Estándares relacionados'),ul);
    const cuerpo=el('section',null,'dim-ficha-cuerpo');
    function cajaTabla(titulo,columnas,filas){cuerpo.append(el('h3',titulo),tabla(titulo,columnas,filas));}
    if(tipo!=='financiera')cajaTabla('Calificación de los grupos de interés',['Grupo','Importancia','Probabilidad'],(a.por_grupo?.length?a.por_grupo.map(g=>[g.nombre,calificacion(g.importancia),calificacion(g.probabilidad)]):[['col','Colaboradores'],['cli','Clientes'],['pro','Proveedores']].map(([k,l])=>[l,calificacion(a[k+'_importancia']),calificacion(a[k+'_probabilidad'])])));
    if(tipo!=='impacto')cajaTabla('Calificación del taller financiero',['Variable','Calificación'],taller.map(([k,l])=>[l,calificacion(a[k])]));
    cuerpo.append(el('p','Escala de 0 (nulo) a 5 (muy alto).','mat-micro'));
    d.append(cerrar,cab,estado,estandares,cuerpo);
    const regiones=[...document.querySelectorAll('body > header, body > main, body > footer, body > .saltar')],inertes=regiones.map(n=>n.inert);regiones.forEach(n=>{n.inert=true;});
    const sobreVentana=window.KitCuadrantes?.ventana.arriba?.();
    fondo.append(d);document.body.append(fondo);document.body.classList.add('dialogo-abierto');cerrar.focus();let limpio=false;
    function limpiar(){if(limpio)return;limpio=true;document.removeEventListener('keydown',teclado);if(!sobreVentana)regiones.forEach((n,i)=>{n.inert=inertes[i];});fondo.remove();if(!sobreVentana)document.body.classList.remove('dialogo-abierto');if(vigente()&&boton?.isConnected)boton.focus();}
    function teclado(e){if([...document.body.children].at(-1)!==fondo)return;if(e.key==='Escape'){e.preventDefault();limpiar();}if(e.key==='Tab'){e.preventDefault();cerrar.focus();}}
    fondo.onclick=e=>{if(e.target===fondo)limpiar();};document.addEventListener('keydown',teclado);return limpiar;
  }
  // E66 (Felipe, 9-nov): misma lógica de lectura que el Módulo I (E65). Grupo = dimensión ESG, elemento = aspecto,
  // punto de color = clasificación de doble materialidad. Se conservan los tres mapas, los umbrales y el top 10.
  const DIMS={Ambiental:{color:'#5E7A45',icono:'img/iconos/clima.svg'},Social:{color:'#B78D36',icono:'img/iconos/impacto-social.svg'},Gobernanza:{color:'#2F5D7C',icono:'img/iconos/reputacion.svg'}};
  const dimDe=a=>DIMS[a.dimension]||{color:'#5C6B7A',icono:'img/iconos/sostenibilidad.svg'};
  const CLASES=[['Doble','Doble materialidad','doble'],['Impacto','Material por impacto','impacto'],['Financiera','Material financiero','financiera'],['No material','No material','no-material']];
  const claseDe=a=>CLASES.find(c=>c[0]===a.cuadrante)||CLASES[3];
  function cuadrantesDe(tipo){
    const nombre=(ax,ay)=>tipo==='doble'?(ax&&ay?'Doble materialidad':ay?'Material por impacto':ax?'Material financiero':'No material'):M.estado({probabilidad:ax?1:0,importancia:ay?1:0,financiera:ay?1:0},tipo,[.5,.5]);
    return [[false,true],[true,true],[false,false],[true,false]].map(([ax,ay])=>({altaX:ax,altaY:ay,izq:!ax,arriba:ay,nombre:nombre(ax,ay),clase:'mat-zona-'+(ax&&ay?'doble':ay?'impacto':ax?'financiera':'base')}));
  }
  function filaResumen(cifra,rotulo,clase){const d=el('details',null,'ka-res-fila '+clase),s=el('summary');s.append(el('span','#','ka-res-icono'),el('strong',cifra),el('span',rotulo,'ka-res-rotulo'));d.append(s);return d;}
  async function montar(c,_,p){
    let activo=true,limpieza;const vigente=()=>activo&&p.vigente(),KC=window.KitCuadrantes;
    try{
      const [listas,nombre]=await Promise.all([U.cargar(p,M.colecciones),U.nombre(p)]);
      if(!vigente())return;
      const datos=KitEstudios.reemplazar(listas,nombre),resumen=datos['materialidad-resumen'].find(r=>r.id==='resumen'),aspectos=datos['materialidad-aspectos'],temas=datos['materialidad-temas'];
      const raiz=el('div',null,'materialidad');c.append(raiz);
      if(!resumen||!aspectos.length){U.vacio(raiz,p,'materialidad');return()=>{activo=false;};}
      const tablero=el('div',null,'ka-resultados mat-tablero-cuadrantes'),lateral=el('aside',null,'ka-lateral'),derecha=el('figure',null,'ka-matriz mat-resultado');
      const control=(etiqueta,id,opciones)=>{const l=el('label',etiqueta,'ka-vista'),s=el('select');l.htmlFor=id;s.id=id;opciones.forEach(([v,t])=>{const o=el('option',t);o.value=v;s.append(o);});l.append(s);lateral.append(l);return s;};
      const selector=control('Materialidad','mat-tipo',Object.entries(titulos));selector.value='doble';
      const dims=Object.keys(DIMS).filter(d=>aspectos.some(a=>a.dimension===d));
      const vista=control('Vista','mat-vista',[['','General'],...dims.map(d=>[d,d])]);
      const filtro=control('Filtro','mat-filtro',[['','Todas las clasificaciones'],...CLASES.filter(k=>aspectos.some(a=>a.cuadrante===k[0])).map(k=>[k[0],k[1]])]);
      const tarjeta=el('section',null,'ka-resumen-tarjeta'),met=el('a',null,'ka-met-tarjeta');met.href=U.ruta('materialidad',p,'metodologia');
      const ico=window.KitVistaMetodologia?.ICONOS?.balanza;if(ico){const s=KC.svg('svg',{viewBox:'0 0 24 24','aria-hidden':'true',class:'ka-met-icono'});s.append(KC.svg('path',{d:ico}));met.append(s);}
      met.append(el('strong','Metodología'),el('span','Doble materialidad: cómo se calificó cada aspecto y cómo se fijaron los umbrales.'));
      lateral.append(tarjeta,met);tablero.append(lateral,derecha);raiz.append(tablero);
      const participantes=resumen.grupos?.length?[...resumen.grupos.map(g=>[g.nombre,g.participantes]),['Comité financiero',resumen.participantes_taller??0]]:[['colaboradores','Colaboradores'],['clientes','Clientes'],['proveedores','Proveedores'],['taller','Directivos (taller financiero)']].map(([k,l])=>[l,resumen['participantes_'+k]]);
      const abrirFicha=(tipo)=>(a,b)=>{if(vigente()){limpieza=ficha(a,temas.find(t=>t.id===a.tema_id),tipo,b,vigente,M.umbrales(resumen,aspectos,tipo));}};
      function dibujar(){
        const tipo=selector.value,[[vx,nx],[vy,ny]]=variables[tipo],[u,v]=M.umbrales(resumen,aspectos,tipo),abrir=abrirFicha(tipo);
        const visibles=aspectos.filter(a=>(!vista.value||a.dimension===vista.value)&&(!filtro.value||a.cuadrante===filtro.value));
        const desc=[vista.value||'Todas las dimensiones',filtro.value?CLASES.find(k=>k[0]===filtro.value)[1].toLowerCase():'todas las clasificaciones'].join(' · ');
        // Resumen desplegable (como en el Módulo I).
        tarjeta.replaceChildren(el('h2','Resumen'),el('p',desc,'nota'));
        const cla=filaResumen(numero(visibles.length,0),'Clasificación','ka-res-fav'),ul=el('ul');
        CLASES.forEach(([k,t,s])=>{const li=el('li',null,'mat-cla-'+s);li.append(el('strong',numero(visibles.filter(a=>a.cuadrante===k).length,0)),el('span',t));ul.append(li);});
        cla.append(ul,el('p','Aspectos según su resultado de doble materialidad.','nota'));
        const asp=filaResumen(numero(dims.filter(d=>visibles.some(a=>a.dimension===d)).length,0),'Dimensiones','ka-res-gi');
        dims.forEach(d=>{const de=visibles.filter(a=>a.dimension===d);if(!de.length)return;const sec=el('div',null,'ka-res-grupo'),cab=el('div',null,'ka-res-grupo-cabeza'),img=el('img'),chips=el('div',null,'ka-chips');img.src=DIMS[d].icono;img.alt='';img.className='ka-res-grupo-icono';cab.style.setProperty('--gi',DIMS[d].color);cab.append(img,el('span',`${d} · ${numero(de.length,0)}`));
          de.sort((a,b)=>a.orden-b.orden).forEach(a=>{const b=U.boton(a.nombre,()=>abrir(a,b));b.className='ka-chip';chips.append(b);});sec.append(cab,chips);asp.append(sec);});
        const top=filaResumen('10','Top 10 · '+titulos[tipo].toLowerCase(),'ka-res-top'),ol=el('ol',null,'mat-top');
        M.top(aspectos,tipo).forEach((a,i)=>{const li=el('li'),b=U.boton(a.nombre,()=>abrir(a,b));b.id='mat-aspecto-'+a.id;b.dataset.numero=String(i+1);b.dataset.aspecto=a.id;b.className='ka-principal';li.append(b);ol.append(li);});
        top.append(ol,el('p','Por el promedio de los dos ejes del mapa.','nota'));
        const total=participantes.reduce((t,[,n])=>t+(+n||0),0),par=filaResumen(numero(total,0),'Participantes','ka-res-actores'),pl=el('ul',null,'mat-participantes');
        participantes.forEach(([l,n])=>pl.append(el('li',l+(n==null?'':': '+n))));par.append(pl);
        tarjeta.append(cla,asp,top,par);
        // Matriz general: un círculo por dimensión en cada cuadrante.
        const h=el('h2',titulos[tipo]);h.tabIndex=-1;
        const marco=el('div',null,'ka-marco-oro');
        const enCuadrante=q=>visibles.filter(a=>(a[vx]>u)===q.altaX&&(a[vy]>v)===q.altaY);
        const d0=[...aspectos.flatMap(a=>[a[vx],a[vy]]),u,v].every(n=>n>=1)?1:0;
        const zoomDe=q=>{
          const lista=enCuadrante(q);
          const w=KC.ventana(q.nombre,'ka-zoom mat-zoom mat-zoom-'+q.clase.slice(9),el);
          w.panel.append(el('p',titulos[tipo]+' · '+desc,'ka-zoom-vista'),KC.resumen([[numero(lista.length,0),lista.length===1?'Aspecto en el cuadrante':'Aspectos en el cuadrante','total'],
            ...Object.keys(DIMS).map(d=>[numero(lista.filter(a=>a.dimension===d).length,0),d,'dim',DIMS[d].color]),[numero(lista.filter(a=>a.cuadrante==='Doble').length,0),'Doble materialidad','doble']],el));
          if(!lista.length){w.panel.append(el('p','No hay aspectos en este cuadrante con la vista y el filtro elegidos.','nota'));return;}
          w.panel.append(KC.zoom({numero:n=>numero(n,n%1?2:0),ejeX:nx,ejeY:ny,etiqueta:`${q.nombre}: ${lista.length} aspectos en su posición`,xr:q.altaX?[u,5]:[d0,u],yr:q.altaY?[v,5]:[d0,v],abrir,
            puntos:M.ordenados(lista,tipo).map(a=>{const dm=dimDe(a),k=claseDe(a);return {id:a.id,dato:a,nombre:a.nombre,x:a[vx],y:a[vy],color:dm.color,icono:dm.icono,clase:'ka-cla-'+k[2],etiqueta:`${a.nombre}. ${a.dimension}. ${k[1]}. ${nx}: ${numero(a[vx])}; ${ny}: ${numero(a[vy])}. Abrir ficha`};})}),
            KC.leyenda(CLASES.map(k=>[k[1],'ka-cla-'+k[2]]),el));
          w.panel.append(el('p',`Cada aspecto está en su posición real. Los ${KC.GRANDES} de mayor promedio llevan su nombre; los demás son puntos pequeños. El punto negro marca una calificación compartida. El color del punto es su resultado de doble materialidad.`,'nota ka-zoom-nota'));
        };
        marco.append(KC.general({numero:n=>numero(n,0),ejeX:nx,ejeY:ny,etiqueta:`${titulos[tipo]} por dimensión, con ${visibles.length} aspectos`,alZoom:zoomDe,
          cuadrantes:cuadrantesDe(tipo).map(q=>{const en=enCuadrante(q);return {...q,cuenta:`${numero(en.length,0)} ${en.length===1?'aspecto':'aspectos'}`,grupos:dims.map(d=>({nombre:d,color:DIMS[d].color,icono:DIMS[d].icono,n:en.filter(a=>a.dimension===d).length}))};})}));
        const leyenda=el('figcaption',null,'ka-convenciones');
        dims.forEach(d=>{const s=el('span',d,'ka-conv-gi');s.style.setProperty('--gi',DIMS[d].color);leyenda.append(s);});
        leyenda.append(el('span','El tamaño del círculo es el número de aspectos de cada dimensión en el cuadrante. Haz clic en un cuadrante para ampliarlo.','nota'));
        const verMatriz=el('button','Matriz de materialidad','ka-ver-matriz');verMatriz.type='button';
        verMatriz.onclick=()=>{const w=KC.ventana('Matriz de materialidad','ka-matriz-dialogo materialidad',el);
          w.panel.append(el('p',`${visibles.length} aspectos, ordenados por el promedio de ${nx.toLowerCase()} y ${ny.toLowerCase()}. ${desc}.`,'nota'),
            tabla('Puntajes exactos',['Aspecto','Dimensión','Importancia','Probabilidad','Rentabilidad','Gasto operativo','Financiera','Resultado'],M.ordenados(visibles,tipo).map(a=>[a.nombre,a.dimension,...['importancia','probabilidad','rentabilidad','gasto','financiera'].map(k=>numero(a[k])),claseDe(a)[1]])),
            el('p','Escala de 0 (nulo) a 5 (muy alto).','mat-micro'));};
        derecha.replaceChildren(h,el('p','Umbral de '+nx.toLowerCase()+' '+numero(u)+' · '+ny.toLowerCase()+' '+numero(v),'mat-umbrales'),marco,leyenda,verMatriz);
      }
      [selector,vista,filtro].forEach(s=>{s.onchange=dibujar;});dibujar();
      if(p.puedeEditar){const a=el('a','Alimentación','boton secundario');a.href=U.ruta('materialidad',p,'alimentacion');raiz.append(a);}
      raiz.append(el('p','Fuente: '+resumen.fuente,'nota mat-fuente'));
      const metodo=el('details');metodo.append(el('summary','Cómo se calculó'));String(resumen.notas||'').split('\n').filter(Boolean).forEach(l=>metodo.append(el('p',l,'mat-umbrales')));raiz.append(metodo);
    }catch(e){if(vigente())U.error(c,e);}
    return()=>{activo=false;limpieza?.();KC?.ventana.cerrarTodas();};
  }
  App.registrarVista('materialidad/resultados',{render:montar});
}());
