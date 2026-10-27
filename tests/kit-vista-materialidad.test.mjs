import test from 'node:test';
import assert from 'node:assert/strict';
import {montar,boton,campo,form,submit,panel} from './helpers/kit-estudios.mjs';
for(const sub of ['doble','impacto','financiera'])test('III: '+sub+' pinta empresa, abre ficha y conserva solo cruce con estándares',async()=>{
 const m=await montar('materialidad/'+sub,false);assert.ok(m.contenedor.todos().some(n=>n.tagName==='SVG'));
 const punto=m.contenedor.todos().find(n=>n.id==='mat-punto-tema-01');assert.match(punto.attrs['aria-label'],/Continuidad de Empresa Aurora/);punto.onclick();
 assert.match(panel(m).textContent,/Continuidad de Empresa Aurora/);assert.match(panel(m).textContent,/Estándares relacionados/);assert.doesNotMatch(panel(m).textContent,/Riesgos DDHH|plan de acción|\{empresa\}/);assert.ok(panel(m).todos().some(n=>n.tagName==='A'&&n.href==='#/ddhh/empresa-1/estandares'));
 assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-temas','materialidad-impacto','materialidad-financiera']);assert.ok(m.consultas.every(x=>x[0]==='empresa-1'));
 const cal=panel(m).todos().find(n=>n.dataset.sub==='calificacion');cal.onclick();assert.match(panel(m).textContent,/Calificación/);
 m.document.eventos.keydown({key:'Escape',preventDefault(){}});assert.equal(panel(m),undefined);m.salir();assert.equal(m.document.eventos.keydown,undefined);assert.equal(m.contenedor.inert,false);
});
test('III: no hay alimentación para demostrador; estado vacío con enlace solo para responsable',async()=>{
 const a=await montar('materialidad/alimentacion',false);assert.equal(a.consultas.length,0);assert.equal(boton(a.contenedor,'Agregar'),undefined);
 const m=await montar('materialidad/doble',true,{'materialidad-temas':[]});assert.match(m.contenedor.textContent,/aún no tiene datos/);assert.ok(m.contenedor.todos().some(n=>n.href==='#/materialidad/empresa-1/alimentacion'));
 const d=await montar('materialidad/doble',false,{'materialidad-temas':[]});assert.ok(!d.contenedor.todos().some(n=>n.tagName==='A'));
});
test('III: valor fuera de escala y guardado con claves correctas',async()=>{
 const m=await montar('materialidad/alimentacion');await boton(m.contenedor,'Calificaciones de impacto').onclick();boton(m.contenedor,'Editar').onclick();campo(m.contenedor,'alcance').value='8';form(m.contenedor).onsubmit(submit());assert.equal(campo(m.contenedor,'alcance').attrs['aria-invalid'],'true');assert.match(m.contenedor.todos().find(n=>n.id==='ke-alcance-error').textContent,/0 a 5/);assert.equal(m.guardados.length,0);
 campo(m.contenedor,'alcance').value='4,5';form(m.contenedor).onsubmit(submit());assert.equal(m.guardados.length,0);await boton(m.contenedor,'Confirmar guardado').onclick();assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','materialidad-impacto','i-0']);assert.equal(m.guardados[0][3].alcance,4.5);
});
test('III: falta de calificaciones no calcula con un universo incompleto',async()=>{
 const m=await montar('materialidad/doble',true,{'materialidad-impacto':[]});assert.match(m.contenedor.textContent,/Faltan calificaciones/);assert.ok(!m.contenedor.todos().some(n=>n.tagName==='SVG'));
});
test('III: navegación obsoleta no pinta; error al guardar conserva formulario y permite reintentar',async()=>{
 const cancelada=await montar('materialidad/doble',true,{}, {cancelar:true});assert.equal(cancelada.contenedor.children.length,0);
 const m=await montar('materialidad/alimentacion',true,{}, {errorGuardar:true});boton(m.contenedor,'Editar').onclick();form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.match(m.contenedor.textContent,/No se pudo guardar/);assert.equal(campo(m.contenedor,'nombre').value,'Continuidad de {empresa}');assert.equal(boton(m.contenedor,'Confirmar guardado').disabled,false);
});
test('III: cerrar devuelve el foco al tema y Tab permanece dentro de la ficha',async()=>{
 const m=await montar('materialidad/doble');m.contenedor.todos().find(n=>n.id==='mat-punto-tema-01').onclick();const cerrar=boton(panel(m),'Cerrar ×');cerrar.focus();let previno=false;
 m.document.eventos.keydown({key:'Tab',shiftKey:true,preventDefault(){previno=true;}});assert.equal(previno,true);assert.notEqual(m.document.activeElement,cerrar);
 cerrar.onclick();assert.equal(m.document.activeElement.id,'mat-punto-tema-01');assert.equal(m.document.activeElement.isConnected,true);
});
test('III: borrar exige confirmación, protege temas usados y consulta historial del módulo',async()=>{
 const m=await montar('materialidad/alimentacion');await boton(m.contenedor,'Borrar').onclick();assert.match(m.contenedor.textContent,/tiene referencias/);
 await boton(m.contenedor,'Calificaciones financieras').onclick();await boton(m.contenedor,'Borrar').onclick();assert.equal(m.borrados.length,0);await boton(m.contenedor,'Confirmar borrado').onclick();assert.deepEqual(m.borrados[0],['empresa-1','materialidad-financiera','f-0']);
 await boton(m.contenedor,'Historial de cambios').onclick();assert.equal(m.historial.length,4);assert.ok(m.historial.every(([e,o])=>e==='empresa-1'&&o.coleccion.startsWith('materialidad-')));
});
