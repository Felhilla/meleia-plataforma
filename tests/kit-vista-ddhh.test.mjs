import test from 'node:test';
import assert from 'node:assert/strict';
import {montar,boton,campo,form,submit,panel,json,registros} from './helpers/kit-estudios.mjs';
import K from '../public/kit-vista-ddhh-modelo.js';
test('II: resultados y mapa usan la empresa activa y sustituyen la marca',async()=>{
 const m=await montar();assert.match(m.contenedor.textContent,/Integración de la debida diligencia/);assert.match(m.contenedor.textContent,/Empresa Aurora tiene un procedimiento/);assert.doesNotMatch(m.contenedor.textContent,/\{empresa\}/);
 assert.ok(m.contenedor.todos().some(n=>n.tagName==='SVG'));assert.equal(m.consultas.length,4);assert.ok(m.consultas.every(([e,c])=>e==='empresa-1'&&c.startsWith('ddhh-')));
});
test('II: ficha conserva indicadores, hallazgos y brechas; limpia diálogo y teclado',async()=>{
 const m=await montar('ddhh/resultados');const eje=json('config/kit-ddhh-catalogo.json').ejes[0];boton(m.contenedor,eje.nombre).onclick();
 assert.match(panel(m).textContent,/Empresa Aurora revisa sus procesos/);assert.match(panel(m).textContent,/Verificar la mejora/);assert.ok(!panel(m).todos().some(n=>n.tagName==='SCRIPT'));
 assert.equal(m.contenedor.inert,true);m.salir();assert.equal(panel(m),undefined);assert.equal(m.document.eventos.keydown,undefined);assert.equal(m.contenedor.inert,false);
});
test('II: cambiar evaluación no mezcla indicadores ni hallazgos de otra fecha',async()=>{
 const base=registros(),nuevo={...base['ddhh-evaluaciones'][0],id:'ev-2',nombre:'Anterior',fecha:'2025-01-01'};
 const m=await montar('ddhh/resultados',true,{'ddhh-evaluaciones':[...base['ddhh-evaluaciones'],nuevo]});const select=m.contenedor.todos().find(n=>n.id==='e3-eval');select.value='ev-2';select.onchange();
 assert.doesNotMatch(m.contenedor.textContent,/tiene un procedimiento/);boton(m.contenedor,json('config/kit-ddhh-catalogo.json').ejes[0].nombre).onclick();assert.doesNotMatch(panel(m).textContent,/revisa sus procesos|Verificar la mejora/);
});
test('II: demostrador sin edición y alimentación sin consultas',async()=>{
 const m=await montar('ddhh/resultados',false);assert.ok(!m.contenedor.todos().some(n=>/Cargar nueva|Editar|Agregar/.test(n.textContent)&&['BUTTON','A'].includes(n.tagName)));
 const a=await montar('ddhh/alimentacion',false);assert.equal(a.consultas.length,0);assert.equal(boton(a.contenedor,'Agregar'),undefined);
});
test('II: formulario de puntajes rechaza fuera de escala junto al campo',async()=>{
 const m=await montar('ddhh/alimentacion');boton(m.contenedor,'Editar').onclick();campo(m.contenedor,'etapa-ocde-1').value='6';form(m.contenedor).onsubmit(submit());
 assert.equal(campo(m.contenedor,'etapa-ocde-1').attrs['aria-invalid'],'true');assert.match(m.contenedor.todos().find(n=>n.id==='ke-etapa-ocde-1-error').textContent,/0 a 5/);assert.equal(m.guardados.length,0);
});
test('II: vista previa y guardado usan empresa, colección, id y coma decimal',async()=>{
 const m=await montar('ddhh/alimentacion');boton(m.contenedor,'Editar').onclick();campo(m.contenedor,'etapa-ocde-1').value='4,2';form(m.contenedor).onsubmit(submit());assert.equal(m.guardados.length,0);await boton(m.contenedor,'Confirmar guardado').onclick();
 assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','ddhh-evaluaciones','ev-1']);assert.equal(m.guardados[0][3]['etapa-ocde-1'],4.2);
});
test('II: agregar evaluación conserva grupos y prellenado del formulario legado',async()=>{
 const m=await montar('ddhh/alimentacion');boton(m.contenedor,'Agregar').onclick();assert.equal(form(m.contenedor).todos().filter(n=>n.tagName==='FIELDSET').length,2);
 boton(m.contenedor,'Prellenar con la evaluación actual').onclick();campo(m.contenedor,'nombre').value='Nueva revisión';campo(m.contenedor,'fecha').value='2026-10-27';form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.equal(m.guardados[0][2],'r-nuevo');assert.equal(m.guardados[0][3]['etapa-ocde-1'],3);
});
test('II: estado vacío, cancelación asíncrona y error de lectura sin respaldo',async()=>{
 const m=await montar('ddhh/resultados',true,{'ddhh-evaluaciones':[]});assert.match(m.contenedor.textContent,/aún no tiene evaluaciones/);assert.ok(m.contenedor.todos().some(n=>n.tagName==='A'&&n.href.endsWith('/alimentacion')));
 const a=await montar('ddhh/resultados',true,{}, {cancelar:true});assert.equal(a.contenedor.children.length,0);
 const e=await montar('ddhh/resultados',true,{}, {listar:()=>{throw Error('Sin conexión');}});assert.match(e.contenedor.textContent,/Sin conexión/);assert.ok(!e.contenedor.todos().some(n=>n.tagName==='SVG'));
});
test('II: borrar protege referencias y el historial consulta solo este módulo',async()=>{
 const m=await montar('ddhh/alimentacion');await boton(m.contenedor,'Borrar').onclick();assert.match(m.contenedor.textContent,/tiene referencias/);assert.equal(m.borrados.length,0);
 await boton(m.contenedor,'Indicadores').onclick();await boton(m.contenedor,'Borrar').onclick();assert.equal(m.borrados.length,0);await boton(m.contenedor,'Confirmar borrado').onclick();assert.deepEqual(m.borrados[0],['empresa-1','ddhh-indicadores','indicador-1']);
 await boton(m.contenedor,'Historial de cambios').onclick();assert.equal(m.historial.length,5);assert.ok(m.historial.every(([e,o])=>e==='empresa-1'&&o.coleccion.startsWith('ddhh-')));
});
test('Escala propia: estándar inventado C–AAA y Sí/No, sin promedio de letras',async()=>{
 const cat=json('config/kit-ddhh-catalogo.json');cat.estandares[0]={id:'etapas-ocde',nombre:'Estándar inventado de prueba',escala:{tipo:'lista',valores:['C','B','A','AA','AAA']}};
 const s=K.esquema(json('config/esquemas/ddhh-evaluaciones.json'),'ddhh-evaluaciones',cat);const r=registros()['ddhh-evaluaciones'][0];cat.ejes.filter(e=>e.estandar==='etapas-ocde').forEach(e=>r[e.id]='AA');
 assert.equal(K.validar(r,s).ok,true);assert.equal(K.validar({...r,'etapa-ocde-1':'AAAA'},s).ok,false);assert.equal(K.posicion('AA',cat.estandares[0].escala),3.75);assert.equal(K.mostrar('AA',cat.estandares[0].escala),'AA');assert.equal(K.posicion('No',{tipo:'lista',valores:['No','Sí']}),0);
 const opts={config:p=>p==='config/kit-ddhh-catalogo.json'?cat:undefined};const m=await montar('ddhh/resultados',false,{'ddhh-evaluaciones':[r]},opts);assert.match(m.contenedor.textContent,/Estándar inventado de prueba/);assert.match(m.contenedor.textContent,/AA/);
 const a=await montar('ddhh/alimentacion',true,{'ddhh-evaluaciones':[r]},opts);boton(a.contenedor,'Editar').onclick();assert.equal(campo(a.contenedor,'etapa-ocde-1').tagName,'SELECT');campo(a.contenedor,'etapa-ocde-1').value='fuera';form(a.contenedor).onsubmit(submit());assert.equal(campo(a.contenedor,'etapa-ocde-1').attrs['aria-invalid'],'true');
});
test('II: escala de un estándar nuevo aplica también a sus indicadores y componentes',()=>{
 const cat=json('config/kit-ddhh-catalogo.json');cat.estandares.push({id:'inventado',nombre:'Prueba de niveles',escala:{tipo:'lista',valores:['C','B','A','AA','AAA']}});
 cat.ejes.push({id:'eje-prueba',nombre:'Proceso inventado',estandar:'inventado',componentes:[{id:'componente-prueba',nombre:'Componente inventado'}]});cat.indicadores.push({id:'indicador-prueba',eje:'eje-prueba',pregunta:'Pregunta inventada'});
 const refs={'ddhh-evaluaciones':new Set(['ev-1'])};
 for(const [c,campo,valor] of [['ddhh-indicadores','indicador','indicador-prueba'],['ddhh-componentes','componente','componente-prueba']]){
  const r={id:'prueba',evaluacion:'ev-1',[campo]:valor,calificacion:'AAA'},s=K.esquema(json('config/esquemas/'+c+'.json'),c,cat,r);
  assert.equal(K.validar(r,s,refs).ok,true);assert.equal(K.validar({...r,calificacion:5},s,refs).ok,false);
 }
});
test('II: prefiere evaluación real frente a ejemplo futuro y permite comparación explícita',async()=>{
 const rs=registros(),futura={...rs['ddhh-evaluaciones'][0],id:'ejemplo',nombre:'Ejemplo futuro',fecha:'2030-01-01',origen:'ejemplo','etapa-ocde-1':5};
 const m=await montar('ddhh/resultados',false,{'ddhh-evaluaciones':[...rs['ddhh-evaluaciones'],futura]});assert.match(m.contenedor.textContent,/tiene un procedimiento/);
 const vs=m.contenedor.todos().find(n=>n.id==='e3-vs');vs.value='ejemplo';vs.onchange();assert.match(m.contenedor.textContent,/Diferencia/);assert.ok(m.contenedor.todos().some(n=>n.className==='dim-comparada'));
});
test('II: navegar entre colecciones descarta una respuesta tardía de la anterior',async()=>{
 let liberar,demorar=false;
 const m=await montar('ddhh/alimentacion',true,{}, {listar:async(e,c,rs)=>c==='ddhh-indicadores'&&demorar?new Promise(r=>{liberar=()=>r(rs[c]);}):structuredClone(rs[c]||[])});
 demorar=true;const pendiente=boton(m.contenedor,'Indicadores').onclick();await boton(m.contenedor,'Resultados').onclick();liberar();await pendiente;
 assert.ok(boton(m.contenedor,'Agregar'));assert.match(m.contenedor.textContent,/Resultados de \{empresa\}/);assert.doesNotMatch(m.contenedor.textContent,/indicador-1/);
});

test('E27: dimensión cambia título, puntaje, estándares, hallazgos y brechas sin consultar',async()=>{
 const cat=json('config/kit-ddhh-catalogo.json'),rs=registros();
 cat.ejes.filter(e=>e.estandar==='temas-ddhh').forEach(e=>rs['ddhh-evaluaciones'][0][e.id]=4);
 rs['ddhh-dimensiones'].push({id:'dim-2',evaluacion:'ev-1',dimension:'temas-ddhh',hallazgos:'Hallazgo exclusivo de gestión',brechas:'Brecha exclusiva de gestión'});
 const m=await montar('ddhh/resultados',true,rs);
 const antes=m.consultas.length,select=m.contenedor.todos().find(n=>n.id==='e3-dimension');
 assert.equal(select.value,'etapas-ocde');
 assert.deepEqual(select.options.map(o=>o.textContent),cat.dimensiones.grandes.map(g=>g.titulo));
 const nodo=clase=>m.contenedor.todos().find(n=>n.className.split(' ').includes(clase));
 assert.equal(nodo('cifra').textContent,'3,0');
 const eje=cat.ejes[0];boton(m.contenedor,eje.nombre).onclick();boton(panel(m),'Cerrar ×').onclick();
 select.value='temas-ddhh';select.onchange();
 const dimension=cat.dimensiones.grandes.find(g=>g.id==='temas-ddhh');
 const h2=m.contenedor.todos().find(n=>n.tagName==='H2');assert.equal(h2.textContent,dimension.titulo);assert.equal(h2.tabIndex,-1);
 assert.equal(nodo('cifra').textContent,'4,0');
 assert.deepEqual(nodo('dim-estandares').children.map(n=>n.textContent),dimension.estandares);
 assert.match(nodo('hallazgos').textContent,/Hallazgo exclusivo de gestión/);
 assert.match(nodo('brechas').textContent,/Brecha exclusiva de gestión/);
 assert.doesNotMatch(nodo('dim-resultado').textContent,/tiene un procedimiento|Falta seguimiento|Integración de la debida diligencia/);
 assert.ok(!m.contenedor.todos().some(n=>n.className==='dim-radio activo'||n.className==='dim-vertice activo'));
 assert.ok(!m.contenedor.todos().some(n=>n.tagName==='BUTTON'&&n.textContent===eje.nombre));
 for(const id of ['e3-dimension','e3-eval','e3-vs']) assert.ok(m.contenedor.todos().some(n=>n.tagName==='LABEL'&&n.htmlFor===id));
 for(const id of ['e3-eval','e3-vs']) { const s=m.contenedor.todos().find(n=>n.id===id);s.value='ev-1';s.onchange(); }
 assert.equal(m.consultas.length,antes);assert.ok(m.consultas.every(([,c])=>c!=='ddhh-resultados'));
});
test('E27: Alimentación solo para edición',async()=>{
 for(const editar of [true,false]) {
  const m=await montar('ddhh/resultados',editar);
  const enlaces=m.contenedor.todos().filter(n=>n.tagName==='A'&&n.textContent==='Alimentación');
  assert.equal(enlaces.length,editar?1:0);
  if(editar) {assert.equal(enlaces[0].href,'#/ddhh/empresa-1/alimentacion');assert.equal(enlaces[0].className,'boton secundario');}
  assert.doesNotMatch(m.contenedor.textContent,/Cargar nueva evaluación|En una frase/);
 }
});
