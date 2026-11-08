(function (root) {
  'use strict';
  // Pestaña Metodología, común a los cuatro módulos. El texto vive en config/kit-metodologia.json para revisarlo y
  // aprobarlo sin tocar código. Las cifras, escalas, umbrales y referencias NO se escriben en ese archivo: se leen del
  // catálogo y del cruce que usan los Resultados, para que la Metodología y los Resultados digan lo mismo.
  // E51 (8-nov, boceto 261108_Metodologicos_Estandares): primer vistazo con el estilo del Home y Lógica Muñeca Rusa.
  // El resumen se ve de una vez. Cada cifra abre una ventana, y dentro de ella se abren otras. Cada ventana tiene X,
  // y la X regresa a la ventana anterior, en el mismo orden en que se abrieron (pila).
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
    // El cruce sigue el mismo orden de filas que el catálogo (6 etapas y 10 temas). Si no coincide, no se usa.
    const cruceOk = filas.length === ordenEjes.length;
    const escala = cat.estandares[0].escala.niveles.map(n => ({ ...n, nombre: (cat.calificacion?.brechas?.niveles || []).find(x => x.valor === n.valor)?.nombre || '' })).sort((a, b) => a.valor - b.valor);
    const color = v => (cat.umbrales.cortes.find(c => c.menor_que === null || v < c.menor_que) || {}).color;
    return {
      ejes, indicadores, corto, marcos, escala, color, umbrales: cat.umbrales,
      totalIndicadores: cat.indicadores.length,
      totalCriterios: cat.ejes.reduce((s, e) => s + e.componentes.length, 0),
      totalEjes: cat.ejes.length,
      dimensiones: (cat.dimensiones?.grandes || []).map(g => ({ ...g, ejes: cat.ejes.filter(e => e.grafico === g.id).map(e => e.id) })),
      sectores: cruce?.sectores || [],
      columnas: cruceOk ? sector.columnas : [],
      celda: (eje, col) => cruceOk ? (filas[ordenEjes.indexOf(eje)]?.celdas?.[col] || []) : [],
      ordenEjes
    };
  }

  function pintar(c, m, extra = {}) {
    const App = root.App, el = App.el, doc = root.document;
    const art = el('article', null, 'kit-met');
    if (!m || !m.metodo) {
      const b = el('section', null, 'kit-banda kit-met-banda kit-banda-oscura kit-met-hero');
      b.append(el('h2', 'Metodología', 'kit-mono kit-antetitulo'), el('p', 'La metodología de este módulo está en preparación.', 'kit-titular'));
      art.append(b); c.append(art); return;
    }
    const d = extra.datos, etapas = m.metodo.etapas, fichas = m.estandares.fichas, porId = new Map(fichas.map(f => [f.id, f]));
    const svg = (tag, attrs = {}) => { const n = doc.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
    const mono = (t, clase = '') => el('p', t, ('kit-mono ' + clase).trim());
    const boton = (clase, ...hijos) => { const b = el('button', null, clase); b.type = 'button'; b.append(...hijos); return b; };
    const sinMovimiento = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Movimiento con propósito (Look and Feel, principio 7): solo en un navegador real y si el usuario no pidió movimiento reducido.
    const anima = () => !!root.matchMedia && !sinMovimiento();

    // Desplegable: botón con flecha y panel que se abre en altura. El contenido siempre está en la página.
    let nDesp = 0;
    function desplegable(rotulo, contenido, clase = '') {
      const caja = el('div', null, ('kit-met-despliega ' + clase).trim()), id = 'kit-met-desp-' + (++nDesp);
      const b = boton('kit-met-despliega-boton'); let abierto = false;
      b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
      [].concat(rotulo).forEach(r => b.append(typeof r === 'string' ? el('span', r) : r));
      const panel = el('div', null, 'kit-met-despliega-panel'), interior = el('div', null, 'kit-met-despliega-interior');
      panel.id = id; panel.inert = true; interior.append(...[].concat(contenido)); panel.append(interior);
      b.onclick = () => { abierto = !abierto; b.setAttribute('aria-expanded', String(abierto)); caja.classList?.toggle('abierto', abierto); panel.inert = !abierto; };
      caja.append(b, panel); return caja;
    }
    // Las cifras del primer vistazo cuentan desde cero en 700 ms con curva de salida.
    function contar(span, valor) {
      if (!anima() || !root.requestAnimationFrame || !(valor > 0)) return;
      const t0 = root.performance?.now?.() ?? Date.now(), dur = 700;
      const paso = t => { const p = Math.min(1, (t - t0) / dur); span.textContent = num(Math.round(valor * (1 - Math.pow(1 - p, 3)))); if (p < 1) root.requestAnimationFrame(paso); };
      span.textContent = '0'; root.requestAnimationFrame(paso);
    }
    const cabeza = (sello, color, antetitulo, titulo) => {
      const h = el('header', null, 'kit-ficha-cabeza'), s = el('div', null, 'kit-ficha-sello kit-met-sello');
      s.style?.setProperty?.('--sello', color);
      s.append(el('span', sello, 'kit-met-sello-texto'));
      const barra = el('div', null, 'kit-ficha-barra'); barra.append(mono(antetitulo), el('h3', titulo));
      h.append(s, barra); return h;
    };
    const bloque = (rotulo, ...hijos) => { const s = el('section', null, 'kit-met-bloque'); s.append(mono(rotulo, 'kit-ficha-sub'), ...hijos); return s; };
    const parrafo = t => el('p', t, 'kit-met-texto');
    const lista = (items, clase = 'kit-met-lista') => { const ul = el('ul', null, clase); items.forEach(t => ul.append(typeof t === 'string' ? el('li', t) : t)); return ul; };
    const encabezado = (ante, titular, intro) => [mono(ante, 'kit-ven-ante'), el('h2', titular, 'kit-titular kit-ven-titular'), ...(intro ? [el('p', intro, 'kit-met-intro')] : [])];
    const preguntas = (id, n) => {
      const todas = d.indicadores(id), ol = el('ol', null, 'kit-met-preguntas');
      todas.slice(0, n).forEach(i => ol.append(el('li', i.pregunta)));
      if (todas.length <= n) return ol;
      const resto = el('ol', null, 'kit-met-preguntas'); resto.start = n + 1; resto.setAttribute('start', String(n + 1));
      todas.slice(n).forEach(i => resto.append(el('li', i.pregunta)));
      const caja = el('div'); caja.append(ol, desplegable(`Ver las ${num(todas.length - n)} preguntas restantes`, resto, 'kit-met-despliega-chico')); return caja;
    };
    // Portada del documento original. Si no tenemos la imagen, una portada tipográfica con la sigla (no se inventa una).
    const portadaDe = (f, clase = 'kit-est-portada') => {
      if (f.portada) {
        const img = el('img', null, clase); img.src = f.portada; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        if (f.portada_ajuste) img.style?.setProperty?.('object-position', f.portada_ajuste);
        return img;
      }
      const t = el('span', null, clase + ' kit-est-portada-tipo'); t.setAttribute('aria-hidden', 'true'); t.style?.setProperty?.('--color', f.color);
      t.append(el('span', f.sigla, 'kit-est-portada-sigla'), el('span', f.emisor, 'kit-est-portada-emisor')); return t;
    };
    const aDocumento = (f, clase, ...hijos) => { const a = el('a', null, clase); a.href = f.enlace; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.append(...hijos); return a; };

    // ---------- Pila de ventanas (Lógica Muñeca Rusa) ----------
    const capa = el('div', null, 'kit-ven-capa'); capa.hidden = true;
    const pila = [], html = doc?.documentElement;
    let portada = null;
    function abrir(titulo, nodos, desde, clase = '') {
      const anterior = pila[pila.length - 1];
      const v = el('section', null, ('kit-ven ' + clase).trim());
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', titulo);
      const x = boton('kit-ven-x', el('span', '×'));
      x.setAttribute('aria-label', anterior ? 'Cerrar y volver a ' + anterior.titulo : 'Cerrar y volver a la Metodología');
      x.onclick = regresar;
      const barra = el('header', null, 'kit-ven-barra');
      barra.append(el('p', ['Metodología', ...pila.map(p => p.titulo), titulo].join('  /  '), 'kit-mono kit-ven-ruta'), x);
      const cuerpo = el('div', null, 'kit-ven-cuerpo');
      nodos.forEach((n, k) => { n.style?.setProperty?.('--i', k); cuerpo.append(n); });
      v.append(barra, cuerpo);
      if (anterior) { anterior.v.classList?.add('atras'); anterior.v.inert = true; }
      else doc?.addEventListener?.('keydown', alTeclado);
      pila.push({ v, titulo, desde });
      capa.append(v); capa.hidden = false;
      if (portada) portada.inert = true;
      html?.classList?.add('kit-ven-abierta');
      x.focus?.({ preventScroll: true });
      return v;
    }
    function regresar() {
      const top = pila.pop(); if (!top) return;
      const prev = pila[pila.length - 1];
      const fin = () => { capa.replaceChildren(...pila.map(p => p.v)); if (!pila.length) capa.hidden = true; };
      if (prev) { prev.v.classList?.remove('atras'); prev.v.inert = false; }
      else { if (portada) portada.inert = false; html?.classList?.remove('kit-ven-abierta'); doc?.removeEventListener?.('keydown', alTeclado); }
      if (anima()) { top.v.classList?.add('saliendo'); top.v.inert = true; root.setTimeout(fin, 180); } else fin();
      top.desde?.focus?.({ preventScroll: true });
    }
    // Escape regresa un nivel, también si el foco quedó fuera de la ventana (por ejemplo, en el cuerpo de la página).
    const alTeclado = ev => { if (ev.key === 'Escape' && pila.length) { ev.preventDefault?.(); regresar(); } };
    capa.onkeydown = ev => { if (ev.key === 'Escape') { ev.stopPropagation?.(); alTeclado(ev); } };
    capa.onclick = ev => { if (ev.target === capa) regresar(); };

    // ---------- Primer vistazo ----------
    portada = el('section', null, 'kit-banda kit-banda-oscura kit-met-portada');
    const panel = el('div', null, 'kit-met-panel'), texto = el('div', null, 'kit-met-panel-texto');
    const marca = el('div', null, 'kit-met-marca');
    marca.append(mono('Módulo ' + m.romano + ', metodología'));
    if (m.estado === 'borrador') marca.append(el('span', 'Borrador en revisión', 'kit-met-estado'));
    const desc = el('div', null, 'kit-met-descripcion');
    desc.append(el('p', m.afirmacion, 'kit-met-afirmacion'), el('p', m.resumen, 'kit-met-texto'), el('p', m.cuando, 'kit-met-texto kit-met-cuando'));
    texto.append(marca, el('h2', m.nombre, 'kit-met-titulo'), desc);
    panel.append(texto, selector());

    const tiles = el('ul', null, 'kit-met-tiles');
    [[fichas.length, 'Estándares', 'internacionales que respaldan el método', ventanaEstandares],
      [etapas.length, 'Etapas', 'del proceso de debida diligencia de la OCDE', ventanaEtapas],
      [d.dimensiones.length, 'Dimensiones', 'en las que se lee el resultado', ventanaDimensiones],
      [d.totalCriterios, 'Criterios', `que agrupan ${num(d.totalIndicadores)} preguntas calificadas de 0 a 5`, ventanaCriterios]]
      .forEach(([n, rotulo, sub, fn], k) => {
        const cifra = el('span', num(n), 'kit-met-tile-num');
        const b = boton('kit-met-tile', cifra, el('span', rotulo, 'kit-met-tile-rotulo'), el('span', sub, 'kit-met-tile-sub'), el('span', 'Abrir', 'kit-met-tile-abrir'));
        b.setAttribute('aria-label', `${num(n)} ${rotulo.toLowerCase()} ${sub}. Abrir la ventana`); b.setAttribute('aria-haspopup', 'dialog');
        b.style?.setProperty?.('--i', k); b.onclick = () => fn(b);
        const li = el('li'); li.append(b); tiles.append(li); contar(cifra, n);
      });
    portada.append(panel, tiles);
    if (extra.empresa && extra.puedeEditar) {
      const pie = el('div', null, 'kit-met-portada-pie'), a = el('a', 'Ir a Alimentación', 'kit-met-pastilla');
      a.href = `#/${extra.modulo}/${extra.empresa}/alimentacion`; pie.append(a); portada.append(pie);
    }
    art.append(portada, capa);

    // Selector en arco: Metodología, Alimentación y Resultados (reemplaza las pestañas en el primer vistazo).
    function selector() {
      const nav = el('nav', null, 'kit-met-selector'); nav.setAttribute('aria-label', 'Secciones del módulo');
      const base = extra.empresa ? `#/${extra.modulo}/${extra.empresa}/` : '';
      const ops = [['Metodología', base + 'metodologia', true], ['Alimentación', extra.puedeEditar && base && base + 'alimentacion'], ['Resultados', base && base + 'resultados']]
        .filter(o => o[2] || o[1]);
      const C = [-120, 180], R = 300, p = g => [C[0] + R * Math.cos(g * Math.PI / 180), C[1] + R * Math.sin(g * Math.PI / 180)];
      const angulos = ops.length === 3 ? [-24, 0, 24] : ops.length === 2 ? [-12, 12] : [0];
      const dibujo = svg('svg', { class: 'kit-met-selector-arco', viewBox: '0 0 220 360', 'aria-hidden': 'true', focusable: 'false' });
      const [a0, a1] = [p(-36), p(36)];
      dibujo.append(svg('path', { d: `M${a0[0]} ${a0[1]}A${R} ${R} 0 0 1 ${a1[0]} ${a1[1]}`, class: 'kit-met-selector-linea' }));
      const ul = el('ul');
      ops.forEach(([nombre, href, actual], k) => {
        const [x, y] = p(angulos[k]);
        if (actual) dibujo.append(svg('circle', { cx: x, cy: y, r: 13, class: 'kit-met-selector-perilla' }), svg('circle', { cx: x, cy: y, r: 4.5, class: 'kit-hero-punto' }));
        else dibujo.append(svg('circle', { cx: x, cy: y, r: 5, class: 'kit-met-selector-punto' }));
        const li = el('li'), a = el('a', nombre, 'kit-met-selector-op' + (actual ? ' actual' : ''));
        a.href = href || '#'; if (actual) a.setAttribute('aria-current', 'page');
        if (li.style) { li.style.left = (x + 24) + 'px'; li.style.top = y + 'px'; }
        li.append(a); ul.append(li);
      });
      nav.append(dibujo, ul); return nav;
    }

    // ---------- Ventana: Estándares (portadas) ----------
    function ventanaEstandares(desde) {
      const pista = el('ul', null, 'kit-est-pista');
      fichas.forEach((f, i) => {
        const b = boton('kit-est-tarjeta', portadaDe(f), el('span', f.sigla, 'kit-est-tarjeta-sigla'), el('span', f.tipo, 'kit-est-tarjeta-tipo'));
        b.setAttribute('aria-label', `${f.sigla}: ${f.nombre}. Abrir la ficha`); b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => fichaEstandar(f, b);
        const li = el('li'); li.style?.setProperty?.('--i', i); li.append(b); pista.append(li);
      });
      const mover = s => () => pista.scrollBy?.({ left: s * (pista.clientWidth || 600) * .8, behavior: sinMovimiento() ? 'auto' : 'smooth' });
      const ant = boton('kit-est-flecha', el('span', '←')), sig = boton('kit-est-flecha', el('span', '→'));
      ant.setAttribute('aria-label', 'Ver los estándares anteriores'); sig.setAttribute('aria-label', 'Ver más estándares');
      ant.onclick = mover(-1); sig.onclick = mover(1);
      const carrusel = el('div', null, 'kit-est-carrusel'); carrusel.append(ant, pista, sig);
      abrir('Estándares', [...encabezado('Estándares', m.estandares.titular, m.estandares.intro), carrusel, pieCruce(`${num(fichas.length)} estándares. Toque una portada para ver su ficha.`)], desde, 'kit-ven-estandares');
    }
    function pieCruce(nota) {
      const pie = el('div', null, 'kit-ven-pie');
      if (nota) pie.append(el('p', nota, 'kit-met-nota'));
      if (d.sectores.length) { const b = boton('kit-met-pastilla', el('span', 'Ver el cruce de estándares')); b.setAttribute('aria-haspopup', 'dialog'); b.onclick = () => ventanaCruce(b); pie.append(b); }
      return pie;
    }
    const usos = f => {
      if (f.columna) return d.ordenEjes.filter(id => d.celda(id, f.columna).length).map(id => ({ id, n: d.celda(id, f.columna).length }));
      return d.ordenEjes.filter(id => d.marcos(id).some(x => x.startsWith(f.catalogo))).map(id => ({ id, n: 0 }));
    };
    function fichaEstandar(f, desde) {
      const lado = aDocumento(f, 'kit-est-ficha-portada', portadaDe(f), el('span', f.enlace_texto + ' ↗', 'kit-est-ficha-enlace'));
      const datos = el('div', null, 'kit-est-ficha-datos');
      datos.append(mono(f.tipo), el('h3', f.nombre, 'kit-est-ficha-titulo'), el('p', `${f.emisor}, ${f.anio}`, 'kit-est-ficha-emisor'),
        bloque('Metodología: ¿qué es?', parrafo(f.que_es)), bloque('Aplicación: ¿por qué y cómo lo usamos?', parrafo(f.por_que)));
      const cab = el('div', null, 'kit-est-ficha'); cab.append(lado, datos);
      const rel = el('ul', null, 'kit-est-relacion');
      (f.cruces || []).forEach(x => {
        const otro = porId.get(x.con); if (!otro) return;
        const b = boton('kit-est-relacion-boton', portadaDe(otro, 'kit-est-mini'), el('span', otro.sigla, 'kit-est-relacion-sigla'));
        b.setAttribute('aria-label', 'Abrir la ficha de ' + otro.sigla); b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => fichaEstandar(otro, b);
        const li = el('li'); li.append(b, el('span', x.texto, 'kit-est-relacion-texto')); rel.append(li);
      });
      const donde = usos(f), chips = el('ul', null, 'kit-met-chips');
      donde.forEach(u => chips.append(el('li', d.corto(u.id) + (u.n ? ` (${u.n})` : ''))));
      abrir(f.sigla, [cab, bloque('Relación con otros estándares', rel),
        desplegable(`Dónde se usa en el módulo: ${donde.length} de ${d.totalEjes} etapas y derechos`, donde.length ? chips : el('p', 'Se aplica al módulo en su conjunto.', 'kit-met-nota'), 'kit-met-despliega-linea'),
        pieCruce()], desde, 'kit-ven-ficha-estandar');
    }

    // ---------- Ventana: Cruce de estándares por sector ----------
    function ventanaCruce(desde) {
      const caja = el('div', null, 'kit-cruce'), etiqueta = el('label', null, 'kit-cruce-sector'), select = el('select');
      select.id = 'kit-cruce-sector-' + (++nDesp); etiqueta.htmlFor = select.id; etiqueta.append(el('span', 'Sector', 'kit-mono'), select);
      d.sectores.forEach(s => { const o = el('option', s.nombre); o.value = s.id; select.append(o); });
      select.value = d.sectores.some(s => s.id === m.estandares.cruce_sector) ? m.estandares.cruce_sector : d.sectores[0].id;
      const zona = el('div', null, 'kit-cruce-zona');
      function dibujar() {
        const sector = d.sectores.find(s => s.id === select.value) || d.sectores[0];
        zona.replaceChildren();
        if (!sector.grupos.length) { zona.append(el('p', 'El cruce de este sector está en preparación.', 'kit-met-nota')); return; }
        const cols = sector.columnas, region = el('div', null, 'kit-cruce-region'), tabla = el('table', null, 'kit-cruce-tabla');
        region.tabIndex = 0; region.setAttribute('role', 'region'); region.setAttribute('aria-label', 'Cruce de estándares, ' + sector.nombre);
        tabla.style?.setProperty?.('min-width', (12 + cols.length * 9) + 'rem');
        tabla.append(el('caption', 'Cruce de estándares, ' + sector.nombre, 'solo-lectores'));
        const thead = el('thead'), fila0 = el('tr'), thTema = el('th', 'Tema'); thTema.scope = 'col'; fila0.append(thTema);
        cols.forEach(col => {
          const th = el('th'); th.scope = 'col';
          const f = fichas.find(x => x.columna === col);
          if (f) { const b = boton('kit-cruce-col', portadaDe(f, 'kit-est-mini'), el('span', col)); b.setAttribute('aria-label', `${col}: abrir la ficha del estándar`); b.setAttribute('aria-haspopup', 'dialog'); b.onclick = () => fichaEstandar(f, b); th.append(b); }
          else { const s = el('span', null, 'kit-cruce-col kit-cruce-col-sin'); s.append(el('span', col.slice(0, 4), 'kit-est-mini kit-est-portada-tipo kit-cruce-sigla'), el('span', col)); th.append(s); }
          fila0.append(th);
        });
        thead.append(fila0); tabla.append(thead);
        sector.grupos.forEach(g => {
          const tb = el('tbody', null, 'kit-cruce-grupo'), tr0 = el('tr', null, 'kit-cruce-grupo-fila'), th0 = el('th'); th0.colSpan = cols.length + 1; th0.scope = 'colgroup';
          const refs = g.filas.reduce((s, f) => s + cols.reduce((t, col) => t + (f.celdas?.[col]?.length || 0), 0), 0);
          const b = boton('kit-cruce-grupo-boton', el('span', g.nombre, 'kit-cruce-grupo-nombre'), el('span', `${num(g.filas.length)} temas, ${num(refs)} referencias`, 'kit-cruce-grupo-sub'));
          let abierto = false; b.setAttribute('aria-expanded', 'false');
          th0.append(b); tr0.append(th0); tb.append(tr0);
          const filas = g.filas.map((fila, k) => {
            const tr = el('tr', null, 'kit-cruce-fila'), th = el('th', fila.tema); th.scope = 'row'; tr.append(th);
            cols.forEach(col => {
              const td = el('td'), refsC = fila.celdas?.[col] || [];
              if (!refsC.length) { const v = el('span', '–', 'kit-cruce-vacio'); v.setAttribute('aria-label', 'Sin correspondencia'); td.append(v); }
              refsC.forEach(r => { const it = el('div', null, 'kit-cruce-ref'); it.append(el('strong', r.codigo, 'kit-cruce-codigo'), el('span', r.nombre, 'kit-cruce-nombre')); if (r.ref) it.append(el('span', r.ref, 'kit-cruce-pagina')); td.append(it); });
              tr.append(td);
            });
            tr.hidden = true; tr.style?.setProperty?.('--i', k); tb.append(tr); return tr;
          });
          b.onclick = () => { abierto = !abierto; b.setAttribute('aria-expanded', String(abierto)); tb.classList?.toggle('abierto', abierto); filas.forEach(tr => { tr.hidden = !abierto; }); };
          tabla.append(tb);
        });
        region.append(tabla); zona.append(region);
        const fuentes = el('ul', null, 'kit-met-lista');
        Object.entries(sector.fuentes || {}).forEach(([est, t]) => { const li = el('li'); li.append(el('strong', est + ': '), el('span', t)); fuentes.append(li); });
        (sector.notas || []).forEach(t => fuentes.append(el('li', t)));
        if (fuentes.children.length) zona.append(desplegable('Fuentes y notas', fuentes, 'kit-met-despliega-linea'));
      }
      select.onchange = dibujar; dibujar();
      caja.append(etiqueta, zona);
      abrir('Cruce de estándares', [...encabezado(m.estandares.cruce_titulo, m.estandares.cruce_titular, m.estandares.cruce_intro), caja, el('p', m.estandares.cruce_nota, 'kit-met-nota')], desde, 'kit-ven-cruce');
    }

    // ---------- Ventana: Etapas (arco de la OCDE) ----------
    function arcoEtapas() {
      const diagrama = el('div', null, 'kit-serv-diagrama kit-met-diagrama'), angosta = root.matchMedia?.('(max-width: 860px)');
      const C = [260, 330], R0 = 175, R1 = 285, RN = 290, n = etapas.length, paso = 180 / n;
      const punto = (r, g) => [C[0] + r * Math.cos(g * Math.PI / 180), C[1] + r * Math.sin(g * Math.PI / 180)];
      const caja = angosta?.matches ? '92 0 545 660' : '0 0 1000 660';
      const dibujo = svg('svg', { class: 'kit-serv-svg', 'aria-hidden': 'true', focusable: 'false', viewBox: caja });
      dibujo.append(svg('path', { d: `M${C[0]} ${C[1] - 318}a318 318 0 0 1 0 636`, class: 'kit-serv-marco' }));
      const titulos = el('div', null, 'kit-serv-titulos');
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
        g.append(nodo); dibujo.append(g);
        const b = boton('kit-serv-titulo', el('span', dos(i), 'kit-mono'), el('span', e.titulo, 'kit-serv-titulo-texto'), el('span', `${num(d.indicadores(e.eje).length)} preguntas`, 'kit-serv-ver'));
        if (b.style) { b.style.top = (cy / 660 * 100) + '%'; b.style.setProperty?.('--i', i); }
        b.setAttribute('aria-label', `Etapa ${i + 1}: ${e.titulo}. Abrir la ficha`); b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => fichaEtapa(i, b); g.addEventListener?.('click', () => fichaEtapa(i, b));
        titulos.append(b);
      });
      const centro = svg('g', { class: 'kit-serv-centro' });
      centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
      const t0 = svg('text', { x: C[0], y: C[1] - 52, 'text-anchor': 'middle', class: 'kit-serv-centro-ante' }); t0.textContent = 'GUÍA OCDE'; centro.append(t0);
      m.metodo.frase.split('\n').slice(0, 2).forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 38, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' }); t.textContent = linea; centro.append(t); });
      centro.append(svg('circle', { cx: C[0], cy: C[1] + 90, r: 6, class: 'kit-hero-punto' }));
      dibujo.append(centro);
      diagrama.append(dibujo, el('p', 'Las seis etapas del proceso de debida diligencia.', 'solo-lectores'), titulos);
      diagrama.classList?.add('recarga');
      return diagrama;
    }
    function ventanaEtapas(desde) {
      abrir('Etapas', [...encabezado('El método', m.metodo.titular, m.metodo.intro), arcoEtapas()], desde, 'kit-ven-etapas');
    }
    function fichaEtapa(i, desde) {
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
      abrir('Etapa ' + (i + 1), [cabeza(String(i + 1), COLORES[i % 4], `Etapa ${dos(i)} de ${etapas.length}`, e.titulo),
        el('p', `${e.oficial}. Guía OCDE, paso ${i + 1}, ${e.pagina}.`, 'kit-met-oficial'), rej], desde, 'kit-ven-ficha');
    }

    // ---------- Ventana: Dimensiones y Derechos ----------
    function ventanaDimensiones(desde) {
      const ul = el('ul', null, 'kit-met-dimensiones');
      d.dimensiones.forEach((g, k) => {
        const esEtapas = g.id === 'etapas-ocde', n = g.ejes.length;
        const chips = lista((g.estandares || []).map(t => t.replace(/ · /g, ', ')), 'kit-met-chips');
        const b = boton('kit-met-dimension', mono('Dimensión ' + dos(k)), el('span', g.titulo, 'kit-met-dimension-titulo'), el('span', g.pregunta, 'kit-met-dimension-pregunta'),
          el('span', `${num(n)} ${esEtapas ? 'etapas' : 'derechos'}`, 'kit-met-dimension-cifra'), chips, el('span', esEtapas ? 'Ver las etapas' : 'Ver los derechos', 'kit-met-dimension-ver'));
        b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => esEtapas ? ventanaEtapas(b) : ventanaDerechos(b);
        const li = el('li'); li.append(b); ul.append(li);
      });
      abrir('Dimensiones', [...encabezado('Dimensiones', m.dimensiones?.titular || 'Dimensiones', m.dimensiones?.intro), ul], desde, 'kit-ven-dimensiones');
    }
    function ventanaDerechos(desde) {
      const rejilla = el('div', null, 'kit-met-celdas');
      m.temas.items.forEach((t, i) => {
        const nombre = d.ejes.get(t.eje)?.nombre || '';
        const b = boton('kit-met-celda', el('span', dos(i), 'kit-mono'), el('span', d.corto(t.eje), 'kit-met-celda-titulo'), el('span', `${num(d.indicadores(t.eje).length)} preguntas`, 'kit-met-celda-sub'));
        b.style?.setProperty?.('--color', COLORES[i % 4]); b.style?.setProperty?.('--i', i);
        b.setAttribute('aria-label', `Derecho ${i + 1}: ${nombre}. Abrir la ficha`); b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => abrir(d.corto(t.eje), [
          cabeza(dos(i), COLORES[i % 4], `Derecho ${dos(i)} de ${m.temas.items.length}`, nombre),
          bloque('Qué protege', parrafo(t.protege)),
          bloque('Marco de referencia', lista(d.marcos(t.eje), 'kit-met-chips')),
          bloque(`Así se pregunta: ${num(d.indicadores(t.eje).length)} preguntas en total`, preguntas(t.eje, 3))
        ], b, 'kit-ven-ficha');
        rejilla.append(b);
      });
      abrir('Derechos', [...encabezado('Los derechos', m.temas.titular, m.temas.intro), rejilla], desde, 'kit-ven-derechos');
    }

    // ---------- Ventana: Criterios (cómo se califica) ----------
    function ventanaCriterios(desde) {
      const escala = el('ol', null, 'kit-met-escala');
      d.escala.forEach(nv => {
        const li = el('li'); li.style?.setProperty?.('--color', d.color(nv.valor) || 'var(--borde)');
        li.append(el('span', String(nv.valor), 'kit-met-escala-num'), el('span', nv.nombre, 'kit-met-escala-nombre'), el('span', nv.descripcion, 'kit-met-escala-texto'));
        escala.append(li);
      });
      const calculo = el('ol', null, 'kit-met-calculo');
      [[d.totalIndicadores, 'preguntas', 'Cada una se califica de 0 a 5 con su evidencia.'],
        [d.totalCriterios, 'criterios', 'Promedio de sus preguntas.'],
        [d.totalEjes, 'etapas y derechos', 'Promedio de sus criterios. Los derechos sin criterios promedian sus preguntas.'],
        [d.dimensiones.length, 'dimensiones', 'Promedio de sus etapas o de sus derechos.']]
        .forEach(([v, t, x]) => { const li = el('li'); li.append(el('span', '# ' + num(v), 'kit-dato-cifra'), el('span', t, 'kit-met-calculo-rotulo'), el('span', x, 'kit-dato-texto')); calculo.append(li); });
      const cortes = el('div', null, 'kit-met-cortes'), cs = d.umbrales.cortes;
      cs.forEach((c, k) => {
        const desde0 = k ? cs[k - 1].menor_que : d.umbrales.escala.minimo;
        const rango = c.menor_que === null ? `${num(desde0)} o más` : k ? `De ${num(desde0)} a menos de ${num(c.menor_que)}` : `Menos de ${num(c.menor_que)}`;
        const s = el('span', rango, 'kit-met-corte'); s.style?.setProperty?.('--color', c.color); if (s.style) s.style.flexGrow = String((c.menor_que ?? d.umbrales.escala.maximo) - desde0);
        cortes.append(s);
      });
      const reglas = el('ol', null, 'kit-met-reglas');
      m.calificacion.reglas.forEach((r, i) => { const li = el('li'); li.append(desplegable([el('span', dos(i), 'kit-mono'), el('strong', r.titulo)], el('p', r.texto, 'kit-met-texto'), 'kit-met-regla')); reglas.append(li); });
      const nodos = [...encabezado('Cómo se califica', m.calificacion.titular, m.calificacion.intro), escala,
        mono('Del dato al resultado', 'kit-ficha-sub'), calculo, mono('Colores en los Resultados', 'kit-ficha-sub'), cortes];
      if (d.umbrales.hipotesis) nodos.push(el('p', 'Cortes de color en validación con el equipo técnico.', 'kit-met-nota'));
      nodos.push(mono('Reglas', 'kit-ficha-sub'), reglas);
      abrir('Criterios', nodos, desde, 'kit-ven-criterios');
    }

    c.append(art);
    // Al salir de la vista (cambio de ruta) se libera el bloqueo del scroll de la página.
    return () => { html?.classList?.remove('kit-ven-abierta'); doc?.removeEventListener?.('keydown', alTeclado); };
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
      return pintar(c, m, { datos: d, modulo, empresa: p?.empresa, puedeEditar: p?.puedeEditar });
    }
  });
  const api = { pintar, vista, datosDdhh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitVistaMetodologia = api;
  if (root.App) ['actores', 'ddhh', 'materialidad', 'riesgos'].forEach(m => root.App.registrarVista(m + '/metodologia', vista(m)));
}(typeof window !== 'undefined' ? window : globalThis));
