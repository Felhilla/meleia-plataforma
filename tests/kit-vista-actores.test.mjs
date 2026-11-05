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
  addEventListener(k, fn) { (this.escuchas ||= {})[k] = fn; }
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
  document.createElementNS = (ns, tag) => new Nodo(tag, document); document.body = new Nodo('body', document); const contenedor = new Nodo('main', document); document.body.append(contenedor);
  const consultas = [], guardados = [], borrados = [], historial = [], vistas = {};
  const registros = { actores: actores(), 'actores-contactos': [], 'actores-resumen': [], 'actores-logos': [], ...extras };
  const datos = { listar: async (empresa, c) => { consultas.push([empresa, c]); return structuredClone(registros[c]); }, guardar: async (...args) => { guardados.push(args); return args[3]; }, borrar: async (...args) => borrados.push(args), historial: async (...args) => { historial.push(args); return []; } };
  const root = { document, Intl, crypto: { randomUUID: () => 'nuevo' }, fetch: async p => ({ ok: true, json: async () => JSON.parse(read(p)) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  vm.runInNewContext(read('kit-armazon.js'), root);
  root.App.registrarVista = (k, v) => { vistas[k] = v; };
  for (const f of ['kit-validacion.js', 'kit-actores.js', 'kit-vista-carga-excel.js', 'kit-vista-actores.js']) vm.runInNewContext(read(f), root);
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

const escape = m => m.document.eventos.keydown({key:'Escape',preventDefault(){}});
const puntos = m => m.contenedor.todos().filter(n => String(n.attrs.class || '').startsWith('ka-punto'));
const principales = m => m.contenedor.todos().filter(n => n.className === 'ka-principal');
function muestra() {
  const base = {...actores()[1],influencia:4,impacto:2,categoria:'Instituciones gubernamentales'};
  return [
    {...base,id:'a',institucion:'Organización Nube',orden:'Nacional',posicion:'Favorable',caracterizacion:'Texto único',nombre_servidor:'Persona Inventada'},
    {...base,id:'b',institucion:' Organización Nube ',orden:'Nacional',posicion:'Desfavorable',impacto:3,caracterizacion:'Texto único'},
    {...base,id:'c',institucion:'Organización Nube',orden:'Nacional',posicion:'Desfavorable',impacto:5,tension:5},
    {...base,id:'d',institucion:'Organización Local',orden:'Local',posicion:'Neutral',influencia:2},
    {...base,id:'e',institucion:'Organización Regional',orden:'Regional',posicion:'Desfavorable',influencia:5,impacto:5},
    {...base,id:'f',institucion:'Organización Internacional',orden:'Internacional',posicion:'Favorable',influencia:1,impacto:1},
    {...base,id:'g',institucion:'Organización Sin orden',orden:'',posicion:'Neutral'},
    {...base,id:'h',institucion:'Organización Aula',categoria:'Academia',posicion:'Neutral'}
  ];
}

test('E41: resumen por posición oficial, total y un punto por organización con forma y nombre', async () => {
  const m = await montar('mapa',false,{actores:muestra()});
  const resumen = m.contenedor.todos().find(n => n.className === 'ka-resumen-tarjeta');
  assert.match(resumen.textContent,/1\s+Favorables/); assert.match(resumen.textContent,/3\s+Neutrales/); assert.match(resumen.textContent,/2\s+Desfavorables/); assert.match(resumen.textContent,/6\s+Organizaciones en total/);
  const p = puntos(m); assert.equal(p.length,6);
  const nube = p.find(n => n.attrs['aria-label'].startsWith('Organización Nube'));
  assert.equal(nube.tagName,'PATH'); assert.match(nube.attrs['aria-label'],/Desfavorable\. Influencia 4,0, impacto 3,3/);
  assert.equal(p.find(n => n.attrs['aria-label'].startsWith('Organización Local')).tagName,'RECT');
  assert.equal(p.find(n => n.attrs['aria-label'].startsWith('Organización Internacional')).tagName,'CIRCLE');
  assert.ok(m.contenedor.todos().some(n => n.className === 'ka-convenciones'));
});
test('E41: principales por grupo de interés ordenadas por promedio y vista por grupo', async () => {
  const m = await montar('mapa',false,{actores:muestra()});
  const grupos = m.contenedor.todos().filter(n => n.className === 'ka-principales-grupo');
  assert.deepEqual(grupos.map(g => g.children[0].textContent),['Autoridades','Academia']);
  assert.deepEqual(grupos[0].todos().filter(n => n.className === 'ka-principal').map(n => n.textContent),['Organización Regional','Organización Nube','Organización Sin orden','Organización Local','Organización Internacional']);
  const select = m.contenedor.todos().find(n => n.tagName === 'SELECT');
  assert.deepEqual(select.children.map(o => o.textContent),['General','Autoridades','Academia']);
  select.value = 'Academia'; select.onchange();
  assert.equal(puntos(m).length,1); assert.match(m.contenedor.textContent,/1\s+Organización en total/); assert.match(m.contenedor.textContent,/Vista: Academia/);
});
test('E41: ficha de la organización con promedio, posición oficial, nombres, contactos y cierre común', async () => {
  const m = await montar('mapa',true,{actores:muestra(),'actores-contactos':[{id:'b',nombre:'Persona de ejemplo',telefono:'000000',correo:'persona@example.test',ejemplo:true}]});
  const origen = principales(m).find(n => n.textContent === 'Organización Nube'); origen.focus(); await origen.onclick(); await tick();
  const ficha = panel(m);
  assert.match(ficha.textContent,/3,3 · promedio de 3 actores/); assert.match(ficha.textContent,/4,0 · promedio de 3 actores/); assert.match(ficha.textContent,/Posición\s*Desfavorable/);
  assert.equal(ficha.textContent.split('Texto único').length-1,1);
  assert.match(ficha.textContent,/Persona Inventada/); assert.match(ficha.textContent,/Persona de ejemplo.*Dato de ejemplo/); assert.match(ficha.textContent,/Sin nombre registrado/); assert.match(ficha.textContent,/000000 persona@example.test/);
  const detalle = ficha.todos().find(n => n.tagName === 'DETAILS'); assert.ok(!detalle.open); assert.match(detalle.textContent,/⚠ Alerta/); assert.doesNotMatch(detalle.textContent,/Ajustado/);
  assert.equal(ficha.todos().filter(n => n.tagName === 'H2').length,1); assert.equal(ficha.todos().filter(n => n.tagName === 'H1').length,0);
  const cerrar = ficha.todos().find(n => n.attrs['aria-label'] === 'Cerrar'); assert.equal(cerrar.className,'kit-cerrar'); assert.equal(m.document.activeElement,cerrar);
  cerrar.onclick(); assert.equal(panel(m),undefined); assert.equal(m.document.activeElement,origen);
});
test('E41: la modificación de la organización se muestra con autor, fecha y justificación', async () => {
  const org = { id:'org-organizacion-nube', nombre:'Organización Nube', categoria:'Instituciones gubernamentales', posicion:'Neutral', ajuste_influencia:2, ajuste_impacto:5, ajuste_justificacion:'Lidera la mesa.', ajuste_autor:'Persona Inventada', ajuste_fecha:'2026-11-05' };
  const m = await montar('mapa',true,{actores:muestra(),'actores-organizaciones':[org]});
  assert.match(puntos(m).find(n => n.attrs['aria-label'].startsWith('Organización Nube')).attrs['aria-label'],/Neutral\. Influencia 2,0, impacto 5,0\. Gestión cautelosa/);
  await principales(m).find(n => n.textContent === 'Organización Nube').onclick(); await tick();
  assert.match(panel(m).textContent,/Resultado modificado por Persona Inventada el 2026-11-05: Lidera la mesa\./); assert.match(panel(m).textContent,/5,0 · modificado/);
});
test('E41: logos bajo demanda una sola vez y sin SVG ni URL externas', async () => {
  for (const imagen of ['data:image/svg+xml;base64,PHN2Zz4=','https://example.test/logo.png','data:image/png;base64,YQ==']) {
    const m = await montar('mapa',true,{actores:muestra(),'actores-logos':[{id:'organizacion-nube',institucion:'Organización Nube',imagen}]});
    assert.ok(!m.consultas.some(c => c[1] === 'actores-logos'));
    const b = principales(m).find(n => n.textContent === 'Organización Nube'); await b.onclick(); await tick();
    assert.equal(panel(m).todos().find(n => n.className === 'ka-logo').src,imagen.startsWith('data:image/png') ? imagen : 'img/actores/autoridades.svg');
    escape(m); await b.onclick(); await tick(); assert.equal(m.consultas.filter(c => c[1] === 'actores-logos').length,1);
  }
});
test('E41: fecha técnica, vacíos, demostrador y DOM seguro', async () => {
  const m = await montar('mapa',false,{'actores-resumen':[{id:'resumen',fecha_corte:'2026-10-27'}]}); assert.match(m.contenedor.textContent,/Mapeo con corte a octubre de 2026\./);
  const sin = await montar(); assert.doesNotMatch(sin.contenedor.textContent,/Mapeo con corte/);
  for (const permiso of [true,false]) { const v = await montar('mapa',permiso,{actores:[]}); assert.match(v.contenedor.textContent,/aún no tiene organizaciones/); assert.equal(v.contenedor.todos().some(n => n.tagName === 'A'),permiso); }
  const a = await montar('alimentacion',false); assert.equal(a.consultas.length,0); assert.ok(!form(a.contenedor));
  const masivo = await montar('mapa',false,{actores:Array.from({length:180},(_,i) => ({...actores()[1],id:'a'+i,institucion:'<script>Ejemplo '+i+'</script>'}))});
  assert.equal(puntos(masivo).length,180); assert.ok(!masivo.document.body.todos().some(n => n.tagName === 'SCRIPT'));
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
