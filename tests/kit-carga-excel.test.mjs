import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Carga from '../public/kit-carga-excel.js';
import Actores from '../public/kit-actores.js';

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
