(function () {
  'use strict';
  // Cajas conservadoras: hasta 18 px por carácter, líneas de 22 px.
  // La proyección radial de la caja queda fuera del círculo y sus puntajes.
  function posicionesArana(indice, total, partes, nivel = 5) {
    const angulo = 2 * Math.PI * indice / total - Math.PI / 2;
    const ux = Math.cos(angulo), uy = Math.sin(angulo);
    const ancho = Math.max(...partes.map(p => [...p].reduce((ancho, letra) => ancho + (/[MWmw]/.test(letra) ? 18 : 12), 0)), 12);
    const alto = partes.length * 22;
    const distancia = 240 + 36 + Math.abs(ux) * ancho / 2 + Math.abs(uy) * alto / 2;
    const x = 360 + ux * distancia, y = 350 + uy * distancia;
    const anguloNumero = -Math.PI / 2 + Math.PI / total;
    const nx = 360 + Math.cos(anguloNumero) * 240 * nivel / 5;
    const ny = 350 + Math.sin(anguloNumero) * 240 * nivel / 5;
    return {
      etiqueta: {x, y: y - alto / 2 + 17, caja: {x: x - ancho / 2, y: y - alto / 2, ancho, alto}},
      numero: {x: nx, y: ny, caja: {x: nx - 3, y: ny - 20, ancho: 24, alto: 26}}
    };
  }
  if (typeof module === 'object' && module.exports) { module.exports = {posicionesArana}; return; }
  // Tablero de resultados: una dimensión seleccionable y fichas por eje.
  const E = window.KitEstandares, el = App.el;

  const formato = new Intl.NumberFormat('es-CO', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const numero = n => n === null || n === undefined || Number.isNaN(n) ? 'Sin información' : formato.format(n);
  const delta = n => n === null || n === undefined ? '' : `${Math.abs(n) < 0.05 ? '=' : n > 0 ? '▲' : '▼'} ${n > 0.049 ? '+' : ''}${formato.format(Math.abs(n) < 0.05 ? 0 : n)}`;
  const etiqueta = e => {
    const nombre = e.nombre.replace(e.fecha, '').replace(new RegExp('\\s+' + e.fecha.slice(0, 4) + '$'), '').replace(/\s*\(ejemplo\)\s*/gi, '').trim();
    const fecha = new Intl.DateTimeFormat('es-CO', {month: 'short', year: 'numeric'}).format(new Date(e.fecha + '-01T12:00:00')).replace(' de ', ' ');
    return `${nombre} · ${fecha}${e.origen === 'ejemplo' ? ' · Ejemplo ilustrativo' : e.origen === 'cargada' ? ' · Cargada en la plataforma' : ''}`;
  };
  function svg(tag, attrs, texto) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function lineas(texto, limite) {
    return texto.split(/\s+/).reduce((r, palabra) => {
      if (!r.length || r[r.length - 1].length + palabra.length + 1 > limite) r.push(palabra);
      else r[r.length - 1] += ' ' + palabra;
      return r;
    }, []);
  }
  const TONOS = ['var(--alta)', 'var(--media)', 'var(--baja)'];
  function tono(valor, umbrales) {
    if (valor === null || valor === undefined) return 'var(--texto-suave)';
    const i = umbrales.cortes.findIndex(c => c.menor_que === null || valor < c.menor_que);
    return TONOS[i] || 'var(--principal)';
  }
  const promedio = vs => { const v = vs.filter(n => typeof n === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

  /* Geometría de etiquetas para tipografía de 24 px: caja conservadora por carácter y por línea,
     proyectada fuera del círculo para que nunca toque anillos, valores ni puntos. */
  const R = 300, CX = 0, CY = 0, CHAR = 13, LINEA = 28, HOLGURA = 36;
  function ubicarEtiqueta(indice, total, partes) {
    const angulo = 2 * Math.PI * indice / total - Math.PI / 2, ux = Math.cos(angulo), uy = Math.sin(angulo);
    const ancho = Math.max(...partes.map(p => p.length * CHAR), CHAR), alto = partes.length * LINEA;
    const d = R + HOLGURA + Math.abs(ux) * ancho / 2 + Math.abs(uy) * alto / 2;
    const x = CX + ux * d, y = CY + uy * d;
    return {x, y: y - alto / 2 + 21, caja: {x: x - ancho / 2, y: y - alto / 2, ancho, alto}};
  }
  /* Araña genérica: ejes = [{clave, texto, partes}], valores y comparación alineados con ejes. */
  function arana({ejes, valores, comparacion, seleccionado, rotulo, umbrales, alElegir}) {
    const total = ejes.length, centro = [CX, CY], radio = R;
    const posiciones = ejes.map((e, i) => ubicarEtiqueta(i, total, e.partes));
    const cajas = posiciones.map(p => p.caja);
    const x0 = Math.min(-R, ...cajas.map(c => c.x)) - 12, y0 = Math.min(-R, ...cajas.map(c => c.y)) - 12;
    const x1 = Math.max(R, ...cajas.map(c => c.x + c.ancho)) + 12, y1 = Math.max(R, ...cajas.map(c => c.y + c.alto)) + 12;
    const dibujo = svg('svg', {viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, role: 'group', 'aria-label': rotulo, class: 'dim-arana'});
    const puntos = vals => E.puntosPoligono(vals, radio, centro);
    const cadena = ps => ps.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    for (let nivel = 1; nivel <= 5; nivel++) dibujo.append(svg('polygon', {points: cadena(puntos(ejes.map(() => nivel))), class: 'dim-anillo' + (nivel === 5 ? ' borde' : '')}));
    puntos(ejes.map(() => 5)).forEach(([x, y], i) => dibujo.append(svg('line', {x1: centro[0], y1: centro[1], x2: x, y2: y, class: 'dim-radio' + (ejes[i].clave === seleccionado ? ' activo' : '')})));
    const angNivel = -Math.PI / 2 + Math.PI / total;
    [1, 3, 5].forEach(nivel => dibujo.append(svg('text', {x: CX + Math.cos(angNivel) * R * nivel / 5 + 6, y: CY + Math.sin(angNivel) * R * nivel / 5, class: 'dim-nivel'}, String(nivel))));
    if (comparacion && comparacion.every(v => typeof v === 'number')) dibujo.append(svg('polygon', {points: cadena(puntos(comparacion)), class: 'dim-comparada'}));
    if (valores.every(v => typeof v === 'number')) dibujo.append(svg('polygon', {points: cadena(puntos(valores)), class: 'dim-principal'}));
    const vertices = puntos(valores.map(v => v ?? 0));
    ejes.forEach((eje, i) => {
      const [x, y] = vertices[i], v = valores[i], c = comparacion?.[i];
      const lectura = `${eje.texto}: ${numero(v)}${typeof c === 'number' ? ` (antes ${numero(c)}, ${delta(v - c)})` : ''}`;
      const g = svg('g', {class: 'dim-vertice' + (eje.clave === seleccionado ? ' activo' : ''), tabindex: alElegir ? 0 : -1, role: alElegir ? 'button' : 'img', 'aria-label': lectura});
      g.append(svg('title', {}, lectura));
      const p = posiciones[i], texto = svg('text', {x: p.x, y: p.y, 'text-anchor': 'middle', class: 'dim-etiqueta'});
      eje.partes.forEach((parte, j) => texto.append(svg('tspan', {x: p.x, dy: j ? LINEA : 0}, parte)));
      g.append(texto, svg('circle', {cx: x, cy: y, r: 9, fill: tono(v, umbrales), class: 'dim-punto'}), svg('text', {x: x + 14, y: y - 12, class: 'dim-valor'}, numero(v)));
      if (alElegir) {
        g.addEventListener('click', () => alElegir(eje.clave));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); alElegir(eje.clave); } });
      }
      dibujo.append(g);
    });
    return dibujo;
  }
  function columna(titulo, frases, clase) {
    const c = el('div', null, 'dim-col ' + clase);
    c.append(el('h3', titulo));
    const ul = el('ul'); (frases?.length ? frases : ['Sin '+titulo.toLowerCase()+' registrados para esta evaluación.']).forEach(f => ul.append(el('li', f))); c.append(ul);
    return c;
  }
  function pie(estandares) {
    const p = el('footer', null, 'dim-pie');
    p.append(el('span', 'Estándares relacionados', 'antetitulo'));
    const lista = el('ul', null, 'dim-estandares'); estandares.forEach(s => lista.append(el('li', s)));
    p.append(lista); return p;
  }
  function pintar(contenedor, datos, params, cat, listas) {
    let activo = true, evaluaciones = [], principal, comparada, ejeId = null, dimensionId = 'etapas-ocde';
    let dims = datos.dimensiones || {grandes: [], ejes: {}};
    const raiz = el('div', null, 'dim');
    const aviso = el('p', 'Cargando evaluaciones…', 'nota dim-aviso'); aviso.setAttribute('role', 'status');
    const controles = el('div', null, 'dim-barra'), cuerpo = el('div');
    raiz.append(aviso, cuerpo); contenedor.append(raiz);
    function url() {}
    function sincronizar() {
      datos = KitEstudios.ddhh(cat, listas, principal.id);
      dims = datos.dimensiones;
    }
    let cerrarFicha = null, disparador = null;
    function elegir(id) {
      if (!activo || !params.vigente()) return;
      disparador = document.activeElement;
      ejeId = id; url(); dibujar(); abrirFicha();
    }
    function cabeza(titulo, valor, anterior) {
      const h = el('header', null, 'dim-cabeza'), t = el('div');
      const h2 = el('h2', titulo); h2.tabIndex = -1;
      t.append(h2);
      const c = el('div', null, 'dim-puntaje');
      c.append(el('span', numero(valor), 'cifra'), el('span', '/5', 'cifra-etiqueta'));
      if (typeof anterior === 'number' && typeof valor === 'number') c.append(el('span', delta(valor - anterior) + ' frente a ' + etiqueta(comparada).split(' · ')[0].toLowerCase(), 'dim-delta'));
      h.append(t, c); return h;
    }
    function tarjetaGeneral(g) {
      const ejes = E.ejesDe(g.id, datos.estandares), filas = E.comparar(principal, comparada, ejes);
      const t = el('article', null, 'tarjeta dim-tarjeta dim-tablero');
      const lateral = el('aside', null, 'dim-lateral'), resultado = el('div', null, 'dim-resultado');
      lateral.append(controles, pie(g.estandares));
      t.append(lateral, resultado);
      resultado.append(cabeza(g.titulo, promedio(filas.map(f => f.a)), comparada ? promedio(filas.map(f => f.b)) : null));
      const medio = el('div', null, 'dim-centro');
      medio.append(arana({ejes: ejes.map(e => ({clave: e.id, texto: e.nombre, partes: lineas(dims.ejes[e.id]?.corto || e.nombre, 13)})), valores: filas.map(f => f.a), comparacion: comparada ? filas.map(f => f.b) : null,
        seleccionado: ejeId, rotulo: g.titulo, umbrales: datos.umbrales, alElegir: elegir}));
      if (comparada) {
        const leyenda = el('p', null, 'dim-leyenda-poligonos');
        leyenda.append(el('span', 'Evaluación', 'muestra principal'), el('span', 'Comparación', 'muestra comparada'));
        medio.append(leyenda);
      }
      medio.append(el('p', 'Toque un eje para ver su detalle.', 'nota dim-ayuda'));
      const cuerpoT = el('div', null, 'dim-observaciones');
      cuerpoT.append(columna('Hallazgos', g.hallazgos, 'hallazgos'), columna('Brechas', g.brechas, 'brechas'));
      resultado.append(medio, cuerpoT);
      const tabla = el('table'), thead = el('thead'), tr = el('tr');
      ['Eje', 'Puntaje', comparada ? 'Comparación' : null, comparada ? 'Diferencia' : null].filter(Boolean).forEach(x => { const th = el('th', x); th.scope = 'col'; tr.append(th); });
      thead.append(tr); tabla.append(thead);
      const tb = el('tbody');
      filas.slice().sort((a, b) => (a.a ?? 0) - (b.a ?? 0)).forEach(f => {
        const fila = el('tr'), th = el('th'), b = el('button', f.eje.nombre, 'enlace'); th.scope = 'row'; b.onclick = () => elegir(f.eje.id); th.append(b); fila.append(th);
        fila.append(el('td', numero(f.a))); if (comparada) fila.append(el('td', numero(f.b)), el('td', delta(f.diferencia)));
        tb.append(fila);
      });
      tabla.append(tb);
      const det = el('details', null, 'e3-datos dim-tabla'); det.append(el('summary', 'Ver puntajes por eje, de menor a mayor'), tabla); resultado.append(det);
      return t;
    }
    /* Ficha del eje en ventana (boceto de Felipe): título | calificación; hallazgos clave en viñetas;
       tabla Indicador | Calificación | Brecha específica | Estándares relacionados (a más texto, más espacio). */
    function circulo(valor) {
      const nivel = (datos.caso?.metodologia?.calificacion?.brechas?.niveles || []).find(n => typeof valor === 'number' && n.valor === Math.floor(valor));
      return el('span', typeof valor === 'number' ? numero(valor) : '—', 'dim-circulo sem-' + (nivel?.color || 'gris'));
    }
    function abrirFicha() {
      if (cerrarFicha) cerrarFicha(false);
      const eje = datos.estandares.ejes.find(e => e.id === ejeId);
      if (!eje) return;
      const g = dims.grandes.find(x => x.id === eje.grafico), info = dims.ejes[eje.id] || {};
      const valor = principal.puntajes[eje.id], antes = comparada?.puntajes[eje.id];
      const nivel = (datos.caso?.metodologia?.calificacion?.brechas?.niveles || []).find(n => typeof valor === 'number' && n.valor === Math.floor(valor));
      const fondo = el('div', null, 'fondo-dialogo centrado');
      const panel = el('section', null, 'panel dim-ficha'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'dim-ficha-titulo'); panel.tabIndex = -1;
      const cerrar = el('button', '×', 'kit-cerrar'); cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar');
      // Fila 1: título | calificación
      const cabeza = el('header', null, 'dim-ficha-cabeza');
      const titulo = el('div', null, 'dim-ficha-titulo');
      const h2 = el('h2', eje.nombre); h2.id = 'dim-ficha-titulo';
      titulo.append(el('p', g?.titulo || 'Dimensión', 'antetitulo'), h2, el('p', E.nivelEscala(valor, datos.estandares.escala), 'nota'));
      const calif = el('div', null, 'dim-ficha-calif sem-fondo-' + (nivel?.color || 'gris'));
      calif.append(el('span', 'Calificación', 'dim-ficha-rotulo'), el('strong', typeof valor === 'number' ? numero(valor) : '—'), el('span', (nivel ? nivel.nombre + ' · ' : '') + 'sobre 5', 'dim-ficha-nivel'));
      if (typeof antes === 'number' && typeof valor === 'number') calif.append(el('span', delta(valor - antes) + ' frente a la comparación', 'dim-ficha-nivel'));
      cabeza.append(titulo, calif);
      // Fila 2: hallazgos clave
      const hallazgos = el('section', null, 'dim-ficha-hallazgos');
      hallazgos.append(el('h3', 'Hallazgos clave'));
      const ul = el('ul'); (info.hallazgos || []).forEach(h => ul.append(el('li', h))); hallazgos.append(ul);
      // Fila 3: estándares relacionados (son generales del aspecto): fila completa en viñetas.
      const estandaresFila = el('section', null, 'dim-ficha-estandares-fila');
      estandaresFila.append(el('h3', 'Estándares relacionados'));
      const ule = el('ul'); (info.estandares || []).forEach(x => ule.append(el('li', x))); estandaresFila.append(ule);
      // Tabla de indicadores: Indicador | Calificación | Brecha específica (a más texto, más espacio).
      const indicadores = E.indicadoresEje(datos.estandares, eje.id);
      const tablaDe = lista => {
        const tabla = el('table', null, 'dim-ficha-tabla');
        const cols = el('colgroup'); ['indicador', 'calif', 'brecha'].forEach(c => { const col = el('col'); col.className = 'col-' + c; cols.append(col); }); tabla.append(cols);
        const thead = el('thead'), tr = el('tr');
        ['Indicador', 'Calificación', 'Brecha específica'].forEach(t => { const th = el('th', t); th.scope = 'col'; tr.append(th); });
        thead.append(tr); tabla.append(thead);
        const tb = el('tbody');
        lista.forEach(i => {
          const fila = el('tr'), th = el('th'); th.scope = 'row';
          th.append(el('span', i.codigo, 'dim-codigo'), document.createTextNode(i.pregunta));
          const tdc = el('td', null, 'dim-ficha-c'); tdc.append(circulo(i.calificacion));
          const detalle = el('td', null, 'dim-ficha-brecha');
          if (i.descripcion) detalle.append(el('p', i.descripcion));
          if (i.documentos) detalle.append(el('p', 'Documentos: ' + i.documentos, 'nota'));
          detalle.append(el('p', i.brecha || 'Sin brecha registrada'));
          if(i.nota)detalle.append(el('p',i.nota,'nota'));
          fila.append(th, tdc, detalle);
          tb.append(fila);
        });
        tabla.append(tb);
        const env = el('div', null, 'dim-ficha-tabla-env'); env.append(tabla); return env;
      };
      // Fila 4: componentes (criterios mínimos) que dan la calificación del aspecto; cada uno despliega sus indicadores.
      const grupos = eje.hallazgos?.grupos;
      const cuerpoInd = el('section', null, 'dim-ficha-cuerpo');
      if (grupos && grupos.length) {
        cuerpoInd.append(el('h3', 'Componentes de la calificación'), el('p', 'La calificación del aspecto es el promedio de sus componentes. Toque un componente para ver sus indicadores.', 'nota'));
        const comps = el('div', null, 'dim-componentes');
        let n = 0;
        grupos.forEach((gr, k) => {
          const criterio = eje.criterios?.[k], cal = E.parsearPuntaje(criterio?.calificacion);
          const propios = gr.indicadores.map(() => indicadores[n++]);
          const nivelC = (datos.caso?.metodologia?.calificacion?.brechas?.niveles || []).find(x => typeof cal === 'number' && x.valor === Math.floor(cal));
          const item = el('article', null, 'dim-comp');
          const boton = el('button', null, 'dim-comp-boton'); boton.type = 'button'; boton.setAttribute('aria-expanded', 'false');
          const idTabla = 'dim-comp-' + eje.id + '-' + k; boton.setAttribute('aria-controls', idTabla);
          const textoC = el('span', null, 'dim-comp-texto');
          textoC.append(el('span', 'Componente ' + (k + 1), 'dim-comp-num'), el('strong', criterio?.nombre || gr.nombre), el('span', (nivelC ? nivelC.nombre + ' · ' : '') + propios.length + ' indicadores', 'dim-comp-meta'));
          const grande = circulo(cal); grande.classList?.add('grande'); if (!grande.classList) grande.className += ' grande';
          boton.append(grande, textoC, el('span', 'Ver indicadores', 'dim-comp-accion'));
          const region = el('div', null, 'dim-comp-indicadores'); region.id = idTabla; region.hidden = true; region.append(tablaDe(propios));
          boton.onclick = () => {
            const abrir = boton.getAttribute('aria-expanded') !== 'true';
            boton.setAttribute('aria-expanded', String(abrir)); region.hidden = !abrir;
            boton.querySelector('.dim-comp-accion').textContent = abrir ? 'Ocultar indicadores' : 'Ver indicadores';
          };
          item.append(boton, region); comps.append(item);
        });
        cuerpoInd.append(comps);
      } else {
        cuerpoInd.append(el('h3', 'Indicadores evaluados (' + indicadores.length + ')'), tablaDe(indicadores));
      }
      panel.append(cerrar, cabeza, hallazgos, estandaresFila, cuerpoInd);
      fondo.append(panel); document.body.append(fondo); document.body.classList.add('dialogo-abierto');
      const regiones = [...document.querySelectorAll('body > header, body > main, body > footer, body > .saltar')], inertes = regiones.map(n=>n.inert); regiones.forEach(n => { n.inert = true; });
      const teclado = e => { if (e.key === 'Escape') { e.preventDefault(); cerrarFicha(true); }
        if (e.key === 'Tab') { const fs=[...panel.querySelectorAll('button, a[href], [tabindex="0"]')]; const first=fs[0],last=fs.at(-1); if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();} } };
      document.addEventListener('keydown', teclado);
      cerrarFicha = (restaurar) => {
        document.removeEventListener('keydown', teclado); regiones.forEach((n,i) => { n.inert = inertes[i]; }); fondo.remove(); document.body.classList.remove('dialogo-abierto');
        cerrarFicha = null;
        if (restaurar) { ejeId = null; url(); dibujar(); (disparador && disparador.isConnected ? disparador : cuerpo.querySelector('.dim-vertice'))?.focus?.(); }
      };
      cerrar.onclick = () => cerrarFicha(true);
      fondo.addEventListener('click', e => { if (e.target === fondo) cerrarFicha(true); });
      cerrar.focus();
    }
    function dibujar() {
      sincronizar();
      cuerpo.replaceChildren();
      // La evaluación de ejemplo no es de la empresa: el letrero se ve siempre que esté en pantalla.
      if ([principal, comparada].some(e => e?.origen === 'ejemplo')) { const letrero = el('p', 'Ejemplo ilustrativo: la evaluación de ejemplo muestra cómo se ve el avance entre dos evaluaciones. Sus puntajes no son de la empresa.', 'nota dim-ejemplo'); letrero.setAttribute('role', 'note'); cuerpo.append(letrero); }
      if (!dims.grandes.length) { cuerpo.append(el('p', 'Contenido en preparación.', 'en-preparacion')); return; }
      const general = el('section', null, 'dim-general');
      const tarjeta = tarjetaGeneral(dims.grandes.find(g => g.id === dimensionId) || dims.grandes[0]);
      general.append(tarjeta);
      cuerpo.append(general);
      const escala = el('p', 'Escala de 0 a 5: 0 = sin información; 5 = práctica implementada con seguimiento y reporte. Colores de los puntos: por debajo de 3, entre 3 y 4, desde 4.', 'nota dim-escala');
      tarjeta.append(escala);
      if (params.puedeEditar) { const cargar = el('a', 'Alimentación', 'boton secundario'); cargar.href = KitEstudiosUI.ruta('ddhh', params, 'alimentacion'); cuerpo.append(cargar); }
    }
    function prepararControles() {
      controles.replaceChildren();
      const labelDimension = el('label', 'Dimensión'), dimension = el('select');
      dimension.id = 'e3-dimension'; labelDimension.htmlFor = dimension.id;
      dims.grandes.forEach(g => { const op = el('option', g.titulo); op.value = g.id; dimension.append(op); });
      dimension.value = dimensionId;
      dimension.onchange = () => { dimensionId = dimension.value; ejeId = null; dibujar(); };
      labelDimension.append(dimension); controles.append(labelDimension);
      [['Evaluación', principal?.id, false], ['Comparación', comparada?.id || '', true]].forEach(([texto, valor, vs]) => {
        const label = el('label', texto), select = el('select'); select.id = vs ? 'e3-vs' : 'e3-eval'; label.htmlFor = select.id;
        if (vs) { const op = el('option', 'Sin comparación'); op.value = ''; select.append(op); }
        evaluaciones.forEach(e => { const op = el('option', etiqueta(e)); op.value = e.id; select.append(op); }); select.value = valor;
        select.onchange = () => { if (vs) comparada = evaluaciones.find(e => e.id === select.value) || null; else principal = evaluaciones.find(e => e.id === select.value); url(); dibujar(); };
        label.append(select); controles.append(label);
      });
    }
    evaluaciones = E.ordenar(datos.evaluaciones);
    principal = evaluaciones.find(e=>e.origen!=='ejemplo') || evaluaciones[0]; comparada = null;
    aviso.textContent = ''; aviso.hidden = true;
    prepararControles(); dibujar();
    return () => { activo = false; if (cerrarFicha) cerrarFicha(false); };
  }
  const U = KitEstudiosUI, K = KitEstudios;
  async function render(contenedor, _, params) {
    let limpiar;
    try {
      const [cat, nombre, listas] = await Promise.all([
        U.config('config/kit-ddhh-catalogo.json'), U.nombre(params),
        U.cargar(params, K.colecciones.ddhh.filter(c=>c!=='ddhh-resultados'))
      ]);
      if (!params.vigente()) return;
      const datosEmpresa = K.reemplazar(listas,nombre);
      if(!datosEmpresa['ddhh-evaluaciones'].length){U.vacio(contenedor,params,'ddhh','Esta empresa aún no tiene evaluaciones.');return;}
      if(cat.estandares.some(s=>s.escala.tipo==='lista'||s.escala.min!==0||s.escala.max!==5)) {
        pintarEscalas(contenedor,params,cat,datosEmpresa);return;
      }
      limpiar=pintar(contenedor,K.ddhh(cat,datosEmpresa),params,cat,datosEmpresa);
    } catch(e) {if(params.vigente())U.error(contenedor,e);}
    return ()=>limpiar?.();
  }
  // Las escalas ordenadas se muestran en su unidad original, sin promediar letras.
  function pintarEscalas(c,p,cat,listas) {
    const evaluaciones=[...listas['ddhh-evaluaciones']].sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const elegir=el('select'),comparar=el('select'),cuerpo=el('div');
    comparar.append(el('option','Sin comparación'));comparar.children[0].value='';
    evaluaciones.forEach(e=>{[elegir,comparar].forEach(select=>{const o=el('option',e.nombre);o.value=e.id;select.append(o);});});elegir.value=evaluaciones[0].id;
    const l=el('label','Evaluación'),vs=el('label','Comparar con');l.append(elegir);vs.append(comparar);c.append(l,vs,cuerpo);
    function dibujar(){cuerpo.replaceChildren();const a=evaluaciones.find(e=>e.id===elegir.value),b=evaluaciones.find(e=>e.id===comparar.value);
      cat.estandares.forEach(s=>{const sec=el('section',null,'tarjeta ke-escala');sec.append(el('h2',s.nombre),el('p',s.escala.tipo==='lista'?'Niveles ordenados: '+s.escala.valores.join(' · '):'Escala: '+s.escala.min+' a '+s.escala.max));
        cat.ejes.filter(e=>e.estandar===s.id).forEach(e=>{const detalle=el('details');detalle.append(el('summary',e.nombre+': '+K.mostrar(a[e.id],s.escala)+(b?' · Comparación: '+K.mostrar(b[e.id],s.escala):'')));
          const data=K.ddhh(cat,listas,a.id);const info=data.dimensiones.ejes[e.id];(info?.hallazgos||[]).forEach(h=>detalle.append(el('p',h)));
          cat.indicadores.filter(i=>i.eje===e.id).forEach(i=>{const r=(listas['ddhh-indicadores']||[]).find(r=>r.evaluacion===a.id&&r.indicador===i.id);detalle.append(el('h3',i.pregunta),el('p',K.mostrar(r?.calificacion,s.escala)),el('p',r?.descripcion||'Sin hallazgos registrados'),el('p',r?.brecha||'Sin brecha registrada'));});sec.append(detalle);});cuerpo.append(sec);});}
    elegir.onchange=comparar.onchange=dibujar;dibujar();
  }
  App.registrarVista('ddhh/resultados',{render:(c,d,p)=>render(c,d,p)});
  // Metodología por sector: no depende de la empresa ni de sus evaluaciones.
  async function renderCruce(contenedor, _, params) {
    try {
      const config = await U.config('config/kit-ddhh-cruce.json');
      if (!params.vigente()) return;
      const raiz = el('section', null, 'ddhh-cruce');
      raiz.append(el('p', 'Cómo responden los indicadores de cada estándar a los mismos temas. GRI va siempre primero.', 'ddhh-cruce-intro'));
      const label = el('label', 'Sector', 'ddhh-cruce-selector'), select = el('select');
      select.id = 'ddhh-cruce-sector'; label.htmlFor = select.id;
      config.sectores.forEach(sector => {
        const opcion = el('option', sector.nombre); opcion.value = sector.id; select.append(opcion);
      });
      label.append(select);
      const cuerpo = el('div'); raiz.append(label, cuerpo); contenedor.append(raiz);
      function dibujar() {
        if (!params.vigente()) return;
        cuerpo.replaceChildren();
        const sector = config.sectores.find(s => s.id === select.value);
        if (!sector) return;
        if (!sector.grupos.length) {
          cuerpo.append(el('p', sector.id === 'mineria' ? 'Cruce del sector minero en preparación.' : 'Cruce de estándares en preparación.', 'en-preparacion'));
        } else {
          const region = el('div', null, 'ddhh-cruce-region');
          region.tabIndex = 0; region.setAttribute('role', 'region');
          region.setAttribute('aria-label', 'Cruce de estándares · ' + sector.nombre);
          const tabla = el('table', null, 'ddhh-cruce-tabla');
          tabla.style.minWidth = (12 + sector.columnas.length * 9) + 'rem';
          tabla.append(el('caption', 'Cruce de estándares · ' + sector.nombre));
          const cols = el('colgroup'), temaCol = el('col'); temaCol.className = 'ddhh-cruce-tema'; cols.append(temaCol);
          sector.columnas.forEach(() => cols.append(el('col'))); tabla.append(cols);
          const head = el('thead'), titulos = el('tr');
          ['Tema', ...sector.columnas].forEach(t => { const th = el('th', t); th.scope = 'col'; titulos.append(th); });
          head.append(titulos); tabla.append(head);
          sector.grupos.forEach(grupo => {
            const body = el('tbody'), filaGrupo = el('tr'), titulo = el('th', grupo.nombre, 'ddhh-cruce-grupo');
            titulo.scope = 'colgroup'; titulo.colSpan = sector.columnas.length + 1;
            filaGrupo.append(titulo); body.append(filaGrupo);
            grupo.filas.forEach(fila => {
              const tr = el('tr'), tema = el('th', fila.tema); tema.scope = 'row'; tr.append(tema);
              sector.columnas.forEach(columna => {
                const td = el('td'), indicadores = fila.celdas[columna];
                if (!indicadores.length) {
                  const vacio = el('span', '—', 'ddhh-cruce-ref'); vacio.setAttribute('aria-label', 'Sin correspondencia'); td.append(vacio);
                }
                indicadores.forEach(indicador => {
                  const item = el('div', null, 'ddhh-cruce-indicador');
                  item.append(el('strong', indicador.codigo), el('span', indicador.nombre, 'ddhh-cruce-nombre'));
                  if (indicador.ref) item.append(el('span', indicador.ref, 'ddhh-cruce-ref'));
                  td.append(item);
                });
                tr.append(td);
              });
              body.append(tr);
            });
            tabla.append(body);
          });
          region.append(tabla); cuerpo.append(region);
        }
        const detalles = el('details', null, 'ddhh-cruce-fuentes'), fuentes = el('ul'), notas = el('ul');
        detalles.append(el('summary', 'Fuentes y notas'));
        Object.entries(sector.fuentes || {}).forEach(([estandar, texto]) => {
          const li = el('li'); li.append(el('strong', estandar + ': '), document.createTextNode(texto)); fuentes.append(li);
        });
        (sector.notas || []).forEach(nota => notas.append(el('li', nota)));
        detalles.append(fuentes, notas); cuerpo.append(detalles);
      }
      select.value = config.sectores[0]?.id || '';
      select.onchange = dibujar; dibujar();
    } catch (e) { if (params.vigente()) U.error(contenedor, e); }
  }
  App.registrarVista('ddhh/estandares', {render: renderCruce});
}());
