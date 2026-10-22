import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Kit from '../public/kit-validacion.js';
const esquema = JSON.parse(readFileSync(new URL('../public/config/esquemas/ejemplo.json', import.meta.url)));
const validar = datos => Kit.validar({ id: 'uno', nombre: 'Nombre', ...datos }, esquema, { actores: new Set(['actor-1']) });
test('todos los tipos válidos y normalización sin mutar entrada', () => {
  const entrada = { nombre: ' Nombre ', detalle: 'Texto largo', alcance: '2', importe: '3.4', fecha: '2024-02-29', estado: 'activo', etiquetas: ['uno'], actor: 'actor-1', nivel: 'Muy Baja', prioridad: 'Alta' };
  const r = validar(entrada); assert.equal(r.ok, true); assert.equal(r.registro.nombre, 'Nombre'); assert.equal(r.registro.alcance, 2); assert.equal(r.registro.importe, 3.4); assert.equal(entrada.alcance, '2');
});
test('cada tipo rechaza valores inválidos con valor recibido y expectativa en español', () => {
  for (const [campo, valor] of [['nombre', 'x'.repeat(121)], ['detalle', {}], ['alcance', 4], ['importe', true], ['fecha', '2025-02-29'], ['estado', 'inexistente'], ['etiquetas', ['tres']], ['actor', 'ausente'], ['nivel', 6], ['prioridad', 4]]) {
    const r = validar({ [campo]: valor }); assert.equal(r.ok, false, campo); assert.equal(r.errores[0].campo, campo); assert.match(r.errores[0].mensaje, / = .*se esperaba/);
  }
  assert.equal(validar({ alcance: 4 }).errores[0].mensaje, 'Alcance = 4, se esperaba un entero de 1 a 3');
});
test('niveles aceptan género, tildes, mayúsculas y números; almacenan números', () => {
  for (const [valor, esperado] of [['Muy Baja', 1], ['muy bajo', 1], ['MUY ALTA', 5], ['Medio', 3], ['Media', 3], ['MÉDIA', 3], ['4', 4], [4, 4]]) assert.equal(validar({ nivel: valor }).registro.nivel, esperado);
  assert.equal(validar({ prioridad: 'Media' }).registro.prioridad, 2);
  const r = Kit.validar({ n: 'Crítica' }, { campos: { n: { tipo: 'nivel', escala: 3, etiquetas: ['Leve', 'Moderada', 'Critica'] } } }); assert.equal(r.registro.n, 3);
});
test('obligatoriedad normal y condicional', () => {
  assert.equal(validar({ nombre: ' ' }).ok, false); assert.equal(validar({ estado: 'otro' }).errores[0].campo, 'detalle');
  assert.equal(validar({ estado: 'otro', detalle: 'Razón' }).ok, true); assert.equal(validar({ estado: 'activo' }).ok, true);
});
test('fechas, enteros y referencias no aceptan coerciones accidentales', () => {
  for (const alcance of [false, [], {}, '2e0', 1.5, Infinity]) assert.equal(validar({ alcance }).ok, false);
  for (const fecha of ['2024-13-01', '2024-04-31', '24-01-01']) assert.equal(validar({ fecha }).ok, false);
  assert.equal(Kit.validar({ actor: 'a' }, { campos: { actor: { tipo: 'referencia', coleccion: 'actores' } } }).ok, false);
});
