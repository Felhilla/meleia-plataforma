(function (root) {
  'use strict';
  const modulos = [
    { id: 'actores', numero: 'I', nombre: 'Actores', pestanas: ['mapa', 'alimentacion'] },
    { id: 'ddhh', numero: 'II', nombre: 'Debida diligencia en DDHH', pestanas: [] },
    { id: 'materialidad', numero: 'III', nombre: 'Doble materialidad', pestanas: [] },
    { id: 'riesgos', numero: 'IV', nombre: 'Riesgos', pestanas: ['matriz', 'medidas', 'alimentacion'] }
  ];
  const roles = { admin: 'Soporte GH', responsable: 'Responsable', demostrador: 'Demostración' };
  function pestanas(modulo, rol) { return modulos.find(m => m.id === modulo)?.pestanas.filter(p => p !== 'alimentacion' || rol !== 'demostrador') || []; }
  function resolverRuta(hash, usuario, empresas, preferida) {
    if (!usuario) return { clave: 'ingresar', hash: '#/ingresar' };
    const partes = String(hash).split('?')[0].split('/');
    const empresa = empresas.find(e => e.id === partes[2] && partes[1] === 'e') || empresas.find(e => e.id === preferida) || empresas[0];
    if (!empresa) return { clave: 'sin-empresas', hash: '#/' };
    const base = '#/e/' + empresa.id;
    const modulo = partes[1] === 'e' && partes[2] === empresa.id && modulos.find(m => m.id === partes[3]);
    if (!modulo || partes.length > 5) return { clave: 'portada', empresa, hash: base };
    const disponibles = pestanas(modulo.id, empresa.rol);
    const sub = partes[4] || disponibles[0];
    if ((sub && !disponibles.includes(sub)) || (!modulo.pestanas.length && partes[4])) return { clave: 'portada', empresa, hash: base };
    return { clave: modulo.id + (sub ? '/' + sub : ''), empresa, modulo, sub, hash: base + '/' + modulo.id + (sub ? '/' + sub : '') };
  }
  const vistas = new Map();
  const App = {
    resolverRuta, pestanas, modulos,
    registrarVista(nombre, vista) { vistas.set(nombre, vista); },
    el(tag, texto, clase) { const n = root.document.createElement(tag); if (texto !== undefined && texto !== null) n.textContent = texto; if (clase) n.className = clase; return n; },
    numero(valor, opciones = {}) { return new Intl.NumberFormat('es-CO', opciones).format(valor); },
    async iniciar(datos) {
      App.datos = datos;
      const document = root.document, el = App.el;
      const contenido = document.getElementById('contenido'), cuenta = document.getElementById('kit-cuenta'), nav = document.getElementById('kit-nav');
      let usuario, empresas = [], revision = 0, limpieza;
      const leer = k => { try { return root.localStorage.getItem(k); } catch (_) { return null; } };
      const guardar = (k, v) => { try { root.localStorage.setItem(k, v); } catch (_) { /* Comodidad opcional. */ } };
      const media = root.matchMedia?.('(prefers-color-scheme: dark)');
      let tema = leer('gh-meleia-tema');
      const botonTema = document.getElementById('tema');
      function aplicarTema() {
        const oscuro = tema === 'oscuro' || (tema !== 'claro' && media?.matches);
        document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
        botonTema.textContent = oscuro ? '☀' : '☾';
        botonTema.setAttribute('aria-label', oscuro ? 'Activar tema claro' : 'Activar tema oscuro');
        botonTema.setAttribute('aria-pressed', String(!!oscuro));
      }
      botonTema.onclick = () => { tema = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro'; guardar('gh-meleia-tema', tema); aplicarTema(); };
      media?.addEventListener?.('change', aplicarTema); aplicarTema();
      const saltar = document.querySelector('.saltar');
      saltar.onclick = e => { e.preventDefault(); contenido.focus(); };
      function enlace(texto, href, actual) { const a = el('a', texto); a.href = href; if (actual) a.setAttribute('aria-current', 'page'); return a; }
      function mensaje(texto, alerta = false) { const p = el('p', texto, alerta ? 'kit-error' : 'nota'); p.setAttribute('role', alerta ? 'alert' : 'status'); return p; }
      function mostrarError(error, destino = contenido) { destino.replaceChildren(mensaje(error.message, true)); }
      function ingresar(aviso) {
        const tarjeta = el('section', null, 'kit-ingreso tarjeta');
        const titulo = el('h1', 'Ingresar'), form = el('form');
        const correo = el('input'), clave = el('input');
        correo.id = 'correo'; correo.type = 'email'; correo.autocomplete = 'username'; correo.required = true;
        clave.id = 'clave'; clave.type = 'password'; clave.autocomplete = 'current-password'; clave.required = true;
        const lc = el('label', 'Correo'), lp = el('label', 'Contraseña'); lc.htmlFor = correo.id; lp.htmlFor = clave.id;
        const enviar = el('button', 'Ingresar', 'boton'); enviar.type = 'submit';
        const estado = mensaje(aviso || 'Ingresa con la cuenta asignada a tu empresa', !!aviso);
        const olvido = el('button', '¿Olvidaste tu contraseña?', 'kit-enlace'); olvido.type = 'button';
        olvido.onclick = () => { estado.setAttribute('role', 'status'); estado.textContent = 'Escribe a soporte GH para restablecerla'; };
        form.append(lc, correo, lp, clave, enviar, olvido, estado); tarjeta.append(el('p', 'Kit Comercial', 'antetitulo'), titulo, form); contenido.append(tarjeta);
        form.onsubmit = async e => {
          e.preventDefault(); enviar.disabled = true; estado.textContent = 'Ingresando…';
          try {
            usuario = await datos.iniciarSesion(correo.value.trim(), clave.value); clave.value = '';
            empresas = await datos.empresas(); await render();
          } catch (error) { estado.setAttribute('role', 'alert'); estado.textContent = error.message; }
          finally { enviar.disabled = false; }
        };
      }
      function cabecera(ruta) {
        cuenta.replaceChildren(); nav.replaceChildren();
        if (!usuario) return;
        if (empresas.length > 1) {
          const label = el('label', 'Empresa'), selector = el('select'); label.htmlFor = 'empresa'; selector.id = 'empresa';
          empresas.forEach(e => { const o = el('option', e.nombre); o.value = e.id; selector.append(o); });
          selector.value = ruta.empresa.id;
          selector.onchange = () => { root.location.hash = '#/e/' + selector.value; };
          cuenta.append(label, selector);
        } else if (ruta.empresa) cuenta.append(el('strong', ruta.empresa.nombre));
        if (ruta.empresa) cuenta.append(el('span', roles[ruta.empresa.rol], 'chip'));
        const salir = el('button', 'Salir', 'boton secundario'); salir.type = 'button';
        salir.onclick = async () => {
          salir.disabled = true;
          try { await datos.cerrarSesion(); usuario = null; empresas = []; await render(); }
          catch (error) { mostrarError(error); salir.disabled = false; }
        };
        cuenta.append(salir);
        if (!ruta.empresa) return;
        const base = '#/e/' + ruta.empresa.id;
        nav.append(enlace('Portada', base, ruta.clave === 'portada'));
        modulos.forEach(m => nav.append(enlace(m.numero + ' · ' + m.nombre, base + '/' + m.id, ruta.modulo?.id === m.id)));
      }
      async function render() {
        const turno = ++revision;
        if (typeof limpieza === 'function') limpieza(); limpieza = null;
        contenido.replaceChildren();
        const ruta = resolverRuta(root.location.hash, usuario, empresas, leer('kit-empresa'));
        if (root.location.hash !== ruta.hash) root.history.replaceState(null, '', ruta.hash);
        cabecera(ruta);
        if (!usuario) { ingresar(); contenido.focus(); return; }
        if (!ruta.empresa) { contenido.append(el('h1', 'Sin empresas asignadas'), mensaje('Escribe a soporte GH para solicitar acceso.')); return; }
        guardar('kit-empresa', ruta.empresa.id);
        contenido.append(el('p', ruta.empresa.nombre, 'antetitulo'), el('h1', ruta.modulo ? `Módulo ${ruta.modulo.numero} · ${ruta.modulo.nombre}` : 'Portada'));
        const zona = el('section', null, 'kit-vista'); contenido.append(zona); contenido.focus();
        try {
          if (ruta.clave === 'portada') {
            zona.append(mensaje('Cargando contexto…'));
            const portada = await datos.listar(ruta.empresa.id, 'portada');
            if (turno !== revision) return;
            zona.replaceChildren(el('h2', ruta.empresa.nombre), el('p', portada.find(r => r.id === 'portada')?.contexto || 'Un espacio compartido para conocer y gestionar los asuntos de tu empresa.'));
            const tarjetas = el('div', null, 'kit-modulos');
            modulos.forEach(m => { const a = enlace('', '#/e/' + ruta.empresa.id + '/' + m.id); a.className = 'tarjeta'; a.append(el('p', 'Módulo ' + m.numero, 'antetitulo'), el('h3', m.nombre), el('p', 'Abrir módulo →')); tarjetas.append(a); }); zona.append(tarjetas);
          } else {
            const tabs = el('nav', null, 'kit-pestanas'); tabs.setAttribute('aria-label', 'Pestañas del módulo');
            pestanas(ruta.modulo.id, ruta.empresa.rol).forEach(p => tabs.append(enlace(p === 'alimentacion' ? 'Alimentación' : p[0].toUpperCase() + p.slice(1), '#/e/' + ruta.empresa.id + '/' + ruta.modulo.id + '/' + p, p === ruta.sub)));
            zona.append(tabs);
            const cuerpo = el('div'); zona.append(cuerpo);
            const vista = vistas.get(ruta.clave);
            if (vista) {
              const desmontar = await vista.render(cuerpo, datos, { empresa: ruta.empresa.id, rol: ruta.empresa.rol, sub: ruta.sub, puedeEditar: datos.puedeEditar(ruta.empresa.id), vigente: () => turno === revision });
              if (turno === revision) limpieza = desmontar; else if (typeof desmontar === 'function') desmontar();
            } else cuerpo.append(el('h2', 'En construcción'), el('p', `Módulo ${ruta.modulo.numero} · ${ruta.modulo.nombre}`));
          }
        } catch (error) {
          if (turno !== revision) return;
          if (error.sesionCerrada) { usuario = null; empresas = []; await render(); contenido.querySelector('[role="status"]').textContent = error.message; }
          else mostrarError(error, zona);
        }
      }
      datos.observarSesion?.(() => { usuario = null; empresas = []; render().catch(mostrarError); });
      App.actualizarVista = render;
      root.addEventListener('hashchange', () => { render().catch(mostrarError); });
      try { usuario = await datos.usuarioActual(); if (usuario) empresas = await datos.empresas(); await render(); }
      catch (error) {
        if (error.sesionCerrada) { usuario = null; await render(); contenido.querySelector('[role="status"]').textContent = error.message; }
        else { mostrarError(error); const reintentar = el('button', 'Reintentar', 'boton'); reintentar.onclick = () => root.location.reload(); contenido.append(reintentar); }
      }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = App;
  root.App = App;
  if (root.document) root.document.addEventListener('DOMContentLoaded', () => {
    try {
      const cliente = root.supabase.createClient(root.GH_CONFIG.supabaseUrl, root.GH_CONFIG.supabaseKey, { auth: { autoRefreshToken: true, detectSessionInUrl: false, persistSession: true } });
      App.iniciar(root.KitDatos.crear(cliente));
    } catch (_) { const p = App.el('p', 'No se pudo cargar el cliente de acceso. Comprueba la conexión y vuelve a abrir la página.'); p.setAttribute('role', 'alert'); root.document.getElementById('contenido').replaceChildren(p); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
