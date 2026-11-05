import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Carga from '../public/kit-carga-excel.js';
import XLSX from '../public/vendor/xlsx.full.min.js';

const leer = ruta => readFileSync(new URL('../public/' + ruta, import.meta.url), 'utf8');
const json = ruta => JSON.parse(leer(ruta));
const colecciones = ['riesgos', 'riesgos-calificacion', 'riesgos-grupos', 'riesgos-validaciones', 'riesgos-medidas'];
class Nodo {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.dataset = {}; this.style = { setProperty() {} }; this.classList = { add() {} }; this.value = ''; this._text = ''; }
  set textContent(v) { this._text = String(v); this.replaceChildren(); } get textContent() { return this._text + this.children.map(n => n.textContent).join(' '); }
  append(...ns) { ns.forEach(n => { n.parent = this; this.children.push(n); }); } replaceChildren(...ns) { this.children.forEach(n => { n.parent = null; }); this.children = []; this.append(...ns); }
  setAttribute(k, v) { this.attrs[k] = String(v); } get options() { return this.children; } get isConnected() { return this === this.doc.body || !!this.parent?.isConnected; }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); } focus() { this.doc.activeElement = this; } remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
  closest() { return this.hidden ? this : this.parent?.closest(); } querySelectorAll() { return this.todos().filter(n => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'SUMMARY'].includes(n.tagName)); }
  querySelector(selector) { return this.todos().find(n => selector.startsWith('[name=') ? n.name === selector.match(/"(.+)"/)[1] : selector.startsWith('#') ? n.id === selector.slice(1) : false); }
}
const contextoExcel = existentes => ({ cfg: json('config/kit-riesgos-config.json'), derechos: json('data/derechos.json'), empresa: 'empresa-prueba', esquemas: Object.fromEntries(colecciones.map(c => [c, json('config/esquemas/' + c + '.json')])), existentes: Object.fromEntries(colecciones.map(c => [c, existentes[c] || []])) });
function libro() { const b = XLSX.utils.book_new(), agregar = (n, filas) => XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(filas), n);
  agregar('Riesgos', [['Código', 'Nombre', 'Descripción', 'Derecho humano afectado', 'Ámbito', 'Localización', 'Actividades que lo generan', 'Medidas de control existentes', 'Análisis de controles'], ['R-07', 'Riesgo inventado', '', 'Derecho a la vida', 'Operación propia', '', '', '', '']]);
  agregar('Calificación técnica', [['Riesgo', 'Escala', 'Alcance', 'Irremediabilidad', 'Probabilidad', 'Tipo de impacto', 'Vinculación', 'Justificación'], ['R-07', 3, 2, 1, 'Alta', 'Potencial', 'Causa', 'Justificación']]);
  agregar('Grupos', [['Nombre del grupo', 'Categoría de actor', 'Número de participantes', 'Fecha de la sesión'], ['Grupo inventado', 'Comunidades y asociaciones', 2, '2026-10-11']]);
  agregar('Validaciones', [['Riesgo', 'Grupo', 'Resultado', 'Escala propuesta', 'Alcance propuesta', 'Irremediabilidad propuesta', 'Probabilidad propuesta', 'Tipo de impacto propuesta', 'Vinculación propuesta', 'Justificación propuesta', 'Comentario del grupo'], ['R-07', 'Grupo inventado', 'Confirma', '', '', '', '', '', '', '', '']]);
  agregar('Medidas', [['Código', 'Título', 'Descripción', 'Componente', 'Riesgos que atiende', 'Responsable (área o cargo; sin nombres personales)', 'Plazo', 'Estado'], ['A-07', 'Medida inventada', '', 'Fortalecimiento del compromiso organizacional', 'R-07', 'Área inventada', '2027-01-01', 'Pendiente']]);
  return XLSX.write(b, { type: 'array', bookType: 'xlsx' });
}
async function montar({ editar = true, registros = {}, memoria = new Map(), uuid = 'grupo-fijo' } = {}) {
  const document = { eventos: {}, addEventListener(k, fn) { this.eventos[k] = fn; }, removeEventListener(k) { delete this.eventos[k]; }, createElement(t) { return new Nodo(t, this); } };
  document.body = new Nodo('body', document); const contenedor = new Nodo('main', document); document.body.append(contenedor);
  const base = { riesgos: [], 'riesgos-calificacion': [], 'riesgos-grupos': [], 'riesgos-validaciones': [], 'riesgos-medidas': [], ...registros }, guardados = [], guardadosUno = [], vistas = [];
  const storage = { getItem: k => memoria.get(k) || null, setItem: (k, v) => memoria.set(k, v), removeItem: k => memoria.delete(k) };
  const datos = { listar: async (_empresa, c) => structuredClone(base[c]), guardar: async (...args) => { guardadosUno.push(args); return args[3]; }, guardarVarios: async (_empresa, c, lista) => { guardados.push([c, structuredClone(lista)]); return lista; }, borrar: async () => {}, historial: async () => [] };
  const root = { document, Intl, crypto: { randomUUID: () => uuid }, sessionStorage: storage, localStorage: storage, fetch: async p => ({ ok: true, json: async () => json(p) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  for (const f of ['kit-riesgos.js', 'kit-validacion.js', 'kit-cuestionario.js', 'kit-vista-carga-excel.js', 'kit-vista-riesgos.js']) vm.runInNewContext(leer(f), root);
  let vigente = true; const limpiar = await vistas['riesgos/alimentacion'].render(contenedor, datos, { empresa: 'empresa-prueba', puedeEditar: editar, vigente: () => vigente });
  return { contenedor, guardados, guardadosUno, memoria, limpiar, salir: () => { vigente = false; limpiar?.(); } };
}
const tick = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
const boton = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);
const campo = (n, nombre) => n.todos().find(x => x.name === nombre);
const escribir = (m, nombre, valor, evento = 'oninput') => { const c = campo(m.contenedor, nombre); assert.ok(c, `falta ${nombre}`); c.value = valor; c[evento](); return c; };
const elegir = (m, nombre, valor) => escribir(m, nombre, valor, 'onchange');
const radio = (m, nombre, valor) => { const c = m.contenedor.todos().find(x => x.name === nombre && x.value === String(valor)); assert.ok(c, `falta ${nombre}:${valor}; ${m.contenedor.textContent}`); c.checked = true; c.onchange(); return c; };
async function abrirNuevo(m) { boton(m.contenedor, 'Responder el cuestionario').onclick(); boton(m.contenedor, 'Agregar riesgo').onclick(); await tick(); }
function llenarRiesgo(m) { escribir(m, 'riesgo.codigo', 'R-07'); escribir(m, 'riesgo.nombre', 'Riesgo inventado'); elegir(m, 'riesgo.derecho_humano', 'Derecho a la vida'); const ambitos = campo(m.contenedor, 'riesgo.ambitos'); ambitos.options.find(o => o.value === 'Operación propia').selected = true; ambitos.onchange(); assert.match(m.memoria.get('kq:riesgos:empresa-prueba:nuevo'), /R-07/); }
function siguiente(m) { const b = boton(m.contenedor, 'Siguiente'); assert.ok(b); b.onclick(); }
function llenarCalificacion(m) { radio(m, 'calificacion.escala', 3); radio(m, 'calificacion.alcance', 2); radio(m, 'calificacion.irremediabilidad', 1); elegir(m, 'calificacion.probabilidad', 'Alta'); elegir(m, 'calificacion.tipo_impacto', 'Potencial'); elegir(m, 'calificacion.vinculacion', 'Causa'); escribir(m, 'calificacion.justificacion', 'Justificación'); }
async function llenarCaminoCompleto(m) {
  llenarRiesgo(m); siguiente(m); llenarCalificacion(m); siguiente(m);
  elegir(m, 'validacion.grupoSeleccion', '__nuevo__'); await tick(); escribir(m, 'grupoNuevo.nombre', 'Grupo inventado'); elegir(m, 'grupoNuevo.categoria', 'Comunidades y asociaciones'); escribir(m, 'grupoNuevo.participantes', '2'); escribir(m, 'grupoNuevo.fecha', '2026-10-11'); elegir(m, 'validacion.resultado', 'Confirma'); siguiente(m);
  boton(m.contenedor, 'Agregar medida').onclick(); escribir(m, 'medidas.0.codigo', 'A-07'); escribir(m, 'medidas.0.titulo', 'Medida inventada'); elegir(m, 'medidas.0.componente', 'componente-1'); escribir(m, 'medidas.0.responsable', 'Área inventada'); escribir(m, 'medidas.0.plazo', '2027-01-01'); elegir(m, 'medidas.0.estado', 'Pendiente'); siguiente(m); assert.match(m.contenedor.textContent, /Revisión/);
  // E44: la revisión muestra etiquetas y referencias legibles, no claves internas.
  const rotulos = m.contenedor.todos().filter(n => n.tagName === 'DT').map(n => n.textContent);
  assert.ok(rotulos.includes('Código') && !rotulos.includes('codigo') && !rotulos.includes('riesgo'));
  assert.ok(m.contenedor.todos().filter(n => n.tagName === 'DD').some(n => n.textContent === 'Grupo inventado'));
}

test('cuestionario IV: la UI produce exactamente los cinco registros del Excel y guarda en orden', async () => {
  const previo = Object.getOwnPropertyDescriptor(globalThis, 'crypto'); Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'grupo-fijo' }, configurable: true });
  try {
    const esperado = Carga.leer(libro(), 'riesgos', contextoExcel({})); assert.deepEqual(esperado.errores, []);
    const m = await montar(); await abrirNuevo(m); await llenarCaminoCompleto(m); const guardar = boton(m.contenedor, 'Guardar'); assert.equal(guardar.disabled, false, m.contenedor.textContent); await guardar.onclick(); assert.match(m.contenedor.textContent, /Cambios guardados/, m.contenedor.textContent);
    assert.deepStrictEqual(Object.fromEntries(m.guardados), esperado.registros);
    assert.deepEqual(m.guardados.map(([c]) => c), colecciones); assert.deepEqual(m.guardadosUno, []);
    const validacion = m.guardados.find(([c]) => c === 'riesgos-validaciones')[1][0], medida = m.guardados.find(([c]) => c === 'riesgos-medidas')[1][0];
    assert.equal(validacion.riesgo, 'r-07'); assert.equal(validacion.grupo, 'g-grupo-fijo'); assert.deepEqual(medida.riesgos, ['r-07']);
  } finally { Object.defineProperty(globalThis, 'crypto', previo); }
});

test('cuestionario IV: obligatorio vacío y escala 7 se muestran junto al control y no guardan', async () => {
  const m = await montar(); await abrirNuevo(m); escribir(m, 'riesgo.codigo', 'R-07'); elegir(m, 'riesgo.derecho_humano', 'Derecho a la vida'); siguiente(m);
  const nombre = campo(m.contenedor, 'riesgo.nombre'); assert.equal(nombre.attrs['aria-invalid'], 'true'); assert.match(m.contenedor.querySelector('#kq-riesgo-nombre-error').textContent, /obligatorio/); assert.match(m.contenedor.textContent, /Paso 1 de 5/);
  escribir(m, 'riesgo.nombre', 'Nombre'); siguiente(m); radio(m, 'calificacion.escala', 3); const escala = campo(m.contenedor, 'calificacion.escala'); escala.value = '7'; escala.onchange(); siguiente(m);
  const invalida = m.contenedor.todos().find(n => n.name === 'calificacion.escala' && n.attrs['aria-invalid'] === 'true'); assert.ok(invalida); assert.match(m.contenedor.querySelector('#kq-calificacion-escala-error').textContent, /1 a 3/); assert.equal(m.guardados.length, 0); assert.equal(m.guardadosUno.length, 0);
});

test('cuestionario IV: permiso, edición, conteo y persistencia', async () => {
  const sinPermiso = await montar({ editar: false }); assert.equal(boton(sinPermiso.contenedor, 'Responder el cuestionario'), undefined);
  const existente = { id: 'r-01', codigo: 'R-01', nombre: 'Existente', derecho_humano: 'Derecho a la vida', ambitos: ['Operación propia'] }, cal = { id: 'r-01', riesgo: 'r-01', escala: 2, alcance: 2, irremediabilidad: 2, probabilidad: 'Media', tipo_impacto: 'Potencial', vinculacion: 'Causa' };
  const m = await montar({ registros: { riesgos: [existente], 'riesgos-calificacion': [cal] } }); boton(m.contenedor, 'Responder el cuestionario').onclick(); boton(m.contenedor, 'Editar').onclick(); await tick(); assert.equal(campo(m.contenedor, 'riesgo.codigo').disabled, true); assert.equal(campo(m.contenedor, 'riesgo.nombre').value, 'Existente'); siguiente(m); siguiente(m); siguiente(m); siguiente(m); assert.match(m.contenedor.textContent, /0 nuevos, 2 actualizados/); await boton(m.contenedor, 'Guardar').onclick(); assert.deepEqual(m.guardados.map(([c]) => c), ['riesgos', 'riesgos-calificacion']);
  const memoria = new Map(), primero = await montar({ memoria }); await abrirNuevo(primero); escribir(primero, 'riesgo.codigo', 'R-09'); const segundo = await montar({ memoria }); await abrirNuevo(segundo); assert.equal(campo(segundo.contenedor, 'riesgo.codigo').value, 'R-09'); boton(segundo.contenedor, 'Cancelar').onclick(); boton(segundo.contenedor, 'Sí, cancelar').onclick(); assert.equal(memoria.has('kq:riesgos:empresa-prueba:nuevo'), false);
});

test('cuestionario IV: medidas existentes no se quitan desde el cuestionario y quitar una nueva conserva las demás', async () => {
  const riesgo = { id: 'r-01', codigo: 'R-01', nombre: 'Existente', derecho_humano: 'Derecho a la vida' }, cal = { id: 'r-01', riesgo: 'r-01', escala: 1, alcance: 1, irremediabilidad: 1, probabilidad: 'Baja', tipo_impacto: 'Potencial', vinculacion: 'Causa' };
  const medidas = ['A-01', 'A-02', 'A-03'].map((codigo, i) => ({ id: codigo.toLowerCase(), codigo, titulo: 'Medida ' + i, componente: 'componente-1', riesgos: ['r-01'], estado: 'Pendiente' }));
  const m = await montar({ registros: { riesgos: [riesgo], 'riesgos-calificacion': [cal], 'riesgos-medidas': medidas } }); boton(m.contenedor, 'Responder el cuestionario').onclick(); boton(m.contenedor, 'Editar').onclick(); await tick(); siguiente(m); siguiente(m); siguiente(m); assert.equal(m.contenedor.todos().filter(n => n.tagName === 'BUTTON' && n.textContent === 'Quitar medida').length, 0); assert.match(m.contenedor.textContent, /Edición por tabla/);
  boton(m.contenedor, 'Agregar medida').onclick(); boton(m.contenedor, 'Agregar medida').onclick(); escribir(m, 'medidas.3.codigo', 'A-04'); escribir(m, 'medidas.4.codigo', 'A-05'); escribir(m, 'medidas.4.titulo', 'Nueva'); elegir(m, 'medidas.4.componente', 'componente-1'); elegir(m, 'medidas.4.estado', 'Pendiente');
  boton(m.contenedor, 'Quitar medida').onclick(); assert.equal(campo(m.contenedor, 'medidas.3.codigo').value, 'A-05'); siguiente(m); await boton(m.contenedor, 'Guardar').onclick();
  const guardadas = m.guardados.find(([c]) => c === 'riesgos-medidas')[1]; assert.deepEqual(guardadas.map(x => x.codigo), ['A-01', 'A-02', 'A-03', 'A-05']); assert.equal(guardadas[1].titulo, 'Medida 1');
});
