(function (root) {
  'use strict';
  const modulos = typeof module !== 'undefined' && module.exports ? require('./config/kit-modulos.json').modulos : [];
  // Orden común (decisión del 5-nov): Metodología, Alimentación y Resultados. La primera es la que abre el módulo.
  const tabsModulo = { actores: ['metodologia', 'alimentacion', 'mapa'], ddhh: ['metodologia', 'alimentacion', 'resultados', 'estandares'], materialidad: ['metodologia', 'alimentacion', 'resultados'], riesgos: ['metodologia', 'alimentacion', 'matriz', 'medidas'] };
  const ocultas = { riesgos: ['medidas'] };
  const nombresPestana = { metodologia: 'Metodología', alimentacion: 'Alimentación', mapa: 'Resultados', matriz: 'Resultados', resultados: 'Resultados', estandares: 'Cruce de estándares' };
  const roles = { admin: 'Soporte Meleia', responsable: 'Responsable', demostrador: 'Demostración' };
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
    const sub = modulo.id === 'materialidad' && ['doble','impacto','financiera'].includes(partes[2]) ? 'resultados' : partes[2] || tabs[0];
    if (sub && !tabs.includes(sub)) return portada;
    return { clave: modulo.id + (sub ? '/' + sub : ''), empresa, modulo, sub, hash: '#/' + modulo.id + '/' + empresa.id + (sub ? '/' + sub : '') };
  }
      function tituloMarca(texto, nivel = 'h1') {
        const el = App.el;
        const banda = el('div', null, 'kit-titulo'), arco = el('span', null, 'kit-titulo-arco');
        arco.setAttribute('aria-hidden', 'true'); banda.append(el(nivel === 'h2' ? 'h2' : 'h1', texto), arco); return banda;
      }
  const vistas = new Map();
  const App = {
    resolverRuta, pestanas, modulos, casos, tituloMarca,
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
      const botonMenu = document.getElementById('kit-menu') || { hidden: true, setAttribute() {}, addEventListener() {} };
      function menu(abrir) { nav.classList?.toggle('abierto', abrir); botonMenu.setAttribute('aria-expanded', String(abrir)); botonMenu.setAttribute('aria-label', abrir ? 'Cerrar el menú' : 'Abrir el menú'); }
      botonMenu.addEventListener('click', () => menu(botonMenu.getAttribute?.('aria-expanded') !== 'true'));
      nav.addEventListener?.('click', e => { if (e.target.closest?.('a')) menu(false); });
      root.document?.addEventListener?.('keydown', e => { if (e.key === 'Escape' && botonMenu.getAttribute?.('aria-expanded') === 'true') { menu(false); botonMenu.focus?.(); } });
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
        form.append(lc, correo, lp, clave, enviar, olvido, estado); tarjeta.append(el('p', 'Kit de sostenibilidad', 'antetitulo'), titulo, form); contenido.append(tarjeta);
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
        cuenta.replaceChildren(); nav.replaceChildren(); menu(false);
        botonMenu.hidden = !usuario;
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
        nav.append(enlace('Credenciales', '#/', ruta.clave === 'portada'));
        modulos.forEach(m => { const a = enlace(`${m.numero} · ${m.corto || m.nombre}`, '#/' + m.id, ruta.modulo?.id === m.id); a.setAttribute('aria-label', `Módulo ${m.numero} · ${m.nombre}${casos(m, empresas).length ? '' : ' · Sin casos disponibles para tu cuenta'}`); a.title = `Módulo ${m.numero} · ${m.nombre}`; if (!casos(m, empresas).length) a.append(el('small', 'Sin casos disponibles para tu cuenta')); nav.append(a); });
      }
      // Formato de títulos del sitio: franja verde con el arco y el punto de la marca.
      // E42 (5-nov): la portada es la ventana de Credenciales de Meleia. Resume la presentación de
      // credenciales (quiénes somos, servicios, experiencia, equipo y aliados) y termina en los módulos.
      async function credenciales(destino) {
        destino.replaceChildren(el('p', 'Cargando credenciales…', 'nota'));
        try {
          const r = await root.fetch('config/kit-credenciales.json'); if (!r.ok) throw Error('No se pudieron cargar las credenciales.');
          const cfg = await r.json(), seccion = (titulo, clase) => { const s = el('section', null, 'kit-cred-seccion ' + clase); s.append(el('h2', titulo)); return s; };
          const lista = puntos => { const ul = el('ul'); puntos.forEach(t => ul.append(el('li', t))); return ul; };
          const partes = [];
          if (cfg.quienes) { const s = seccion('Quiénes somos', 'kit-cred-quienes'); s.append(el('p', cfg.quienes)); partes.push(s); }
          if ((cfg.servicios || []).length) { const s = seccion('Servicios', 'kit-cred-servicios'), rej = el('div', null, 'kit-cred-rejilla'); cfg.servicios.forEach((v, i) => { const a = el('article', null, 'kit-cred-tarjeta'); a.append(el('span', String(i + 1).padStart(2, '0'), 'kit-cred-numero'), el('h3', v.titulo), lista(v.puntos)); rej.append(a); }); s.append(rej); partes.push(s); }
          if ((cfg.experiencia || []).length) { const s = seccion('Experiencia', 'kit-cred-experiencia'), rej = el('div', null, 'kit-cred-rejilla kit-cred-casos'); cfg.experiencia.forEach(v => { const a = el('article', null, 'kit-cred-tarjeta'); a.append(el('p', v.sector, 'antetitulo'), el('h3', v.tema), el('p', v.descripcion), el('p', v.alcance, 'kit-cred-alcance'), lista(v.logros)); rej.append(a); }); s.append(rej); partes.push(s); }
          if ((cfg.personas || []).length) {
            const s = seccion('Equipo', 'kit-cred-equipo'), rej = el('div', null, 'kit-equipo');
            cfg.personas.forEach(p => {
              const ficha = el('article', null, 'kit-persona'), cabeza = el('div', null, 'kit-persona-cabeza'), texto = el('div');
              if (p.foto) { const img = el('img'); img.src = p.foto; img.alt = 'Foto de ' + p.nombre; img.loading = 'lazy'; cabeza.append(img); }
              else { const vacio = el('div', null, 'kit-persona-foto-vacia'); vacio.setAttribute('aria-hidden', 'true'); cabeza.append(vacio); }
              texto.append(el('h3', p.nombre)); if (p.cargo) texto.append(el('p', p.cargo, 'kit-persona-cargo')); cabeza.append(texto); ficha.append(cabeza);
              if (p.experiencia) ficha.append(el('p', p.experiencia, 'kit-persona-experiencia'));
              rej.append(ficha);
            }); s.append(rej); partes.push(s);
          }
          if ((cfg.aliados || []).length) { const s = seccion('Aliados', 'kit-cred-aliados'); s.append(lista(cfg.aliados)); partes.push(s); }
          // E45: contacto comercial. El correo es provisional (dominio GH) hasta que Meleia tenga el suyo.
          if (cfg.contacto?.correo) { const s = seccion('Contacto', 'kit-cred-contacto'), p = el('p'), a = el('a', cfg.contacto.correo); a.href = 'mailto:' + cfg.contacto.correo; p.append(el('span', 'Escríbenos a '), a); s.append(p); if (cfg.contacto.telefono) s.append(el('p', 'Teléfono: ' + cfg.contacto.telefono)); partes.push(s); }
          destino.replaceChildren(...partes);
        } catch (e) { destino.replaceChildren(mensaje(e.message || 'No se pudieron cargar las credenciales.', true)); }
      }
      async function render() {
        const turno = ++revision;
        if (typeof limpieza === 'function') limpieza(); limpieza = null;
        contenido.replaceChildren();
        const ruta = resolverRuta(root.location.hash, usuario, empresas, id => datos.puedeEditar(id));
        if (root.location.hash !== ruta.hash) root.history.replaceState(null, '', ruta.hash);
        cabecera(ruta);
        if (!usuario) { ingresar(); contenido.focus(); return; }
        contenido.append(tituloMarca(ruta.modulo ? `Módulo ${ruta.modulo.numero} · ${ruta.modulo.nombre}` : 'Meleia'));
        const zona = el('section', null, 'kit-vista'); contenido.append(zona); contenido.focus();
        try {
          if (ruta.clave === 'portada') {
            const cred = el('div', null, 'kit-cred'); zona.append(cred); const pendiente = credenciales(cred);
            zona.append(el('h2', 'Kit de sostenibilidad', 'kit-cred-titulo-modulos'));
            const tarjetas = el('div', null, 'kit-modulos kit-rejilla');
            modulos.forEach(m => {
              const disponibles = casos(m, empresas), tarjeta = el('a', null, 'kit-modulo');
              tarjeta.href = '#/' + m.id;
              tarjeta.append(el('span', 'Módulo ' + m.numero, 'kit-modulo-numero'), el('h2', m.nombre), el('p', m.descripcion), el('p', disponibles.length ? 'Casos: ' + disponibles.map(e => e.nombre).join(' · ') : 'Sin casos disponibles para tu cuenta', 'nota'));
              tarjetas.append(tarjeta);
            }); zona.append(tarjetas); await pendiente;
          } else if (ruta.clave === 'sin-casos') {
            zona.append(mensaje('Sin casos disponibles para tu cuenta'));
          } else {
            const disponibles = casos(ruta.modulo, empresas);
            if (disponibles.length === 1) {
              const caso = el('p', null, 'kit-caso-unico'); caso.append(el('span', 'Caso'), el('strong', ruta.empresa.nombre)); zona.append(caso);
            } else {
              const selector = el('nav', null, 'kit-casos'); selector.setAttribute('aria-label','Casos del módulo');
              const botonCaso = el('button','Caso','kit-credenciales-boton'), listaCasos = el('div',null,'kit-casos-lista');
              botonCaso.type = 'button'; botonCaso.setAttribute('aria-expanded','false'); botonCaso.setAttribute('aria-controls','kit-lista-casos'); listaCasos.id = 'kit-lista-casos'; listaCasos.hidden = true;
              const cerrarCasos = () => { listaCasos.hidden = true; botonCaso.setAttribute('aria-expanded','false'); botonCaso.focus(); };
              botonCaso.onclick = () => { const abrir = listaCasos.hidden; listaCasos.hidden = !abrir; botonCaso.setAttribute('aria-expanded',String(abrir)); };
              selector.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); cerrarCasos(); } };
              disponibles.forEach(e => { const sub = pestanas(ruta.modulo.id, datos.puedeEditar(e.id)).includes(ruta.sub) ? '/' + ruta.sub : ''; const a = enlace(e.nombre, '#/' + ruta.modulo.id + '/' + e.id + sub, e.id === ruta.empresa.id); a.onclick = cerrarCasos; listaCasos.append(a); });
              selector.append(botonCaso,el('span',ruta.empresa.nombre,'kit-caso-actual'),listaCasos); zona.append(selector);
            }
            const tabs = el('nav', null, 'kit-pestanas'); tabs.setAttribute('aria-label', 'Pestañas del módulo');
            pestanas(ruta.modulo.id, datos.puedeEditar(ruta.empresa.id)).filter(p => !(ocultas[ruta.modulo.id] || []).includes(p)).forEach(p => tabs.append(enlace(nombresPestana[p] || p[0].toUpperCase() + p.slice(1), '#/' + ruta.modulo.id + '/' + ruta.empresa.id + '/' + p, p === ruta.sub)));
            if (tabs.children.length > 1) zona.append(tabs);
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
      if (root.KitCargaExcel) { try { const r = await root.fetch('config/kit-carga-excel.json'); if (r.ok) root.KitCargaExcel.configurar(await r.json()); } catch (_) {} }
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
