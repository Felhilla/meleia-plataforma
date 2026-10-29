(function (root) {
  'use strict';
  const XLSX = typeof module !== 'undefined' && module.exports ? require('./vendor/xlsx.full.min.js') : root.XLSX;
  let configuracion = typeof module !== 'undefined' && module.exports ? require('./config/kit-carga-excel.json') : root.KitCargaExcelConfig;
  const Actores = typeof module !== 'undefined' && module.exports ? require('./kit-actores.js') : root.KitActores;
  const Riesgos = typeof module !== 'undefined' && module.exports ? require('./kit-riesgos.js') : root.KitRiesgos;
  const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizarHoja = valor => normalizar(valor).replace(/\./g, '');
  const presente = valor => valor !== undefined && valor !== null && !(typeof valor === 'string' && !valor.trim());

  function valorDeCelda(hoja, fila, columna) {
    const directo = hoja[XLSX.utils.encode_cell({ r: fila, c: columna })];
    if (directo) return directo.v;
    const combinado = (hoja['!merges'] || []).find(rango => rango.s.r <= fila && fila <= rango.e.r && rango.s.c <= columna && columna <= rango.e.c);
    return combinado ? hoja[XLSX.utils.encode_cell({ r: combinado.s.r, c: combinado.s.c })]?.v : undefined;
  }

  function esEscala(valor) {
    return typeof valor === 'string' && /(?:\b1\b.*\b5\b|\(1\s*-\s*5\))/.test(valor);
  }

  function categoriaDe(nombre, cfg) {
    const clave = normalizarHoja(nombre);
    return cfg.hojas.find(h => h.nombres.some(n => normalizarHoja(n) === clave))?.categoria;
  }

  function encabezado(hoja, cfg) {
    const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
    const instituciones = cfg.columnas.find(c => c.campo === 'institucion').encabezados.map(normalizar);
    for (let fila = 8; fila <= Math.min(12, limite.e.r); fila++) {
      for (let columna = limite.s.c; columna <= limite.e.c; columna++) {
        if (instituciones.includes(normalizar(valorDeCelda(hoja, fila, columna)))) return fila;
      }
    }
    return null;
  }

  function columnasDe(hoja, filaEncabezado, cfg) {
    const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
    const columnas = new Map();
    for (let columna = limite.s.c; columna <= limite.e.c; columna++) {
      const titulo = normalizar(valorDeCelda(hoja, filaEncabezado, columna));
      if (!titulo) continue;
      const tieneEscala = esEscala(valorDeCelda(hoja, filaEncabezado + 1, columna));
      for (const regla of cfg.columnas) {
        if (!regla.encabezados.map(normalizar).includes(titulo)) continue;
        if (regla.escala !== undefined && regla.escala !== tieneEscala) continue;
        if (!columnas.has(regla.campo)) columnas.set(regla.campo, []);
        columnas.get(regla.campo).push(columna);
      }
    }
    return columnas;
  }

  function valorDe(columnas, campo, hoja, fila) {
    const columnasCampo = columnas.get(campo) || [];
    const valores = columnasCampo.map(columna => valorDeCelda(hoja, fila, columna)).filter(presente);
    return valores[0];
  }

  // El Excel de GH muestra algunos valores como "Media(3)". Conservamos el
  // número que el propio archivo exhibe; la admisión del nivel sigue siendo de
  // KitActores/KitValidacion.
  function numeroMostrado(valor) {
    const coincidencia = typeof valor === 'string' && valor.match(/\(\s*([1-5])\s*\)\s*$/);
    return coincidencia ? Number(coincidencia[1]) : valor;
  }

  function nivelNormalizado(campo, valor, contexto) {
    if (!presente(valor)) return null;
    const resultado = Actores.validar({ [campo]: valor }, contexto.cfg, contexto.esquema, 'carga');
    return resultado.errores.some(error => error.campo === campo) ? null : resultado.registro[campo];
  }

  function nivelesDe(columnas, campo, hoja, fila, contexto) {
    const valores = (columnas.get(campo) || []).map(columna => numeroMostrado(valorDeCelda(hoja, fila, columna))).filter(presente);
    if (valores.length < 2) return { valor: valores[0] };
    const numero = valores.find(valor => typeof valor === 'number' || (typeof valor === 'string' && /^\s*\d+\s*$/.test(valor)));
    const normalizados = valores.map(valor => nivelNormalizado(campo, valor, contexto));
    if (normalizados.some(valor => valor !== normalizados[0])) return { valor: numero ?? valores[0], inconsistente: valores.join(' / ') };
    return { valor: numero ?? valores[0] };
  }

  // Grupo de un actor: categoría + institución + cargo. Varios actores reales
  // comparten grupo (14 «Representante» de un mismo municipio, concejales del
  // mismo partido), así que dentro del grupo se empareja por pasos.
  function grupoActor(actor) {
    return [actor.categoria, actor.institucion, actor.cargo].map(normalizar).join('\u0000');
  }

  function firmaActor(registro) {
    return JSON.stringify(Object.keys(registro).filter(campo => campo !== 'id').sort().map(campo => [campo, normalizar(registro[campo])]));
  }

  // Empareja las filas del archivo con los actores existentes: primero por
  // nombre del servidor (el del actor o, si no lo tiene, el de su contacto),
  // luego por caracterización y, al final, por orden
  // dentro del grupo. El orden solo se usa si no hay otra señal, y avisa
  // cuando el grupo tenía más de un candidato.
  function emparejar(filas, existentes, contactos, avisos) {
    const libres = new Map(), pendientes = new Map(), contactoDe = new Map(contactos.map(contacto => [contacto.id, contacto]));
    for (const actor of existentes) {
      const grupo = grupoActor(actor);
      if (!libres.has(grupo)) libres.set(grupo, []);
      libres.get(grupo).push(actor);
    }
    const igual = (valorActor, campo) => (actor, registro) => presente(valorActor(actor)) && presente(registro[campo]) && normalizar(valorActor(actor)) === normalizar(registro[campo]);
    const nombre = actor => presente(actor.nombre_servidor) ? actor.nombre_servidor : contactoDe.get(actor.id)?.nombre;
    for (const criterio of [igual(nombre, 'nombre_servidor'), igual(actor => actor.caracterizacion, 'caracterizacion')]) {
      for (const fila of filas) {
        if (fila.existente) continue;
        const lista = libres.get(grupoActor(fila.registro)) || [], i = lista.findIndex(actor => criterio(actor, fila.registro));
        if (i >= 0) fila.existente = lista.splice(i, 1)[0];
      }
    }
    for (const fila of filas) if (!fila.existente) pendientes.set(grupoActor(fila.registro), (pendientes.get(grupoActor(fila.registro)) || 0) + 1);
    for (const fila of filas) {
      if (fila.existente) continue;
      const grupo = grupoActor(fila.registro), lista = libres.get(grupo) || [];
      if (!lista.length) continue;
      if (lista.length > 1 || pendientes.get(grupo) > 1) avisos.push({ hoja: fila.hoja, fila: fila.fila, mensaje: 'Se actualizó por orden un actor existente con la misma institución y cargo, porque la caracterización cambió. Revisa que la ficha corresponda a la misma persona u organización.' });
      fila.existente = lista.shift();
    }
  }

  function idNuevo() {
    const uuid = root.crypto?.randomUUID?.();
    if (!uuid) throw Error('No se pudo generar el identificador del actor.');
    return 'act-' + uuid;
  }

  function ajusteDelArchivo(registro, nivelArchivo, contexto) {
    if (!presente(nivelArchivo)) return null;
    const nivelCalculado = Actores.nivelCalculado(registro, contexto.cfg);
    const nivelArchivoCanonico = contexto.cfg.niveles.find(nivel => normalizar(nivel.nombre) === normalizar(nivelArchivo))?.nombre;
    if (!nivelArchivoCanonico) return { error: 'un nivel válido de relacionamiento.' };
    if (!nivelCalculado || nivelArchivoCanonico === nivelCalculado) return null;
    if (!contexto.cfg.subidas[nivelCalculado]?.includes(nivelArchivoCanonico)) return { error: 'el nivel calculado o un ajuste de un paso hacia arriba.' };
    return {
      nivel_ajustado: nivelArchivoCanonico,
      motivo_ajuste: contexto.esquema.campos.motivo_ajuste.valores[4],
      explicacion_ajuste: 'Ajuste del mapeo original (criterio experto GH).'
    };
  }

  function leerActores(arrayBuffer, contexto) {
    if (!XLSX || !Actores || !configuracion?.actores) throw Error('El lector de carga por Excel no está configurado.');
    const libro = XLSX.read(arrayBuffer, { type: 'array' }), cfg = configuracion.actores;
    const registros = [], errores = [], avisos = [], filas = [], vistas = new Map();
    let nuevos = 0, actualizados = 0;

    for (const nombreHoja of libro.SheetNames) {
      if (/^(indice|metodologia)$/i.test(normalizar(nombreHoja)) || /^comp\./i.test(String(nombreHoja).trim())) continue;
      const categoria = categoriaDe(nombreHoja, cfg);
      if (!categoria) { avisos.push({ hoja: nombreHoja, mensaje: 'La hoja no corresponde a ninguna categoría de actores; no se cargó.' }); continue; }
      const hoja = libro.Sheets[nombreHoja], filaEncabezado = encabezado(hoja, cfg);
      if (filaEncabezado === null) { avisos.push({ hoja: nombreHoja, mensaje: 'No se encontró la fila de encabezados (con «Institución»); la hoja no se cargó.' }); continue; }
      const columnas = columnasDe(hoja, filaEncabezado, cfg);
      const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
      for (let fila = filaEncabezado + 2; fila <= limite.e.r; fila++) {
        const tieneDatos = [...columnas.values()].flat().some(columna => presente(valorDeCelda(hoja, fila, columna)));
        if (!tieneDatos) continue;
        const erroresAntes = errores.length;
        const registro = Object.fromEntries(Object.keys(contexto.esquema.campos).map(campo => [campo, '']));
        registro.categoria = categoria;
        for (const campo of Object.keys(contexto.esquema.campos)) {
          if (['dependencia', 'tension', 'responsabilidad', 'influencia', 'impacto'].includes(campo)) continue;
          const valor = valorDe(columnas, campo, hoja, fila);
          if (presente(valor)) registro[campo] = valor;
        }
        for (const campo of ['dependencia', 'tension', 'responsabilidad', 'influencia', 'impacto']) {
          const nivel = nivelesDe(columnas, campo, hoja, fila, contexto);
          if (presente(nivel.valor)) registro[campo] = nivel.valor;
          if (nivel.inconsistente) errores.push({ hoja: nombreHoja, fila: fila + 1, campo, mensaje: `${contexto.esquema.campos[campo].etiqueta} = ${JSON.stringify(nivel.inconsistente)}, se esperaba que las dos columnas coincidan.` });
        }
        const nivelArchivo = valorDe(columnas, 'nivel_archivo', hoja, fila);
        const ajuste = ajusteDelArchivo(registro, nivelArchivo, contexto);
        if (ajuste?.error) errores.push({ hoja: nombreHoja, fila: fila + 1, campo: 'nivel_ajustado', mensaje: `Nivel de relacionamiento = ${JSON.stringify(nivelArchivo)}, se esperaba ${ajuste.error}` });
        else if (ajuste) Object.assign(registro, ajuste);

        const firma = firmaActor(registro), repetida = vistas.get(firma);
        if (repetida) { errores.push({ hoja: nombreHoja, fila: fila + 1, mensaje: `Fila repetida: es igual a ${repetida.hoja}, fila ${repetida.fila}. Bórrala o distínguela.` }); continue; }
        vistas.set(firma, { hoja: nombreHoja, fila: fila + 1 });
        filas.push({ hoja: nombreHoja, fila: fila + 1, registro, conError: errores.length > erroresAntes });
      }
    }

    emparejar(filas, contexto.existentes || [], contexto.contactos || [], avisos);
    for (const { hoja, fila, registro, conError, existente } of filas) {
      registro.id = existente?.id || idNuevo();
      const resultado = Actores.validar(registro, contexto.cfg, contexto.esquema, 'carga');
      if (!resultado.ok || conError) {
        resultado.errores.forEach(error => errores.push({ hoja, fila, campo: error.campo, mensaje: error.mensaje }));
        continue;
      }
      registros.push(resultado.registro);
      if (existente) actualizados++; else nuevos++;
      resultado.avisos.forEach(mensaje => avisos.push({ hoja, fila, mensaje }));
    }
    return { registros: { actores: registros }, nuevos, actualizados, errores, avisos };
  }

  const COLECCIONES_RIESGOS = ['riesgos', 'riesgos-grupos', 'riesgos-calificacion', 'riesgos-validaciones', 'riesgos-medidas'];

  function columnasRiesgos(hoja, cfgHoja) {
    const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
    const porEncabezado = new Map();
    for (let columna = limite.s.c; columna <= limite.e.c; columna++) {
      const titulo = normalizar(valorDeCelda(hoja, 0, columna));
      if (titulo) porEncabezado.set(titulo, columna);
    }
    return new Map(cfgHoja.columnas.map(regla => [regla.campo, porEncabezado.get(normalizar(regla.encabezado))]).filter(([, columna]) => columna !== undefined));
  }

  function fechaExcel(valor) {
    if (valor instanceof Date && Number.isFinite(valor.getTime())) return valor.toISOString().slice(0, 10);
    if (typeof valor !== 'number') return valor;
    const fecha = XLSX.SSF.parse_date_code(valor);
    if (!fecha) return valor;
    return `${String(fecha.y).padStart(4, '0')}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`;
  }

  function registroDeRiesgos(hoja, fila, columnas, cfgHoja) {
    const porCampo = new Map(cfgHoja.columnas.map(regla => [regla.campo, regla]));
    const registro = {};
    for (const [campo, columna] of columnas) {
      const regla = porCampo.get(campo), valor = valorDeCelda(hoja, fila, columna);
      if (!presente(valor)) continue;
      registro[campo] = regla.multiple && typeof valor === 'string' ? valor.split(';').map(v => v.trim()).filter(Boolean) : regla.fecha ? fechaExcel(valor) : valor;
    }
    return registro;
  }

  function listasRiesgos(existentes, registros) {
    return Object.fromEntries(COLECCIONES_RIESGOS.map(coleccion => [coleccion, [...(existentes[coleccion] || []), ...registros[coleccion]]]));
  }

  function referenciasDeRiesgos(existentes, registros) {
    const riesgos = new Map(listasRiesgos(existentes, registros).riesgos.map(riesgo => [normalizar(riesgo.codigo), riesgo.id]));
    return riesgos;
  }

  function referenciasDeGrupos(existentes, registros) {
    const grupos = new Map(listasRiesgos(existentes, registros)['riesgos-grupos'].map(grupo => [normalizar(grupo.nombre), grupo.id]));
    return grupos;
  }

  function sinPrefijoDeError(mensaje, titulo, fila) {
    const escapado = String(titulo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(mensaje).replace(new RegExp(`^${escapado}, fila ${fila}:\\s*`), '');
  }

  function procesarFilasRiesgos(libro, cfgHoja, contexto, existentes, registros, errores, conteos, filasPorId) {
    const nombreHoja = libro.SheetNames.find(nombre => normalizar(nombre) === normalizar(cfgHoja.hoja));
    if (!nombreHoja) return;
    const hoja = libro.Sheets[nombreHoja], columnas = columnasRiesgos(hoja, cfgHoja);
    const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
    const esquema = Riesgos.esquema(contexto.esquemas[cfgHoja.coleccion], cfgHoja.coleccion, {
      derechos: contexto.derechos,
      riesgos: listasRiesgos(existentes, registros).riesgos,
      cfg: contexto.cfg,
      empresa: contexto.empresa
    });
    for (let fila = 1; fila <= limite.e.r; fila++) {
      const tieneDatos = [...columnas.values()].some(columna => presente(valorDeCelda(hoja, fila, columna)));
      if (!tieneDatos) continue;
      const registro = registroDeRiesgos(hoja, fila, columnas, cfgHoja);
      let referenciaInvalida = null;
      if (['riesgos-calificacion', 'riesgos-validaciones'].includes(cfgHoja.coleccion) && presente(registro.riesgo)) {
        const id = referenciasDeRiesgos(existentes, registros).get(normalizar(registro.riesgo));
        if (id) registro.riesgo = id;
        else referenciaInvalida = { campo: 'riesgo', mensaje: `Riesgo = ${JSON.stringify(registro.riesgo)}, no se reconoció el código ${JSON.stringify(registro.riesgo)}.` };
      }
      if (!referenciaInvalida && cfgHoja.coleccion === 'riesgos-validaciones' && presente(registro.grupo)) {
        const id = referenciasDeGrupos(existentes, registros).get(normalizar(registro.grupo));
        if (id) registro.grupo = id;
        else referenciaInvalida = { campo: 'grupo', mensaje: `Grupo = ${JSON.stringify(registro.grupo)}, no se reconoció el nombre ${JSON.stringify(registro.grupo)}.` };
      }
      if (!referenciaInvalida && cfgHoja.coleccion === 'riesgos-medidas') {
        const componentes = (contexto.cfg.componentesPorEmpresa?.[contexto.empresa] || contexto.cfg.componentes || []);
        if (presente(registro.componente)) registro.componente = componentes.find(componente => normalizar(componente.nombre) === normalizar(registro.componente))?.id || registro.componente;
        if (Array.isArray(registro.riesgos)) {
          const referencias = referenciasDeRiesgos(existentes, registros);
          const sinReconocer = registro.riesgos.find(codigo => !referencias.has(normalizar(codigo)));
          if (sinReconocer !== undefined) referenciaInvalida = { campo: 'riesgos', mensaje: `Riesgos que atiende = ${JSON.stringify(sinReconocer)}, no se reconoció el código ${JSON.stringify(sinReconocer)}.` };
          else registro.riesgos = registro.riesgos.map(codigo => referencias.get(normalizar(codigo)));
        }
      }
      if (referenciaInvalida) {
        errores.push({ hoja: nombreHoja, fila: fila + 1, ...referenciaInvalida });
        continue;
      }
      const resultado = Riesgos.preparar(cfgHoja.coleccion, registro, {
        esquema,
        cfg: contexto.cfg,
        listas: listasRiesgos(existentes, registros),
        modo: 'carga',
        fila: fila + 1
      });
      if (!resultado.ok) {
        resultado.errores.forEach(error => errores.push({ hoja: nombreHoja, fila: fila + 1, campo: error.campo, mensaje: sinPrefijoDeError(error.mensaje, esquema.titulo, fila + 1) }));
        continue;
      }
      const clave = cfgHoja.coleccion + '\u0000' + resultado.registro.id, repetida = filasPorId.get(clave);
      if (repetida) {
        errores.push({ hoja: nombreHoja, fila: fila + 1, mensaje: `Registro repetido: corresponde al mismo registro de la fila ${repetida}. Deja una sola fila.` });
        continue;
      }
      filasPorId.set(clave, fila + 1);
      registros[cfgHoja.coleccion].push(resultado.registro);
      if (resultado.existe) conteos.actualizados++; else conteos.nuevos++;
    }
  }

  function leerRiesgos(arrayBuffer, contexto) {
    if (!XLSX || !Riesgos || !configuracion?.riesgos) throw Error('El lector de carga por Excel no está configurado.');
    const libro = XLSX.read(arrayBuffer, { type: 'array', cellDates: true }), cfg = configuracion.riesgos;
    const registros = Object.fromEntries(COLECCIONES_RIESGOS.map(coleccion => [coleccion, []]));
    const existentes = contexto.existentes || {}, errores = [], avisos = [], conteos = { nuevos: 0, actualizados: 0 }, filasPorId = new Map();
    const conocidas = new Set(cfg.hojas.map(hoja => normalizar(hoja.hoja)));
    libro.SheetNames.filter(nombre => !conocidas.has(normalizar(nombre))).forEach(nombre => avisos.push({ hoja: nombre, mensaje: 'La hoja no es parte de la plantilla; no se cargó.' }));
    for (const coleccion of COLECCIONES_RIESGOS) {
      const cfgHoja = cfg.hojas.find(hoja => hoja.coleccion === coleccion);
      procesarFilasRiesgos(libro, cfgHoja, contexto, existentes, registros, errores, conteos, filasPorId);
    }
    return { registros, ...conteos, errores, avisos };
  }

  function leer(arrayBuffer, modulo, contexto) {
    if (modulo === 'actores') {
      if (!contexto?.cfg || !contexto?.esquema || !Array.isArray(contexto?.existentes)) throw Error('Contexto de carga de actores incompleto.');
      return leerActores(arrayBuffer, contexto);
    }
    if (modulo === 'riesgos') {
      if (!contexto?.cfg || !contexto?.derechos || !contexto?.empresa || !contexto?.esquemas || !contexto?.existentes) throw Error('Contexto de carga de riesgos incompleto.');
      return leerRiesgos(arrayBuffer, contexto);
    }
    throw Error('Módulo de carga por Excel no soportado: ' + modulo);
  }

  function configurar(cfg) { configuracion = cfg; }
  const api = { leer, configurar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitCargaExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);
