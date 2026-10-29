import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Carga from '../public/kit-carga-excel.js';
import Actores from '../public/kit-actores.js';
import XLSX from '../public/vendor/xlsx.full.min.js';

const json = ruta => JSON.parse(readFileSync(new URL('../public/' + ruta, import.meta.url)));
const archivo = ruta => {
  const contenido = readFileSync(new URL('./fixtures/' + ruta, import.meta.url));
  return contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength);
};
const base = existentes => ({
  cfg: json('config/kit-actores-config.json'),
  esquema: json('config/esquemas/actores.json'),
  existentes
});
const porInstitucion = resultado => Object.fromEntries(resultado.registros.actores.map(actor => [actor.institucion, actor]));
const coleccionesRiesgos = ['riesgos', 'riesgos-calificacion', 'riesgos-grupos', 'riesgos-validaciones', 'riesgos-medidas'];
const baseRiesgos = (existentes = {}) => ({
  cfg: json('config/kit-riesgos-config.json'),
  derechos: json('data/derechos.json'),
  empresa: 'empresa-demo',
  esquemas: Object.fromEntries(coleccionesRiesgos.map(coleccion => [coleccion, json(`config/esquemas/${coleccion}.json`)])),
  existentes: Object.fromEntries(coleccionesRiesgos.map(coleccion => [coleccion, existentes[coleccion] || []]))
});

function plantillaRiesgosValida() {
  const libro = XLSX.utils.book_new();
  const agregar = (nombre, filas) => XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
  agregar('Riesgos', [
    ['Código', 'Nombre', 'Descripción', 'Derecho humano afectado', 'Ámbito', 'Localización', 'Actividades que lo generan', 'Medidas de control existentes', 'Análisis de controles'],
    ['R-03', 'Afectación inventada', '', 'Derecho a la vida', 'Operación propia; Comunidades del área de influencia', '', '', '', '']
  ]);
  agregar('Calificación técnica', [
    ['Riesgo', 'Escala', 'Alcance', 'Irremediabilidad', 'Probabilidad', 'Tipo de impacto', 'Vinculación', 'Justificación'],
    ['R-03', 2, 3, 2, 'Media', 'Potencial', 'Causa', 'Justificación inventada']
  ]);
  agregar('Grupos', [
    ['Nombre del grupo', 'Categoría de actor', 'Número de participantes', 'Fecha de la sesión'],
    ['Mesa inventada', 'Comunidades y asociaciones', 12, new Date(2026, 9, 1)]
  ]);
  agregar('Validaciones', [
    ['Riesgo', 'Grupo', 'Resultado', 'Escala propuesta', 'Alcance propuesta', 'Irremediabilidad propuesta', 'Probabilidad propuesta', 'Tipo de impacto propuesta', 'Vinculación propuesta', 'Justificación propuesta', 'Comentario del grupo'],
    ['R-03', 'Mesa inventada', 'Confirma', '', '', '', '', '', '', '', '']
  ]);
  agregar('Medidas', [
    ['Código', 'Título', 'Descripción', 'Componente', 'Riesgos que atiende', 'Responsable (área o cargo; sin nombres personales)', 'Plazo', 'Estado'],
    ['A-03', 'Medida inventada', '', 'Fortalecimiento del compromiso organizacional', 'R-03', 'Área inventada', new Date(2027, 0, 15), 'Pendiente']
  ]);
  return XLSX.write(libro, { type: 'array', bookType: 'xlsx', cellDates: true });
}

test('Carga Excel Módulo I: contrato de mapeo-gh-muestra.xlsx', () => {
  const contexto = base([]), resultado = Carga.leer(archivo('mapeo-gh-muestra.xlsx'), 'actores', contexto), actores = porInstitucion(resultado);
  assert.deepEqual(Object.keys(actores), [
    'JAC vereda El Ejemplo', 'Asociación de Productores Ficticios', 'Alcaldía Municipal de Ejemplo', 'Gobernación Ficticia'
  ]);
  assert.equal(resultado.nuevos, 4); assert.equal(resultado.actualizados, 0);
  assert.deepEqual(resultado.errores, [{
    hoja: 'Com. Aso', fila: 16, campo: 'influencia',
    mensaje: 'Influencia = "Alto medio", se esperaba un nivel de 1 a 5 (Muy bajo, Bajo, Medio, Alto, Muy alto)'
  }]);

  assert.equal(actores['JAC vereda El Ejemplo'].categoria, 'Comunidades y asociaciones');
  assert.equal(actores['JAC vereda El Ejemplo'].influencia, 3);
  assert.equal(actores['JAC vereda El Ejemplo'].impacto, 5);
  assert.equal(Actores.nivelFinal(actores['JAC vereda El Ejemplo'], contexto.cfg), 'Gestión cautelosa');
  assert.equal(actores['Asociación de Productores Ficticios'].influencia, 2);
  assert.equal(actores['Asociación de Productores Ficticios'].impacto, 2);
  assert.equal(Actores.nivelFinal(actores['Asociación de Productores Ficticios'], contexto.cfg), 'Seguimiento periférico');
  assert.equal(actores['Alcaldía Municipal de Ejemplo'].cargo, '');
  assert.equal(actores['Alcaldía Municipal de Ejemplo'].nombre_servidor, 'Persona Inventada Tres');
  assert.equal(Actores.nivelFinal(actores['Alcaldía Municipal de Ejemplo'], contexto.cfg), 'Involucramiento estratégico');
  assert.equal(Actores.nivelCalculado(actores['Gobernación Ficticia'], contexto.cfg), 'Seguimiento periférico');
  assert.equal(actores['Gobernación Ficticia'].nivel_ajustado, 'Gestión activa');
  assert.equal(actores['Gobernación Ficticia'].motivo_ajuste, contexto.esquema.campos.motivo_ajuste.valores[4]);
  assert.equal(Actores.nivelFinal(actores['Gobernación Ficticia'], contexto.cfg), 'Gestión activa');

  assert.deepEqual(resultado.avisos, [
    { hoja: 'Com. Aso', fila: 14, mensaje: 'Nombre descartado: solo se registra el de servidores públicos.' },
    { hoja: 'Com. Aso', fila: 15, mensaje: 'Nombre descartado: solo se registra el de servidores públicos.' }
  ]);
  const serializado = JSON.stringify(resultado.registros.actores);
  assert.equal(/contacto|correo|numero|tel[eé]fono/i.test(serializado), false);
  assert.equal(actores['JAC vereda El Ejemplo'].nombre_servidor, undefined);
  assert.equal(actores['Asociación de Productores Ficticios'].nombre_servidor, undefined);
  assert.equal(actores['Colectivo Sin Nombre'], undefined);
});

test('Carga Excel Módulo I: contrato de mapeo-gh-muestra-b.xlsx', () => {
  const contexto = base([]), resultado = Carga.leer(archivo('mapeo-gh-muestra-b.xlsx'), 'actores', contexto), actores = porInstitucion(resultado);
  assert.equal(resultado.nuevos, 3); assert.equal(resultado.actualizados, 0); assert.deepEqual(resultado.errores, []);
  assert.deepEqual(Object.keys(actores), ['Concejo Municipal de Ejemplo', 'Transportes Ficticios S.A.S.', 'Emisora Inventada Estéreo']);

  const concejo = actores['Concejo Municipal de Ejemplo'];
  assert.equal(concejo.categoria, 'Instituciones gubernamentales');
  assert.equal(concejo.orden, 'Local');
  assert.equal(concejo.dependencia_area, 'Concejal - Partido Inventado');
  assert.equal(concejo.cargo, '');
  assert.equal(concejo.nombre_servidor, 'Persona Inventada Cinco');
  assert.equal(Actores.nivelCalculado(concejo, contexto.cfg), 'Gestión activa');
  assert.equal(concejo.nivel_ajustado, 'Involucramiento estratégico');
  assert.equal(concejo.motivo_ajuste, contexto.esquema.campos.motivo_ajuste.valores[4]);

  const transportes = actores['Transportes Ficticios S.A.S.'];
  assert.equal(transportes.categoria, 'Empleados, contratistas y proveedores');
  assert.equal(transportes.subgrupo, 'Contratistas');
  assert.equal(transportes.influencia, 2); assert.equal(transportes.impacto, 3);
  assert.equal(Actores.nivelFinal(transportes, contexto.cfg), 'Seguimiento periférico');
  const emisora = actores['Emisora Inventada Estéreo'];
  assert.equal(emisora.categoria, 'Medios de comunicación');
  assert.equal(emisora.orden, 'Regional');
  assert.equal(emisora.influencia, 3); assert.equal(emisora.impacto, 4);
  assert.equal(Actores.nivelFinal(emisora, contexto.cfg), 'Gestión cautelosa');
  assert.deepEqual(resultado.avisos, [
    { hoja: 'Empleados, Contratistas y prove', fila: 11, mensaje: 'Nombre descartado: solo se registra el de servidores públicos.' },
    { hoja: 'Medios de comunicación', fila: 14, mensaje: 'Nombre descartado: solo se registra el de servidores públicos.' }
  ]);
  assert.equal(/contacto|correo|numero|tel[eé]fono/i.test(JSON.stringify(resultado.registros.actores)), false);
});

test('Carga Excel Módulo I: una segunda carga conserva ids y actualiza', () => {
  const primera = Carga.leer(archivo('mapeo-gh-muestra.xlsx'), 'actores', base([]));
  const segunda = Carga.leer(archivo('mapeo-gh-muestra.xlsx'), 'actores', base(primera.registros.actores));
  assert.equal(segunda.nuevos, 0); assert.equal(segunda.actualizados, 4);
  assert.deepEqual(segunda.registros.actores.map(actor => actor.id), primera.registros.actores.map(actor => actor.id));
});

test('Carga Excel Módulo I: el registro equivale al formulario tras validar', () => {
  const contexto = base([]), resultado = Carga.leer(archivo('mapeo-gh-muestra.xlsx'), 'actores', contexto);
  const cargado = porInstitucion(resultado)['Alcaldía Municipal de Ejemplo'];
  const manual = Object.fromEntries(Object.keys(contexto.esquema.campos).map(campo => [campo, '']));
  Object.assign(manual, {
    id: cargado.id,
    categoria: 'Instituciones gubernamentales', institucion: 'Alcaldía Municipal de Ejemplo',
    nombre_servidor: 'Persona Inventada Tres', caracterizacion: 'Autoridad municipal del área de influencia.', posicion: 'Neutral',
    dependencia: 3, tension: 2, responsabilidad: 5, influencia: 5, impacto: 4
  });
  const validadoManual = Actores.validar(manual, contexto.cfg, contexto.esquema);
  assert.equal(validadoManual.ok, true);
  assert.deepEqual(cargado, validadoManual.registro);
});

test('Carga Excel Módulo IV: contrato de plantilla-iv-muestra.xlsx', () => {
  const resultado = Carga.leer(archivo('plantilla-iv-muestra.xlsx'), 'riesgos', baseRiesgos());
  const riesgo = resultado.registros.riesgos[0], grupo = resultado.registros['riesgos-grupos'][0];
  assert.equal(resultado.nuevos, 2); assert.equal(resultado.actualizados, 0); assert.deepEqual(resultado.avisos, []);
  assert.equal(riesgo.id, 'r-01');
  assert.deepEqual(riesgo.ambitos, ['Operación propia', 'Comunidades del área de influencia']);
  assert.equal(grupo.nombre, 'Mesa comunitaria inventada');
  assert.equal(grupo.fecha, '2026-10-01');
  assert.deepEqual(resultado.errores.map(error => [error.hoja, error.fila, error.campo]), [
    ['Riesgos', 3, 'codigo'],
    ['Calificación técnica', 2, 'tipo_impacto'], ['Calificación técnica', 2, 'vinculacion'],
    ['Validaciones', 2, 'resultado'],
    ['Medidas', 2, 'componente'], ['Medidas', 2, 'estado']
  ]);
  assert.match(resultado.errores[0].mensaje, /Usa un código como R-01\./);
  assert.equal(resultado.errores.some(error => ['riesgo', 'grupo', 'riesgos'].includes(error.campo)), false);
  assert.equal(resultado.errores.some(error => /, fila \d+:/.test(error.mensaje)), false);
});

test('Carga Excel Módulo IV: una segunda carga conserva ids y actualiza', () => {
  const primera = Carga.leer(archivo('plantilla-iv-muestra.xlsx'), 'riesgos', baseRiesgos());
  const segunda = Carga.leer(archivo('plantilla-iv-muestra.xlsx'), 'riesgos', baseRiesgos(primera.registros));
  assert.equal(segunda.nuevos, 0); assert.equal(segunda.actualizados, 2);
  for (const coleccion of coleccionesRiesgos) {
    assert.deepEqual(segunda.registros[coleccion].map(registro => registro.id), primera.registros[coleccion].map(registro => registro.id));
  }
});

test('Carga Excel Módulo IV: resuelve referencias, componente y fechas nativas', () => {
  const resultado = Carga.leer(plantillaRiesgosValida(), 'riesgos', baseRiesgos());
  const riesgo = resultado.registros.riesgos[0], grupo = resultado.registros['riesgos-grupos'][0];
  const validacion = resultado.registros['riesgos-validaciones'][0], medida = resultado.registros['riesgos-medidas'][0];
  assert.equal(resultado.nuevos, 5); assert.equal(resultado.actualizados, 0); assert.deepEqual(resultado.errores, []);
  assert.deepEqual(riesgo.ambitos, ['Operación propia', 'Comunidades del área de influencia']);
  assert.equal(grupo.fecha, '2026-10-01');
  assert.equal(validacion.riesgo, riesgo.id); assert.equal(validacion.grupo, grupo.id);
  assert.equal(medida.componente, 'componente-1'); assert.deepEqual(medida.riesgos, [riesgo.id]);
  assert.equal(medida.plazo, '2027-01-15');
});
