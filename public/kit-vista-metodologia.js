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
    const bloque = (rotulo, ...hijos) => { const s = el('section', null, 'kit-met-bloque'); s.append(mono(rotulo, 'kit-ficha-sub'), ...hijos); return s; };
    const parrafo = t => el('p', t, 'kit-met-texto');
    const lista = (items, clase = 'kit-met-lista') => { const ul = el('ul', null, clase); items.forEach(t => ul.append(typeof t === 'string' ? el('li', t) : t)); return ul; };
    const encabezado = (ante, titular, intro) => [mono(ante, 'kit-ven-ante'), el('h2', titular, 'kit-titular kit-ven-titular'), ...(intro ? [el('p', intro, 'kit-met-intro')] : [])];
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
      [etapas.length, 'Etapas', 'del proceso de debida diligencia de la OCDE', b => ventanaProceso(b, 'etapas')],
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

    // ---------- Ventana: Proceso (boceto 261108_Metodologicos_Proceso) ----------
    // Dos partes en la misma ventana: Incorporación de la debida diligencia (6 etapas OCDE) y Gestión de DDHH (10 derechos).
    // Cada etapa o derecho abre su ficha, y la ficha abre la ventana de preguntas.
    const CIRC = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    const ICONOS = {
      'etapa-ocde-1': 'M6 3h8l4 4v14H6zM14 3v4h4M9 13l2 2 4-4',
      'etapa-ocde-2': CIRC(10, 10, 6) + 'M14.5 14.5L20 20',
      'etapa-ocde-3': 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6zM9 12l2 2 4-4',
      'etapa-ocde-4': 'M4 4v16h16M7 15l4-4 3 3 5-6',
      'etapa-ocde-5': 'M4 5h16v11H10l-5 4v-4H4zM8 9h8M8 12h5',
      'etapa-ocde-6': 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
      'tema-ddhh-1': 'M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6l-1.2 1.2M14 10a4 4 0 0 1 0 5.6l-2.4 2.4a4 4 0 0 1-5.6-5.6l1.2-1.2',
      'tema-ddhh-2': CIRC(12, 5, 2) + 'M12 8v6M8 11h8M10 21l2-7 2 7',
      'tema-ddhh-3': CIRC(12, 12, 8) + 'M8.5 10h7M8.5 14h7',
      'tema-ddhh-4': 'M12 4v16M8 20h8M5 7h14M5 7l-2.5 6h5zM19 7l-2.5 6h5z',
      'tema-ddhh-5': CIRC(8, 8, 2.5) + CIRC(16, 8, 2.5) + 'M3 19c0-3 2-5 5-5s5 2 5 5M11 19c0-3 2-5 5-5s5 2 5 5',
      'tema-ddhh-6': 'M3 17h18M5 17a7 7 0 0 1 14 0M10 10V6.5h4V10',
      'tema-ddhh-7': CIRC(12, 12, 8) + 'M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11',
      'tema-ddhh-8': CIRC(12, 12, 8) + 'M12 8v4l3 2',
      'tema-ddhh-9': 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
      'tema-ddhh-10': 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l8-8'
    };
    const icono = (eje, clase = 'kit-pro-icono') => {
      const s = svg('svg', { class: clase, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
      s.append(svg('path', { d: ICONOS[eje] || CIRC(12, 12, 6) })); return s;
    };
    // Las dos partes del proceso, armadas con el texto de la config y las cifras del catálogo.
    const partes = {
      etapas: {
        nav: 'Incorporación de la DD', ante: 'Incorporación de la debida diligencia', titular: m.metodo.titular, intro: m.metodo.intro,
        centro: ['GUÍA OCDE', m.metodo.frase], unidad: 'Etapa',
        items: etapas.map(e => ({ eje: e.eje, titulo: e.titulo, fuente: e }))
      },
      derechos: {
        nav: 'Gestión de DDHH', ante: 'Gestión de derechos humanos', titular: m.temas.titular, intro: m.temas.intro,
        centro: ['DERECHOS', 'Gestión\nde DDHH'], unidad: 'Derecho',
        items: m.temas.items.map(t => ({ eje: t.eje, titulo: d.corto(t.eje), fuente: t }))
      }
    };
    // Estándar que respalda: cada marco del catálogo se enlaza al documento de su ficha. Si no hay ficha, queda como texto.
    const fichaDeMarco = t => fichas.find(f => [f.sigla, f.columna, f.catalogo].filter(Boolean).some(s => t.startsWith(s))) || (/OIT|Protocolo de 2014/.test(t) ? porId.get('oit') : null);

    function arcoProceso(parte, cual) {
      const items = parte.items, n = items.length, denso = n > 6;
      const diagrama = el('div', null, 'kit-serv-diagrama kit-met-diagrama' + (denso ? ' kit-pro-denso' : '')), angosta = root.matchMedia?.('(max-width: 860px)');
      const C = [260, 330], R0 = 175, R1 = 285, RN = 290, paso = 180 / n;
      const punto = (r, g) => [C[0] + r * Math.cos(g * Math.PI / 180), C[1] + r * Math.sin(g * Math.PI / 180)];
      const dibujo = svg('svg', { class: 'kit-serv-svg', 'aria-hidden': 'true', focusable: 'false', viewBox: angosta?.matches ? '92 0 545 660' : '0 0 1000 660' });
      dibujo.append(svg('path', { d: `M${C[0]} ${C[1] - 318}a318 318 0 0 1 0 636`, class: 'kit-serv-marco' }));
      const titulos = el('div', null, 'kit-serv-titulos');
      items.forEach((it, i) => {
        const a0 = -90 + i * paso + 1, a1 = -90 + (i + 1) * paso - 1, medio = -90 + (i + .5) * paso, col = COLORES[i % 4];
        const [x0, y0] = punto(R1, a0), [x1, y1] = punto(R1, a1), [x2, y2] = punto(R0, a1), [x3, y3] = punto(R0, a0);
        const g = svg('g', { class: 'kit-serv-seg', style: `--i:${i}` });
        g.append(svg('path', { d: `M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`, fill: col }));
        const [cx, cy] = punto(RN, medio), rn = denso ? 26 : 38;
        // Los rótulos se reparten parejo a la derecha, para que no se monten (sobre todo con los 10 derechos).
        const ty = n > 1 ? (denso ? 36 : 60) + i * ((denso ? 588 : 540) / (n - 1)) : cy;
        g.append(svg('line', { x1: cx + rn + 2, y1: cy, x2: 702, y2: ty, class: 'kit-serv-guia' }), svg('circle', { cx: 714, cy: ty, r: 8, class: 'kit-serv-anillo' }));
        const nodo = svg('g', { class: 'kit-serv-nodo', transform: `translate(${cx} ${cy})` });
        const ic = svg('g', { class: 'kit-pro-nodo-icono', transform: `translate(${-rn * .55} ${-rn * .55}) scale(${rn * 1.1 / 24})`, stroke: col });
        ic.append(svg('path', { d: ICONOS[it.eje] || CIRC(12, 12, 6) }));
        nodo.append(svg('circle', { r: rn, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: rn - 5, class: 'kit-serv-nodo-aro', stroke: col }), ic);
        g.append(nodo); dibujo.append(g);
        const b = boton('kit-serv-titulo', el('span', dos(i), 'kit-mono'), el('span', it.titulo, 'kit-serv-titulo-texto'), el('span', `${num(d.indicadores(it.eje).length)} preguntas`, 'kit-serv-ver'));
        if (b.style) { b.style.top = (ty / 660 * 100) + '%'; b.style.setProperty?.('--i', i); }
        b.setAttribute('aria-label', `${parte.unidad} ${i + 1}: ${it.titulo}. Abrir la ficha`); b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => fichaProceso(cual, i, b); g.addEventListener?.('click', () => fichaProceso(cual, i, b));
        titulos.append(b);
      });
      const centro = svg('g', { class: 'kit-serv-centro' });
      centro.append(svg('circle', { cx: C[0], cy: C[1], r: 158 }));
      const t0 = svg('text', { x: C[0], y: C[1] - 52, 'text-anchor': 'middle', class: 'kit-serv-centro-ante' }); t0.textContent = parte.centro[0]; centro.append(t0);
      parte.centro[1].split('\n').slice(0, 2).forEach((linea, k) => { const t = svg('text', { x: C[0], y: C[1] + 4 + k * 38, 'text-anchor': 'middle', class: 'kit-serv-centro-frase' }); t.textContent = linea; centro.append(t); });
      centro.append(svg('circle', { cx: C[0], cy: C[1] + 90, r: 6, class: 'kit-hero-punto' }));
      dibujo.append(centro);
      diagrama.append(dibujo, el('p', `${parte.unidad === 'Etapa' ? 'Las seis etapas del proceso de debida diligencia' : 'Los diez derechos que se gestionan'}.`, 'solo-lectores'), titulos);
      diagrama.classList?.add('recarga');
      return diagrama;
    }
    function ventanaProceso(desde, cual = 'etapas') {
      const cuerpo = el('div', null, 'kit-pro'), nav = el('nav', null, 'kit-pro-nav'), zona = el('div', null, 'kit-pro-zona');
      nav.setAttribute('aria-label', 'Partes del proceso');
      const botones = Object.entries(partes).map(([k, p]) => {
        const b = boton('kit-pro-nav-boton', el('span', p.nav)); b.dataset && (b.dataset.parte = k);
        b.onclick = () => mostrar(k); return [k, b];
      });
      function mostrar(k) {
        cual = k; const p = partes[k];
        botones.forEach(([kk, b]) => { b.setAttribute('aria-pressed', String(kk === k)); b.classList?.toggle('actual', kk === k); });
        zona.replaceChildren(...encabezado(p.ante, p.titular, p.intro), arcoProceso(p, k));
      }
      nav.append(...botones.map(x => x[1])); cuerpo.append(nav, zona); mostrar(cual);
      abrir('Proceso', [cuerpo], desde, 'kit-ven-proceso');
    }
    function fichaProceso(cual, i, desde) {
      const p = partes[cual], it = p.items[i], eje = d.ejes.get(it.eje), f = it.fuente, esEtapa = cual === 'etapas';
      const total = d.indicadores(it.eje).length;
      const cab = el('header', null, 'kit-pro-cabeza'), sello = el('span', null, 'kit-pro-sello');
      sello.style?.setProperty?.('--color', COLORES[i % 4]); sello.append(icono(it.eje));
      const tit = el('div'); tit.append(mono(`${p.unidad} ${dos(i)} de ${p.items.length}`), el('h3', it.titulo, 'kit-pro-titulo'));
      cab.append(sello, tit);
      // Referencia: el nombre oficial y dónde está en el estándar, con enlace al documento.
      const ref = el('div', null, 'kit-pro-ref');
      if (esEtapa) {
        const ocde = porId.get('ocde');
        ref.append(el('p', f.oficial + '.', 'kit-met-oficial'));
        if (ocde) ref.append(aDocumento(ocde, 'kit-pro-enlace', el('span', `Guía OCDE, paso ${i + 1}, ${f.pagina}`), el('span', ' ↗')));
      } else ref.append(el('p', (eje?.nombre || it.titulo) + '.', 'kit-met-oficial'));
      // Estándares que la respaldan, cada uno con enlace a su documento en línea.
      const respaldo = el('ul', null, 'kit-pro-respaldo');
      d.marcos(it.eje).forEach(t => {
        const fi = fichaDeMarco(t), li = el('li');
        li.append(fi ? aDocumento(fi, 'kit-pro-enlace', el('span', t), el('span', ' ↗')) : el('span', t)); respaldo.append(li);
      });
      const caja = (clase, rotulo, ...hijos) => { const s = el('section', null, 'kit-pro-caja ' + clase); s.append(mono(rotulo, 'kit-pro-rotulo'), ...hijos); return s; };
      const derecha = el('div', null, 'kit-pro-derecha');
      if (esEtapa && f.evidencia) derecha.append(caja('kit-pro-evidencias', 'Evidencias', parrafo(f.evidencia)));
      derecha.append(caja('kit-pro-estandar', esEtapa ? 'Estándares que la respaldan' : 'Estándares que lo respaldan', respaldo));
      const bp = boton('kit-pro-preguntar', el('span', '¿Qué preguntamos?', 'kit-pro-preguntar-texto'), el('span', `${num(total)} preguntas`, 'kit-mono'));
      bp.setAttribute('aria-haspopup', 'dialog'); bp.onclick = () => ventanaPreguntas(it, eje, bp);
      derecha.append(bp);
      const analiza = el('div', null, 'kit-pro-analiza');
      const crit = (eje?.componentes || []);
      if (crit.length) {
        const ul = el('ul', null, 'kit-pro-busca');
        crit.forEach(c => { const li = el('li'); li.append(el('strong', c.nombre), el('span', c.descripcion || '')); ul.append(li); });
        analiza.append(caja('kit-pro-izq', 'Qué buscamos', ul));
      } else analiza.classList?.add('kit-pro-solo');
      analiza.append(derecha);
      abrir(it.titulo, [cab, el('p', 'Referencia', 'kit-mono kit-pro-sub'), ref,
        el('h4', esEtapa ? '¿Qué pide el estándar?' : '¿Qué protege?', 'kit-pro-pregunta'), parrafo(esEtapa ? f.pide : f.protege),
        el('h4', '¿Qué analizamos?', 'kit-pro-pregunta'), analiza], desde, 'kit-ven-ficha kit-ven-pro-ficha');
    }
    function ventanaPreguntas(it, eje, desde) {
      const todas = d.indicadores(it.eje), grupos = el('div', null, 'kit-pro-preguntas');
      const fila = q => { const li = el('li'); li.append(el('span', q.codigo, 'kit-mono'), el('span', q.pregunta)); return li; };
      const crit = eje?.componentes || [];
      if (crit.length > 1) crit.forEach(c => {
        const qs = todas.filter(q => q.componente === c.id); if (!qs.length) return;
        const s = el('section'); const ol = el('ol'); qs.forEach(q => ol.append(fila(q)));
        s.append(el('h4', c.nombre, 'kit-pro-grupo'), ol); grupos.append(s);
      });
      else { const ol = el('ol'); todas.forEach(q => ol.append(fila(q))); grupos.append(ol); }
      abrir('Preguntas', [mono(it.titulo, 'kit-ven-ante'), el('h2', '¿Qué preguntamos?', 'kit-titular kit-ven-titular'),
        el('p', `${num(todas.length)} preguntas, tal como se le formulan a la empresa. Cada una se califica de 0 a 5 con su evidencia.`, 'kit-met-intro'), grupos], desde, 'kit-ven-preguntas');
    }

    // ---------- Ventana: Dimensiones ----------
    function ventanaDimensiones(desde) {
      const ul = el('ul', null, 'kit-met-dimensiones');
      d.dimensiones.forEach((g, k) => {
        const esEtapas = g.id === 'etapas-ocde', n = g.ejes.length;
        const chips = lista((g.estandares || []).map(t => t.replace(/ · /g, ', ')), 'kit-met-chips');
        const b = boton('kit-met-dimension', mono('Dimensión ' + dos(k)), el('span', g.titulo, 'kit-met-dimension-titulo'), el('span', g.pregunta, 'kit-met-dimension-pregunta'),
          el('span', `${num(n)} ${esEtapas ? 'etapas' : 'derechos'}`, 'kit-met-dimension-cifra'), chips, el('span', esEtapas ? 'Ver las etapas' : 'Ver los derechos', 'kit-met-dimension-ver'));
        b.setAttribute('aria-haspopup', 'dialog');
        b.onclick = () => ventanaProceso(b, esEtapas ? 'etapas' : 'derechos');
        const li = el('li'); li.append(b); ul.append(li);
      });
      abrir('Dimensiones', [...encabezado('Dimensiones', m.dimensiones?.titular || 'Dimensiones', m.dimensiones?.intro), ul], desde, 'kit-ven-dimensiones');
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
