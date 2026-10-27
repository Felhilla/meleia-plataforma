(function (root) {
  'use strict';
  const modulos = typeof module !== 'undefined' && module.exports ? require('./config/kit-modulos.json').modulos : [];
  const tabsModulo = { actores: ['mapa', 'alimentacion'], ddhh: ['resultados', 'estandares', 'alimentacion'], materialidad: ['doble', 'impacto', 'financiera', 'alimentacion'], riesgos: ['matriz', 'medidas', 'alimentacion'] };
  const roles = { admin: 'Soporte GH', responsable: 'Responsable', demostrador: 'Demostración' };
  function pestanas(modulo, permiso) { return (tabsModulo[modulo] || []).filter(p => p !== 'alimentacion' || permiso === true || ['admin', 'responsable'].includes(permiso)); }
  function casos(modulo, empresas) { return empresas.filter(e => e.muestra_comercial === false || (e.muestra_comercial === true && modulo.casos.includes(e.id))); }
  function resolverRuta(hash, usuario, empresas, puedeEditar = id => ['admin', 'responsable'].includes(empresas.find(e => e.id === id)?.rol)) {
    if (!usuario) return { clave: 'ingresar', hash: '#/ingresar' };
    const portada = { clave: 'portada', hash: '#/' };
    let partes = String(hash).split('?')[0].split('/').slice(1);
    if (partes[0] === 'e') partes = [partes[2], partes[1], ...partes.slice(3)];
    const modulo = modulos.find(m => m.id === partes[0]);
    if (!modulo || partes.length > 3) return portada;
    const disponibles = casos(modulo, empresas);
    if (!disponibles.length && !partes[1] && !partes[2]) return { clave: 'sin-casos', modulo, hash: '#/' + modulo.id };
    const empresa = partes[1] ? disponibles.find(e => e.id === partes[1]) : disponibles[0];
    if (!empresa) return portada;
    const tabs = pestanas(modulo.id, puedeEditar(empresa.id));
    const sub = partes[2] || tabs[0];
    if (sub && !tabs.includes(sub)) return portada;
    return { clave: modulo.id + (sub ? '/' + sub : ''), empresa, modulo, sub, hash: '#/' + modulo.id + '/' + empresa.id + (sub ? '/' + sub : '') };
  }
  const vistas = new Map();
  const App = {
    resolverRuta, pestanas, modulos, casos,
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
        const rol = ['admin', 'responsable', 'demostrador'].find(r => empresas.some(e => e.rol === r));
        if (rol) cuenta.append(el('span', roles[rol], 'chip'));
        const salir = el('button', 'Salir', 'boton secundario'); salir.type = 'button';
        salir.onclick = async () => {
          salir.disabled = true;
          try { await datos.cerrarSesion(); usuario = null; empresas = []; await render(); }
          catch (error) { mostrarError(error); salir.disabled = false; }
        };
        cuenta.append(salir);
        nav.append(enlace('Portada', '#/', ruta.clave === 'portada'));
        modulos.forEach(m => { const a = enlace(`${m.numero} · ${m.corto || m.nombre}`, '#/' + m.id, ruta.modulo?.id === m.id); a.setAttribute('aria-label', `Módulo ${m.numero} · ${m.nombre}${casos(m, empresas).length ? '' : ' · Sin casos disponibles para tu cuenta'}`); a.title = `Módulo ${m.numero} · ${m.nombre}`; if (!casos(m, empresas).length) a.append(el('small', 'Sin casos disponibles para tu cuenta')); nav.append(a); });
      }
      async function render() {
        const turno = ++revision;
        if (typeof limpieza === 'function') limpieza(); limpieza = null;
        contenido.replaceChildren();
        const ruta = resolverRuta(root.location.hash, usuario, empresas, id => datos.puedeEditar(id));
        if (root.location.hash !== ruta.hash) root.history.replaceState(null, '', ruta.hash);
        cabecera(ruta);
        if (!usuario) { ingresar(); contenido.focus(); return; }
        contenido.append(el('h1', ruta.modulo ? `Módulo ${ruta.modulo.numero} · ${ruta.modulo.nombre}` : 'GH Studio × Meleia'));
        const zona = el('section', null, 'kit-vista'); contenido.append(zona); contenido.focus();
        try {
          if (ruta.clave === 'portada') {
            zona.append(el('p', 'Herramientas para la gestión social, ambiental y de derechos humanos de proyectos', 'kit-presentacion'));
            const credenciales = el('section', null, 'kit-credenciales'); credenciales.append(el('h2', 'Credenciales'), el('p', 'Próximamente')); zona.append(credenciales);
            const tarjetas = el('div', null, 'kit-modulos');
            modulos.forEach(m => {
              const disponibles = casos(m, empresas), tarjeta = el('article', null, 'tarjeta');
              tarjeta.append(el('p', 'Módulo ' + m.numero, 'antetitulo'), el('h2', m.nombre), el('p', m.descripcion), el('p', disponibles.length ? 'Casos: ' + disponibles.map(e => e.nombre).join(' · ') : 'Sin casos disponibles para tu cuenta', 'nota'), enlace('Abrir módulo →', '#/' + m.id)); tarjetas.append(tarjeta);
            }); zona.append(tarjetas);
          } else if (ruta.clave === 'sin-casos') {
            zona.append(mensaje('Sin casos disponibles para tu cuenta'));
          } else {
            const disponibles = casos(ruta.modulo, empresas);
            const selector = el(disponibles.length > 1 ? 'nav' : 'p', null, 'kit-casos');
            selector.append(el('span', 'Caso:'));
            if (disponibles.length > 1) {
              selector.setAttribute('aria-label', 'Casos del módulo');
              disponibles.forEach(e => { const sub = pestanas(ruta.modulo.id, datos.puedeEditar(e.id)).includes(ruta.sub) ? '/' + ruta.sub : ''; selector.append(enlace(e.nombre, '#/' + ruta.modulo.id + '/' + e.id + sub, e.id === ruta.empresa.id)); });
            } else selector.append(el('strong', ruta.empresa.nombre));
            zona.append(selector);
            const tabs = el('nav', null, 'kit-pestanas'); tabs.setAttribute('aria-label', 'Pestañas del módulo');
            pestanas(ruta.modulo.id, datos.puedeEditar(ruta.empresa.id)).forEach(p => tabs.append(enlace(({alimentacion: 'Alimentación', resultados: 'Resultados obtenidos', estandares: 'Cruce de estándares', doble: 'Doble materialidad', impacto: 'Materialidad de impacto', financiera: 'Materialidad financiera'})[p] || p[0].toUpperCase() + p.slice(1), '#/' + ruta.modulo.id + '/' + ruta.empresa.id + '/' + p, p === ruta.sub)));
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
      try { if (!modulos.length) { const respuesta = await root.fetch('config/kit-modulos.json'); if (!respuesta.ok) throw Error('No se pudo cargar el catálogo de módulos.'); const config = await respuesta.json(); modulos.push(...config.modulos); } usuario = await datos.usuarioActual(); if (usuario) empresas = await datos.empresas(); await render(); }
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
