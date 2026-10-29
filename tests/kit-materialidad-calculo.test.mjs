import test from 'node:test';
import assert from 'node:assert/strict';
import M from '../public/kit-vista-materialidad-motor.js';

// Datos inventados: dos grupos de tamaño distinto, dos aspectos y dos directivos.
const base = () => ({
  aspectos: ['asp-01', 'asp-02'],
  grupos: ['Comunidad inventada', 'Equipo inventado'],
  participantes: [
    { codigo: 'COM-01', grupo: 'Comunidad inventada' }, { codigo: 'COM-02', grupo: 'Comunidad inventada' },
    { codigo: 'EQU-01', grupo: 'Equipo inventado' }, { codigo: 'EQU-02', grupo: 'Equipo inventado' }, { codigo: 'EQU-03', grupo: 'Equipo inventado' }
  ],
  evaluadores: ['DIR-01', 'DIR-02'],
  consulta: [
    { participante: 'COM-01', aspecto: 'asp-01', signo: 'Negativo', importancia: 4, probabilidad: 2 },
    { participante: 'COM-02', aspecto: 'asp-01', signo: 'Negativo', importancia: 2, probabilidad: 4 },
    { participante: 'EQU-01', aspecto: 'asp-01', signo: 'Positivo', importancia: 3, probabilidad: 3 },
    { participante: 'EQU-02', aspecto: 'asp-01', signo: 'Positivo', importancia: 3, probabilidad: 3 },
    { participante: 'EQU-03', aspecto: 'asp-01', signo: 'Positivo', importancia: 3, probabilidad: 3 },
    { participante: 'COM-01', aspecto: 'asp-02', signo: 'Negativo', importancia: 1, probabilidad: 1 }
  ],
  taller: [
    { evaluador: 'DIR-01', aspecto: 'asp-01', rentabilidad: 4, gasto: 2 },
    { evaluador: 'DIR-02', aspecto: 'asp-01', rentabilidad: 2, gasto: 4 },
    { evaluador: 'DIR-01', aspecto: 'asp-02', rentabilidad: 1, gasto: 1 }
  ]
});
const de = (r, id) => r.aspectos.find(a => a.aspecto === id);

test('III calcular: promedio de cada grupo y promedio simple entre grupos, no entre personas', () => {
  const a = de(M.calcular(base()), 'asp-01');
  assert.equal(a.por_grupo['Comunidad inventada'].importancia, 3);
  assert.equal(a.por_grupo['Equipo inventado'].importancia, 3);
  assert.equal(a.importancia, 3);
  assert.equal(a.probabilidad, 3);
});

test('III calcular: blanco = 0, y quien no respondió un aspecto cuenta con 0', () => {
  const a = de(M.calcular(base()), 'asp-02');
  assert.equal(a.por_grupo['Comunidad inventada'].importancia, 0.5);
  assert.equal(a.por_grupo['Equipo inventado'].importancia, 0);
  assert.equal(a.importancia, 0.25);
  assert.equal(a.rentabilidad, 0.5);
  const sinProbabilidad = base();
  delete sinProbabilidad.consulta[0].probabilidad;
  assert.equal(de(M.calcular(sinProbabilidad), 'asp-01').por_grupo['Comunidad inventada'].probabilidad, 2);
});

test('III calcular: escala/alcance/irremediabilidad; la irremediabilidad solo cuenta en impactos negativos', () => {
  const d = base();
  d.consulta[0] = { participante: 'COM-01', aspecto: 'asp-01', signo: 'Negativo', escala: 3, alcance: 3, irremediabilidad: 0, probabilidad: 2 };
  d.consulta[2] = { participante: 'EQU-01', aspecto: 'asp-01', signo: 'Positivo', escala: 3, alcance: 3, probabilidad: 3 };
  const a = de(M.calcular(d), 'asp-01');
  assert.equal(a.por_grupo['Comunidad inventada'].importancia, (2 + 2) / 2);
  assert.equal(a.por_grupo['Equipo inventado'].importancia, 3);
});

test('III calcular: si una persona califica dos veces el mismo aspecto, cuenta la de mayor importancia', () => {
  const d = base();
  d.consulta.push({ participante: 'COM-02', aspecto: 'asp-01', signo: 'Positivo', importancia: 5, probabilidad: 1 });
  const g = de(M.calcular(d), 'asp-01').por_grupo['Comunidad inventada'];
  assert.equal(g.importancia, (4 + 5) / 2);
  assert.equal(g.probabilidad, (2 + 1) / 2);
});

test('III calcular: financiera, umbrales como promedio de los aspectos y cuadrantes', () => {
  const r = M.calcular(base()), a = de(r, 'asp-01'), b = de(r, 'asp-02');
  assert.equal(a.financiera, 3); assert.equal(b.financiera, 0.5);
  assert.equal(r.umbral.impacto, (3 + 0.25) / 2); assert.equal(r.umbral.financiero, (3 + 0.5) / 2);
  assert.equal(a.cuadrante, 'Doble'); assert.equal(b.cuadrante, 'No material');
  assert.deepEqual(r.participantes, { 'Comunidad inventada': 2, 'Equipo inventado': 3 });
  assert.equal(r.evaluadores, 2);
});
