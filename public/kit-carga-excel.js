(function (root) {
  'use strict';
  const XLSX = typeof module !== 'undefined' && module.exports ? require('./vendor/xlsx.full.min.js') : root.XLSX;
  let configuracion = typeof module !== 'undefined' && module.exports ? require('./config/kit-carga-excel.json') : root.KitCargaExcelConfig;
  const Actores = typeof module !== 'undefined' && module.exports ? require('./kit-actores.js') : root.KitActores;
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

  function claveActor(actor) {
    return [actor.categoria, actor.institucion, actor.cargo].map(normalizar).join('\u0000');
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
    const registros = [], errores = [], avisos = [];
    let nuevos = 0, actualizados = 0;
    const existentes = new Map((contexto.existentes || []).map(actor => [claveActor(actor), actor]));

    for (const nombreHoja of libro.SheetNames) {
      if (/^(indice|metodologia)$/i.test(normalizar(nombreHoja)) || /^comp\./i.test(String(nombreHoja).trim())) continue;
      const categoria = categoriaDe(nombreHoja, cfg);
      if (!categoria) continue;
      const hoja = libro.Sheets[nombreHoja], filaEncabezado = encabezado(hoja, cfg);
      if (filaEncabezado === null) continue;
      const columnas = columnasDe(hoja, filaEncabezado, cfg);
      const limite = XLSX.utils.decode_range(hoja['!ref'] || 'A1:A1');
      for (let fila = filaEncabezado + 2; fila <= limite.e.r; fila++) {
        const tieneDatos = [...columnas.values()].flat().some(columna => presente(valorDeCelda(hoja, fila, columna)));
        if (!tieneDatos) continue;
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

        const existente = existentes.get(claveActor(registro));
        registro.id = existente?.id || idNuevo();
        const resultado = Actores.validar(registro, contexto.cfg, contexto.esquema, 'carga');
        if (!resultado.ok || ajuste?.error || errores.some(error => error.hoja === nombreHoja && error.fila === fila + 1)) {
          resultado.errores.forEach(error => errores.push({ hoja: nombreHoja, fila: fila + 1, campo: error.campo, mensaje: error.mensaje }));
          continue;
        }
        registros.push(resultado.registro);
        if (existente) actualizados++; else nuevos++;
        resultado.avisos.forEach(mensaje => avisos.push({ hoja: nombreHoja, fila: fila + 1, mensaje }));
      }
    }
    return { registros: { actores: registros }, nuevos, actualizados, errores, avisos };
  }

  function leer(arrayBuffer, modulo, contexto) {
    if (modulo !== 'actores') throw Error('Módulo de carga por Excel no soportado: ' + modulo);
    if (!contexto?.cfg || !contexto?.esquema || !Array.isArray(contexto?.existentes)) throw Error('Contexto de carga de actores incompleto.');
    return leerActores(arrayBuffer, contexto);
  }

  function configurar(cfg) { configuracion = cfg; }
  const api = { leer, configurar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitCargaExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);
