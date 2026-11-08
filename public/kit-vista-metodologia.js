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
  const E = n => 'config/esquemas/' + n + '.json';
  // Fuentes de cada módulo: sus parámetros y los esquemas de su Alimentación. La Metodología no copia cifras.
  const FUENTES = {
    actores: ['config/kit-actores-config.json', E('actores'), E('actores-organizaciones')],
    ddhh: ['config/kit-ddhh-catalogo.json', 'config/kit-ddhh-cruce.json', 'config/kit-carga-excel.json', E('ddhh-indicadores')],
    materialidad: ['config/kit-materialidad-catalogo.json', E('materialidad-temas'), E('materialidad-impacto'), E('materialidad-financiera'), E('materialidad-participacion')],
    riesgos: ['config/kit-riesgos-config.json', E('riesgos'), E('riesgos-calificacion'), E('riesgos-validaciones'), E('riesgos-medidas')]
  };
  const cache = new Map();
  function cargar(ruta) {
    if (!cache.has(ruta)) cache.set(ruta, root.fetch(ruta).then(r => { if (!r.ok) throw Error('No se pudo cargar la metodología.'); return r.json(); }).catch(e => { cache.delete(ruta); throw e; }));
    return cache.get(ruta);
  }

  // ---------- Modelo común (réplica en los cuatro módulos) ----------
  // La vista pinta siempre el mismo modelo. Cada módulo tiene un adaptador que lo arma con dos fuentes:
  // el texto de config/kit-metodologia.json y los parámetros reales del módulo (escalas, cortes, campos de los esquemas).
  // Para replicar en un módulo nuevo: escribir su bloque en kit-metodologia.json y un adaptador como los de abajo.
  //   tiles     [{ n, rotulo, sub, abre: 'estandares' | 'proceso' | 'enfoques' | 'criterios', parte }]
  //   partes    { clave: { nav, ante, titular, intro, centro: [antetitulo, frase], unidad, items: [paso] } }
  //   paso      { id, icono, titulo, sub, oficial, ref: { texto, ficha }, pideRotulo, pide, buscamos: [{ nombre, descripcion }],
  //               documentos: [{ documento, esg, fuente }], respaldo: [{ texto, ficha }], preguntas: [{ codigo, pregunta, grupo, niveles }] }
  //   enfoques  { titular, intro, items: [{ titulo, pregunta, cifra, cifraTexto, entregables, parte }] }
  //   criterios { ante, titular, intro, escalas: [{ titulo, pregunta, niveles: [{ valor, nombre, descripcion, color }] }],
  //               calculo: [{ cifra, rotulo, texto }], cortes, tabla, notas, reglas: [{ titulo, texto }] }
  const CIRC = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const ICONOS = {
    documento: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13l2 2 4-4',
    lupa: CIRC(10, 10, 6) + 'M14.5 14.5L20 20',
    escudo: 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6zM9 12l2 2 4-4',
    grafica: 'M4 4v16h16M7 15l4-4 3 3 5-6',
    dialogo: 'M4 5h16v11H10l-5 4v-4H4zM8 9h8M8 12h5',
    corazon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    cadena: 'M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6l-1.2 1.2M14 10a4 4 0 0 1 0 5.6l-2.4 2.4a4 4 0 0 1-5.6-5.6l1.2-1.2',
    nino: CIRC(12, 5, 2) + 'M12 8v6M8 11h8M10 21l2-7 2 7',
    igual: CIRC(12, 12, 8) + 'M8.5 10h7M8.5 14h7',
    balanza: 'M12 4v16M8 20h8M5 7h14M5 7l-2.5 6h5zM19 7l-2.5 6h5z',
    personas: CIRC(8, 8, 2.5) + CIRC(16, 8, 2.5) + 'M3 19c0-3 2-5 5-5s5 2 5 5M11 19c0-3 2-5 5-5s5 2 5 5',
    casco: 'M3 17h18M5 17a7 7 0 0 1 14 0M10 10V6.5h4V10',
    moneda: CIRC(12, 12, 8) + 'M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11',
    reloj: CIRC(12, 12, 8) + 'M12 8v4l3 2',
    maletin: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
    hoja: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l8-8',
    globo: CIRC(12, 12, 8) + 'M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16',
    ficha: 'M4 5h16v14H4zM7 9h4M7 13h10M7 16h7' + CIRC(16, 9, 1.5),
    matriz: 'M4 4h16v16H4zM12 4v16M4 12h16',
    diana: CIRC(12, 12, 8) + CIRC(12, 12, 4.5) + CIRC(12, 12, 1),
    lista: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
    genero: CIRC(10, 13, 4.5) + 'M13.2 9.8L19 4M15 4h4v4M10 17.5V22M8 20h4'
  };
  const ICONO_EJE = { 'etapa-ocde-1': 'documento', 'etapa-ocde-2': 'lupa', 'etapa-ocde-3': 'escudo', 'etapa-ocde-4': 'grafica', 'etapa-ocde-5': 'dialogo', 'etapa-ocde-6': 'corazon',
    'tema-ddhh-1': 'cadena', 'tema-ddhh-2': 'nino', 'tema-ddhh-3': 'igual', 'tema-ddhh-4': 'genero', 'tema-ddhh-5': 'personas', 'tema-ddhh-6': 'casco',
    'tema-ddhh-7': 'moneda', 'tema-ddhh-8': 'reloj', 'tema-ddhh-9': 'maletin', 'tema-ddhh-10': 'hoja' };
  // Respaldo: cada marco citado se enlaza a la ficha de su estándar. Si no hay ficha, queda como texto.
  const fichaDeMarco = (fichas, t) => (fichas.find(f => [f.sigla, f.columna, f.catalogo].filter(Boolean).some(s => t.startsWith(s))) || (/OIT|Protocolo de 2014/.test(t) ? fichas.find(f => f.id === 'oit') : null))?.id || null;
  // Campos de un esquema como lo que se pregunta o se registra. Los campos de nivel muestran su escala.
  function camposComoPreguntas(esquema, ids, niveles = {}) {
    const campos = esquema?.campos || {};
    return ids.filter(id => campos[id]).map((id, k) => ({ codigo: String(k + 1).padStart(2, '0'), pregunta: campos[id].etiqueta, niveles: niveles[id] }));
  }
  const listaNiveles = (textos, desde = 1) => textos.map((t, k) => ({ valor: k + desde, descripcion: t }));
  // Pasos escritos en la config, completados con los parámetros del módulo. Lo que se pregunta sale de los campos
  // de los esquemas (los mismos de la Alimentación), así la Metodología no promete algo que el instrumento no registra.
  function pasosDe(m, esquemas, niveles = {}, extras = {}) {
    return m.proceso.pasos.map(p => {
      const preguntas = (p.campos || []).flatMap(c => camposComoPreguntas(esquemas[c.esquema], c.ids, niveles).map(q => ({ ...q, grupo: c.grupo || null })));
      preguntas.forEach((q, k) => { q.codigo = String(k + 1).padStart(2, '0'); });
      return { pideRotulo: '¿Qué pide el estándar?', buscamos: [], documentos: [], respaldo: [], ...p, preguntas, ...(extras[p.id] || {}), icono: ICONOS[p.icono] || ICONOS.lista,
        sub: extras[p.id]?.sub || (preguntas.length ? `${preguntas.length} ${p.preguntasUnidad || 'datos'}` : 'Abrir la ficha') };
    });
  }
  const fichasDe = m => m.estandares?.fichas || [];
  const tilesBase = (m, partes, enf, nCrit, subCrit) => [
    { n: fichasDe(m).length, rotulo: 'Estándares', sub: 'que respaldan el método', abre: 'estandares' },
    { n: Object.values(partes)[0].items.length, rotulo: m.proceso.rotulo || 'Pasos', sub: m.proceso.sub, abre: 'proceso' },
    { n: enf.items.length, rotulo: 'Enfoques', sub: 'con los que se lee el resultado', abre: 'enfoques' },
    { n: nCrit, rotulo: 'Criterios', sub: subCrit, abre: 'criterios' }];

  // Lo que la Metodología necesita del catálogo del Módulo II, calculado y no copiado.
  function datosDdhh(cat, cruce, m, excel, esqInd) {
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
    const dimensiones = (cat.dimensiones?.grandes || []).map(g => ({ ...g, ejes: cat.ejes.filter(e => e.grafico === g.id).map(e => e.id) }));
    const totalCriterios = cat.ejes.reduce((s, e) => s + e.componentes.length, 0);
    const celda = (eje, col) => cruceOk ? (filas[ordenEjes.indexOf(eje)]?.celdas?.[col] || []) : [];
    const fichas = fichasDe(m);
    const respaldo = id => marcos(id).map(t => ({ texto: t, ficha: fichaDeMarco(fichas, t) }));
    const preguntasDe = id => {
      const comps = ejes.get(id)?.componentes || [];
      return indicadores(id).map(q => ({ codigo: q.codigo, pregunta: q.pregunta, grupo: comps.length > 1 ? comps.find(c => c.id === q.componente)?.nombre : null }));
    };
    const base = id => ({ id, icono: ICONOS[ICONO_EJE[id]], sub: `${indicadores(id).length} preguntas`, respaldo: respaldo(id), preguntas: preguntasDe(id) });
    const partes = {
      etapas: { nav: 'Incorporación de la DD', ante: 'Incorporación de la debida diligencia', titular: m.metodo.titular, intro: m.metodo.intro,
        centro: ['GUÍA OCDE', m.metodo.frase], unidad: 'Etapa',
        items: m.metodo.etapas.map((e, i) => ({ ...base(e.eje), titulo: e.titulo, oficial: e.oficial + '.', ref: { texto: `Guía OCDE, paso ${i + 1}, ${e.pagina}`, ficha: 'ocde' },
          pideRotulo: '¿Qué pide el estándar?', pide: e.pide, evidencia: e.evidencia, documentos: e.documentos || [],
          buscamos: (ejes.get(e.eje)?.componentes || []).map(c => ({ nombre: c.nombre, descripcion: c.descripcion })) })) },
      derechos: { nav: 'Gestión de DDHH', ante: 'Gestión de derechos humanos', titular: m.temas.titular, intro: m.temas.intro,
        centro: ['DERECHOS', 'Gestión\nde DDHH'], unidad: 'Derecho',
        items: m.temas.items.map(t => ({ ...base(t.eje), titulo: corto(t.eje), oficial: (ejes.get(t.eje)?.nombre || '') + '.', pideRotulo: '¿Qué protege?', pide: t.protege, buscamos: [], documentos: [] })) }
    };
    const entrega = m.entrega?.items || [];
    const enfoques = { titular: m.dimensiones?.titular, intro: m.dimensiones?.intro,
      items: dimensiones.map(g => {
        const esEtapas = g.id === 'etapas-ocde', crit = g.ejes.reduce((t, id) => t + (ejes.get(id)?.componentes?.length || 0), 0);
        return { titulo: g.titulo, pregunta: g.pregunta, parte: esEtapas ? 'etapas' : 'derechos', cifra: crit || g.ejes.length,
          cifraTexto: crit ? `criterios en ${g.ejes.length} etapas` : 'derechos, cada uno con sus preguntas',
          entregables: entrega.slice(0, 3).map(it => it.titulo.replace(/ por etapa y por tema$/, esEtapas ? ' por etapa' : ' por derecho')) };
      }) };
    const cs = cat.umbrales.cortes, minimo = cat.umbrales.escala.minimo, maximo = cat.umbrales.escala.maximo;
    const criterios = { ante: 'Cómo se califica', titular: m.calificacion.titular, intro: m.calificacion.intro,
      escalas: [{ titulo: 'Escala de calificación', niveles: escala.map(n => ({ valor: n.valor, nombre: n.nombre, descripcion: n.descripcion, color: color(n.valor) })) }],
      calculo: [{ cifra: cat.indicadores.length, rotulo: 'preguntas', texto: 'Cada una se califica de 0 a 5 con su evidencia.' },
        { cifra: totalCriterios, rotulo: 'criterios', texto: 'Promedio de sus preguntas.' },
        { cifra: cat.ejes.length, rotulo: 'etapas y derechos', texto: 'Promedio de sus criterios. Los derechos sin criterios promedian sus preguntas.' },
        { cifra: dimensiones.length, rotulo: 'enfoques', texto: 'Promedio de sus etapas o de sus derechos.' }],
      cortes: cs.map((c, k) => { const desde = k ? cs[k - 1].menor_que : minimo;
        return { rango: c.menor_que === null ? `${num(desde)} o más` : k ? `De ${num(desde)} a menos de ${num(c.menor_que)}` : `Menos de ${num(c.menor_que)}`, color: c.color, peso: (c.menor_que ?? maximo) - desde }; }),
      notas: cat.umbrales.hipotesis ? ['Cortes de color en validación con el equipo técnico.'] : [],
      reglas: m.calificacion.reglas };
    const usos = f => {
      const ids = f.columna ? ordenEjes.filter(id => celda(id, f.columna).length) : ordenEjes.filter(id => marcos(id).some(x => x.startsWith(f.catalogo)));
      return ids.map(id => ({ titulo: corto(id), n: f.columna ? celda(id, f.columna).length : 0 }));
    };
    return {
      ejes, indicadores, corto, marcos, escala, color, umbrales: cat.umbrales,
      totalIndicadores: cat.indicadores.length, totalCriterios, totalEjes: cat.ejes.length, dimensiones,
      sectores: cruce?.sectores || [], columnas: cruceOk ? sector.columnas : [], celda, ordenEjes,
      fichas, partes, enfoques, criterios, usos, totalUsos: `${cat.ejes.length} etapas y derechos`,
      tiles: [{ n: fichas.length, rotulo: 'Estándares', sub: 'internacionales que respaldan el método', abre: 'estandares' },
        { n: m.metodo.etapas.length, rotulo: 'Etapas', sub: 'del proceso de debida diligencia de la OCDE', abre: 'proceso', parte: 'etapas' },
        { n: dimensiones.length, rotulo: 'Enfoques', sub: 'con los que se lee el resultado', abre: 'enfoques' },
        { n: totalCriterios, icono: 'balanza', rotulo: 'Criterios', sub: `de calificación: qué se califica, cómo y por qué`, abre: 'criterios' }],
      calificar: calificarDdhh()
    };
    // Ventana Criterios de calificación (boceto 261108_Home_Criterios). Todo sale del catálogo, del esquema y de la
    // tabla de columnas del Excel. El texto (metodología y variable de cada enfoque) sale de kit-metodologia.json.
    function calificarDdhh() {
      const K = m.criterios;
      if (!K?.enfoques) return null;
      const niveles = cat.calificacion?.brechas?.niveles || [];
      const escalaDe = id => (cat.estandares.find(e => e.id === id) || cat.estandares[0]).escala.niveles
        .map(n => ({ valor: n.valor, nombre: niveles.find(x => x.valor === n.valor)?.nombre || '', descripcion: n.descripcion, color: color(n.valor) }))
        .sort((a, b) => a.valor - b.valor);
      const columnas = (excel?.ddhh?.hojas || []).find(h => h.coleccion === 'ddhh-indicadores')?.columnas || [];
      const col = campo => columnas.find(c => c.campo === campo)?.encabezado || esqInd?.campos?.[campo]?.etiqueta || campo;
      const VALOR = { si: 'Sí', no: 'No', parcial: 'Parcial' };
      const valores = (esqInd?.campos?.incorporado?.valores || []).map(v => VALOR[v] || v);
      const registros = ['documentos', 'descripcion', 'brecha'].map(col);
      return { ante: K.ante, titular: K.titular, escalaTitular: K.escala_titular, escalaNota: K.escala_nota, temasNota: K.temas_nota,
        alimentacion: K.alimentacion, plantilla: 'plantillas/plantilla-modulo-ii.xlsx', reglas: m.calificacion.reglas,
        enfoques: dimensiones.map(g => { const t = K.enfoques[g.id] || {};
          return { id: g.id, nombre: g.titulo, corto: t.corto || g.titulo, metodologia: t.metodologia, variable: t.variable, parte: g.id === 'etapas-ocde' ? 'etapas' : 'derechos', escala: escalaDe(g.id) }; }),
        grupos: [
          { n: 1, rotulo: ['variable calificada', 'variables calificadas'], items: [col('calificacion')], texto: K.grupos.calificada },
          { n: 1, rotulo: ['verificación', 'verificaciones'], items: [`${col('incorporado')}: ${valores.join(', ')}`], texto: K.grupos.verificacion },
          { n: registros.length, rotulo: ['registro de evidencia', 'registros de evidencia'], items: registros, texto: K.grupos.registros },
          { n: criterios.calculo.length, rotulo: ['paso de cálculo', 'pasos de cálculo'], items: criterios.calculo.map(x => `${num(x.cifra)} ${x.rotulo}: ${x.texto}`), texto: K.grupos.calculo }] };
    }
  }

  // ---------- Módulo I: Mapeo de actores ----------
  function datosActores(cfg, esqActores, esqOrg, m) {
    const ejes = ['influencia', 'impacto', 'dependencia', 'tension', 'responsabilidad'];
    const nombre = k => esqActores?.campos?.[k]?.etiqueta || k;
    const niveles = Object.fromEntries(ejes.map(k => [k, listaNiveles(cfg.escalas[k] || [])]));
    const posiciones = cfg.organizacion?.desempatePosicion || [];
    const partes = { proceso: { ...m.proceso, unidad: 'Paso', items: pasosDe(m, { actores: esqActores, organizaciones: esqOrg }, niveles, {
      identificar: { buscamos: (cfg.nombreServidor?.categorias || []).map(c => ({ nombre: c, descripcion: '' })) },
      caracterizar: { buscamos: [{ nombre: 'Caracterización', descripcion: `Un párrafo natural de hasta ${cfg.organizacion?.caracterizacionMax || 500} caracteres sobre quién es el actor y qué le interesa.` },
        { nombre: 'Posición', descripcion: posiciones.join(', ') + '.' }] },
      calificar: { buscamos: ejes.map(k => ({ nombre: nombre(k), descripcion: m.criterios.preguntas[k] })) },
      priorizar: { buscamos: cfg.niveles.map(n => ({ nombre: n.nombre, descripcion: `${n.descripcion}. Influencia ${n.influencia} e impacto ${n.impacto}.` })) }
    }) } };
    const enfoques = { ...m.enfoques, items: m.enfoques.items.map((e, k) => ({ ...e, parte: 'proceso',
      cifra: k ? cfg.niveles.length : ejes.length, cifraTexto: k ? 'niveles de relacionamiento' : 'escalas de 1 a 5 por actor' })) };
    const criterios = { ...m.criterios,
      escalas: ejes.map(k => ({ titulo: nombre(k), pregunta: m.criterios.preguntas[k], niveles: niveles[k] })),
      calculo: [{ cifra: ejes.length, rotulo: 'escalas', texto: 'Cada actor se califica de 1 a 5 en cada una.' },
        { cifra: 2, rotulo: 'ejes de la matriz', texto: 'Influencia e impacto ubican al actor.' },
        { cifra: cfg.corte, rotulo: 'corte', texto: `Desde ${cfg.corte} el eje se considera alto.` },
        { cifra: cfg.niveles.length, rotulo: 'niveles', texto: 'Cada cuadrante de la matriz es un nivel de relacionamiento.' }],
      tabla: { titulo: 'Niveles de relacionamiento', columnas: ['Impacto bajo', 'Impacto alto'], filas: ['Influencia alta', 'Influencia baja'],
        celdas: [1, 2].map(f => [1, 2].map(c => { const n = cfg.niveles.find(x => x.fila === f && x.columna === c); return n ? `${n.nombre}: ${n.descripcion.toLowerCase()}` : ''; })) },
      reglas: [...m.criterios.reglas,
        { titulo: 'Alerta de conflicto', texto: `El actor se marca en alerta si su posición es ${String(cfg.alerta.posicion).toLowerCase()} o si su tensión es de ${cfg.alerta.tensionMinima} o más.` },
        { titulo: 'Cuándo se puede ajustar el nivel', texto: 'Solo con uno de estos motivos: ' + cfg.motivosAjuste.map(x => x.charAt(0).toLowerCase() + x.slice(1)).join(', ') + '.' }] };
    const fichas = fichasDe(m);
    return { fichas, partes, enfoques, criterios, tiles: tilesBase(m, partes, enfoques, ejes.length, 'escalas de 1 a 5 para calificar a cada actor') };
  }

  // ---------- Módulo III: Doble materialidad ----------
  function datosMaterialidad(cat, esq, m) {
    const sev = cat.impacto.severidad, fin = cat.financiera.variables, vars = [...sev, 'probabilidad', ...fin];
    const etiqueta = k => esq.impacto?.campos?.[k]?.etiqueta || esq.financiera?.campos?.[k]?.etiqueta || k;
    const escala = cat.escala.niveles.map(n => ({ valor: n.valor, nombre: n.etiqueta, descripcion: n.descripcion }));
    const niveles = Object.fromEntries(vars.map(k => [k, escala]));
    const partes = { proceso: { ...m.proceso, unidad: 'Paso', items: pasosDe(m, esq, niveles, {
      contexto: { buscamos: cat.grupos.map(g => ({ nombre: g.nombre, descripcion: '' })) },
      evaluar: { buscamos: [{ nombre: 'Gravedad', descripcion: 'Promedio de ' + sev.map(etiqueta).join(', ').toLowerCase().replace(/, ([^,]*)$/, ' e $1') + '.' },
        { nombre: 'Importancia del impacto', descripcion: 'Promedio de la gravedad y la probabilidad, y luego de todos los grupos que califican.' },
        { nombre: 'Efecto financiero', descripcion: 'Promedio de ' + fin.map(etiqueta).join(' y ').toLowerCase() + ', y luego de las áreas que califican.' }] },
      priorizar: { buscamos: cat.cuadrantes.map(q => ({ nombre: q.etiqueta, descripcion: '' })) }
    }) } };
    const enfoques = { ...m.enfoques, items: m.enfoques.items.map((e, k) => ({ ...e, parte: 'proceso',
      cifra: k ? cat.evaluadores_financieros.length : cat.grupos.length, cifraTexto: k ? 'áreas de la empresa califican' : 'grupos de interés califican' })) };
    const ilustrativa = cat.escala.niveles.some(n => n.origen === 'ilustrativo');
    const criterios = { ...m.criterios,
      escalas: [{ titulo: 'Escala de calificación', pregunta: `De ${cat.escala.minimo} a ${cat.escala.maximo}, igual para todas las variables.`, niveles: escala },
        ...vars.map(k => ({ titulo: etiqueta(k), pregunta: m.criterios.preguntas[k], niveles: [] }))],
      calculo: [{ cifra: sev.length, rotulo: 'variables de gravedad', texto: 'Su promedio es la gravedad.' },
        { cifra: 2, rotulo: 'para la importancia', texto: 'Promedio de gravedad y probabilidad.' },
        { cifra: fin.length, rotulo: 'variables financieras', texto: 'Su promedio es el efecto financiero.' },
        { cifra: 2, rotulo: 'umbrales', texto: 'Uno por dimensión: el promedio de todos los temas evaluados.' }],
      notas: ilustrativa ? ['Las descripciones de la escala son ilustrativas y están en validación con el equipo técnico.'] : [],
      reglas: [...m.criterios.reglas, { titulo: 'Cuándo un tema es material', texto: cat.umbral.nota }] };
    const fichas = fichasDe(m);
    return { fichas, partes, enfoques, criterios, tiles: tilesBase(m, partes, enfoques, vars.length, 'variables calificadas de 0 a 5') };
  }

  // ---------- Módulo IV: Riesgos ----------
  function datosRiesgos(cfg, esq, m) {
    const g = cfg.gravedad, crit = g.criterios;
    const etiqueta = k => esq.calificacion?.campos?.[k]?.etiqueta || k;
    const niveles = Object.fromEntries([...crit.map(k => [k, Array.from({ length: g.maximo - g.minimo + 1 }, (_, i) => ({ valor: g.minimo + i, descripcion: '' }))]),
      ['probabilidad', cfg.probabilidades.map(p => ({ valor: p, descripcion: '' }))]]);
    const partes = { proceso: { ...m.proceso, unidad: 'Paso', items: pasosDe(m, esq, niveles, {
      calificar: { buscamos: [...crit.map(k => ({ nombre: etiqueta(k), descripcion: m.criterios.preguntas[k] })), { nombre: 'Probabilidad', descripcion: m.criterios.preguntas.probabilidad }] },
      validar: { buscamos: [{ nombre: cfg.resultadoConfirma, descripcion: 'El grupo está de acuerdo con la calificación técnica.' }, { nombre: cfg.resultadoAjuste, descripcion: 'El grupo propone otra calificación y la justifica.' }] },
      responder: { buscamos: cfg.componentes.map(c => ({ nombre: c.nombre, descripcion: '' })) }
    }) } };
    const enfoques = { ...m.enfoques, items: m.enfoques.items.map((e, k) => ({ ...e, parte: 'proceso',
      cifra: k ? cfg.componentes.length : crit.length + 1, cifraTexto: k ? 'componentes del plan de medidas' : 'criterios fijan la prioridad' })) };
    const cortes = g.cortes.map((c, k) => ({ rango: `${c.nivel}: ` + (c.menor_que === null ? `desde ${num(g.cortes[k - 1].menor_que)}` : k ? `de ${num(g.cortes[k - 1].menor_que)} a menos de ${num(c.menor_que)}` : `menos de ${num(c.menor_que)}`), color: ['#5E7A45', '#B78D36', '#A8503A'][k], peso: (c.menor_que ?? g.maximo) - (k ? g.cortes[k - 1].menor_que : g.minimo) }));
    const tipos = Object.entries(cfg.tiposMedida).map(([v, t]) => ({ titulo: `Si la empresa ${v === 'Causa' ? 'causa el impacto' : v === 'Contribuye' ? 'contribuye al impacto' : 'está directamente vinculada'}`,
      texto: Object.entries(t).map(([tipo, ms]) => `Riesgo ${tipo.toLowerCase()}: ${ms.join(', ').toLowerCase()}`).join('. ') + '.' }));
    const criterios = { ...m.criterios,
      escalas: [...crit.map(k => ({ titulo: etiqueta(k), pregunta: m.criterios.preguntas[k], niveles: niveles[k] })),
        { titulo: 'Probabilidad', pregunta: m.criterios.preguntas.probabilidad, niveles: niveles.probabilidad }],
      calculo: [{ cifra: crit.length, rotulo: 'criterios de gravedad', texto: `Cada uno de ${g.minimo} a ${g.maximo}. La gravedad es su promedio.` },
        { cifra: g.cortes.length, rotulo: 'niveles de gravedad', texto: 'Los cortes convierten el promedio en baja, media o alta.' },
        { cifra: cfg.probabilidades.length, rotulo: 'niveles de probabilidad', texto: cfg.probabilidades.join(', ') + '.' },
        { cifra: cfg.niveles.length, rotulo: 'prioridades', texto: 'La matriz de gravedad y probabilidad fija la prioridad.' }],
      cortes,
      tabla: { titulo: 'Prioridad según gravedad y probabilidad', columnas: cfg.probabilidades.map(p => 'Probabilidad ' + p.toLowerCase()), filas: cfg.niveles.map(n => 'Gravedad ' + n.toLowerCase()),
        celdas: cfg.niveles.map(n => cfg.probabilidades.map(p => cfg.prioridad[n]?.[p] || '')) },
      reglas: [...m.criterios.reglas,
        { titulo: 'Plazos según la prioridad', texto: cfg.niveles.map(n => `Prioridad ${n.toLowerCase()}: ${cfg.plazos[n]} meses`).join('. ') + '.' },
        ...tipos] };
    const fichas = fichasDe(m);
    return { fichas, partes, enfoques, criterios, tiles: tilesBase(m, partes, enfoques, crit.length + 1, 'de gravedad y probabilidad que fijan la prioridad') };
  }

  function pintar(c, m, extra = {}) {
    const App = root.App, el = App.el, doc = root.document;
    const art = el('article', null, 'kit-met');
    if (!m || !extra.datos) {
      const b = el('section', null, 'kit-banda kit-met-banda kit-banda-oscura kit-met-hero');
      b.append(el('h2', 'Metodología', 'kit-mono kit-antetitulo'), el('p', 'La metodología de este módulo está en preparación.', 'kit-titular'));
      art.append(b); c.append(art); return;
    }
    const d = extra.datos, fichas = d.fichas, porId = new Map(fichas.map(f => [f.id, f]));
    const svg = (tag, attrs = {}) => { const n = doc.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
    const mono = (t, clase = '') => el('p', t, ('kit-mono ' + clase).trim());
    const icono = (it, clase = 'kit-pro-icono') => {
      const s = svg('svg', { class: clase, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
      s.append(svg('path', { d: it.icono || ICONOS.lista })); return s;
    };
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
    // Regreso rápido (regla transversal, 8-nov): el fondo difuminado es un botón enorme e invisible que cierra todas
    // las ventanas y deja al usuario en la vista central del módulo. La X sigue regresando de a un nivel.
    function cerrarTodo() { while (pila.length > 1) { const v = pila.pop(); v.v.remove?.(); } regresar(); }
    capa.onclick = ev => { if (ev.target === capa) cerrarTodo(); };

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
    const abreCon = { estandares: b => ventanaEstandares(b), proceso: (b, t) => ventanaProceso(b, t.parte), enfoques: b => ventanaEnfoques(b), criterios: b => ventanaCriterios(b) };
    d.tiles.forEach((t, k) => {
      const cifra = t.icono ? icono({ icono: ICONOS[t.icono] }, 'kit-met-tile-icono') : el('span', num(t.n), 'kit-met-tile-num');
      const b = boton('kit-met-tile', cifra, el('span', t.rotulo, 'kit-met-tile-rotulo'), el('span', t.sub, 'kit-met-tile-sub'), el('span', 'Abrir', 'kit-met-tile-abrir'));
      b.setAttribute('aria-label', `${t.icono ? '' : num(t.n) + ' '}${t.rotulo.toLowerCase()} ${t.sub}. Abrir la ventana`); b.setAttribute('aria-haspopup', 'dialog');
      b.style?.setProperty?.('--i', k); b.onclick = () => abreCon[t.abre](b, t);
      const li = el('li'); li.append(b); tiles.append(li); if (!t.icono) contar(cifra, t.n);
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
      if (d.sectores?.length) { const b = boton('kit-met-pastilla', el('span', 'Ver el cruce de estándares')); b.setAttribute('aria-haspopup', 'dialog'); b.onclick = () => ventanaCruce(b); pie.append(b); }
      return pie;
    }
    // Dónde se usa cada estándar en el módulo. Por defecto, los pasos que lo citan como respaldo o referencia.
    const todosLosPasos = Object.values(d.partes).flatMap(p => p.items);
    const usos = f => d.usos ? d.usos(f) : todosLosPasos.filter(it => (it.respaldo || []).some(r => r.ficha === f.id) || it.ref?.ficha === f.id).map(it => ({ titulo: it.titulo, n: 0 }));
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
      donde.forEach(u => chips.append(el('li', u.titulo + (u.n ? ` (${u.n})` : ''))));
      abrir(f.sigla, [cab, ...(rel.children.length ? [bloque('Relación con otros estándares', rel)] : []),
        desplegable(`Dónde se usa en el módulo: ${donde.length} de ${d.totalUsos || todosLosPasos.length + ' pasos'}`, donde.length ? chips : el('p', 'Se aplica al módulo en su conjunto.', 'kit-met-nota'), 'kit-met-despliega-linea'),
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
    // Una o varias partes en la misma ventana (en el Módulo II: Incorporación y Gestión). Cada paso abre su ficha,
    // y la ficha abre la ventana de preguntas.
    const ESG = { A: 'Ambiental', S: 'Social', G: 'Gobernanza' };
    const partes = d.partes;
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
        ic.append(svg('path', { d: it.icono || ICONOS.lista }));
        nodo.append(svg('circle', { r: rn, class: 'kit-serv-nodo-fondo' }), svg('circle', { r: rn - 5, class: 'kit-serv-nodo-aro', stroke: col }), ic);
        g.append(nodo); dibujo.append(g);
        const b = boton('kit-serv-titulo', el('span', dos(i), 'kit-mono'), el('span', it.titulo, 'kit-serv-titulo-texto'), el('span', it.sub || 'Abrir', 'kit-serv-ver'));
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
      diagrama.append(dibujo, el('p', `${parte.titular} ${items.map(x => x.titulo).join(', ')}.`, 'solo-lectores'), titulos);
      diagrama.classList?.add('recarga');
      return diagrama;
    }
    function ventanaProceso(desde, cual = Object.keys(partes)[0]) {
      const claves = Object.keys(partes), zona = el('div', null, 'kit-pro-zona');
      const cuerpo = el('div', null, 'kit-pro' + (claves.length > 1 ? '' : ' kit-pro-una'));
      const botones = claves.map(k => { const b = boton('kit-pro-nav-boton', el('span', partes[k].nav)); b.onclick = () => mostrar(k); return [k, b]; });
      function mostrar(k) {
        cual = k; const p = partes[k];
        botones.forEach(([kk, b]) => { b.setAttribute('aria-pressed', String(kk === k)); b.classList?.toggle('actual', kk === k); });
        zona.replaceChildren(...encabezado(p.ante, p.titular, p.intro), arcoProceso(p, k));
      }
      if (claves.length > 1) { const nav = el('nav', null, 'kit-pro-nav'); nav.setAttribute('aria-label', 'Partes del proceso'); nav.append(...botones.map(x => x[1])); cuerpo.append(nav); }
      cuerpo.append(zona); mostrar(cual);
      abrir('Proceso', [cuerpo], desde, 'kit-ven-proceso');
    }
    function fichaProceso(cual, i, desde) {
      const p = partes[cual], it = p.items[i];
      const cab = el('header', null, 'kit-pro-cabeza'), sello = el('span', null, 'kit-pro-sello');
      sello.append(icono(it));
      const tit = el('div'); tit.append(mono(`${p.unidad} ${dos(i)} de ${p.items.length}`), el('h3', it.titulo, 'kit-pro-titulo'));
      cab.append(sello, tit);
      // Referencia: el nombre oficial y dónde está en el estándar, con enlace al documento.
      const ref = el('div', null, 'kit-pro-ref');
      if (it.oficial) ref.append(el('p', it.oficial, 'kit-met-oficial'));
      const fRef = it.ref && porId.get(it.ref.ficha);
      if (fRef) ref.append(aDocumento(fRef, 'kit-pro-enlace', el('span', it.ref.texto), el('span', ' ↗')));
      else if (it.ref) ref.append(el('p', it.ref.texto, 'kit-met-nota'));
      // Estándares que lo respaldan, cada uno con enlace a su documento en línea.
      const respaldo = el('ul', null, 'kit-pro-respaldo');
      (it.respaldo || []).forEach(r => { const fi = r.ficha && porId.get(r.ficha), li = el('li');
        li.append(fi ? aDocumento(fi, 'kit-pro-enlace', el('span', r.texto), el('span', ' ↗')) : el('span', r.texto)); respaldo.append(li); });
      const caja = (clase, rotulo, ...hijos) => { const s = el('section', null, 'kit-pro-caja ' + clase); s.append(mono(rotulo, 'kit-pro-rotulo'), ...hijos); return s; };
      const derecha = el('div', null, 'kit-pro-derecha');
      if (it.documentos?.length) {
        // Documentos que los estándares piden, mencionan o recomiendan. La viñeta dice la dimensión ESG
        // (forma y color, como en el Módulo III). Lo económico va en Gobernanza.
        const ul = el('ul', null, 'kit-pro-docs');
        it.documentos.forEach(x => { const li = el('li', null, 'kit-esg-' + x.esg); li.title = x.fuente; li.append(el('span', ESG[x.esg] + ': ', 'solo-lectores'), el('span', x.documento)); ul.append(li); });
        const ley = el('ul', null, 'kit-pro-leyenda'); ley.setAttribute('aria-hidden', 'true');
        [...new Set(it.documentos.map(x => x.esg))].sort((a, b) => 'ASG'.indexOf(a) - 'ASG'.indexOf(b)).forEach(k => ley.append(el('li', ESG[k], 'kit-esg-' + k)));
        derecha.append(caja('kit-pro-evidencias', 'Evidencias: documentos que analizamos', ul, ley));
      } else if (it.evidencia) derecha.append(caja('kit-pro-evidencias', 'Evidencias', parrafo(it.evidencia)));
      if (it.respaldo?.length) derecha.append(caja('kit-pro-estandar', 'Estándares que lo respaldan', respaldo));
      if (it.preguntas?.length) {
        const bp = boton('kit-pro-preguntar', el('span', it.preguntasRotulo || '¿Qué preguntamos?', 'kit-pro-preguntar-texto'), el('span', `${num(it.preguntas.length)} ${it.preguntasUnidad || 'preguntas'}`, 'kit-mono'));
        bp.setAttribute('aria-haspopup', 'dialog'); bp.onclick = () => ventanaPreguntas(it, bp); derecha.append(bp);
      }
      const analiza = el('div', null, 'kit-pro-analiza');
      if (it.buscamos?.length) {
        const ul = el('ul', null, 'kit-pro-busca');
        it.buscamos.forEach(c => { const li = el('li'); li.append(el('strong', c.nombre)); if (c.descripcion && c.descripcion.trim() !== c.nombre.trim()) li.append(el('span', c.descripcion)); ul.append(li); });
        analiza.append(caja('kit-pro-izq', 'Qué buscamos', ul));
      } else analiza.classList?.add('kit-pro-solo');
      analiza.append(derecha);
      abrir(it.titulo, [cab, el('p', 'Referencia', 'kit-mono kit-pro-sub'), ref,
        el('h4', it.pideRotulo || '¿Qué pide el estándar?', 'kit-pro-pregunta'), parrafo(it.pide),
        el('h4', '¿Qué analizamos?', 'kit-pro-pregunta'), analiza], desde, 'kit-ven-ficha kit-ven-pro-ficha');
    }
    function ventanaPreguntas(it, desde) {
      const todas = it.preguntas, grupos = el('div', null, 'kit-pro-preguntas');
      const fila = q => {
        const li = el('li'), texto = el('div'); texto.append(el('span', q.pregunta));
        if (q.niveles?.length) { const nv = el('ol', null, 'kit-pro-niveles');
          q.niveles.forEach(x => { const l = el('li'); l.append(el('strong', String(x.valor)), el('span', [x.nombre, x.descripcion].filter(Boolean).join(': '))); nv.append(l); }); texto.append(nv); }
        li.append(el('span', q.codigo, 'kit-mono'), texto); return li;
      };
      const nombres = [...new Set(todas.map(q => q.grupo).filter(Boolean))];
      if (nombres.length) nombres.forEach(nm => { const s = el('section'), ol = el('ol'); todas.filter(q => q.grupo === nm).forEach(q => ol.append(fila(q))); s.append(el('h4', nm, 'kit-pro-grupo'), ol); grupos.append(s); });
      else { const ol = el('ol'); todas.forEach(q => ol.append(fila(q))); grupos.append(ol); }
      abrir('Preguntas', [mono(it.titulo, 'kit-ven-ante'), el('h2', it.preguntasRotulo || '¿Qué preguntamos?', 'kit-titular kit-ven-titular'),
        el('p', it.preguntasIntro || `${num(todas.length)} preguntas, tal como se le formulan a la empresa. Cada una se califica de 0 a 5 con su evidencia.`, 'kit-met-intro'), grupos], desde, 'kit-ven-preguntas');
    }

    // ---------- Ventana: Enfoques (boceto 261108_Metodologicos_Ejes) ----------
    // Laberinto inteligente: cada pieza lleva a un lugar que ya existe. Entregables al Resultado, cifra e ícono a la
    // Metodología de ese enfoque (ventana Proceso) y la pastilla Criterios a la ventana de Criterios.
    function iconoArco() {
      const s = svg('svg', { class: 'kit-enf-arco', viewBox: '0 0 60 60', 'aria-hidden': 'true', focusable: 'false' });
      [0, 1, 2, 3, 4, 5].forEach(k => { const a0 = (-90 + k * 30 + 2) * Math.PI / 180, a1 = (-90 + (k + 1) * 30 - 2) * Math.PI / 180;
        const P = (r, a) => `${14 + r * Math.cos(a)} ${30 + r * Math.sin(a)}`;
        s.append(svg('path', { d: `M${P(26, a0)}A26 26 0 0 1 ${P(26, a1)}L${P(15, a1)}A15 15 0 0 0 ${P(15, a0)}Z`, fill: COLORES[k % 4] })); });
      return s;
    }
    function ventanaEnfoques(desde) {
      const rejilla = el('div', null, 'kit-enf'), E = d.enfoques;
      const resultados = extra.empresa ? `#/${extra.modulo}/${extra.empresa}/resultados` : '';
      E.items.forEach((g, k) => {
        const tarjeta = el('section', null, 'kit-enf-tarjeta' + (k % 2 ? ' kit-enf-oro' : ''));
        tarjeta.append(mono('Enfoque ' + dos(k)), el('h3', g.titulo, 'kit-enf-titulo'), el('p', g.pregunta, 'kit-enf-pregunta'));
        // Entregables: lo que la empresa recibe en los Resultados para este enfoque.
        const ent = el('div', null, 'kit-enf-entregables'), ul = el('ul');
        g.entregables.forEach(t => { const li = el('li');
          if (resultados) { const a = el('a', t, 'kit-enf-entregable'); a.href = resultados; li.append(a); } else li.append(el('span', t, 'kit-enf-entregable'));
          ul.append(li); });
        ent.append(mono('Entregables', 'kit-pro-rotulo'), ul);
        // Cifra e ícono: llevan a la metodología del enfoque.
        const met = boton('kit-enf-metodo', el('span', num(g.cifra), 'kit-enf-cifra'), el('span', g.cifraTexto, 'kit-enf-cifra-sub'), iconoArco(), el('span', 'Ver la metodología', 'kit-enf-ver'));
        met.setAttribute('aria-haspopup', 'dialog'); met.onclick = () => ventanaProceso(met, g.parte);
        const cuerpo = el('div', null, 'kit-enf-cuerpo'); cuerpo.append(ent, met);
        tarjeta.append(cuerpo); rejilla.append(tarjeta);
      });
      const pie = el('div', null, 'kit-ven-pie kit-enf-pie'), bc = boton('kit-met-pastilla kit-enf-criterios', el('span', 'Criterios'));
      bc.setAttribute('aria-haspopup', 'dialog'); bc.onclick = () => ventanaCriterios(bc);
      pie.append(el('p', 'Los entregables llevan a los Resultados. La cifra lleva a la metodología de cada enfoque.', 'kit-met-nota'), bc);
      abrir('Enfoques', [...encabezado('Cómo se lee el resultado', E.titular || 'Enfoques', E.intro), rejilla, pie], desde, 'kit-ven-enfoques');
    }

    // ---------- Vistazo (boceto 261108_Home_Criterios) ----------
    // Una ventana pequeña que aparece al pasar el cursor y desaparece al quitarlo. También se abre con el foco del
    // teclado y, en pantallas táctiles, con un toque (el toque fuera la cierra). Solo hay uno abierto a la vez.
    let vzAbierto = null;
    const sinCursor = () => !!root.matchMedia?.('(hover: none)').matches;
    function vistazo(disparador, contenido, clase = '') {
      const caja = el('div', null, ('kit-vz ' + clase).trim()), panel = el('div', null, 'kit-vz-panel'), id = 'kit-vz-' + (++nDesp);
      panel.id = id; panel.setAttribute('role', 'tooltip'); panel.append(...[].concat(contenido));
      disparador.setAttribute('aria-describedby', id);
      let on = false;
      const abre = v => { if (v && vzAbierto && vzAbierto !== abre) vzAbierto(false); on = v; caja.classList?.toggle('abierto', v); disparador.setAttribute('aria-expanded', String(v)); vzAbierto = v ? abre : (vzAbierto === abre ? null : vzAbierto); };
      disparador.setAttribute('aria-expanded', 'false');
      caja.addEventListener?.('mouseenter', () => { if (!sinCursor()) abre(true); });
      caja.addEventListener?.('mouseleave', () => { if (!sinCursor()) abre(false); });
      disparador.addEventListener?.('focus', () => abre(true));
      disparador.addEventListener?.('blur', () => abre(false));
      caja.append(disparador, panel);
      return { caja, abre, abierto: () => on };
    }

    // ---------- Ventana: Criterios de calificación (boceto 261108_Home_Criterios) ----------
    // Explica qué se califica, cómo y por qué. Enfoque (se cambia con la pastilla), metodología, temas que llevan a
    // lo que se califica en cada uno (laberinto inteligente), una escala para todos con Vistazo por nivel, la variable
    // (qué es, qué no es, qué evalúa), los grupos de datos que se llenan y Alimentación.
    function ventanaCalificacion(desde) {
      const C = d.calificar, zona = el('div', null, 'kit-cri-zona');
      let k = 0;
      const chip = boton('kit-cri-chip', el('span', 'Enfoque'), el('span', '⇄', 'kit-cri-chip-flecha'));
      const nombre = el('h3', null, 'kit-cri-enfoque-nombre');
      const cabeza = el('div', null, 'kit-cri-enfoque'); cabeza.append(chip, nombre);
      chip.onclick = () => { k = (k + 1) % C.enfoques.length; pintarEnfoque(); chip.focus?.({ preventScroll: true }); };
      const plural = (g) => g.rotulo[g.n === 1 ? 0 : 1];
      function pintarEnfoque() {
        const E = C.enfoques[k], parte = partes[E.parte], otro = C.enfoques[(k + 1) % C.enfoques.length];
        nombre.textContent = E.nombre;
        chip.setAttribute('aria-label', `Enfoque: ${E.nombre}. Cambiar al enfoque ${otro.nombre}`);
        chip.title = 'Cambiar a ' + otro.corto;
        // Metodología del enfoque.
        const metodo = el('p', null, 'kit-cri-metodo'); metodo.append(el('strong', 'Metodología: '), el('span', E.metodologia || parte.intro));
        // Temas: cada botón lleva a lo que se califica en esa etapa o derecho (la ventana de preguntas que ya existe).
        const pista = el('ul', null, 'kit-est-pista kit-cri-pista');
        parte.items.forEach((it, i) => {
          const b = boton('kit-cri-tema' + (i % 2 ? ' kit-cri-claro' : ''), icono(it, 'kit-cri-tema-icono'), el('span', dos(i), 'kit-mono'), el('span', it.titulo, 'kit-cri-tema-titulo'), el('span', it.sub, 'kit-cri-tema-sub'));
          b.setAttribute('aria-label', `${parte.unidad} ${i + 1}: ${it.titulo}. Ver qué se califica`); b.setAttribute('aria-haspopup', 'dialog');
          b.onclick = () => ventanaPreguntas({ ...it, preguntasRotulo: '¿Qué calificamos?' }, b);
          const li = el('li'); li.style?.setProperty?.('--i', i); li.append(b); pista.append(li);
        });
        const mover = sgn => () => pista.scrollBy?.({ left: sgn * (pista.clientWidth || 600) * .8, behavior: sinMovimiento() ? 'auto' : 'smooth' });
        const ant = boton('kit-est-flecha', el('span', '←')), sig = boton('kit-est-flecha', el('span', '→'));
        ant.setAttribute('aria-label', 'Ver los anteriores'); sig.setAttribute('aria-label', 'Ver más'); ant.onclick = mover(-1); sig.onclick = mover(1);
        const carrusel = el('div', null, 'kit-est-carrusel kit-cri-carrusel'); carrusel.append(ant, pista, sig);
        // Una escala para todos. El Vistazo de cada número explica el nivel para la variable del enfoque.
        const escala = el('ol', null, 'kit-cri-escala');
        E.escala.forEach(nv => {
          const b = boton('kit-cri-nivel', el('span', null, 'kit-cri-nivel-barra'), el('span', String(nv.valor), 'kit-cri-nivel-num'), el('span', nv.nombre, 'kit-cri-nivel-nombre'));
          b.style?.setProperty?.('--color', nv.color);
          b.setAttribute('aria-label', `${nv.valor}, ${nv.nombre}`);
          const tit = el('p', null, 'kit-vz-titulo kit-vz-nivel'); tit.append(el('strong', String(nv.valor)), el('span', nv.nombre));
          const contenido = [tit, el('p', nv.descripcion, 'kit-vz-texto'), mono('Variable: ' + (E.variable?.nombre || ''), 'kit-vz-pie')];
          const vz = vistazo(b, contenido, 'kit-cri-nivel-vz'); vz.caja.style?.setProperty?.('--color', nv.color);
          b.onclick = () => vz.abre(!vz.abierto());
          const li = el('li'); li.append(vz.caja); escala.append(li);
        });
        // Variable: qué es, qué no es y qué evalúa.
        const V = E.variable || {};
        const variable = el('section', null, 'kit-cri-variable');
        const vcab = el('div', null, 'kit-cri-variable-cab'); vcab.append(el('span', 'Variable', 'kit-cri-chip kit-cri-chip-fijo'), el('h4', V.nombre || '', 'kit-cri-variable-nombre'));
        const vcaja = el('dl', null, 'kit-cri-variable-caja');
        [['¿Qué es?', V.que_es], ['¿Qué no es?', V.que_no_es], ['¿Qué evalúa?', V.que_evalua]].filter(x => x[1]).forEach(([t, x]) => { const g = el('div'); g.append(el('dt', t), el('dd', x)); vcaja.append(g); });
        variable.append(vcab, vcaja);
        // Lo que se llena: grupos de datos con Vistazo, y Alimentación (laberinto inteligente).
        const grupos = el('ul', null, 'kit-cri-grupos');
        C.grupos.forEach((g, i) => {
          const b = boton('kit-cri-grupo' + (i % 2 ? ' kit-cri-oro' : ''), el('span', num(g.n), 'kit-cri-grupo-n'), el('span', plural(g), 'kit-cri-grupo-rotulo'));
          b.setAttribute('aria-label', `${num(g.n)} ${plural(g)}`);
          const vz = vistazo(b, [el('p', `${num(g.n)} ${plural(g)}`, 'kit-vz-titulo'), lista(g.items, 'kit-vz-lista'), el('p', g.texto, 'kit-vz-texto')]);
          b.onclick = () => vz.abre(!vz.abierto());
          const li = el('li'); li.append(vz.caja); grupos.append(li);
        });
        const destino = extra.empresa && extra.puedeEditar ? `#/${extra.modulo}/${extra.empresa}/alimentacion` : C.plantilla;
        const a = el('a', null, 'kit-cri-alimentacion'); a.href = destino;
        if (destino === C.plantilla) a.setAttribute('download', '');
        a.append(el('span', 'Alimentación', 'kit-cri-alimentacion-titulo'), el('span', destino === C.plantilla ? 'Descargar la plantilla de Excel' : 'Ir a Alimentación', 'kit-cri-alimentacion-sub'));
        const reglas = el('ol', null, 'kit-vz-lista kit-vz-reglas');
        (C.reglas || []).forEach(r => { const li = el('li'); li.append(el('strong', r.titulo + '. '), el('span', r.texto)); reglas.append(li); });
        const vzA = vistazo(a, [el('p', C.alimentacion, 'kit-vz-titulo'), reglas], 'kit-cri-alimentacion-vz');
        // Sin cursor, el primer toque muestra las reglas y el segundo lleva a Alimentación.
        a.onclick = ev => { if (sinCursor() && !vzA.abierto()) { ev.preventDefault?.(); vzA.abre(true); } };
        const liA = el('li', null, 'kit-cri-grupos-alimentacion'); liA.append(vzA.caja); grupos.append(liA);

        zona.replaceChildren(metodo, carrusel, el('p', C.temasNota, 'kit-met-nota'),
          el('h3', C.escalaTitular, 'kit-cri-escala-titulo'), escala, el('p', C.escalaNota, 'kit-met-nota'),
          variable, grupos);
        zona.classList?.remove('recarga'); void zona.offsetWidth; zona.classList?.add('recarga');
      }
      pintarEnfoque();
      const v = abrir('Criterios', [mono(C.ante, 'kit-ven-ante'), el('h2', C.titular, 'kit-titular kit-ven-titular'), cabeza, zona], desde, 'kit-ven-criterios kit-ven-calificacion');
      // Un toque fuera de un Vistazo lo cierra (pantallas táctiles).
      v.addEventListener?.('click', ev => { if (vzAbierto && !ev.target?.closest?.('.kit-vz')) vzAbierto(false); });
      return v;
    }

    // ---------- Ventana: Criterios (cómo se califica). Provisional en los módulos que aún no tienen la ventana nueva ----------
    function ventanaCriterios(desde) {
      if (d.calificar) return ventanaCalificacion(desde);
      const K = d.criterios, nodos = [...encabezado(K.ante || 'Cómo se califica', K.titular, K.intro)];
      (K.escalas || []).forEach(es => {
        const caja = el('section', null, 'kit-met-escala-bloque');
        caja.append(mono(es.titulo, 'kit-ficha-sub')); if (es.pregunta) caja.append(el('p', es.pregunta, 'kit-met-texto'));
        if (es.niveles?.length) {
          const ol = el('ol', null, 'kit-met-escala');
          es.niveles.forEach(nv => { const li = el('li'); li.style?.setProperty?.('--color', nv.color || 'var(--borde)');
            li.append(el('span', String(nv.valor), 'kit-met-escala-num'), el('span', nv.nombre || '', 'kit-met-escala-nombre'), el('span', nv.descripcion || '', 'kit-met-escala-texto')); ol.append(li); });
          caja.append(ol);
        }
        nodos.push(caja);
      });
      if (K.calculo?.length) {
        const calculo = el('ol', null, 'kit-met-calculo');
        K.calculo.forEach(x => { const li = el('li'); li.append(el('span', '# ' + num(x.cifra), 'kit-dato-cifra'), el('span', x.rotulo, 'kit-met-calculo-rotulo'), el('span', x.texto, 'kit-dato-texto')); calculo.append(li); });
        nodos.push(mono('Del dato al resultado', 'kit-ficha-sub'), calculo);
      }
      if (K.cortes?.length) {
        const cortes = el('div', null, 'kit-met-cortes');
        K.cortes.forEach(c => { const s = el('span', c.rango, 'kit-met-corte'); s.style?.setProperty?.('--color', c.color); if (s.style) s.style.flexGrow = String(c.peso); cortes.append(s); });
        nodos.push(mono('Colores en los Resultados', 'kit-ficha-sub'), cortes);
      }
      if (K.tabla) {
        const t = el('table', null, 'kit-met-tabla'), cab = el('tr'); cab.append(el('th'));
        K.tabla.columnas.forEach(x => { const th = el('th', x); th.scope = 'col'; cab.append(th); });
        const thead = el('thead'); thead.append(cab); t.append(el('caption', K.tabla.titulo, 'solo-lectores'), thead);
        const tb = el('tbody');
        K.tabla.filas.forEach((f, i) => { const tr = el('tr'), th = el('th', f); th.scope = 'row'; tr.append(th); K.tabla.celdas[i].forEach(x => tr.append(el('td', x))); tb.append(tr); });
        t.append(tb); nodos.push(mono(K.tabla.titulo, 'kit-ficha-sub'), t);
      }
      (K.notas || []).forEach(x => nodos.push(el('p', x, 'kit-met-nota')));
      if (K.reglas?.length) {
        const reglas = el('ol', null, 'kit-met-reglas');
        K.reglas.forEach((r, i) => { const li = el('li'); li.append(desplegable([el('span', dos(i), 'kit-mono'), el('strong', r.titulo)], el('p', r.texto, 'kit-met-texto'), 'kit-met-regla')); reglas.append(li); });
        nodos.push(mono('Reglas', 'kit-ficha-sub'), reglas);
      }
      abrir('Criterios', nodos, desde, 'kit-ven-criterios');
    }

    c.append(art);
    // Al salir de la vista (cambio de ruta) se libera el bloqueo del scroll de la página.
    return () => { html?.classList?.remove('kit-ven-abierta'); doc?.removeEventListener?.('keydown', alTeclado); };
  }

  async function datos(modulo, m) {
    if (!FUENTES[modulo] || (!m?.proceso && !m?.metodo)) return null;
    const f = await Promise.all(FUENTES[modulo].map(cargar));
    if (modulo === 'ddhh') return datosDdhh(f[0], f[1], m, f[2], f[3]);
    if (modulo === 'actores') return datosActores(f[0], f[1], f[2], m);
    if (modulo === 'materialidad') return datosMaterialidad(f[0], { temas: f[1], impacto: f[2], financiera: f[3], participacion: f[4] }, m);
    return datosRiesgos(f[0], { riesgos: f[1], calificacion: f[2], validaciones: f[3], medidas: f[4] }, m);
  }
  const vista = modulo => ({
    async render(c, _, p) {
      const todo = await cargar('config/kit-metodologia.json'), m = todo[modulo], d = await datos(modulo, m);
      if (p?.vigente && !p.vigente()) return;
      return pintar(c, m, { datos: d, modulo, empresa: p?.empresa, puedeEditar: p?.puedeEditar });
    }
  });
  const api = { pintar, vista, datos, datosDdhh, datosActores, datosMaterialidad, datosRiesgos, FUENTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitVistaMetodologia = api;
  if (root.App) ['actores', 'ddhh', 'materialidad', 'riesgos'].forEach(m => root.App.registrarVista(m + '/metodologia', vista(m)));
}(typeof window !== 'undefined' ? window : globalThis));
