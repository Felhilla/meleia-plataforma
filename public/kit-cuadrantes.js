/* E65 (boceto de Felipe del 9-nov): lectura de resultados por cuadrantes, común a los módulos I y III.
   - general(): matriz de cuatro cuadrantes iguales; en cada uno, un círculo por grupo (ícono y número).
     Cada cuadrante es un botón que abre su zoom.
   - zoom(): el cuadrante ampliado con cada elemento en su posición real. Los primeros (GRANDES) llevan burbuja,
     ícono y nombre; los demás son puntos pequeños sin nombre. Si varios quedan en el mismo lugar, un punto negro
     marca la posición real y líneas punteadas llevan a cada uno.
   - ventana(): ventana centrada con el fondo difuminado, apilable (Escape cierra solo la de arriba). */
(function (root) {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const GRANDES = 7;
  function svg(tag, attrs = {}) { const n = root.document.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }
  function texto(x, y, valor, clase, ancla = 'middle') { const t = svg('text', { x, y, 'text-anchor': ancla, class: clase }); t.textContent = valor; return t; }
  function icono(href, x, y, lado) { return svg('image', { href, x: x - lado / 2, y: y - lado / 2, width: lado, height: lado, 'aria-hidden': 'true' }); }
  function comoBoton(n, etiqueta, fn) {
    n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button'); n.setAttribute('aria-label', etiqueta);
    const t = svg('title'); t.textContent = etiqueta; n.append(t);
    n.addEventListener('click', fn); n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    return n;
  }
  function lineasNombre(nombre, max = 18) {
    const lineas = [''];
    String(nombre).split(/\s+/).forEach(p => { const a = lineas.at(-1); if (!a) lineas[lineas.length - 1] = p; else if ((a + ' ' + p).length <= max) lineas[lineas.length - 1] = a + ' ' + p; else lineas.push(p); });
    if (lineas.length > 2) { lineas.length = 2; lineas[1] = lineas[1].slice(0, max - 1) + '…'; }
    return lineas.map(l => l.length > max + 4 ? l.slice(0, max + 3) + '…' : l);
  }
  function ejes(g, A, H, m, x, y) {
    g.append(texto(m.i + (A - m.i - m.d) / 2, H - 6, x + ' →', 'ka-eje-nombre'));
    const cy = m.s + (H - m.s - m.b) / 2, ey = texto(14, cy, y + ' →', 'ka-eje-nombre'); ey.setAttribute('transform', `rotate(-90 14 ${cy})`); g.append(ey);
  }
  // cuadrantes: [{ nombre, izq, arriba, clase, cuenta, grupos: [{ nombre, color, icono, n }] }]
  function general({ cuadrantes, ejeX, ejeY, etiqueta, numero, alZoom }) {
    const A = 720, H = 480, m = { i: 30, d: 6, s: 6, b: 28 }, w = A - m.i - m.d, h = H - m.s - m.b, cx = m.i + w / 2, cy = m.s + h / 2;
    const g = svg('svg', { viewBox: `0 0 ${A} ${H}`, role: 'group', 'aria-label': etiqueta, class: 'ka-matriz-svg ka-general' });
    const maximo = Math.max(1, ...cuadrantes.flatMap(c => c.grupos.map(x => x.n)));
    cuadrantes.forEach(c => {
      const x0 = c.izq ? m.i : cx, y0 = c.arriba ? m.s : cy, grupo = svg('g', { class: 'ka-cuadrante-boton' }), items = c.grupos.filter(x => x.n);
      grupo.append(svg('rect', { x: x0, y: y0, width: w / 2, height: h / 2, class: 'ka-zona ' + c.clase }));
      grupo.append(texto(x0 + 14, y0 + 24, c.nombre, 'ka-zona-nombre', 'start'), texto(x0 + 14, y0 + 42, c.cuenta, 'ka-zona-cuenta', 'start'));
      const filas = []; for (let i = 0; i < items.length; i += 3) filas.push(items.slice(i, i + 3));
      const altoFila = (h / 2 - 60) / Math.max(1, filas.length), rMax = filas.length > 1 ? 30 : 40;
      filas.forEach((fila, f) => fila.forEach((it, j) => {
        const x = x0 + (w / 2) * (j + 1) / (fila.length + 1), r = 13 + (rMax - 13) * Math.sqrt(it.n / maximo), yc = y0 + 52 + altoFila * (f + .5) - 9;
        grupo.append(svg('circle', { cx: x, cy: yc, r, class: 'ka-gi-circulo', fill: it.color, stroke: it.color }), icono(it.icono, x, yc, r * 1.15));
        const t = texto(x, yc + r + 17, numero(it.n), 'ka-gi-numero'); t.setAttribute('fill', it.color); grupo.append(t);
      }));
      if (!items.length) grupo.append(texto(x0 + w / 4, y0 + h / 4 + 10, 'Sin elementos', 'ka-zona-vacia'));
      comoBoton(grupo, `${c.nombre}: ${c.cuenta}${items.length ? ' (' + items.map(it => `${it.nombre} ${numero(it.n)}`).join(', ') + ')' : ''}. Ampliar el cuadrante`, () => alZoom(c));
      g.append(grupo);
    });
    g.append(svg('line', { x1: cx, y1: m.s, x2: cx, y2: m.s + h, class: 'ka-cruz' }), svg('line', { x1: m.i, y1: cy, x2: m.i + w, y2: cy, class: 'ka-cruz' }));
    ejes(g, A, H, m, ejeX, ejeY);
    return g;
  }
  // Ubica sin superponer. Las posiciones compartidas quedan libres (punto negro) y sus elementos se reparten alrededor.
  function acomodar(nodos, lim) {
    const cuenta = new Map(); nodos.forEach(n => { n.clave = Math.round(n.ax) + ',' + Math.round(n.ay); cuenta.set(n.clave, (cuenta.get(n.clave) || 0) + 1); });
    const fijos = [...cuenta].filter(([, c]) => c > 1).map(([k]) => { const [x, y] = k.split(',').map(Number); return { x, y, hw: 7, hh: 7, oy: 0 }; });
    const vistos = new Map();
    nodos.forEach((n, i) => { const k = vistos.get(n.clave) || 0; vistos.set(n.clave, k + 1); const a = k * 2.39996 + i * .001, d = cuenta.get(n.clave) > 1 ? 18 + 9.6 * Math.sqrt(k) : 0; n.x = n.ax + Math.cos(a) * d; n.y = n.ay + Math.sin(a) * d; });
    const separar = (p, q, soloQ) => {
      const dx = q.x - p.x, dy = (q.y + q.oy) - (p.y + p.oy), sx = p.hw + q.hw + 4 - Math.abs(dx), sy = p.hh + q.hh + 4 - Math.abs(dy);
      if (sx <= 0 || sy <= 0) return;
      if (sx < sy) { const s = (dx >= 0 ? 1 : -1) * sx; if (soloQ) q.x += s; else { p.x -= s / 2; q.x += s / 2; } }
      else { const s = (dy >= 0 ? 1 : -1) * sy; if (soloQ) q.y += s; else { p.y -= s / 2; q.y += s / 2; } }
    };
    for (let paso = 0; paso < 280; paso++) {
      for (let i = 0; i < nodos.length; i++) for (let j = i + 1; j < nodos.length; j++) separar(nodos[i], nodos[j]);
      nodos.forEach(n => { fijos.forEach(f => separar(f, n, true)); n.x += (n.ax - n.x) * .015; n.y += (n.ay - n.y) * .015; n.x = Math.min(lim.x1 - n.hw, Math.max(lim.x0 + n.hw, n.x)); n.y = Math.min(lim.y1 - n.hh - n.oy, Math.max(lim.y0 + n.hh - n.oy, n.y)); });
    }
  }
  // puntos (en orden de prioridad): [{ nombre, x, y, color, icono, clase, etiqueta, dato }]
  function zoom({ xr, yr, ejeX, ejeY, puntos, numero, abrir, etiqueta, grandes = GRANDES }) {
    const A = 900, H = 600, m = { i: 46, d: 14, s: 14, b: 40 }, bx = 80, by = 46;
    const X = v => m.i + bx + (v - xr[0]) / (xr[1] - xr[0]) * (A - m.i - m.d - 2 * bx), Y = v => H - m.b - by - (v - yr[0]) / (yr[1] - yr[0]) * (H - m.s - m.b - 2 * by);
    const g = svg('svg', { viewBox: `0 0 ${A} ${H}`, role: 'group', 'aria-label': etiqueta, class: 'ka-matriz-svg ka-zoom-svg' });
    g.append(svg('rect', { x: m.i, y: m.s, width: A - m.i - m.d, height: H - m.s - m.b, class: 'ka-zoom-area' }));
    const marcas = r => { const largo = r[1] - r[0], paso = largo <= 1 ? .25 : largo <= 2.5 ? .5 : 1, v = [r[0], r[1]]; for (let t = Math.ceil(r[0] / paso) * paso; t < r[1] - 1e-9; t += paso) if (t > r[0] + paso * .4 && t < r[1] - paso * .4) v.push(Math.round(t * 100) / 100); return v.sort((a, b) => a - b); };
    marcas(xr).forEach(v => g.append(svg('line', { x1: X(v), y1: m.s, x2: X(v), y2: H - m.b, class: 'ka-guia' }), texto(X(v), H - m.b + 18, numero(v), 'ka-eje-valor')));
    marcas(yr).forEach(v => g.append(svg('line', { x1: m.i, y1: Y(v), x2: A - m.d, y2: Y(v), class: 'ka-guia' }), texto(m.i - 8, Y(v) + 4, numero(v), 'ka-eje-valor', 'end')));
    ejes(g, A, H, m, ejeX, ejeY);
    const nodos = puntos.map((p, i) => { const grande = i < grandes; return { p, grande, ax: X(p.x), ay: Y(p.y), hw: grande ? 64 : 8, hh: grande ? 46 : 8, oy: grande ? 18 : 0 }; });
    acomodar(nodos, { x0: m.i + 4, x1: A - m.d - 4, y0: m.s + 4, y1: H - m.b - 4 });
    const lineas = svg('g'), anclas = svg('g'), chicos = svg('g'), burbujas = svg('g'), vistas = new Set();
    nodos.forEach(n => {
      if (Math.hypot(n.x - n.ax, n.y - n.ay) > 4) {
        lineas.append(svg('line', { x1: n.ax, y1: n.ay, x2: n.x, y2: n.y, class: 'ka-guia-punteada' }));
        const k = Math.round(n.ax) + ',' + Math.round(n.ay); if (!vistas.has(k)) { vistas.add(k); anclas.append(svg('circle', { cx: n.ax, cy: n.ay, r: 6, class: 'ka-ancla' })); }
      }
      const { p } = n;
      if (!n.grande) { chicos.append(comoBoton(svg('circle', { cx: n.x, cy: n.y, r: 6.5, fill: p.color, class: 'ka-punto-chico ' + p.clase, 'data-id': p.id || '' }), p.etiqueta, () => abrir(p.dato, n))); return; }
      const b = svg('g', { class: 'ka-burbuja', 'data-id': p.id || '' });
      b.append(svg('circle', { cx: n.x, cy: n.y, r: 26, class: 'ka-gi-circulo', fill: p.color, stroke: p.color }), icono(p.icono, n.x, n.y, 30), svg('circle', { cx: n.x + 20, cy: n.y - 20, r: 8, class: 'ka-fav ' + p.clase }));
      lineasNombre(p.nombre).forEach((l, i) => { const t = texto(n.x, n.y + 44 + i * 15, l, 'ka-zoom-nombre'); t.setAttribute('fill', p.color); b.append(t); });
      burbujas.append(comoBoton(b, p.etiqueta, () => abrir(p.dato, b)));
    });
    g.append(lineas, anclas, chicos, burbujas);
    return g;
  }
  function resumen(datos, el) {
    const s = el('ul', null, 'ka-zoom-resumen');
    datos.forEach(([n, rotulo, clase, color]) => { const li = el('li', null, 'ka-zoom-dato ka-zoom-' + clase); if (color) li.style.setProperty('--dato', color); li.append(el('strong', n), el('span', rotulo)); s.append(li); });
    return s;
  }
  function leyenda(items, el, clase = 'ka-leyenda-fav') {
    const l = el('div', null, clase); items.forEach(([nombre, c]) => l.append(el('span', nombre, 'ka-conv-fav ' + c))); return l;
  }
  const pila = [];
  function ventana(titulo, clase, el) {
    const doc = root.document, origen = doc.activeElement, fondo = el('div', null, 'ka-fondo ka-fondo-centro ka-fondo-difuso'), panel = el('section', null, 'ka-dialogo ' + clase);
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    const h = root.App?.tituloMarca ? root.App.tituloMarca(titulo, 'h2') : el('h2', titulo); h.id = 'kc-titulo-' + pila.length; panel.setAttribute('aria-labelledby', h.id);
    const regiones = [...doc.querySelectorAll('body > header, body > main, body > footer, body > .saltar')].map(n => [n, n.inert]); regiones.forEach(([n]) => { n.inert = true; });
    const cerrarB = el('button', '×', 'kit-cerrar'); cerrarB.type = 'button'; cerrarB.setAttribute('aria-label', 'Cerrar');
    let cerrado = false;
    const cerrar = () => { if (cerrado) return; cerrado = true; const i = pila.indexOf(cerrar); if (i >= 0) pila.splice(i, 1); doc.removeEventListener('keydown', teclado); fondo.remove(); if (!pila.length) regiones.forEach(([n, previo]) => { n.inert = previo; }); if (origen?.isConnected) origen.focus?.(); };
    const teclado = e => { if ([...doc.body.children].at(-1) !== fondo) return; if (e.key === 'Escape') { e.preventDefault(); cerrar(); } };
    cerrarB.onclick = cerrar; fondo.onclick = e => { if (e.target === fondo) { while (pila.length) pila.at(-1)(); } };
    panel.append(cerrarB, h); fondo.append(panel); doc.body.append(fondo); doc.addEventListener('keydown', teclado); pila.push(cerrar); cerrarB.focus();
    return { panel, cerrar };
  }
  ventana.arriba = () => pila.length > 0;
  ventana.cerrarTodas = () => { while (pila.length) pila.at(-1)(); };
  const api = { GRANDES, svg, texto, icono, comoBoton, lineasNombre, acomodar, general, zoom, resumen, leyenda, ventana };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitCuadrantes = api;
}(typeof window !== 'undefined' ? window : globalThis));
