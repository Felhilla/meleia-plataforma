(function (root) {
  'use strict';
  // Pestaña Metodología, común a los cuatro módulos (E49, 7-nov). El texto vive en config/kit-metodologia.json para
  // revisarlo y aprobarlo sin tocar código. Las cifras, escalas, umbrales y referencias NO se escriben en ese archivo:
  // se leen del catálogo y del cruce que usan los Resultados, para que la Metodología y los Resultados digan lo mismo.
  // Usa las piezas del Look and Feel de Credenciales: bandas, semicírculo, fichas flotantes, 01-02-03 con filete y #.
  const SVG = 'http://www.w3.org/2000/svg';
  const COLORES = ['#5E7A45', '#B78D36', '#3A4733', '#A8503A'];
  const dos = i => String(i + 1).padStart(2, '0');
  const num = n => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 });
  const FUENTES = { ddhh: ['config/kit-ddhh-catalogo.json', 'config/kit-ddhh-cruce.json'] };
  const cache = new Map();
  function cargar(ruta) {
    if (!cache.has(ruta)) cache.set(ruta, root.fetch(ruta).then(r => { if (!r.ok) throw Error('No se pudo cargar la metodología.'); return r.json(); }).catch(e => { cache.delete(ruta); throw e; }));
    return cache.get(ruta);
  }

  // Lo que la Metodología necesita del catálogo del Módulo II, calculado y no copiado.
  function datosDdhh(cat, cruce, m) {
    const ejes = new Map(cat.ejes.map(e => [e.id, e]));
    const indicadores = id => cat.indicadores.filter(i => i.eje === id);
    const corto = id => cat.dimensiones?.ejes?.[id]?.corto || ejes.get(id)?.nombre || id;
    const marcos = id => (cat.dimensiones?.ejes?.[id]?.estandares || []).map(t => t.replace(/ · /g, ', '));
    const sector = (cruce?.sectores || []).find(s => s.id === m.estandares?.cruce_sector);
    const filas = (sector?.grupos || []).flatMap(g => g.filas);
    const ordenEjes = cat.ejes.map(e => e.id);
    // El cruce sigue el mismo orden de filas que el catálogo (6 etapas y 10 temas). Si no coincide, no se muestra.
    const cruceOk = filas.length === ordenEjes.length;
    const escala = cat.estandares[0].escala.niveles.map(n => ({ ...n, nombre: (cat.calificacion?.brechas?.niveles || []).find(x => x.valor === n.valor)?.nombre || '' })).sort((a, b) => a.valor - b.valor);
    const color = v => (cat.umbrales.cortes.find(c => c.menor_que === null || v < c.menor_que) || {}).color;
    return {
      ejes, indicadores, corto, marcos, escala, color, umbrales: cat.umbrales,
      totalIndicadores: cat.indicadores.length,
      totalCriterios: cat.ejes.reduce((s, e) => s + e.componentes.length, 0),
      totalEjes: cat.ejes.length,
      totalDimensiones: (cat.dimensiones?.grandes || []).length,
      columnas: cruceOk ? sector.columnas : [],
      celda: (eje, col) => cruceOk ? (filas[ordenEjes.indexOf(eje)]?.celdas?.[col] || []) : [],
      ordenEjes
    };
  }

  function pintar(c, m, extra = {}) {
    const App = root.App, el = App.el, doc = root.document;
    const art = el('article', null, 'kit-met');
    if (!m || !m.metodo) {
      const b = banda('kit-banda-oscura kit-met-hero');
      b.append(el('h2', 'Metodología', 'kit-mono kit-antetitulo'), el('p', 'La metodología de este módulo está en preparación.', 'kit-titular'));
      art.append(b); c.append(art); return;
    }
    const d = extra.datos;
    const svg = (tag, attrs = {}) => { const n = doc.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
    const mono = (t, clase = '') => el('p', t, ('kit-mono ' + clase).trim());
    function banda(clase) { return el('section', null, 'kit-banda kit-met-banda ' + clase); }
    function encabezado(b, n, ante, titular, intro) {
      b.append(el('h2', `${n} ${ante}`, 'kit-mono kit-antetitulo'));
      if (titular) b.append(el('p', titular, 'kit-titular'));
      if (intro) b.append(el('p', intro, 'kit-met-intro'));
    }
    const sinMovimiento = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Movimiento con propósito (Look and Feel, principio 7): solo en un navegador real y si el usuario no pidió movimiento reducido.
    const anima = () => !!root.matchMedia && !sinMovimiento();
    const pendientes = [];
    const io = anima() && root.IntersectionObserver ? new root.IntersectionObserver(es => es.forEach(x => {
      if (!x.isIntersecting) return;
      io.unobserve(x.target); x.target.classList?.add('visto'); x.target._alVer?.();
    }), { rootMargin: '0px 0px -10% 0px' }) : null;
    // Aparición al llegar con el scroll: sube y aparece. En cascada, los hijos entran uno tras otro.
    function revelar(n, cascada = false, alVer) {
      if (alVer) n._alVer = alVer;
      if (!io) { alVer?.(); return n; }
      n.classList?.add(cascada ? 'kit-met-cascada' : 'kit-met-revela');
      if (cascada) Array.from(n.children || []).forEach((h, k) => h.style?.setProperty?.('--i', k));
      pendientes.push(n); return n;
    }
    // Desplegable: botón con flecha y panel que se abre en altura. El contenido siempre está en la página.
    let nDesp = 0;
    function desplegable(rotulo, contenido, clase = '') {
      const caja = el('div', null, ('kit-met-despliega ' + clase).trim()), id = 'kit-met-desp-' + (++nDesp);
      const b = el('button', null, 'kit-met-despliega-boton'); b.type = 'button';
      b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
      [].concat(rotulo).forEach(r => b.append(typeof r === 'string' ? el('span', r) : r));
      const panel = el('div', null, 'kit-met-despliega-panel'), interior = el('div', null, 'kit-met-despliega-interior');
      panel.id = id; panel.inert = true; interior.append(...[].concat(contenido)); panel.append(interior);
      b.onclick = () => {
        const abrir = b.getAttribute?.('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(abrir)); caja.classList?.toggle('abierto', abrir); panel.inert = !abrir;
      };
      caja.append(b, panel); return caja;
    }
    // Las cifras del encabezado cuentan desde cero en 700 ms con curva de salida.
    function contar(span, valor) {
      if (!anima() || !root.requestAnimationFrame || !(valor > 0)) return;
      const t0 = root.performance?.now?.() ?? Date.now(), dur = 700;
      const paso = t => { const p = Math.min(1, (t - t0) / dur); span.textContent = '# ' + num(Math.round(valor * (1 - Math.pow(1 - p, 3)))); if (p < 1) root.requestAnimationFrame(paso); };
      span.textContent = '# 0'; root.requestAnimationFrame(paso);
    }

    // Escena: un contenido (gráfico, rejilla o tabla) sobre el que flotan las fichas, con el fondo difuminado.
    function escena(contenido) {
      const e = el('div', null, 'kit-serv-escena kit-met-escena'), capa = el('div', null, 'kit-ficha-capa');
      capa.hidden = true; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'false');
      e.append(contenido, capa);
      let origen = null, turno = 0, ro = null;
      // La escena crece con la ficha (también cuando dentro de ella se abre un desplegable).
      const ajustar = t => { if (e.style && t.offsetHeight) e.style.minHeight = Math.max(contenido.offsetHeight || 0, t.offsetHeight + 48) + 'px'; };
      const cerrar = (enfocar = true) => {
        if (capa.hidden) return;
        const mio = ++turno, fin = () => {
          if (mio !== turno) return;
          ro?.disconnect(); ro = null; capa.hidden = true; capa.replaceChildren(); if (e.style) e.style.minHeight = '';
          if (enfocar) origen?.focus?.(); origen = null;
        };
        contenido.classList?.remove('difuminado');
        if (anima()) { capa.firstChild?.classList?.add('saliendo'); root.setTimeout(fin, 180); } else fin();
      };
      capa.onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); } };
      const abrir = (titulo, nodos, desde, clase = '') => {
        origen = desde || null; turno++;
        const t = el('article', null, ('kit-ficha-flotante kit-met-ficha ' + clase).trim());
        const volver = el('button', 'Volver', 'kit-serv-volver'); volver.type = 'button'; volver.onclick = () => cerrar();
        t.append(volver, ...nodos); capa.replaceChildren(t); capa.setAttribute('aria-label', titulo);
        contenido.classList?.add('difuminado'); capa.hidden = false;
        ajustar(t); ro?.disconnect(); ro = root.ResizeObserver ? new root.ResizeObserver(() => ajustar(t)) : null; ro?.observe(t);
        volver.focus?.({ preventScroll: true });
        if (e.getBoundingClientRect && e.getBoundingClientRect().top < 0) e.scrollIntoView?.({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' });
      };
      return { nodo: e, abrir, cerrar };
    }
    const cabeza = (sello, color, antetitulo, titulo) => {
      const h = el('header', null, 'kit-ficha-cabeza'), s = el('div', null, 'kit-ficha-sello kit-met-sello');
      if (s.style) s.style.setProperty?.('--sello', color);
      s.append(el('span', sello, 'kit-met-sello-texto'));
      const barra = el('div', null, 'kit-ficha-barra'); barra.append(mono(antetitulo), el('h3', titulo));
      h.append(s, barra); return h;
    };
    const bloque = (rotulo, ...hijos) => { const s = el('section', null, 'kit-met-bloque'); s.append(mono(rotulo, 'kit-ficha-sub'), ...hijos); return s; };
    const parrafo = t => el('p', t, 'kit-met-texto');
    const lista = (items, clase = 'kit-met-lista') => { const ul = el('ul', null, clase); items.forEach(t => ul.append(typeof t === 'string' ? el('li', t) : t)); return ul; };
    const preguntas = (id, n) => {
      const todas = d.indicadores(id), ol = el('ol', null, 'kit-met-preguntas');
      todas.slice(0, n).forEach(i => ol.append(el('li', i.pregunta)));
      if (todas.length <= n) return ol;
      const resto = el('ol', null, 'kit-met-preguntas'); resto.start = n + 1; resto.setAttribute('start', String(n + 1));
      todas.slice(n).forEach(i => resto.append(el('li', i.pregunta)));
      const caja = el('div'); caja.append(ol, desplegable(`Ver las ${num(todas.length - n)} preguntas restantes`, resto, 'kit-met-despliega-chico')); return caja;
    };

    // 1. Encabezado: el para qué en una línea, el cuándo y las cifras del módulo leídas del catálogo.
    const hero = banda('kit-banda-oscura kit-met-hero');
    const marca = el('div', null, 'kit-met-marca');
    marca.append(el('span', m.romano, 'kit-met-romano'), mono('Módulo ' + m.romano + ', metodología'));
    if (m.estado === 'borrador') marca.append(el('span', 'Borrador en revisión', 'kit-met-estado'));
    hero.append(marca, el('h2', m.nombre, 'kit-met-nombre'), el('p', m.afirmacion, 'kit-hero-afirmacion kit-met-afirmacion'));
    const textos = el('div', null, 'kit-met-hero-textos'); textos.append(el('p', m.resumen, 'kit-hero-quienes'), el('p', m.cuando, 'kit-hero-quienes'));
    hero.append(textos);
    const cifras = el('ul', null, 'kit-datos kit-met-cifras');
    [[m.metodo.etapas.length, 'etapas del proceso de debida diligencia'], [m.temas.items.length, 'derechos evaluados en la operación y la cadena'], [d.totalIndicadores, 'preguntas, cada una con su evidencia'], [m.estandares.fichas.length, 'estándares de referencia, con su fuente']]
      .forEach(([n, t]) => { const li = el('li'), s = el('span', '# ' + num(n), 'kit-dato-cifra'); s._valor = n; li.append(s, el('span', t, 'kit-dato-texto')); cifras.append(li); });
    hero.append(revelar(cifras, true, () => Array.from(cifras.children).forEach(li => contar(li.children[0], li.children[0]._valor))));
    art.append(hero);

    // 2. El método: las etapas sobre el arco de Meleia. Cada etapa abre su ficha.
    const bMetodo = banda('kit-met-metodo');
    encabezado(bMetodo, '01', 'El método', m.metodo.titular, m.metodo.intro);
    const diagrama = el('div', null, 'kit-serv-diagrama kit-met-diagrama'), esc1 = escena(diagrama);
    const etapas = m.metodo.etapas, angosta = root.matchMedia?.('(max-width: 860px)');
    const C = [260, 330], R0 = 175, R1 = 285, RN = 290, n = etapas.length, paso = 180 / n;
    const punto = (r, g) => [C[0] + r * Math.cos(g * Math.PI / 180), C[1] + r * Math.sin(g * Math.PI / 180)];
    const dibujo = svg('svg', { class: 'kit-serv-svg', 'aria-hidden': 'true', focusable: 'false', viewBox: angosta?.matches ? '92 0 545 660' : '0 0 1000 660' });
    angosta?.addEventListener?.('change', () => dibujo.setAttribute('viewBox', angosta.matches ? '92 0 545 660' : '0 0 1000 660'));
    dibujo.append(svg('path', { d: `M${C[0]} ${C[1] - 318}a318 318 0 0 1 0 636`, class: 'kit-serv-marco' }));
    const titulos = el('div', null, 'kit-serv-titulos'), botonesEtapa = [];
    etapas.forEach((e, i) => {
      const a0 = -90 + i * paso + 1, a1 = -90 + (i + 1) * paso - 1, medio = -90 + (i + .5) * paso, col = COLORES[i % 4];
      const [x0, y0] = punto(R1, a0), [x1, y1] = punto(R1, a1), [x2, y2] = punto(R0, a1), [x3, y3] = punto(R0, a0);
      const g = svg('g', { class: 'kit-serv-seg', style: `--i:${i}` });
      g.append(svg('path', { d: `M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`, fill: col }));
      const [cx, cy] = punto(RN, medio);
      g.append(svg('line', { x1: cx + 40, y1: cy, x2: 702, y2: cy, class: 'kit-serv-guia' }), svg('circle', { cx: 714, cy, r: 8, class: 'kit-serv-anillo' }));
      const nodo = svg('g', { class: 'kit-serv-nodo', transform: `translate(${cx} ${cy})` });
      const t = svg('text', { class: 'kit-serv-sigla kit-met-nodo-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); t.textContent = String(i + 1);
      nodo.append(svg('circle', { r: 38, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: 33, class: 'kit-serv-nodo-aro', stroke: col }), t);
      g.append(nodo); g.addEventListener?.('click', () => fichaEtapa(i)); dibujo.append(g);
      const b = el('button', null, 'kit-serv-titulo'); b.type = 'button'; if (b.style) { b.style.top = (cy / 660 * 100) + '%'; b.style.setProperty?.('--i', i); }
      b.append(el('span', dos(i), 'kit-mono'), el('span', e.titulo, 'kit-serv-titulo-texto'), el('span', `${num(d.indicadores(e.eje).length)} preguntas`, 'kit-serv-ver'));
      b.setAttribute('aria-label', `Etapa ${i + 1}: ${e.titulo}. Abrir la ficha`); b.onclick = () => fichaEtapa(i);
      botonesEtapa.push(b); titulos.append(b);
    });
    const centro = svg('g', { class: 'kit-serv-centro' });
    centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
    const t0 = svg('text', { x: C[0], y: C[1] - 52, 'text-anchor': 'middle', class: 'kit-serv-centro-ante' }); t0.textContent = 'GUÍA OCDE'; centro.append(t0);
    m.metodo.frase.split('\n').slice(0, 2).forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 38, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' }); t.textContent = linea; centro.append(t); });
    centro.append(svg('circle', { cx: C[0], cy: C[1] + 90, r: 6, class: 'kit-hero-punto' }));
    dibujo.append(centro);
    diagrama.append(dibujo, el('p', 'Las seis etapas del proceso de debida diligencia.', 'solo-lectores'), titulos);
    if (io) { diagrama.classList?.add('kit-met-espera'); diagrama._alVer = () => { diagrama.classList?.remove('kit-met-espera'); diagrama.classList?.add('recarga'); }; pendientes.push(diagrama); }
    else diagrama.classList?.add('recarga');
    bMetodo.append(esc1.nodo); art.append(bMetodo);
    function fichaEtapa(i) {
      const e = etapas[i], eje = d.ejes.get(e.eje), crit = (eje?.componentes || []).map(x => x.nombre);
      const unicos = crit.filter((x, k) => crit.indexOf(x) === k);
      const rej = el('div', null, 'kit-met-rejilla');
      rej.append(
        bloque('Lo que pide el estándar', parrafo(e.pide)),
        bloque('Evidencia que buscamos', parrafo(e.evidencia)),
        bloque(`Qué evaluamos: ${num(d.indicadores(e.eje).length)} preguntas`, lista(unicos)),
        bloque('La respaldan', lista(d.marcos(e.eje), 'kit-met-chips')),
        bloque('Así se pregunta', preguntas(e.eje, 2))
      );
      esc1.abrir('Etapa ' + (i + 1) + ': ' + e.titulo, [
        cabeza(String(i + 1), COLORES[i % 4], `Etapa ${dos(i)} de ${n}`, e.titulo),
        el('p', `${e.oficial}. Guía OCDE, paso ${i + 1}, ${e.pagina}.`, 'kit-met-oficial'), rej
      ], botonesEtapa[i]);
    }

    // 3. Los derechos: diez celdas numeradas. Cada una abre su ficha con preguntas reales del catálogo.
    const bTemas = banda('kit-met-temas');
    encabezado(bTemas, '02', 'Los derechos', m.temas.titular, m.temas.intro);
    const rejilla = el('div', null, 'kit-met-celdas'), esc2 = escena(rejilla), celdasTema = [];
    m.temas.items.forEach((t, i) => {
      const b = el('button', null, 'kit-met-celda'); b.type = 'button';
      if (b.style) b.style.setProperty?.('--color', COLORES[i % 4]);
      b.append(el('span', dos(i), 'kit-mono'), el('span', d.corto(t.eje), 'kit-met-celda-titulo'), el('span', `${num(d.indicadores(t.eje).length)} preguntas`, 'kit-met-celda-sub'));
      b.setAttribute('aria-label', `Derecho ${i + 1}: ${d.ejes.get(t.eje)?.nombre}. Abrir la ficha`);
      b.onclick = () => esc2.abrir(d.ejes.get(t.eje)?.nombre || '', [
        cabeza(dos(i), COLORES[i % 4], `Derecho ${dos(i)} de ${m.temas.items.length}`, d.ejes.get(t.eje)?.nombre || ''),
        bloque('Qué protege', parrafo(t.protege)),
        bloque('Marco de referencia', lista(d.marcos(t.eje), 'kit-met-chips')),
        bloque(`Así se pregunta: ${num(d.indicadores(t.eje).length)} preguntas en total`, preguntas(t.eje, 3))
      ], b);
      celdasTema.push(b); rejilla.append(b);
    });
    bTemas.append(esc2.nodo); art.append(bTemas);

    // 4. Cómo se califica: escala, cálculo, cortes de color y reglas. Todo sale del catálogo.
    const bCal = banda('kit-met-calificacion');
    encabezado(bCal, '03', 'Cómo se califica', m.calificacion.titular, m.calificacion.intro);
    const escala = el('ol', null, 'kit-met-escala');
    d.escala.forEach(nv => {
      const li = el('li'); if (li.style) li.style.setProperty?.('--color', d.color(nv.valor) || 'var(--borde)');
      li.append(el('span', String(nv.valor), 'kit-met-escala-num'), el('span', nv.nombre, 'kit-met-escala-nombre'), el('span', nv.descripcion, 'kit-met-escala-texto'));
      escala.append(li);
    });
    bCal.append(escala);
    const calculo = el('ol', null, 'kit-met-calculo');
    [[d.totalIndicadores, 'preguntas', 'Cada una se califica de 0 a 5 con su evidencia.'],
      [d.totalCriterios, 'criterios', 'Promedio de sus preguntas.'],
      [d.totalEjes, 'etapas y derechos', 'Promedio de sus criterios. Los derechos sin criterios promedian sus preguntas.'],
      [d.totalDimensiones, 'dimensiones', 'Promedio de sus etapas o de sus derechos.']]
      .forEach(([v, t, x]) => { const li = el('li'); li.append(el('span', '# ' + num(v), 'kit-dato-cifra'), el('span', t, 'kit-met-calculo-rotulo'), el('span', x, 'kit-dato-texto')); calculo.append(li); });
    bCal.append(mono('Del dato al resultado', 'kit-ficha-sub'), calculo);
    const cortes = el('div', null, 'kit-met-cortes'), cs = d.umbrales.cortes;
    cs.forEach((c, k) => {
      const desde = k ? cs[k - 1].menor_que : d.umbrales.escala.minimo;
      const rango = c.menor_que === null ? `${num(desde)} o más` : k ? `De ${num(desde)} a menos de ${num(c.menor_que)}` : `Menos de ${num(c.menor_que)}`;
      const s = el('span', rango, 'kit-met-corte'); if (s.style) { s.style.setProperty?.('--color', c.color); s.style.flexGrow = String((c.menor_que ?? d.umbrales.escala.maximo) - desde); }
      cortes.append(s);
    });
    bCal.append(mono('Colores en los Resultados', 'kit-ficha-sub'), cortes);
    if (d.umbrales.hipotesis) bCal.append(el('p', 'Cortes de color en validación con el equipo técnico.', 'kit-met-nota'));
    const reglas = el('ol', null, 'kit-met-reglas');
    m.calificacion.reglas.forEach((r, i) => { const li = el('li'); li.append(desplegable([el('span', dos(i), 'kit-mono'), el('strong', r.titulo)], el('p', r.texto, 'kit-met-texto'), 'kit-met-regla')); reglas.append(li); });
    bCal.append(mono('Reglas', 'kit-ficha-sub'), reglas); art.append(bCal);

    // 5. Estándares: una ficha por estándar (qué es, por qué, cruce y enlace al documento) y la matriz de cruce.
    const bEst = banda('kit-met-estandares');
    encabezado(bEst, '04', 'Estándares', m.estandares.titular, m.estandares.intro);
    const fichas = m.estandares.fichas, porId = new Map(fichas.map(f => [f.id, f]));
    const celdasEst = el('div', null, 'kit-met-estandar-celdas'), esc3 = escena(celdasEst), botonesEst = new Map();
    const usos = f => {
      if (f.columna) return d.ordenEjes.filter(id => d.celda(id, f.columna).length).map(id => ({ id, n: d.celda(id, f.columna).length }));
      return d.ordenEjes.filter(id => d.marcos(id).some(x => x.startsWith(f.catalogo))).map(id => ({ id, n: 0 }));
    };
    function fichaEstandar(f, desde) {
      const cuerpo = el('div', null, 'kit-met-est-cuerpo');
      const ident = el('div', null, 'kit-met-est-ident'); if (ident.style) ident.style.setProperty?.('--color', f.color);
      ident.append(el('span', f.sigla, 'kit-met-est-sigla'), mono(f.tipo));
      const datos = el('div', null, 'kit-met-est-datos');
      datos.append(el('h3', f.nombre), el('p', `${f.emisor}, ${f.anio}`, 'kit-met-est-emisor'));
      const enlace = el('a', f.enlace_texto + ' ↗', 'kit-met-est-enlace'); enlace.href = f.enlace; enlace.target = '_blank'; enlace.rel = 'noopener noreferrer';
      datos.append(enlace);
      const cab = el('div', null, 'kit-met-est-cabeza'); cab.append(ident, datos);
      const donde = usos(f), chips = el('ul', null, 'kit-met-chips');
      donde.forEach(u => chips.append(el('li', d.corto(u.id) + (u.n ? ` (${u.n})` : ''))));
      const cruces = el('ul', null, 'kit-met-cruces');
      (f.cruces || []).forEach(x => {
        const otro = porId.get(x.con); if (!otro) return;
        const li = el('li'), b = el('button', otro.sigla, 'kit-met-cruce-sigla'); b.type = 'button';
        if (b.style) b.style.setProperty?.('--color', otro.color);
        b.setAttribute('aria-label', 'Abrir la ficha de ' + otro.sigla); b.onclick = () => fichaEstandar(otro, botonesEst.get(otro.id));
        li.append(b, el('span', x.texto)); cruces.append(li);
      });
      cuerpo.append(bloque('Qué es', parrafo(f.que_es)), bloque('Por qué y cómo lo usamos', parrafo(f.por_que)),
        bloque(`Dónde se usa en el módulo: ${donde.length} de ${d.totalEjes}`, donde.length ? chips : el('p', 'Se aplica al módulo en su conjunto.', 'kit-met-nota')),
        bloque('Cruce con los otros estándares', cruces));
      esc3.abrir(f.sigla + ': ' + f.nombre, [cab, cuerpo], desde, 'kit-met-ficha-estandar');
    }
    fichas.forEach((f, i) => {
      const b = el('button', null, 'kit-met-estandar'); b.type = 'button'; if (b.style) b.style.setProperty?.('--color', f.color);
      b.append(el('span', dos(i), 'kit-mono'), el('span', f.sigla, 'kit-met-estandar-sigla'), el('span', f.nombre, 'kit-met-estandar-nombre'), el('span', f.tipo, 'kit-met-estandar-tipo'));
      b.setAttribute('aria-label', `${f.sigla}: ${f.nombre}. Abrir la ficha`); b.onclick = () => fichaEstandar(f, b);
      botonesEst.set(f.id, b); celdasEst.append(b);
    });
    bEst.append(esc3.nodo);

    // Matriz de cruce: filas = etapas y derechos; columnas = estándares con referencia exacta (código y página).
    if (d.columnas.length) {
      const sigla = col => fichas.find(f => f.columna === col)?.sigla || col;
      const envoltura = el('div', null, 'kit-met-matriz-caja'), esc4 = escena(envoltura);
      const tabla = el('table', null, 'kit-met-matriz'), thead = el('thead'), fila0 = el('tr');
      fila0.append(el('th', 'Etapa o derecho'));
      d.columnas.forEach(col => { const th = el('th'); th.scope = 'col'; const f = fichas.find(x => x.columna === col); if (f) { const b = el('button', sigla(col), 'kit-met-matriz-col'); b.type = 'button'; b.onclick = () => fichaEstandar(f, b); th.append(b); } else th.textContent = col; fila0.append(th); });
      thead.append(fila0); tabla.append(thead);
      const tbody = el('tbody');
      d.ordenEjes.forEach((id, k) => {
        if (k === 0 || k === etapas.length) { const tr = el('tr', null, 'kit-met-matriz-grupo'), th = el('th', k ? 'Los derechos' : 'El método'); th.colSpan = d.columnas.length + 1; tr.append(th); tbody.append(tr); }
        const tr = el('tr'), th = el('th', d.corto(id)); th.scope = 'row'; tr.append(th);
        d.columnas.forEach(col => {
          const refs = d.celda(id, col), td = el('td');
          if (!refs.length) { td.append(el('span', '–', 'kit-met-matriz-vacia')); td.setAttribute('aria-label', 'Sin referencia'); }
          else {
            const b = el('button', null, 'kit-met-matriz-celda'); b.type = 'button'; b.append(el('span', String(refs.length)));
            b.setAttribute('aria-label', `${d.corto(id)} en ${sigla(col)}: ${refs.length} ${refs.length === 1 ? 'referencia' : 'referencias'}. Ver detalle`);
            b.onclick = () => {
              const ul = el('ul', null, 'kit-met-refs');
              refs.forEach(r => { const li = el('li'); li.append(el('span', r.codigo, 'kit-met-ref-codigo'), el('span', r.nombre, 'kit-met-ref-nombre'), el('span', r.ref || '', 'kit-met-ref-pagina')); ul.append(li); });
              const f = fichas.find(x => x.columna === col), nodos = [mono(`${sigla(col)}, referencias exactas`), el('h3', d.corto(id), 'kit-met-refs-titulo'), ul];
              if (f) { const a = el('a', f.enlace_texto + ' ↗', 'kit-met-est-enlace kit-met-refs-enlace'); a.href = f.enlace; a.target = '_blank'; a.rel = 'noopener noreferrer'; nodos.push(a); }
              esc4.abrir(`${sigla(col)} en ${d.corto(id)}`, nodos, b, 'kit-met-ficha-refs');
            };
            td.append(b);
          }
          tr.append(td);
        });
        tbody.append(tr);
      });
      tabla.append(tbody); envoltura.append(tabla);
      const totalRefs = d.ordenEjes.reduce((s, id) => s + d.columnas.reduce((t, col) => t + d.celda(id, col).length, 0), 0);
      const resumen = [el('span', 'Ver la matriz de cruce', 'kit-met-despliega-titulo'), el('span', `${num(d.ordenEjes.length)} etapas y derechos, ${num(d.columnas.length)} estándares, ${num(totalRefs)} referencias exactas`, 'kit-dato-texto')];
      bEst.append(el('h3', m.estandares.cruce_titulo, 'kit-met-subtitulo'), el('p', m.estandares.cruce_intro, 'kit-met-intro'),
        desplegable(resumen, [esc4.nodo, el('p', m.estandares.cruce_nota, 'kit-met-nota')], 'kit-met-despliega-matriz'));
    }
    art.append(bEst);

    // 6. Qué entrega y siguiente paso.
    const bEnt = banda('kit-met-entrega');
    encabezado(bEnt, '05', 'Qué entrega', m.entrega.titular);
    const ent = el('ol', null, 'kit-met-numerada kit-met-entregables');
    m.entrega.items.forEach((x, i) => { const li = el('li'); li.append(el('span', dos(i), 'kit-mono'), el('strong', x.titulo), el('span', x.texto)); ent.append(li); });
    bEnt.append(ent);
    const sig = el('nav', null, 'kit-met-siguiente'); sig.setAttribute('aria-label', 'Siguiente paso');
    const ir = (texto, sub, href) => { const a = el('a', null, 'kit-met-ir'); a.href = href; a.append(el('span', texto, 'kit-met-ir-texto'), el('span', sub, 'kit-dato-texto')); return a; };
    let botones = 0;
    if (extra.empresa) {
      botones++; sig.append(ir('Ver los Resultados de un caso', 'Un caso de ejemplo calificado con este método.', `#/${extra.modulo}/${extra.empresa}/resultados`));
      if (extra.puedeEditar) { botones++; sig.append(ir('Alimentar con datos', 'Cuestionario guiado o carga por Excel.', `#/${extra.modulo}/${extra.empresa}/alimentacion`)); }
    }
    if (botones) bEnt.append(sig);
    art.append(bEnt);
    [rejilla, escala, calculo, cortes, reglas, celdasEst, ent].forEach(n => revelar(n, true));
    [bMetodo, bTemas, bCal, bEst, bEnt].forEach(b => Array.from(b.children || []).forEach(h => {
      if (h.classList?.contains?.('kit-met-escena') || /kit-met-(escala|calculo|cortes|reglas|numerada)/.test(h.className || '')) return;
      revelar(h);
    }));
    c.append(art);
    pendientes.forEach(n => io.observe(n));
  }

  async function datos(modulo, m) {
    if (modulo !== 'ddhh' || !m?.metodo) return null;
    const [cat, cruce] = await Promise.all(FUENTES.ddhh.map(cargar));
    return datosDdhh(cat, cruce, m);
  }
  const vista = modulo => ({
    async render(c, _, p) {
      const todo = await cargar('config/kit-metodologia.json'), m = todo[modulo], d = await datos(modulo, m);
      if (p?.vigente && !p.vigente()) return;
      pintar(c, m, { datos: d, modulo, empresa: p?.empresa, puedeEditar: p?.puedeEditar });
    }
  });
  const api = { pintar, vista, datosDdhh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitVistaMetodologia = api;
  if (root.App) ['actores', 'ddhh', 'materialidad', 'riesgos'].forEach(m => root.App.registrarVista(m + '/metodologia', vista(m)));
}(typeof window !== 'undefined' ? window : globalThis));
