import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const privado = path.join(root, 'privado/anonimizacion.json');
const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const extensiones = new Set(['.js', '.mjs', '.json', '.md', '.html', '.css', '.py', '.txt']);

test('sin términos prohibidos en contenido ni nombres de archivos y carpetas', {
  skip: fs.existsSync(privado) ? false : 'Archivo privado de anonimización no disponible en este equipo o CI',
}, () => {
  const terminos = JSON.parse(fs.readFileSync(privado, 'utf8')).terminos_prohibidos.map(normalizar);
  const comprobar = (texto, contexto) => {
    const limpio = normalizar(texto);
    terminos.forEach((termino, indice) => assert.ok(!limpio.includes(termino), `Término prohibido de índice ${indice + 1} en ${contexto}`));
  };
  function recorrer(ruta) {
    // No incluir rutas ni contenido privados en los mensajes de fallo.
    comprobar(path.relative(root, ruta), 'nombre de archivo o carpeta');
    if (fs.statSync(ruta).isDirectory()) {
      fs.readdirSync(ruta).forEach(nombre => recorrer(path.join(ruta, nombre)));
    } else if (extensiones.has(path.extname(ruta))) {
      let contenido = fs.readFileSync(ruta, 'utf8');
      // E22 autoriza exclusivamente el identificador de caso del Módulo III.
      if (path.relative(root, ruta) === 'public/config/kit-modulos.json') {
        const config = JSON.parse(contenido);
        const modulo = config.modulos.find(m => m.id === 'materialidad');
        assert.equal(modulo.casos.length, 1);
        assert.equal(createHash('sha256').update(modulo.casos[0]).digest('hex'), '56430f5b7fb61dc8b60c2bbb16d3b6f2f4e5154aded422375cf77acf45b19ad5');
        modulo.casos = [];
        contenido = JSON.stringify(config);
      }
      comprobar(contenido, 'contenido público');
    }
  }
  ['public', 'scripts', 'docs', 'tests', 'README.md', 'package.json'].forEach(nombre => recorrer(path.join(root, nombre)));
});

test('configuración de empresa ficticia con identidad y etiqueta completas', () => {
  const empresa = JSON.parse(fs.readFileSync(path.join(root, 'public/config/empresa-config.json'), 'utf8'));
  for (const campo of ['nombre', 'nombre_corto', 'etiqueta_ficticia']) {
    assert.equal(typeof empresa[campo], 'string');
    assert.ok(empresa[campo].trim());
  }
  assert.equal(empresa.ficticia, true);
});
