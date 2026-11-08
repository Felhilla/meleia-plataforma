(function (root) {
  'use strict';
  // E57 (8-nov): portada de los Resultados con la lógica del Look and Feel (la misma de la Metodología).
  // Banda oscura con el panel del módulo, el caso, el selector en arco y cuatro cifras doradas calculadas con los
  // datos de la empresa. Debajo queda el resultado que ya existe (laberinto inteligente: las cifras llevan a él y la
  // tarjeta Criterios lleva a la Metodología). No duplica cálculos: usa KitActores, KitRiesgos y los registros.
  const num = (n, d = 1) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const prom = xs => { const v = xs.filter(x => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const json = async ruta => { const r = await root.fetch(ruta); if (!r.ok) throw Error('No se pudo cargar ' + ruta); return r.json(); };
  const ROMANO = { actores: 'I', ddhh: 'II', materialidad: 'III', riesgos: 'IV' };

  // Cifras de cada módulo: { afirmacion, texto, tiles: [{ n, texto?, rotulo, sub }] }
  const CIFRAS = {
    async actores(d, e) {
      const [cfg, actores, orgs] = await Promise.all([json('config/kit-actores-config.json'), d.listar(e, 'actores'), d.listar(e, 'actores-organizaciones')]);
      const A = root.KitActores, ind = A.indicadores(actores, cfg), pos = Object.fromEntries(ind.posiciones.map(p => [p.nombre, p.cantidad]));
      const alertas = actores.filter(a => A.alerta(a, cfg)).length, mayor = [...ind.cuadrantes].sort((a, b) => b.cantidad - a.cantidad)[0];
      return { afirmacion: `${num(actores.length)} actores mapeados: ${num(pos.Favorable || 0)} favorables, ${num(pos.Neutral || 0)} neutrales y ${num(pos.Desfavorable || 0)} desfavorables.`,
        texto: mayor ? `El nivel de relacionamiento más frecuente es ${mayor.nombre.toLowerCase()}, con ${num(mayor.cantidad)} actores.` : '',
        tiles: [{ n: actores.length, rotulo: 'Actores', sub: 'identificados, caracterizados y calificados' },
          { n: orgs.length || new Set(actores.map(a => a.institucion)).size, rotulo: 'Organizaciones', sub: 'que agrupan a los actores' },
          { n: alertas, rotulo: 'En alerta', sub: `posición ${String(cfg.alerta.posicion).toLowerCase()} y tensión de ${cfg.alerta.tensionMinima} o más` }] };
    },
    async ddhh(d, e) {
      const [cat, evals, res] = await Promise.all([json('config/kit-ddhh-catalogo.json'), d.listar(e, 'ddhh-evaluaciones'), d.listar(e, 'ddhh-resultados')]);
      const ev = [...evals].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), r = ev.find(x => x.origen !== 'ejemplo') || ev[0];
      if (!r) return null;
      const grandes = cat.dimensiones?.grandes || [], deG = id => cat.ejes.filter(x => x.grafico === id).map(x => r[x.id]);
      const enf = grandes.map(g => ({ titulo: g.titulo, valor: prom(deG(g.id)) }));
      const titular = res.find(x => x.tipo === 'titular'), menor = cat.ejes.filter(x => typeof r[x.id] === 'number').sort((a, b) => r[a.id] - r[b.id])[0];
      return { afirmacion: titular?.titulo || `${r.nombre}.`, texto: titular?.texto || (menor ? `La calificación más baja está en ${menor.nombre.toLowerCase()}.` : ''),
        tiles: [...enf.map(x => ({ n: x.valor, texto: num(x.valor), rotulo: x.titulo, sub: 'sobre 5, promedio de sus partes' })),
          { n: cat.indicadores.length, rotulo: 'Preguntas', sub: 'calificadas de 0 a 5 con evidencia' }].slice(0, 3) };
    },
    async materialidad(d, e) {
      const [temas, aspectos] = await Promise.all([d.listar(e, 'materialidad-temas'), d.listar(e, 'materialidad-aspectos')]);
      const doble = temas.filter(t => t.tipo === 'Doble').length;
      return { afirmacion: `${num(temas.length)} temas materiales de ${num(aspectos.length)} aspectos evaluados.`,
        texto: `${num(doble)} de ellos son materiales en las dos dimensiones: por su impacto en las personas y el ambiente, y por su efecto financiero.`,
        tiles: [{ n: aspectos.length, rotulo: 'Aspectos', sub: 'evaluados por impacto y por efecto financiero' },
          { n: temas.length, rotulo: 'Temas materiales', sub: 'superan al menos un umbral' },
          { n: doble, rotulo: 'Doble materialidad', sub: 'materiales en las dos dimensiones' }] };
    },
    async riesgos(d, e) {
      const [cfg, riesgos, cal, medidas] = await Promise.all([json('config/kit-riesgos-config.json'), d.listar(e, 'riesgos'), d.listar(e, 'riesgos-calificacion'), d.listar(e, 'riesgos-medidas')]);
      const R = root.KitRiesgos, pr = cal.map(c => R.prioridad(c, cfg)), alta = pr.filter(p => p === 'Alta').length, media = pr.filter(p => p === 'Media').length;
      const av = R.avance(medidas, cfg, e);
      return { afirmacion: `${num(riesgos.length)} riesgos en derechos humanos: ${num(alta)} de prioridad alta y ${num(media)} de prioridad media.`,
        texto: `El plan tiene ${num(av.total)} medidas, ${num(av.cumplidas)} cumplidas.`,
        tiles: [{ n: riesgos.length, rotulo: 'Riesgos', sub: 'identificados y calificados' },
          { n: alta, rotulo: 'Prioridad alta', sub: `medidas en ${cfg.plazos.Alta} meses` },
          { n: av.total, rotulo: 'Medidas', sub: `${num(av.porcentaje, 0)} % cumplidas` }] };
    }
  };

  function portada(modulo, d, p, cifras) {
    const App = root.App, el = App.el, M = App.modulos.find(x => x.id === modulo);
    const s = el('section', null, 'kit-banda kit-banda-oscura kit-met-portada kit-res-portada');
    const panel = el('div', null, 'kit-met-panel'), texto = el('div', null, 'kit-met-panel-texto'), marca = el('div', null, 'kit-met-marca');
    marca.append(el('p', `Módulo ${ROMANO[modulo]}, resultados`, 'kit-mono'));
    const caso = el('div', null, 'kit-res-caso');
    const desc = el('div', null, 'kit-met-descripcion');
    desc.append(el('p', cifras.afirmacion, 'kit-met-afirmacion'));
    if (cifras.texto) desc.append(el('p', cifras.texto, 'kit-met-texto'));
    texto.append(marca, caso, el('h2', M?.nombre || '', 'kit-met-titulo'), desc);
    panel.append(texto, root.KitVistaMetodologia.selectorArco({ modulo, empresa: p.empresa, puedeEditar: p.puedeEditar }, 'Resultados'));
    const tiles = el('ul', null, 'kit-met-tiles');
    const destino = el('div', null, 'kit-res-ancla'); destino.tabIndex = -1;
    cifras.tiles.forEach((t, k) => {
      const b = el('button', null, 'kit-met-tile'); b.type = 'button';
      b.append(el('span', t.texto || num(t.n, 0), 'kit-met-tile-num'), el('span', t.rotulo, 'kit-met-tile-rotulo'), el('span', t.sub, 'kit-met-tile-sub'), el('span', 'Ver', 'kit-met-tile-abrir'));
      b.setAttribute('aria-label', `${t.texto || num(t.n, 0)} ${t.rotulo}, ${t.sub}. Ir al resultado`);
      b.style?.setProperty?.('--i', k);
      b.onclick = () => { destino.scrollIntoView?.({ behavior: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); destino.focus?.({ preventScroll: true }); };
      const li = el('li'); li.append(b); tiles.append(li);
    });
    // Cuarta tarjeta: cómo se calificó, en la Metodología (ícono, como en la Metodología).
    const a = el('a', null, 'kit-met-tile kit-res-criterios'); a.href = `#/${modulo}/${p.empresa}/metodologia`;
    const ns = 'http://www.w3.org/2000/svg', ic = root.document.createElementNS(ns, 'svg'), path = root.document.createElementNS(ns, 'path');
    ic.setAttribute('class', 'kit-met-tile-icono'); ic.setAttribute('viewBox', '0 0 24 24'); ic.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', root.KitVistaMetodologia.ICONOS.balanza); ic.append(path);
    a.append(ic, el('span', 'Criterios', 'kit-met-tile-rotulo'), el('span', 'cómo se calificó, en la Metodología', 'kit-met-tile-sub'), el('span', 'Abrir', 'kit-met-tile-abrir'));
    const li = el('li'); li.append(a); tiles.append(li);
    s.append(panel, tiles);
    return { s, caso, destino };
  }

  // Pantalla "En proceso" con animación (decisión de Felipe, 8-nov): los Resultados se calculan al completar.
  async function enProcesoVista(c, d, p, proc, verPublicada, modulo = 'ddhh') {
    const el = root.App.el, s = el('section', null, 'kit-banda kit-banda-oscura kit-res-proceso');
    const anim = el('div', null, 'kit-res-proceso-anim'); anim.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 3; k++) anim.append(el('span'));
    s.append(anim, el('p', `Módulo ${ROMANO[modulo]}, resultados`, 'kit-mono'), el('h2', 'En proceso', 'kit-met-titulo'),
      el('p', `"${proc.nombre}" se está llenando: ${proc.completas}${proc.total ? ' de ' + proc.total : ''} ${proc.completas === 1 && !proc.total ? 'sección completa' : 'secciones completas'}. Los Resultados se muestran cuando estén todas.`, 'kit-met-texto'));
    const acc = el('div', null, 'kit-ali-acciones');
    if (p.puedeEditar) { const a = el('a', 'Ir a Alimentación', 'kit-met-pastilla'); a.href = `#/${modulo}/${p.empresa}/alimentacion`; acc.append(a); }
    const evs = verPublicada ? await d.listar(p.empresa, 'ddhh-evaluaciones') : [];
    if (evs.length) { const b = el('button', 'Ver la última evaluación publicada', 'kit-ali-secundario'); b.type = 'button'; b.onclick = () => verPublicada(); acc.append(b); }
    s.append(acc); c.append(s);
  }
  const VISTAS = { actores: 'actores/mapa', ddhh: 'ddhh/resultados', materialidad: 'materialidad/resultados', riesgos: 'riesgos/matriz' };
  function envolver(modulo) {
    const original = root.App.vista(VISTAS[modulo]);
    if (!original) return;
    root.App.registrarVista(VISTAS[modulo], {
      async render(c, d, p) {
        // E60: si hay una evaluación en proceso, los Resultados todavía no se calculan y se dice "En proceso".
        if (modulo === 'ddhh' && root.KitAlimentacionDdhh && !p.verPublicada) {
          let proc = null; try { proc = await root.KitAlimentacionDdhh.enProceso(d, p.empresa); } catch (_) { proc = null; }
          if (p.vigente && !p.vigente()) return;
          if (proc) return enProcesoVista(c, d, p, proc, () => { c.replaceChildren(); return root.App.vista(VISTAS[modulo]).render(c, d, { ...p, verPublicada: true }); });
        }
        // E61: en I y IV los registros se califican en el sitio, así que no hay una versión anterior que mostrar.
        if (['actores', 'riesgos'].includes(modulo) && root.KitAlimentacionRegistros) {
          let proc = null; try { proc = await root.KitAlimentacionRegistros.enProceso(d, p.empresa, modulo); } catch (_) { proc = null; }
          if (p.vigente && !p.vigente()) return;
          if (proc) return enProcesoVista(c, d, p, proc, null, modulo);
        }
        let cifras = null;
        try { cifras = await CIFRAS[modulo](d, p.empresa); } catch (_) { cifras = null; }
        if (p.vigente && !p.vigente()) return;
        if (!cifras) return original.render(c, d, p);
        const { s, caso, destino } = portada(modulo, d, p, cifras);
        // El selector de casos del armazón pasa al panel (la banda de título y las pestañas se ocultan, como en la Metodología).
        const vista = c.closest?.('.kit-vista'), sel = vista?.querySelector?.(':scope > .kit-casos, :scope > .kit-caso-unico');
        if (sel) caso.append(sel);
        const cuerpo = root.App.el('section', null, 'kit-res-cuerpo');
        c.append(s, destino, cuerpo);
        return original.render(cuerpo, d, p);
      }
    });
  }
  if (root.App) Object.keys(VISTAS).forEach(envolver);
  const api = { CIFRAS, VISTAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitPortadaResultados = api;
}(typeof window !== 'undefined' ? window : globalThis));
