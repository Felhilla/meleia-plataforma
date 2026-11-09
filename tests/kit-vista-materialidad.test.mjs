import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {montar,boton,campo,form,submit,panel,json,read} from './helpers/kit-estudios.mjs';
import {preparar} from '../scripts/kit-materialidad-registros.mjs';
import M from '../public/kit-vista-materialidad-motor.js';
const listas=await preparar(new URL('fixtures/materialidad-publicada-muestra.json',import.meta.url));
const vista=(sub='resultados',editar=true,extra={},opts={})=>montar('materialidad/'+sub,editar,{...structuredClone(listas),...extra},opts);
const top=m=>m.contenedor.querySelector('.mat-top').querySelectorAll('button');
const cuadrantes=m=>m.contenedor.querySelectorAll('.ka-cuadrante-boton');
const cambiar=(m,t)=>{const s=m.contenedor.querySelector('select');s.value=t;s.onchange();};
const abrir=m=>top(m)[0].onclick();
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
 assert.deepEqual(M.top(rs,'doble').map(x=>x.id),['e','d','c','b','a']);
 assert.deepEqual(M.top(rs,'impacto').map(x=>x.id),['e','a','c','b','d']);
 assert.deepEqual(M.top(rs,'financiera').map(x=>x.id),['d','e','c','b','a']);
 assert.deepEqual(M.top([...rs].reverse(),'doble'),M.top(rs,'doble'));
 assert.equal(M.top(listas['materialidad-aspectos'],'impacto').length,10);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).etiqueta),['Alto','Medio','Nulo']);
 assert.deepEqual([4.26,2.5,0].map(x=>M.nivel(x).color),['naranja','ambar','gris']);
});
test('E66: tres consultas, fuente, selector sin recargar, top 10 y un círculo por dimensión en cada cuadrante',async()=>{
 const m=await vista();
 assert.deepEqual(m.consultas.map(x=>x[1]),M.colecciones);assert.ok(m.consultas.every(x=>x[0]==='empresa-1'));
 assert.ok(!m.contenedor.querySelector('.mat-cifras'));
 assert.match(m.contenedor.textContent,/Fuente: Informe de muestra de Empresa Aurora/);
 const rs=listas['materialidad-aspectos'],resumen=listas['materialidad-resumen'][0];
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);
  const h=m.contenedor.querySelector('.mat-resultado').querySelector('h2');
  assert.equal(h.textContent,({doble:'Doble materialidad',impacto:'Materialidad de impacto',financiera:'Materialidad financiera'})[tipo]);assert.equal(h.tabIndex,-1);
  assert.deepEqual(top(m).map(b=>b.dataset.aspecto),M.top(rs,tipo).map(a=>a.id));
  const [[x],[y]]=M.variables[tipo],[u,v]=M.umbrales(resumen,rs,tipo),cs=cuadrantes(m);assert.equal(cs.length,4);
  const total=cs.reduce((t,c)=>t+ +c.attrs['aria-label'].match(/: (\d+) aspecto/)[1],0);assert.equal(total,28);
  const dobleAlta=rs.filter(a=>a[x]>u&&a[y]>v).length;assert.ok(cs[1].attrs['aria-label'].includes(`: ${dobleAlta} aspecto`));
  assert.deepEqual(m.contenedor.querySelector('.ka-general').querySelectorAll('.ka-eje-nombre').map(n=>n.textContent),M.variables[tipo].map(v=>v[1]+' →'));
  const texto=m.contenedor.querySelector('.mat-umbrales').textContent;
  for(const n of [u,v])assert.ok(texto.includes(new Intl.NumberFormat('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)));
  boton(m.contenedor,'Matriz de materialidad').onclick();const t=panel(m);
  assert.deepEqual(t.querySelector('tbody').children.map(n=>n.children[0].textContent),M.ordenados(rs,tipo).map(a=>a.nombre));
  t.querySelector('[aria-label="Cerrar"]').onclick();assert.equal(panel(m),undefined);
 }
 assert.equal(m.consultas.length,3);
});
test('E66: zoom del cuadrante con resumen, posición real, 7 burbujas y puntos pequeños',async()=>{
 const m=await vista();const rs=listas['materialidad-aspectos'],[u,v]=M.umbrales(listas['materialidad-resumen'][0],rs,'doble');
 const c=cuadrantes(m).find(n=>n.attrs['aria-label'].startsWith('Doble materialidad:'));c.listeners.click();
 const z=panel(m),lista=rs.filter(a=>a.financiera>u&&a.importancia>v);assert.ok(lista.length>7);
 assert.match(z.textContent,new RegExp(lista.length+'\\s+Aspectos en el cuadrante'));
 for(const d of ['Ambiental','Social','Gobernanza'])assert.match(z.textContent,new RegExp(lista.filter(a=>a.dimension===d).length+'\\s+'+d));
 const grandes=z.querySelectorAll('.ka-burbuja'),chicos=z.querySelectorAll('.ka-punto-chico');
 assert.equal(grandes.length,Math.min(7,lista.length));assert.equal(grandes.length+chicos.length,lista.length);
 assert.deepEqual(grandes.map(g=>g.attrs['data-id']),M.ordenados(lista,'doble').slice(0,7).map(a=>a.id));
 assert.ok(chicos.every(n=>!n.querySelectorAll('text').length));
 assert.match(z.textContent,/Doble materialidad/);assert.doesNotMatch(z.textContent,/validado/i);
 grandes[0].listeners.click();const f=m.document.body.querySelectorAll('[role="dialog"]').at(-1);assert.ok(f.className.includes('mat-ficha'));
 m.document.eventos.keydown({key:'Escape',preventDefault(){}});assert.ok(panel(m),'Escape cierra solo la ficha de arriba');
 m.salir();assert.equal(panel(m),undefined);
});
test('E66: Vista por dimensión y Filtro por resultado de doble materialidad',async()=>{
 const m=await vista(),[,vista_,filtro]=m.contenedor.querySelectorAll('select'),rs=listas['materialidad-aspectos'];
 assert.deepEqual(vista_.children.map(o=>o.textContent),['General',...['Ambiental','Social','Gobernanza'].filter(d=>rs.some(a=>a.dimension===d))]);
 assert.equal(filtro.children[0].textContent,'Todas las clasificaciones');
 vista_.value='Social';vista_.onchange();
 const total=cuadrantes(m).reduce((t,c)=>t+ +c.attrs['aria-label'].match(/: (\d+) aspecto/)[1],0);assert.equal(total,rs.filter(a=>a.dimension==='Social').length);
 vista_.value='';filtro.value='Doble';filtro.onchange();
 assert.equal(cuadrantes(m).reduce((t,c)=>t+ +c.attrs['aria-label'].match(/: (\d+) aspecto/)[1],0),rs.filter(a=>a.cuadrante==='Doble').length);
});
test('E30: ficha por vista, tablas, Enter, Espacio, foco, inert y cierre',async()=>{
 const m=await vista();
 for(const tipo of ['doble','impacto','financiera']){
  cambiar(m,tipo);const punto=top(m)[0];abrir(m);
  const d=panel(m);assert.ok(d);assert.equal(m.contenedor.inert,true);
  const titulos=d.querySelectorAll('.dim-ficha-rotulo').map(n=>n.textContent);
  assert.equal(titulos.includes('Importancia'),tipo==='impacto');
  assert.equal(titulos.includes('Materialidad financiera'),tipo!=='impacto');
  assert.equal(d.querySelectorAll('table').length,tipo==='doble'?2:1);
  assert.match(d.textContent,/Marco inventado|Indicador inventado/);
  let previno=false;m.document.eventos.keydown({key:'Tab',preventDefault(){previno=true;}});assert.ok(previno);assert.equal(m.document.activeElement,d.querySelector('[aria-label=\"Cerrar\"]'));
  m.document.eventos.keydown({key:'Escape',preventDefault(){}});assert.equal(panel(m),undefined);assert.equal(m.document.activeElement,punto);assert.equal(m.contenedor.inert,false);
  punto.onclick();panel(m).querySelector('[aria-label=\"Cerrar\"]').onclick();assert.equal(m.document.activeElement,punto);
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
 panel(m).querySelector('[aria-label=\"Cerrar\"]').onclick();assert.equal(m.document.activeElement,b);
});
test('E30: permisos, botón y estados vacíos',async()=>{
 for(const editar of [true,false]){
  const m=await vista('resultados',editar);assert.equal(m.contenedor.querySelectorAll('a').length,editar?2:1);
  assert.equal(m.contenedor.querySelector('.ka-met-tarjeta').href,'#/materialidad/empresa-1/metodologia');
  if(editar)assert.equal(m.contenedor.querySelectorAll('a').at(-1).href,'#/materialidad/empresa-1/alimentacion');
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

test('E35: ficha comparte cabecera, antetítulo y panel de calificación con el Módulo II',async()=>{
 const m=await vista();abrir(m);const d=panel(m),cab=d.querySelector('.dim-ficha-cabeza');
 assert.ok(cab.querySelector('.dim-ficha-titulo').querySelector('h2'));
 assert.ok(['Ambiental','Social','Gobernanza'].includes(cab.querySelector('.antetitulo').textContent));
 assert.equal(cab.querySelector('.dim-ficha-calif').querySelectorAll('strong').length,2);
 const a=listas['materialidad-aspectos'].find(a=>a.nombre===cab.querySelector('h2').textContent);
 assert.ok(cab.querySelector('.dim-ficha-calif').className.includes('sem-fondo-'+M.nivel(a.importancia).color));
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
  cambiar(m,tipo);assert.doesNotMatch(m.contenedor.querySelector('.mat-top').textContent,/validado/i);
  for(const b of top(m)){
   b.onclick();const d=panel(m),a=listas['materialidad-aspectos'].find(a=>a.id===b.dataset.aspecto);
   assert.doesNotMatch(d.textContent,/validado/i);
   assert.equal(d.querySelector('.mat-estado').textContent,M.estado(a,tipo,M.umbrales(listas['materialidad-resumen'][0],listas['materialidad-aspectos'],tipo)));
   if(tipo==='financiera'){
    assert.deepEqual(d.querySelectorAll('.mat-nota').map(n=>n.querySelector('.dim-ficha-rotulo').textContent),['Materialidad financiera','Probabilidad']);
    assert.match(d.textContent,/Calificación del taller financiero/);assert.match(d.textContent,/Impacto en la rentabilidad/);assert.match(d.textContent,/Impacto en el gasto operativo/);
   }
   d.querySelector('[aria-label=\"Cerrar\"]').onclick();
  }
 }
 for(const tipo of ['impacto','financiera'])for(const [x,y,esperado] of [[4,4,'Alta N y alta probabilidad'],[2,4,'Alta N, baja probabilidad'],[4,2,'Baja N, alta probabilidad'],[2,2,'Baja N y baja probabilidad'],[3,3,'Baja N y baja probabilidad']]){
  assert.equal(M.estado({probabilidad:x,importancia:y,financiera:y},tipo,[3,3]),esperado.replace('N',tipo==='impacto'?'importancia':'materialidad financiera'));
 }
 for(const [cuadrante,esperado] of Object.entries({Doble:'Doble materialidad',Impacto:'Material por impacto',Financiera:'Material financiero','No material':'No material'}))assert.equal(M.estado({cuadrante},'doble',[3,3]),esperado);
});

test('E34: materialidad organiza recuadros y mini tabla, con cierre accesible y sin hr', async()=>{
 const m=await vista();abrir(m);const d=panel(m),cerrar=d.querySelector('[aria-label="Cerrar"]');
 assert.equal(cerrar.className,'kit-cerrar');assert.equal(cerrar.textContent,'×');assert.equal(cerrar.type,'button');assert.equal(m.document.activeElement,cerrar);
 assert.equal(d.querySelectorAll('.kit-caja').length,0);assert.equal(d.querySelectorAll('.kit-ficha-rejilla').length,0);
 assert.ok(d.querySelector('.dim-ficha-hallazgos').querySelector('.mat-estado'));
 assert.equal(d.querySelector('.dim-ficha-estandares-fila').querySelector('h3').textContent,'Estándares relacionados');
 assert.ok(d.querySelector('.dim-ficha-estandares-fila').querySelectorAll('li').length);
 assert.deepEqual(d.querySelector('.dim-ficha-cuerpo').querySelectorAll('h3').map(n=>n.textContent),['Calificación de los grupos de interés','Calificación del taller financiero']);
 assert.equal(d.querySelectorAll('.mat-circulo').length,8);
 assert.equal(d.querySelectorAll('hr').length,0);
 d.parentNode.onclick({target:d.parentNode});assert.equal(panel(m),undefined);
});

test('E35: tablas sin cortes de palabra y desplazamiento dentro del contenedor',()=>{
 const css=read('estilos-kit-materialidad.css');
 assert.match(css,/\.mat-tabla\s*\{[^}]*overflow-x:auto/);
 assert.match(css,/\.materialidad th,\.materialidad td\s*\{[^}]*overflow-wrap:normal; word-break:normal; hyphens:manual/);
 assert.match(css,/\.materialidad th\s*\{[^}]*font-size:var\(--t-micro\); letter-spacing:\.04em; text-transform:none/);
 assert.doesNotMatch(css,/word-break:break-word/);
});
