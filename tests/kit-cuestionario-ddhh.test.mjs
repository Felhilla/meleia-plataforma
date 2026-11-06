// E47 (6-nov): el cuestionario del Módulo II y la carga por Excel recorren el mismo camino (KitEstudios.prepararDdhh).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const json = ruta => JSON.parse(readFileSync(new URL('../public/' + ruta, import.meta.url), 'utf8'));
const Estudios = (await import('../public/kit-vista-ddhh-modelo.js')).default;
const Cuestionario = (await import('../public/kit-vista-ddhh-cuestionario.js')).default;
const cat = json('config/kit-ddhh-catalogo.json');
const colecciones = ['ddhh-evaluaciones', 'ddhh-indicadores', 'ddhh-componentes', 'ddhh-dimensiones'];
const esquemas = Object.fromEntries(colecciones.map(c => [c, json(`config/esquemas/${c}.json`)]));
const vacios = () => Object.fromEntries(colecciones.map(c => [c, []]));
const sinFila = registros => Object.fromEntries(Object.entries(registros).map(([c, rs]) => [c, rs.map(({ fila_fuente, ...r }) => r)]));

function estadoInventado() {
  const estado = { evaluacion: { nombre: 'Línea base inventada', fecha: '2026-12-01' }, ind: {}, dim: {} };
  cat.indicadores.forEach((i, n) => { estado.ind[i.id] = { calificacion: n % 7 === 0 ? '' : String(n % 6), incorporado: n % 2 ? 'si' : 'parcial', descripcion: n === 3 ? 'Hallazgo inventado' : '' }; });
  estado.dim['etapas-ocde'] = { hallazgos: 'Uno\nDos', brechas: 'Brecha inventada' };
  return estado;
}

test('Cuestionario II: produce los mismos registros que la carga por Excel con los mismos datos', () => {
  const estado = estadoInventado(), entrada = Cuestionario.entradaDesde(cat, estado);
  const r = Estudios.prepararDdhh(cat, esquemas, vacios(), entrada);
  assert.deepEqual(r.errores, []);
  assert.equal(r.registros['ddhh-indicadores'].length, cat.indicadores.length);
  // Simula lo que lee el Excel: mismas filas planas, con número de fila.
  const excel = Estudios.prepararDdhh(cat, esquemas, vacios(), { evaluacion: { ...entrada.evaluacion, fila: 2 }, indicadores: entrada.indicadores.map((x, n) => ({ ...x, fila: n + 2 })), dimensiones: entrada.dimensiones.map((x, n) => ({ ...x, fila: n + 2 })) });
  assert.deepEqual(sinFila(r.registros), sinFila(excel.registros));
  // El blanco vale 0 y los puntajes los calcula la plataforma.
  assert.equal(r.registros['ddhh-indicadores'][0].calificacion, 0);
  const { puntajes } = Estudios.calcular(cat, r.registros['ddhh-indicadores']);
  cat.ejes.forEach(e => assert.equal(r.registros['ddhh-evaluaciones'][0][e.id], puntajes[e.id]));
  assert.ok(r.avisos.some(a => /cuentan como 0/.test(a.mensaje)));
});

test('Cuestionario II: con cualquier error no entrega registros y señala la sección', () => {
  const estado = estadoInventado(); estado.ind[cat.indicadores[4].id].calificacion = '9';
  const r = Estudios.prepararDdhh(cat, esquemas, vacios(), Cuestionario.entradaDesde(cat, estado));
  assert.equal(r.nuevos + r.actualizados, 0);
  assert.ok(r.errores.some(e => e.seccion === 'indicadores' && e.indicador === cat.indicadores[4].id && e.campo === 'calificacion'));
  const sinFecha = estadoInventado(); sinFecha.evaluacion.fecha = '';
  assert.ok(Estudios.prepararDdhh(cat, esquemas, vacios(), Cuestionario.entradaDesde(cat, sinFecha)).errores.some(e => e.seccion === 'evaluacion' && e.campo === 'fecha'));
});

test('Cuestionario II: parte de la evaluación más reciente para actualizarla', () => {
  const primera = Estudios.prepararDdhh(cat, esquemas, vacios(), Cuestionario.entradaDesde(cat, estadoInventado())).registros;
  const vieja = { ...primera['ddhh-evaluaciones'][0], id: 'eval-2025-01', fecha: '2025-01-10' };
  const existentes = { ...primera, 'ddhh-evaluaciones': [vieja, ...primera['ddhh-evaluaciones']] };
  const estado = Cuestionario.estadoInicial(cat, existentes, '2027-01-15');
  assert.equal(estado.evaluacion.fecha, '2027-01-15'); assert.equal(estado.evaluacion.nombre, '');
  assert.match(estado.base, /2026-12/);
  assert.equal(estado.ind[cat.indicadores[1].id].calificacion, '1');
  assert.equal(estado.dim['etapas-ocde'].hallazgos, 'Uno\nDos');
  // Guardar en el mismo mes reemplaza: cuenta como actualización, no como nuevo.
  estado.evaluacion.nombre = 'Actualización'; estado.evaluacion.fecha = '2026-12-20';
  const r = Estudios.prepararDdhh(cat, esquemas, existentes, Cuestionario.entradaDesde(cat, estado));
  assert.equal(r.nuevos, 0); assert.ok(r.actualizados > 0);
});
