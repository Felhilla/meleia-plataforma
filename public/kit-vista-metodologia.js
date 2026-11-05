(function (root) {
  'use strict';
  // Pestaña Metodología, común a los cuatro módulos. El contenido vive en config/kit-metodologia.json
  // para que se pueda revisar y aprobar sin tocar código.
  let cache = null;
  async function contenido() {
    if (!cache) cache = root.fetch('config/kit-metodologia.json').then(r => { if (!r.ok) throw Error('No se pudo cargar la metodología.'); return r.json(); }).catch(e => { cache = null; throw e; });
    return cache;
  }
  function pintar(c, m) {
    const el = root.App.el, art = el('article', null, 'kit-metodologia');
    if (!m || !(m.secciones || []).length) { art.append(el('p', 'La metodología de este módulo está en preparación.', 'nota')); c.append(art); return; }
    if (m.resumen) art.append(el('p', m.resumen, 'kit-metodologia-resumen'));
    m.secciones.forEach(s => {
      const sec = el('section', null, 'kit-metodologia-seccion');
      sec.append(el('h2', s.titulo));
      (s.parrafos || []).forEach(t => sec.append(el('p', t)));
      if ((s.puntos || []).length) { const ul = el('ul'); s.puntos.forEach(t => ul.append(el('li', t))); sec.append(ul); }
      art.append(sec);
    });
    if ((m.fuentes || []).length) { const f = el('section', null, 'kit-metodologia-fuentes'), ul = el('ul'); f.append(el('h2', 'Referencias')); m.fuentes.forEach(t => ul.append(el('li', t))); f.append(ul); art.append(f); }
    c.append(art);
  }
  const vista = modulo => ({ async render(c, _, p) { const todo = await contenido(); if (p?.vigente && !p.vigente()) return; pintar(c, todo[modulo]); } });
  const api = { pintar, vista };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitVistaMetodologia = api;
  if (root.App) ['actores', 'ddhh', 'materialidad', 'riesgos'].forEach(m => root.App.registrarVista(m + '/metodologia', vista(m)));
}(typeof window !== 'undefined' ? window : globalThis));
