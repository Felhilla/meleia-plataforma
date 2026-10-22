import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import K from '../public/kit-riesgos.js';
import V from '../public/kit-validacion.js';
const leer = p => JSON.parse(readFileSync(new URL('../public/' + p, import.meta.url)));
const cfg = leer('config/kit-riesgos-config.json');
const c1 = { id: 'r-01', riesgo: 'r-01', escala: 3, alcance: 2, irremediabilidad: 2, probabilidad: 'Alta', tipo_impacto: 'Potencial', vinculacion: 'Causa' };
const c2 = { ...c1, id: 'r-02', riesgo: 'r-02', escala: 1, alcance: 1, irremediabilidad: 2, probabilidad: 'Media' };
test('Ficha §8 caso 1: agua, Media × Alta, 6 meses, G2 propone alcance 3; oficial intacta', () => {
  const validaciones = [{ riesgo: 'r-01', grupo: 'g-1', resultado: 'Confirma' }, { riesgo: 'r-01', grupo: 'g-2', resultado: 'Propone ajuste', propuesta_alcance: 3 }, { riesgo: 'r-01', grupo: 'g-3', resultado: 'Confirma' }];
  assert.equal(K.gravedad(c1, cfg).promedio.toFixed(2), '2.33'); assert.equal(K.gravedad(c1, cfg).nivel, 'Media');
  assert.equal(K.prioridad(c1, cfg), 'Alta'); assert.equal(K.plazo({ riesgos: ['r-01'] }, [c1], cfg).meses, 6);
  assert.equal(K.validacion('r-01', validaciones, cfg).texto, '2 de 3 grupos confirman');
  const ajuste = K.ajuste(c1, validaciones[1], cfg); assert.equal(ajuste.gravedad.promedio.toFixed(2), '2.67'); assert.equal(ajuste.gravedad.nivel, 'Alta'); assert.equal(c1.alcance, 2);
});
test('Ficha §8 caso 2: gravedad 1,33 Baja × Media, prioridad Baja, 18 meses y pendiente', () => {
  assert.equal(K.gravedad(c2, cfg).promedio.toFixed(2), '1.33'); assert.equal(K.gravedad(c2, cfg).nivel, 'Baja'); assert.equal(K.prioridad(c2, cfg), 'Baja');
  assert.equal(K.plazo({ riesgos: ['r-02'] }, [c2], cfg).meses, 18); assert.equal(K.validacion('r-02', [], cfg).texto, 'pendiente de validación');
});
test('Ficha §8 caso 3: alcance 4 rechazado; el mensaje conserva campo y rango', () => {
  const r = V.validar({ ...c1, alcance: 4 }, leer('config/esquemas/riesgos-calificacion.json'), { riesgos: new Set(['r-01']) });
  assert.equal(r.ok, false); assert.equal(r.errores[0].campo, 'alcance'); assert.match(r.errores[0].mensaje, /Alcance = 4.*1 a 3/);
});
test('Las nueve celdas de la tabla simétrica', () => {
  const esperados = [['Alta', 'Alta', 'Media'], ['Alta', 'Media', 'Baja'], ['Media', 'Baja', 'Baja']];
  [3, 2, 1].forEach((g, i) => ['Alta', 'Media', 'Baja'].forEach((p, j) => assert.equal(K.prioridad({ escala: g, alcance: g, irremediabilidad: g, probabilidad: p }, cfg), esperados[i][j])));
});
test('Bordes de los cortes 1,5 y 2,5 y calificación incompleta', () => {
  for (const [n, esperado] of [[1, 'Baja'], [1.49999, 'Baja'], [1.5, 'Media'], [2.49999, 'Media'], [2.5, 'Alta'], [3, 'Alta']]) assert.equal(K.nivel(n, cfg), esperado);
  assert.equal(K.gravedad({ ...c1, alcance: 4 }, cfg), null); assert.equal(K.prioridad(undefined, cfg), null);
});
test('Plazos: máxima prioridad vinculada, sin riesgo, sin evaluación, fecha explícita y fin de mes', () => {
  const media = { ...c1, riesgo: 'r-03', probabilidad: 'Media' };
  assert.equal(K.plazo({ riesgos: ['r-03'] }, [media], cfg).meses, 12);
  assert.equal(K.plazo({}, [], cfg).meses, 12);
  assert.equal(K.plazo({ riesgos: ['r-02', 'r-01'] }, [c1, c2], cfg).meses, 6);
  assert.equal(K.plazo({ riesgos: ['r-01'] }, [], cfg).fecha, null);
  assert.deepEqual(K.plazo({ plazo: '2027-05-01' }, [], cfg), { fecha: '2027-05-01', propuesto: false });
  assert.equal(K.plazo({ riesgos: ['r-01'] }, [c1], cfg, '2026-08-31').fecha, '2027-02-28');
});
test('Avance cuenta solo cumplidas, incluye componentes vacíos; riesgos sin medida', () => {
  const acciones = [{ estado: 'Cumplida', componente: 'componente-1', riesgos: ['r-01'] }, { estado: 'En curso', componente: 'componente-1', riesgos: ['r-01'] }, { estado: 'Pendiente', componente: 'componente-2' }];
  assert.ok(Math.abs(K.avance(acciones, cfg).porcentaje - 100 / 3) < 1e-10); assert.equal(K.avance(acciones, cfg).componentes[0].porcentaje, 50); assert.equal(K.avance([], cfg).porcentaje, 0);
  assert.deepEqual(K.sinMedida([{ id: 'r-01' }, { id: 'r-02' }], acciones), [{ id: 'r-02' }]);
});
test('Configuración controla cortes, tabla, avance, validación, componentes y plazos', () => {
  const c = structuredClone(cfg); c.gravedad.cortes[0].menor_que = 2.4; c.prioridad.Baja.Alta = 'Baja'; c.plazos.Baja = 7; c.estadoCumplido = 'Listo'; c.resultadoConfirma = 'Sí'; c.componentesPorEmpresa.empresa = [{ id: 'uno', nombre: 'Personalizado' }];
  assert.equal(K.prioridad(c1, c), 'Baja'); assert.equal(K.plazo({ riesgos: ['r-01'] }, [c1], c).meses, 7);
  assert.equal(K.avance([{ componente: 'uno', estado: 'Listo' }], c, 'empresa').componentes[0].porcentaje, 100);
  assert.equal(K.validacion('r-01', [{ riesgo: 'r-01', grupo: 'g-1', resultado: 'Sí' }], c).confirman, 1);
});
