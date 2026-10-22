import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import Plan from '../public/plan.js';
import Riesgos from '../public/riesgos.js';
import Estandares from '../public/estandares.js';
import Materialidad from '../public/materialidad.js';
const leer = ruta => readFileSync(new URL('../public/' + ruta, import.meta.url), 'utf8');
const json = ruta => JSON.parse(leer(ruta));
class Nodo {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.className = ''; this._texto = ''; this.style = {}; this.classList = {add() {}, remove() {}}; }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get textContent() { return this._texto + this.children.map(n => n.textContent).join(' '); }
  append(...n) { n.forEach(v => {v.parent = this; v.document = this.document;}); this.children.push(...n); }
  replaceChildren(...n) { this.children = []; this._texto = ''; this.append(...n); }
  remove() { this.parent.children = this.parent.children.filter(n => n !== this); }
  focus() { this.document.activeElement = this; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  querySelectorAll(selector) {
    if (selector === 'button, a[href]') return [...this.querySelectorAll('button'), ...this.querySelectorAll('a')];
    return this.children.flatMap(n => [...((selector.startsWith('.') ? (n.className || n.attrs.class || '').split(' ').includes(selector.slice(1)) : n.tag === selector) ? [n] : []), ...n.querySelectorAll(selector)]);
  }
}
function montar(nombre, cambiar = () => {}) {
  const document = {documentElement: new Nodo('html'), createElement: t => new Nodo(t), createElementNS: (_, t) => new Nodo(t), getElementById: () => null, addEventListener() {}};
  document.body = new Nodo('body'); document.body.document = document;
  const crear = t => {const n = new Nodo(t); n.document = document; return n;};
  document.createElement = crear; document.createElementNS = (_, t) => crear(t);
  document.querySelectorAll = () => [];
  const eventos = new Map(); document.addEventListener = (k, fn) => eventos.set(k, fn); document.removeEventListener = k => eventos.delete(k);
  const contexto = {document, Plan, Riesgos, Estandares, Materialidad, URLSearchParams, Intl}; contexto.window = contexto;
  vm.runInNewContext(leer('app.js'), contexto);
  const datos = Object.fromEntries(Object.entries({caso:'data/caso.json', riesgos:'data/riesgos.json', estandares:'data/estandares.json', evaluaciones:'data/evaluaciones.json', plan:'data/plan.json', materialidad:'data/materialidad.json', criticidad:'config/criticidad-config.json', materialidadConfig:'config/materialidad-config.json', planConfig:'config/plan-config.json', umbrales:'config/umbrales-config.json'}).map(([k, ruta]) => [k, json(ruta)]));
  cambiar(datos); contexto.App.datos = datos;
  let vista;
  if (nombre === 'metodologia') {contexto.App.registrarVista = () => {}; vm.runInNewContext(leer('vista-caso.js'), contexto);}
  contexto.App.registrarVista = (n, v) => { assert.equal(n, nombre); vista = v; };
  const raiz = crear('main');
  if (nombre) { vm.runInNewContext(leer('vista-' + nombre + '.js'), contexto); vista.render(raiz, datos); }
  return {raiz, datos, App: contexto.App, document, eventos};
}
test('App.resolverRuta: nueve rutas, redirecciones heredadas, ids y rutas inexistentes', () => {
  const {App, datos} = montar();
  const rutas = [['#/', 'caso'], ['#/metodologia','metodologia'], ['#/resultados','resultados'], ['#/ddhh/dimensiones','ddhh/dimensiones'], ['#/ddhh/riesgos','ddhh/riesgos'], ['#/materialidad/impacto','materialidad/impacto'], ['#/materialidad/financiera','materialidad/financiera'], ['#/materialidad/doble','materialidad/doble'], ['#/plan','plan']];
  for (const [ruta, clave] of rutas) {
    const r = App.resolverRuta(ruta, datos); assert.equal(r.clave, clave); assert.equal(r.redirigir, undefined);
  }
  for (const [ruta, destino] of [['#/ddhh/estandares?eje=x','#/ddhh/dimensiones?eje=x'], ['#/ddhh/materialidad/tema-03','#/materialidad/doble/tema-03'], ['#/ddhh/plan?accion=a','#/plan?accion=a'], ['#/ddhh/riesgos/riesgo-999','#/ddhh/riesgos'], ['#/materialidad/doble/tema-99','#/materialidad/doble'], ['#/desconocida','#/']]) assert.equal(App.resolverRuta(ruta, datos).redirigir, destino);
  assert.equal(App.resolverRuta('#/ddhh/riesgos/riesgo-01', datos).id, 'riesgo-01');
  assert.equal(App.resolverRuta('#/materialidad/doble/tema-03', datos).id, 'tema-03');
});
test('metodología: flujo enlazado y resaltado bidireccional, fases y referencias', () => {
  const {raiz, datos} = montar('metodologia');
  assert.equal(raiz.querySelectorAll('h1').length, 0);
  assert.equal(raiz.querySelectorAll('.eslabon').length, 5);
  const pasos = raiz.querySelectorAll('.metodo-flujo-paso'), nodos = raiz.querySelectorAll('.metodo-nodo');
  assert.equal(pasos.length, 4); assert.equal(nodos.length, 4);
  pasos.forEach((p,i) => {
    assert.equal(p.querySelectorAll('.metodo-numero')[0].textContent, String(datos.caso.metodologia.flujo[i].numero));
    assert.equal(nodos[i].querySelectorAll('text')[0].textContent, p.querySelectorAll('.metodo-numero')[0].textContent);
    assert.equal(p.querySelectorAll('a')[0].href, datos.caso.metodologia.flujo[i].destino);
    assert.equal(nodos[i].attrs.href, datos.caso.metodologia.flujo[i].destino);
    p.onfocusin(); assert.equal(nodos[i].attrs['data-activo'], 'true'); p.onfocusout();
    nodos[i].onpointerenter(); assert.equal(p.attrs['data-activo'], 'true'); nodos[i].onpointerleave(); assert.equal(p.attrs['data-activo'], 'false');
  });
  assert.equal(raiz.querySelectorAll('.relato-grupo').length, 3);
  const tarjetas = raiz.querySelectorAll('.relato-estandar'); assert.equal(tarjetas.length, 8);
  tarjetas.forEach(t => {assert.equal(t.attrs['aria-haspopup'], 'dialog'); assert.match(t.querySelectorAll('img')[0].alt, /^Portada de /);});
});
test('estándares: ficha OCDE, relaciones, cambio de contenido, Esc y retorno del foco', () => {
  const {raiz, document, eventos} = montar('metodologia');
  const origen = raiz.querySelectorAll('.relato-estandar').find(t => t.querySelectorAll('h3')[0].textContent === 'OCDE');
  origen.focus(); origen.onclick();
  const panel = document.body.querySelectorAll('.panel')[0];
  assert.equal(panel.attrs.role, 'dialog'); assert.equal(panel.attrs['aria-modal'], 'true');
  assert.deepEqual(panel.querySelectorAll('h3').map(n => n.textContent), ['¿Por qué se eligió?', '¿Qué requerimientos tiene?', '¿Cómo se relaciona con los demás estándares?']);
  const enlaces = panel.querySelectorAll('.metodo-relaciones')[0].querySelectorAll('button');
  assert.deepEqual(enlaces.map(n => n.textContent), ['PRNU','GRI 3','GRI 11']);
  eventos.get('keydown')({key:'Tab', shiftKey:true, preventDefault(){}}); assert.equal(document.activeElement, enlaces.at(-1));
  eventos.get('keydown')({key:'Tab', preventDefault(){}}); assert.equal(document.activeElement.textContent, 'Cerrar ficha ×');
  enlaces[1].onclick(); assert.equal(panel.querySelectorAll('h2')[0].textContent, 'GRI 3');
  eventos.get('keydown')({key:'Escape', preventDefault(){}});
  assert.equal(document.body.children.length, 0); assert.equal(document.activeElement, origen); assert.equal(eventos.has('keydown'), false);
});
test('trabajo de campo: cuatro íconos y fichas con todo el contenido', () => {
  const {raiz, datos, document, eventos} = montar('metodologia');
  const tarjetas = raiz.querySelectorAll('.campo'); assert.equal(tarjetas.length, 4);
  tarjetas.forEach((t,i) => {
    const a = datos.caso.metodologia.actividades[i]; assert.equal(t.querySelectorAll('svg').length, 1);
    assert.equal(t.querySelectorAll('.cifra-etiqueta')[0].textContent, a.etiqueta); assert.ok(!t.textContent.includes(a.detalle));
    t.onclick(); const panel = document.body.querySelectorAll('.panel')[0];
    for (const texto of [a.objetivo, ...a.herramientas, a.participantes, a.referencia]) assert.ok(panel.textContent.includes(texto));
    eventos.get('keydown')({key:'Escape', preventDefault(){}}); assert.equal(document.activeElement, t);
  });
});
test('escalas: filas descendentes, semáforo, cuatro pasos y ejemplo calculado', () => {
  const {raiz, datos} = montar('metodologia');
  const filas = clase => raiz.querySelectorAll(clase)[0].querySelectorAll('tbody')[0].children;
  assert.equal(raiz.querySelectorAll('.relato-escala').length, 3);
  for (const clase of ['.metodo-brechas','.metodo-materialidad']) {
    const f = filas(clase); assert.equal(f.length, 6); assert.deepEqual(f.map(n => n.children[0].textContent), ['5','4','3','2','1','0']);
  }
  assert.equal(filas('.metodo-brechas')[0].className, 'sem-verde'); assert.equal(filas('.metodo-brechas')[5].className, 'sem-rojo');
  assert.equal(raiz.querySelectorAll('.metodo-riesgo-paso').length, 4);
  const gravedad = filas('.metodo-gravedad'); assert.equal(gravedad.length, 3); assert.ok(gravedad.every(f => f.children.length === 4));
  gravedad.forEach((f,i) => ['escala','alcance','irreparable'].forEach((k,j) => assert.equal(f.children[j+1].textContent, datos.criticidad.gravedad.parametros[k].find(n=>n.valor===3-i).descripcion)));
  for (const corte of datos.criticidad.gravedad.cortes.filter(c=>c.menor_que)) assert.ok(raiz.querySelectorAll('.metodo-banda')[0].textContent.includes(new Intl.NumberFormat('es-CO').format(corte.menor_que)));
  assert.equal(filas('.metodo-probabilidad').length, 3); assert.equal(filas('.metodo-vinculacion').length, 3);
  const ejemplo = raiz.querySelectorAll('.metodo-calculo')[0].textContent; assert.match(ejemplo, /Promedio 3,0/); assert.match(ejemplo, /Gravedad Alta/); assert.match(ejemplo, /Probabilidad Baja/); assert.match(ejemplo, /Vinculación: Causa/);
  assert.equal(raiz.querySelectorAll('.metodo-ejemplo')[0].querySelectorAll('a')[0].href, '#/ddhh/riesgos/riesgo-15');
  assert.equal(raiz.querySelectorAll('.metodo-cuadrante').length, 4);
});
test('metodología refleja cambios de configuración, ejemplo y materialidad ausente', () => {
  const {raiz} = montar('metodologia', d => {
    d.estandares.escala[0].descripcion = 'Nivel cambiado'; d.criticidad.gravedad.cortes[0].menor_que = 1.7;
    d.materialidadConfig.escala.niveles[0].descripcion = 'Escala cambiada'; d.materialidadConfig.umbral.nota = 'Regla cambiada';
    const e=d.riesgos.find(r=>r.id==='riesgo-15').evaluaciones[0]; e.escala=1; e.alcance=1; e.irreparable=1; e.probabilidad='alta'; e.vinculacion='contribuye';
  });
  for (const t of ['Nivel cambiado','1,7','Escala cambiada','Regla cambiada']) assert.ok(raiz.textContent.includes(t));
  const calculo=raiz.querySelectorAll('.metodo-calculo')[0].textContent;
  assert.match(calculo, /Promedio 1,0/); assert.match(calculo, /Gravedad Baja/); assert.match(calculo, /Probabilidad Alta/); assert.match(calculo, /Vinculación: Contribuye/);
  assert.match(montar('metodologia', d => {d.materialidadConfig = null;}).raiz.textContent, /Escala en preparación/);
});
test('resultados: cuatro mensajes, 17 riesgos ubicados más uno sin probabilidad, nueve temas y avance real', () => {
  const {raiz, datos} = montar('resultados');
  assert.equal(raiz.querySelectorAll('h1').length, 0);
  assert.equal(raiz.querySelectorAll('.pregunta').length, 1);
  assert.equal(raiz.querySelectorAll('.relato-mensaje').length, 4);
  assert.deepEqual(raiz.querySelectorAll('.relato-mensaje').map(n => n.querySelectorAll('a')[0].href), datos.caso.resultados.mensajes.map(m => m.destino));
  const celdas = raiz.querySelectorAll('text').filter(n => Object.hasOwn(n.attrs, 'data-riesgos'));
  assert.equal(celdas.length, 9); assert.equal(celdas.reduce((s,n) => s + Number(n.textContent), 0), 17);
  assert.match(raiz.querySelectorAll('.relato-sin-probabilidad')[0].textContent, /1 riesgo sin probabilidad/);
  assert.equal(raiz.querySelectorAll('.relato-lista-corta')[0].children.length, 9);
  const anillo = raiz.querySelectorAll('circle').find(n => n.attrs['data-avance']);
  assert.equal(Number(anillo.attrs['data-avance']), Plan.resumen(datos.plan, datos.planConfig).avanceGlobal);
  assert.match(raiz.textContent, /avances de ejemplo/);
  assert.match(raiz.textContent, /3,1/); assert.match(raiz.textContent, /4,0/);
  assert.match(raiz.textContent, /5 solo en la operación propia/); assert.match(raiz.textContent, /13 involucran la cadena de valor/);
  assert.ok(raiz.querySelectorAll('svg').every(n => n.attrs['aria-label'] && n.attrs.role === 'img'));
  assert.ok(raiz.querySelectorAll('text').every(n => Number(n.attrs['font-size']) >= 14));
});
test('resultados recalcula evidencia al cambiar datos y usa la última evaluación real', () => {
  const {raiz} = montar('resultados', d => {
    const base = d.evaluaciones.find(e => e.origen === 'fuente');
    d.evaluaciones.push({...base, id:'nueva', fecha:'2098-01', puntajes: Object.fromEntries(d.estandares.ejes.map(e => [e.id, 2]))});
    d.evaluaciones.push({...base, id:'ejemplo', origen:'ejemplo', fecha:'2099-01', puntajes: Object.fromEntries(d.estandares.ejes.map(e => [e.id, 5]))});
    d.plan = d.plan.map(a => ({...a, avance:100, estado:'cumplida', seguimiento_ejemplo:false}));
    d.materialidad = null;
    d.riesgos = d.riesgos.slice(0, 2);
  });
  assert.match(raiz.textContent, /enero de 2098/); assert.doesNotMatch(raiz.textContent, /2099/);
  assert.match(raiz.textContent, /2,0/); assert.match(raiz.textContent, /100,0 %/);
  assert.match(raiz.textContent, /0 vencidas/); assert.doesNotMatch(raiz.textContent, /avances de ejemplo/);
  assert.match(raiz.textContent, /Materialidad en preparación/);
});
// E16: el contrato de carga del sitio se verifica en kit-armazon.test.mjs.
// Las vistas heredadas siguen probándose como componentes reutilizables.

test('metodología: portadas locales y contraste de los números del semáforo', () => {
  json('data/caso.json').metodologia.estandares.forEach(e => assert.ok(readFileSync(new URL('../public/' + e.imagen, import.meta.url)).length > 0));
  const css = leer('estilos.css');
  const luminancia = color => {
    const canales = color.match(/\w\w/g).map(c => parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return canales.reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  };
  const contraste = (a,b) => {const valores=[luminancia(a),luminancia(b)].sort((a,b)=>b-a); return (valores[0]+.05)/(valores[1]+.05);};
  for (const color of ['rojo','naranja','verde','ambar','amarillo','gris']) {
    const fondo=css.match(new RegExp('--sem-'+color+': #([A-Fa-f0-9]{6})'))[1];
    const blanco=['rojo','naranja','verde'].includes(color);
    assert.ok(contraste(fondo,blanco?'FFFFFF':'1F332B')>=3, color+' claro');
    assert.ok(contraste(fondo,blanco?'FFFFFF':'0F1D17')>=3, color+' oscuro');
  }
});
