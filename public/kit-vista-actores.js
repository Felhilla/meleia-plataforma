(function (root) {
  'use strict';
  const App = root.App, K = root.KitActores, el = App.el;
  const numero = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
  const porciento = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  const orgs = n => `${numero(n)} ${n === 1 ? 'organización' : 'organizaciones'}`;
  // Borrador del 5-nov, pendiente de aprobación de Felipe y Germán (texto legal).
  const NOTA_DATOS = 'Tratamiento de datos personales. Los nombres y datos de contacto de los actores los registra la empresa, responsable de su tratamiento conforme a la Ley 1581 de 2012 y sus decretos reglamentarios. Solo los consultan las personas con acceso a esta empresa en la plataforma. En las muestras comerciales, los datos de integrantes de comunidades, organizaciones sociales y demás grupos de interés son de ejemplo.';
  const recursos = new Map();
  function json(ruta) {
    if (!recursos.has(ruta)) recursos.set(ruta, root.fetch(ruta).then(r => { if (!r.ok) throw Error('No se pudo cargar la configuración.'); return r.json(); }).catch(e => { recursos.delete(ruta); throw e; }));
    return recursos.get(ruta).then(x => JSON.parse(JSON.stringify(x)));
  }
  const boton = (texto, fn) => { const b = el('button', texto, 'boton secundario'); b.type = 'button'; b.onclick = fn; return b; };
  const texto = (n, valor) => n.append(el('p', valor));
  function mensaje(n, valor) { const p = el('p', valor, 'ka-mensaje'); p.setAttribute('role', 'status'); n.append(p); return p; }
  function bloque(n, titulo) { const s = el('section', null, 'ka-bloque'); s.append(el('h3', titulo)); n.append(s); return s; }
  function ruta(empresa, vista) { return '#/actores/' + encodeURIComponent(empresa) + '/' + vista; }
  function enlace(n, empresa) { const a = el('a', 'Ir a Alimentación'); a.href = ruta(empresa, 'alimentacion'); n.append(a); }
  function tabla(n, cabeceras, filas) {
    const marco = el('div', null, 'ka-tabla'), t = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
    cabeceras.forEach(c => { const th = el('th', c); th.scope = 'col'; tr.append(th); }); head.append(tr);
    filas.forEach(f => { const row = el('tr'); f.forEach(v => { const td = el('td'); td.append(typeof v === 'object' ? v : el('span', String(v ?? '—'))); row.append(td); }); body.append(row); });
    t.append(head, body); marco.append(t); n.append(marco);
  }
  function seleccionar(n, etiqueta, opciones, valor = '') {
    const label = el('label', etiqueta), select = el('select');
    opciones.forEach(o => { const op = el('option', typeof o === 'string' ? o : o.nombre); op.value = typeof o === 'string' ? o : o.id; select.append(op); });
    select.value = valor; label.append(select); n.append(label); return select;
  }
  function contexto(contenedor, datos, params, cfg) {
    let cerrado = false, focoOrigen;
    const pila = [];
    const activo = () => !cerrado && params.vigente();
    const error = (n, e) => { if (!activo()) return; if (e.sesionCerrada) { App.actualizarVista(); return; } mensaje(n, e.message || 'No se pudo completar la operación.'); };
    const ctx = { contenedor, datos, params, cfg, activo, error, listas: {} };
    ctx.cargar = async nombres => { await Promise.all(nombres.map(async c => { if (!ctx.listas[c]) ctx.listas[c] = await datos.listar(params.empresa, c); })); };
    ctx.dialogo = (titulo, encima = false, centrado = false) => {
      const origen = encima ? root.document.activeElement : focoOrigen?.isConnected ? focoOrigen : root.document.activeElement;
      if (!encima) while (pila.length) pila.at(-1).cerrar();
      focoOrigen = origen;
      const anterior = origen, fondo = el('div', null, centrado ? 'ka-fondo ka-fondo-centro' : 'ka-fondo'), panel = el('section', null, 'ka-dialogo');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'ka-dialogo-titulo'); panel.tabIndex = -1;
      const h = App.tituloMarca ? App.tituloMarca(titulo, 'h2') : el('h2', titulo); h.id = 'ka-dialogo-titulo-' + pila.length; panel.setAttribute('aria-labelledby', h.id);
      const regiones = [...root.document.body.children].map(n => [n, n.inert]); regiones.forEach(([n]) => { n.inert = true; });
      const cerrar = () => { root.document.removeEventListener('keydown', teclado); fondo.remove(); regiones.forEach(([n, previo]) => { n.inert = previo; }); if (activo()) { if (anterior?.isConnected) anterior.focus(); else contenedor.focus(); } pila.pop(); ctx.panelActual = pila.at(-1)?.panel; focoOrigen = null; };
      const teclado = e => {
        if (pila.at(-1)?.panel !== panel) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        if (e.key === 'Tab') {
          const focos = [...panel.querySelectorAll('button, input, select, textarea, summary, a[href], [tabindex="0"]')].filter(n => !n.disabled && !n.hidden && !n.closest('[hidden]') && (n.tagName === 'SUMMARY' || !n.closest('details:not([open])')));
          const primero = focos[0], ultimo = focos.at(-1);
          if (e.shiftKey && (root.document.activeElement === primero || root.document.activeElement === panel)) { e.preventDefault(); ultimo?.focus(); }
          else if (!e.shiftKey && root.document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
        }
      };
      fondo.onclick = e => { if (e.target === fondo) cerrar(); };
      const b = boton('×', cerrar); b.className = 'kit-cerrar'; b.setAttribute('aria-label','Cerrar'); panel.append(b); if (!encima) panel.append(h); else { const etiqueta = el('span',titulo,'ka-sr'); etiqueta.id = h.id; panel.append(etiqueta); } fondo.append(panel); root.document.body.append(fondo);
      root.document.addEventListener('keydown', teclado); pila.push({panel,cerrar}); b.focus();
      ctx.panelActual = panel;
      return panel;
    };
    ctx.limpiar = () => { cerrado = true; while (pila.length) pila.at(-1).cerrar(); };
    return ctx;
  }
  async function preparar(contenedor, datos, params) {
    const [cfg, esquema] = await Promise.all([json('config/kit-actores-config.json'), json('config/esquemas/actores.json')]);
    if (!params.vigente()) return;
    const ctx = contexto(contenedor, datos, params, cfg); ctx.esquema = esquema;
    if (cfg.categoriasPorEmpresa?.[params.empresa]) ctx.esquema.campos.categoria.valores = [...cfg.categoriasPorEmpresa[params.empresa]];
    await ctx.cargar(['actores']); if (!ctx.activo()) return;
    contenedor.classList.add('ka'); return ctx;
  }
  const categorias = [
    ['Instituciones gubernamentales', 'Autoridades', 'autoridades'],
    ['Comunidades y asociaciones', 'Comunidades y asociaciones', 'comunidades'],
    ['Empresas y gremios', 'Gremios', 'gremios'], ['Academia', 'Academia', 'academia'],
    ['Empleados, contratistas y proveedores', 'Proveedores', 'proveedores'],
    ['Medios de comunicación', 'Medios de comunicación', 'medios']
  ];
  const posiciones = ['Favorable', 'Neutral', 'Desfavorable'];
  const plurales = ['Favorables', 'Neutrales', 'Desfavorables'];
  const unicos = xs => [...new Set(xs.filter(Boolean))];
  const posicion = registros => unicos(registros.map(a => a.posicion)).length === 1 ? registros[0].posicion : 'Mixta';
  function agrupar(registros) {
    const grupos = new Map();
    registros.forEach(a => { const nombre = (a.institucion || '').trim(); if (!grupos.has(nombre)) grupos.set(nombre, { nombre, registros: [] }); grupos.get(nombre).registros.push(a); });
    return [...grupos.values()];
  }
  function etiqueta(valor) { return el('span', valor, 'ka-etiqueta ka-' + valor.toLowerCase()); }
  function logo(ctx, org) {
    const img = el('img'), dato = (ctx.listas['actores-logos'] || []).find(l => l.institucion?.trim() === org.nombre && typeof l.id === 'string' && l.id.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(l.id));
    const segura = v => typeof v === 'string' && v.length <= 45000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
    img.src = segura(dato?.imagen) ? dato.imagen : 'img/actores/' + (categorias.find(c => c[0] === (org.categoria || (org.actores || org.registros)[0]?.categoria))?.[2] || 'gremios') + '.svg';
    img.alt = ''; img.className = 'ka-logo'; return img;
  }
  function intensidad(registros, campo) {
    const valores = unicos(registros.map(a => K.nivel(a[campo]))).sort((a,b) => a-b);
    const n = valores.at(-1), span = el('span', valores.length > 1 ? `${numero(valores[0])} a ${numero(n)}` : n ? `${numero(n)} · ${['Muy baja','Baja','Media','Alta','Muy alta'][n-1]}` : 'Sin calificar', 'ka-intensidad');
    span.dataset.valor = n || 1; if (campo === 'tension') span.className += ' ka-tension'; return span;
  }
  // Esta tabla es exclusiva de las fichas; la tabla de Alimentación conserva su contrato.
  function tablaFicha(n, columnas, filas, ctx) {
    const marco = el('div', null, 'ka-tabla ka-tabla-ficha'), t = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody'), ayudas = el('div',null,'ka-escalas');
    columnas.forEach(([nombre,campo]) => {
      const th = el('th', nombre); th.scope = 'col';
      if (ctx.cfg.escalas[campo]) {
        th.tabIndex = 0; const ayuda = ctx.cfg.escalas[campo].map((d,i) => `${i+1}: ${d}`).join(' ');
        th.title = ayuda; const descripcion = el('p',ayuda,'ka-escala-ayuda');
        descripcion.id = 'ka-escala-' + campo; th.setAttribute('aria-describedby',descripcion.id); ayudas.append(descripcion);
        const mostrar = () => { descripcion.className = 'ka-escala-visible'; };
        const ocultar = () => { descripcion.className = 'ka-escala-ayuda'; };
        th.onfocus = mostrar; th.onmouseenter = mostrar; th.onblur = ocultar; th.onmouseleave = ocultar;
      }
      tr.append(th);
    }); head.append(tr);
    filas.forEach(fila => { const row = el('tr'); fila.forEach((valor,i) => { const td = el('td'); td.dataset.etiqueta = columnas[i][0]; td.append(typeof valor === 'object' ? valor : el('span', valor || 'No registrado')); row.append(td); }); body.append(row); });
    t.append(head,body); marco.append(t,ayudas); n.append(marco);
  }
  function fichaOrganizacion(ctx, org) {
    if (!ctx.activo()) return;
    const p = ctx.dialogo(org.nombre, true), registros = org.actores || org.registros;
    p.classList.add('ka-ficha');
    const cabecera = el('div', null, 'ka-ficha-cabecera'), info = el('div');
    info.append(el('h2', org.nombre, 'ka-franja-verde'));
    const ordenes = unicos(registros.map(a => a.orden)); if (ordenes.length) texto(info, 'Orden: ' + ordenes.join(' · '));
    const cajas = el('div', null, 'ka-cajas');
    ['impacto','influencia'].forEach(c => { const caja = el('div'); caja.append(el('strong', ctx.esquema.campos[c].etiqueta), typeof org[c] === 'number' ? valorOrganizacion(org, c) : intensidad(registros,c)); cajas.append(caja); });
    const pos = el('div'); pos.append(el('strong', 'Posición'), etiqueta(org.posicion || posicion(registros)));
    if (!org.posicion && posicion(registros) === 'Mixta') texto(pos, posiciones.map((v,i) => { const n = registros.filter(a => a.posicion === v).length; return n ? `${numero(n)} ${n === 1 ? v.toLowerCase() : plurales[i].toLowerCase()}` : ''; }).filter(Boolean).join(' · '));
    cajas.append(pos); info.append(cajas); cabecera.append(logo(ctx,org), info); p.append(cabecera);
    p.append(el('h3','CARACTERIZACIÓN','ka-franja-gris'));
    if (org.ajuste) p.append(el('p', `Resultado modificado por ${org.ajuste.autor}${org.ajuste.fecha ? ' el ' + org.ajuste.fecha : ''}: ${org.ajuste.justificacion}`, 'ka-ajuste-org'));
    const textos = org.caracterizacion ? [org.caracterizacion] : unicos(registros.map(a => a.caracterizacion?.trim()));
    (textos.length ? textos : ['Sin caracterización registrada.']).forEach(t => p.append(el('p',t,'ka-caracterizacion')));
    p.append(el('h3','Listado de actores identificados'));
    tablaFicha(p, [['Nombre'],['Cargo'],['Posición'],['Impacto','impacto'],['Influencia','influencia'],['Contacto']], registros.map(a => {
      const contacto = ctx.listas['actores-contactos'].find(c => c.id === a.id) || {}, nombre = el('div', a.nombre_servidor || contacto.nombre || 'Sin nombre registrado'), datos = el('div');
      if (contacto.ejemplo === true) nombre.append(el('small','Dato de ejemplo','ka-ejemplo'));
      if (contacto.telefono) texto(datos,contacto.telefono);
      const correo = typeof contacto.correo === 'string' && contacto.correo.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.correo) ? contacto.correo : '';
      if (correo) texto(datos,correo); if (!contacto.telefono && !correo) texto(datos,'No registrado');
      return [nombre,a.cargo,etiqueta(a.posicion),intensidad([a],'impacto'),intensidad([a],'influencia'),datos];
    }),ctx);
    p.lastChild.append(el('p', NOTA_DATOS, 'ka-nota-datos'));
    const detalle = el('details'); detalle.append(el('summary','MÁS DETALLE','ka-franja-gris'));
    tablaFicha(detalle, [['Cargo'],['Dependencia','dependencia'],['Tensión','tension'],['Responsabilidad','responsabilidad'],['Cuadrante']], registros.map(a => {
      const nivel = el('div',K.nivelCalculado(a,ctx.cfg) || 'Sin calificar');
      if (K.alerta(a,ctx.cfg)) nivel.append(el('strong','⚠ Alerta'));
      return [a.cargo,intensidad([a],'dependencia'),intensidad([a],'tension'),intensidad([a],'responsabilidad'),nivel];
    }),ctx); p.append(detalle);
  }
  const formatoValor = v => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  function valorOrganizacion(org, campo) {
    const span = el('span', `${formatoValor(org[campo])} · ${org.ajustado ? 'modificado' : 'promedio de ' + (org.actores.length === 1 ? '1 actor' : org.actores.length + ' actores')}`, 'ka-intensidad');
    span.dataset.valor = Math.round(org[campo]); return span;
  }
  // E41 (boceto de Felipe del 5-nov): a la izquierda la vista, el resumen y las principales
  // organizaciones; a la derecha la matriz impacto × influencia con un punto por organización.
  const formas = { Favorable: 'circulo', Neutral: 'cuadrado', Desfavorable: 'triangulo' };
  const SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}) { const n = root.document.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }
  function marca(pos, x, y) {
    if (formas[pos] === 'cuadrado') return svg('rect', { x: x - 6.5, y: y - 6.5, width: 13, height: 13, rx: 2 });
    if (formas[pos] === 'triangulo') return svg('path', { d: `M${x} ${y - 8}L${x + 8} ${y + 6}H${x - 8}Z` });
    return svg('circle', { cx: x, cy: y, r: 7.5 });
  }
  // Desplazamiento fijo por organización para que los promedios iguales no se tapen.
  function desplazamiento(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return [((h % 37) - 18) / 100, (((h >> 6) % 37) - 18) / 100]; }
  const slugNivel = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');
  function matriz(ctx, lista, alAbrir) {
    const A = 680, H = 420, m = { i: 56, d: 16, s: 16, b: 48 }, ancho = A - m.i - m.d, alto = H - m.s - m.b;
    const x = v => m.i + (v - 1) / 4 * ancho, y = v => m.s + (5 - v) / 4 * alto, corte = ctx.cfg.corte;
    const g = svg('svg', { viewBox: `0 0 ${A} ${H}`, role: 'group', 'aria-label': `Matriz de impacto e influencia con ${orgs(lista.length)}` }); g.classList.add('ka-matriz-svg');
    ctx.cfg.niveles.forEach(n => {
      const izq = n.influencia === 'baja', arriba = n.impacto === 'alto';
      g.append(svg('rect', { x: izq ? x(1) : x(corte), y: arriba ? y(5) : y(corte), width: izq ? x(corte) - x(1) : x(5) - x(corte), height: arriba ? y(corte) - y(5) : y(1) - y(corte), class: 'ka-zona ka-zona-' + slugNivel(n.nombre) }));
      // Nombres largos en dos líneas para que quepan en las zonas angostas.
      const palabras = n.nombre.split(' '), lineas = n.nombre.length > 16 && palabras.length > 1 ? [palabras[0], palabras.slice(1).join(' ')] : [n.nombre];
      const t = svg('text', { x: izq ? x(1) + 8 : x(5) - 8, y: arriba ? y(5) + 18 : y(1) - 10 - (lineas.length - 1) * 14, 'text-anchor': izq ? 'start' : 'end', class: 'ka-zona-nombre' });
      lineas.forEach((l, i) => { const ts = svg('tspan', { x: izq ? x(1) + 8 : x(5) - 8, dy: i ? 14 : 0 }); ts.textContent = l; t.append(ts); }); g.append(t);
    });
    for (let v = 1; v <= 5; v++) {
      const tx = svg('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'ka-eje-valor' }); tx.textContent = v; g.append(tx);
      const ty = svg('text', { x: m.i - 10, y: y(v) + 4, 'text-anchor': 'end', class: 'ka-eje-valor' }); ty.textContent = v; g.append(ty);
    }
    const ex = svg('text', { x: m.i + ancho / 2, y: H - 8, 'text-anchor': 'middle', class: 'ka-eje-nombre' }); ex.textContent = 'Influencia →'; g.append(ex);
    const ey = svg('text', { x: 14, y: m.s + alto / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${m.s + alto / 2})`, class: 'ka-eje-nombre' }); ey.textContent = 'Impacto →'; g.append(ey);
    lista.filter(o => typeof o.influencia === 'number' && typeof o.impacto === 'number').forEach(o => {
      const [dx, dy] = desplazamiento(o.id), punto = marca(o.posicion, x(Math.min(5, Math.max(1, o.influencia + dx))), y(Math.min(5, Math.max(1, o.impacto + dy))));
      punto.setAttribute('class', 'ka-punto ka-' + String(o.posicion || 'neutral').toLowerCase()); punto.setAttribute('tabindex', '0'); punto.setAttribute('role', 'button');
      const etiquetaPunto = `${o.nombre}. ${o.posicion || 'Sin posición'}. Influencia ${formatoValor(o.influencia)}, impacto ${formatoValor(o.impacto)}. ${o.cuadrante || ''}`;
      punto.setAttribute('aria-label', etiquetaPunto); const titulo = svg('title'); titulo.textContent = etiquetaPunto; punto.append(titulo);
      punto.addEventListener('click', () => alAbrir(o)); punto.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alAbrir(o); } });
      g.append(punto);
    });
    return g;
  }
  const puntaje = o => ((o.influencia || 0) + (o.impacto || 0)) / 2;
  function principales(lista, cuantas = 5) { return [...lista].sort((a, b) => puntaje(b) - puntaje(a) || a.nombre.localeCompare(b.nombre, 'es')).slice(0, cuantas); }
  async function mapa(contenedor, datos, params) {
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    await ctx.cargar(['actores-contactos', 'actores-resumen', 'actores-organizaciones']); if (!ctx.activo()) return ctx.limpiar;
    let logos;
    ctx.logos = () => logos || (logos = ctx.cargar(['actores-logos']).catch(e => { logos = null; throw e; }));
    const todas = K.organizaciones(ctx.listas.actores, ctx.listas['actores-organizaciones'], ctx.cfg).filter(o => o.actores.length);
    ctx.organizaciones = todas;
    if (!todas.length) { texto(contenedor, 'Esta empresa aún no tiene organizaciones registradas. Agrégalas desde Alimentación para construir el mapa.'); if (params.puedeEditar) enlace(contenedor, params.empresa); return ctx.limpiar; }
    const abrir = async o => { try { await ctx.logos(); } catch (_) {} fichaOrganizacion(ctx, o); };
    const raiz = el('div', null, 'ka-resultados'), lateral = el('aside', null, 'ka-lateral'), figura = el('figure', null, 'ka-matriz');
    const etiquetaVista = el('label', 'Vista', 'ka-vista'), vista = el('select');
    [['', 'General'], ...categorias.filter(c => todas.some(o => o.categoria === c[0]))].forEach(([valor, nombre]) => { const op = el('option', nombre); op.value = valor; vista.append(op); });
    etiquetaVista.append(vista);
    const resumen = el('section', null, 'ka-resumen-tarjeta'), lista = el('section', null, 'ka-principales'), convenciones = el('figcaption', null, 'ka-convenciones');
    lateral.append(etiquetaVista, resumen, lista); raiz.append(lateral, figura); contenedor.append(raiz);
    function pintar() {
      const cat = vista.value, visibles = cat ? todas.filter(o => o.categoria === cat) : todas, nombreVista = cat ? categorias.find(c => c[0] === cat)[1] : 'Todas las organizaciones';
      resumen.replaceChildren(el('h2', 'Resumen'), el('p', nombreVista, 'nota'));
      const ul = el('ul');
      posiciones.forEach((pos, i) => { const li = el('li', null, 'ka-' + pos.toLowerCase()); li.append(el('strong', numero(visibles.filter(o => o.posicion === pos).length)), el('span', plurales[i])); ul.append(li); });
      const total = el('li', null, 'ka-total'); total.append(el('strong', numero(visibles.length)), el('span', visibles.length === 1 ? 'Organización en total' : 'Organizaciones en total')); ul.append(total); resumen.append(ul);
      lista.replaceChildren(el('h2', 'Principales organizaciones'), el('p', 'Las de mayor promedio entre impacto e influencia.', 'nota'));
      (cat ? [[cat, nombreVista]] : categorias).forEach(([c, nombre]) => {
        const grupo = principales(visibles.filter(o => o.categoria === c)); if (!grupo.length) return;
        const sec = el('div', null, 'ka-principales-grupo'), ol = el('ol'); if (!cat) sec.append(el('h3', nombre));
        grupo.forEach(o => { const li = el('li'), b = boton(o.nombre, () => abrir(o)); b.className = 'ka-principal'; li.append(b, etiqueta(o.posicion || 'Mixta')); ol.append(li); });
        sec.append(ol); lista.append(sec);
      });
      convenciones.replaceChildren(el('span', cat ? `Vista: ${nombreVista}.` : 'Vista general.'));
      posiciones.forEach(pos => { const s = el('span', pos, 'ka-conv ka-' + pos.toLowerCase()); s.dataset.forma = formas[pos]; convenciones.append(s); });
      convenciones.append(el('span', `Cada punto es una organización, ubicada con el promedio de sus actores o con su resultado modificado. El nivel alto empieza en ${ctx.cfg.corte}.`, 'nota'));
      figura.replaceChildren(matriz(ctx, visibles, abrir), convenciones);
    }
    vista.onchange = pintar; pintar();
    const fecha = ctx.listas['actores-resumen'].find(r => r.id === 'resumen')?.fecha_corte;
    const valida = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0,10) === fecha;
    texto(contenedor,'Metodología AA1000SES (AccountAbility).' + (valida ? ` Mapeo con corte a ${new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(fecha))}.` : ''));
    contenedor.lastChild.className = 'ka-nota-tecnica'; return ctx.limpiar;
  }
  // E41 (boceto de Felipe del 5-nov, página 2): una organización con uno o varios actores.
  // Valida con las mismas funciones del contrato (KitActores.validar y validarOrganizacion).
  const ORDEN_EJES = ['influencia', 'impacto', 'dependencia', 'tension', 'responsabilidad'];
  const hoy = () => new Date().toISOString().slice(0, 10);
  function campo(n, etiqueta, tipo, valor, opciones = {}) {
    const fila = el('div', null, 'ka-campo' + (opciones.ancho ? ' ka-campo-ancho' : '')), id = 'ka-' + opciones.nombre;
    const label = el('label', etiqueta + (opciones.obligatorio ? ' *' : '')), input = el(tipo === 'lista' ? 'select' : tipo === 'texto-largo' ? 'textarea' : 'input');
    if (tipo === 'lista') [['', 'Sin seleccionar'], ...opciones.valores.map(v => Array.isArray(v) ? v : [v, v])].forEach(([v, t]) => { const op = el('option', t); op.value = v; input.append(op); });
    if (tipo === 'decimal') { input.type = 'number'; input.min = '1'; input.max = '5'; input.step = '0.1'; input.inputMode = 'decimal'; }
    if (opciones.max) input.maxLength = opciones.max;
    input.name = opciones.nombre; input.id = id; label.htmlFor = id; input.value = valor ?? '';
    const error = el('p', '', 'ka-error'); error.id = id + '-error'; error.setAttribute('aria-live', 'polite'); input.setAttribute('aria-describedby', error.id);
    fila.append(label, input);
    if (opciones.max && tipo === 'texto-largo') { const cuenta = el('small', '', 'ka-cuenta'); const act = () => { cuenta.textContent = `${input.value.length} de ${opciones.max} caracteres`; }; input.addEventListener?.('input', act); act(); fila.append(cuenta); }
    fila.append(error); n.append(fila); return { input, error };
  }
  function escala(n, ctx, eje, valor, prefijo) {
    const grupo = el('fieldset', null, 'ka-escala'), leyenda = el('legend', ctx.esquema.campos[eje].etiqueta + ' *'), botones = el('div', null, 'ka-escala-botones'), error = el('p', '', 'ka-error'), ayuda = el('p', '', 'ka-escala-definicion');
    let actual = Number(valor) || null; const opciones = [];
    const marcar = v => { actual = v; opciones.forEach((b, i) => b.setAttribute('aria-checked', String(i + 1 === v))); ayuda.textContent = v ? `${v}: ${ctx.cfg.escalas[eje][v - 1]}` : ''; grupo.dispatchEvent?.(new root.Event('change', { bubbles: true })); };
    for (let v = 1; v <= 5; v++) { const b = boton(String(v), () => marcar(v)); b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `${v}: ${ctx.cfg.escalas[eje][v - 1]}`); b.title = ctx.cfg.escalas[eje][v - 1]; b.className = 'ka-escala-boton'; opciones.push(b); botones.append(b); }
    botones.setAttribute('role', 'radiogroup'); botones.setAttribute('aria-labelledby', prefijo + eje);
    leyenda.id = prefijo + eje; grupo.append(leyenda, botones, ayuda, error); n.append(grupo);
    if (actual) marcar(actual);
    return { valor: () => actual, error, foco: () => opciones[0].focus(), grupo };
  }
  function formulario(ctx, n, org, alGuardar) {
    const form = el('form', null, 'ka-form ka-form-org'); form.noValidate = true;
    const original = org?.registro || null, actoresOriginales = org?.actores || [], contactos = ctx.listas['actores-contactos'] || [];
    const sOrg = el('section', null, 'ka-form-seccion'); sOrg.append(el('h4', 'La organización'));
    const c = {
      nombre: campo(sOrg, 'Nombre de la organización', 'texto', org?.nombre, { nombre: 'org-nombre', obligatorio: true, max: 250 }),
      categoria: campo(sOrg, 'Grupo de interés', 'lista', org?.categoria, { nombre: 'org-categoria', obligatorio: true, valores: categorias.filter(x => ctx.esquemaOrg.campos.categoria.valores.includes(x[0])).map(x => [x[0], x[1]]) }),
      posicion: campo(sOrg, 'Posición de la organización', 'lista', org?.posicion, { nombre: 'org-posicion', obligatorio: true, valores: posiciones }),
      caracterizacion: campo(sOrg, 'Caracterización de la organización', 'texto-largo', org?.caracterizacion, { nombre: 'org-caracterizacion', obligatorio: true, max: 4000, ancho: true })
    };
    const sAct = el('section', null, 'ka-form-seccion'), listaActores = el('div', null, 'ka-form-actores'), bloques = [];
    sAct.append(el('h4', 'Actores identificados'), el('p', 'Personas de la organización con las que se relaciona el proyecto. Sus calificaciones dan el resultado de la organización.', 'nota'), listaActores);
    function agregarActor(a) {
      const caja = el('fieldset', null, 'ka-form-actor'), n0 = bloques.length, pre = `ka-a${n0}-`, contacto = a ? contactos.find(x => x.id === a.id) || {} : {};
      const titulo = el('legend', `Actor ${n0 + 1}`); caja.append(titulo);
      const b = { original: a, caja,
        nombre: campo(caja, 'Nombre del actor', 'texto', a?.nombre_servidor || contacto.nombre, { nombre: pre + 'nombre', obligatorio: true, max: 120 }),
        cargo: campo(caja, 'Cargo', 'texto', a?.cargo, { nombre: pre + 'cargo', obligatorio: true, max: 250 }),
        posicion: campo(caja, 'Posición', 'lista', a?.posicion, { nombre: pre + 'posicion', obligatorio: true, valores: posiciones }),
        caracterizacion: campo(caja, 'Caracterización del actor', 'texto-largo', a?.caracterizacion, { nombre: pre + 'caracterizacion', obligatorio: true, max: Math.max(ctx.cfg.organizacion.caracterizacionMax, (a?.caracterizacion || '').length), ancho: true }),
        correo: campo(caja, 'Correo (opcional)', 'texto', contacto.correo, { nombre: pre + 'correo', max: 160 }),
        telefono: campo(caja, 'Teléfono (opcional)', 'texto', contacto.telefono, { nombre: pre + 'telefono', max: 40 }), ejes: {}
      };
      caja.append(el('p', 'Los datos de contacto son personales: regístralos solo con autorización de la persona (Ley 1581 de 2012).', 'ka-nota-datos ka-campo-ancho'));
      const califica = el('div', null, 'ka-escalas-actor ka-campo-ancho'); ORDEN_EJES.forEach(e => { b.ejes[e] = escala(califica, ctx, e, a?.[e], pre); }); caja.append(califica);
      const quitar = boton('Quitar este actor', () => { if (bloques.filter(x => !x.quitado).length === 1) { aviso.textContent = 'La organización necesita al menos un actor.'; return; } b.quitado = true; caja.remove(); actualizar(); });
      caja.append(quitar); bloques.push(b); listaActores.append(caja); return b;
    }
    (actoresOriginales.length ? actoresOriginales : [null]).forEach(agregarActor);
    sAct.append(boton('Agregar otro actor', () => { const b = agregarActor(null); b.nombre.input.focus(); actualizar(); }));
    const sRes = el('section', null, 'ka-form-seccion'), vivo = el('p', '', 'ka-resultado-vivo'); vivo.setAttribute('role', 'status');
    const modificar = el('input'); modificar.type = 'checkbox'; modificar.id = 'ka-modificar'; modificar.checked = !!org?.ajustado;
    const lMod = el('label', 'Modificar el resultado final de la organización'); lMod.htmlFor = modificar.id; const filaMod = el('div', null, 'ka-check'); filaMod.append(modificar, lMod);
    const zonaMod = el('div', null, 'ka-form-modificacion');
    const m = {
      influencia: campo(zonaMod, 'Influencia final (1 a 5)', 'decimal', original?.ajuste_influencia, { nombre: 'mod-influencia', obligatorio: true }),
      impacto: campo(zonaMod, 'Impacto final (1 a 5)', 'decimal', original?.ajuste_impacto, { nombre: 'mod-impacto', obligatorio: true }),
      justificacion: campo(zonaMod, 'Justificación de la modificación', 'texto-largo', original?.ajuste_justificacion, { nombre: 'mod-justificacion', obligatorio: true, max: 2000, ancho: true }),
      autor: campo(zonaMod, 'Nombre de quien modifica', 'texto', original?.ajuste_autor, { nombre: 'mod-autor', obligatorio: true, max: 120 })
    };
    sRes.append(el('h4', 'Resultado'), vivo, filaMod, zonaMod);
    const aviso = el('p', '', 'ka-mensaje'), previa = el('div', null, 'ka-previa'); aviso.setAttribute('role', 'status');
    const guardar = boton('Revisar y guardar'); guardar.type = 'submit';
    form.append(sOrg, sAct, sRes, aviso, guardar, previa); n.append(form);
    const vivos = () => bloques.filter(b => !b.quitado);
    function leerActores(nombreOrg, categoria) {
      return vivos().map(b => ({ ...(b.original || {}), id: b.original?.id || 'act-' + root.crypto.randomUUID(), institucion: nombreOrg, categoria,
        nombre_servidor: b.nombre.input.value.trim(), cargo: b.cargo.input.value.trim(), posicion: b.posicion.input.value, caracterizacion: b.caracterizacion.input.value.trim(),
        ...Object.fromEntries(ORDEN_EJES.map(e => [e, b.ejes[e].valor()])), nivel_ajustado: undefined, motivo_ajuste: undefined, explicacion_ajuste: undefined }));
    }
    function actualizar() {
      zonaMod.hidden = !modificar.checked;
      const [o] = K.organizaciones(leerActores('Vista previa', ''), [], ctx.cfg);
      vivo.textContent = o && typeof o.influencia === 'number' && typeof o.impacto === 'number' ? `Promedio de los actores: influencia ${formatoValor(o.influencia)} e impacto ${formatoValor(o.impacto)}. Cuadrante: ${o.cuadrante}.` : 'Califica influencia e impacto de cada actor para ver el resultado.';
    }
    form.addEventListener?.('change', actualizar); form.addEventListener?.('input', actualizar); modificar.onchange = actualizar; actualizar();
    const limpiarErrores = () => form.todos?.().forEach?.(x => { if (x.className === 'ka-error') x.textContent = ''; });
    form.onsubmit = e => {
      e.preventDefault(); if (!ctx.activo() || !ctx.params.puedeEditar) return;
      previa.replaceChildren(); aviso.textContent = ''; root.document.querySelectorAll?.('.ka-form-org .ka-error').forEach(x => { x.textContent = ''; }); limpiarErrores();
      const problemas = [], falta = (ref, mensaje) => { ref.error.textContent = mensaje; problemas.push(ref); };
      const nombreOrg = c.nombre.input.value.trim(), categoria = c.categoria.input.value;
      const registroOrg = { id: K.idOrganizacion(nombreOrg), nombre: nombreOrg, categoria, posicion: c.posicion.input.value, caracterizacion: c.caracterizacion.input.value.trim() };
      if (modificar.checked) Object.assign(registroOrg, { ajuste_influencia: Number(String(m.influencia.input.value).replace(',', '.')), ajuste_impacto: Number(String(m.impacto.input.value).replace(',', '.')), ajuste_justificacion: m.justificacion.input.value.trim(), ajuste_autor: m.autor.input.value.trim(), ajuste_fecha: original?.ajuste_fecha && original.ajuste_justificacion === m.justificacion.input.value.trim() ? original.ajuste_fecha : hoy() });
      if (!registroOrg.caracterizacion) falta(c.caracterizacion, 'Describe la organización.');
      const ro = K.validarOrganizacion(registroOrg, ctx.esquemaOrg);
      ro.errores.forEach(x => { const ref = { nombre: c.nombre, categoria: c.categoria, posicion: c.posicion, caracterizacion: c.caracterizacion, ajuste_influencia: m.influencia, ajuste_impacto: m.impacto, ajuste_justificacion: m.justificacion, ajuste_autor: m.autor }[x.campo] || c.nombre; falta(ref, x.mensaje); });
      if (modificar.checked && !(Number.isFinite(registroOrg.ajuste_influencia) && Number.isFinite(registroOrg.ajuste_impacto))) falta(m.influencia, 'Escribe influencia e impacto finales entre 1 y 5.');
      const otra = (ctx.organizacionesActuales || []).find(o => o.id === registroOrg.id && o.id !== org?.id);
      if (otra) falta(c.nombre, 'Ya existe una organización con este nombre. Edítala desde la lista.');
      const actores = leerActores(nombreOrg, categoria), validados = [];
      actores.forEach((a, i) => {
        const b = vivos()[i];
        if (!a.nombre_servidor) falta(b.nombre, 'Escribe el nombre del actor.');
        if (!a.cargo) falta(b.cargo, 'Escribe el cargo.');
        if (!a.caracterizacion) falta(b.caracterizacion, 'Describe al actor.');
        else if (a.caracterizacion.length > ctx.cfg.organizacion.caracterizacionMax && a.caracterizacion !== b.original?.caracterizacion) falta(b.caracterizacion, `Máximo ${ctx.cfg.organizacion.caracterizacionMax} caracteres.`);
        const r = K.validar(a, ctx.cfg, ctx.esquema, 'manual');
        r.errores.forEach(x => { const ref = b[x.campo] || b.ejes[x.campo] || (x.campo === 'nombre_servidor' ? b.nombre : null); if (ref) falta(ref, x.mensaje); else if (!['institucion', 'categoria'].includes(x.campo)) falta(b.nombre, x.mensaje); });
        validados.push(r.registro);
      });
      if (problemas.length) { aviso.textContent = `Revisa ${problemas.length === 1 ? 'el campo marcado' : 'los ' + problemas.length + ' campos marcados'}.`; (problemas[0].input || problemas[0]).focus?.(); return; }
      const contactosNuevos = actores.map((a, i) => ({ id: a.id, nombre: a.nombre_servidor, telefono: vivos()[i].telefono.input.value.trim(), correo: vivos()[i].correo.input.value.trim() })).filter(x => x.telefono || x.correo);
      const quitados = actoresOriginales.filter(a => !validados.some(v => v.id === a.id));
      const [res] = K.organizaciones(validados, [ro.registro], ctx.cfg);
      previa.append(el('h4', 'Vas a guardar'));
      texto(previa, `${registroOrg.nombre} · ${categorias.find(x => x[0] === categoria)?.[1] || categoria} · ${registroOrg.posicion}`);
      texto(previa, `${validados.length === 1 ? '1 actor' : validados.length + ' actores'}. Resultado: influencia ${formatoValor(res.influencia)}, impacto ${formatoValor(res.impacto)} (${res.ajustado ? 'modificado' : 'promedio'}). Cuadrante: ${res.cuadrante}.`);
      if (quitados.length) texto(previa, `Se quitan ${quitados.length === 1 ? '1 actor' : quitados.length + ' actores'}: ${quitados.map(a => a.cargo || a.nombre_servidor || 'sin cargo').join(', ')}. El borrado queda en el historial.`);
      const confirmar = boton('Confirmar guardado', async () => {
        if (!ctx.activo() || !ctx.params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
        try {
          const d = ctx.datos, emp = ctx.params.empresa;
          await d.guardar(emp, 'actores-organizaciones', ro.registro.id, ro.registro);
          await d.guardarVarios(emp, 'actores', validados);
          if (contactosNuevos.length) await d.guardarVarios(emp, 'actores-contactos', contactosNuevos);
          for (const a of quitados) await d.borrar(emp, 'actores', a.id);
          if (org?.registro && org.registro.id !== ro.registro.id) await d.borrar(emp, 'actores-organizaciones', org.registro.id);
          if (!ctx.activo()) return;
          const ids = new Set([...validados, ...quitados].map(a => a.id));
          ctx.listas.actores = [...ctx.listas.actores.filter(a => !ids.has(a.id)), ...validados];
          ctx.listas['actores-organizaciones'] = [...(ctx.listas['actores-organizaciones'] || []).filter(o => o.id !== ro.registro.id && o.id !== org?.registro?.id), ro.registro];
          const conIds = new Set(contactosNuevos.map(x => x.id)); ctx.listas['actores-contactos'] = [...contactos.filter(x => !conIds.has(x.id)), ...contactosNuevos];
          alGuardar();
        } catch (e) { ctx.error(aviso, e); confirmar.disabled = false; }
      });
      previa.append(confirmar); confirmar.focus();
    };
    return form;
  }
  async function alimentacion(contenedor, datos, params) {
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    ctx.esquemaOrg = await json('config/esquemas/actores-organizaciones.json');
    await ctx.cargar(['actores-organizaciones', 'actores-contactos']); if (!ctx.activo()) return ctx.limpiar;
    const zona = el('section', null, 'ka-alimentacion'), historial = el('section');
    function pintar() {
      zona.replaceChildren(); const editor = el('section', null, 'ka-editor'), aviso = el('div');
      const orgs = K.organizaciones(ctx.listas.actores, ctx.listas['actores-organizaciones'], ctx.cfg); ctx.organizacionesActuales = orgs;
      const editar = o => { editor.replaceChildren(el('h3', o ? 'Editar organización' : 'Agregar organización')); formulario(ctx, editor, o, pintar); editor.querySelector('input')?.focus(); };
      zona.append(el('h2', 'Responder el cuestionario'), el('p', 'Registra cada organización con sus actores. También puedes subir la plantilla de Excel más abajo.', 'nota'), boton('Agregar organización', () => editar(null)), aviso);
      if (!orgs.length) texto(zona, 'Aún no hay organizaciones. Usa Agregar organización para registrar la primera.');
      else tabla(zona, ['Organización', 'Grupo de interés', 'Actores', 'Cuadrante', 'Acciones'], orgs.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(o => {
        const acciones = el('div', null, 'ka-acciones'); acciones.append(boton('Editar', () => editar(o)), boton('Borrar', () => {
          aviso.replaceChildren(); texto(aviso, `¿Borrar ${o.nombre} y sus ${o.actores.length === 1 ? 'un actor' : o.actores.length + ' actores'}? Quedará en el historial.`);
          const confirmar = boton('Confirmar borrado', async () => {
            if (!ctx.activo() || !params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
            try {
              for (const a of o.actores) await datos.borrar(params.empresa, 'actores', a.id);
              if (o.registro) await datos.borrar(params.empresa, 'actores-organizaciones', o.registro.id);
              if (!ctx.activo()) return; const ids = new Set(o.actores.map(a => a.id));
              ctx.listas.actores = ctx.listas.actores.filter(a => !ids.has(a.id)); ctx.listas['actores-organizaciones'] = (ctx.listas['actores-organizaciones'] || []).filter(x => x.id !== o.id); pintar();
            } catch (e) { ctx.error(aviso, e); confirmar.disabled = false; }
          }); aviso.append(confirmar, boton('Cancelar', () => aviso.replaceChildren())); confirmar.focus();
        })); return [o.nombre, categorias.find(c => c[0] === o.categoria)?.[1] || o.categoria, String(o.actores.length), o.cuadrante || 'Sin calificar', acciones];
      })); zona.append(editor);
    }
    const verHistorial = boton('Historial de cambios', async () => {
      historial.replaceChildren(el('p','Cargando historial…'));
      try {
        const cambios = await datos.historial(params.empresa, { coleccion:'actores', limite:50 }); if (!ctx.activo()) return;
        historial.replaceChildren(el('h3','Últimos cambios del módulo'));
        if (!cambios.length) texto(historial,'Todavía no hay cambios registrados.');
        tabla(historial, ['Fecha','Acción','Organización'], cambios.map(c => [new Intl.DateTimeFormat('es-CO', {dateStyle:'short',timeStyle:'short'}).format(new Date(c.fecha)), ({INSERT:'Creación',UPDATE:'Edición',DELETE:'Borrado',crear:'Creación',editar:'Edición',borrar:'Borrado'})[c.accion] || 'Cambio', ctx.listas.actores.find(a => a.id === c.registro_id)?.institucion || 'Actor retirado']));
      } catch(e) { historial.replaceChildren(); ctx.error(historial,e); }
    });
    contenedor.append(zona, verHistorial, historial);
    root.KitVistaCargaExcel.seccion(contenedor, {
      modulo: 'actores',
      rutaPlantilla: 'plantillas/plantilla-modulo-i.xlsx',
      nombrePlantilla: 'plantilla-modulo-i.xlsx',
      contexto: async () => {
        await ctx.cargar(['actores-contactos']).catch(() => {});
        return { cfg: ctx.cfg, esquema: ctx.esquema, existentes: ctx.listas.actores, contactos: ctx.listas['actores-contactos'] || [] };
      },
      guardar: async registrosPorColeccion => {
        const lista = registrosPorColeccion.actores || [];
        if (lista.length) {
          await datos.guardarVarios(params.empresa, 'actores', lista);
          const porId = new Map(lista.map(a => [a.id, a]));
          ctx.listas.actores = [...ctx.listas.actores.filter(a => !porId.has(a.id)), ...lista];
        }
        pintar();
      },
      error: ctx.error
    });
    pintar(); return ctx.limpiar;
  }
  App.registrarVista('actores/mapa', {render:mapa});
  App.registrarVista('actores/alimentacion', {render:alimentacion});
}(typeof globalThis !== 'undefined' ? globalThis : this));
