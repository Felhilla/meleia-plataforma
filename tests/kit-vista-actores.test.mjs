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
const cfg = JSON.parse(read('config/kit-actores-config.json')), esquema = JSON.parse(read('config/esquemas/actores.json'));
const [activa, estrategico, periferico, cautelosa] = cfg.niveles.map(n => n.nombre);
function actores() { return [[5,4,'Alcaldía'],[4,2,'Emisora'],[3,5,'JAC'],[2,1,'Universidad'],[3,1,'Gobernación']].map(([influencia,impacto,institucion],i) => ({ id:'act-'+i,influencia,impacto,institucion,cargo:'Cargo institucional',categoria:'Academia',subgrupo:'Educación',orden:'Local',posicion:i === 2 ? 'Desfavorable' : 'Neutral',tension:i === 2 ? 4 : 1,dependencia:2,responsabilidad:2,...(i === 4 ? {nivel_ajustado:activa,motivo_ajuste:esquema.campos.motivo_ajuste.valores[0],explicacion_ajuste:'Capacidad de convocatoria cercana a alta.'} : {})})); }
async function montar(vista = 'mapa', editar = true, extras = {}) {
  const document = { eventos: {}, addEventListener(k, fn) { this.eventos[k] = fn; }, removeEventListener(k) { delete this.eventos[k]; }, createElement(t) { return new Nodo(t, this); } };
  document.body = new Nodo('body', document); const contenedor = new Nodo('main', document); document.body.append(contenedor);
  const consultas = [], guardados = [], borrados = [], historial = [], vistas = {};
  const registros = { actores: actores(), ...extras };
  const datos = { listar: async (empresa, c) => { consultas.push([empresa, c]); return structuredClone(registros[c]); }, guardar: async (...args) => { guardados.push(args); return args[3]; }, borrar: async (...args) => borrados.push(args), historial: async (...args) => { historial.push(args); return []; } };
  const root = { document, Intl, crypto: { randomUUID: () => 'nuevo' }, fetch: async p => ({ ok: true, json: async () => JSON.parse(read(p)) }), App: { el: (tag, txt, clase) => { const n = new Nodo(tag, document); if (txt != null) n.textContent = txt; n.className = clase; return n; }, registrarVista: (k, v) => { vistas[k] = v; }, actualizarVista() {} } };
  for (const f of ['kit-validacion.js', 'kit-actores.js', 'kit-vista-actores.js']) vm.runInNewContext(read(f), root);
  let vigente = true; const params = { empresa: 'empresa-1', puedeEditar: editar, rol: editar ? 'responsable' : 'demostrador', vigente: () => vigente };
  const limpiar = await vistas['actores/' + vista].render(contenedor, datos, params);
  return { root, document, contenedor, consultas, guardados, borrados, historial, limpiar, salir: () => { vigente = false; limpiar?.(); } };
}
const buscar = (n, texto) => n.todos().find(x => x.tagName === 'BUTTON' && x.textContent === texto);
const campo = (n, nombre) => n.todos().find(x => x.name === nombre);
const form = n => n.todos().find(x => x.tagName === 'FORM');
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const panel = m => m.document.body.todos().find(x => x.attrs.role === 'dialog');
test('Mapa: cinco actores en sus cuadrantes finales; solo ficha muestra ajuste; foco y limpieza', async () => {
  const m = await montar();
  for (const [nombre,nivel] of [['Alcaldía',estrategico],['Emisora',activa],['JAC',cautelosa],['Universidad',periferico],['Gobernación',activa]]) {
    const q = m.contenedor.todos().find(n => n.dataset.cuadrante === nivel); assert.match(q.textContent,new RegExp(nombre));
  }
  assert.doesNotMatch(m.contenedor.textContent,/Ajustado|ajuste|Capacidad de convocatoria/);
  assert.deepEqual(m.consultas,[['empresa-1','actores']]);
  const b = buscar(m.contenedor,'Gobernación'); b.focus(); b.onclick();
  assert.match(panel(m).textContent,/Nivel calculado: Seguimiento periférico/); assert.match(panel(m).textContent,/Ajustado a Gestión activa · Motivo:.*Explicación:/);
  assert.equal(m.contenedor.inert,true); const cerrar = buscar(panel(m),'Cerrar'); cerrar.focus(); let prevented = false;
  m.document.eventos.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented=true;}}); assert.equal(prevented,true);
  m.document.eventos.keydown({key:'Escape',preventDefault(){}}); assert.equal(m.document.activeElement,b); assert.equal(panel(m),undefined);
  b.onclick(); m.salir(); assert.equal(panel(m),undefined); assert.equal(m.document.eventos.keydown,undefined);
});
test('Demostrador no ve edición y alimentación no consulta datos', async () => {
  const m = await montar('mapa',false); assert.ok(!buscar(m.contenedor,'Agregar')); buscar(m.contenedor,'Alcaldía').onclick(); assert.ok(!buscar(panel(m),'Editar'));
  const a = await montar('alimentacion',false); assert.equal(a.consultas.length,0); assert.ok(!form(a.contenedor));
});
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
test('Filtros afectan mapa, lista e indicadores; estados vacíos según permiso', async () => {
  const m = await montar(); const atencion = m.contenedor.todos().find(n => n.tagName === 'INPUT' && n.type === 'checkbox');
  atencion.checked = true; atencion.onchange(); assert.deepEqual(m.contenedor.todos().filter(n => n.className === 'ka-dato').map(n => n.children[0].textContent), ['1','0','1','1']); assert.ok(buscar(m.contenedor,'JAC')); assert.ok(!buscar(m.contenedor,'Alcaldía'));
  for (const permiso of [true,false]) { const v = await montar('mapa',permiso,{actores:[]}); assert.match(v.contenedor.textContent,/aún no tiene actores/); assert.equal(v.contenedor.todos().some(n => n.tagName === 'A'),permiso); }
});
test('180 actores conservan botones y texto seguro', async () => {
  const lista = Array.from({length:180},(_,i) => ({...actores()[0],id:'act-'+i,institucion:'<script>Actor '+i+'</script>'}));
  const m = await montar('mapa',false,{actores:lista}); const q = m.contenedor.todos().find(n => n.dataset.cuadrante === estrategico);
  assert.equal(q.todos().filter(n => n.tagName === 'BUTTON').length,180); assert.ok(!m.contenedor.todos().some(n => n.tagName === 'SCRIPT'));
});

test('Mapa primero, resumen compacto, fichas con tooltip y distribución plegable', async () => {
  const m = await montar(); const nodos = m.contenedor.todos();
  assert.equal(m.contenedor.children[0].className,'ka-resumen');
  assert.ok(nodos.findIndex(n => n.className === 'ka-mapa') < nodos.findIndex(n => n.className === 'ka-filtros'));
  const q = nodos.find(n => n.dataset.cuadrante === cautelosa), b = q.todos().find(n => n.tagName === 'BUTTON');
  assert.match(b.title,/JAC · Cargo institucional · Desfavorable · Alerta/);
  assert.doesNotMatch(b.textContent,/Cargo institucional|Desfavorable|Ajustado/);
  assert.ok(nodos.some(n => n.tagName === 'SUMMARY' && n.textContent === 'Ver distribución'));
  assert.equal(nodos.filter(n => n.className === 'ka-eje-influencia').length,1);
});
test('Categoría, orden, posición y subgrupo conservan el filtro compartido', async () => {
  for (const etiqueta of ['Categoría','Orden o alcance','Posición','Subgrupo']) {
    const m = await montar();
    const label = m.contenedor.todos().find(n => n.tagName === 'LABEL' && n.textContent.startsWith(etiqueta));
    assert.ok(label, etiqueta);
    const select = label.children.find(n => n.tagName === 'SELECT');
    select.value = 'Sin coincidencias'; select.onchange();
    assert.equal(m.contenedor.todos().find(n => n.className === 'ka-dato').children[0].textContent,'0');
    assert.equal(m.contenedor.todos().filter(n => n.className === 'ka-actor').length,0);
    assert.match(m.contenedor.textContent,/No hay actores con estos filtros/);
  }
});
