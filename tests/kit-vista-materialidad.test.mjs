import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {montar,boton,campo,form,submit,panel,json,read} from './helpers/kit-estudios.mjs';
import {preparar} from '../scripts/kit-materialidad-registros.mjs';
import M from '../public/kit-vista-materialidad-motor.js';
const listas=await preparar(new URL('fixtures/materialidad-publicada-muestra.json',import.meta.url));
const vista=(sub='resultados',editar=true,extra={},opts={})=>montar('materialidad/'+sub,editar,{...structuredClone(listas),...extra},opts);
const puntos=m=>m.contenedor.querySelectorAll('.mat-punto');
const cambiar=(m,t)=>{const s=m.contenedor.querySelector('select');s.value=t;s.onchange();};
const abrir=m=>puntos(m)[0].onkeydown({key:'Enter',preventDefault(){}});
test('E30: esquema completo y vínculo validado/tema_id',()=>{
 const s=json('config/esquemas/materialidad-aspectos.json'),a=listas['materialidad-aspectos'][0];
 assert.equal(Object.keys(s.campos).length,20);
 assert.equal(M.validar(a,s).ok,true);
 for(const cambio of [{validado:'Sí',tema_id:''},{validado:'Sí',tema_id:'  '},{validado:'No',tema_id:'tema-01'},{importancia:5.1},{orden:101},{dimension:'Otra'}])assert.equal(M.validar({...a,...cambio},s).ok,false);
 assert.equal(M.validar({...a,validado:'No',tema_id:''},s).ok,true);
 const resumen=json('config/esquemas/materialidad-resumen.json');
 for(const k of ['colaboradores','clientes','proveedores'])assert.equal(resumen.campos['participantes_'+k].obligatorio,false);
});
test('E30: cifras, plurales, niveles y orden independiente del arreglo de entrada',()=>{
 const a=(id,orden,cuadrante,importancia,financiera,validado='Sí')=>({id,orden,cuadrante,importancia,financiera,validado});
 const rs=[a('a',3,'Impacto',4,2),a('b',2,'Doble',3,3),a('c',1,'Doble',3,3),a('d',4,'Financiera',2,5),a('e',5,'No material',5,5,'No')];
 assert.deepEqual(M.cifras(rs).map(x=>x.valor),[4,2,1,1]);assert.equal(M.cifras(rs)[3].etiqueta,'financiero');
 assert.equal(M.cifras([rs[0]])[0].etiqueta,'Tema material');assert.equal(M.cifras([])[3].etiqueta,'financieros');
 assert.deepEqual(M.top(rs,'doble').map(x=>x.id),['c','b','a','d']);
 assert.deepEqual(M.top(rs,'impacto').map(x=>x.id),['e','a','c','b','d']);
 assert.deepEqual(M.top(rs,'financiera').map(x=>x.id),['d','e','c','b','a']);
 assert.deepEqual(M.top([...rs].reverse(),'doble'),M.top(rs,'doble'));
 assert.equal(M.top(listas['materialidad-aspectos'],'impacto').length,10);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).etiqueta),['Alto','Medio','Nulo']);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).color),['naranja','ambar','gris']);
});
test('E30: diagonal del promedio y separación determinista de puntos coincidentes',()=>{
 assert.deepEqual(M.diagonal(2),[[0,4],[4,0]]);
 for(const u of [0,1,2.7,5])for(const [x,y] of M.diagonal(u)){assert.equal(x+y,2*u);assert.ok(x>=0&&x<=5&&y>=0&&y<=5);}
 const originales=Array.from({length:10},()=>[300,300]),ps=M.posiciones(originales);
 assert.deepEqual(ps,M.posiciones(originales));assert.deepEqual(originales[1],[300,300]);
 ps.forEach((p,i)=>ps.slice(0,i).forEach(q=>assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])>=32)));
});
test('E30: tres consultas exactas, cifras, fuente y selector sin recargar',async()=>{
 const m=await vista();
 assert.deepEqual(m.consultas.map(x=>x[1]),M.colecciones);assert.ok(m.consultas.every(x=>x[0]==='empresa-1'));
 assert.deepEqual(m.contenedor.querySelector('.mat-cifras').children.map(n=>n.children[0].textContent),['10','4','3','3']);
 assert.match(m.contenedor.textContent,/Fuente: Informe de muestra de Empresa Aurora/);
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);
  assert.equal(m.contenedor.querySelector('h2').textContent,({doble:'Doble materialidad',impacto:'Materialidad de impacto',financiera:'Materialidad financiera'})[tipo]);
  assert.equal(m.contenedor.querySelector('h2').tabIndex,-1);
  assert.equal(puntos(m).length,28);
  const botones=m.contenedor.querySelector('ol').querySelectorAll('button'),top=M.top(listas['materialidad-aspectos'],tipo);
  assert.deepEqual(botones.map(b=>b.dataset.aspecto),top.map(a=>a.id));
  botones.forEach(b=>{const p=puntos(m).find(n=>n.attrs['data-aspecto']===b.dataset.aspecto);assert.equal(p.attrs['data-numero'],b.dataset.numero);assert.equal(p.attrs.tabindex,'0');assert.equal(p.attrs.role,'button');});
  assert.equal(m.contenedor.querySelector('tbody').children.length,28);
  assert.match(m.contenedor.querySelector('svg').textContent,tipo==='financiera'?/Impacto en el gasto operativo/:tipo==='impacto'?/Probabilidad/:/Materialidad financiera/);
 }
 assert.equal(m.consultas.length,3);
});
test('E30: ficha por vista, tablas, Enter, Espacio, foco, inert y cierre',async()=>{
 const m=await vista();
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);const punto=puntos(m)[0];abrir(m);
  const d=panel(m);assert.ok(d);assert.equal(m.contenedor.inert,true);
  const titulos=d.querySelectorAll('h3').map(n=>n.textContent);
  assert.equal(titulos.includes('Importancia'),tipo==='impacto');
  assert.equal(titulos.includes('Impacto en la rentabilidad'),tipo==='financiera');
  assert.equal(d.querySelectorAll('table').length,tipo==='doble'?2:1);
  assert.match(d.textContent,/Marco inventado/);
  let previno=false;m.document.eventos.keydown({key:'Tab',preventDefault(){previno=true;}});assert.ok(previno);assert.equal(m.document.activeElement,boton(d,'Cerrar ×'));
  m.document.eventos.keydown({key:'Escape',preventDefault(){}});assert.equal(panel(m),undefined);assert.equal(m.document.activeElement,punto);assert.equal(m.contenedor.inert,false);
  punto.onkeydown({key:' ',preventDefault(){}});boton(panel(m),'Cerrar ×').onclick();assert.equal(m.document.activeElement,punto);
 }
 abrir(m);m.salir();assert.equal(panel(m),undefined);assert.equal(m.document.eventos.keydown,undefined);
});
test('E30: descripción e indicadores validados, sustitución y texto seguro',async()=>{
 const rs=structuredClone(listas);rs['materialidad-aspectos'][0].nombre='<script>prueba</script>';
 rs['materialidad-temas'][0].descripcion='{empresa} desarrolla una práctica inventada';
 rs['materialidad-temas'][0].indicadores='Indicador uno; Indicador dos';
 const m=await vista('resultados',true,rs),b=m.contenedor.querySelector('#mat-aspecto-asp-01');b.onclick();
 assert.match(panel(m).textContent,/Empresa Aurora desarrolla/);assert.match(panel(m).textContent,/Indicador uno/);
 assert.ok(panel(m).textContent.includes('<script>prueba</script>'));assert.equal(m.document.body.querySelectorAll('script').length,0);
 assert.ok(!m.document.body.textContent.includes('{empresa}'));
 boton(panel(m),'Cerrar ×').onclick();assert.equal(m.document.activeElement,b);
});
test('E30: permisos, botón y estados vacíos',async()=>{
 for(const editar of [true,false]){
  const m=await vista('resultados',editar);assert.equal(m.contenedor.querySelectorAll('a').length,editar?1:0);
  if(editar)assert.equal(m.contenedor.querySelector('a').href,'#/materialidad/empresa-1/alimentacion');
  for(const coleccion of ['materialidad-resumen','materialidad-aspectos']){
   const v=await vista('resultados',editar,{[coleccion]:[]});assert.match(v.contenedor.textContent,/aún no tiene datos/);assert.equal(v.contenedor.querySelectorAll('a').length,editar?1:0);
  }
 }
 const m=await vista('alimentacion',false);assert.equal(m.consultas.length,0);assert.equal(boton(m.contenedor,'Agregar'),undefined);
});
test('E30: alimentación rechaza puntaje 6 y guarda aspecto en su colección',async()=>{
 const m=await vista('alimentacion');await boton(m.contenedor,'Aspectos').onclick();boton(m.contenedor,'Editar').onclick();
 campo(m.contenedor,'financiera').value='6';form(m.contenedor).onsubmit(submit());assert.equal(campo(m.contenedor,'financiera').attrs['aria-invalid'],'true');assert.equal(m.guardados.length,0);
 campo(m.contenedor,'financiera').value='3,2';form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();
 assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','materialidad-aspectos','asp-01']);assert.equal(m.guardados[0][3].financiera,3.2);
});
test('III: resumen único conserva su clave; alta vacía usa resumen',async()=>{
 const m=await vista('alimentacion');assert.equal(boton(m.contenedor,'Agregar'),undefined);assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-resumen']);boton(m.contenedor,'Editar').onclick();assert.equal(campo(m.contenedor,'id').disabled,true);form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','materialidad-resumen','resumen']);
 const vacia=await vista('alimentacion',true,{'materialidad-resumen':[]});boton(vacia.contenedor,'Agregar').onclick();assert.equal(campo(vacia.contenedor,'id').value,'resumen');assert.equal(campo(vacia.contenedor,'id').disabled,true);
});
test('III: navegación obsoleta no pinta; error de guardado conserva formulario',async()=>{
 const c=await vista('resultados',true,{}, {cancelar:true});assert.equal(c.contenedor.children.length,0);
 const m=await vista('alimentacion',true,{}, {errorGuardar:true});boton(m.contenedor,'Editar').onclick();form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.match(m.contenedor.textContent,/No se pudo guardar/);assert.equal(boton(m.contenedor,'Confirmar guardado').disabled,false);assert.equal(campo(m.contenedor,'id').value,'resumen');
});
test('III: borrado confirmado e historial solo de las tres colecciones actuales',async()=>{
 const m=await vista('alimentacion');await boton(m.contenedor,'Temas materiales').onclick();await boton(m.contenedor,'Borrar').onclick();assert.equal(m.borrados.length,0);await boton(m.contenedor,'Confirmar borrado').onclick();assert.deepEqual(m.borrados[0],['empresa-1','materialidad-temas','tema-01']);await boton(m.contenedor,'Historial de cambios').onclick();assert.deepEqual(m.historial.map(x=>x[1].coleccion),Object.keys(listas));
});

test('E30: tabla ordenada, formas ESG, guías y diagonal renderizada',async()=>{
 const m=await vista();cambiar(m,'financiera');
 assert.ok(m.contenedor.querySelectorAll('.mat-guia').length>0);
 const mapa=m.contenedor.querySelector('.mat-mapa'),linea=mapa.querySelector('.mat-umbral'),u=listas['materialidad-resumen'][0].umbral_financiero;
 const puntosDatos=[[Number(linea.attrs.x1),Number(linea.attrs.y1)],[Number(linea.attrs.x2),Number(linea.attrs.y2)]].map(([x,y])=>[(x-90)/100,(550-y)/100]);
 puntosDatos.forEach(([x,y])=>assert.ok(Math.abs(x+y-2*u)<1e-10));
 const formas=mapa.querySelectorAll('.mat-forma').map(n=>n.tagName);assert.ok(formas.includes('POLYGON'));assert.ok(formas.includes('CIRCLE'));assert.ok(formas.includes('RECT'));
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);assert.deepEqual(m.contenedor.querySelector('tbody').children.map(n=>n.children[0].textContent),M.ordenados(listas['materialidad-aspectos'],tipo).map(a=>a.nombre));
 }
});
test('E30: participantes opcionales y notas por renglón; ficha usa definición si descripción vacía',async()=>{
 const rs=structuredClone(listas);delete rs['materialidad-resumen'][0].participantes_clientes;
 rs['materialidad-resumen'][0].notas='Primera línea de {empresa}\nSegunda línea';
 rs['materialidad-temas'][0].descripcion='  ';rs['materialidad-temas'][0].indicadores='';
 const m=await vista('resultados',true,rs);
 assert.ok(m.contenedor.querySelectorAll('li').some(n=>n.textContent==='Clientes'));
 assert.match(m.contenedor.textContent,/Primera línea de Empresa Aurora/);
 const detalles=m.contenedor.querySelectorAll('details');assert.equal(detalles.at(-1).querySelectorAll('p').length,2);
 m.contenedor.querySelector('#mat-aspecto-asp-01').onclick();
 assert.match(panel(m).textContent,/Empresa Aurora revisa este aspecto inventado/);assert.match(panel(m).textContent,/Marco inventado/);
 const fondo=panel(m).parentNode;fondo.onclick({target:fondo});assert.equal(panel(m),undefined);
});
test('E30: contraste de ámbar y amarillo supera 4,5 en ambos temas',()=>{
 const luminancia=hex=>hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
 const contraste=(a,b)=>(Math.max(luminancia(a),luminancia(b))+.05)/(Math.min(luminancia(a),luminancia(b))+.05);
 for(const fondo of ['DDAE3E','E6D267'])for(const texto of ['1F332B','182C24'])assert.ok(contraste(fondo,texto)>=4.5);
});

test('E30b: las etiquetas conservan la región de la muestra y de cuatro aspectos en (3; 3)',async()=>{
 const resumen=listas['materialidad-resumen'][0],u=resumen.umbral_financiero,v=resumen.umbral_impacto;
 const region=(tipo,x,y)=>tipo==='doble'?`${x>=u}:${y>=v}`:tipo==='impacto'?String(y>=v):String(x+y>=2*u);
 const campos={doble:['financiera','importancia'],impacto:['probabilidad','importancia'],financiera:['rentabilidad','gasto']};
 const m=await vista();
 for(const tipo of Object.keys(campos)){
  cambiar(m,tipo);
  const anclas=m.contenedor.querySelectorAll('.mat-real'),numeros=m.contenedor.querySelectorAll('.mat-numero');
  const top=M.top(listas['materialidad-aspectos'],tipo),[vx,vy]=campos[tipo];
  assert.equal(anclas.length,top.length);
  top.forEach((a,i)=>{
   assert.ok(Math.abs(+anclas[i].attrs.cx-(90+a[vx]*100))<1e-10);
   assert.ok(Math.abs(+anclas[i].attrs.cy-(550-a[vy]*100))<1e-10);
   assert.equal(+anclas[i].attrs.r,3);
   const x=(+numeros[i].attrs.x-90)/100,y=(550-(+numeros[i].attrs.y-5))/100;
   assert.equal(region(tipo,x,y),region(tipo,a[vx],a[vy]));
   assert.ok(x>=0&&x<=5&&y>=0&&y<=5);
  });
 }
 // Comprobar las tres regiones también con geometrías de móvil y escritorio.
 for(const [ancho,alto] of [[260,224],[500,500],[650,500]])for(const tipo of Object.keys(campos)){
  const [vx,vy]=campos[tipo],top=M.top(listas['materialidad-aspectos'],tipo);
  const r=([x,y])=>region(tipo,x*5/ancho,5-y*5/alto);
  const originales=top.map(a=>[a[vx]*ancho/5,(5-a[vy])*alto/5]);
  M.posiciones(originales,{ancho,alto,region:r}).forEach((p,i)=>assert.equal(r(p),r(originales[i])));
 }
 const inventados=Array.from({length:4},(_,i)=>({...listas['materialidad-aspectos'][0],id:'coincidente-'+i,orden:i+1,rentabilidad:3,gasto:3,financiera:3}));
 const caso=await vista('resultados',true,{'materialidad-aspectos':inventados,'materialidad-resumen':[{...resumen,umbral_financiero:2.7}]});
 cambiar(caso,'financiera');
 const etiquetas=caso.contenedor.querySelectorAll('.mat-numero').map(n=>[(+n.attrs.x-90)/100,(550-(+n.attrs.y-5))/100]);
 assert.equal(etiquetas.length,4);
 etiquetas.forEach(([x,y],i)=>{assert.ok(x+y>=5.4);etiquetas.slice(0,i).forEach(([qx,qy])=>assert.ok(Math.hypot(x-qx,y-qy)>=.4));});
});
test('E30b: si no cabe una etiqueta en su región conserva el punto original',()=>{
 const originales=[[0,0],[0,0]],region=([x,y])=>x===0&&y===0?'origen':'resto';
 assert.deepEqual(M.posiciones(originales,{region}),originales);
});
test('E30b: validado se omite en doble y se conserva en impacto y financiera',async()=>{
 const m=await vista();
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);
  const ol=m.contenedor.querySelector('ol'),marcas=ol.querySelectorAll('.mat-validado');
  assert.equal(marcas.length,tipo==='doble'?0:M.top(listas['materialidad-aspectos'],tipo).filter(a=>a.validado==='Sí').length);
  if(tipo==='doble')assert.doesNotMatch(ol.textContent,/validado/);
  else assert.match(ol.textContent,/✓ validado/);
 }
});
test('E30b: cabecera de ficha agrupa título y dimensión en la misma fila',async()=>{
 const m=await vista();abrir(m);
 const cab=panel(m).querySelector('.mat-ficha-cab');
 assert.equal(cab.children[0].tagName,'H2');
 assert.equal(cab.children[1].className,'mat-dimension');
 assert.equal(cab.querySelector('span').textContent,'Dimensión ESG');
 assert.ok(['Ambiental','Social','Gobernanza'].includes(cab.querySelector('strong').textContent));
});


test('E30b: el mapa adapta viewBox al contenedor y desconecta el observador al salir',async()=>{
 const m=await vista();m.limpiar();m.contenedor.replaceChildren();
 let callback,render,desconectado=false;
 m.root.ResizeObserver=class {
  constructor(fn){callback=fn;}
  observe(n){assert.equal(n.className,'mat-resultado');}
  disconnect(){desconectado=true;}
 };
 m.root.App.registrarVista=(_,v)=>{render=v.render;};
 vm.runInNewContext(read('kit-vista-materialidad.js'),m.root);
 const limpiar=await render(m.contenedor,null,{empresa:'empresa-1',puedeEditar:false,vigente:()=>true});
 for(const ancho of [310,780]){
  const anterior=m.contenedor.querySelector('.mat-mapa');
  anterior.replaceWith=function(n){const padre=this.parentNode;padre.children[padre.children.indexOf(this)]=n;n.parentNode=padre;};
  callback([{contentRect:{width:ancho}}]);
  const mapa=m.contenedor.querySelector('.mat-mapa');
  assert.equal(mapa.attrs.viewBox,`0 0 ${ancho} ${Math.min(640,ancho+40)}`);
  assert.equal(mapa.querySelectorAll('.mat-real').length,10);
  assert.ok(mapa.querySelectorAll('.mat-forma').filter(n=>n.tagName==='CIRCLE').every(n=>+n.attrs.r*2>=20));
 }
 assert.equal(m.consultas.length,6); // Dos montajes; redimensionar no consulta.
 limpiar();assert.equal(desconectado,true);
});
