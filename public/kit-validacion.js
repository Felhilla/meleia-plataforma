(function (root) {
  'use strict';
  const normalizar = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\b(baja|alta|media)\b/g, t => ({ baja: 'bajo', alta: 'alto', media: 'medio' })[t]);
  const vacio = v => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
  function validar(registro, esquema, referencias = {}) {
    const salida = { ...registro }, errores = [];
    if (!registro || typeof registro !== 'object' || Array.isArray(registro)) return { ok: false, registro: {}, errores: [{ campo: '', mensaje: 'Registro inválido, se esperaba un objeto' }] };
    for (const [campo, regla] of Object.entries(esquema.campos || {})) {
      const valor = registro[campo], etiqueta = regla.etiqueta || campo;
      const error = esperado => errores.push({ campo, mensaje: `${etiqueta} = ${valor === undefined ? 'sin valor' : JSON.stringify(valor)}, se esperaba ${esperado}` });
      if (vacio(valor) && (!Array.isArray(valor) || (regla.tipo === 'lista' && regla.multiple))) {
        if (regla.obligatorio || (regla.obligatorioSi && registro[regla.obligatorioSi.campo] === regla.obligatorioSi.valor)) error('un valor obligatorio');
        continue;
      }
      let v = valor;
      switch (regla.tipo) {
        case 'texto': case 'texto-largo':
          if (typeof v !== 'string' || (regla.max !== undefined && v.length > regla.max)) error(`texto${regla.max !== undefined ? ` de hasta ${regla.max} caracteres` : ''}`);
          else salida[campo] = v.trim();
          break;
        case 'entero': case 'decimal': {
          if (typeof v === 'string' && /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(v.trim())) v = Number(v);
          const rango = regla.min !== undefined && regla.max !== undefined ? ` de ${regla.min} a ${regla.max}` : `${regla.min !== undefined ? ` mayor o igual a ${regla.min}` : ''}${regla.max !== undefined ? ` menor o igual a ${regla.max}` : ''}`;
          if (typeof v !== 'number' || !Number.isFinite(v) || (regla.tipo === 'entero' && !Number.isInteger(v)) || (regla.min !== undefined && v < regla.min) || (regla.max !== undefined && v > regla.max)) error(`un ${regla.tipo === 'entero' ? 'entero' : 'número decimal'}${rango}`);
          else salida[campo] = v;
          break;
        }
        case 'fecha': {
          const fecha = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00Z') : null;
          if (!fecha || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== v) error('una fecha válida AAAA-MM-DD');
          break;
        }
        case 'lista':
          if (regla.multiple ? !Array.isArray(v) || !v.every(x => regla.valores.includes(x)) : !regla.valores.includes(v)) error(`${regla.multiple ? 'una lista con valores' : 'uno de los valores'}: ${regla.valores.join(', ')}`);
          break;
        case 'referencia':
          if (!(referencias[regla.coleccion] instanceof Set) || !referencias[regla.coleccion].has(v)) error(`un identificador existente en ${regla.coleccion}`);
          break;
        case 'nivel': {
          const max = regla.max || regla.escala || 5;
          const etiquetas = regla.etiquetas || (max === 3 ? ['Bajo', 'Medio', 'Alto'] : ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']);
          const pares = Array.isArray(etiquetas) ? etiquetas.map((t, i) => [i + 1, t]) : Object.entries(etiquetas);
          if (typeof v === 'string') v = /^\d+$/.test(v.trim()) ? Number(v) : Number(pares.find(([, t]) => normalizar(t) === normalizar(v))?.[0]);
          if (!Number.isInteger(v) || v < 1 || v > max) error(`un nivel de 1 a ${max} (${pares.map(([, t]) => t).join(', ')})`);
          else salida[campo] = v;
          break;
        }
        default: error(`un tipo de campo conocido (${regla.tipo})`);
      }
    }
    return { ok: errores.length === 0, registro: salida, errores };
  }
  const api = { validar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitValidacion = api;
})(typeof window !== 'undefined' ? window : globalThis);
