import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

class Nodo {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.style = {}; this.value = ''; this._text = ''; this.classList = { add() {} }; }
  set textContent(v) { this._text = String(v); this.replaceChildren(); } get textContent() { return this._text + this.children.map(x => x.textContent).join(' '); }
  append(...xs) { xs.forEach(x => { x.parent = this; this.children.push(x); }); } replaceChildren(...xs) { this.children = []; this.append(...xs); }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k]; } focus() { this.doc.activeElement = this; } remove() { this.parent?.children.splice(this.parent.children.indexOf(this), 1); }
  get options() { return this.children; } get isConnected() { return this === this.doc.body || !!this.parent?.isConnected; } todos() { return this.children.flatMap(x => [x, ...x.todos()]); }
  querySelector(selector) { return this.todos().find(n => selector.startsWith('[name=') ? n.name === selector.match(/"(.+)"/)[1] : selector.startsWith('#') ? n.id === selector.slice(1) : false); }
}
function montar(borrador = {}) {
  const document = { createElement: t => new Nodo(t, document) }; document.body = new Nodo('body', document);
  const memoria = new Map(Object.entries(borrador)); const storage = { getItem: k => memoria.get(k) || null, setItem: (k, v) => memoria.set(k, v), removeItem: k => memoria.delete(k) };
  const root = { document, sessionStorage: storage, localStorage: storage };
  vm.runInNewContext(readFileSync(new URL('../public/kit-cuestionario.js', import.meta.url), 'utf8'), root);
  const host = new Nodo('main', document); document.body.append(host); return { root, host, memoria, document };
}
const boton = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);

test('motor: valida el paso actual, conserva el estado y restaura el borrador', async () => {
  const m = montar(); let guardado = 0;
  const opciones = { estado: { dato: '' }, persistencia: { clave: 'kq:prueba', almacen: 'sesion' }, pasos: [
    { titulo: 'Dato', pintar(z, _e, api) { api.texto(z, 'dato', { pregunta: 'Dato' }); }, validar: e => e.dato ? [] : [{ campo: 'dato', mensaje: 'Es obligatorio.' }] },
    { titulo: 'Revisión', revision: true }
  ], revisar: () => ({ secciones: [], nuevos: 1, actualizados: 0, errores: [] }), guardar: async () => { guardado++; } };
  m.root.KitCuestionario.montar(m.host, opciones);
  boton(m.host, 'Siguiente').onclick(); const input = m.host.todos().find(n => n.name === 'dato'); assert.equal(input.attrs['aria-invalid'], 'true'); assert.match(m.host.textContent, /Es obligatorio/);
  input.value = 'Conservado'; input.oninput(); boton(m.host, 'Siguiente').onclick(); assert.match(m.host.textContent, /Paso 2 de 2/); boton(m.host, 'Anterior').onclick(); assert.equal(m.host.todos().find(n => n.name === 'dato').value, 'Conservado');
  const re = montar(Object.fromEntries(m.memoria)); re.root.KitCuestionario.montar(re.host, opciones); assert.equal(re.host.todos().find(n => n.name === 'dato').value, 'Conservado');
  boton(re.host, 'Siguiente').onclick(); await boton(re.host, 'Guardar').onclick(); assert.equal(guardado, 1); assert.equal(re.memoria.has('kq:prueba'), false);
});

test('motor: la revisión bloquea guardar y enlaza al paso con error', () => {
  const m = montar(); let guardado = false;
  m.root.KitCuestionario.montar(m.host, { estado: {}, pasos: [{ titulo: 'Primero', pintar() {} }, { titulo: 'Revisión', revision: true }], revisar: () => ({ secciones: [], nuevos: 0, actualizados: 0, errores: [{ paso: 0, campo: 'x', mensaje: 'Falta x.' }] }), guardar: async () => { guardado = true; } });
  boton(m.host, 'Siguiente').onclick(); assert.equal(boton(m.host, 'Guardar').disabled, true); boton(m.host, 'Ir al paso').onclick(); assert.match(m.host.textContent, /Paso 1 de 2/); assert.equal(guardado, false);
});
