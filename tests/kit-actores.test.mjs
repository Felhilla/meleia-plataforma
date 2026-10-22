import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import K from '../public/kit-actores.js';
const cfg = JSON.parse(readFileSync(new URL('../public/config/kit-actores-config.json', import.meta.url)));
const esquema = JSON.parse(readFileSync(new URL('../public/config/esquemas/actores.json', import.meta.url)));
const [activa, estrategico, periferico, cautelosa] = cfg.niveles.map(n => n.nombre);
const base = { categoria: 'Academia', cargo:'Decano', dependencia:1, responsabilidad:1, posicion:'Neutral', tension:1 };
const actor = (extra = {}) => ({ ...base, institucion:'Universidad', influencia:2, impacto:1, ...extra });
test('Caso completo de la ficha: cinco actores, ajuste, indicadores y dos errores', () => {
  const filas = [
    actor({institucion:'Alcaldía municipal',cargo:'Alcalde',influencia:'Muy alta',impacto:'Alto',tension:2}),
    actor({institucion:'Emisora regional',cargo:'Director',influencia:4,impacto:'Bajo',posicion:'Favorable'}),
    actor({institucion:'JAC vereda El Ejemplo',cargo:'Presidente',influencia:'Media',impacto:'Muy Alto',posicion:'Desfavorable',tension:4}),
    actor({influencia:'baja',impacto:1}),
    actor({institucion:'Gobernación',cargo:'Secretario de minas',influencia:3,impacto:1,tension:2,nivel_ajustado:activa,motivo_ajuste:esquema.campos.motivo_ajuste.valores[0],explicacion_ajuste:'Su capacidad de convocatoria justifica mayor interacción.'})
  ];
  filas.forEach(a => assert.equal(K.validar(a,cfg,esquema).ok,true));
  assert.deepEqual(filas.map(a => K.nivelFinal(a,cfg)),[estrategico,activa,cautelosa,periferico,activa]);
  assert.deepEqual(filas.map(a => K.alerta(a,cfg)),[false,false,true,false,false]);
  assert.equal(K.nivelCalculado(filas[4],cfg),periferico);
  const ind = K.indicadores(filas,cfg); assert.equal(ind.total,5); assert.equal(ind.alertas,1);
  assert.deepEqual(ind.cuadrantes.map(n => [n.cantidad,n.porcentaje]),[[2,40],[1,20],[1,20],[1,20]]);
  assert.deepEqual(ind.posiciones.map(n => n.cantidad),[1,3,1]); assert.equal(ind.categorias[0].porcentaje,100);
  assert.equal(K.validar(actor({influencia:'Alto medio'}),cfg,esquema).ok,false);
  assert.equal(K.validar({...filas[4],nivel_ajustado:estrategico},cfg,esquema).ok,false);
});
test('Bordes 3/4 de los cuatro cuadrantes y corte configurable', () => {
  for (const [i,m,n] of [[3,3,periferico],[4,3,activa],[3,4,cautelosa],[4,4,estrategico]]) assert.equal(K.nivelCalculado(actor({influencia:i,impacto:m}),cfg),n);
  assert.equal(K.nivelCalculado(actor({influencia:3,impacto:3}),{...cfg,corte:3}),estrategico);
});
test('Solo subida de un paso; motivo y explicación obligatorios; motivo original solo en carga', () => {
  const a = actor({nivel_ajustado:activa,motivo_ajuste:esquema.campos.motivo_ajuste.valores[4],explicacion_ajuste:'Se conserva el criterio experto del mapeo entregado.'});
  assert.equal(K.validar(a,cfg,esquema).ok,false); assert.equal(K.validar(a,cfg,esquema,'carga').ok,true);
  for (const cambio of [{nivel_ajustado:estrategico},{nivel_ajustado:periferico},{motivo_ajuste:''},{explicacion_ajuste:'  '}]) assert.equal(K.validar({...a,...cambio},cfg,esquema,'carga').ok,false);
  assert.equal(K.validar({...a,influencia:4,impacto:4},cfg,esquema,'carga').ok,false);
  assert.equal(K.validar({...a,influencia:4,nivel_ajustado:cautelosa},cfg,esquema,'carga').ok,false);
  for (const [i,m,n] of [[2,2,cautelosa],[4,2,estrategico],[2,4,estrategico]]) assert.equal(K.validar({...a,influencia:i,impacto:m,nivel_ajustado:n},cfg,esquema,'carga').ok,true);
});
test('Normaliza los cinco criterios, descarta campos ajenos y no muta', () => {
  const a = actor({id:'act-universidad',dependencia:' MUY BÁJA ',responsabilidad:'Media',tension:'Muy Alta',influencia:'3',impacto:4,nombre:'Persona',contacto:'Privado'});
  const copia = structuredClone(a), r = K.validar(a,cfg,esquema); assert.equal(r.ok,true); assert.equal(r.registro.dependencia,1); assert.equal(r.registro.responsabilidad,3); assert.equal(r.registro.tension,5); assert.equal(r.registro.influencia,3);
  assert.equal(r.registro.nombre,undefined); assert.equal(r.registro.contacto,undefined); assert.deepEqual(a,copia);
  assert.equal(K.validar({...a,id:'ACT-invalido'},cfg,esquema).ok,false);
});
test('Alerta exige ambas condiciones y los vacíos no generan porcentajes indefinidos', () => {
  for (const [p,t,esperado] of [['Desfavorable',3,false],['Desfavorable',4,true],['Desfavorable','Muy alta',true],['Neutral',5,false],['Favorable',4,false]]) assert.equal(K.alerta(actor({posicion:p,tension:t}),cfg),esperado);
  assert.ok(K.indicadores([],cfg).cuadrantes.every(n => n.porcentaje === 0)); assert.equal(K.nivelCalculado(actor({influencia:'Alto medio'}),cfg),null);
});
test('Nivel final descarta ajustes inválidos también al leer registros', () => {
  const a = actor({nivel_ajustado:activa,motivo_ajuste:'Motivo inventado',explicacion_ajuste:'Texto.'});
  assert.equal(K.nivelFinal(a,cfg),periferico);
  assert.equal(K.nivelFinal({...a,motivo_ajuste:esquema.campos.motivo_ajuste.valores[0],explicacion_ajuste:7},cfg),periferico);
});
