import test from 'node:test';
import assert from 'node:assert/strict';
import {montar, json, Nodo} from './helpers/kit-estudios.mjs';
const indicador = codigo => ({codigo, nombre: 'Nombre ficticio <script>prueba</script>', ref: 'Documento ficticio, p. 1'});
const cruce = {sectores: [
  {id: 'prueba', nombre: 'Sector inventado', columnas: ['GRI', 'Z ficticio', 'A ficticio'], fuentes: {GRI: 'Fuente ficticia'}, notas: ['Nota ficticia'], grupos: [
    {nombre: 'Grupo uno', filas: [{tema: 'Tema uno', celdas: {GRI: [indicador('X-1'), indicador('X-2')], 'Z ficticio': [], 'A ficticio': [indicador('A-1')]}}]},
    {nombre: 'Grupo dos', filas: [{tema: 'Tema dos', celdas: {GRI: [], 'Z ficticio': [], 'A ficticio': []}}]}
  ]},
  {id: 'otro', nombre: 'Otro inventado', columnas: ['GRI', 'B ficticio'], fuentes: {}, notas: [], grupos: [{nombre: 'Otro grupo', filas: [{tema: 'Otro tema', celdas: {GRI: [], 'B ficticio': [indicador('B-1')]}}]}]},
  {id: 'mineria', nombre: 'Minería', columnas: ['GRI', 'C ficticio'], fuentes: {}, notas: [], grupos: []}
]};
const montarCruce = opciones => montar('ddhh/estandares', false, {}, {config: p => p === 'config/kit-ddhh-cruce.json' ? structuredClone(cruce) : undefined, ...opciones});
const nodos = (m, tag) => m.contenedor.todos().filter(n => n.tagName === tag);
const columnas = m => nodos(m, 'THEAD')[0].children[0].children.map(n => n.textContent);
test('E28b: columnas en orden, grupos, temas, indicadores y correspondencia vacía', async () => {
  const m = await montarCruce();
  assert.deepEqual(columnas(m), ['Tema', ...cruce.sectores[0].columnas]);
  assert.ok(nodos(m, 'THEAD')[0].children[0].children.every(n => n.scope === 'col'));
  const grupos = nodos(m, 'TH').filter(n => n.scope === 'colgroup');
  assert.deepEqual(grupos.map(n => n.textContent), ['Grupo uno', 'Grupo dos']);
  assert.ok(grupos.every(n => n.colSpan === 4));
  assert.deepEqual(nodos(m, 'TH').filter(n => n.scope === 'row').map(n => n.textContent), ['Tema uno', 'Tema dos']);
  const celdas = nodos(m, 'TD');
  assert.match(celdas[0].textContent, /X-1.*X-2/);
  assert.equal(celdas[1].textContent, '—');
  assert.equal(celdas[1].children[0].attrs['aria-label'], 'Sin correspondencia');
  assert.equal(nodos(m, 'CAPTION')[0].textContent, 'Cruce de estándares · Sector inventado');
  const region = m.contenedor.todos().find(n => n.attrs.role === 'region');
  assert.equal(region.tabIndex, 0); assert.equal(region.attrs['aria-label'], nodos(m, 'CAPTION')[0].textContent);
  assert.equal(nodos(m, 'LABEL')[0].htmlFor, nodos(m, 'SELECT')[0].id);
  assert.match(nodos(m, 'DETAILS')[0].textContent, /Fuentes y notas.*Fuente ficticia.*Nota ficticia/);
});
test('E28b: selector redibuja columnas y temas, sector vacío y cero consultas', async () => {
  const m = await montarCruce(), select = nodos(m, 'SELECT')[0];
  assert.equal(select.value, 'prueba');
  assert.deepEqual(select.options.map(n => n.textContent), cruce.sectores.map(s => s.nombre));
  select.value = 'otro'; select.onchange();
  assert.deepEqual(columnas(m), ['Tema', 'GRI', 'B ficticio']);
  assert.match(m.contenedor.textContent, /Otro tema.*B-1/);
  assert.doesNotMatch(m.contenedor.textContent, /Tema uno|X-1|Fuente ficticia/);
  select.value = 'mineria'; select.onchange();
  assert.equal(nodos(m, 'TABLE').length, 0);
  assert.equal(m.contenedor.todos().find(n => n.className === 'en-preparacion').textContent, 'Cruce del sector minero en preparación.');
  select.value = 'prueba'; select.onchange();
  assert.equal(nodos(m, 'TABLE').length, 1);
  assert.equal(m.consultas.length, 0);
  assert.equal(m.guardados.length, 0);
});
test('E28b: texto literal sin innerHTML ni elementos script', async () => {
  Object.defineProperty(Nodo.prototype, 'innerHTML', {configurable: true, set() {throw Error('innerHTML prohibido');}});
  try {
    const m = await montarCruce();
    assert.match(nodos(m, 'TD')[0].textContent, /<script>prueba<\/script>/);
    assert.equal(nodos(m, 'SCRIPT').length, 0);
  } finally { delete Nodo.prototype.innerHTML; }
});
test('E28b: respuesta tardía descartada y error de configuración visible', async () => {
  const m = await montarCruce({cancelar: true}); assert.equal(m.contenedor.children.length, 0);
  const e = await montarCruce({config: () => {throw Error('Configuración no disponible');}});
  assert.match(e.contenedor.textContent, /Configuración no disponible/); assert.equal(e.consultas.length, 0);
});
test('E28b: forma del archivo generado real, GRI primero y celdas completas', () => {
  const real = json('config/kit-ddhh-cruce.json');
  assert.ok(Array.isArray(real.sectores) && real.sectores.length);
  for (const sector of real.sectores) {
    assert.ok(Array.isArray(sector.columnas)); assert.equal(sector.columnas[0], 'GRI');
    assert.equal(new Set(sector.columnas).size, sector.columnas.length);
    assert.ok(Array.isArray(sector.grupos));
    for (const grupo of sector.grupos) {
      assert.ok(Array.isArray(grupo.filas));
      for (const fila of grupo.filas) for (const columna of sector.columnas) {
        assert.ok(Array.isArray(fila.celdas[columna]), `${sector.id}: ${fila.tema}: ${columna}`);
        for (const item of fila.celdas[columna]) for (const campo of ['codigo', 'nombre']) {
          assert.equal(typeof item[campo], 'string'); assert.ok(item[campo].trim(), `${columna}: ${campo}`);
        }
      }
    }
  }
});
