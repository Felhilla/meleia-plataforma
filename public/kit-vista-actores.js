(function (root) {
  'use strict';
  const App = root.App, K = root.KitActores, el = App.el;
  const numero = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
  const porciento = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  const orgs = n => `${numero(n)} ${n === 1 ? 'organización' : 'organizaciones'}`;
  const NOTA_DATOS = 'Tratamiento de datos personales. Este instrumento es una muestra comercial. En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, se presentan únicamente los nombres y canales de contacto de servidores públicos y de representantes de instituciones académicas y medios de comunicación obtenidos de fuentes de acceso público. Los datos de integrantes de comunidades, organizaciones sociales y demás grupos de interés se sustituyen por información de ejemplo, identificada como tal. Los datos reales se entregan únicamente al cliente, en el marco de la relación contractual y con las garantías de tratamiento que exige la ley.';
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
    img.src = segura(dato?.imagen) ? dato.imagen : 'img/actores/' + (categorias.find(c => c[0] === org.registros[0].categoria)?.[2] || 'gremios') + '.svg';
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
    const p = ctx.dialogo(org.nombre, true), registros = org.registros;
    p.classList.add('ka-ficha');
    const cabecera = el('div', null, 'ka-ficha-cabecera'), info = el('div');
    info.append(el('h2', org.nombre, 'ka-franja-verde'));
    const ordenes = unicos(registros.map(a => a.orden)); if (ordenes.length) texto(info, 'Orden: ' + ordenes.join(' · '));
    const cajas = el('div', null, 'ka-cajas');
    ['impacto','influencia'].forEach(c => { const caja = el('div'); caja.append(el('strong', ctx.esquema.campos[c].etiqueta), intensidad(registros,c)); cajas.append(caja); });
    const pos = el('div'); pos.append(el('strong', 'Posición'), etiqueta(posicion(registros)));
    if (posicion(registros) === 'Mixta') texto(pos, posiciones.map((v,i) => { const n = registros.filter(a => a.posicion === v).length; return n ? `${numero(n)} ${n === 1 ? v.toLowerCase() : plurales[i].toLowerCase()}` : ''; }).filter(Boolean).join(' · '));
    cajas.append(pos); info.append(cajas); cabecera.append(logo(ctx,org), info); p.append(cabecera);
    p.append(el('h3','CARACTERIZACIÓN','ka-franja-gris'));
    const textos = unicos(registros.map(a => a.caracterizacion?.trim()));
    (textos.length ? textos : ['Sin caracterización registrada.']).forEach(t => p.append(el('p',t,'ka-caracterizacion')));
    p.append(el('h3','Listado de actores identificados'));
    tablaFicha(p, [['Nombre'],['Cargo'],['Posición'],['Impacto','impacto'],['Influencia','influencia'],['Contacto']], registros.map(a => {
      const contacto = ctx.listas['actores-contactos'].find(c => c.id === a.id) || {}, nombre = el('div', contacto.nombre || 'No registrado'), datos = el('div');
      if (contacto.ejemplo === true) nombre.append(el('small','Dato de ejemplo','ka-ejemplo'));
      if (contacto.telefono) texto(datos,contacto.telefono);
      const correo = typeof contacto.correo === 'string' && contacto.correo.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.correo) ? contacto.correo : '';
      if (correo) texto(datos,correo); if (!contacto.telefono && !correo) texto(datos,'No registrado');
      return [nombre,a.cargo,etiqueta(a.posicion),intensidad([a],'impacto'),intensidad([a],'influencia'),datos];
    }),ctx);
    p.lastChild.append(el('p', NOTA_DATOS, 'ka-nota-datos'));
    const detalle = el('details'); detalle.append(el('summary','MÁS DETALLE','ka-franja-gris'));
    tablaFicha(detalle, [['Cargo'],['Dependencia','dependencia'],['Tensión','tension'],['Responsabilidad','responsabilidad'],['Cuadrante']], registros.map(a => {
      const nivel = el('div',K.nivelFinal(a,ctx.cfg) || 'Sin calificar');
      if (a.nivel_ajustado) nivel.append(el('small','Ajustado: ' + a.motivo_ajuste));
      if (K.alerta(a,ctx.cfg)) nivel.append(el('strong','⚠ Alerta'));
      return [a.cargo,intensidad([a],'dependencia'),intensidad([a],'tension'),intensidad([a],'responsabilidad'),nivel];
    }),ctx); p.append(detalle);
  }
  async function abrirPanel(ctx, nivel) {
    if (!ctx.activo()) return;
    const p = ctx.dialogo(nivel.nombre); mensaje(p,'Cargando organizaciones…');
    try { await ctx.logos(); if (!ctx.activo() || ctx.panelActual !== p) return;
      p.lastChild.remove();
      const grupos = agrupar(ctx.listas.actores.filter(a => K.nivelFinal(a,ctx.cfg) === nivel.nombre)), activos = new Set(), filtros = el('div',null,'ka-posiciones'), lista = el('div');
      posiciones.forEach((pos,i) => {
        const b = boton(`${numero(grupos.filter(o => o.registros.some(a => a.posicion === pos)).length)} ${plurales[i]}`, () => { activos.has(pos) ? activos.delete(pos) : activos.add(pos); b.setAttribute('aria-pressed',String(activos.has(pos))); pintar(); });
        b.className = 'ka-filtro ka-' + pos.toLowerCase(); b.setAttribute('aria-pressed','false'); filtros.append(b);
      });
      p.append(filtros);
      const presentes = unicos(grupos.flatMap(o => o.registros.map(a => a.categoria)));
      const select = seleccionar(p,'Filtrar por grupo de interés',[{id:'',nombre:'Todos'},...categorias.filter(c => presentes.includes(c[0])).map(c => ({id:c[0],nombre:c[1]}))]);
      function pintar() {
        lista.replaceChildren(); let total = 0;
        categorias.forEach(([categoria,nombre]) => {
          if (select.value && select.value !== categoria) return;
          const visibles = grupos.filter(o => o.registros.some(a => a.categoria === categoria) && (!activos.size || o.registros.some(a => activos.has(a.posicion))));
          const rango = o => Math.min(...o.registros.map(a => { const i = ['Internacional','Nacional','Regional','Local'].indexOf(a.orden); return i < 0 ? 4 : i; }));
          // Dentro del mismo orden, el ejecutivo va antes que la corporación: gobernación antes que asamblea, alcaldía antes que concejo.
          const jerarquia = o => { const i = ['Gobernación','Asamblea Departamental','Alcaldía','Concejo Municipal'].findIndex(p => o.nombre.startsWith(p)); return i < 0 ? 4 : i; };
          visibles.sort((a,b) => (categoria === categorias[0][0] ? rango(a)-rango(b) || jerarquia(a)-jerarquia(b) : 0) || a.nombre.localeCompare(b.nombre,'es'));
          if (!visibles.length) return; total += visibles.length;
          const seccion = el('section',null,'ka-categoria'), rejilla = el('div',null,'ka-organizaciones'); seccion.append(el('h3',nombre),rejilla);
          visibles.forEach(o => { const b = boton(null,() => fichaOrganizacion(ctx,ctx.organizaciones.find(g => g.nombre === o.nombre))); b.className = 'ka-organizacion'; b.setAttribute('aria-label',o.nombre + ' · ' + posicion(o.registros)); b.title = o.nombre; b.append(logo(ctx,o),el('span',o.nombre,'ka-nombre'),etiqueta(posicion(o.registros))); rejilla.append(b); }); lista.append(seccion);
        });
        if (!total) mensaje(lista,'No hay organizaciones con estos filtros.');
      }
      select.onchange = pintar; p.append(lista); pintar();
    } catch(e) { ctx.error(p,e); }
  }
  async function abrirResumen(ctx) {
    if (!ctx.activo()) return;
    // Misma estructura que la ficha del Módulo II (dim-ficha): cabeza con título y panel de cifra, banda y tabla.
    const p = ctx.dialogo('Organizaciones identificadas', true, true); p.classList.add('dim-ficha', 'ka-resumen-dialogo');
    try { await ctx.logos(); if (!ctx.activo() || ctx.panelActual !== p) return;
      const cabeza = el('header', null, 'dim-ficha-cabeza'), titulo = el('div', null, 'dim-ficha-titulo'), total = el('div', null, 'dim-ficha-calif ka-resumen-total');
      titulo.append(el('p', 'Mapa de actores', 'antetitulo'), el('h2', 'Organizaciones identificadas'), el('p', 'Por posición frente al proyecto y por categoría.', 'nota'));
      total.append(el('span', 'Total', 'dim-ficha-rotulo'), el('strong', numero(ctx.organizaciones.length)), el('span', ctx.organizaciones.length === 1 ? 'organización' : 'organizaciones', 'dim-ficha-nivel'));
      cabeza.append(titulo, total);
      const banda = el('section', null, 'dim-ficha-hallazgos ka-resumen-posiciones'), ul = el('ul');
      banda.append(el('h3', 'Posición frente al proyecto'));
      posiciones.forEach((pos, i) => { const li = el('li', null, 'ka-resumen-pos-' + pos.toLowerCase()); li.append(el('strong', numero(ctx.organizaciones.filter(o => o.registros.some(a => a.posicion === pos)).length)), el('span', plurales[i])); ul.append(li); });
      banda.append(ul);
      { const mixtas = ctx.organizaciones.filter(o => posicion(o.registros) === 'Mixta').length; if (mixtas) banda.append(el('p', `${orgs(mixtas)} con cargos de distinta posición; por eso cuentan en más de una posición.`, 'nota')); }
      const env = el('div', null, 'dim-ficha-tabla-env'), tabla = el('table', null, 'dim-ficha-tabla ka-resumen-tabla'), thead = el('thead'), tr = el('tr'), body = el('tbody');
      tabla.setAttribute('aria-label', 'Organizaciones por categoría');
      ['Categoría', 'Organizaciones'].forEach(t => { const th = el('th', t); th.scope = 'col'; tr.append(th); }); thead.append(tr);
      categorias.forEach(([categoria, nombre]) => {
        const cantidad = agrupar(ctx.listas.actores.filter(a => a.categoria === categoria)).length;
        if (!cantidad) return;
        const fila = el('tr'), th = el('th', nombre); th.scope = 'row'; fila.append(th, el('td', numero(cantidad))); body.append(fila);
      });
      tabla.append(thead, body); env.append(tabla);
      p.append(cabeza, banda, env);
    } catch(e) { ctx.error(p,e); }
  }
  async function mapa(contenedor, datos, params) {
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    await ctx.cargar(['actores-contactos','actores-resumen']); if (!ctx.activo()) return ctx.limpiar;
    let logos;
    ctx.logos = () => logos || (logos = ctx.cargar(['actores-logos']).catch(e => { logos = null; throw e; }));
    const actores = ctx.listas.actores; ctx.organizaciones = agrupar(actores);
    if (!actores.length) { texto(contenedor, 'Esta empresa aún no tiene actores registrados. Agrega su institución, cargo y calificaciones para construir el mapa.'); if (params.puedeEditar) enlace(contenedor, params.empresa); return ctx.limpiar; }
    const mapa = el('div',null,'ka-mapa-e24');
    ctx.cfg.niveles.forEach(n => {
      const miembros = ctx.organizaciones.filter(o => o.registros.some(a => K.nivelFinal(a,ctx.cfg) === n.nombre));
      const porcentaje = porciento(miembros.length / ctx.organizaciones.length * 100), q = boton(null,() => abrirPanel(ctx,n));
      q.className = 'ka-cuadro'; q.dataset.cuadrante = n.nombre; q.style.gridRow = n.fila; q.style.gridColumn = n.columna;
      q.dataset.color = n.nombre === 'Gestión activa' ? 'azul' : n.nombre === 'Involucramiento estratégico' ? 'verde' : 'naranja';
      q.setAttribute('aria-label',`${n.nombre}: ${orgs(miembros.length)}, ${porcentaje} %`);
      const cifra = el('span',null,'ka-cifra');
      cifra.append(el('strong',numero(miembros.length)), el('span',` ${miembros.length === 1 ? 'organización' : 'organizaciones'} · ${porcentaje} %`));
      q.append(el('strong',n.nombre),el('span',n.descripcion),cifra);
      const compartidas = miembros.filter(o => unicos(o.registros.map(a => K.nivelFinal(a,ctx.cfg))).length > 1).length;
      if (compartidas) q.append(el('small',`Incluye ${orgs(compartidas)} que también ${compartidas === 1 ? 'está' : 'están'} en otro cuadrante`)); mapa.append(q);
    });
    const centro = boton(null,() => abrirResumen(ctx)); centro.className = 'ka-centro'; centro.setAttribute('aria-label',`${numero(ctx.organizaciones.length)} Organizaciones identificadas`); centro.append(el('strong',numero(ctx.organizaciones.length)),el('span','Organizaciones identificadas')); mapa.append(centro); contenedor.append(mapa);
    const fecha = ctx.listas['actores-resumen'].find(r => r.id === 'resumen')?.fecha_corte;
    const valida = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0,10) === fecha;
    texto(contenedor,'Metodología AA1000SES (AccountAbility).' + (valida ? ` Mapeo con corte a ${new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(fecha))}.` : '') + ' Los datos de contacto de comunidades y organizaciones sociales son de ejemplo (Ley 1581 de 2012).');
    contenedor.lastChild.className = 'ka-nota-tecnica'; return ctx.limpiar;
  }
  function formulario(ctx, n, original, alGuardar) {
    const form = el('form', null, 'ka-form'), controles = {}, errores = {}; form.noValidate = true;
    Object.entries(ctx.esquema.campos).forEach(([k,r]) => {
      const row = el('div', null, 'ka-campo'), label = el('label', r.etiqueta + (r.obligatorio ? ' *' : ''));
      const input = el(r.tipo === 'lista' ? 'select' : r.tipo === 'texto-largo' ? 'textarea' : 'input');
      if (r.tipo === 'lista') [{ id:'', nombre:'Sin seleccionar' }, ...(r.valoresManual || r.valores).map(id => ({ id, nombre:id }))].forEach(o => { const op = el('option', o.nombre); op.value = o.id; input.append(op); });
      input.name = k; input.id = 'ka-' + k; input.value = original?.[k] ?? ''; label.htmlFor = input.id;
      const error = el('p', '', 'ka-error'); error.id = 'ka-error-' + k; error.setAttribute('aria-live', 'polite'); input.setAttribute('aria-describedby', error.id);
      row.append(label, input, error);
      if (ctx.cfg.escalas[k]) { const ul = el('ul', null, 'ka-ayuda'); ul.id = 'ka-ayuda-' + k; ctx.cfg.escalas[k].forEach((d,i) => ul.append(el('li', `${i+1}: ${d}`))); row.append(ul); input.setAttribute('aria-describedby', error.id + ' ' + ul.id); }
      controles[k] = input; errores[k] = error; form.append(row);
    });
    if (original?.motivo_ajuste === ctx.esquema.campos.motivo_ajuste.valores[4]) {
      controles.motivo_ajuste.value = ''; texto(form, 'Este actor proviene de un mapeo original. Para guardar una edición, selecciona un motivo manual o retira el ajuste.');
    }
    const vivo = el('p'), previa = el('div'), aviso = el('p'); vivo.setAttribute('role','status'); aviso.setAttribute('role','status');
    const leer = () => Object.fromEntries(Object.entries(controles).map(([k,c]) => [k,c.value]));
    const actualizar = () => {
      previa.replaceChildren(); const a = leer(); vivo.textContent = 'Nivel calculado: ' + (K.nivelCalculado(a, ctx.cfg) || 'Completa influencia e impacto con valores de 1 a 5.');
      const ajuste = controles.nivel_ajustado, previo = ajuste.value, permitidos = K.permitidos(a,ctx.cfg);
      ajuste.replaceChildren(); ['', ...permitidos].forEach(v => { const op = el('option', v || 'Sin ajuste'); op.value = v; ajuste.append(op); }); ajuste.value = permitidos.includes(previo) ? previo : '';
      if (!ajuste.value) { controles.motivo_ajuste.value = ''; controles.explicacion_ajuste.value = ''; }
      controles.motivo_ajuste.disabled = controles.explicacion_ajuste.disabled = !ajuste.value;
    };
    Object.values(controles).forEach(c => { c.oninput = actualizar; c.onchange = actualizar; });
    const guardar = boton('Revisar y guardar'); guardar.type = 'submit'; form.append(vivo, aviso, guardar, previa); n.append(form); actualizar();
    form.onsubmit = e => {
      e.preventDefault(); if (!ctx.activo() || !ctx.params.puedeEditar) return;
      previa.replaceChildren(); Object.keys(errores).forEach(k => { errores[k].textContent = ''; controles[k].setAttribute('aria-invalid','false'); });
      const r = K.validar({ ...leer(), id: original?.id || 'act-' + root.crypto.randomUUID() }, ctx.cfg, ctx.esquema);
      if (!r.ok) { r.errores.forEach(e => { errores[e.campo].textContent = 'Actores, fila 1: ' + e.mensaje; controles[e.campo].setAttribute('aria-invalid','true'); }); controles[r.errores[0].campo].focus(); return; }
      Object.entries(ctx.esquema.campos).forEach(([k,regla]) => { if (r.registro[k]) texto(previa, `${regla.etiqueta}: ${r.registro[k]}`); });
      texto(previa, 'Nivel final: ' + K.nivelFinal(r.registro, ctx.cfg));
      const confirmar = boton('Confirmar guardado', async () => {
        if (!ctx.activo() || !ctx.params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
        try { await ctx.datos.guardar(ctx.params.empresa, 'actores', r.registro.id, r.registro); if (!ctx.activo()) return; ctx.listas.actores = [...ctx.listas.actores.filter(a => a.id !== r.registro.id), r.registro]; alGuardar(); }
        catch(e) { ctx.error(aviso,e); confirmar.disabled = false; }
      }); previa.append(confirmar); confirmar.focus();
    };
  }
  async function alimentacion(contenedor, datos, params) {
    if (!params.puedeEditar) { texto(contenedor, 'Esta sección está disponible para el responsable de la empresa.'); return; }
    const ctx = await preparar(contenedor, datos, params); if (!ctx) return;
    const zona = el('section'), historial = el('section');
    function pintar() {
      zona.replaceChildren(); const editor = el('section'), aviso = el('div');
      const editar = a => { editor.replaceChildren(el('h3', a ? 'Editar actor' : 'Agregar actor')); formulario(ctx, editor, a, pintar); editor.querySelectorAll('select')[0]?.focus(); };
      zona.append(boton('Agregar', () => editar(null)), aviso);
      if (!ctx.listas.actores.length) texto(zona, 'Aún no hay actores. Usa Agregar para registrar el primero.');
      tabla(zona, ['Institución', 'Cargo', 'Nivel final', 'Acciones'], ctx.listas.actores.map(a => {
        const acciones = el('div', null, 'ka-acciones'); acciones.append(boton('Editar', () => editar(a)), boton('Borrar', () => {
          aviso.replaceChildren(); texto(aviso, `¿Borrar ${a.institucion}? Esta acción quedará en el historial.`);
          const confirmar = boton('Confirmar borrado', async () => {
            if (!ctx.activo() || !params.puedeEditar || confirmar.disabled) return; confirmar.disabled = true;
            try { await datos.borrar(params.empresa, 'actores', a.id); if (!ctx.activo()) return; ctx.listas.actores = ctx.listas.actores.filter(x => x.id !== a.id); pintar(); }
            catch(e) { ctx.error(aviso,e); confirmar.disabled = false; }
          }); aviso.append(confirmar, boton('Cancelar', () => aviso.replaceChildren())); confirmar.focus();
        })); return [a.institucion, a.cargo, K.nivelFinal(a,ctx.cfg), acciones];
      })); zona.append(editor);
    }
    const verHistorial = boton('Historial de cambios', async () => {
      historial.replaceChildren(el('p','Cargando historial…'));
      try {
        const cambios = await datos.historial(params.empresa, { coleccion:'actores', limite:50 }); if (!ctx.activo()) return;
        historial.replaceChildren(el('h3','Últimos cambios del módulo'));
        if (!cambios.length) texto(historial,'Todavía no hay cambios registrados.');
        tabla(historial, ['Fecha','Acción','Actor'], cambios.map(c => [new Intl.DateTimeFormat('es-CO', {dateStyle:'short',timeStyle:'short'}).format(new Date(c.fecha)), ({INSERT:'Creación',UPDATE:'Edición',DELETE:'Borrado'})[c.accion] || 'Cambio', ctx.listas.actores.find(a => a.id === c.registro_id)?.institucion || 'Actor retirado']));
      } catch(e) { historial.replaceChildren(); ctx.error(historial,e); }
    });
    contenedor.append(zona, verHistorial, historial);
    root.KitVistaCargaExcel.seccion(contenedor, {
      modulo: 'actores',
      rutaPlantilla: 'plantillas/plantilla-modulo-i.xlsx',
      nombrePlantilla: 'plantilla-modulo-i.xlsx',
      contexto: async () => {
        // Los contactos solo sirven para reconocer a un servidor público ya cargado sin nombre.
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
