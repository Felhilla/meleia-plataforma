import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import App from '../public/kit-armazon.js';
const empresas = [{ id: 'uno', rol: 'responsable' }, { id: 'dos', rol: 'demostrador' }];
const resolver = (hash, usuario = { id: 'u' }) => App.resolverRuta(hash, usuario, empresas);
test('sin sesión cualquier ruta lleva a ingresar', () => {
  for (const hash of ['#/ingresar', '#/e/uno', '#/e/uno/riesgos/matriz', '#/inexistente']) assert.equal(resolver(hash, null).hash, '#/ingresar');
});
test('rutas de módulos y pestañas; desconocidas a portada', () => {
  for (const ruta of ['actores/mapa', 'actores/alimentacion', 'ddhh', 'materialidad', 'riesgos/matriz', 'riesgos/medidas', 'riesgos/alimentacion']) assert.equal(resolver('#/e/uno/' + ruta).clave, ruta);
  assert.equal(resolver('#/e/uno/actores').clave, 'actores/mapa'); assert.equal(resolver('#/e/uno/riesgos').clave, 'riesgos/matriz');
  for (const hash of ['#/inexistente', '#/e/uno/no', '#/e/uno/riesgos/no', '#/e/uno/riesgos/matriz/extra', '#/e/ajena']) assert.equal(resolver(hash).hash, '#/e/uno');
});
test('demostrador no ve ni abre Alimentación', () => {
  for (const modulo of ['actores', 'riesgos']) {
    assert.ok(!App.pestanas(modulo, 'demostrador').includes('alimentacion'));
    assert.equal(resolver('#/e/dos/' + modulo + '/alimentacion').hash, '#/e/dos');
    for (const rol of ['responsable', 'admin']) assert.ok(App.pestanas(modulo, rol).includes('alimentacion'));
  }
});
test('preferencia solo entre empresas autorizadas y cuenta sin empresas', () => {
  assert.equal(App.resolverRuta('#/', {}, empresas, 'dos').empresa.id, 'dos');
  assert.equal(App.resolverRuta('#/', {}, empresas, 'ajena').empresa.id, 'uno');
  assert.equal(App.resolverRuta('#/', {}, []).clave, 'sin-empresas');
});
test('entrada del Kit no carga el relato, conserva SDK fijo y orden defer', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>GH Studio × Meleia · Kit<\/title>/);
  assert.doesNotMatch(html, /src="vista-|caso\.json|src="app.js"|api-supabase.js/);
  const scripts = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'config.js', 'kit-datos.js', 'kit-validacion.js', 'kit-armazon.js', 'kit-riesgos.js', 'kit-vista-riesgos.js', 'kit-actores.js', 'kit-vista-actores.js']);
});

// DOM mínimo: prueba los flujos reales del armazón sin red ni dependencias de navegador.
import vm from 'node:vm';
class Nodo {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._texto = ''; }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get textContent() { return this._texto + this.children.map(n => n.textContent).join(' '); }
  append(...n) { this.children.push(...n); }
  replaceChildren(...n) { this._texto = ''; this.children = n; }
  setAttribute(k, v) { this.attrs[k] = v; }
  focus() { this.enfocado = true; }
  querySelector(s) { return this.todos().find(n => s.startsWith('[role=') ? n.attrs.role === s.match(/"([^"]+)"/)[1] : n.tag === s); }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); }
}
async function montar({ usuario = { id: 'u' }, hash = '#/e/uno', listar = async () => [], empresas: lista = empresas } = {}) {
  const nodos = Object.fromEntries(['contenido', 'kit-cuenta', 'kit-nav', 'tema'].map(id => [id, new Nodo('div')]));
  const salto = new Nodo('a'), eventos = {}, consultas = [], guardado = [];
  const document = { documentElement: new Nodo('html'), createElement: t => new Nodo(t), getElementById: id => nodos[id], querySelector: () => salto, addEventListener() {} };
  const root = { document, Intl, location: { hash }, history: { replaceState(_, __, hash) { root.location.hash = hash; } }, localStorage: { getItem() { throw Error('bloqueado'); }, setItem(...args) { guardado.push(args); } }, addEventListener: (k, fn) => { eventos[k] = fn; } }; root.window = root;
  vm.runInNewContext(readFileSync(new URL('../public/kit-armazon.js', import.meta.url), 'utf8'), root);
  const datos = { usuarioActual: async () => usuario, empresas: async () => lista, puedeEditar: id => id === 'uno', listar: async (...args) => { consultas.push(args); return listar(...args); }, iniciarSesion: async () => ({ id: 'u' }), cerrarSesion: async () => {}, observarSesion(fn) { datos.salir = fn; } };
  await root.App.iniciar(datos);
  return { root, nodos, datos, consultas, eventos, guardado };
}
test('DOM: ingreso accesible, soporte, autenticación y salida', async () => {
  const m = await montar({ usuario: null, hash: '#/e/uno/riesgos' });
  assert.equal(m.root.location.hash, '#/ingresar'); assert.equal(m.consultas.length, 0);
  const form = m.nodos.contenido.querySelector('form');
  assert.equal(form.todos().filter(n => n.tag === 'label').length, 2);
  form.todos().find(n => n.textContent === '¿Olvidaste tu contraseña?').onclick(); assert.match(form.textContent, /Escribe a soporte GH/);
  form.todos().filter(n => n.tag === 'input').forEach(n => { n.value = 'ejemplo'; });
  await form.onsubmit({ preventDefault() {} });
  assert.equal(m.root.location.hash, '#/e/uno'); assert.deepEqual(m.consultas, [['uno', 'portada']]);
  await m.nodos['kit-cuenta'].todos().find(n => n.textContent === 'Salir').onclick(); assert.equal(m.root.location.hash, '#/ingresar');
});
test('DOM: portada solo pide su colección y módulos no precargan datos', async () => {
  const m = await montar({ listar: async () => [{ id: 'portada', contexto: '<script>texto seguro</script>' }] });
  assert.match(m.nodos.contenido.textContent, /<script>texto seguro<\/script>/);
  assert.equal(m.nodos.contenido.todos().filter(n => n.tag === 'script').length, 0);
  assert.equal(m.nodos.contenido.todos().filter(n => n.tag === 'a').length, 4);
  m.root.location.hash = '#/e/dos/riesgos'; await m.root.App.actualizarVista();
  assert.doesNotMatch(m.nodos.contenido.textContent, /Alimentación/); assert.match(m.nodos.contenido.textContent, /En construcción/); assert.equal(m.consultas.length, 1);
  assert.ok(m.nodos['kit-cuenta'].querySelector('select'));
});
test('DOM: una empresa fija; sin empresas hay salida y mensaje de soporte', async () => {
  const una = await montar({ empresas: [empresas[0]] }); assert.equal(una.nodos['kit-cuenta'].querySelector('select'), undefined);
  const cero = await montar({ empresas: [] }); assert.match(cero.nodos.contenido.textContent, /Sin empresas asignadas/); assert.match(cero.nodos['kit-cuenta'].textContent, /Salir/);
});
test('DOM: registro de vistas, limpieza y respuesta tardía de otra empresa', async () => {
  const m = await montar({ hash: '#/e/uno/riesgos' }); let liberar, limpiado = false;
  m.root.App.registrarVista('riesgos/matriz', { render(c, datos, params) { c.append(m.root.App.el('p', params.empresa)); return () => { limpiado = true; }; } });
  await m.root.App.actualizarVista(); assert.match(m.nodos.contenido.textContent, /uno/);
  m.datos.listar = () => new Promise(resolve => { liberar = resolve; });
  m.root.location.hash = '#/e/uno'; const pendiente = m.root.App.actualizarVista();
  m.root.location.hash = '#/e/dos/ddhh'; await m.root.App.actualizarVista();
  liberar([{ id: 'portada', contexto: 'NO MOSTRAR' }]); await pendiente;
  assert.equal(limpiado, true); assert.doesNotMatch(m.nodos.contenido.textContent, /NO MOSTRAR/);
});
test('DOM: error remoto visible, sesión revocada vuelve al ingreso', async () => {
  const m = await montar({ listar: async () => { throw Error('No hay conexión con la base de datos'); } });
  assert.match(m.nodos.contenido.querySelector('[role="alert"]').textContent, /No hay conexión/);
  m.datos.salir(); assert.equal(m.root.location.hash, '#/ingresar'); assert.doesNotMatch(m.nodos.contenido.textContent, /Portada/);
});
