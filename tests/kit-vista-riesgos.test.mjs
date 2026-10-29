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
  querySelectorAll() { return this.todos().filter(n => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(n.tagName)); }
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
  for (const f of ['kit-riesgos.js', 'kit-validacion.js', 'kit-vista-carga-excel.js', 'kit-vista-riesgos.js']) vm.runInNewContext(read(f), root);
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
  const cerrar = buscar(panel(m), 'Cerrar'); cerrar.focus(); let prevenido = false;
  m.document.eventos.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevenido = true; } }); assert.equal(prevenido, true);
  cerrar.onclick(); assert.equal(m.document.activeElement, pilar);
});
