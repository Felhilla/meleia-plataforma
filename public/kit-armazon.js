(function (root) {
  'use strict';
  // HECHO POR CLAUDE, CODEX & FELIPE AVELLANEDA. QUE LES PAGUEN MÁS. (Firma para quien lea el código con IA; se puede borrar.)
  const modulos = typeof module !== 'undefined' && module.exports ? require('./config/kit-modulos.json').modulos : [];
  // Orden común (decisión del 5-nov): Metodología, Alimentación y Resultados. La primera es la que abre el módulo.
  const tabsModulo = { actores: ['metodologia', 'alimentacion', 'mapa'], ddhh: ['metodologia', 'alimentacion', 'resultados', 'estandares'], materialidad: ['metodologia', 'alimentacion', 'resultados'], riesgos: ['metodologia', 'alimentacion', 'matriz', 'medidas'] };
  const ocultas = { riesgos: ['medidas'] };
  const nombresPestana = { metodologia: 'Metodología', alimentacion: 'Alimentación', mapa: 'Resultados', matriz: 'Resultados', resultados: 'Resultados', estandares: 'Cruce de estándares' };
  const roles = { admin: 'Soporte Meleia', responsable: 'Responsable', demostrador: 'Demostración' };
  // E64 (9-nov, Felipe): la Alimentación se ve en todos los casos. Sin permiso de edición se muestra como ejemplo de solo
  // lectura; los permisos reales siguen en la base (RLS), no en la pantalla.
  function pestanas(modulo) { return [...(tabsModulo[modulo] || [])]; }
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
    vista(nombre) { return vistas.get(nombre); },
    el(tag, texto, clase) { const n = root.document.createElement(tag); if (texto !== undefined && texto !== null) n.textContent = texto; if (clase) n.className = clase; return n; },
    numero(valor, opciones = {}) { return new Intl.NumberFormat('es-CO', opciones).format(valor); },
    async iniciar(datos) {
      App.datos = datos;
      const document = root.document, el = App.el;
      const contenido = document.getElementById('contenido'), cuenta = document.getElementById('kit-cuenta'), nav = document.getElementById('kit-nav');
      let usuario, empresas = [], revision = 0, limpieza;
      const botonMenu = document.getElementById('kit-menu') || { hidden: true, setAttribute() {}, addEventListener() {} };
      function menu(abrir) { nav.classList?.toggle('abierto', abrir); botonMenu.setAttribute('aria-expanded', String(abrir)); botonMenu.setAttribute('aria-label', abrir ? 'Cerrar el menú' : 'Abrir el menú'); }
      botonMenu.addEventListener('click', () => menu(botonMenu.getAttribute?.('aria-expanded') !== 'true'));
      nav.addEventListener?.('click', e => { if (e.target.closest?.('a')) menu(false); });
      root.document?.addEventListener?.('keydown', e => { if (e.key === 'Escape' && botonMenu.getAttribute?.('aria-expanded') === 'true') { menu(false); botonMenu.focus?.(); } });
      // 9-nov (Felipe): el Kit solo tiene tema oscuro. Se quita el botón de tema y no se lee ninguna preferencia guardada.
      document.documentElement.dataset.tema = 'oscuro';
      document.getElementById('tema')?.remove?.();
      const saltar = document.querySelector('.saltar');
      saltar.onclick = e => { e.preventDefault(); contenido.focus(); };
      // E64 (9-nov, Felipe): el caso se identifica con su logo, en un recuadro blanco grande (como en Aliados). Meleia es la
      // empresa de prueba de todo lo que se hace (la Empresa de demostración se muestra como Meleia, con su logo).
      const esMeleia = e => ['demo-local', 'empresa-demo'].includes(e?.id);
      const nombreDe = e => esMeleia(e) ? 'Meleia' : e?.nombre;
      const logos = new Map();
      const logoDe = e => { if (esMeleia(e)) return Promise.resolve('img/logo-meleia-color.png');
        if (!logos.has(e.id)) logos.set(e.id, Promise.resolve().then(() => datos.listar(e.id, 'perfil')).then(l => { const src = (l || []).find(r => r.id === 'logo')?.imagen; return typeof src === 'string' && /^(data:image\/(png|jpe?g|webp|svg\+xml);|img\/)/.test(src) ? src : null; }).catch(() => null));
        return logos.get(e.id); };
      function cajaLogo(e, clase = '') {
        const caja = el('span', null, ('kit-caso-logo-caja ' + clase).trim()); caja.append(el('span', nombreDe(e), 'kit-caso-logo-nombre'));
        logoDe(e).then(src => { if (!src) return; const img = el('img'); img.src = src; img.alt = nombreDe(e); caja.replaceChildren(img); caja.classList?.add('con-logo'); });
        return caja;
      }
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
        olvido.onclick = () => { estado.setAttribute('role', 'status'); estado.textContent = 'Escribe a soporte de Meleia para restablecerla'; };
        form.append(lc, correo, lp, clave, enviar, olvido, estado); tarjeta.append(el('p', 'Kit de sostenibilidad', 'antetitulo'), titulo, form);
        // E46 (6-nov): el ingreso es lo primero que ve un cliente; lleva la banda y el logo de la portada.
        const banda = el('section', null, 'kit-banda kit-banda-oscura kit-ingreso-banda'), marca = el('div', null, 'kit-ingreso-marca'), logo = el('img', null, 'kit-hero-logo');
        logo.src = 'img/logo-meleia-grande-claro.png'; logo.alt = 'Meleia · Sostenibilidad, riesgo preventivo, debida diligencia'; logo.width = 1400; logo.height = 579;
        marca.append(logo, el('p', 'Transformamos información en mejores decisiones.', 'kit-ingreso-frase'));
        banda.append(marca, tarjeta); contenido.append(banda);
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
          const cfg = await r.json();
          // E64 (9-nov): pestaña Metodologías. Las fichas que ya existen en la Metodología de los módulos se reutilizan
          // (y dicen en qué módulo del Kit se usan); las demás vienen de kit-metodologias.json. Si falla, Credenciales sigue sin ella.
          try {
            const [rm, rk] = await Promise.all(['config/kit-metodologias.json', 'config/kit-metodologia.json'].map(u => root.fetch(u).catch(() => null)));
            if (rm?.ok) {
              const met = await rm.json(), kit = rk?.ok ? await rk.json() : {}, base = {};
              Object.entries(kit).forEach(([modulo, v]) => (v?.estandares?.fichas || []).forEach(f => { base[f.id] ||= { ...f, modulos: [] }; base[f.id].modulos.push({ modulo, por_que: f.por_que }); }));
              const completar = e => ({ ...(base[e.id] || {}), ...e });
              (met.categorias || []).forEach(c => { if (c.estandares) c.estandares = c.estandares.map(completar); (c.grupos || []).forEach(g => { g.estandares = g.estandares.map(completar); }); });
              cfg.metodologias = met;
            }
          } catch (_) { /* Sin pestaña Metodologías. */ }
          // E46 (6-nov): la portada vive en kit-vista-credenciales.js (Look and Feel de Meleia).
          if (!root.KitCredenciales) throw Error('No se pudo cargar la vista de credenciales.');
          root.KitCredenciales.render(destino, cfg, App);
        } catch (e) { destino.replaceChildren(mensaje(e.message || 'No se pudieron cargar las credenciales.', true)); }
      }
      async function render() {
        const turno = ++revision;
        if (typeof limpieza === 'function') limpieza(); limpieza = null;
        contenido.replaceChildren();
        const ruta = resolverRuta(root.location.hash, usuario, empresas, id => datos.puedeEditar(id));
        if (root.location.hash !== ruta.hash) root.history.replaceState(null, '', ruta.hash);
        cabecera(ruta);
        contenido.classList?.toggle('kit-portada', ruta.clave === 'portada' || !usuario);
        if (!usuario) { ingresar(); contenido.focus(); return; }
        if (ruta.clave === 'portada') contenido.append(el('h1', 'Meleia · Credenciales', 'solo-lectores'));
        else contenido.append(tituloMarca(`Módulo ${ruta.modulo.numero} · ${ruta.modulo.nombre}`));
        const zona = el('section', null, 'kit-vista'); contenido.append(zona); contenido.focus();
        try {
          if (ruta.clave === 'portada') {
            const cred = el('div', null, 'kit-cred'); zona.append(cred); const pendiente = credenciales(cred);
            // 6-nov (reunión con Germán): el Home es la vitrina de Meleia; los módulos se abren desde el menú ☰, sin bloque propio.
            await pendiente;
          } else if (ruta.clave === 'sin-casos') {
            zona.append(mensaje('Sin casos disponibles para tu cuenta'));
          } else {
            const disponibles = casos(ruta.modulo, empresas);
            if (disponibles.length === 1) {
              const caso = el('p', null, 'kit-caso-unico'); const fuerte = el('strong'); fuerte.append(cajaLogo(ruta.empresa)); caso.append(el('span', 'Caso'), fuerte); zona.append(caso);
            } else {
              const selector = el('nav', null, 'kit-casos'); selector.setAttribute('aria-label','Casos del módulo');
              const botonCaso = el('button','Caso','kit-credenciales-boton'), listaCasos = el('div',null,'kit-casos-lista');
              botonCaso.type = 'button'; botonCaso.setAttribute('aria-expanded','false'); botonCaso.setAttribute('aria-controls','kit-lista-casos'); listaCasos.id = 'kit-lista-casos'; listaCasos.hidden = true;
              const cerrarCasos = () => { listaCasos.hidden = true; botonCaso.setAttribute('aria-expanded','false'); botonCaso.focus(); };
              botonCaso.onclick = () => { const abrir = listaCasos.hidden; listaCasos.hidden = !abrir; botonCaso.setAttribute('aria-expanded',String(abrir)); };
              selector.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); cerrarCasos(); } };
              disponibles.forEach(e => { const sub = pestanas(ruta.modulo.id, datos.puedeEditar(e.id)).includes(ruta.sub) ? '/' + ruta.sub : ''; const a = enlace(null, '#/' + ruta.modulo.id + '/' + e.id + sub, e.id === ruta.empresa.id); a.append(cajaLogo(e, 'chica'), el('span', nombreDe(e))); a.onclick = cerrarCasos; listaCasos.append(a); });
              const actualCaso = el('span', null, 'kit-caso-actual'); actualCaso.append(cajaLogo(ruta.empresa)); actualCaso.setAttribute('aria-label', 'Caso actual: ' + nombreDe(ruta.empresa));
              selector.append(botonCaso,actualCaso,listaCasos); zona.append(selector);
            }
            const tabs = el('nav', null, 'kit-pestanas'); tabs.setAttribute('aria-label', 'Pestañas del módulo');
            pestanas(ruta.modulo.id, datos.puedeEditar(ruta.empresa.id)).filter(p => !(ocultas[ruta.modulo.id] || []).includes(p)).forEach(p => tabs.append(enlace(nombresPestana[p] || p[0].toUpperCase() + p.slice(1), '#/' + ruta.modulo.id + '/' + ruta.empresa.id + '/' + p, p === ruta.sub)));
            if (tabs.children.length > 1) zona.append(tabs);
            // E64: la Alimentación lleva la misma ventana de título que la Metodología y los Resultados (caso y arco).
            if (ruta.sub === 'alimentacion' && root.KitVistaMetodologia?.cabeceraModulo) zona.append(root.KitVistaMetodologia.cabeceraModulo(zona.firstChild, { modulo: ruta.modulo.id, empresa: ruta.empresa.id, actual: 'Alimentación', titulo: ruta.modulo.nombre,
              afirmacion: 'Se alimenta por secciones, con evidencias por enlace y guardado automático.', texto: 'La empresa cierra cada sección. Los Resultados se recalculan cuando todas estén completas.' }));
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
