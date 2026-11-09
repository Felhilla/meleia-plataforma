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
  const registros = { actores: actores(), 'actores-contactos': [], 'actores-resumen': [], 'actores-logos': [], 'actores-organizaciones': [], ...extras };
  const datos = { listar: async (empresa, c) => { consultas.push([empresa, c]); return structuredClone(registros[c]); }, guardar: async (...args) => { guardados.push(args); return args[3]; }, guardarVarios: async (...args) => { guardados.push(['varios', ...args]); }, borrar: async (...args) => borrados.push(args), historial: async (...args) => { historial.push(args); return []; } };
  const root = { document, Intl, crypto: { randomUUID: () => 'nuevo' }, fetch: async p => ({ ok: true, json: async () => JSON.parse(read(p)) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  vm.runInNewContext(read('kit-armazon.js'), root);
  root.App.registrarVista = (k, v) => { vistas[k] = v; };
  for (const f of ['kit-validacion.js', 'kit-actores.js', 'kit-vista-carga-excel.js', 'kit-cuadrantes.js', 'kit-vista-actores.js']) vm.runInNewContext(read(f), root);
  let vigente = true; const params = { empresa: 'empresa-1', puedeEditar: editar, rol: editar ? 'responsable' : 'demostrador', vigente: () => vigente };
  const limpiar = await vistas['actores/' + vista].render(contenedor, datos, params);
  return { root, document, datos, contenedor, consultas, guardados, borrados, historial, limpiar, salir: () => { vigente = false; limpiar?.(); } };
}
const buscar = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);
const campo = (n, nombre) => n.todos().find(x => x.name === nombre);
const form = n => n.todos().find(x => x.tagName === 'FORM');
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const panel = m => m.document.body.todos().filter(x => x.attrs.role === 'dialog').at(-1);
const escalaDe = (n, etiqueta) => n.todos().find(x => x.tagName === 'FIELDSET' && x.children[0]?.textContent === etiqueta + ' *');
const marcar = (n, etiqueta, v) => escalaDe(n, etiqueta).todos().find(x => x.tagName === 'BUTTON' && x.textContent === String(v)).onclick();
test('E41 formulario: obligatorios marcados en su campo y escalas con definición', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Agregar organización').onclick();
  const f = form(m.contenedor);
  assert.ok(escalaDe(f,'Influencia').todos().some(x => String(x.attrs['aria-label']).includes('no cuenta con recursos o capacidad para incidir')));
  assert.deepEqual(['Influencia','Impacto','Dependencia','Tensión','Responsabilidad'].map(e => !!escalaDe(f,e)), [true,true,true,true,true]);
  f.onsubmit({preventDefault(){}}); assert.equal(m.guardados.length,0); assert.match(m.contenedor.textContent,/Revisa los \d+ campos marcados/);
  assert.match(m.contenedor.textContent,/Escribe el nombre del actor\./); assert.match(m.contenedor.textContent,/Describe la organización\./);
  marcar(f,'Influencia',3); assert.match(m.contenedor.textContent,/3: /);
});
test('E41 guardado: organización, actores, contactos y modificación con autor', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Agregar organización').onclick(); const f = form(m.contenedor);
  const poner = (nombre, valor) => { campo(f, nombre).value = valor; };
  poner('org-nombre','Asociación Inventada del Río'); poner('org-categoria','Comunidades y asociaciones'); poner('org-posicion','Neutral'); poner('org-caracterizacion','Organización inventada para la prueba.');
  poner('ka-a0-nombre','Persona Inventada'); poner('ka-a0-cargo','Presidenta'); poner('ka-a0-posicion','Desfavorable'); poner('ka-a0-caracterizacion','Lidera la mesa inventada.'); poner('ka-a0-correo','persona@example.test');
  [['Influencia',4],['Impacto',5],['Dependencia',2],['Tensión',4],['Responsabilidad',1]].forEach(([e,v]) => marcar(f,e,v));
  poner('ka-a0-caracterizacion','x'.repeat(501)); f.onsubmit({preventDefault(){}}); assert.match(m.contenedor.textContent,/Máximo 500 caracteres/); assert.equal(m.guardados.length,0);
  poner('ka-a0-caracterizacion','Lidera la mesa inventada.');
  f.todos().find(x => x.id === 'ka-modificar').checked = true; poner('mod-influencia','2,5'); poner('mod-impacto','5'); poner('mod-justificacion','Convoca a toda la vereda.');
  f.onsubmit({preventDefault(){}}); assert.match(m.contenedor.textContent,/Para modificar el resultado se necesitan/); assert.equal(m.guardados.length,0);
  poner('mod-autor','Persona Revisora'); f.onsubmit({preventDefault(){}});
  assert.match(m.contenedor.textContent,/Resultado: influencia 2,5, impacto 5,0 \(modificado\)\. Cuadrante: Gestión cautelosa/);
  await buscar(m.contenedor,'Confirmar guardado').onclick();
  const [org, actoresG, contactosG] = m.guardados;
  assert.deepEqual(org.slice(0,3),['empresa-1','actores-organizaciones','org-asociacion-inventada-del-rio']);
  assert.equal(org[3].ajuste_autor,'Persona Revisora'); assert.equal(org[3].ajuste_influencia,2.5); assert.match(org[3].ajuste_fecha,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(actoresG[2],'actores'); assert.equal(actoresG[3][0].institucion,'Asociación Inventada del Río'); assert.equal(actoresG[3][0].nombre_servidor,'Persona Inventada'); assert.equal(actoresG[3][0].influencia,4); assert.equal(actoresG[3][0].id,'act-nuevo');
  assert.equal(JSON.stringify(contactosG.slice(2)),JSON.stringify(['actores-contactos',[{id:'act-nuevo',nombre:'Persona Inventada',telefono:'',correo:'persona@example.test'}]]));
});
test('Borrado requiere confirmación propia e historial filtra actores', async () => {
  const m = await montar('alimentacion'); buscar(m.contenedor,'Borrar').onclick(); assert.equal(m.borrados.length,0); buscar(m.contenedor,'Cancelar').onclick(); assert.equal(m.borrados.length,0);
  buscar(m.contenedor,'Borrar').onclick(); await buscar(m.contenedor,'Confirmar borrado').onclick(); assert.deepEqual(m.borrados[0],['empresa-1','actores','act-0']);
  await buscar(m.contenedor,'Historial de cambios').onclick(); assert.equal(m.historial[0][0],'empresa-1'); assert.equal(m.historial[0][1].coleccion,'actores'); assert.match(m.contenedor.textContent,/Todavía no hay cambios/);
});

const escape = m => m.document.eventos.keydown({key:'Escape',preventDefault(){}});
const chips = m => m.contenedor.todos().filter(n => n.className === 'ka-chip');
const cuadrante = (m, nombre) => m.contenedor.todos().find(n => n.attrs.role === 'button' && String(n.attrs['aria-label']).startsWith(nombre + ':'));
const enZoom = m => panel(m).todos().filter(n => ['ka-burbuja'].includes(n.attrs.class) || String(n.attrs.class || '').startsWith('ka-punto-chico'));
const selects = m => m.contenedor.todos().filter(n => n.tagName === 'SELECT');
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
const nube = m => chips(m).find(n => n.textContent === 'Organización Nube');

test('E65: resumen desplegable (favorabilidad, grupos, actores) y un círculo por grupo en cada cuadrante', async () => {
  const m = await montar('mapa',false,{actores:muestra()});
  const resumen = m.contenedor.todos().find(n => n.className === 'ka-resumen-tarjeta');
  assert.match(resumen.textContent,/1\s+Favorables/); assert.match(resumen.textContent,/3\s+Neutrales/); assert.match(resumen.textContent,/2\s+Desfavorables/);
  assert.match(resumen.textContent,/6\s+Favorabilidad/); assert.match(resumen.textContent,/2\s+Grupos de interés/); assert.match(resumen.textContent,/8\s+Actores/);
  assert.equal(resumen.todos().filter(n => n.tagName === 'DETAILS').length,3);
  assert.ok(chips(m).some(n => n.textContent === 'Persona Inventada'), 'los actores se listan por grupo');
  const activa = cuadrante(m,'Gestión activa'); assert.match(activa.attrs['aria-label'],/Autoridades 2, Academia 1/);
  assert.equal(activa.todos().filter(n => n.attrs.class === 'ka-gi-circulo').length,2);
  assert.match(cuadrante(m,'Seguimiento periférico').attrs['aria-label'],/2 organizaciones/);
  assert.match(m.contenedor.textContent,/Matriz de actores/); assert.match(m.contenedor.textContent,/Metodología/);
});
test('E65: Vista por grupo de interés y Filtro por favorabilidad', async () => {
  const m = await montar('mapa',false,{actores:muestra()});
  const [vista, filtro] = selects(m);
  assert.deepEqual(vista.children.map(o => o.textContent),['General','Autoridades','Academia']);
  assert.deepEqual(filtro.children.map(o => o.textContent),['Todas las posiciones','Favorables','Neutrales','Desfavorables']);
  vista.value = 'Academia'; vista.onchange(); assert.match(cuadrante(m,'Gestión activa').attrs['aria-label'],/1 organización \(Academia 1\)/);
  vista.value = ''; filtro.value = 'Desfavorable'; filtro.onchange();
  assert.match(m.contenedor.textContent,/2\s+Favorabilidad/); assert.match(cuadrante(m,'Seguimiento periférico').attrs['aria-label'],/0 organizaciones/);
});
test('E65: zoom del cuadrante con resumen, 7 burbujas con nombre y el resto como puntos pequeños', async () => {
  const lista = Array.from({length:10},(_,i) => ({...actores()[1],id:'z'+i,institucion:'Institución '+i,categoria:'Comunidades y asociaciones',influencia:4,impacto:i < 4 ? 1 : 2,posicion:i % 2 ? 'Favorable' : 'Desfavorable'}));
  const m = await montar('mapa',false,{actores:lista});
  cuadrante(m,'Gestión activa').escuchas.click(); const z = panel(m);
  assert.match(z.textContent,/10\s+Instituciones en el cuadrante/); assert.match(z.textContent,/10\s+Actores en el cuadrante/);
  assert.match(z.textContent,/5\s+Inst\. favorables/); assert.match(z.textContent,/0\s+Inst\. neutrales/); assert.match(z.textContent,/5\s+Inst\. desfavorables/);
  const nodos = enZoom(m); assert.equal(nodos.filter(n => n.attrs.class === 'ka-burbuja').length,7); assert.equal(nodos.filter(n => n.attrs.class !== 'ka-burbuja').length,3);
  assert.ok(z.todos().some(n => n.attrs.class === 'ka-ancla'), 'las calificaciones compartidas llevan punto negro');
  assert.ok(z.todos().some(n => n.attrs.class === 'ka-guia-punteada'));
  const chico = nodos.find(n => n.attrs.class !== 'ka-burbuja'); assert.equal(chico.todos().filter(n => n.tagName === 'TEXT').length,0, 'los puntos pequeños no llevan nombre');
  chico.escuchas.click(); await tick(); assert.ok(panel(m).todos().some(n => n.className === 'ka-ficha-cabecera'), 'el punto abre la ficha');
});
test('E65: ficha de la organización con promedio, posición oficial, nombres, contactos y cierre común', async () => {
  const m = await montar('mapa',true,{actores:muestra(),'actores-contactos':[{id:'b',nombre:'Persona de ejemplo',telefono:'000000',correo:'persona@example.test',ejemplo:true}]});
  const origen = nube(m); origen.focus(); await origen.onclick(); await tick();
  const ficha = panel(m);
  assert.match(ficha.textContent,/3,3 · promedio de 3 actores/); assert.match(ficha.textContent,/4,0 · promedio de 3 actores/); assert.match(ficha.textContent,/Posición\s*Desfavorable/);
  assert.equal(ficha.textContent.split('Texto único').length-1,1);
  assert.match(ficha.textContent,/Persona Inventada/); assert.match(ficha.textContent,/Persona de ejemplo.*Dato de ejemplo/); assert.match(ficha.textContent,/Sin nombre registrado/); assert.match(ficha.textContent,/000000 persona@example.test/);
  const detalle = ficha.todos().find(n => n.tagName === 'DETAILS'); assert.ok(!detalle.open); assert.match(detalle.textContent,/⚠ Alerta/);
  assert.equal(ficha.todos().filter(n => n.tagName === 'H2').length,1);
  const cerrar = ficha.todos().find(n => n.attrs['aria-label'] === 'Cerrar'); assert.equal(cerrar.className,'kit-cerrar'); assert.equal(m.document.activeElement,cerrar);
  cerrar.onclick(); assert.equal(panel(m),undefined); assert.equal(m.document.activeElement,origen);
});
test('E65: ficha del actor y Matriz de actores con toda la información', async () => {
  const m = await montar('mapa',false,{actores:muestra()});
  await chips(m).find(n => n.textContent === 'Persona Inventada').onclick(); const f = panel(m);
  assert.match(f.textContent,/Cargo institucional · Autoridades · Educación · Nacional/); assert.match(f.textContent,/Ver la institución: Organización Nube/);
  escape(m); buscar(m.contenedor,'Matriz de actores').onclick(); const t = panel(m);
  assert.match(t.textContent,/8 actores en 6 organizaciones/);
  const cab = t.todos().filter(n => n.tagName === 'TH').map(n => n.textContent);
  assert.deepEqual(cab.slice(0,7),['Grupo de interés','Orden','Institución','Subgrupo','Actor','Cargo','Posición']);
  assert.equal(t.todos().filter(n => n.tagName === 'TR').length,9);
});
test('E41: la modificación de la organización se muestra con autor, fecha y justificación', async () => {
  const org = { id:'org-organizacion-nube', nombre:'Organización Nube', categoria:'Instituciones gubernamentales', posicion:'Neutral', ajuste_influencia:2, ajuste_impacto:5, ajuste_justificacion:'Lidera la mesa.', ajuste_autor:'Persona Inventada', ajuste_fecha:'2026-11-05' };
  const m = await montar('mapa',true,{actores:muestra(),'actores-organizaciones':[org]});
  cuadrante(m,'Gestión cautelosa').escuchas.click();
  assert.match(enZoom(m).find(n => n.attrs['aria-label'].startsWith('Organización Nube')).attrs['aria-label'],/Neutral\. Influencia 2,0, impacto 5,0/);
  escape(m); await nube(m).onclick(); await tick();
  assert.match(panel(m).textContent,/Resultado modificado por Persona Inventada el 2026-11-05: Lidera la mesa\./); assert.match(panel(m).textContent,/5,0 · modificado/);
});
test('E41: logos bajo demanda una sola vez y sin SVG ni URL externas', async () => {
  for (const imagen of ['data:image/svg+xml;base64,PHN2Zz4=','https://example.test/logo.png','data:image/png;base64,YQ==']) {
    const m = await montar('mapa',true,{actores:muestra(),'actores-logos':[{id:'organizacion-nube',institucion:'Organización Nube',imagen}]});
    assert.ok(!m.consultas.some(c => c[1] === 'actores-logos'));
    const b = nube(m); await b.onclick(); await tick();
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
  assert.equal(chips(masivo).filter(n => n.textContent.startsWith('<script>')).length,180); assert.ok(!masivo.document.body.todos().some(n => n.tagName === 'SCRIPT'));
  cuadrante(masivo,'Gestión activa').escuchas.click(); assert.equal(enZoom(masivo).length,180);
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
