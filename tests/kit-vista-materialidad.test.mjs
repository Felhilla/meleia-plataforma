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
 const a=(id,orden,cuadrante,importancia,financiera,validado='Sí')=>({id,orden,cuadrante,importancia,financiera,probabilidad:3,validado});
 const rs=[a('a',3,'Impacto',4,2),a('b',2,'Doble',3,3),a('c',1,'Doble',3,3),a('d',4,'Financiera',2,5),a('e',5,'No material',5,5,'No')];
 assert.deepEqual(M.cifras(rs).map(x=>x.valor),[4,2,1,1]);assert.equal(M.cifras(rs)[3].etiqueta,'financiero');
 assert.equal(M.cifras([rs[0]])[0].etiqueta,'Tema material');assert.equal(M.cifras([])[3].etiqueta,'financieros');
 assert.deepEqual(M.top(rs,'doble').map(x=>x.id),['e','d','c','b','a']);
 assert.deepEqual(M.top(rs,'impacto').map(x=>x.id),['e','a','c','b','d']);
 assert.deepEqual(M.top(rs,'financiera').map(x=>x.id),['d','e','c','b','a']);
 assert.deepEqual(M.top([...rs].reverse(),'doble'),M.top(rs,'doble'));
 assert.equal(M.top(listas['materialidad-aspectos'],'impacto').length,10);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).etiqueta),['Alto','Medio','Nulo']);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).color),['naranja','ambar','gris']);
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
  assert.match(m.contenedor.querySelector('svg').textContent,tipo==='financiera'?/Probabilidad/:tipo==='impacto'?/Probabilidad/:/Materialidad financiera/);
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
  assert.equal(titulos.includes('Materialidad financiera'),tipo!=='impacto');
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
  assert.equal(mapa.querySelectorAll('.mat-numero').length,10);
  assert.ok(mapa.querySelectorAll('.mat-forma').filter(n=>n.tagName==='CIRCLE').every(n=>+n.attrs.r*2>=20));
 }
 assert.equal(m.consultas.length,6); // Dos montajes; redimensionar no consulta.
 limpiar();assert.equal(desconectado,true);
});


test('E31: top 10 por promedio de los dos ejes, desempate por orden y sin filtrar validación',()=>{
 const campos={doble:['financiera','importancia'],impacto:['probabilidad','importancia'],financiera:['probabilidad','financiera']};
 const rs=Array.from({length:28},(_,i)=>({id:String(i),orden:28-i,financiera:i%6,importancia:(i*3)%6,probabilidad:(i*5)%6,validado:'No'}));
 for(const [tipo,[x,y]] of Object.entries(campos)){
  const esperado=[...rs].sort((a,b)=>(b[x]+b[y])/2-(a[x]+a[y])/2||a.orden-b.orden).slice(0,10);
  assert.deepEqual(M.top(rs,tipo),esperado);
  assert.deepEqual(M.top([...rs].reverse(),tipo),esperado);
 }
});
test('E31: probabilidad opcional 0–5, umbral explícito incluido cero y respaldo de todos los aspectos',()=>{
 const esquema=json('config/esquemas/materialidad-resumen.json'),r=listas['materialidad-resumen'][0];
 assert.equal(esquema.campos.umbral_probabilidad.obligatorio,false);
 assert.equal(M.validar(r,esquema).ok,true);
 for(const valor of [0,3.05,5])assert.equal(M.validar({...r,umbral_probabilidad:valor},esquema).ok,true);
 for(const valor of [-.01,5.01])assert.equal(M.validar({...r,umbral_probabilidad:valor},esquema).ok,false);
 const rs=[{probabilidad:1},{probabilidad:3},{probabilidad:5}];
 for(const tipo of ['impacto','financiera']){
  assert.equal(M.umbrales(r,rs,tipo)[0],3);
  for(const valor of [0,3.05])assert.equal(M.umbrales({...r,umbral_probabilidad:valor},rs,tipo)[0],valor);
 }
});
test('E31: ejes, dos umbrales y cuatro cuadrantes con geometría exacta en las tres vistas',async()=>{
 const campos={doble:['financiera','importancia'],impacto:['probabilidad','importancia'],financiera:['probabilidad','financiera']};
 for(const explicito of [undefined,0,3.05]){
  const resumen={...listas['materialidad-resumen'][0]};
  if(explicito!==undefined)resumen.umbral_probabilidad=explicito;
  const rs=listas['materialidad-aspectos'],promedio=rs.reduce((s,a)=>s+a.probabilidad,0)/rs.length;
  const m=await vista('resultados',true,{'materialidad-resumen':[resumen]});
  for(const [tipo,[x,y]] of Object.entries(campos)){
   cambiar(m,tipo);
   const mapa=m.contenedor.querySelector('.mat-mapa'),u=tipo==='doble'?resumen.umbral_financiero:explicito??promedio,v=tipo==='financiera'?resumen.umbral_financiero:resumen.umbral_impacto;
   const d0=[...rs.flatMap(a=>[a[x],a[y]]),u,v].every(n=>n>=1)?1:0,k=500/(5-d0),PX=n=>90+(n-d0)*k,PY=n=>550-(n-d0)*k;
   const lineas=mapa.querySelectorAll('.mat-umbral');assert.equal(lineas.length,2);
   assert.ok(Math.abs(+lineas[0].attrs.x1-PX(u))<1e-9);assert.equal(lineas[0].attrs.x1,lineas[0].attrs.x2);
   assert.ok(Math.abs(+lineas[1].attrs.y1-PY(v))<1e-9);assert.equal(lineas[1].attrs.y1,lineas[1].attrs.y2);
   for(const [clase,px,py,w,h] of [['base',d0,d0,u-d0,v-d0],['impacto',d0,v,u-d0,5-v],['financiera',u,d0,5-u,v-d0],['doble',u,v,5-u,5-v]]){
    const r=mapa.querySelector('.mat-zona-'+clase);assert.equal(r.tagName,'RECT');
    for(const [campo,valor] of Object.entries({x:PX(px),y:PY(py+h),width:w*k,height:h*k}))assert.ok(Math.abs(+r.attrs[campo]-valor)<1e-9);
   }
   assert.equal(mapa.querySelectorAll('.mat-cuadrante').length,tipo==='doble'?4:0);
   assert.deepEqual(mapa.querySelectorAll('.mat-eje').slice(-2).map(n=>n.textContent),M.variables[tipo].map(v=>v[1]));
   const texto=m.contenedor.querySelector('.mat-umbrales').textContent;
   for(const n of [u,v])assert.ok(texto.includes(new Intl.NumberFormat('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)));
   assert.equal(m.contenedor.querySelector('.antetitulo').textContent,'Top 10 · '+({doble:'doble materialidad',impacto:'materialidad de impacto',financiera:'materialidad financiera'})[tipo]);
   const top=M.top(rs,tipo),ps=puntos(m);assert.deepEqual(ps.slice(-10).map(p=>+p.attrs['data-numero']),[10,9,8,7,6,5,4,3,2,1]);
   for(const p of ps){
    const a=rs.find(a=>a.id===p.attrs['data-aspecto']),centro=p.querySelector('.mat-toque');
    assert.ok(Math.abs(+centro.attrs.cy-PY(a[y]))<1e-9);
    const iguales=top.filter(b=>b[x]===a[x]&&b[y]===a[y]);
    const corrimiento=Math.abs((+centro.attrs.cx-90)/k+d0-a[x]);
    assert.ok(corrimiento<1e-9||(p.attrs['data-numero']&&iguales.length>1&&corrimiento<=.06*Math.ceil((iguales.length-1)/2)+1e-9));
   }
   assert.deepEqual(m.contenedor.querySelector('tbody').children.map(n=>n.children[0].textContent),M.ordenados(rs,tipo).map(a=>a.nombre));
  }
 }
});
test('E31: solo empates exactos admiten corrimiento horizontal fijo y acotado',()=>{
 const originales=[[3,3],[3.001,3],[3,3],[3,3],[0,0],[0,0],[5,5],[5,5]];
 const copia=structuredClone(originales),ps=M.posiciones(originales);
 assert.deepEqual(originales,copia);assert.deepEqual(ps,M.posiciones(originales));
 assert.deepEqual(ps.slice(0,2),originales.slice(0,2));assert.ok(Math.abs(ps[2][0]-3.06)<1e-9&&ps[2][1]===3);assert.ok(Math.abs(ps[3][0]-2.94)<1e-9&&ps[3][1]===3);
 for(const x of [0,3,5])M.posiciones(Array.from({length:4},()=>[x,3])).forEach(([px,py])=>{assert.equal(py,3);assert.ok(Math.abs(px-x)<=.12+1e-9);assert.ok(px>=0&&px<=5);});
});
test('E31: estado por vista y sin validado visible en lista ni ficha',async()=>{
 const m=await vista();
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);assert.doesNotMatch(m.contenedor.querySelector('ol').textContent,/validado/i);
  for(const b of m.contenedor.querySelector('ol').querySelectorAll('button')){
   b.onclick();const d=panel(m),a=listas['materialidad-aspectos'].find(a=>a.id===b.dataset.aspecto);
   assert.doesNotMatch(d.textContent,/validado/i);
   assert.equal(d.querySelector('.mat-estado').textContent,M.estado(a,tipo,M.umbrales(listas['materialidad-resumen'][0],listas['materialidad-aspectos'],tipo)));
   if(tipo==='financiera'){
    assert.deepEqual(d.querySelectorAll('.mat-nota').map(n=>n.querySelector('h3').textContent),['Materialidad financiera','Probabilidad']);
    assert.match(d.textContent,/Calificación del taller financiero/);assert.match(d.textContent,/Impacto en la rentabilidad/);assert.match(d.textContent,/Impacto en el gasto operativo/);
   }
   boton(d,'Cerrar ×').onclick();
  }
 }
 for(const tipo of ['impacto','financiera'])for(const [x,y,esperado] of [[4,4,'Alta N y alta probabilidad'],[2,4,'Alta N, baja probabilidad'],[4,2,'Baja N, alta probabilidad'],[2,2,'Baja N y baja probabilidad'],[3,3,'Baja N y baja probabilidad']]){
  assert.equal(M.estado({probabilidad:x,importancia:y,financiera:y},tipo,[3,3]),esperado.replace('N',tipo==='impacto'?'importancia':'materialidad financiera'));
 }
 for(const [cuadrante,esperado] of Object.entries({Doble:'Doble materialidad',Impacto:'Material por impacto',Financiera:'Material financiero','No material':'No material'}))assert.equal(M.estado({cuadrante},'doble',[3,3]),esperado);
});
