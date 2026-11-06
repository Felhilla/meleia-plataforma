// E46 (6-nov): portada de Credenciales con el Look and Feel de Meleia (boceto Home I de Felipe).
// Bandas a sangre, servicios en semicírculo con zoom a la ficha, experiencia por servicio con sub ficha «Caso ref».
(function (root) {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const COLORES = ['#5E7A45', '#B78D36', '#3A4733'];
  const ICONOS = {
    sostenibilidad: [['path', { d: 'M24 5 39 11v12c0 10-7 17-15 20C16 40 9 33 9 23V11Z' }], ['path', { d: 'M17 30c0-9 7-14 15-14 0 9-5 14-14 14Z' }], ['path', { d: 'm17 32 9-9' }]],
    dialogo: [['path', { d: 'M9 10h19a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H17l-6 5v-5H9a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z' }], ['path', { d: 'M36 18h3a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-2v5l-6-5h-8a4 4 0 0 1-4-4v-1' }], ['circle', { cx: 13, cy: 19, r: 1.6, class: 'relleno' }], ['circle', { cx: 18.5, cy: 19, r: 1.6, class: 'relleno' }], ['circle', { cx: 24, cy: 19, r: 1.6, class: 'relleno' }]],
    ia: [['path', { d: 'M24 24 24 10M24 24 11 19M24 24l13-5M24 24l-8 13M24 24l8 13M11 19l13-9 13 9-5 18H16Z' }], ['circle', { cx: 24, cy: 10, r: 3, class: 'nodo' }], ['circle', { cx: 11, cy: 19, r: 3, class: 'nodo' }], ['circle', { cx: 37, cy: 19, r: 3, class: 'nodo' }], ['circle', { cx: 16, cy: 37, r: 3, class: 'nodo' }], ['circle', { cx: 32, cy: 37, r: 3, class: 'nodo' }], ['circle', { cx: 24, cy: 24, r: 4.5, class: 'relleno' }]]
  };
  const nombreModulo = { actores: 'Módulo I', ddhh: 'Módulo II', materialidad: 'Módulo III', riesgos: 'Módulo IV' };
  const dos = i => String(i + 1).padStart(2, '0');
  const pausa = ms => new Promise(r => root.setTimeout ? root.setTimeout(r, ms) : r());

  function render(destino, cfg, App) {
    const el = App.el, doc = root.document;
    const svg = (tag, attrs = {}) => { const n = doc.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
    const sinMovimiento = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const icono = (clave, clase = 'kit-icono') => {
      const s = svg('svg', { viewBox: '0 0 48 48', class: clase, 'aria-hidden': 'true', focusable: 'false' });
      (ICONOS[clave] || ICONOS.sostenibilidad).forEach(([t, a]) => s.append(svg(t, a))); return s;
    };
    const mono = (texto, clase = '') => el('p', texto, ('kit-mono ' + clase).trim());
    const banda = (titulo, clase, titular) => {
      const s = el('section', null, 'kit-cred-seccion kit-banda ' + clase), h = el('h2', titulo, 'kit-mono kit-antetitulo');
      s.append(h); if (titular) s.append(el('p', titular, 'kit-titular')); return s;
    };
    const lista = puntos => { const ul = el('ul'); (puntos || []).forEach(t => ul.append(el('li', t))); return ul; };
    const titulares = cfg.titulares || {};
    const servicios = cfg.servicios || [], experiencia = cfg.experiencia || [];
    const partes = [];
    const abridores = new Map(); // id del caso → función que abre su sub ficha

    // 1. Quiénes somos: hero oscuro con el arco de la marca escalado.
    if (cfg.quienes) {
      const s = banda('Quiénes somos', 'kit-cred-quienes kit-banda-oscura');
      const texto = el('div', null, 'kit-hero-texto');
      if (cfg.afirmacion) texto.append(el('p', cfg.afirmacion, 'kit-hero-afirmacion'));
      texto.append(el('p', cfg.quienes, 'kit-hero-quienes'));
      const ejes = el('ul', null, 'kit-hero-ejes'); servicios.forEach((v, i) => { const li = el('li'); li.append(el('span', dos(i), 'kit-mono'), el('span', v.corto || v.titulo)); ejes.append(li); }); texto.append(ejes);
      const arte = svg('svg', { viewBox: '0 0 400 260', class: 'kit-hero-arco', 'aria-hidden': 'true', focusable: 'false' });
      [190, 150, 110].forEach((r, i) => arte.append(svg('path', { d: `M${200 - r} 240a${r} ${r} 0 0 1 ${2 * r} 0`, class: 'kit-hero-trazo t' + i, pathLength: 1 })));
      arte.append(svg('circle', { cx: 200, cy: 240, r: 9, class: 'kit-hero-punto' }));
      const cuerpo = el('div', null, 'kit-hero'); cuerpo.append(texto, arte); s.append(cuerpo); partes.push(s);
    }

    // 2. Servicios: semicírculo de tres segmentos; clic en segmento, ícono o título hace zoom y abre la ficha.
    if (servicios.length) {
      const s = banda('Servicios', 'kit-cred-servicios', titulares.servicios);
      const escena = el('div', null, 'kit-serv-escena'), diagrama = el('div', null, 'kit-serv-diagrama'), ficha = el('div', null, 'kit-serv-ficha');
      ficha.hidden = true; ficha.setAttribute('aria-live', 'polite');
      const C = [260, 330], R0 = 175, R1 = 285, RN = 290, n = servicios.length, paso = 180 / n;
      const punto = (r, g) => [C[0] + r * Math.cos(g * Math.PI / 180), C[1] + r * Math.sin(g * Math.PI / 180)];
      const dibujo = svg('svg', { viewBox: '0 0 1000 660', class: 'kit-serv-svg', 'aria-hidden': 'true', focusable: 'false' });
      dibujo.append(svg('path', { d: `M${C[0]} ${C[1] - 318}a318 318 0 0 1 0 636`, class: 'kit-serv-marco' }));
      const botones = [], nodos = [];
      servicios.forEach((v, i) => {
        const a0 = -90 + i * paso + 1.2, a1 = -90 + (i + 1) * paso - 1.2, medio = -90 + (i + .5) * paso;
        const [x0, y0] = punto(R1, a0), [x1, y1] = punto(R1, a1), [x2, y2] = punto(R0, a1), [x3, y3] = punto(R0, a0);
        const g = svg('g', { class: 'kit-serv-seg', 'data-i': i });
        g.append(svg('path', { d: `M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`, fill: COLORES[i % 3] }));
        const [nx, ny] = punto(222, medio - 15), num = svg('text', { x: nx, y: ny, class: 'kit-serv-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); num.textContent = String(i + 1); g.append(num);
        const [cx, cy] = punto(RN, medio); nodos.push([cx, cy]);
        g.append(svg('line', { x1: cx + 50, y1: cy, x2: 702, y2: cy, class: 'kit-serv-guia' }), svg('circle', { cx: 714, cy, r: 8, class: 'kit-serv-anillo' }));
        const nodo = svg('g', { class: 'kit-serv-nodo', transform: `translate(${cx} ${cy})` });
        nodo.append(svg('circle', { r: 50, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: 42, class: 'kit-serv-nodo-aro', stroke: COLORES[i % 3] }));
        const ic = icono(v.icono, 'kit-serv-nodo-icono'); ic.setAttribute('x', -28); ic.setAttribute('y', -28); ic.setAttribute('width', 56); ic.setAttribute('height', 56); nodo.append(ic); g.append(nodo);
        g.addEventListener?.('click', () => abrir(i)); dibujo.append(g);
        const b = el('button', null, 'kit-serv-titulo'); b.type = 'button'; b.style && (b.style.top = (cy / 660 * 100) + '%');
        b.append(el('span', dos(i), 'kit-mono'), el('span', v.titulo, 'kit-serv-titulo-texto'), el('span', 'Ver servicio', 'kit-serv-ver'));
        b.setAttribute('aria-label', `Servicio ${i + 1}: ${v.titulo}. Abrir la ficha`); b.onclick = () => abrir(i); botones.push(b);
      });
      const centro = svg('g', { class: 'kit-serv-centro' });
      centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
      const ante = svg('text', { x: C[0], y: C[1] - 52, 'text-anchor': 'middle', class: 'kit-serv-centro-ante' }); ante.textContent = (cfg.frase?.antetitulo || 'Meleia').toUpperCase(); centro.append(ante);
      const palabras = String(cfg.frase?.texto || '').split(' '), corte = Math.ceil(palabras.length / 2);
      [palabras.slice(0, corte).join(' '), palabras.slice(corte).join(' ')].forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 40, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' }); t.textContent = linea; centro.append(t); });
      centro.append(svg('circle', { cx: C[0], cy: C[1] + 92, r: 6, class: 'kit-hero-punto' }));
      dibujo.append(centro);
      // En pantallas angostas los títulos van debajo: se recorta el lienzo al semicírculo para que crezca.
      const angosta = root.matchMedia?.('(max-width: 860px)');
      const encuadre = () => dibujo.setAttribute('viewBox', angosta?.matches ? '92 0 530 660' : '0 0 1000 660');
      encuadre(); angosta?.addEventListener?.('change', encuadre);
      const frase = el('p', cfg.frase?.texto || '', 'solo-lectores');
      const titulos = el('div', null, 'kit-serv-titulos'); titulos.append(...botones);
      diagrama.append(dibujo, frase, titulos); escena.append(diagrama, ficha); s.append(escena); partes.push(s);

      async function abrir(i) {
        const v = servicios[i], [cx, cy] = nodos[i];
        const [vx, vw] = angosta?.matches ? [92, 530] : [0, 1000];
        if (diagrama.style) diagrama.style.transformOrigin = `${(cx - vx) / vw * 100}% ${cy / 6.6}%`;
        if (escena.style && diagrama.offsetHeight) escena.style.minHeight = diagrama.offsetHeight + 'px';
        if (!sinMovimiento()) { diagrama.classList?.add('acercando'); await pausa(420); }
        diagrama.hidden = true;
        const volver = el('button', 'Volver al gráfico', 'kit-serv-volver'); volver.type = 'button';
        volver.onclick = async () => {
          ficha.hidden = true; diagrama.hidden = false; if (escena.style) escena.style.minHeight = '';
          if (!sinMovimiento()) { await pausa(20); diagrama.classList?.remove('acercando'); } else diagrama.classList?.remove('acercando');
          botones[i].focus?.();
        };
        const sello = el('div', null, 'kit-serv-ficha-icono'); if (sello.style) sello.style.background = COLORES[i % 3]; sello.append(icono(v.icono));
        const cuerpo = el('div', null, 'kit-serv-ficha-cuerpo');
        cuerpo.append(mono('Servicio ' + dos(i)), el('h3', v.titulo));
        const caja = el('div', null, 'kit-serv-descripcion'); caja.append(el('p', v.descripcion || ''), lista(v.puntos)); cuerpo.append(caja);
        const casos = experiencia.filter(e => e.servicio === i);
        cuerpo.append(mono('Casos', 'kit-serv-casos-titulo'));
        if (casos.length) { const ul = el('ul', null, 'kit-serv-casos'); casos.forEach(e => { const li = el('li'), b = el('button', `${e.sector} · ${e.tema}`, 'kit-enlace-flecha'); b.type = 'button'; b.onclick = () => abridores.get(e.id)?.(true); li.append(b); ul.append(li); }); cuerpo.append(ul); }
        else cuerpo.append(el('p', 'Casos por confirmar.', 'nota'));
        ficha.replaceChildren(volver, sello, cuerpo); ficha.hidden = false;
        ficha.classList?.add('entrando'); await pausa(20); ficha.classList?.remove('entrando');
        volver.focus?.();
      }
    }

    // 3. Experiencia por servicio: caso de éxito, otros clientes y sub ficha «Caso ref».
    if (experiencia.length) {
      const s = banda('Experiencia', 'kit-cred-experiencia kit-banda-oscura', titulares.experiencia);
      const exitos = cfg.casos_exito || {}, otros = cfg.otros_clientes || {};
      const celda = (caso, controla) => {
        const b = el('button', null, 'kit-logo-celda'); b.type = 'button';
        if (caso.logo) { const img = el('img'); img.src = caso.logo; img.alt = caso.cliente || caso.sector; b.append(img); }
        else b.append(el('span', caso.sector, 'kit-logo-sector'), el('span', caso.tema, 'kit-mono'));
        b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', controla);
        b.setAttribute('aria-label', `Caso ${caso.sector}, ${caso.tema}. Abrir la ficha del caso`); return b;
      };
      const pendiente = texto => { const d = el('div', null, 'kit-logo-celda kit-logo-pendiente'); d.append(el('span', texto, 'kit-mono')); return d; };
      servicios.forEach((v, i) => {
        const fila = el('article', null, 'kit-exp-fila'), cabeza = el('div', null, 'kit-exp-cabeza'), id = 'kit-caso-ref-' + i;
        const marca = el('div', null, 'kit-exp-servicio'), sello = el('span', null, 'kit-exp-icono'); if (sello.style) sello.style.background = COLORES[i % 3]; sello.append(icono(v.icono));
        const nombre = el('div'); nombre.append(mono('Servicio ' + dos(i)), el('h3', v.titulo)); marca.append(sello, nombre);
        const ref = el('div', null, 'kit-caso-ref'); ref.id = id; ref.hidden = true;
        const exito = experiencia.find(e => e.id === exitos[i]);
        const lado = el('div', null, 'kit-exp-exito'); lado.append(mono('Caso de éxito'));
        const celdas = [];
        if (exito) { const c = celda(exito, id); celdas.push([c, exito]); lado.append(c); } else lado.append(pendiente('Por confirmar'));
        cabeza.append(marca, lado);
        const resto = el('div', null, 'kit-exp-otros'); resto.append(mono('Otros clientes'));
        const rej = el('div', null, 'kit-logo-rejilla');
        experiencia.filter(e => e.servicio === i && e !== exito).forEach(e => { const c = celda(e, id); celdas.push([c, e]); rej.append(c); });
        (otros[i] || []).forEach(o => { const d = el('div', null, 'kit-logo-celda kit-logo-fijo'); if (o.logo) { const img = el('img'); img.src = o.logo; img.alt = o.nombre; d.append(img); } else d.append(el('span', o.nombre, 'kit-logo-sector')); rej.append(d); });
        if (!rej.children.length) rej.append(pendiente('Logos por confirmar'));
        resto.append(rej);
        const mostrar = (caso, boton, desplazar) => {
          const abierto = !ref.hidden && ref.dataset.caso === caso.id;
          celdas.forEach(([c]) => c.setAttribute('aria-expanded', 'false'));
          if (abierto) { ref.hidden = true; ref.dataset.caso = ''; boton.focus?.(); return; }
          boton.setAttribute('aria-expanded', 'true'); ref.dataset.caso = caso.id;
          if (ref.style) ref.style.setProperty?.('--caso-color', caso.color || COLORES[i % 3]);
          const logo = el('div', null, 'kit-caso-logo');
          if (caso.logo) { const img = el('img'); img.src = caso.logo; img.alt = caso.cliente || caso.sector; logo.append(img); } else logo.append(el('span', caso.sector, 'kit-logo-sector'));
          const cuerpo = el('div', null, 'kit-caso-cuerpo');
          cuerpo.append(mono(caso.sector + ' · ' + caso.tema), el('h4', '¿Qué se hizo?'), el('p', caso.que_se_hizo || caso.descripcion, 'kit-caso-texto'), el('h4', 'Entregables'));
          const linea = el('ol', null, 'kit-caso-entregables');
          (caso.entregables || []).forEach(t => {
            const li = el('li'); li.append(el('span', null, 'kit-caso-hito'), el('span', t.texto, 'kit-caso-hito-texto'));
            if (t.modulo) { const a = el('a', 'Ver en el ' + (nombreModulo[t.modulo] || 'Kit'), 'kit-enlace-flecha'); a.href = '#/' + t.modulo; li.append(a); }
            linea.append(li);
          });
          cuerpo.append(linea);
          const cerrar = el('button', '×', 'kit-cerrar'); cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar la ficha del caso');
          cerrar.onclick = () => { ref.hidden = true; ref.dataset.caso = ''; boton.setAttribute('aria-expanded', 'false'); boton.focus?.(); };
          ref.replaceChildren(cerrar, logo, cuerpo); ref.hidden = false;
          if (desplazar) { ref.scrollIntoView?.({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'center' }); cerrar.focus?.({ preventScroll: true }); }
        };
        celdas.forEach(([c, caso]) => { c.onclick = () => mostrar(caso, c, false); abridores.set(caso.id, () => { if (ref.hidden || ref.dataset.caso !== caso.id) mostrar(caso, c, true); else ref.scrollIntoView?.({ block: 'center' }); }); });
        fila.append(cabeza, resto, ref); s.append(fila);
      });
      partes.push(s);
    }

    // 4. Equipo, aliados y contacto (segunda parte del boceto, pendiente): misma gramática de bandas.
    if ((cfg.personas || []).length) {
      const s = banda('Equipo', 'kit-cred-equipo', titulares.equipo), rej = el('div', null, 'kit-equipo');
      cfg.personas.forEach(p => {
        const fichaP = el('article', null, 'kit-persona'), cabeza = el('div', null, 'kit-persona-cabeza'), texto = el('div');
        if (p.foto) { const img = el('img'); img.src = p.foto; img.alt = 'Foto de ' + p.nombre; img.loading = 'lazy'; cabeza.append(img); }
        else { const vacio = el('div', null, 'kit-persona-foto-vacia'); vacio.setAttribute('aria-hidden', 'true'); cabeza.append(vacio); }
        texto.append(el('h3', p.nombre)); if (p.cargo) texto.append(el('p', p.cargo, 'kit-persona-cargo')); cabeza.append(texto); fichaP.append(cabeza);
        if (p.experiencia) fichaP.append(el('p', p.experiencia, 'kit-persona-experiencia'));
        rej.append(fichaP);
      }); s.append(rej); partes.push(s);
    }
    if ((cfg.aliados || []).length) {
      const s = banda('Aliados', 'kit-cred-aliados kit-banda-arena', titulares.aliados), ol = el('ol', null, 'kit-lista-numerada');
      cfg.aliados.forEach((t, i) => { const li = el('li'); li.append(el('span', dos(i), 'kit-mono'), el('span', t)); ol.append(li); }); s.append(ol); partes.push(s);
    }
    if (cfg.contacto?.correo) {
      const s = banda('Contacto', 'kit-cred-contacto kit-banda-oscura'), p = el('p', null, 'kit-contacto-linea'), a = el('a', cfg.contacto.correo);
      a.href = 'mailto:' + cfg.contacto.correo; s.append(el('p', 'Hablemos.', 'kit-titular')); p.append(el('span', 'Escríbenos a '), a); s.append(p);
      if (cfg.contacto.telefono) s.append(el('p', 'Teléfono: ' + cfg.contacto.telefono)); partes.push(s);
    }
    destino.replaceChildren(...partes);
  }
  const KitCredenciales = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = KitCredenciales;
  root.KitCredenciales = KitCredenciales;
})(typeof window !== 'undefined' ? window : globalThis);
