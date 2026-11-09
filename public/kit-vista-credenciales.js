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
    const temasCfg = { ...(cfg.temas || {}) }, met = cfg.metodologias;
    if (met?.tema) temasCfg.metodologias = met.tema;
    const estandaresDe = c => c.estandares || (c.grupos || []).flatMap(g => g.estandares);
    // E50 (boceto Experiencia, 7-nov): Experiencia se organiza por sector. Los casos con ficha completa y los demás
    // clientes (solo nombre, logo y descripción) se agrupan por sector, en el orden en que aparecen.
    const clientes = [...experiencia.map(e => ({ ...e, caso: true })), ...(cfg.clientes || []).map(c => ({ ...c, caso: c.caso === true }))];
    const sectores = [];
    clientes.forEach(c => {
      let s = sectores.find(x => x.sector === c.sector);
      if (!s) { s = { sector: c.sector, icono: c.icono_sector || null, clientes: [] }; sectores.push(s); }
      if (!s.icono && c.icono_sector) s.icono = c.icono_sector;
      s.clientes.push(c);
    });
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    const temas = [
      { id: 'servicios', items: servicios.map(v => ({ titulo: v.titulo, sub: 'Ver servicio', nodo: { icono: v.icono }, dato: v })), ficha: fichaServicio },
      // E64 (9-nov, Felipe): Metodologías, los estándares con los que trabajamos, por categoría.
      { id: 'metodologias', items: (met?.categorias || []).map(c => ({ titulo: c.nombre, sub: plural(estandaresDe(c).length, 'estándar', 'estándares'), nodo: { icono: c.icono }, dato: c })), ficha: fichaCategoria, centro: fichaTodasMetodologias,
        cifras: () => { const n = (met?.categorias || []).flatMap(estandaresDe).length, enf = (met?.categorias || []).length;
          return { lineas: ['# ' + plural(n, 'metodología', 'metodologías'), '# ' + plural(enf, 'enfoque', 'enfoques')], titulo: 'Metodologías por enfoque', ver: 'Ver todas las metodologías por enfoque' }; } },
      { id: 'experiencia', items: sectores.map(x => ({ titulo: x.sector, sub: plural(x.clientes.length, 'cliente', 'clientes'), nodo: { icono: x.icono, sigla: x.clientes[0]?.sigla || '' }, dato: x })), ficha: fichaSector, centro: fichaClientes,
        cifras: () => ({ lineas: ['# ' + plural(clientes.length, 'cliente', 'clientes'), '# ' + plural(sectores.length, 'sector', 'sectores')], titulo: 'Clientes por sector', ver: 'Ver todos los clientes por sector' }) },
      { id: 'equipo', items: personas.map(p => ({ titulo: p.nombre, sub: p.cargo, nodo: { tarjeta: 'foto', foto: p.foto, sigla: p.nombre }, dato: p })), ficha: fichaPersona },
      { id: 'aliados', items: aliados.map(a => ({ titulo: a.nombre || a.titulo, sub: a.nombre ? a.titulo : 'Ver aliado', nodo: { tarjeta: 'logo', logo: a.logo, fondo: a.logo_fondo, icono: a.icono, texto: a.nombre || a.titulo }, dato: a })), ficha: fichaAliado }
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
      const titulos = el('div', null, 'kit-serv-titulos' + (n > 5 ? ' compacto' : ''));
      tema.items.forEach((item, i) => {
        const a0 = -90 + i * paso + 1.2, a1 = -90 + (i + 1) * paso - 1.2, medio = -90 + (i + .5) * paso;
        const [x0, y0] = punto(R1, a0), [x1, y1] = punto(R1, a1), [x2, y2] = punto(R0, a1), [x3, y3] = punto(R0, a0);
        const g = svg('g', { class: 'kit-serv-seg', style: `--i:${i}` });
        g.append(svg('path', { d: `M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`, fill: COLORES[i % COLORES.length] }));
        // Sin tarjetas el número va dentro del segmento. Con tarjetas (fotos o logos) va como insignia en su esquina.
        // 9-nov (Felipe): sin numeración en los segmentos ni en las tarjetas; el ícono o el logo ocupa todo el espacio posible.
        const [cx, cy] = punto(RN, medio); nodosActuales.push([cx, cy]);
        // E46 (boceto Aliados, 6-nov): en Equipo la foto y en Aliados el logo crecen y se integran al gráfico.
        const rN = Math.min(n > 5 ? 60 : n > 3 ? 70 : 76, Math.floor(RN * Math.sin(paso * Math.PI / 360)) - 3); // sin montarse aunque haya muchos
        const [ancho, alto] = item.nodo.tarjeta === 'foto' ? (n > 3 ? [132, 132] : [150, 150]) : item.nodo.tarjeta === 'logo' ? [184, 104] : [2 * rN, 2 * rN];
        // 9-nov (Felipe): las guías son siempre rectas (horizontales); con muchos elementos el título se compacta (ver CSS).
        const yT = cy;
        g.append(svg('line', { x1: cx + ancho / 2, y1: cy, x2: 702, y2: yT, class: 'kit-serv-guia' }), svg('circle', { cx: 714, cy: yT, r: 8, class: 'kit-serv-anillo' }));
        // 8-nov (correcciones de Felipe): en Experiencia el nodo es un círculo blanco con el ícono del sector, nunca el logo.
        const nodo = svg('g', { class: 'kit-serv-nodo' + (item.nodo.tarjeta ? ' kit-serv-tarjeta' : '') + (tema.id === 'experiencia' ? ' kit-serv-nodo-blanco' : ''), transform: `translate(${cx} ${cy})` });
        if (item.nodo.tarjeta) {
          const clip = 'kit-clip-' + tema.id + '-' + i, def = svg('clipPath', { id: clip }), forma = { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: 14 };
          def.append(svg('rect', forma)); nodo.append(def, svg('rect', { ...forma, class: 'kit-serv-tarjeta-fondo' + (item.nodo.fondo === 'oscuro' ? ' oscuro' : item.nodo.logo ? ' blanco' : '') }));
          if (item.nodo.foto || item.nodo.logo) {
            const m = item.nodo.foto ? 0 : 16;
            nodo.append(svg('image', { href: item.nodo.foto || item.nodo.logo, x: -ancho / 2 + m, y: -alto / 2 + m, width: ancho - 2 * m, height: alto - 2 * m, 'clip-path': `url(#${clip})`, preserveAspectRatio: item.nodo.foto ? 'xMidYMid slice' : 'xMidYMid meet' }));
          } else {
            // Sin logo confirmado: el ícono del aliado ocupa el lugar del logo (el nombre ya está a la derecha).
            if (item.nodo.icono) { const ic = icono(item.nodo.icono, 'kit-serv-nodo-icono'); Object.entries({ x: -32, y: -32, width: 64, height: 64 }).forEach(([k, v]) => ic.setAttribute(k, v)); nodo.append(ic); }
          }
          nodo.append(svg('rect', { ...forma, class: 'kit-serv-tarjeta-borde', stroke: COLORES[i % COLORES.length] }));
        } else {
          const rA = rN - 6, rI = Math.round(rN * .66);
          nodo.append(svg('circle', { r: rN, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: rA, class: 'kit-serv-nodo-aro', stroke: COLORES[i % COLORES.length] }));
          if (item.nodo.icono) { const ic = icono(item.nodo.icono, 'kit-serv-nodo-icono'); Object.entries({ x: -rI, y: -rI, width: 2 * rI, height: 2 * rI }).forEach(([k, v]) => ic.setAttribute(k, v)); nodo.append(ic); }
          else if (item.nodo.logo) {
            const rL = rA - 3, clip = 'kit-clip-' + tema.id + '-' + i, def = svg('clipPath', { id: clip }); def.append(svg('circle', { r: rL })); nodo.append(def);
            nodo.append(svg('image', { href: item.nodo.logo, x: -rL, y: -rL, width: 2 * rL, height: 2 * rL, 'clip-path': `url(#${clip})`, preserveAspectRatio: 'xMidYMid meet' }));
          } else { const t = svg('text', { class: 'kit-serv-sigla', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); t.textContent = item.nodo.sigla; nodo.append(t); }
        }
        g.append(nodo); g.addEventListener?.('click', () => abrirFicha(tema, i)); dibujo.append(g);
        const b = el('button', null, 'kit-serv-titulo'); b.type = 'button'; if (b.style) { b.style.top = (yT / 660 * 100) + '%'; b.style.setProperty?.('--i', i); }
        b.append(el('span', dos(i), 'kit-mono'), el('span', item.titulo, 'kit-serv-titulo-texto'));
        if (item.sub) b.append(el('span', item.sub, 'kit-serv-ver'));
        b.setAttribute('aria-label', `${tema.nombre} ${i + 1}: ${item.titulo}. Abrir la ficha`); b.onclick = () => abrirFicha(tema, i);
        titulosActuales.push(b); titulos.append(b);
        // 8-nov: cada aliado lleva también a su página, al lado de su título.
        if (tema.id === 'aliados' && item.dato?.sitio) {
          const w = el('a', 'Visitar su sitio ↗', 'kit-serv-sitio'); w.href = item.dato.sitio; w.target = '_blank'; w.rel = 'noopener noreferrer';
          w.setAttribute('aria-label', `Visitar el sitio de ${item.titulo} (se abre en otra pestaña)`);
          if (w.style) { w.style.top = (cy / 660 * 100) + '%'; w.style.setProperty?.('--i', i); }
          titulos.append(w);
        }
      });
      const centro = svg('g', { class: 'kit-serv-centro' });
      centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
      // 9-nov (Felipe): el centro lleva el logo de Meleia en lugar del texto.
      const t0 = svg('image', { href: 'img/logo-meleia-grande-claro.png', x: C[0] - 78, y: C[1] - 112, width: 156, height: 64, class: 'kit-serv-centro-logo', role: 'img', 'aria-label': 'Meleia' }); centro.append(t0);
      let lineas, extra = [];
      if (tema.centro) {
        // Experiencia: las cifras van en el centro, grandes, y el centro abre el listado de clientes.
        // E64: también Metodologías (# metodologías, # sectores).
        const cif = tema.cifras(); lineas = cif.lineas;
        centro.classList?.add('kit-serv-centro-activo');
        const b = el('button', null, 'kit-serv-centro-boton'); b.type = 'button';
        b.setAttribute('aria-label', `${lineas.join(', ').replace(/# /g, '')}. ${cif.ver}`);
        b.onclick = () => abrir({ titulo: cif.titulo, origen: b, nodos: () => tema.centro(), desde: null });
        centro.addEventListener?.('click', () => b.onclick()); extra = [b];
      } else {
        // La frase se parte en dos renglones: donde diga la configuración (salto de línea) o por la mitad de las palabras.
        const palabras = tema.frase.split(' '), corte = Math.ceil(palabras.length / 2);
        lineas = tema.frase.includes('\n') ? tema.frase.split('\n').slice(0, 2) : [palabras.slice(0, corte).join(' '), palabras.slice(corte).join(' ')];
      }
      lineas.forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 38, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' + (tema.centro ? ' kit-serv-centro-cifra' : '') }); t.textContent = linea; centro.append(t); });
      centro.append(svg('circle', { cx: C[0], cy: C[1] + 90, r: 6, class: 'kit-hero-punto' }));
      if (tema.centro) { const v = svg('text', { x: C[0], y: C[1] + 124, 'text-anchor': 'middle', class: 'kit-serv-centro-ver' }); v.textContent = 'Ver todos'; centro.append(v); }
      dibujo.append(centro);
      // E64: las cifras del centro nunca se salen del círculo. Si un renglón es más ancho que la cuerda del círculo a su
      // altura (con margen), se reduce su letra hasta que quepa.
      // Todos los renglones toman el mismo tamaño (el del que más necesita reducirse).
      const ajustar = () => { const ts = [...(centro.querySelectorAll?.('.kit-serv-centro-frase') || [])].filter(t => t.getComputedTextLength); if (!ts.length) return;
        ts.forEach(t => { t.style.fontSize = ''; });
        const f = Math.min(1, ...ts.map(t => { const dy = Number(t.getAttribute('y')) - C[1] - 10, cuerda = 2 * Math.sqrt(Math.max(0, 158 * 158 - dy * dy)) * .86; return cuerda / (t.getComputedTextLength() || 1); }));
        if (f < 1) ts.forEach(t => { t.style.fontSize = (parseFloat(root.getComputedStyle(t).fontSize) * f).toFixed(1) + 'px'; }); };
      root.requestAnimationFrame?.(() => root.requestAnimationFrame(ajustar)); root.document.fonts?.ready?.then(ajustar);
      diagrama.replaceChildren(dibujo, el('p', tema.centro ? lineas.join(', ') : tema.frase.replace('\n', ' '), 'solo-lectores'), titulos, ...extra);
      diagrama.classList?.remove('recarga'); void diagrama.offsetWidth; diagrama.classList?.add('recarga');
    }

    // Fichas (Lógica Muñeca Rusa, 7-nov): flotan sobre el gráfico difuminado y pueden abrir otra ficha encima.
    // Cada ficha lleva una X que regresa un nivel, en el mismo orden en que se abrieron. Escape hace lo mismo.
    const pila = [];
    function pintarCima() {
      const f = pila[pila.length - 1];
      const tarjeta = el('article', null, 'kit-ficha-flotante ' + (f.clase || ''));
      const previa = pila[pila.length - 2];
      const x = el('button', null, 'kit-serv-volver kit-ficha-x'); x.type = 'button'; x.append(el('span', '×', 'kit-ficha-x-signo'));
      x.setAttribute('aria-label', previa ? 'Regresar a ' + previa.titulo : 'Cerrar y volver al gráfico'); x.onclick = () => regresar();
      tarjeta.append(x);
      if (pila.length > 1) {
        const ruta = el('p', null, 'kit-mono kit-ficha-ruta'); ruta.setAttribute('aria-label', 'Ruta');
        pila.forEach((p, k) => { if (k) ruta.append(el('span', '/', 'kit-ficha-ruta-barra')); ruta.append(el('span', p.titulo)); });
        tarjeta.append(ruta);
      }
      tarjeta.append(...f.nodos());
      capa.replaceChildren(tarjeta); capa.setAttribute('aria-label', f.titulo);
      if (tarjeta.style && f.desde) { const [cx, cy] = f.desde, [vx, vw] = angosta?.matches ? [92, 545] : [0, 1000]; tarjeta.style.transformOrigin = `${(cx - vx) / vw * 100}% ${cy / 6.6}%`; }
      diagrama.classList?.add('difuminado'); capa.hidden = false;
      if (escena.style && tarjeta.offsetHeight) escena.style.minHeight = Math.max(diagrama.offsetHeight || 0, tarjeta.offsetHeight + 48) + 'px';
      x.focus?.({ preventScroll: true });
      if (pila.length > 1 && escena.getBoundingClientRect && escena.getBoundingClientRect().top < 0) escena.scrollIntoView?.({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' });
    }
    function abrir(f) { pila.push(f); pintarCima(); }
    function regresar() {
      const f = pila.pop(); if (!f) return;
      if (pila.length) { pintarCima(); return; }
      capa.hidden = true; capa.replaceChildren(); diagrama.classList?.remove('difuminado'); if (escena.style) escena.style.minHeight = '';
      f.origen?.focus?.();
    }
    function cerrarFicha(enfocar = true) {
      if (capa.hidden) return;
      const base = pila[0]; pila.length = 0;
      capa.hidden = true; capa.replaceChildren(); diagrama.classList?.remove('difuminado'); if (escena.style) escena.style.minHeight = '';
      if (enfocar) base?.origen?.focus?.();
    }
    capa.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); regresar(); } };
    function abrirFicha(tema, i) {
      pila.length = 0;
      abrir({ titulo: tema.items[i].titulo, clase: 'kit-ficha-' + tema.id, origen: titulosActuales[i], desde: nodosActuales[i], nodos: () => tema.ficha(tema.items[i].dato, i) });
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
    const nombreCliente = e => e.nombre || ('Empresa del sector ' + String(e.sector || '').replace(/^Sector /, '').toLowerCase());
    function celdaCaso(e, conNombre = false) {
      const b = el('button', null, 'kit-logo-celda' + (conNombre ? ' con-nombre' : '')); b.type = 'button';
      // 9-nov (Felipe): recuadro blanco cuadrado con el logo grande, nombre debajo y pastilla (referencia de directorio).
      const caja = el('span', null, 'kit-logo-caja');
      if (e.logo) { const img = el('img'); img.src = e.logo; img.alt = ''; caja.append(img); } else caja.append(el('span', e.sigla || e.sector, 'kit-logo-sigla'));
      if (e.caso) caja.append(el('span', null, 'kit-logo-punto'));
      b.append(caja, el('span', e.nombre || e.sector, 'kit-logo-nombre'));
      if (e.caso) b.append(el('span', 'Caso', 'kit-logo-pastilla'));
      b.setAttribute('aria-label', `${nombreCliente(e)}. Abrir la ficha del cliente`);
      b.onclick = () => abrir({ titulo: e.nombre || e.sigla || e.sector, clase: 'kit-ficha-experiencia', origen: b, nodos: () => fichaCaso(e, clientes.indexOf(e)) });
      return b;
    }
    // Ficha del sector (boceto): ícono y sector, qué hemos hecho en él, los clientes y la cifra que abre el listado.
    function fichaSector(x, i) {
      const hecho = el('ul', null, 'kit-sector-hecho'), vistos = new Set();
      x.clientes.filter(c => c.caso).forEach(c => {
        const linea = (servicios[c.servicio]?.titulo || '') + (c.tema ? ': ' + c.tema : '');
        if (linea && !vistos.has(linea)) { vistos.add(linea); hecho.append(el('li', linea)); }
      });
      const fila = el('div', null, 'kit-casos-logos kit-sector-clientes');
      x.clientes.forEach(c => fila.append(celdaCaso(c)));
      const cifra = el('button', null, 'kit-logo-celda kit-sector-cifra'); cifra.type = 'button';
      cifra.append(el('span', '# ' + x.clientes.length, 'kit-dato-cifra'), el('span', x.clientes.length === 1 ? 'cliente en el sector' : 'clientes en el sector', 'kit-mono'));
      cifra.setAttribute('aria-label', `${plural(x.clientes.length, 'cliente', 'clientes')} en ${x.sector}. Ver el listado`);
      cifra.onclick = () => abrir({ titulo: 'Clientes del sector', origen: cifra, nodos: () => fichaClientes(x) });
      fila.append(cifra);
      return [cabeza({ icono: x.icono, sigla: x.clientes[0]?.sigla }, i, 'Sector ' + dos(i), x.sector),
        mono('¿Qué hemos hecho en este sector?', 'kit-ficha-sub'), caja(vistos.size ? hecho : el('p', 'Por confirmar.')),
        mono('Clientes', 'kit-ficha-sub'), fila, ...metodologiasSector(x)];
    }
    // 9-nov (Felipe): cada sector se relaciona con sus estándares sectoriales (Metodologías). Si no hay uno específico,
    // el botón lleva directamente a las metodologías con las que trabajamos.
    function metodologiasSector(x) {
      const grupos = (met?.categorias || []).flatMap(c => c.grupos || []).filter(g => (g.sectores || []).includes(x.sector));
      const salida = [mono('Metodologías del sector', 'kit-ficha-sub')];
      if (grupos.length) {
        const fila = el('div', null, 'kit-sector-metodologias');
        grupos.forEach(g => g.estandares.forEach(e => {
          const b = el('button', null, 'kit-est-tarjeta kit-sector-estandar'); b.type = 'button';
          b.append(el('span', e.sigla || e.nombre, 'kit-est-tarjeta-sigla'), el('span', g.nombre, 'kit-est-tarjeta-tipo'));
          b.setAttribute('aria-label', `${e.sigla}: ${e.nombre}. Abrir la ficha`);
          b.onclick = () => abrir({ titulo: e.sigla || e.nombre, clase: 'kit-ficha-metodologias', origen: b, nodos: () => fichaEstandar(e, 0) });
          fila.append(b);
        }));
        salida.push(fila);
      } else salida.push(el('p', 'No hay un estándar específico para este sector: aplican las metodologías generales.', 'nota'));
      const todas = el('button', grupos.length ? 'Ver todas las metodologías →' : 'Ir a las metodologías →', 'kit-sector-ir-met'); todas.type = 'button';
      todas.onclick = () => abrir({ titulo: 'Metodologías por enfoque', origen: todas, nodos: () => fichaTodasMetodologias() });
      salida.push(todas);
      return salida;
    }
    // Listado de clientes: todos por sector (desde el centro) o solo los de un sector (desde su ficha).
    function fichaClientes(solo) {
      const grupos = solo ? [solo] : sectores, cuerpo = el('div', null, 'kit-clientes-listado');
      const cab = el('ul', null, 'kit-datos kit-clientes-cifras');
      [[solo ? solo.clientes.length : clientes.length, 'clientes'], ...(solo ? [] : [[sectores.length, 'sectores']])]
        .forEach(([n, t]) => { const li = el('li'); li.append(el('span', '# ' + n, 'kit-dato-cifra'), el('span', t, 'kit-dato-texto')); cab.append(li); });
      cuerpo.append(mono(solo ? solo.sector : 'Experiencia', 'kit-ficha-sub'), el('h3', solo ? 'Clientes del sector' : 'Clientes por sector', 'kit-clientes-titulo'), cab);
      grupos.forEach(x => {
        const g = el('section', null, 'kit-clientes-grupo'), fila = el('div', null, 'kit-casos-logos');
        x.clientes.forEach(c => fila.append(celdaCaso(c, true)));
        if (!solo) g.append(mono(x.sector, 'kit-ficha-sub'));
        g.append(fila); cuerpo.append(g);
      });
      return [cuerpo];
    }
    function fichaServicio(v, i) {
      const casos = clientes.filter(e => e.caso && e.servicio === i), fila = el('div', null, 'kit-casos-logos');
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
      cuerpo.append(mono(e.sector), el('h3', nombreCliente(e)), el('p', e.descripcion || '', 'kit-caso-descripcion'));
      // Proyectos hechos a través de otra organización (por ejemplo, la Universidad EAN): «Desarrollado con» y su logo.
      if (e.desarrollado_con?.nombre) {
        const dc = el('div', null, 'kit-caso-con'); dc.append(mono('Desarrollado con'));
        if (e.desarrollado_con.logo) { const img = el('img'); img.src = e.desarrollado_con.logo; img.alt = e.desarrollado_con.nombre; dc.append(img); }
        else dc.append(el('strong', e.desarrollado_con.nombre));
        cuerpo.append(dc);
      }
      if (e.caso) {
        const recuadro = el('div', null, 'kit-ficha-descripcion kit-caso-recuadro');
        recuadro.append(mono('¿Qué hicimos y qué entregamos?', 'kit-ficha-sub'));
        if (servicio?.titulo || e.tema) recuadro.append(el('p', [servicio?.titulo, e.tema].filter(Boolean).join(': '), 'kit-caso-servicio'));
        if (e.alcance) recuadro.append(el('p', 'Alcance: ' + e.alcance + '.'));
        recuadro.append(entregables); cuerpo.append(recuadro);
      }
      const g = el('div', null, 'kit-caso-rejilla'); if (g.style) g.style.setProperty?.('--caso-color', e.color || COLORES[i % COLORES.length]);
      g.append(logoCaso, cuerpo); return [g];
    }
    // E64: ficha de una categoría de Metodologías (Muñeca Rusa): cada estándar abre su propia ficha.
    function fichaCategoria(c, i) {
      const bloques = c.grupos ? c.grupos : [{ estandares: c.estandares || [] }], salida = [cabeza({ icono: c.icono }, i, 'Enfoque ' + dos(i), c.nombre), caja(el('p', c.descripcion || ''))];
      // 9-nov (Felipe): mismo modelo que la ventana Estándares de la Metodología: portadas en carrusel con flechas.
      bloques.forEach((g, k) => {
        if (g.nombre) salida.push(mono(g.nombre, 'kit-ficha-sub'));
        const pista = el('ul', null, 'kit-est-pista');
        g.estandares.forEach((e, j) => {
          const port = el('span', null, 'kit-est-portada kit-est-portada-tipo'); port.setAttribute('aria-hidden', 'true');
          port.style?.setProperty?.('--color', e.color || COLORES[(j + k) % COLORES.length]);
          port.append(el('span', e.sigla || e.nombre, 'kit-est-portada-sigla'), el('span', e.emisor || '', 'kit-est-portada-emisor'));
          const b = el('button', null, 'kit-est-tarjeta'); b.type = 'button';
          b.append(port, el('span', e.sigla || e.nombre, 'kit-est-tarjeta-sigla'), el('span', e.tipo || '', 'kit-est-tarjeta-tipo'));
          b.setAttribute('aria-label', `${e.sigla}: ${e.nombre}. Abrir la ficha`);
          b.onclick = () => abrir({ titulo: e.sigla || e.nombre, clase: 'kit-ficha-metodologias', origen: b, nodos: () => fichaEstandar(e, i) });
          const li = el('li'); li.style?.setProperty?.('--i', j); li.append(b); pista.append(li);
        });
        const mover = d => () => pista.scrollBy?.({ left: d * (pista.clientWidth || 600) * .8, behavior: sinMovimiento() ? 'auto' : 'smooth' });
        const flecha = (t, r, d) => { const f = el('button', null, 'kit-est-flecha'); f.type = 'button'; f.append(el('span', t)); f.setAttribute('aria-label', r); f.onclick = mover(d); return f; };
        const carrusel = el('div', null, 'kit-est-carrusel kit-met-carrusel');
        carrusel.append(flecha('←', 'Ver los estándares anteriores', -1), pista, flecha('→', 'Ver más estándares', 1));
        salida.push(carrusel);
      });
      salida.push(el('p', `${plural(estandaresDe(c).length, 'estándar', 'estándares')}. Toque una portada para ver su ficha.`, 'nota kit-met-carrusel-nota'));
      return salida;
    }
    // E64: desde el centro, todas las metodologías por categoría (cada una abre su ficha).
    function fichaTodasMetodologias() {
      const cuerpo = el('div', null, 'kit-clientes-listado'), cats = met?.categorias || [];
      const cab = el('ul', null, 'kit-datos kit-clientes-cifras');
      [[cats.flatMap(estandaresDe).length, 'metodologías'], [cats.length, 'enfoques']]
        .forEach(([n, t]) => { const li = el('li'); li.append(el('span', '# ' + n, 'kit-dato-cifra'), el('span', t, 'kit-dato-texto')); cab.append(li); });
      cuerpo.append(mono('Metodologías', 'kit-ficha-sub'), el('h3', 'Metodologías por enfoque', 'kit-clientes-titulo'), cab);
      cats.forEach((c, i) => { const g = el('section', null, 'kit-clientes-grupo'); g.append(...fichaCategoria(c, i).slice(2)); g.prepend(mono(c.nombre, 'kit-ficha-sub')); cuerpo.append(g); });
      return [cuerpo];
    }
    function fichaEstandar(e, i) {
      const cuerpo = [cabeza({ sigla: e.sigla }, i, e.tipo || 'Estándar', e.nombre), caja(el('p', e.que_es || ''))];
      const datos = el('ul', null, 'kit-datos');
      [[e.emisor, 'emitido por'], [e.anio, 'año de la versión']].filter(([v]) => v).forEach(([v, t]) => { const li = el('li'); li.append(el('span', v, 'kit-dato-cifra kit-met-estandar-dato'), el('span', t, 'kit-dato-texto')); datos.append(li); });
      if (datos.children?.length) cuerpo.push(datos);
      if (e.usados) cuerpo.push(mono('Qué usamos', 'kit-ficha-sub'), el('p', e.usados));
      if ((e.modulos || []).length) {
        cuerpo.push(mono('En el Kit', 'kit-ficha-sub'));
        const ul = el('ul', null, 'kit-caso-entregables');
        e.modulos.forEach(m => { const li = el('li'); li.append(el('span', m.por_que || '', 'kit-caso-hito-texto')); const a = el('a', '# ' + (nombreModulo[m.modulo] || 'Kit'), 'kit-caso-enlace'); a.href = '#/' + m.modulo; li.append(a); ul.append(li); });
        cuerpo.push(ul);
      }
      if (e.enlace) { const w = el('a', (e.enlace_texto || 'Ir a la fuente') + ' ↗', 'kit-aliado-sitio'); w.href = e.enlace; w.target = '_blank'; w.rel = 'noopener noreferrer'; cuerpo.push(w); }
      return cuerpo;
    }
    function fichaPersona(p, i) { return [cabeza({ foto: p.foto, sigla: p.nombre }, i, p.cargo || 'Equipo', p.nombre), caja(el('p', p.experiencia || ''))]; }
    // Ficha del aliado (boceto, 6-nov): Logo | nombre, descripción y datos resaltados con #; cada dato lleva a Experiencia.
    function fichaAliado(a, i) {
      const logoA = el('div', null, 'kit-caso-logo');
      if (a.logo) { const img = el('img'); img.src = a.logo; img.alt = a.nombre || a.titulo; if (a.logo_fondo === 'oscuro') img.className = 'kit-logo-fondo-oscuro'; logoA.append(img); }
      else { const sello = el('div', null, 'kit-aliado-sello'); sello.append(icono(a.icono)); logoA.append(sello, el('span', 'Logo por confirmar', 'kit-mono')); }
      const cuerpo = el('div', null, 'kit-caso-cuerpo'), barra = el('div', null, 'kit-ficha-barra kit-aliado-barra');
      barra.append(mono('Aliado ' + dos(i)), el('h3', a.nombre || a.titulo));
      cuerpo.append(barra, caja(el('p', a.descripcion || '')));
      if (a.sitio) { const w = el('a', 'Visitar su sitio ↗', 'kit-aliado-sitio'); w.href = a.sitio; w.target = '_blank'; w.rel = 'noopener noreferrer'; cuerpo.append(w); }
      const casos = (a.casos || []).map(id => clientes.find(e => e.id === id)).filter(Boolean);
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
      a.href = 'mailto:' + cfg.contacto.correo; s.append(el('h2', 'Contacto', 'kit-mono kit-antetitulo'), el('p', 'Hablemos.', 'kit-titular'));
      const rejilla = el('div', null, 'kit-contacto-rejilla'), lado = el('div', null, 'kit-contacto-lado');
      lado.append(el('p', cfg.contacto.invitacion || 'Déjanos tus datos y te contactamos para agendar una reunión.', 'kit-contacto-invitacion'));
      p.append(el('span', 'O escríbenos a '), a); lado.append(p);
      if (cfg.contacto.telefono) lado.append(el('p', 'Teléfono: ' + cfg.contacto.telefono));
      rejilla.append(lado);
      // E50 (7-nov): formulario con el diseño de la referencia de Olivia. Todavía no envía: lo dice en pantalla y deja el correo.
      if (cfg.contacto.formulario?.campos?.length) {
        const f = el('form', null, 'kit-contacto-form'); f.noValidate = true; f.setAttribute('aria-label', 'Formulario de contacto');
        cfg.contacto.formulario.campos.forEach((c, k) => {
          const id = 'kit-contacto-' + k, et = el('label', c.etiqueta + (c.obligatorio ? '*' : ''), 'kit-contacto-etiqueta'); et.htmlFor = id;
          let campo;
          if (c.opciones) { campo = el('select'); const o0 = el('option', 'Selecciona'); o0.value = ''; campo.append(o0); c.opciones.forEach(o => { const op = el('option', o); op.value = o; campo.append(op); }); }
          else if (c.tipo === 'texto-largo') { campo = el('textarea'); campo.rows = 4; }
          else { campo = el('input'); campo.type = c.tipo || 'text'; if (c.autocompletar) campo.autocomplete = c.autocompletar; }
          campo.id = id; campo.name = c.id; campo.className = 'kit-contacto-campo' + (c.opciones ? ' es-lista' : ''); if (c.obligatorio) campo.required = true;
          const caja = el('div', null, 'kit-contacto-grupo' + (c.ancho === 'completo' ? ' completo' : '')); caja.append(et, campo); f.append(caja);
        });
        const enviar = el('button', cfg.contacto.formulario.boton || 'Agendar una reunión', 'kit-contacto-enviar'); enviar.type = 'submit';
        const aviso = el('p', null, 'kit-contacto-aviso'); aviso.setAttribute('role', 'status');
        // E59 (8-nov): el formulario envía a la base (tabla contactos, solo inserción). Campo trampa oculto contra envíos automáticos.
        const trampa = el('input', null, 'kit-contacto-trampa'); trampa.type = 'text'; trampa.name = 'sitio_web'; trampa.tabIndex = -1; trampa.autocomplete = 'off'; trampa.setAttribute('aria-hidden', 'true'); f.append(trampa);
        f.onsubmit = async ev => {
          ev?.preventDefault?.();
          const valores = Object.fromEntries(cfg.contacto.formulario.campos.map(c => [c.id, String(f.elements?.[c.id]?.value ?? '').trim()]));
          const faltan = cfg.contacto.formulario.campos.filter(c => c.obligatorio && !valores[c.id]).map(c => c.etiqueta);
          if (faltan.length) { aviso.textContent = 'Falta: ' + faltan.join(', ') + '.'; return; }
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.correo || '')) { aviso.textContent = 'Revisa el correo.'; return; }
          if (trampa.value) { aviso.textContent = 'Gracias. Te escribiremos pronto.'; f.reset?.(); return; }
          const datos = root.App?.datos;
          if (!datos?.enviarContacto) { aviso.textContent = 'No pudimos enviar el mensaje. Escríbenos a ' + cfg.contacto.correo + '.'; return; }
          enviar.disabled = true; aviso.textContent = 'Enviando…';
          try { await datos.enviarContacto({ ...valores, mensaje: valores.mensaje || null }); aviso.textContent = 'Gracias. Recibimos tu mensaje y te escribiremos pronto.'; f.reset?.(); }
          catch (_) { aviso.textContent = 'No pudimos enviar el mensaje. Escríbenos a ' + cfg.contacto.correo + '.'; }
          finally { enviar.disabled = false; }
        };
        f.append(enviar, aviso); rejilla.append(f);
      }
      s.append(rejilla); partes.push(s);
    }
    destino.replaceChildren(...partes);
    return { mostrarTema, abrirFicha: (id, i) => abrirFicha(temas.find(t => t.id === id), i), cerrarFicha };
  }
  const KitCredenciales = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = KitCredenciales;
  root.KitCredenciales = KitCredenciales;
})(typeof window !== 'undefined' ? window : globalThis);
