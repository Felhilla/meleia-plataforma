import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
class Nodo {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.dataset = {}; this.style = { setProperty() {} }; this.classList = { add() {} }; this.value = ''; this._text = ''; }
  set textContent(v) { this._text = String(v); this.replaceChildren(); }
  get textContent() { return this._text + this.children.map(n => n.textContent).join(' '); }
  append(...ns) { ns.forEach(n => { n.parent = this; this.children.push(n); }); }
  replaceChildren(...ns) { this.children.forEach(n => { n.parent = null; }); this.children = []; this.append(...ns); }
  setAttribute(k, v) { this.attrs[k] = v; }
  get isConnected() { return this === this.doc.body || !!this.parent?.isConnected; }
  get options() { return this.children; }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); }
  focus() { this.doc.activeElement = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
  closest() { return this.hidden ? this : this.parent?.closest(); }
  querySelectorAll() { return this.todos().filter(n => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'SUMMARY'].includes(n.tagName)); }
}
const read = p => readFileSync(new URL('../public/' + p, import.meta.url), 'utf8');
const r1 = { id: 'r-01', codigo: 'R-01', nombre: 'Afectación del derecho al agua por disminución del caudal de fuentes usadas por la comunidad', derecho_humano: 'Derecho a la salud', ambitos: ['Operación propia'] };
const c1 = { id: 'r-01', riesgo: 'r-01', escala: 3, alcance: 2, irremediabilidad: 2, probabilidad: 'Alta', tipo_impacto: 'Potencial', vinculacion: 'Causa' };
async function montar(vista = 'matriz', editar = true, extras = {}) {
  const document = { eventos: {}, addEventListener(k, fn) { this.eventos[k] = fn; }, removeEventListener(k) { delete this.eventos[k]; }, createElement(t) { return new Nodo(t, this); } };
  document.body = new Nodo('body', document); const contenedor = new Nodo('main', document); document.body.append(contenedor);
  const consultas = [], guardados = [], borrados = [], historial = [], vistas = {};
  const registros = { riesgos: [r1], 'riesgos-calificacion': [c1], 'riesgos-medidas': [], 'riesgos-grupos': [{ id: 'g-1', nombre: 'Acueducto veredal' }, { id: 'g-2', nombre: 'Productores agrícolas' }, { id: 'g-3', nombre: 'Comerciantes' }], 'riesgos-validaciones': [{ id: 'r-01--g-1', riesgo: 'r-01', grupo: 'g-1', resultado: 'Confirma' }, { id: 'r-01--g-2', riesgo: 'r-01', grupo: 'g-2', resultado: 'Propone ajuste', propuesta_alcance: 3, comentario: '<script>Más familias afectadas</script>' }, { id: 'r-01--g-3', riesgo: 'r-01', grupo: 'g-3', resultado: 'Confirma' }], ...extras };
  const datos = { listar: async (empresa, c) => { consultas.push([empresa, c]); return structuredClone(registros[c]); }, guardar: async (...args) => { guardados.push(args); return args[3]; }, borrar: async (...args) => borrados.push(args), historial: async (...args) => { historial.push(args); return []; } };
  const root = { document, Intl, crypto: { randomUUID: () => 'nuevo' }, fetch: async p => ({ ok: true, json: async () => JSON.parse(read(p)) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  for (const f of ['kit-riesgos.js', 'kit-validacion.js', 'kit-vista-riesgos.js']) vm.runInNewContext(read(f), root);
  let vigente = true; const params = { empresa: 'empresa-1', puedeEditar: editar, rol: editar ? 'responsable' : 'demostrador', vigente: () => vigente };
  const limpiar = await vistas['riesgos/' + vista].render(contenedor, datos, params);
  return { root, document, contenedor, consultas, guardados, borrados, historial, limpiar, salir: () => { vigente = false; limpiar?.(); } };
}
const buscar = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);
const campo = (n, nombre) => n.todos().find(x => x.name === nombre);
const form = n => n.todos().find(x => x.tagName === 'FORM');
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const panel = m => m.document.body.todos().find(x => x.attrs.role === 'dialog');
test('Matriz coloca R-01 en Media|Alta y ficha muestra los tres grupos y propuesta sin cambiar oficial', async () => {
  const m = await montar(); const celda = m.contenedor.todos().find(n => n.dataset.celda === 'Media|Alta');
  assert.match(celda.textContent, /R-01/); assert.equal(m.consultas.length, 4);
  const b = buscar(celda, 'R-01'); b.focus(); await b.onclick(); const p = panel(m);
  assert.match(p.textContent, /2 de 3 grupos confirman/); assert.match(p.textContent, /Productores agrícolas/); assert.match(p.textContent, /2,67/); assert.match(p.textContent, /2,33/); assert.match(p.textContent, /<script>Más familias/); assert.ok(!p.todos().some(n => n.tagName === 'SCRIPT'));
  assert.equal(m.consultas.at(-1)[1], 'riesgos-grupos'); assert.equal(m.contenedor.inert, true);
  m.document.eventos.keydown({ key: 'Escape', preventDefault() {} }); assert.equal(panel(m), undefined); assert.equal(m.document.activeElement, b); assert.ok(!m.contenedor.inert);
});
test('Demostrador sin controles de edición en medidas y sin lecturas al abrir alimentación', async () => {
  const m = await montar('medidas', false, { 'riesgos-medidas': [{ id: 'a-01', codigo: 'A-01', titulo: 'Reparar', componente: 'componente-1', estado: 'Pendiente', riesgos: ['r-01'] }] });
  const pilar = m.contenedor.todos().find(n => n.className === 'kr-pilar'); pilar.onclick(); buscar(panel(m), 'A-01 · Reparar').onclick();
  assert.match(panel(m).textContent, /Prioridad Alta/); assert.ok(!buscar(panel(m), 'Editar acción'));
  const a = await montar('alimentacion', false); assert.equal(a.consultas.length, 0); assert.ok(!buscar(a.contenedor, 'Agregar'));
});
test('Alimentación rechaza alcance 4 en campo, con hoja y fila, y no guarda', async () => {
  const m = await montar('alimentacion'); await buscar(m.contenedor, 'Calificación técnica').onclick(); await buscar(m.contenedor, 'Editar').onclick();
  campo(m.contenedor, 'alcance').value = '4'; await form(m.contenedor).onsubmit({ preventDefault() {} });
  const error = m.contenedor.todos().find(n => n.id === 'kr-error-alcance'); assert.match(error.textContent, /Calificación técnica, fila 1: Alcance = "4".*1 a 3/); assert.equal(campo(m.contenedor, 'alcance').attrs['aria-invalid'], 'true'); assert.equal(m.guardados.length, 0);
});
test('Guardar calificación usa empresa, colección e id correctos, tras vista previa explícita', async () => {
  const m = await montar('alimentacion'); await buscar(m.contenedor, 'Calificación técnica').onclick(); await buscar(m.contenedor, 'Editar').onclick();
  campo(m.contenedor, 'alcance').value = '3'; campo(m.contenedor, 'alcance').oninput(); assert.match(m.contenedor.textContent, /2,67/);
  await form(m.contenedor).onsubmit({ preventDefault() {} }); assert.equal(m.guardados.length, 0);
  await buscar(m.contenedor, 'Confirmar guardado').onclick(); assert.deepEqual(m.guardados[0].slice(0, 3), ['empresa-1', 'riesgos-calificacion', 'r-01']); assert.equal(m.guardados[0][3].alcance, 3);
});
test('Riesgos: normaliza código y rechaza duplicado; selección de derecho desde catálogo', async () => {
  const m = await montar('alimentacion'); await buscar(m.contenedor, 'Agregar').onclick();
  campo(m.contenedor, 'codigo').value = 'r-02'; campo(m.contenedor, 'nombre').value = 'Afectación'; campo(m.contenedor, 'derecho_humano').value = 'Derecho a la salud';
  await form(m.contenedor).onsubmit({ preventDefault() {} }); await buscar(m.contenedor, 'Confirmar guardado').onclick();
  assert.equal(m.guardados[0][2], 'r-02'); assert.equal(m.guardados[0][3].codigo, 'R-02');
  await buscar(m.contenedor, 'Agregar').onclick(); campo(m.contenedor, 'codigo').value = 'R-02'; campo(m.contenedor, 'nombre').value = 'Otra'; campo(m.contenedor, 'derecho_humano').value = 'Derecho a la salud';
  await form(m.contenedor).onsubmit({ preventDefault() {} }); assert.match(m.contenedor.textContent, /Ya existe este registro/); assert.equal(m.guardados.length, 1);
});
test('Borrado protegido por referencias y confirmación propia; historial solo colecciones del módulo', async () => {
  const m = await montar('alimentacion'); await buscar(m.contenedor, 'Borrar').onclick(); assert.match(m.contenedor.textContent, /tiene referencias/); assert.equal(m.borrados.length, 0);
  await buscar(m.contenedor, 'Calificación técnica').onclick(); await buscar(m.contenedor, 'Borrar').onclick(); assert.equal(m.borrados.length, 0); await buscar(m.contenedor, 'Confirmar borrado').onclick(); assert.deepEqual(m.borrados[0], ['empresa-1', 'riesgos-calificacion', 'r-01']);
  await buscar(m.contenedor, 'Historial de cambios').onclick(); assert.equal(m.historial.length, 5); assert.ok(m.historial.every(([e, o]) => e === 'empresa-1' && o.coleccion.startsWith('riesgos')));
});
test('Estado vacío útil; limpieza quita diálogo y listener de teclado', async () => {
  const vacio = await montar('matriz', true, { riesgos: [] }); assert.match(vacio.contenedor.textContent, /aún no tiene riesgos/); assert.ok(vacio.contenedor.todos().some(n => n.tagName === 'A'));
  const m = await montar(); buscar(m.contenedor, 'R-01').onclick(); await tick(); m.salir(); assert.equal(panel(m), undefined); assert.equal(m.document.eventos.keydown, undefined);
});
test('Acción editable guarda estado, responsable y plazo, conserva sus riesgos y devuelve foco al pilar', async () => {
  const m = await montar('medidas', true, { 'riesgos-medidas': [{ id: 'a-01', codigo: 'A-01', titulo: 'Reparar', componente: 'componente-1', estado: 'Pendiente', riesgos: ['r-01'] }] });
  const pilar = m.contenedor.todos().find(n => n.className === 'kr-pilar'); pilar.focus(); pilar.onclick(); buscar(panel(m), 'A-01 · Reparar').onclick(); await buscar(panel(m), 'Editar acción').onclick();
  campo(panel(m), 'estado').value = 'Cumplida'; campo(panel(m), 'responsable').value = 'Operaciones'; campo(panel(m), 'plazo').value = '2027-04-22';
  await form(panel(m)).onsubmit({ preventDefault() {} }); await buscar(panel(m), 'Confirmar guardado').onclick();
  assert.deepEqual(m.guardados[0].slice(0, 3), ['empresa-1', 'riesgos-medidas', 'a-01']); assert.equal(m.guardados[0][3].estado, 'Cumplida'); assert.equal(m.guardados[0][3].riesgos[0], 'r-01'); assert.match(m.contenedor.textContent, /1 de 1 medidas cumplidas/);
});
test('Validación nueva guarda id compuesto y valores propuestos normalizados', async () => {
  const m = await montar('alimentacion', true, { 'riesgos-validaciones': [] }); await buscar(m.contenedor, 'Validaciones').onclick(); await buscar(m.contenedor, 'Agregar').onclick();
  campo(m.contenedor, 'riesgo').value = 'r-01'; campo(m.contenedor, 'grupo').value = 'g-2'; campo(m.contenedor, 'resultado').value = 'Propone ajuste'; campo(m.contenedor, 'propuesta_alcance').value = '3'; campo(m.contenedor, 'resultado').onchange();
  assert.match(m.contenedor.textContent, /Con el ajuste: Gravedad 2,67/); await form(m.contenedor).onsubmit({ preventDefault() {} }); await buscar(m.contenedor, 'Confirmar guardado').onclick();
  assert.equal(m.guardados[0][1], 'riesgos-validaciones'); assert.equal(m.guardados[0][2], 'r-01--g-2'); assert.equal(m.guardados[0][3].propuesta_alcance, 3);
});
test('Grupos ofrece las categorías del Módulo I y no permite inventar una categoría', async () => {
  const m = await montar('alimentacion'); await buscar(m.contenedor, 'Grupos').onclick(); await buscar(m.contenedor, 'Agregar').onclick();
  assert.match(m.contenedor.textContent, /Comunidades y asociaciones/); assert.doesNotMatch(m.contenedor.textContent, /catálogo de categorías.*pendiente/); campo(m.contenedor, 'nombre').value = 'Grupo'; campo(m.contenedor, 'fecha').value = '2026-10-22'; campo(m.contenedor, 'categoria').value = 'Inventada';
  await form(m.contenedor).onsubmit({ preventDefault() {} }); assert.equal(campo(m.contenedor, 'categoria').attrs['aria-invalid'], 'true'); assert.equal(m.guardados.length, 0);
});
test('Tab queda dentro del diálogo y al cerrar ficha de acción retorna al pilar original', async () => {
  const m = await montar('medidas', false, { 'riesgos-medidas': [{ id: 'a-01', codigo: 'A-01', titulo: 'Reparar', componente: 'componente-1', estado: 'Pendiente' }] });
  const pilar = m.contenedor.todos().find(n => n.className === 'kr-pilar'); pilar.focus(); pilar.onclick(); buscar(panel(m), 'A-01 · Reparar').onclick();
  const cerrar = panel(m).todos().find(n => n.attrs['aria-label'] === 'Cerrar'); cerrar.focus(); let prevenido = false;
  m.document.eventos.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevenido = true; } }); assert.equal(prevenido, true);
  cerrar.onclick(); assert.equal(m.document.activeElement, pilar);
});

test('E33: accesos al pie según permiso y regreso desde ambas vistas secundarias', async () => {
  for (const editar of [false, true]) {
    const m = await montar('matriz', editar);
    const links = m.contenedor.todos().filter(n => n.tagName === 'A');
    assert.deepEqual(links.map(n => n.textContent), editar ? ['Medidas de gestión', 'Alimentación'] : ['Medidas de gestión']);
    assert.ok(links.every(n => n.className === 'boton secundario'));
    for (const vista of ['medidas', 'alimentacion']) {
      const secundaria = await montar(vista, editar);
      const regreso = secundaria.contenedor.children[0];
      assert.equal(regreso.textContent, '← Volver a la matriz');
      assert.equal(regreso.href, '#/e/empresa-1/riesgos/matriz');
    }
  }
});
test('E33: sin banda de cifras, ejes accesibles y cuatro filtros dentro de details cerrado', async () => {
  const riesgos = [r1, ...[2, 3, 4].map(n => ({ ...r1, id: 'r-0' + n, codigo: 'R-0' + n, nombre: 'Riesgo ficticio ' + n, derecho_humano: 'Otro derecho', ambitos: ['Otro grupo'] }))];
  const m = await montar('matriz', true, { riesgos, 'riesgos-calificacion': [c1, { ...c1, riesgo: 'r-02', probabilidad: 'Media' }, { ...c1, riesgo: 'r-03', escala: 1, alcance: 1, irremediabilidad: 1, probabilidad: 'Baja' }] });
  const banda = m.contenedor.todos().find(n => n.className === 'kr-resumen');
  assert.equal(banda, undefined);
  assert.doesNotMatch(read('estilos-kit-riesgos.css'), /kr-resumen/);
  const mapa = m.contenedor.todos().find(n => n.attrs.role === 'table');
  assert.equal(mapa.todos().filter(n => n.attrs.role === 'cell').length, 9);
  assert.deepEqual(mapa.todos().filter(n => n.attrs.role === 'rowheader').map(n => n.textContent), ['3 · Alta', '2 · Media', '1 · Baja']);
  assert.deepEqual(mapa.todos().filter(n => n.attrs.role === 'columnheader').map(n => n.textContent), ['1 · Baja', '2 · Media', '3 · Alta']);
  const lista = m.contenedor.todos().find(n => n.className === 'kr-lista');
  assert.equal(lista.tagName, 'DETAILS'); assert.ok(!lista.open); assert.equal(lista.children[0].textContent, 'Ver lista de riesgos');
  const filtros = lista.todos().filter(n => n.tagName === 'SELECT'); assert.equal(filtros.length, 4);
  for (const [i, valor, esperado] of [[0, 'Derecho a la salud', 'R-01'], [1, 'Operación propia', 'R-01'], [2, 'Media', 'R-02'], [2, 'Sin calificación', 'R-04'], [3, 'Todos confirman', null], [3, 'Con ajustes', 'R-01']]) {
    filtros.forEach(n => { n.value = ''; }); filtros[i].value = valor; filtros[i].onchange();
    const botones = lista.todos().filter(n => n.tagName === 'BUTTON');
    assert.equal(botones.length, esperado ? 1 : 0);
    if (esperado) assert.ok(botones[0].textContent.startsWith(esperado));
  }
});
test('E33: ficha con niveles, criterios, medidas por pilar, validación y textos seguros', async () => {
  const m = await montar('matriz', true, { riesgos: [{ ...r1, nombre: '<script>Nombre ficticio</script>', descripcion: 'Primera línea\nSegunda línea' }], 'riesgos-medidas': [
    { codigo: 'A-01', titulo: '<script>Medida ficticia</script>', componente: 'componente-1', estado: 'Pendiente', riesgos: ['r-01'] },
    { codigo: 'A-02', titulo: 'Otra medida', componente: 'componente-2', estado: 'Cumplida', riesgos: ['r-01'] },
    { codigo: 'A-03', titulo: 'Tercera medida', componente: 'componente-1', estado: 'En curso', riesgos: ['r-01'] },
    { codigo: 'A-04', titulo: 'No vinculada', componente: 'componente-1', estado: 'Pendiente', riesgos: ['r-02'] }
  ] });
  const origen = buscar(m.contenedor, 'R-01'); origen.focus(); await origen.onclick(); const p = panel(m);
  const tabla = p.todos().find(n => n.className === 'kit-mini-tabla kr-tecnica');
  const filas = tabla.todos().filter(n => n.tagName === 'TR'), valores = tabla.todos().filter(n => n.tagName === 'TD');
  assert.equal(filas.length, 7); assert.equal(valores.length, 6);
  assert.deepEqual(valores.map(n => n.className), ['kr-media','kr-alta','kr-alta','kr-alta','kr-media','kr-media']);
  assert.deepEqual(valores.map(n => n.textContent), ['Media · promedio 2,3','Alta','Alta','3 · Alta','2 · Media','2 · Media']);
  assert.equal(filas[3].children[0].attrs.colspan, '2');
  assert.equal(filas[3].textContent, 'Criterios de gravedad');
  assert.equal(tabla.todos().filter(n => n.scope === 'row').length, 6);
  assert.ok(!tabla.todos().some(n => n.tagName === 'SPAN'));
  const pilares = p.todos().filter(n => n.className === 'kit-ficha-dato' && n.children[0]?.textContent === 'Pilar');
  assert.equal(pilares.length, 2); assert.match(pilares[0].textContent, /Fortalecimiento del compromiso organizacional.*A-01.*A-03/);
  assert.match(pilares[1].textContent, /Articulación estructurada.*A-02/); assert.doesNotMatch(p.textContent, /A-04/);
  assert.ok(p.todos().some(n => n.textContent === 'Validado' && n.className === 'kr-etiqueta kr-baja'));
  assert.ok(p.todos().some(n => n.className?.split(' ').includes('kr-validacion-detalle') && n.textContent === 'Productores agrícolas: Propone ajuste'));
  const mas = p.todos().find(n => n.tagName === 'DETAILS'); assert.ok(!mas.open); assert.equal(mas.children[0].textContent, 'Más información'); assert.match(mas.textContent, /Con el ajuste/);
  assert.match(p.textContent, /<script>Nombre ficticio/); assert.ok(!p.todos().some(n => n.tagName === 'SCRIPT'));
  assert.equal(p.todos().find(n => n.className === 'kr-descripcion').textContent, 'Primera línea\nSegunda línea');
  const resumen = mas.children[0]; resumen.focus(); let atrapado = false;
  m.document.eventos.keydown({ key: 'Tab', preventDefault() { atrapado = true; } });
  assert.ok(atrapado); assert.equal(m.document.activeElement, p.todos().find(n => n.attrs['aria-label'] === 'Cerrar'));
  p.todos().find(n => n.attrs['aria-label'] === 'Cerrar').focus(); m.document.eventos.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} }); assert.equal(m.document.activeElement, resumen);
  m.document.eventos.keydown({ key: 'Escape', preventDefault() {} }); assert.equal(m.document.activeElement, origen);
});
test('E33: sin validar es gris, sin medidas y sin calificar; criterio bajo conserva el número', async () => {
  const m = await montar('matriz', true, { 'riesgos-validaciones': [], 'riesgos-calificacion': [] });
  await buscar(m.contenedor, `${r1.codigo} · ${r1.nombre}`).onclick(); const p = panel(m);
  assert.equal(p.todos().filter(n => n.tagName === 'TD' && n.textContent === 'Sin calificar' && !n.className).length, 6);
  assert.match(p.textContent, /Sin medidas asociadas/); assert.match(p.textContent, /Sin calificar/);
  assert.ok(p.todos().some(n => n.textContent === 'Sin validar' && n.className === 'kr-etiqueta kr-sin-validar'));
  assert.ok(!p.todos().some(n => n.textContent === 'Validado'));
  const bajo = await montar('matriz', true, { 'riesgos-calificacion': [{ ...c1, escala: 1, alcance: 1, irremediabilidad: 1, probabilidad: 'Baja' }], 'riesgos-validaciones': [{ riesgo: 'r-01', grupo: 'g-1', resultado: 'Confirma' }] });
  await buscar(bajo.contenedor, 'R-01').onclick();
  assert.ok(panel(bajo).todos().some(n => n.textContent === 'Validado' && n.className === 'kr-etiqueta kr-baja'));
  assert.ok(panel(bajo).todos().some(n => n.className?.split(' ').includes('kr-validacion-detalle') && n.textContent === 'Acueducto veredal: Confirma'));
  assert.equal(panel(bajo).todos().filter(n => n.tagName === 'TD' && n.className === 'kr-baja' && n.textContent === '1 · Baja').length, 3);
});

test('E34: riesgo usa recuadros ordenados, mini tablas y cierre común sin hr',async()=>{
 const m=await montar();const origen=buscar(m.contenedor,'R-01');origen.focus();await origen.onclick();const p=panel(m),cerrar=p.todos().find(n=>n.attrs['aria-label']==='Cerrar');
 assert.equal(cerrar.className,'kit-cerrar');assert.equal(cerrar.textContent,'×');assert.equal(cerrar.type,'button');assert.equal(m.document.activeElement,cerrar);
 assert.deepEqual(p.todos().filter(n=>n.className==='kit-caja').slice(0,5).map(n=>n.children[0].textContent),['Descripción del riesgo','Calificación técnica','Afectación','Medidas de gestión','Validación de los grupos de interés']);
 const tablas=p.todos().filter(n=>n.className==='kit-mini-tabla kr-tecnica');assert.equal(tablas.length,1);assert.equal(tablas[0].todos().filter(n=>n.tagName==='TR').length,7);
 assert.ok(!p.todos().some(n=>n.tagName==='HR'));p.parent.onclick({target:p.parent});assert.equal(panel(m),undefined);assert.equal(m.document.activeElement,origen);
});

test('E35: tabla técnica conserva bordes y fondos por nivel en ambos temas',()=>{
 const css=read('estilos-kit-riesgos.css');
 assert.match(css,/\.kit-ficha \.kr-tecnica th, \.kit-ficha \.kr-tecnica td \{ border:1px solid var\(--borde\); font-weight:700/);
 for(const nivel of ['alta','media','baja'])assert.ok(css.includes('.kr-'+nivel+' { background: var(--'+nivel+'-fondo); color: var(--'+nivel+'); }'));
 assert.doesNotMatch(css,/kr-criterio|kr-resumen/);
});
