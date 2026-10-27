import test from 'node:test';
import assert from 'node:assert/strict';
import {montar,boton,campo,form,submit,panel} from './helpers/kit-estudios.mjs';
import {preparar} from '../scripts/kit-materialidad-registros.mjs';
const listas=await preparar(new URL('fixtures/materialidad-publicada-muestra.json',import.meta.url));
const vista=(sub='doble',editar=true,extra={},opts={})=>montar('materialidad/'+sub,editar,{...structuredClone(listas),...extra},opts);
test('III: resultado calculado, bloques por tipo, ESG, GRI y convergencia ordenada',async()=>{
 const m=await vista();assert.match(m.contenedor.textContent,/10 temas materiales: 4 de doble materialidad, 3 de impacto y 3 financieros/);
 for(const tipo of ['Doble','Impacto','Financiera']){const b=m.contenedor.todos().find(n=>n.dataset.tipo===tipo);assert.deepEqual(b.todos().filter(n=>n.tagName==='BUTTON').map(n=>n.textContent),listas['materialidad-temas'].filter(t=>t.tipo===tipo).map(t=>t.nombre));assert.match(b.textContent,/GRI de muestra/);}
 const filas=m.contenedor.querySelector('tbody').children;assert.deepEqual(filas.map(r=>r.children.at(-1).textContent),['3','3','2','1']);
 assert.match(m.contenedor.textContent,/umbral de impacto 2,7 y financiero 2,8/);assert.match(m.contenedor.textContent,/Fuente: Informe de muestra de Empresa Aurora/);
 assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-resumen','materialidad-temas','materialidad-convergencia']);assert.ok(m.consultas.every(x=>x[0]==='empresa-1'));
});
test('III: ficha sin descripción informa la ausencia; reemplazo seguro, foco, Tab, Escape y limpieza',async()=>{
 const m=await vista();const tema=id=>m.contenedor.todos().find(n=>n.id==='mat-tema-'+id);
 tema('tema-02').onclick();assert.match(panel(m).textContent,/El informe no incluye la ficha de este tema/);assert.equal(m.contenedor.inert,true);
 let previno=false;m.document.eventos.keydown({key:'Tab',preventDefault(){previno=true;}});assert.ok(previno);assert.equal(m.document.activeElement,boton(panel(m),'Cerrar ×'));
 m.document.eventos.keydown({key:'Escape',preventDefault(){}});assert.equal(panel(m),undefined);assert.equal(m.document.activeElement,tema('tema-02'));assert.equal(m.contenedor.inert,false);
 tema('tema-01').onclick();assert.match(panel(m).textContent,/Empresa Aurora desarrolla/);assert.doesNotMatch(panel(m).textContent,/\{empresa\}/);m.salir();assert.equal(panel(m),undefined);assert.equal(m.document.eventos.keydown,undefined);
});
test('III: impacto muestra umbral, probabilidades y tabla con los mismos valores',async()=>{
 const m=await vista('impacto');assert.match(m.contenedor.textContent,/Umbral de impacto: 2,7/);
 const barras=m.contenedor.querySelectorAll('.mat-pista');assert.equal(barras.length,10);assert.match(barras[0].attrs['aria-label'],/4,8 de 5; umbral 2,7/);assert.equal(barras[0].children[1].style.left,'54%');
 assert.equal(m.contenedor.querySelector('tbody').children.length,10);assert.match(m.contenedor.textContent,/Probabilidad: 4,1/);assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-resumen','materialidad-impacto-top']);
});
test('III: financiero ordena cada top por índice y muestra barras sobre 25',async()=>{
 const rs=structuredClone(listas['materialidad-financiera-top']).reverse();const m=await vista('financiera',true,{'materialidad-financiera-top':rs});
 assert.match(m.contenedor.textContent,/Índice = impacto promedio × probabilidad/);const barras=m.contenedor.querySelectorAll('.mat-pista');assert.equal(barras.length,10);assert.match(barras[0].attrs['aria-label'],/16,65 de 25/);assert.equal(parseFloat(barras[0].children[0].style.width),16.65/25*100);assert.match(m.contenedor.textContent,/Impacto promedio: 4,5 · Probabilidad: 3,7/);assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-resumen','materialidad-financiera-top']);
});
test('III: demostrador no edita; vacíos con enlace solo para responsable',async()=>{
 const m=await vista('alimentacion',false);assert.equal(m.consultas.length,0);assert.equal(boton(m.contenedor,'Agregar'),undefined);
 for(const editar of [true,false]){const v=await vista('doble',editar,{'materialidad-temas':[]});assert.match(v.contenedor.textContent,/aún no tiene datos/);assert.equal(v.contenedor.todos().some(n=>n.tagName==='A'),editar);}
});
test('III: alimentación rechaza índice 26 y guarda empresa, colección e id correctos',async()=>{
 const m=await vista('alimentacion');await boton(m.contenedor,'Top financiero').onclick();boton(m.contenedor,'Editar').onclick();campo(m.contenedor,'indice').value='26';form(m.contenedor).onsubmit(submit());assert.equal(campo(m.contenedor,'indice').attrs['aria-invalid'],'true');assert.equal(m.guardados.length,0);
 campo(m.contenedor,'indice').value='16,65';form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','materialidad-financiera-top','rentabilidad-01']);assert.equal(m.guardados[0][3].indice,16.65);
});
test('III: resumen único conserva su clave; alta vacía usa resumen',async()=>{
 const m=await vista('alimentacion');assert.equal(boton(m.contenedor,'Agregar'),undefined);assert.deepEqual(m.consultas.map(x=>x[1]),['materialidad-resumen']);boton(m.contenedor,'Editar').onclick();assert.equal(campo(m.contenedor,'id').disabled,true);form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','materialidad-resumen','resumen']);
 const vacia=await vista('alimentacion',true,{'materialidad-resumen':[]});boton(vacia.contenedor,'Agregar').onclick();assert.equal(campo(vacia.contenedor,'id').value,'resumen');assert.equal(campo(vacia.contenedor,'id').disabled,true);
});
test('III: navegación obsoleta no pinta; error de guardado conserva formulario',async()=>{
 const c=await vista('doble',true,{}, {cancelar:true});assert.equal(c.contenedor.children.length,0);
 const m=await vista('alimentacion',true,{}, {errorGuardar:true});boton(m.contenedor,'Editar').onclick();form(m.contenedor).onsubmit(submit());await boton(m.contenedor,'Confirmar guardado').onclick();assert.match(m.contenedor.textContent,/No se pudo guardar/);assert.equal(boton(m.contenedor,'Confirmar guardado').disabled,false);assert.equal(campo(m.contenedor,'id').value,'resumen');
});
test('III: borrado confirmado e historial solo de las cinco colecciones actuales',async()=>{
 const m=await vista('alimentacion');await boton(m.contenedor,'Temas materiales').onclick();await boton(m.contenedor,'Borrar').onclick();assert.equal(m.borrados.length,0);await boton(m.contenedor,'Confirmar borrado').onclick();assert.deepEqual(m.borrados[0],['empresa-1','materialidad-temas','tema-01']);await boton(m.contenedor,'Historial de cambios').onclick();assert.deepEqual(m.historial.map(x=>x[1].coleccion),Object.keys(listas));
});
