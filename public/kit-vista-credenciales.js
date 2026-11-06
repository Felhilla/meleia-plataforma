// E46 (6-nov): portada de Credenciales con el Look and Feel de Meleia (bocetos Home I y Correcciones Parte I de Felipe).
// Hero con el logo grande y cuatro botones (Servicios, Experiencia, Equipo, Aliados). Un solo semicírculo que arranca
// cerrado, cambia de tema con una recarga de arriba hacia abajo y abre fichas que flotan sobre el gráfico difuminado.
(function (root) {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const COLORES = ['#5E7A45', '#B78D36', '#3A4733', '#A8503A'];
  // Respaldo mínimo mientras cargan los íconos de img/iconos/ (o si no cargan).
  const RESPALDO = [['circle', { cx: 32, cy: 32, r: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 }], ['circle', { cx: 32, cy: 32, r: 6, fill: '#B78D36' }]];
  const nombreModulo = { actores: 'Módulo I', ddhh: 'Módulo II', materialidad: 'Módulo III', riesgos: 'Módulo IV' };
  const dos = i => String(i + 1).padStart(2, '0');
  const pausa = ms => new Promise(r => root.setTimeout ? root.setTimeout(r, ms) : r());
  const cacheIconos = new Map();

  function render(destino, cfg, App) {
    const el = App.el, doc = root.document;
    const svg = (tag, attrs = {}) => { const n = doc.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
    const sinMovimiento = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mono = (texto, clase = '') => el('p', texto, ('kit-mono ' + clase).trim());
    const lista = puntos => { const ul = el('ul'); (puntos || []).forEach(t => ul.append(el('li', t))); return ul; };

    // Ícono: lienzo SVG que se llena con img/iconos/<nombre>.svg (archivo propio del sitio, sin scripts).
    function icono(nombre, clase = 'kit-icono') {
      const s = svg('svg', { viewBox: '0 0 64 64', class: clase, 'aria-hidden': 'true', focusable: 'false' });
      RESPALDO.forEach(([t, a]) => s.append(svg(t, a)));
      if (nombre && root.fetch && root.DOMParser) {
        if (!cacheIconos.has(nombre)) cacheIconos.set(nombre, root.fetch('img/iconos/' + nombre + '.svg').then(r => r.ok ? r.text() : null).catch(() => null));
        cacheIconos.get(nombre).then(texto => {
          if (!texto) return;
          const fuente = new root.DOMParser().parseFromString(texto, 'image/svg+xml').documentElement;
          if (!fuente || fuente.nodeName !== 'svg' || fuente.querySelector('script,foreignObject')) return;
          s.setAttribute('viewBox', fuente.getAttribute('viewBox') || '0 0 64 64');
          s.replaceChildren(...[...fuente.childNodes].map(n => doc.importNode(n, true)));
        });
      }
      return s;
    }

    const servicios = cfg.servicios || [], experiencia = cfg.experiencia || [], personas = cfg.personas || [], aliados = cfg.aliados || [];
    const temasCfg = cfg.temas || {};
    const temas = [
      { id: 'servicios', items: servicios.map(v => ({ titulo: v.titulo, sub: 'Ver servicio', nodo: { icono: v.icono }, dato: v })), ficha: fichaServicio },
      { id: 'experiencia', items: experiencia.map(e => ({ titulo: e.sector, sub: servicios[e.servicio]?.titulo || e.tema, nodo: { logo: e.logo, sigla: e.sigla || e.sector }, dato: e })), ficha: fichaCaso },
      { id: 'equipo', items: personas.map(p => ({ titulo: p.nombre, sub: p.cargo, nodo: { tarjeta: 'foto', foto: p.foto, sigla: p.nombre }, dato: p })), ficha: fichaPersona },
      { id: 'aliados', items: aliados.map(a => ({ titulo: a.nombre || a.titulo, sub: a.nombre ? a.titulo : 'Ver aliado', nodo: { tarjeta: 'logo', logo: a.logo, icono: a.icono, texto: a.nombre || a.titulo }, dato: a })), ficha: fichaAliado }
    ].filter(t => t.items.length).map(t => ({ ...t, nombre: temasCfg[t.id]?.nombre || t.id, frase: temasCfg[t.id]?.frase || '', titular: temasCfg[t.id]?.titular || '' }));
    const partes = [];

    // 1. Hero: logo grande, título extendido, quiénes somos y los botones de los temas.
    const hero = el('section', null, 'kit-cred-seccion kit-banda kit-banda-oscura kit-cred-quienes');
    hero.append(el('h2', 'Quiénes somos', 'kit-mono kit-antetitulo'));
    const logo = el('img', null, 'kit-hero-logo'); logo.src = 'img/logo-meleia-grande-claro.png'; logo.alt = 'Meleia · Sostenibilidad, riesgo preventivo, debida diligencia'; logo.width = 1400; logo.height = 579; hero.append(logo);
    if (cfg.afirmacion) hero.append(el('p', cfg.afirmacion, 'kit-hero-afirmacion'));
    if (cfg.quienes) hero.append(el('p', cfg.quienes, 'kit-hero-quienes'));
    const botonera = el('nav', null, 'kit-temas'); botonera.setAttribute('aria-label', 'Explorar Meleia');
    hero.append(botonera); partes.push(hero);

    // 2. Escena común: arranca cerrada y solo se abre con los botones.
    const explorar = el('section', null, 'kit-cred-seccion kit-banda kit-cred-explorar'); explorar.id = 'kit-explorar'; explorar.hidden = true;
    const ante = el('h2', '', 'kit-mono kit-antetitulo'), titular = el('p', '', 'kit-titular');
    const escena = el('div', null, 'kit-serv-escena'), diagrama = el('div', null, 'kit-serv-diagrama'), capa = el('div', null, 'kit-ficha-capa');
    capa.hidden = true; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'false');
    escena.append(diagrama, capa); explorar.append(ante, titular, escena); partes.push(explorar);
    const botones = temas.map(t => {
      const b = el('button', t.nombre, 'kit-tema-boton'); b.type = 'button'; b.dataset.tema = t.id;
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-controls', 'kit-explorar');
      b.onclick = () => mostrarTema(t.id, true); botonera.append(b); return b;
    });

    const angosta = root.matchMedia?.('(max-width: 860px)');
    let actual = null, titulosActuales = [], nodosActuales = [], dibujo = null;
    const encuadre = () => dibujo?.setAttribute('viewBox', angosta?.matches ? '92 0 545 660' : '0 0 1000 660');
    angosta?.addEventListener?.('change', encuadre);

    async function mostrarTema(id, desplazar) {
      const tema = temas.find(t => t.id === id); if (!tema) return;
      cerrarFicha(false);
      botones.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tema === id)));
      const abriendo = explorar.hidden; explorar.hidden = false;
      if (actual === id) { if (desplazar) explorar.scrollIntoView?.({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' }); return; }
      actual = id;
      if (!abriendo && !sinMovimiento()) { diagrama.classList?.add('saliendo'); await pausa(220); }
      ante.textContent = tema.nombre; titular.textContent = tema.titular;
      dibujarTema(tema);
      diagrama.classList?.remove('saliendo');
      if (desplazar) explorar.scrollIntoView?.({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' });
    }

    // Semicírculo de n segmentos (3 o 4). Cada segmento, nodo y título abre la ficha del elemento.
    function dibujarTema(tema) {
      const C = [260, 330], R0 = 175, R1 = 285, RN = 290, n = tema.items.length, paso = 180 / n;
      const punto = (r, g) => [C[0] + r * Math.cos(g * Math.PI / 180), C[1] + r * Math.sin(g * Math.PI / 180)];
      dibujo = svg('svg', { class: 'kit-serv-svg', 'aria-hidden': 'true', focusable: 'false' }); encuadre();
      dibujo.append(svg('path', { d: `M${C[0]} ${C[1] - 318}a318 318 0 0 1 0 636`, class: 'kit-serv-marco' }));
      titulosActuales = []; nodosActuales = [];
      const titulos = el('div', null, 'kit-serv-titulos');
      tema.items.forEach((item, i) => {
        const a0 = -90 + i * paso + 1.2, a1 = -90 + (i + 1) * paso - 1.2, medio = -90 + (i + .5) * paso;
        const [x0, y0] = punto(R1, a0), [x1, y1] = punto(R1, a1), [x2, y2] = punto(R0, a1), [x3, y3] = punto(R0, a0);
        const g = svg('g', { class: 'kit-serv-seg', style: `--i:${i}` });
        g.append(svg('path', { d: `M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`, fill: COLORES[i % COLORES.length] }));
        // Sin tarjetas el número va dentro del segmento. Con tarjetas (fotos o logos) va como insignia en su esquina.
        if (!item.nodo.tarjeta) { const [nx, ny] = punto(222, medio - (n > 3 ? 11 : 15)), num = svg('text', { x: nx, y: ny, class: 'kit-serv-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); num.textContent = String(i + 1); g.append(num); }
        const [cx, cy] = punto(RN, medio); nodosActuales.push([cx, cy]);
        // E46 (boceto Aliados, 6-nov): en Equipo la foto y en Aliados el logo crecen y se integran al gráfico.
        const [ancho, alto] = item.nodo.tarjeta === 'foto' ? [150, 150] : item.nodo.tarjeta === 'logo' ? [184, 104] : [100, 100];
        g.append(svg('line', { x1: cx + ancho / 2, y1: cy, x2: 702, y2: cy, class: 'kit-serv-guia' }), svg('circle', { cx: 714, cy, r: 8, class: 'kit-serv-anillo' }));
        const nodo = svg('g', { class: 'kit-serv-nodo' + (item.nodo.tarjeta ? ' kit-serv-tarjeta' : ''), transform: `translate(${cx} ${cy})` });
        if (item.nodo.tarjeta) {
          const clip = 'kit-clip-' + tema.id + '-' + i, def = svg('clipPath', { id: clip }), forma = { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: 14 };
          def.append(svg('rect', forma)); nodo.append(def, svg('rect', { ...forma, class: 'kit-serv-tarjeta-fondo' }));
          if (item.nodo.foto || item.nodo.logo) {
            const m = item.nodo.foto ? 0 : 16;
            nodo.append(svg('image', { href: item.nodo.foto || item.nodo.logo, x: -ancho / 2 + m, y: -alto / 2 + m, width: ancho - 2 * m, height: alto - 2 * m, 'clip-path': `url(#${clip})`, preserveAspectRatio: item.nodo.foto ? 'xMidYMid slice' : 'xMidYMid meet' }));
          } else {
            // Sin logo confirmado: el ícono del aliado ocupa el lugar del logo (el nombre ya está a la derecha).
            if (item.nodo.icono) { const ic = icono(item.nodo.icono, 'kit-serv-nodo-icono'); Object.entries({ x: -32, y: -32, width: 64, height: 64 }).forEach(([k, v]) => ic.setAttribute(k, v)); nodo.append(ic); }
          }
          nodo.append(svg('rect', { ...forma, class: 'kit-serv-tarjeta-borde', stroke: COLORES[i % COLORES.length] }));
          const insignia = svg('g', { class: 'kit-serv-insignia', transform: `translate(${-ancho / 2} ${-alto / 2})` }), cifra = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 1 });
          cifra.textContent = String(i + 1); insignia.append(svg('circle', { r: 21, fill: COLORES[i % COLORES.length] }), cifra); nodo.append(insignia);
        } else {
          nodo.append(svg('circle', { r: 50, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: 44, class: 'kit-serv-nodo-aro', stroke: COLORES[i % COLORES.length] }));
          if (item.nodo.icono) { const ic = icono(item.nodo.icono, 'kit-serv-nodo-icono'); Object.entries({ x: -30, y: -30, width: 60, height: 60 }).forEach(([k, v]) => ic.setAttribute(k, v)); nodo.append(ic); }
          else if (item.nodo.logo) {
            const clip = 'kit-clip-' + tema.id + '-' + i, def = svg('clipPath', { id: clip }); def.append(svg('circle', { r: 41 })); nodo.append(def);
            nodo.append(svg('image', { href: item.nodo.logo, x: -41, y: -41, width: 82, height: 82, 'clip-path': `url(#${clip})`, preserveAspectRatio: 'xMidYMid meet' }));
          } else { const t = svg('text', { class: 'kit-serv-sigla', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); t.textContent = item.nodo.sigla; nodo.append(t); }
        }
        g.append(nodo); g.addEventListener?.('click', () => abrirFicha(tema, i)); dibujo.append(g);
        const b = el('button', null, 'kit-serv-titulo'); b.type = 'button'; if (b.style) { b.style.top = (cy / 660 * 100) + '%'; b.style.setProperty?.('--i', i); }
        b.append(el('span', dos(i), 'kit-mono'), el('span', item.titulo, 'kit-serv-titulo-texto'));
        if (item.sub) b.append(el('span', item.sub, 'kit-serv-ver'));
        b.setAttribute('aria-label', `${tema.nombre} ${i + 1}: ${item.titulo}. Abrir la ficha`); b.onclick = () => abrirFicha(tema, i);
        titulosActuales.push(b); titulos.append(b);
      });
      const centro = svg('g', { class: 'kit-serv-centro' });
      centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
      const t0 = svg('text', { x: C[0], y: C[1] - 52, 'text-anchor': 'middle', class: 'kit-serv-centro-ante' }); t0.textContent = 'MELEIA'; centro.append(t0);
      // La frase se parte en dos renglones: donde diga la configuración (salto de línea) o por la mitad de las palabras.
      const palabras = tema.frase.split(' '), corte = Math.ceil(palabras.length / 2);
      (tema.frase.includes('\n') ? tema.frase.split('\n').slice(0, 2) : [palabras.slice(0, corte).join(' '), palabras.slice(corte).join(' ')]).forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 38, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' }); t.textContent = linea; centro.append(t); });
      centro.append(svg('circle', { cx: C[0], cy: C[1] + 90, r: 6, class: 'kit-hero-punto' }));
      dibujo.append(centro);
      diagrama.replaceChildren(dibujo, el('p', tema.frase.replace('\n', ' '), 'solo-lectores'), titulos);
      diagrama.classList?.remove('recarga'); void diagrama.offsetWidth; diagrama.classList?.add('recarga');
    }

    // Fichas: flotan sobre el gráfico, que queda difuminado. Cierre con «Volver al gráfico» o Escape.
    let abierta = null;
    function cerrarFicha(enfocar = true) {
      if (capa.hidden) return;
      capa.hidden = true; capa.replaceChildren(); diagrama.classList?.remove('difuminado'); if (escena.style) escena.style.minHeight = '';
      if (enfocar && abierta != null) titulosActuales[abierta]?.focus?.(); abierta = null;
    }
    capa.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); cerrarFicha(); } };
    function abrirFicha(tema, i) {
      abierta = i;
      const tarjeta = el('article', null, 'kit-ficha-flotante kit-ficha-' + tema.id);
      const volver = el('button', 'Volver al gráfico', 'kit-serv-volver'); volver.type = 'button'; volver.onclick = () => cerrarFicha();
      tarjeta.append(volver, ...tema.ficha(tema.items[i].dato, i));
      capa.replaceChildren(tarjeta); capa.setAttribute('aria-label', tema.nombre + ': ' + tema.items[i].titulo);
      const [cx, cy] = nodosActuales[i] || [500, 330], [vx, vw] = angosta?.matches ? [92, 545] : [0, 1000];
      if (tarjeta.style) tarjeta.style.transformOrigin = `${(cx - vx) / vw * 100}% ${cy / 6.6}%`;
      diagrama.classList?.add('difuminado'); capa.hidden = false;
      if (escena.style && tarjeta.offsetHeight) escena.style.minHeight = Math.max(diagrama.offsetHeight || 0, tarjeta.offsetHeight + 48) + 'px';
      volver.focus?.({ preventScroll: true });
    }

    // Cabecera común de las fichas: círculo con ícono, foto o logo montado sobre la barra del título.
    function cabeza(item, i, antetitulo, titulo) {
      const c = el('header', null, 'kit-ficha-cabeza'), sello = el('div', null, 'kit-ficha-sello');
      if (sello.style) sello.style.setProperty?.('--sello', COLORES[i % COLORES.length]);
      if (item.icono) sello.append(icono(item.icono));
      else if (item.foto || item.logo) { const img = el('img'); img.src = item.foto || item.logo; img.alt = ''; sello.append(img); sello.classList?.add(item.foto ? 'con-foto' : 'con-logo'); }
      else sello.append(el('span', item.sigla || '', 'kit-logo-sigla'));
      const barra = el('div', null, 'kit-ficha-barra'); barra.append(mono(antetitulo), el('h3', titulo));
      c.append(sello, barra); return c;
    }
    const caja = (...hijos) => { const d = el('div', null, 'kit-ficha-descripcion'); d.append(...hijos); return d; };
    function celdaCaso(e) {
      const b = el('button', null, 'kit-logo-celda'); b.type = 'button';
      if (e.logo) { const img = el('img'); img.src = e.logo; img.alt = e.sector; b.append(img); } else b.append(el('span', e.sigla || e.sector, 'kit-logo-sigla'), el('span', e.sector, 'kit-mono'));
      b.setAttribute('aria-label', `Caso ${e.sector}. Abrir en Experiencia`);
      b.onclick = async () => { await mostrarTema('experiencia', false); abrirFicha(temas.find(x => x.id === 'experiencia'), experiencia.indexOf(e)); };
      return b;
    }
    function fichaServicio(v, i) {
      const casos = experiencia.filter(e => e.servicio === i), fila = el('div', null, 'kit-casos-logos');
      casos.forEach((e, k) => { if (k) fila.append(el('span', '/', 'kit-casos-barra')); fila.append(celdaCaso(e)); });
      return [cabeza({ icono: v.icono }, i, 'Servicio ' + dos(i), v.titulo), caja(el('p', v.descripcion || ''), lista(v.puntos)), mono('Casos', 'kit-ficha-sub'), casos.length ? fila : el('p', 'Casos por confirmar.', 'nota')];
    }
    function fichaCaso(e, i) {
      const servicio = servicios[e.servicio], cuerpo = el('div', null, 'kit-caso-cuerpo'), logoCaso = el('div', null, 'kit-caso-logo');
      if (e.logo) { const img = el('img'); img.src = e.logo; img.alt = e.sector; logoCaso.append(img); } else logoCaso.append(el('span', e.sigla || e.sector, 'kit-logo-sigla'), el('span', e.sector, 'kit-mono'));
      const entregables = el('ol', null, 'kit-caso-entregables');
      (e.entregables || []).forEach((t, k) => {
        const li = el('li'); li.append(el('span', t.texto, 'kit-caso-hito-texto'));
        if (t.modulo) { const a = el('a', '# ' + (nombreModulo[t.modulo] || 'Kit'), 'kit-caso-enlace'); a.href = '#/' + t.modulo; a.setAttribute('aria-label', `${t.texto}: ver en el ${nombreModulo[t.modulo]}`); li.append(a); }
        else li.append(el('span', '# ' + dos(k), 'kit-caso-enlace sin-enlace'));
        entregables.append(li);
      });
      cuerpo.append(mono(e.sector + ' · ' + e.tema), el('h3', servicio?.titulo || e.tema), caja(el('p', e.que_se_hizo || e.descripcion)), mono('Entregables', 'kit-ficha-sub'), entregables);
      const g = el('div', null, 'kit-caso-rejilla'); if (g.style) g.style.setProperty?.('--caso-color', e.color || COLORES[i % COLORES.length]);
      g.append(logoCaso, cuerpo); return [g];
    }
    function fichaPersona(p, i) { return [cabeza({ foto: p.foto, sigla: p.nombre }, i, p.cargo || 'Equipo', p.nombre), caja(el('p', p.experiencia || ''))]; }
    // Ficha del aliado (boceto, 6-nov): Logo | nombre, descripción y datos resaltados con #; cada dato lleva a Experiencia.
    function fichaAliado(a, i) {
      const logoA = el('div', null, 'kit-caso-logo');
      if (a.logo) { const img = el('img'); img.src = a.logo; img.alt = a.nombre || a.titulo; logoA.append(img); }
      else { const sello = el('div', null, 'kit-aliado-sello'); sello.append(icono(a.icono)); logoA.append(sello, el('span', 'Logo por confirmar', 'kit-mono')); }
      const cuerpo = el('div', null, 'kit-caso-cuerpo'), barra = el('div', null, 'kit-ficha-barra kit-aliado-barra');
      barra.append(mono('Aliado ' + dos(i)), el('h3', a.nombre || a.titulo));
      cuerpo.append(barra, caja(el('p', a.descripcion || '')));
      const casos = (a.casos || []).map(id => experiencia.find(e => e.id === id)).filter(Boolean);
      if ((a.datos || []).length) {
        const fila = el('ul', null, 'kit-datos');
        a.datos.forEach(d => { const li = el('li'); li.append(el('span', '# ' + d.cifra, 'kit-dato-cifra'), el('span', d.texto, 'kit-dato-texto')); fila.append(li); });
        cuerpo.append(mono('Datos', 'kit-ficha-sub'), fila);
      }
      cuerpo.append(mono('En nuestra experiencia', 'kit-ficha-sub'));
      if (casos.length) { const fila = el('div', null, 'kit-casos-logos'); casos.forEach(e => fila.append(celdaCaso(e))); cuerpo.append(fila); }
      else cuerpo.append(el('p', 'Casos compartidos por confirmar.', 'nota'));
      const g = el('div', null, 'kit-caso-rejilla'); if (g.style) g.style.setProperty?.('--caso-color', COLORES[i % COLORES.length]);
      g.append(logoA, cuerpo); return [g];
    }

    // 3. Contacto.
    if (cfg.contacto?.correo) {
      const s = el('section', null, 'kit-cred-seccion kit-banda kit-banda-oscura kit-cred-contacto'), p = el('p', null, 'kit-contacto-linea'), a = el('a', cfg.contacto.correo);
      a.href = 'mailto:' + cfg.contacto.correo; s.append(el('h2', 'Contacto', 'kit-mono kit-antetitulo'), el('p', 'Hablemos.', 'kit-titular')); p.append(el('span', 'Escríbenos a '), a); s.append(p);
      if (cfg.contacto.telefono) s.append(el('p', 'Teléfono: ' + cfg.contacto.telefono)); partes.push(s);
    }
    destino.replaceChildren(...partes);
    return { mostrarTema, abrirFicha: (id, i) => abrirFicha(temas.find(t => t.id === id), i), cerrarFicha };
  }
  const KitCredenciales = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = KitCredenciales;
  root.KitCredenciales = KitCredenciales;
})(typeof window !== 'undefined' ? window : globalThis);
