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
  get lastChild() { return this.children.at(-1); }
  get options() { return this.children; }
  todos() { return this.children.flatMap(n => [n, ...n.todos()]); }
  focus() { this.doc.activeElement = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
  closest() { return this.hidden ? this : this.parent?.closest(); }
  querySelector(selector) { return this.todos().find(n => selector.startsWith('.') ? n.className?.split(' ').includes(selector.slice(1)) : n.tagName === selector.toUpperCase()); }
  querySelectorAll() { return this.todos().filter(n => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(n.tagName)); }
}
const read = p => readFileSync(new URL('../public/' + p, import.meta.url), 'utf8');
const cfg = JSON.parse(read('config/kit-actores-config.json')), esquema = JSON.parse(read('config/esquemas/actores.json'));
const [activa, estrategico, periferico, cautelosa] = cfg.niveles.map(n => n.nombre);
function actores() { return [[5,4,'Entidad de prueba A'],[4,2,'Entidad de prueba B'],[3,5,'Entidad de prueba C'],[2,1,'Entidad de prueba D'],[3,1,'Entidad de prueba E']].map(([influencia,impacto,institucion],i) => ({ id:'act-'+i,influencia,impacto,institucion,cargo:'Cargo institucional',categoria:'Academia',subgrupo:'Educación',orden:'Local',posicion:i === 2 ? 'Desfavorable' : 'Neutral',tension:i === 2 ? 4 : 1,dependencia:2,responsabilidad:2,...(i === 4 ? {nivel_ajustado:activa,motivo_ajuste:esquema.campos.motivo_ajuste.valores[0],explicacion_ajuste:'Capacidad de convocatoria cercana a alta.'} : {})})); }
async function montar(vista = 'mapa', editar = true, extras = {}) {
  const document = { eventos: {}, listeners: {}, addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); this.eventos[k] = e => [...this.listeners[k]].forEach(f => f(e)); }, removeEventListener(k,fn) { this.listeners[k] = this.listeners[k].filter(f => f !== fn); if (!this.listeners[k].length) delete this.eventos[k]; }, createElement(t) { return new Nodo(t, this); } };
  document.body = new Nodo('body', document); const contenedor = new Nodo('main', document); document.body.append(contenedor);
  const consultas = [], guardados = [], borrados = [], historial = [], vistas = {};
  const registros = { actores: actores(), 'actores-contactos': [], 'actores-resumen': [], 'actores-logos': [], ...extras };
  const datos = { listar: async (empresa, c) => { consultas.push([empresa, c]); return structuredClone(registros[c]); }, guardar: async (...args) => { guardados.push(args); return args[3]; }, borrar: async (...args) => borrados.push(args), historial: async (...args) => { historial.push(args); return []; } };
  const root = { document, Intl, crypto: { randomUUID: () => 'nuevo' }, fetch: async p => ({ ok: true, json: async () => JSON.parse(read(p)) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  vm.runInNewContext(read('kit-armazon.js'), root);
  root.App.registrarVista = (k, v) => { vistas[k] = v; };
  for (const f of ['kit-validacion.js', 'kit-actores.js', 'kit-vista-actores.js']) vm.runInNewContext(read(f), root);
  let vigente = true; const params = { empresa: 'empresa-1', puedeEditar: editar, rol: editar ? 'responsable' : 'demostrador', vigente: () => vigente };
  const limpiar = await vistas['actores/' + vista].render(contenedor, datos, params);
  return { root, document, datos, contenedor, consultas, guardados, borrados, historial, limpiar, salir: () => { vigente = false; limpiar?.(); } };
}
const buscar = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);
const campo = (n, nombre) => n.todos().find(x => x.name === nombre);
const form = n => n.todos().find(x => x.tagName === 'FORM');
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const panel = m => m.document.body.todos().filter(x => x.attrs.role === 'dialog').at(-1);
test('Formulario rechaza Alto medio, muestra definiciones y solo admite subidas', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Editar').onclick();
  assert.match(m.contenedor.textContent,/no cuenta con recursos o capacidad para incidir/); campo(m.contenedor,'influencia').value = 'Alto medio'; campo(m.contenedor,'influencia').oninput();
  form(m.contenedor).onsubmit({preventDefault(){}}); assert.equal(campo(m.contenedor,'influencia').attrs['aria-invalid'],'true'); assert.match(m.contenedor.textContent,/Alto medio/); assert.equal(m.guardados.length,0);
  campo(m.contenedor,'influencia').value = '3'; campo(m.contenedor,'impacto').value = '1'; campo(m.contenedor,'impacto').oninput();
  assert.match(m.contenedor.textContent,/Nivel calculado: Seguimiento periférico/);
  assert.deepEqual(campo(m.contenedor,'nivel_ajustado').options.map(o => o.value),['',activa,cautelosa]);
  assert.ok(!campo(m.contenedor,'motivo_ajuste').options.some(o => o.value === esquema.campos.motivo_ajuste.valores[4]));
});
test('Guardado con vista previa, ajuste y normalización; solo empresa y colección abiertas', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Agregar').onclick();
  const a = actores()[4]; Object.entries(a).filter(([k]) => k !== 'id').forEach(([k,v]) => { campo(m.contenedor,k).value = v; });
  campo(m.contenedor,'influencia').value = 'Media'; campo(m.contenedor,'influencia').oninput();
  form(m.contenedor).onsubmit({preventDefault(){}}); assert.equal(m.guardados.length,0); await buscar(m.contenedor,'Confirmar guardado').onclick();
  assert.deepEqual(m.guardados[0].slice(0,3),['empresa-1','actores','act-nuevo']); assert.equal(m.guardados[0][3].influencia,3); assert.equal(m.guardados[0][3].nivel_ajustado,activa);
});
test('Borrado requiere confirmación propia e historial filtra actores', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Borrar').onclick(); assert.equal(m.borrados.length,0); buscar(m.contenedor,'Cancelar').onclick(); assert.equal(m.borrados.length,0);
  buscar(m.contenedor,'Borrar').onclick(); await buscar(m.contenedor,'Confirmar borrado').onclick(); assert.deepEqual(m.borrados[0],['empresa-1','actores','act-0']);
  await buscar(m.contenedor,'Historial de cambios').onclick(); assert.equal(m.historial[0][0],'empresa-1'); assert.equal(m.historial[0][1].coleccion,'actores'); assert.match(m.contenedor.textContent,/Todavía no hay cambios/);
});

const cuadro = (m,nombre = activa) => m.contenedor.todos().find(n => n.dataset.cuadrante === nombre);
const tarjetas = m => panel(m).todos().filter(n => n.className === 'ka-organizacion');
const centro = m => m.contenedor.todos().find(n => n.className === 'ka-centro');
const escape = m => m.document.eventos.keydown({key:'Escape',preventDefault(){}});
function muestra() {
  const base = {...actores()[1],influencia:4,impacto:2,categoria:'Instituciones gubernamentales'};
  return [
    {...base,id:'a',institucion:'Organización Nube',orden:'Nacional',posicion:'Favorable',caracterizacion:'Texto único'},
    {...base,id:'b',institucion:' Organización Nube ',orden:'Nacional',posicion:'Neutral',impacto:3,caracterizacion:'Texto único'},
    {...base,id:'c',institucion:'Organización Nube',orden:'Nacional',posicion:'Desfavorable',impacto:5,tension:5},
    {...base,id:'d',institucion:'Organización Local',orden:'Local',posicion:'Neutral'},
    {...base,id:'e',institucion:'Organización Regional',orden:'Regional',posicion:'Desfavorable'},
    {...base,id:'f',institucion:'Organización Internacional',orden:'Internacional',posicion:'Favorable'},
    {...base,id:'g',institucion:'Organización Sin orden',orden:'',posicion:'Neutral'},
    {...base,id:'h',institucion:'Organización Aula',categoria:'Academia',posicion:'Neutral'}
  ];
}
test('E24: agrupa instituciones exactas, cuenta organizaciones por cuadrante y registros en círculo', async () => {
  const m = await montar('mapa',true,{actores:muestra()});
  assert.match(cuadro(m).attrs['aria-label'],/6 organizaciones, 100 %/);
  assert.match(cuadro(m,estrategico).textContent,/1\s+organización · .*Incluye 1 organización que también está en otro cuadrante/);
  assert.match(cuadro(m).textContent,/Incluye 1 organización que también está en otro cuadrante/);
  assert.match(centro(m).textContent,/6 Organizaciones identificadas/);
  assert.deepEqual(m.consultas.map(c => c[1]),['actores','actores-contactos','actores-resumen']);
  assert.equal(m.contenedor.todos().filter(n => n.tagName === 'BUTTON').length,5);
  const exacta = await montar('mapa',true,{actores:[...muestra(),{...muestra()[0],id:'i',institucion:'organización Nube'}]});
  await centro(exacta).onclick(); assert.match(panel(exacta).textContent,/Organizaciones identificadas\s+7/);
});
test('E24: filtros combinables, posiciones mixtas y autoridades ordenadas', async () => {
  const m = await montar('mapa',true,{actores:muestra()}); await cuadro(m).onclick();
  const nombres = () => tarjetas(m).map(n => n.children[1].textContent);
  assert.deepEqual(nombres(),['Organización Internacional','Organización Nube','Organización Regional','Organización Local','Organización Sin orden','Organización Aula']);
  const favorable = buscar(panel(m),'2 Favorables'), neutral = buscar(panel(m),'4 Neutrales');
  favorable.onclick(); assert.equal(favorable.attrs['aria-pressed'],'true'); assert.deepEqual(nombres(),['Organización Internacional','Organización Nube']);
  neutral.onclick(); assert.equal(nombres().length,5);
  favorable.onclick(); assert.ok(nombres().includes('Organización Nube')); assert.equal(nombres().length,4);
  const select = panel(m).todos().find(n => n.tagName === 'SELECT'); select.value = 'Academia'; select.onchange(); assert.deepEqual(nombres(),['Organización Aula']);
  neutral.onclick(); assert.deepEqual(nombres(),['Organización Aula']);
  favorable.onclick(); assert.equal(nombres().length,0); assert.match(panel(m).textContent,/No hay organizaciones/);
  select.value = ''; select.onchange(); assert.equal(nombres().length,2);
});
test('E24: ficha completa, contactos, intensidad, detalle plegado y foco de ventanas apiladas', async () => {
  const lista = muestra(); lista[0].nivel_ajustado = activa; lista[0].motivo_ajuste = 'Decisión de prueba';
  const m = await montar('mapa',true,{actores:lista,'actores-contactos':[{id:'a',nombre:'Persona de ejemplo',telefono:'000000',correo:'persona@example.test',ejemplo:true}]});
  const q = cuadro(m); q.focus(); await q.onclick(); const lateral = panel(m);
  const tarjeta = tarjetas(m).find(n => n.textContent.includes('Organización Nube')); tarjeta.focus(); tarjeta.onclick();
  const ficha = panel(m); assert.notEqual(ficha,lateral); assert.equal(lateral.parent.inert,true);
  assert.match(ficha.textContent,/2 a 5/); assert.match(ficha.textContent,/4 · Alta/); assert.match(ficha.textContent,/Mixta/);
  assert.match(ficha.textContent,/1 favorable · 1 neutral · 1 desfavorable/);
  assert.equal(ficha.textContent.split('Texto único').length-1,1);
  assert.match(ficha.textContent,/Persona de ejemplo.*Dato de ejemplo/); assert.match(ficha.textContent,/No registrado/); assert.match(ficha.textContent,/000000 persona@example.test/);
  const detalle = ficha.todos().find(n => n.tagName === 'DETAILS'); assert.ok(!detalle.open); assert.match(detalle.textContent,/Ajustado: Decisión de prueba/); assert.match(detalle.textContent,/⚠ Alerta/);
  assert.ok(detalle.todos().some(n => n.tagName === 'TH' && n.title?.includes('1:')));
  let atrapado = false; m.document.eventos.keydown({key:'Tab',shiftKey:true,preventDefault(){atrapado=true;}}); assert.equal(atrapado,true);
  escape(m); assert.equal(panel(m),lateral); assert.equal(m.document.activeElement,tarjeta); assert.equal(lateral.parent.inert,undefined);
  escape(m); assert.equal(panel(m),undefined); assert.equal(m.document.activeElement,q); assert.equal(m.contenedor.inert,undefined);
  await q.onclick(); m.salir(); assert.equal(panel(m),undefined); assert.equal(m.document.eventos.keydown,undefined);
});
test('E24: resumen omite categorías vacías y posiciones superpuestas', async () => {
  const m = await montar('mapa',false,{actores:muestra()}); await centro(m).onclick();
  assert.match(panel(m).textContent,/Organizaciones identificadas\s+6/);
  assert.equal(centro(m).attrs['aria-label'],'6 Organizaciones identificadas');
  for (const nombre of ['Autoridades','Academia']) assert.match(panel(m).textContent,new RegExp(nombre));
  assert.ok(m.document.body.todos().some(x => x.className === 'ka-fondo ka-fondo-centro'), 'el resumen abre como ventana centrada');
  const tabla=panel(m).todos().find(n=>n.className==='ka-resumen-tabla');
  assert.equal(tabla.tagName,'TABLE');assert.doesNotMatch(tabla.textContent,/actores|Gremios|Comunidades|Proveedores|Medios/);
  assert.ok(tabla.todos().filter(n=>n.tagName==='TD').every(n=>Number(n.textContent)>0));
  assert.match(tabla.textContent,/Academia 1/);
  const posiciones=panel(m).todos().filter(n=>n.className==='ka-resumen-posicion');
  assert.equal(posiciones.length,3);posiciones.forEach(n=>{assert.equal(n.children[0].tagName,'STRONG');assert.ok(n.children[1].className.includes('ka-etiqueta'));});
  assert.match(panel(m).textContent,/2\s*Favorables/); assert.match(panel(m).textContent,/4 Neutrales/); assert.match(panel(m).textContent,/2 Desfavorables/); assert.match(panel(m).textContent,/1 organización con cargos de distinta posición/);
});
test('E24: logos se piden bajo demanda una vez, rechazan SVG y URL', async () => {
  for (const imagen of ['data:image/svg+xml;base64,PHN2Zz4=','https://example.test/logo.png','data:image/png;base64,YQ==']) {
    const m = await montar('mapa',true,{actores:muestra(),'actores-logos':[{id:'organizacion-nube',institucion:'Organización Nube',imagen}]});
    assert.ok(!m.consultas.some(c => c[1] === 'actores-logos')); await cuadro(m).onclick();
    const img = tarjetas(m).find(n => n.textContent.includes('Organización Nube')).children[0];
    assert.equal(img.src,imagen.startsWith('data:image/png') ? imagen : 'img/actores/autoridades.svg');
    escape(m); await centro(m).onclick(); escape(m); await cuadro(m).onclick(); assert.equal(m.consultas.filter(c => c[1] === 'actores-logos').length,1);
  }
});
test('E24: fecha técnica, vacíos, demostrador y DOM seguro', async () => {
  const m = await montar('mapa',false,{'actores-resumen':[{id:'resumen',fecha_corte:'2026-10-27'}]}); assert.match(m.contenedor.textContent,/Mapeo con corte a octubre de 2026\./); assert.doesNotMatch(m.contenedor.textContent,/27 de octubre/); assert.match(m.contenedor.textContent,/Ley 1581 de 2012/);
  const sin = await montar(); assert.doesNotMatch(sin.contenedor.textContent,/Mapeo con corte/);
  for (const permiso of [true,false]) { const v = await montar('mapa',permiso,{actores:[]}); assert.match(v.contenedor.textContent,/aún no tiene actores/); assert.equal(v.contenedor.todos().some(n => n.tagName === 'A'),permiso); }
  const a = await montar('alimentacion',false); assert.equal(a.consultas.length,0); assert.ok(!form(a.contenedor));
  const masivo = await montar('mapa',false,{actores:Array.from({length:180},(_,i) => ({...actores()[1],id:'a'+i,institucion:'<script>Ejemplo '+i+'</script>'}))});
  await cuadro(masivo).onclick(); assert.equal(tarjetas(masivo).length,180); assert.ok(!masivo.document.body.todos().some(n => n.tagName === 'SCRIPT'));
});

test('E24: esquemas nuevos usan tipos existentes, límites y referencias', async () => {
  const { default: V } = await import('../public/kit-validacion.js');
  const nuevo = n => JSON.parse(read('config/esquemas/' + n + '.json'));
  const contactos = nuevo('actores-contactos');
  const refs = {actores:new Set(['act-001'])};
  assert.equal(V.validar({id:'act-001',nombre:'Persona inventada',ejemplo:true},contactos,refs).ok,true);
  assert.equal(V.validar({id:'act-002'},contactos,refs).ok,false);
  for (const [campo,max] of [['nombre',120],['telefono',40],['correo',160]]) assert.equal(V.validar({id:'act-001',[campo]:'x'.repeat(max+1)},contactos,refs).ok,false);
  assert.equal(V.validar({id:'act-001',ejemplo:'sí'},contactos,refs).ok,false);
  assert.equal(V.validar({id:'resumen',fecha_corte:'2026-02-30'},nuevo('actores-resumen')).ok,false);
  assert.equal(V.validar({id:'otro',fecha_corte:'2026-10-27'},nuevo('actores-resumen')).ok,false);
  for (const nombre of ['actores-logos','perfil']) {
    const e = nuevo(nombre), registro = {id:nombre === 'perfil' ? 'logo' : 'organizacion-ficticia',institucion:'Organización ficticia',imagen:'data:image/png;base64,YQ=='};
    assert.equal(V.validar(registro,e).ok,true);
    assert.equal(V.validar({...registro,imagen:'x'.repeat(45001)},e).ok,false);
  }
});

test('E24: una carga de logos concurrente se comparte y se descarta al salir', async () => {
  const m = await montar(); let liberar, llamadas = 0;
  m.datos.listar = async () => { llamadas++; return new Promise(r => { liberar = r; }); };
  const primero = cuadro(m).onclick(); escape(m); const segundo = centro(m).onclick();
  assert.equal(llamadas,1); m.salir(); liberar([]); await Promise.all([primero,segundo]);
  assert.equal(panel(m),undefined); assert.equal(m.document.eventos.keydown,undefined);
});
test('E24: ficha de un solo cargo muestra valores únicos y caracterización vacía', async () => {
  const m = await montar('mapa',true,{actores:[actores()[1]]}); await cuadro(m).onclick(); tarjetas(m)[0].onclick();
  assert.match(panel(m).textContent,/Impacto 2 · Baja Influencia 4 · Alta Posición Neutral/);
  assert.match(panel(m).textContent,/Sin caracterización registrada/); assert.doesNotMatch(panel(m).textContent,/Mixta/);
});

test('E25: ventanas usan h2 y el título de página conserva h1', async () => {
  const m = await montar('mapa',true,{actores:muestra()});
  const pagina = m.root.App.tituloMarca('Módulo I · Mapeo de actores');
  m.contenedor.append(pagina);
  assert.equal(pagina.children[0].tagName,'H1');
  const comprobar = () => {
    const p = panel(m);
    assert.equal(p.todos().filter(n => n.tagName === 'H1').length,0);
    assert.equal(p.todos().filter(n => n.tagName === 'H2').length,1);
    assert.ok(p.todos().some(n => n.id === p.attrs['aria-labelledby']));
    assert.equal(m.document.body.todos().filter(n => n.tagName === 'H1').length,1);
  };
  await cuadro(m).onclick(); comprobar();
  tarjetas(m)[0].onclick(); comprobar(); escape(m); escape(m);
  await centro(m).onclick(); comprobar();
});

test('E25: cifra separa número y contexto conservando texto y aria-label', async () => {
  const m = await montar('mapa',true,{actores:muestra()});
  for (const [nombre,cantidad,porcentaje] of [[activa,6,'100'],[estrategico,1,'17'],[periferico,0,'0'],[cautelosa,0,'0']]) {
    const q = cuadro(m,nombre), cifra = q.children.find(n => n.className === 'ka-cifra');
    const contexto = `${cantidad === 1 ? 'organización' : 'organizaciones'} · ${porcentaje} %`;
    assert.deepEqual(cifra.children.map(n => n.tagName),['STRONG','SPAN']);
    assert.equal(cifra.children[0].textContent,String(cantidad));
    assert.equal(cifra.children.map(n => n.textContent).join(''),`${cantidad} ${contexto}`);
    assert.equal(q.attrs['aria-label'],`${nombre}: ${cantidad} ${cantidad === 1 ? 'organización' : 'organizaciones'}, ${porcentaje} %`);
  }
});

test('E26: dentro del mismo orden, gobernación antes que asamblea y alcaldía antes que concejo', async () => {
  const base = {...actores()[1],influencia:4,impacto:2,categoria:'Instituciones gubernamentales',posicion:'Neutral'};
  const lista = [
    {...base,id:'r1',institucion:'Asamblea Departamental de Prueba',orden:'Regional'},
    {...base,id:'r2',institucion:'Contraloría de Prueba',orden:'Regional'},
    {...base,id:'r3',institucion:'Gobernación de Prueba',orden:'Regional'},
    {...base,id:'l1',institucion:'Concejo Municipal de Prueba',orden:'Local'},
    {...base,id:'l2',institucion:'Aguas de Prueba',orden:'Local'},
    {...base,id:'l3',institucion:'Alcaldía de Prueba',orden:'Local'}
  ];
  const m = await montar('mapa',true,{actores:lista}); await cuadro(m).onclick();
  assert.deepEqual(tarjetas(m).map(n => n.children[1].textContent),['Gobernación de Prueba','Asamblea Departamental de Prueba','Contraloría de Prueba','Alcaldía de Prueba','Concejo Municipal de Prueba','Aguas de Prueba']);
});

test('E34: ficha de actor usa cierre común accesible con foco inicial',async()=>{
 const m=await montar('mapa',true,{actores:muestra()});await cuadro(m).onclick();const origen=tarjetas(m)[0];origen.focus();origen.onclick();
 const p=panel(m),cerrar=p.todos().find(n=>n.attrs['aria-label']==='Cerrar');assert.equal(cerrar.className,'kit-cerrar');assert.equal(cerrar.textContent,'×');assert.equal(cerrar.type,'button');assert.equal(m.document.activeElement,cerrar);
 cerrar.onclick();assert.equal(m.document.activeElement,origen);
});
