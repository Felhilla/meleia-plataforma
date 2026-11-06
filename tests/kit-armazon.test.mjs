import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import App from '../public/kit-armazon.js';
const empresas = [{ id: 'uno', nombre: 'Cliente uno', rol: 'responsable', muestra_comercial: false }, { id: 'dos', nombre: 'Cliente dos', rol: 'demostrador', muestra_comercial: false }];
const casosActores = App.modulos.find(m => m.id === 'actores').casos;
const casoDDHH = App.modulos.find(m => m.id === 'ddhh').casos[0];
const muestras = [{id:casosActores[0],nombre:'Caso de prueba A',rol:'demostrador',muestra_comercial:true}, {id:casosActores[1],nombre:'Caso de prueba B',rol:'responsable',muestra_comercial:true}, {id:casoDDHH,nombre:'Caso de prueba C',rol:'demostrador',muestra_comercial:true}];
const resolver = (hash, usuario = { id: 'u' }) => App.resolverRuta(hash, usuario, empresas);
test('sin sesión cualquier ruta lleva a ingresar', () => {
  for (const hash of ['#/', '#/actores/uno/mapa', '#/inexistente']) assert.equal(resolver(hash, null).hash, '#/ingresar');
});
test('portada global y rutas desconocidas sin empresa', () => {
  for (const hash of ['#/', '#/inexistente', '#/riesgos/ajena', '#/riesgos/uno/no', '#/riesgos/uno/matriz/extra']) {
    assert.equal(resolver(hash).hash, '#/'); assert.equal(resolver(hash).empresa, undefined);
  }
  assert.equal(App.resolverRuta('#/', {}, []).clave, 'portada');
});
test('rutas nuevas, primer caso y redirecciones antiguas', () => {
  for (const ruta of ['actores/metodologia', 'ddhh/metodologia', 'materialidad/metodologia', 'riesgos/metodologia', 'actores/mapa', 'actores/alimentacion', 'ddhh/resultados', 'ddhh/estandares', 'ddhh/alimentacion', 'materialidad/resultados', 'materialidad/alimentacion', 'riesgos/matriz', 'riesgos/medidas', 'riesgos/alimentacion']) {
    const [modulo,sub] = ruta.split('/'), nueva = '#/' + modulo + '/uno' + (sub ? '/' + sub : '');
    assert.equal(resolver(nueva).clave, ruta); assert.equal(resolver('#/e/uno/' + ruta).hash, nueva);
  }
  // Decisión del 5-nov: cada módulo abre en Metodología.
  assert.equal(App.resolverRuta('#/actores', {}, muestras).hash, '#/actores/' + casosActores[0] + '/metodologia');
  assert.equal(App.resolverRuta('#/ddhh', {}, muestras).hash, '#/ddhh/' + casoDDHH + '/metodologia');
});
test('casos: muestras configuradas y clientes reales visibles en todos los módulos', () => {
  for (const m of App.modulos) {
    assert.deepEqual(App.casos(m, [...muestras,...empresas]).map(e => e.id), [...muestras.filter(e => m.casos.includes(e.id)),...empresas].map(e => e.id));
    assert.deepEqual(App.casos(m, [{id:'ajena',muestra_comercial:true}]), []);
    assert.equal(App.resolverRuta('#/' + m.id, {}, []).clave, 'sin-casos');
  }
  assert.equal(App.resolverRuta('#/actores/' + casoDDHH, {}, muestras).hash, '#/');
});
test('Alimentación exige permiso sobre la empresa del caso', () => {
  for (const modulo of ['actores','ddhh','materialidad','riesgos']) {
    assert.ok(!App.pestanas(modulo, 'demostrador').includes('alimentacion'));
    assert.equal(resolver('#/' + modulo + '/dos/alimentacion').hash, '#/');
    assert.equal(App.resolverRuta('#/' + modulo + '/uno/alimentacion', {}, empresas, () => false).hash, '#/');
  }
});
test('entrada del Kit no carga el relato, conserva SDK fijo y orden defer', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Meleia · Kit de sostenibilidad<\/title>/); assert.doesNotMatch(html, /GH Estudio|logo-gh/);
  assert.doesNotMatch(html, /src="vista-|caso\.json|src="app.js"|api-supabase.js/);
  const scripts = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'config.js', 'kit-datos.js', 'kit-validacion.js', 'vendor/xlsx.full.min.js', 'kit-riesgos.js', 'kit-cuestionario.js', 'kit-actores.js', 'kit-carga-excel.js', 'kit-armazon.js', 'kit-vista-carga-excel.js', 'kit-vista-riesgos.js', 'kit-vista-actores.js', 'kit-vista-metodologia.js', 'kit-vista-ddhh-modelo.js', 'kit-vista-ddhh-motor.js', 'kit-vista-ddhh-comun.js', 'kit-vista-ddhh.js', 'kit-vista-materialidad-motor.js', 'kit-vista-materialidad.js']);
});

// DOM mínimo: prueba los flujos reales del armazón sin red ni dependencias de navegador.
import vm from 'node:vm';
class Nodo {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._texto = ''; }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get textContent() { return this._texto + this.children.map(n => n.textContent).join(' '); }
  append(...n) { n.forEach(x => { x.parent = this; this.children.push(x); }); }
  after(n) { n.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n); }
  replaceChildren(...n) { this._texto = ''; this.children = n; }
  setAttribute(k, v) { this.attrs[k] = v; }
  focus() { this.enfocado = true; }
  querySelector(s) { return this.todos().find(n => s.startsWith('[role=') ? n.attrs.role === s.match(/"([^"]+)"/)[1] : n.tag === s); }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); }
}
async function montar({ usuario = { id: 'u' }, hash = '#/', listar = async () => [], empresas: lista = empresas } = {}) {
  const nodos = Object.fromEntries(['contenido', 'kit-cuenta', 'kit-nav', 'tema'].map(id => [id, new Nodo('div')]));
  const salto = new Nodo('a'), eventos = {}, consultas = [], guardado = [];
  const document = { documentElement: new Nodo('html'), createElement: t => new Nodo(t), getElementById: id => nodos[id], querySelector: () => salto, addEventListener() {} };
  const root = { document, Intl, fetch: async p => ({ok:true,json:async () => JSON.parse(readFileSync(new URL('../public/' + (typeof p === 'string' ? p : 'config/kit-modulos.json'), import.meta.url), 'utf8'))}), location: { hash }, history: { replaceState(_, __, hash) { root.location.hash = hash; } }, localStorage: { getItem() { throw Error('bloqueado'); }, setItem(...args) { guardado.push(args); } }, addEventListener: (k, fn) => { eventos[k] = fn; } }; root.window = root;
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
  assert.equal(m.root.location.hash, '#/'); assert.deepEqual(m.consultas, []);
  await m.nodos['kit-cuenta'].todos().find(n => n.textContent === 'Salir').onclick(); assert.equal(m.root.location.hash, '#/ingresar');
});
test('DOM: portada global no consulta colecciones ni muestra selector global', async () => {
  const m = await montar();
  assert.match(m.nodos.contenido.textContent, /Meleia/); assert.doesNotMatch(m.nodos.contenido.textContent, /GH Estudio/);
  assert.match(m.nodos.contenido.textContent, /laboratorio de ideas y soluciones para la sostenibilidad/i);
  // E42 (5-nov): la portada es la ventana de Credenciales; después vienen los cuatro módulos.
  const secciones = m.nodos.contenido.todos().filter(n => String(n.className).startsWith('kit-cred-seccion')).map(n => n.children[0].textContent);
  assert.deepEqual(secciones, ['Quiénes somos', 'Servicios', 'Experiencia', 'Equipo', 'Aliados', 'Contacto']);
  assert.equal(m.nodos.contenido.todos().filter(n => n.className === 'kit-persona').length, 3);
  // E45: el correo provisional (dominio GH) solo aparece en Contacto, como enlace; nunca en las fichas del equipo.
  assert.ok(m.nodos.contenido.todos().filter(n => n.className === 'kit-persona').every(n => !/ghestudio/.test(n.textContent)));
  const correo = m.nodos.contenido.todos().find(n => String(n.href || '').startsWith('mailto:'));
  assert.equal(correo.href, 'mailto:ghillon@ghestudio.com.co');
  assert.deepEqual(m.nodos.contenido.todos().filter(n => n.className === 'kit-modulo').map(n => n.href), ['#/actores', '#/ddhh', '#/materialidad', '#/riesgos']);
  assert.equal(m.consultas.length, 0); assert.equal(m.nodos['kit-cuenta'].querySelector('select'), undefined);
  assert.match(m.nodos['kit-cuenta'].textContent, /Responsable/);
});
test('DOM E24: selector accesible con uno o varios casos y pestaña Mapa de actores', async () => {
  const una = await montar({ empresas: muestras, hash:'#/ddhh' });
  assert.match(una.nodos.contenido.textContent, /Caso Caso de prueba C/);
  assert.ok(una.nodos.contenido.todos().find(n => n.className === 'kit-caso-unico'));
  assert.ok(!una.nodos.contenido.todos().some(n => n.tag === 'button' && n.textContent === 'Caso'));
  assert.ok(!una.nodos.contenido.todos().some(n => n.id === 'kit-lista-casos'));
  const varias = await montar({ empresas:muestras, hash:'#/actores' });
  const selector = varias.nodos.contenido.todos().find(n => n.attrs['aria-label'] === 'Casos del módulo');
  assert.equal(selector.todos().filter(n => n.tag === 'a').length, 2);
  const boton = selector.todos().find(n => n.tag === 'button'), lista = selector.todos().find(n => n.id === 'kit-lista-casos');
  assert.equal(lista.hidden,true); boton.onclick(); assert.equal(lista.hidden,false); assert.equal(boton.attrs['aria-expanded'],'true');
  selector.onkeydown({key:'Escape',preventDefault(){}}); assert.equal(lista.hidden,true); assert.equal(boton.enfocado,true);
  boton.onclick(); const enlace = lista.children[1]; enlace.onclick(); assert.equal(lista.hidden,true);
  assert.equal(lista.children[0].attrs['aria-current'],'page'); assert.equal(enlace.href,'#/actores/' + casosActores[1] + '/metodologia');
  varias.root.location.hash = enlace.href; await varias.eventos.hashchange();
  assert.equal(varias.root.App.resolverRuta(varias.root.location.hash, {}, muestras).clave,'actores/metodologia');
  assert.equal(varias.nodos.contenido.todos().filter(n=>n.className==='kit-pestanas').length,1);
  assert.doesNotMatch(varias.nodos.contenido.textContent, /Alimentación/);
  assert.match(varias.nodos['kit-cuenta'].textContent, /Responsable/);
  varias.root.location.hash = '#/actores/' + casosActores[1]; varias.datos.puedeEditar = id => id === casosActores[1]; await varias.root.App.actualizarVista();
  assert.match(varias.nodos.contenido.textContent, /Alimentación/);
  const soporte = await montar({ empresas:[...empresas,{id:'tres',rol:'admin',muestra_comercial:false}] }); assert.match(soporte.nodos['kit-cuenta'].textContent,/Soporte Meleia/);
});
test('DOM: sin casos se informa en tarjeta, navegación y módulo', async () => {
  const m = await montar({empresas:[]});
  assert.equal(m.nodos.contenido.todos().filter(n => n.textContent === 'Sin casos disponibles para tu cuenta').length,4);
  assert.match(m.nodos['kit-nav'].todos().find(n => n.href === '#/actores').attrs['aria-label'],/Sin casos disponibles/);
  m.root.location.hash = '#/actores'; await m.root.App.actualizarVista(); assert.match(m.nodos.contenido.textContent,/Sin casos disponibles para tu cuenta/);
  assert.match(m.nodos['kit-cuenta'].textContent,/Salir/);
});
test('DOM: contrato de vistas, limpieza y respuesta tardía de otra empresa', async () => {
  const m = await montar(); let liberar, limpiado = false, params;
  m.root.App.registrarVista('riesgos/matriz', { async render(c, datos, p) { params = p; await new Promise(resolve => { liberar = resolve; }); if (p.vigente()) c.append(m.root.App.el('p','NO MOSTRAR')); return () => { limpiado = true; }; } });
  m.root.location.hash = '#/riesgos/uno/matriz'; const pendiente = m.root.App.actualizarVista();
  assert.equal(params.empresa,'uno'); assert.equal(params.puedeEditar,true);
  m.root.location.hash = '#/ddhh/dos/resultados'; await m.root.App.actualizarVista(); liberar(); await pendiente;
  assert.equal(limpiado,true); assert.equal(params.vigente(),false); assert.doesNotMatch(m.nodos.contenido.textContent,/NO MOSTRAR/);
});
test('DOM: error de vista visible y sesión revocada vuelve al ingreso', async () => {
  const m = await montar(); m.root.App.registrarVista('ddhh/resultados',{render(){throw Error('No hay conexión con la base de datos');}});
  m.root.location.hash = '#/ddhh/uno/resultados'; await m.root.App.actualizarVista();
  assert.match(m.nodos.contenido.querySelector('[role="alert"]').textContent,/No hay conexión/);
  m.datos.salir(); assert.equal(m.root.location.hash,'#/ingresar');
});

test('E22: el Módulo III ofrece exclusivamente el caso configurado y sus rutas', () => {
  const modulo=App.modulos.find(m=>m.id==='materialidad');
  assert.equal(modulo.casos.length,1);
  assert.notEqual(modulo.casos[0],'empresa-demo');
  const casos=[{id:modulo.casos[0],nombre:'Caso de muestra',rol:'demostrador',muestra_comercial:true}];
  assert.equal(App.resolverRuta('#/materialidad',{},casos).hash,'#/materialidad/'+casos[0].id+'/metodologia');
  assert.deepEqual(App.casos(modulo,[...muestras,...casos]).map(e=>e.id),[casos[0].id]);
});

test('DOM E24b: el armazón no pide ni muestra logos de empresa', async () => {
  const m = await montar({hash:'#/actores/uno',listar:async () => [{id:'logo',imagen:'data:image/png;base64,YQ==',alt:'Empresa de prueba'}]});
  assert.equal(m.consultas.filter(c => c[1] === 'perfil').length,0);
  assert.ok(!m.nodos.contenido.todos().some(n => n.className === 'kit-empresa-logo'));
});

test('E40: Alimentación visible como pestaña con permiso y oculta sin él',async()=>{
 const m=await montar({hash:'#/ddhh/uno/alimentacion'});
 assert.equal(m.root.location.hash,'#/ddhh/uno/alimentacion');
 const tabs=m.nodos.contenido.todos().find(n=>n.className==='kit-pestanas');
 assert.deepEqual(tabs.children.map(n=>n.textContent),['Metodología','Alimentación','Resultados','Cruce de estándares']);
 m.datos.puedeEditar=()=>false;await m.root.App.actualizarVista();assert.equal(m.root.location.hash,'#/');
 const d=await montar({hash:'#/ddhh/dos/resultados'});
 assert.deepEqual(d.nodos.contenido.todos().find(n=>n.className==='kit-pestanas').children.map(n=>n.textContent),['Metodología','Resultados','Cruce de estándares']);
});

test('E30 y E40: rutas anteriores convergen y todos los módulos muestran sus pestañas',async()=>{
 for(const sub of ['doble','impacto','financiera']){
  assert.equal(resolver('#/materialidad/uno/'+sub).hash,'#/materialidad/uno/resultados');
  assert.equal(resolver('#/e/uno/materialidad/'+sub).clave,'materialidad/resultados');
 }
 assert.equal(resolver('#/materialidad/uno/alimentacion').clave,'materialidad/alimentacion');
 assert.equal(resolver('#/materialidad/dos/alimentacion').clave,'portada');
 for(const [hash,esperadas] of [['#/materialidad/uno/resultados',['Metodología','Alimentación','Resultados']],['#/materialidad/dos/resultados',['Metodología','Resultados']],['#/riesgos/uno/matriz',['Metodología','Alimentación','Resultados']],['#/riesgos/dos/matriz',['Metodología','Resultados']],['#/actores/uno/mapa',['Metodología','Alimentación','Resultados']]]){
  const m=await montar({hash});
  assert.deepEqual(m.nodos.contenido.todos().find(n=>n.className==='kit-pestanas').children.map(n=>n.textContent),esperadas);
 }
 for (const vista of ['matriz', 'medidas']) assert.equal(resolver('#/riesgos/uno/' + vista).clave, 'riesgos/' + vista);
 assert.equal(resolver('#/riesgos/dos/alimentacion').clave, 'portada');
});


test('E40: Metodología pinta secciones y avisa cuando aún no hay contenido', async () => {
  const { default: M } = await import('../public/kit-vista-metodologia.js');
  const cfg = JSON.parse(readFileSync(new URL('../public/config/kit-metodologia.json', import.meta.url), 'utf8'));
  for (const m of ['actores', 'ddhh', 'materialidad', 'riesgos']) assert.ok(Array.isArray(cfg[m].secciones));
  globalThis.App = { el: (tag, texto, clase) => { const n = new Nodo(tag); if (texto) n.textContent = texto; if (clase) n.className = clase; return n; } };
  const vacio = new Nodo('div'); M.pintar(vacio, { secciones: [] }); assert.match(vacio.textContent, /en preparación/);
  const lleno = new Nodo('div'); M.pintar(lleno, { resumen: 'Resumen', secciones: [{ titulo: 'Paso 1', parrafos: ['Texto'], puntos: ['Uno'] }], fuentes: ['AA1000SES'] });
  assert.match(lleno.textContent, /Resumen/); assert.match(lleno.textContent, /Paso 1/); assert.match(lleno.textContent, /Referencias/);
  delete globalThis.App;
});
