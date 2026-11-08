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
  assert.deepEqual(scripts, ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'config.js', 'kit-datos.js', 'kit-validacion.js', 'vendor/xlsx.full.min.js', 'kit-riesgos.js', 'kit-cuestionario.js', 'kit-actores.js', 'kit-carga-excel.js', 'kit-armazon.js', 'kit-vista-credenciales.js', 'kit-vista-carga-excel.js', 'kit-vista-riesgos.js', 'kit-vista-actores.js', 'kit-vista-metodologia.js', 'kit-vista-ddhh-modelo.js', 'kit-vista-ddhh-motor.js', 'kit-vista-ddhh-comun.js', 'kit-vista-ddhh.js', 'kit-vista-ddhh-cuestionario.js', 'kit-vista-materialidad-motor.js', 'kit-vista-materialidad.js']);
});

// DOM mínimo: prueba los flujos reales del armazón sin red ni dependencias de navegador.
import vm from 'node:vm';
class Nodo {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._texto = ''; }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get textContent() { return this._texto + this.children.map(n => n.textContent).join(' '); }
  append(...n) { n.forEach(x => { if (x.parent) x.parent.children = x.parent.children.filter(c => c !== x); x.parent = this; this.children.push(x); }); } // Como el DOM real: append mueve el nodo.
  after(n) { n.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n); }
  replaceChildren(...n) { this._texto = ''; this.children = []; this.append(...n); }
  setAttribute(k, v) { this.attrs[k] = v; }
  focus() { this.enfocado = true; }
  querySelector(s) { return this.todos().find(n => s.startsWith('[role=') ? n.attrs.role === s.match(/"([^"]+)"/)[1] : n.tag === s); }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); }
}
async function montar({ usuario = { id: 'u' }, hash = '#/', listar = async () => [], empresas: lista = empresas } = {}) {
  const nodos = Object.fromEntries(['contenido', 'kit-cuenta', 'kit-nav', 'tema'].map(id => [id, new Nodo('div')]));
  const salto = new Nodo('a'), eventos = {}, consultas = [], guardado = [];
  const document = { documentElement: new Nodo('html'), createElement: t => new Nodo(t), createElementNS: (_, t) => new Nodo(t), getElementById: id => nodos[id], querySelector: () => salto, addEventListener() {} };
  const root = { document, Intl, fetch: async p => ({ok:true,json:async () => JSON.parse(readFileSync(new URL('../public/' + (typeof p === 'string' ? p : 'config/kit-modulos.json'), import.meta.url), 'utf8'))}), location: { hash }, history: { replaceState(_, __, hash) { root.location.hash = hash; } }, localStorage: { getItem() { throw Error('bloqueado'); }, setItem(...args) { guardado.push(args); } }, addEventListener: (k, fn) => { eventos[k] = fn; } }; root.window = root;
  vm.runInNewContext(readFileSync(new URL('../public/kit-armazon.js', import.meta.url), 'utf8'), root);
  vm.runInNewContext(readFileSync(new URL('../public/kit-vista-credenciales.js', import.meta.url), 'utf8'), root);
  const datos = { usuarioActual: async () => usuario, empresas: async () => lista, puedeEditar: id => id === 'uno', listar: async (...args) => { consultas.push(args); return listar(...args); }, iniciarSesion: async () => ({ id: 'u' }), cerrarSesion: async () => {}, observarSesion(fn) { datos.salir = fn; } };
  await root.App.iniciar(datos);
  return { root, nodos, datos, consultas, eventos, guardado };
}
test('DOM: ingreso accesible, soporte, autenticación y salida', async () => {
  const m = await montar({ usuario: null, hash: '#/e/uno/riesgos' });
  assert.equal(m.root.location.hash, '#/ingresar'); assert.equal(m.consultas.length, 0);
  const form = m.nodos.contenido.querySelector('form');
  assert.equal(form.todos().filter(n => n.tag === 'label').length, 2);
  form.todos().find(n => n.textContent === '¿Olvidaste tu contraseña?').onclick(); assert.match(form.textContent, /Escribe a soporte de Meleia/);
  form.todos().filter(n => n.tag === 'input').forEach(n => { n.value = 'ejemplo'; });
  await form.onsubmit({ preventDefault() {} });
  assert.equal(m.root.location.hash, '#/'); assert.deepEqual(m.consultas, []);
  await m.nodos['kit-cuenta'].todos().find(n => n.textContent === 'Salir').onclick(); assert.equal(m.root.location.hash, '#/ingresar');
});
test('DOM: portada global no consulta colecciones ni muestra selector global', async () => {
  const m = await montar();
  assert.match(m.nodos.contenido.textContent, /Meleia/); assert.doesNotMatch(m.nodos.contenido.textContent, /GH Estudio/);
  assert.match(m.nodos.contenido.textContent, /laboratorio de ideas y soluciones para la sostenibilidad/i);
  // E46 (6-nov): hero con cuatro botones; el semicírculo arranca cerrado y Equipo y Aliados viven en él.
  const secciones = m.nodos.contenido.todos().filter(n => String(n.className).startsWith('kit-cred-seccion')).map(n => n.children[0].textContent);
  assert.deepEqual(secciones, ['Quiénes somos', '', 'Contacto']);
  // 6-nov: sin bloque de módulos en el Home; se llega a ellos por el menú.
  assert.ok(!m.nodos.contenido.todos().some(n => n.className === 'kit-modulo'));
  assert.deepEqual(m.nodos.contenido.todos().filter(n => n.className === 'kit-tema-boton').map(n => n.textContent), ['Servicios', 'Experiencia', 'Equipo', 'Aliados']);
  assert.equal(m.nodos.contenido.todos().find(n => n.id === 'kit-explorar').hidden, true);
  // E45: el correo provisional (dominio GH) solo aparece en Contacto, como enlace; nunca en las fichas del equipo.
  const correo = m.nodos.contenido.todos().find(n => String(n.href || '').startsWith('mailto:'));
  assert.equal(correo.href, 'mailto:ghillon@ghestudio.com.co');
  assert.deepEqual(m.nodos['kit-nav'].todos().filter(n => n.tag === 'a').map(n => n.href), ['#/', '#/actores', '#/ddhh', '#/materialidad', '#/riesgos']);
  assert.equal(m.consultas.length, 0); assert.equal(m.nodos['kit-cuenta'].querySelector('select'), undefined);
  assert.match(m.nodos['kit-cuenta'].textContent, /Responsable/);
});
test('DOM E46: temas en semicírculo, fichas flotantes y caso con entregables enlazados', async () => {
  const m = await montar(), todos = () => m.nodos.contenido.todos();
  const boton = id => todos().find(n => n.className === 'kit-tema-boton' && n.dataset.tema === id);
  const explorar = todos().find(n => n.id === 'kit-explorar'), capa = todos().find(n => n.className === 'kit-ficha-capa');
  const titulos = () => todos().filter(n => n.className === 'kit-serv-titulo');
  await boton('servicios').onclick();
  assert.equal(explorar.hidden, false); assert.equal(boton('servicios').attrs['aria-pressed'], 'true'); assert.equal(titulos().length, 3);
  titulos()[0].onclick();
  assert.equal(capa.hidden, false); assert.match(capa.textContent, /Servicio 01/); assert.match(capa.textContent, /Casos/);
  // Desde la ficha del servicio, el caso abre su ficha en Experiencia.
  await capa.todos().find(n => n.className === 'kit-logo-celda').onclick();
  assert.equal(boton('experiencia').attrs['aria-pressed'], 'true'); assert.equal(titulos().length, 4);
  assert.match(capa.textContent, /Entregables/);
  assert.deepEqual(capa.todos().filter(n => n.tag === 'a').map(n => n.href), ['#/ddhh', '#/riesgos']);
  capa.todos().find(n => n.className === 'kit-serv-volver').onclick(); assert.equal(capa.hidden, true);
  await boton('equipo').onclick(); assert.equal(titulos().length, 4); titulos()[1].onclick(); assert.match(capa.textContent, /Felipe Hillón/);
  await boton('aliados').onclick(); assert.equal(titulos().length, 4); assert.equal(capa.hidden, true);
  // Sin logos confirmados, los casos siguen anonimizados (sin imágenes de clientes).
  await boton('experiencia').onclick(); assert.ok(!todos().some(n => n.tag === 'image' || (n.tag === 'img' && /logo/.test(n.className || '') && !/hero/.test(n.className))));
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
test('DOM: sin casos se informa en navegación y módulo', async () => {
  const m = await montar({empresas:[]});
  // 6-nov: ya no hay tarjetas de módulos en el Home; el aviso va en el menú (uno por módulo).
  assert.equal(m.nodos['kit-nav'].todos().filter(n => n.textContent === 'Sin casos disponibles para tu cuenta').length,4);
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


test('E54: la Metodología se replica en los Módulos I, III y IV con el mismo modelo y cifras de sus parámetros', async () => {
  const { default: M } = await import('../public/kit-vista-metodologia.js');
  const leer = r => JSON.parse(readFileSync(new URL('../public/' + r, import.meta.url), 'utf8'));
  const cfg = leer('config/kit-metodologia.json');
  globalThis.App = { el: (tag, texto, clase) => { const n = new Nodo(tag); if (texto) n.textContent = texto; if (clase) n.className = clase; return n; } };
  globalThis.document = { createElementNS: (_, t) => new Nodo(t) };
  globalThis.fetch = async r => ({ ok: true, json: async () => leer(r) });
  try {
    const esperado = { actores: leer('config/kit-actores-config.json'), materialidad: leer('config/kit-materialidad-catalogo.json'), riesgos: leer('config/kit-riesgos-config.json') };
    const criterios = { actores: 5, materialidad: esperado.materialidad.impacto.severidad.length + 1 + esperado.materialidad.financiera.variables.length, riesgos: esperado.riesgos.gravedad.criterios.length + 1 };
    for (const modulo of ['actores', 'materialidad', 'riesgos']) {
      const m = cfg[modulo], d = await M.datos(modulo, m);
      assert.ok(d, modulo + ': sin datos');
      const n = new Nodo('div'); M.pintar(n, m, { datos: d, modulo, empresa: 'uno', puedeEditar: true });
      const clase = c => n.todos().filter(x => (x.className || '').split(' ').includes(c));
      const tiles = clase('kit-met-tile'), capa = clase('kit-ven-capa')[0], cima = () => capa.children[capa.children.length - 1];
      assert.deepEqual(tiles.map(t => t.children[1].textContent), ['Estándares', 'Pasos', 'Enfoques', 'Criterios'], modulo);
      assert.equal(tiles[3].children[0].textContent, String(criterios[modulo]), modulo + ': los criterios salen de los parámetros');
      tiles[0].onclick(); assert.equal(cima().todos().filter(y => y.className === 'kit-est-tarjeta').length, m.estandares.fichas.length);
      capa.onclick({ target: capa });
      tiles[1].onclick(); const pasos = cima().todos().filter(y => y.className === 'kit-serv-titulo');
      assert.equal(pasos.length, m.proceso.pasos.length, modulo + ': un paso por cada uno de la config');
      pasos.forEach((b, i) => {
        b.onclick(); assert.equal(capa.children.length, 2);
        const pide = cima().todos().find(y => y.className === 'kit-pro-preguntar');
        if (m.proceso.pasos[i].campos) { assert.ok(pide, modulo + ' paso ' + (i + 1) + ': sin preguntas'); pide.onclick(); assert.equal(capa.children.length, 3); capa.children[2] && cima().todos().find(y => y.className === 'kit-ven-x').onclick(); }
        cima().todos().find(y => y.className === 'kit-ven-x').onclick();
      });
      capa.onclick({ target: capa }); assert.equal(capa.children.length, 0);
      tiles[2].onclick(); cima().todos().find(y => y.className === 'kit-enf-metodo').onclick(); assert.equal(capa.children.length, 2, 'el enfoque lleva al proceso');
      capa.onclick({ target: capa });
      tiles[3].onclick(); assert.match(cima().textContent, /Reglas/); capa.onclick({ target: capa });
      // Cada campo citado existe en su esquema: la Metodología no promete datos que la Alimentación no registra.
      for (const p of m.proceso.pasos) for (const c of p.campos || []) assert.equal(d.partes.proceso.items.find(x => x.id === p.id).preguntas.filter(q => q.grupo === (c.grupo || null)).length, c.ids.length, `${modulo}/${p.id}: campo inexistente en ${c.esquema}`);
      for (const f of m.estandares.fichas) {
        assert.match(f.enlace, /^https:\/\//); for (const k of ['que_es', 'por_que', 'nombre', 'emisor', 'anio']) assert.ok(f[k], f.sigla + ' sin ' + k);
        assert.ok((f.cruces || []).every(x => m.estandares.fichas.some(o => o.id === x.con)), f.sigla + ': cruce con un estándar que no está');
      }
      for (const p of m.proceso.pasos) { assert.ok(p.documentos.every(x => 'ASG'.includes(x.esg) && x.fuente)); assert.ok(!p.ref || m.estandares.fichas.some(f => f.id === p.ref.ficha)); }
      assert.doesNotMatch(JSON.stringify(m), /[;«»·]/, modulo + ': protocolo de redacción');
    }
  } finally { delete globalThis.App; delete globalThis.document; delete globalThis.fetch; }
});

test('E40/E49: Metodología del Módulo II con cifras del catálogo, fichas de estándares y aviso en los demás', async () => {
  const { default: M } = await import('../public/kit-vista-metodologia.js');
  const leer = r => JSON.parse(readFileSync(new URL('../public/config/' + r, import.meta.url), 'utf8'));
  const cfg = leer('kit-metodologia.json'), cat = leer('kit-ddhh-catalogo.json'), cruce = leer('kit-ddhh-cruce.json');
  globalThis.App = { el: (tag, texto, clase) => { const n = new Nodo(tag); if (texto) n.textContent = texto; if (clase) n.className = clase; return n; } };
  globalThis.document = { createElementNS: (_, t) => new Nodo(t) };
  try {
    const vacio = new Nodo('div'); M.pintar(vacio, cfg.actores); assert.match(vacio.textContent, /en preparación/);
    const m = cfg.ddhh, d = M.datosDdhh(cat, cruce, m);
    // Las cifras salen del catálogo, no se copian a mano.
    assert.equal(d.totalIndicadores, cat.indicadores.length); assert.equal(d.totalEjes, cat.ejes.length);
    assert.deepEqual(m.metodo.etapas.map(e => e.eje), cat.ejes.filter(e => e.grafico === 'etapas-ocde').map(e => e.id));
    assert.deepEqual(m.temas.items.map(e => e.eje), cat.ejes.filter(e => e.grafico !== 'etapas-ocde').map(e => e.id));
    assert.equal(d.columnas.length, 5, 'el cruce de petróleo y gas coincide fila a fila con el catálogo');
    const n = new Nodo('div'); M.pintar(n, m, { datos: d, modulo: 'ddhh', empresa: 'uno', puedeEditar: true });
    // E51: primer vistazo con cuatro cifras que abren ventanas anidadas (Lógica Muñeca Rusa).
    const todos = () => n.todos(), clase = c => todos().filter(x => (x.className || '').split(' ').includes(c));
    const tiles = clase('kit-met-tile');
    assert.deepEqual(tiles.map(t => t.children[1].textContent), ['Estándares', 'Etapas', 'Enfoques', 'Criterios']);
    assert.equal(tiles[0].children[0].textContent, String(m.estandares.fichas.length));
    assert.match(tiles[3].textContent, new RegExp(String(cat.indicadores.length)));
    const capa = clase('kit-ven-capa')[0], abiertas = () => capa.children.length, cima = () => capa.children[capa.children.length - 1];
    const x = () => cima().todos().find(y => y.className === 'kit-ven-x');
    assert.equal(capa.hidden, true);
    tiles[0].onclick(); assert.equal(abiertas(), 1); assert.equal(capa.hidden, false);
    const texto = cima().textContent;
    const tarjetas = cima().todos().filter(y => y.className === 'kit-est-tarjeta');
    assert.equal(tarjetas.length, m.estandares.fichas.length);
    tarjetas[0].onclick(); assert.equal(abiertas(), 2, 'la ficha se abre encima de las portadas');
    assert.match(cima().textContent, /Metodología: ¿qué es\?/);
    cima().todos().find(y => y.className === 'kit-est-relacion-boton').onclick(); assert.equal(abiertas(), 3, 'un estándar relacionado se apila');
    assert.equal(x().attrs['aria-label'], 'Cerrar y volver a ' + m.estandares.fichas[0].sigla);
    x().onclick(); assert.equal(abiertas(), 2);
    capa.onkeydown({ key: 'Escape', preventDefault() {} }); assert.equal(abiertas(), 1, 'Escape regresa un nivel');
    // El cruce: los grupos se despliegan al clic.
    cima().todos().find(y => y.className === 'kit-met-pastilla').onclick(); assert.equal(abiertas(), 2);
    const grupo = cima().todos().find(y => y.className === 'kit-cruce-grupo-boton'), filas = cima().todos().filter(y => y.className === 'kit-cruce-fila');
    assert.ok(filas.length && filas.every(f => f.hidden)); grupo.onclick(); assert.ok(filas.filter(f => !f.hidden).length > 0);
    x().onclick(); x().onclick(); assert.equal(abiertas(), 0); assert.equal(capa.hidden, true);
    // E53: Enfoques (laberinto inteligente). La cifra lleva a la metodología, la pastilla a Criterios, y el fondo cierra todo.
    tiles[2].onclick(); assert.ok(cima().todos().some(y => y.tag === 'a' && y.href === '#/ddhh/uno/resultados'), 'los entregables llevan al resultado');
    cima().todos().find(y => y.className === 'kit-enf-metodo').onclick(); assert.equal(abiertas(), 2);
    cima().todos().find(y => y.className === 'kit-serv-titulo').onclick(); assert.equal(abiertas(), 3, 'enfoque, proceso y ficha de la etapa');
    capa.onclick({ target: capa }); assert.equal(abiertas(), 0, 'el fondo regresa de una vez a la vista central'); assert.equal(capa.hidden, true);
    tiles[2].onclick(); cima().todos().find(y => (y.className || '').includes('kit-enf-criterios')).onclick(); assert.match(cima().textContent, /Reglas/);
    x().onclick(); x().onclick(); assert.equal(abiertas(), 0);
    // E52: Proceso con dos partes (Incorporación y Gestión). Ficha y ventana de preguntas apiladas.
    tiles[1].onclick(); assert.equal(abiertas(), 1);
    const navs = () => cima().todos().filter(y => y.className?.startsWith('kit-pro-nav-boton')), titulosArco = () => cima().todos().filter(y => y.className === 'kit-serv-titulo');
    assert.equal(titulosArco().length, m.metodo.etapas.length);
    navs()[1].onclick(); assert.equal(titulosArco().length, m.temas.items.length, 'Gestión de DDHH muestra los diez derechos');
    assert.equal(navs()[1].attrs['aria-pressed'], 'true');
    navs()[0].onclick(); titulosArco()[0].onclick(); assert.equal(abiertas(), 2);
    assert.match(cima().textContent, /¿Qué pide el estándar\?/); assert.match(cima().textContent, /Evidencias/);
    for (const e of m.metodo.etapas) assert.ok(e.documentos.length && e.documentos.every(x => 'ASG'.includes(x.esg) && x.fuente), e.titulo + ': documentos con dimensión ESG y fuente');
    const pide = cima().todos().find(y => y.className === 'kit-pro-preguntar'); pide.onclick(); assert.equal(abiertas(), 3);
    assert.equal(cima().todos().filter(y => y.tag === 'li').length, d.indicadores(m.metodo.etapas[0].eje).length, 'todas las preguntas de la etapa');
    x().onclick(); x().onclick(); assert.equal(abiertas(), 1);
    navs()[1].onclick(); titulosArco()[0].onclick(); assert.match(cima().textContent, /¿Qué protege\?/);
    x().onclick(); x().onclick(); assert.equal(abiertas(), 0);
    tiles[3].onclick(); assert.match(cima().textContent, /Reglas/); x().onclick();
    for (const f of m.estandares.fichas) {
      assert.match(f.enlace, /^https:\/\//, f.sigla + ' necesita enlace oficial');
      for (const k of ['que_es', 'por_que', 'nombre', 'emisor', 'anio']) assert.ok(f[k], f.sigla + ' sin ' + k);
      assert.ok(f.cruces.length && f.cruces.every(x => m.estandares.fichas.some(o => o.id === x.con)), f.sigla + ': cruce con un estándar que no está');
      assert.match(texto, new RegExp(f.sigla));
    }
    // Protocolo de redacción: sin punto y coma, comillas angulares ni punto medio en los textos.
    assert.doesNotMatch(JSON.stringify(m), /[;«»·]/);
    const enlaces = n.todos().filter(x => x.tag === 'a').map(x => x.href);
    assert.ok(enlaces.includes('#/ddhh/uno/resultados') && enlaces.includes('#/ddhh/uno/alimentacion'));
  } finally { delete globalThis.App; delete globalThis.document; }
});
