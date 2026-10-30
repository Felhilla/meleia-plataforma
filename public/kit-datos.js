/* Datos del Kit. Los permisos definitivos pertenecen a RLS, nunca a esta interfaz. */
(function (root) {
  'use strict';
  function traducir(error, status) {
    const codigo = String(error?.status || status || error?.code || '');
    let mensaje = 'No se pudo completar la operación en la base de datos';
    if (codigo === '401' || ['PGRST301', 'PGRST303', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error?.code)) mensaje = 'Se cerró tu sesión; vuelve a ingresar';
    else if (codigo === '403' || error?.code === '42501') mensaje = 'No tienes permiso para editar esta empresa';
    else if (error?.code === 'invalid_credentials') mensaje = 'El correo o la contraseña no son correctos';
    else if (!codigo || /fetch|network|connection/i.test(error?.message || '')) mensaje = 'No hay conexión con la base de datos';
    const resultado = new Error(mensaje, { cause: error });
    resultado.codigo = codigo; resultado.sesionCerrada = mensaje.startsWith('Se cerró');
    return resultado;
  }
  function crear(cliente) {
    const cache = new Map(), pendientes = new Map(), versiones = new Map();
    let roles = new Map(), generacion = 0, usuarioId = null;
    const observadores = new Set();
    const copia = v => JSON.parse(JSON.stringify(v));
    const llave = (e, c) => JSON.stringify([e, c]);
    function limpiar() { generacion++; cache.clear(); pendientes.clear(); versiones.clear(); roles.clear(); usuarioId = null; }
    async function pedir(consulta) {
      let r;
      try { r = await consulta; } catch (e) { throw traducir(e); }
      if (r.error) { const e = traducir(r.error, r.status); if (e.sesionCerrada) limpiar(); throw e; }
      return r.data;
    }
    async function todas(consulta) {
      const filas = [];
      for (let desde = 0; ; desde += 1000) {
        const pagina = await pedir(consulta().range(desde, desde + 999));
        filas.push(...pagina);
        if (pagina.length < 1000) return filas;
      }
    }
    function destino(e, c) {
      if (typeof e !== 'string' || !/^[a-z0-9-]{2,40}$/.test(e)) throw new Error('Empresa inválida');
      if (typeof c !== 'string' || !/^[a-z0-9-]{2,40}$/.test(c)) throw new Error('Colección inválida');
    }
    function registro(id, data) {
      if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(id)) throw new Error('Identificador inválido');
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.id !== id) throw new Error('El registro debe ser un objeto y data.id debe ser igual a id');
      let json; try { json = JSON.stringify(data); } catch (_) { throw new Error('El registro debe ser un objeto JSON'); }
      if (new TextEncoder().encode(json).length > 50000) throw new Error('El registro supera los 50 000 bytes');
    }
    function invalidar(e, c) { const k = llave(e, c); cache.delete(k); pendientes.delete(k); versiones.set(k, (versiones.get(k) || 0) + 1); }
    const api = {
      async iniciarSesion(correo, clave) { limpiar(); return (await pedir(cliente.auth.signInWithPassword({ email: correo, password: clave }))).user; },
      async cerrarSesion() { try { await pedir(cliente.auth.signOut({ scope: 'local' })); } finally { limpiar(); } },
      async usuarioActual() { return (await pedir(cliente.auth.getSession()))?.session?.user || null; },
      async empresas() {
        const usuario = await api.usuarioActual();
        if (!usuario) { limpiar(); throw traducir({}, 401); }
        const g = generacion; usuarioId = usuario.id;
        const [empresas, miembros, admins] = await Promise.all([
          todas(() => cliente.from('empresas').select('id,nombre,muestra_comercial').order('id')),
          todas(() => cliente.from('miembros').select('empresa_id,rol').eq('user_id', usuario.id).order('empresa_id')),
          pedir(cliente.from('administradores').select('user_id').eq('user_id', usuario.id))
        ]);
        const lista = empresas.map(e => ({ ...e, rol: admins.length ? 'admin' : miembros.find(m => m.empresa_id === e.id)?.rol })).filter(e => e.rol);
        if (g === generacion) roles = new Map(lista.map(e => [e.id, e.rol]));
        return lista;
      },
      observarSesion(fn) { observadores.add(fn); return () => observadores.delete(fn); },
      puedeEditar(empresa) { return ['admin', 'responsable'].includes(roles.get(empresa)); },
      async listar(e, c) {
        destino(e, c); const k = llave(e, c);
        if (cache.has(k)) return copia(cache.get(k));
        if (!pendientes.has(k)) {
          const g = generacion, version = versiones.get(k) || 0;
          const consulta = todas(() => cliente.from('datos').select('data').eq('empresa_id', e).eq('coleccion', c).order('id')).then(filas => {
            const datos = filas.map(f => f.data);
            if (g === generacion && version === (versiones.get(k) || 0)) cache.set(k, copia(datos));
            return datos;
          });
          pendientes.set(k, consulta);
          consulta.finally(() => { if (pendientes.get(k) === consulta) pendientes.delete(k); }).catch(() => {});
        }
        return copia(await pendientes.get(k));
      },
      async guardar(e, c, id, data) { destino(e, c); registro(id, data); await api.guardarVarios(e, c, [data]); return copia(data); },
      async guardarVarios(e, c, registros) {
        destino(e, c);
        if (!Array.isArray(registros)) throw new Error('Se esperaba una lista de registros');
        registros.forEach(r => registro(r?.id, r));
        try {
          for (let i = 0; i < registros.length; i += 200) {
            await pedir(cliente.from('datos').upsert(registros.slice(i, i + 200).map(data => ({ empresa_id: e, coleccion: c, id: data.id, data })), { onConflict: 'empresa_id,coleccion,id' }));
          }
        } finally { invalidar(e, c); }
      },
      async borrar(e, c, id) {
        destino(e, c); registro(id, { id });
        try { await pedir(cliente.from('datos').delete().eq('empresa_id', e).eq('coleccion', c).eq('id', id)); }
        finally { invalidar(e, c); }
      },
      async historial(e, { coleccion, registroId, limite = 50 } = {}) {
        destino(e, coleccion || 'historial');
        if (!Number.isInteger(limite) || limite < 1 || limite > 1000) throw new Error('El límite debe ser un entero de 1 a 1000');
        let q = cliente.from('historial').select('n,coleccion,registro_id,accion,antes,despues,usuario,fecha').eq('empresa_id', e);
        if (coleccion) q = q.eq('coleccion', coleccion);
        if (registroId) q = q.eq('registro_id', registroId);
        return pedir(q.order('n', { ascending: false }).limit(limite));
      }
    };
    cliente.auth.onAuthStateChange?.((evento, sesion) => {
      // supabase-js repite SIGNED_IN al volver a la pestaña; solo un usuario distinto limpia permisos y caché.
      if (evento === 'SIGNED_IN' && usuarioId && sesion?.user?.id === usuarioId) return;
      if (['SIGNED_OUT', 'SIGNED_IN', 'USER_UPDATED'].includes(evento)) limpiar();
      if (evento === 'SIGNED_OUT') observadores.forEach(fn => fn(evento));
    });
    return api;
  }
  const api = { crear, traducir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitDatos = api;
})(typeof window !== 'undefined' ? window : globalThis);
