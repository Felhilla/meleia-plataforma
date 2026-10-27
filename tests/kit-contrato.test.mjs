import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import K from '../public/kit-riesgos.js';
const leer = r => JSON.parse(readFileSync(new URL('../public/' + r, import.meta.url)));
const cfg = leer('config/kit-riesgos-config.json');
const esquemaDe = (c, extra = {}) => K.esquema(leer('config/esquemas/' + c + '.json'), c, { derechos: leer('data/derechos.json'), cfg, empresa: 'libero-cobre', ...extra });
const derecho = Object.keys(leer('data/derechos.json').derechos)[0];
const riesgo = { codigo: 'r-01', nombre: 'Riesgo de prueba', derecho_humano: derecho };

test('Contrato: preparar normaliza el código y el id igual para formulario y carga', () => {
  const s = esquemaDe('riesgos');
  const f = K.preparar('riesgos', riesgo, { esquema: s, cfg });
  const c = K.preparar('riesgos', riesgo, { esquema: s, cfg, modo: 'carga' });
  assert.equal(f.ok, true); assert.deepEqual(f.registro, c.registro);
  assert.equal(f.registro.id, 'r-01'); assert.equal(f.registro.codigo, 'R-01');
});

test('Contrato: un registro existente es error en el formulario y actualización en la carga', () => {
  const s = esquemaDe('riesgos'), listas = { riesgos: [{ ...riesgo, id: 'r-01', codigo: 'R-01' }] };
  assert.equal(K.preparar('riesgos', riesgo, { esquema: s, cfg, listas }).ok, false);
  const c = K.preparar('riesgos', riesgo, { esquema: s, cfg, listas, modo: 'carga' });
  assert.equal(c.ok, true); assert.equal(c.existe, true);
});

test('Contrato: en la carga, un grupo con el mismo nombre y fecha conserva su id', () => {
  const s = esquemaDe('riesgos-grupos');
  const grupo = { nombre: 'Mesa comunitaria', categoria: s.campos.categoria.valores[1], fecha: '2026-10-01' };
  const listas = { 'riesgos-grupos': [{ ...grupo, id: 'g-existente' }] };
  const c = K.preparar('riesgos-grupos', { ...grupo, nombre: ' mesa  COMUNITARIA ' }, { esquema: s, cfg, listas, modo: 'carga' });
  assert.equal(c.registro.id, 'g-existente'); assert.equal(c.existe, true);
  assert.match(K.preparar('riesgos-grupos', grupo, { esquema: s, cfg }).registro.id, /^g-/);
});

test('Contrato: errores con hoja y fila, y referencias que no existen', () => {
  const s = esquemaDe('riesgos-calificacion');
  const r = K.preparar('riesgos-calificacion', { riesgo: 'r-99', escala: 4 }, { esquema: s, cfg, listas: { riesgos: [] }, modo: 'carga', fila: 12 });
  assert.equal(r.ok, false);
  assert.ok(r.errores.every(e => e.mensaje.includes(', fila 12: ')));
  assert.ok(r.errores.some(e => e.campo === 'riesgo'));
});
