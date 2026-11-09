// E64 (9-nov): la Metodología muestra la capa de cada caso (estándares que usó y contexto), leída de la base.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('E64: capaCaso filtra los estándares del módulo según el caso y sin registro deja la Metodología común', async () => {
  const { default: M } = await import('../public/kit-vista-metodologia.js');
  const todo = JSON.parse(readFileSync(new URL('../public/config/kit-metodologia.json', import.meta.url), 'utf8'));
  const sin = await M.capaCaso(todo, 'ddhh', todo.ddhh, { listar: async () => [] }, 'x');
  assert.equal(sin.caso, null); assert.equal(sin.m, todo.ddhh);
  const datos = { listar: async (e, c) => c === 'metodologia-caso' ? [{ id: 'ddhh', estandares: ['ocde', 'aa1000ses', 'no-existe'], contexto: 'Caso inventado.' }] : [] };
  const con = await M.capaCaso(todo, 'ddhh', todo.ddhh, datos, 'x');
  assert.deepEqual(con.m.estandares.fichas.map(f => f.id), ['ocde', 'aa1000ses']);
  assert.equal(con.caso.contexto, 'Caso inventado.');
  assert.equal(todo.ddhh.estandares.fichas.length > 2, true, 'no modifica la Metodología común');
});

test('E64: catálogo de Metodologías válido (ids únicos, cada estándar con ficha propia o reutilizada)', () => {
  const met = JSON.parse(readFileSync(new URL('../public/config/kit-metodologias.json', import.meta.url), 'utf8'));
  const kit = JSON.parse(readFileSync(new URL('../public/config/kit-metodologia.json', import.meta.url), 'utf8'));
  const existentes = new Set(Object.values(kit).flatMap(m => (m.estandares?.fichas || []).map(f => f.id)));
  const todos = met.categorias.flatMap(c => c.estandares || c.grupos.flatMap(g => g.estandares));
  assert.equal(new Set(todos.map(e => e.id)).size, todos.length);
  for (const e of todos) assert.ok(existentes.has(e.id) || (e.sigla && e.nombre && e.que_es && /^https:\/\//.test(e.enlace)), e.id);
});
