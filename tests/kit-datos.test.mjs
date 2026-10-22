import test from 'node:test';
import assert from 'node:assert/strict';
import Kit from '../public/kit-datos.js';
function falso({ admin = false, rol = 'responsable' } = {}) {
  const llamadas = [], tablas = { empresas: [{ id: 'uno', nombre: 'Uno', muestra_comercial: false }, { id: 'dos', nombre: 'Dos' }], miembros: [{ empresa_id: 'uno', rol }, { empresa_id: 'dos', rol: 'demostrador' }], administradores: admin ? [{ user_id: 'u' }] : [], datos: [{ data: { id: 'a', nombre: 'A' } }], historial: [] };
  let fallo, evento;
  const cliente = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u' } } } }),
      signInWithPassword: async args => { llamadas.push(['login', args]); return { data: { user: { id: 'u' } } }; },
      signOut: async () => ({ data: {} }), onAuthStateChange(fn) { evento = fn; }
    },
    from(tabla) {
      const llamada = { tabla, filtros: [] }; llamadas.push(llamada);
      const q = { range(desde, hasta) { llamada.rango = [desde, hasta]; return q; }, select(columnas) { llamada.columnas = columnas; return q; }, eq(k, v) { llamada.filtros.push([k, v]); return q; }, order(k, opciones) { llamada.orden = [k, opciones]; return q; }, limit(n) { llamada.limite = n; return q; }, upsert(filas, opciones) { llamada.filas = filas; llamada.opciones = opciones; return q; }, delete() { llamada.borrar = true; return q; }, then(resolve, reject) { return Promise.resolve(fallo || { data: tablas[tabla] }).then(resolve, reject); } }; return q;
    }
  };
  return { api: Kit.crear(cliente), llamadas, error: e => { fallo = e; }, evento: e => evento(e) };
}
test('rol efectivo: administrador gana; responsable edita y demostrador no', async () => {
  for (const admin of [true, false]) {
    const { api, llamadas } = falso({ admin });
    assert.deepEqual((await api.empresas()).map(e => e.rol), admin ? ['admin', 'admin'] : ['responsable', 'demostrador']);
    assert.equal(api.puedeEditar('uno'), true); assert.equal(api.puedeEditar('dos'), admin); assert.equal(api.puedeEditar('ajena'), false);
    assert.deepEqual(llamadas.find(c => c.tabla === 'miembros').filtros, [['user_id', 'u']]);
  }
});
test('caché aislada, copias defensivas, lecturas simultáneas y invalidación al guardar/borrar', async () => {
  const { api, llamadas } = falso();
  const [a] = await Promise.all([api.listar('uno', 'riesgos'), api.listar('uno', 'riesgos')]); a[0].nombre = 'mutado';
  assert.equal((await api.listar('uno', 'riesgos'))[0].nombre, 'A');
  assert.equal(llamadas.length, 1); assert.equal(llamadas[0].columnas, 'data'); assert.equal(llamadas[0].orden[0], 'id');
  await api.listar('dos', 'riesgos'); await api.listar('uno', 'actores'); assert.equal(llamadas.length, 3);
  await api.guardar('uno', 'riesgos', 'a', { id: 'a' }); await api.listar('uno', 'riesgos'); assert.equal(llamadas.length, 5);
  await api.listar('dos', 'riesgos'); assert.equal(llamadas.length, 5);
  await api.borrar('uno', 'riesgos', 'a'); await api.listar('uno', 'riesgos'); assert.equal(llamadas.length, 7);
  await api.cerrarSesion(); await api.listar('dos', 'riesgos'); assert.equal(llamadas.length, 8);
});
test('guardar exige coincidencia de id y objeto JSON antes de consultar', async () => {
  const { api, llamadas } = falso();
  await assert.rejects(api.guardar('uno', 'riesgos', 'a', { id: 'b' }), /data.id/);
  await assert.rejects(api.guardar('uno', 'riesgos', 'A', { id: 'A' }), /Identificador/);
  await assert.rejects(api.guardar('uno', 'riesgos', 'a', { id: 'a', texto: 'á'.repeat(26000) }), /50 000/);
  assert.equal(llamadas.length, 0);
});
test('lotes de 200: 401 registros; valida todo antes del primer envío', async () => {
  const { api, llamadas } = falso(); const registros = Array.from({ length: 401 }, (_, i) => ({ id: 'r-' + i }));
  await api.guardarVarios('uno', 'riesgos', registros);
  assert.deepEqual(llamadas.map(c => c.filas.length), [200, 200, 1]);
  assert.equal(llamadas[0].opciones.onConflict, 'empresa_id,coleccion,id');
  await assert.rejects(api.guardarVarios('uno', 'riesgos', [...registros, {}])); assert.equal(llamadas.length, 3);
});
test('errores de sesión, permisos y conexión; nunca devuelve respaldo', async () => {
  for (const [error, mensaje] of [[{ status: 401, error: {} }, /Se cerró tu sesión/], [{ status: 403, error: {} }, /No tienes permiso/], [{ error: { code: '42501' } }, /No tienes permiso/], [{ error: { message: 'Failed to fetch' } }, /No hay conexión/]]) {
    const f = falso(); f.error(error); await assert.rejects(f.api.listar('uno', 'riesgos'), mensaje);
  }
});
test('historial filtra empresa, colección y registro con límite explícito', async () => {
  const { api, llamadas } = falso(); await api.historial('uno', { coleccion: 'riesgos', registroId: 'r-1' });
  assert.deepEqual(llamadas[0].filtros, [['empresa_id', 'uno'], ['coleccion', 'riesgos'], ['registro_id', 'r-1']]); assert.equal(llamadas[0].limite, 50);
});
test('cambio de sesión limpia permisos y caché', async () => {
  const f = falso(); await f.api.empresas(); await f.api.listar('uno', 'riesgos'); f.evento('SIGNED_OUT');
  assert.equal(f.api.puedeEditar('uno'), false); await f.api.listar('uno', 'riesgos'); assert.equal(f.llamadas.filter(c => c.tabla === 'datos').length, 2);
});

test('listado paginado conserva el orden y solicita solo la empresa y colección elegidas', async () => {
  const llamadas = [];
  const cliente = { auth: {}, from(tabla) {
    const llamada = { tabla, filtros: [] }; llamadas.push(llamada);
    const q = { select(c) { llamada.columnas = c; return q; }, eq(k, v) { llamada.filtros.push([k, v]); return q; }, order(k) { llamada.orden = k; return q; }, range(a, b) { llamada.rango = [a, b]; return Promise.resolve({ data: Array.from({ length: a === 0 ? 1000 : 1 }, (_, i) => ({ data: { id: String(a + i).padStart(4, '0') } })) }); } }; return q;
  } };
  const api = Kit.crear(cliente), filas = await api.listar('uno', 'riesgos');
  assert.equal(filas.length, 1001); assert.equal(filas.at(-1).id, '1000');
  assert.deepEqual(llamadas.map(c => c.rango), [[0, 999], [1000, 1999]]);
  for (const c of llamadas) { assert.equal(c.columnas, 'data'); assert.deepEqual(c.filtros, [['empresa_id', 'uno'], ['coleccion', 'riesgos']]); }
  await api.listar('uno', 'riesgos'); assert.equal(llamadas.length, 2);
});
test('una lectura anterior a la escritura no repuebla caché invalidada', async () => {
  let resolver, lecturas = 0;
  const cliente = { auth: {}, from() {
    const q = { select() { return q; }, eq() { return q; }, order() { return q; }, range() { lecturas++; return lecturas === 1 ? new Promise(r => { resolver = r; }) : Promise.resolve({ data: [{ data: { id: 'a', valor: 'nuevo' } }] }); }, upsert: async () => ({ data: null }) }; return q;
  } };
  const api = Kit.crear(cliente), lectura = api.listar('uno', 'riesgos');
  await api.guardar('uno', 'riesgos', 'a', { id: 'a', valor: 'nuevo' });
  resolver({ data: [{ data: { id: 'a', valor: 'viejo' } }] }); await lectura;
  assert.equal((await api.listar('uno', 'riesgos'))[0].valor, 'nuevo'); assert.equal(lecturas, 2);
});
test('escritura parcial invalida caché aunque falle el segundo lote', async () => {
  let lotes = 0, lecturas = 0;
  const cliente = { auth: {}, from() {
    const q = { select() { return q; }, eq() { return q; }, order() { return q; }, range: async () => { lecturas++; return { data: [] }; }, upsert: async () => { lotes++; return lotes === 2 ? { error: { status: 403 } } : { data: null }; } }; return q;
  } };
  const api = Kit.crear(cliente); await api.listar('uno', 'riesgos');
  await assert.rejects(api.guardarVarios('uno', 'riesgos', Array.from({ length: 201 }, (_, i) => ({ id: 'r-' + i }))), /No tienes permiso/);
  await api.listar('uno', 'riesgos'); assert.equal(lecturas, 2);
});
