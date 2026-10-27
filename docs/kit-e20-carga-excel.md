# E20 · Carga por Excel (Módulos I y IV)

**Responsable:** Sebastián · **Revisa e integra:** Felipe + Claude
**Entrega:** pull request listo el **jueves 29-oct a las 12:00**. Avance (borrador de PR con el lector y sus pruebas) el **miércoles 28 en la tarde**.
**Presentación a Germán:** viernes 30-oct.
**Antes de empezar, lee `AGENTS.md`** (regla del contrato). Si usas Claude Code o Codex, los dos la leen solos.

## 1. Qué es

El Kit Comercial es una muestra para posibles clientes. Cada herramienta tiene **un responsable por cliente**, que la alimenta sin ayuda de GH. Hoy esa persona solo puede cargar registro por registro, con un formulario. Esta tarea agrega la otra vía: **subir un Excel, ver una vista previa con los errores y confirmar**.

Criterio clave: **mismo resultado por las dos vías.** Un registro cargado por Excel debe quedar idéntico al que se guarda con el formulario.

## 2. Qué se carga

| Módulo | Archivo de entrada | Colecciones |
|---|---|---|
| I · Actores | El **Excel de mapeo que GH ya entrega**: una hoja por categoría. Se ignoran las hojas «Índice» y «Metodología». | `actores` |
| IV · Riesgos | **Plantilla nueva** de 5 hojas: Riesgos, Calificación técnica, Grupos, Validaciones y Medidas. | `riesgos`, `riesgos-calificacion`, `riesgos-grupos`, `riesgos-validaciones`, `riesgos-medidas` |

**Cómo es de verdad el Excel de mapeo de GH** (revisado sobre un archivo real; la muestra en `tests/fixtures/` lo imita):
- El encabezado **no** está en la fila 1. Está entre la fila 12 y la 13, según la hoja, y debajo lleva una fila con la escala («Muy Baja(1); Baja(2)…» o «(1-5)»). Hay que buscarlo, no suponerlo.
- La categoría sale del **nombre de la hoja**, que viene abreviado: «Ins. Gub», «Com. Aso», «Gre. Inv. Sec», «Aca. Ldo», «Proveedores», «Medios de comunicación». Esa equivalencia va en `kit-carga-excel.json`. Las hojas que empiezan por «Comp.» son comparativas y se ignoran.
- Influencia e Impacto ocupan **dos columnas** bajo un encabezado combinado: el texto («Alta») y el número (4). Si están las dos, manda el número; si no coinciden, es error.
- No todas las hojas tienen las mismas columnas. Algunas no tienen «Cargo» y otras dividen «Contacto» en Correo y Número. Subgrupo y Orden no existen en el archivo de GH; quedan vacíos.
- Hay celdas combinadas en Institución, cuando una institución abarca varias filas. La celda combinada aplica a todas sus filas.
- «Nivel de relacionamiento» es el nivel que puso GH. Se compara con el calculado según la regla de ajuste de abajo.
- Lo que se espera de cada fila de la muestra está en `tests/fixtures/ESPERADO.md`.
- **Módulo IV:** en Validaciones y Medidas, el usuario escribe el código del riesgo (R-01) y el nombre del grupo, no el id. El lector los convierte en id antes de llamar a `KitRiesgos.preparar(..., { modo: 'carga' })`.

Las reglas de detalle están en `docs/ficha-modulo-i.md` (secciones 3, 4.3 y 6) y `docs/ficha-modulo-iv.md` (secciones 3 y 6). Lo más importante:

- **Columnas por nombre, no por posición.** Sin importar tildes, mayúsculas ni espacios.
- **Módulo I:** «Dependencia» aparece dos veces en algunas hojas (el área de la institución y el criterio de 1 a 5). Se distinguen por la fila de escala que va debajo del encabezado.
- **Módulo I:** los niveles se aceptan como texto («Muy Baja», «medio», «Alta») o como número del 1 al 5. Eso ya lo resuelve `KitValidacion`; no lo reprogrames.
- **Módulo I:** si el nivel del archivo está un paso arriba del calculado, entra como ajuste con el motivo 5 (origen `'carga'`). Si está más de un paso arriba, o más abajo, la vista previa lo señala y se usa el nivel calculado.
- **Módulo I:** las columnas de nombres y contactos de personas **se descartan siempre**. `KitActores.validar` ya filtra con una lista permitida; no la saltes.
- **Volver a subir el mismo archivo no duplica.**
  - Actores: un actor ya existente (misma categoría + institución + cargo, sin importar tildes ni mayúsculas) conserva su `id` y se actualiza. Uno nuevo recibe `act-` + UUID.
  - Riesgos y medidas: el `id` sale del código, como en el formulario.
- **Vista previa obligatoria.** Antes de confirmar, la vista previa muestra:
  - cuántos registros son nuevos y cuántos se actualizan;
  - los errores con el formato «Hoja, fila N: Campo = "valor", se esperaba …».
  Nada se guarda hasta confirmar. Si hay errores, se puede corregir el archivo y volver a subirlo.
- **Guardado:** se hace con `KitDatos.guardarVarios`, que ya escribe en bloques. Los permisos e historial los pone la base de datos.

## 3. Cómo se arma (contrato)

**Archivos nuevos (tuyos):**
- `public/kit-carga-excel.js`: **lógica pura**. No toca el DOM ni la red, y se prueba en Node:
  ```js
  KitCargaExcel.leer(arrayBuffer, modulo, contexto)
  // → { registros: { [coleccion]: [...] }, nuevos, actualizados,
  //     errores: [{ hoja, fila, campo, mensaje }] }
  ```
  El `contexto` trae los esquemas, la configuración y los registros existentes. Los pasa la vista; no los busques tú.
- `public/kit-vista-carga-excel.js` + `public/estilos-kit-carga.css`: botón «Cargar Excel» dentro de la pestaña **Alimentación** de los Módulos I y IV. Muestra la vista previa, el botón de confirmar y el resultado.
- `public/config/kit-carga-excel.json`: tabla de encabezados → campo, por módulo y hoja.
- `public/plantillas/plantilla-modulo-iv.xlsx` (con listas desplegables) y su script generador en `scripts/`. La plantilla del Módulo I es el Excel de mapeo de GH; Claude deja una copia con datos inventados.
- `tests/kit-carga-excel.test.mjs` y `tests/kit-carga-excel-contrato.test.mjs`.

**Lo que usas sin modificarlo:**
- `public/vendor/xlsx.full.min.js` (SheetJS, versión fija). Lo deja Claude.
- `KitActores.validar(registro, cfg, esquema, 'carga')`
- `KitRiesgos.esquema(base, coleccion, { derechos, riesgos, cfg, empresa })` y `KitRiesgos.preparar(coleccion, registro, { esquema, cfg, listas, modo: 'carga', fila })`. Ya están en `kit-riesgos.js`, y el formulario usa las mismas. `preparar` devuelve `{ ok, registro, errores, existe }`; `existe` te dice si es nuevo o una actualización. Ver `tests/kit-contrato.test.mjs`.
- `KitDatos.guardarVarios(empresa, coleccion, registros)`

**Datos de prueba:** `tests/fixtures/mapeo-gh-muestra.xlsx` y `plantilla-iv-muestra.xlsx`, con datos **inventados** y la estructura real. El resultado esperado está en `tests/fixtures/ESPERADO.md` y el generador en `scripts/generar-fixtures-excel.py`. Úsalos en tus pruebas de contrato y agrega los tuyos.

**Para el desarrollo no necesitas acceso a la base de datos.** Prueba con un `KitDatos` falso en Node o en el navegador. La prueba con la base real la hace Claude al integrar.

## 4. Cómo se trabaja

1. Rama `e20-carga-excel` desde `main`. **Nunca** hagas push a `main`, porque eso publica el sitio.
2. Commits pequeños. `npm test` en verde antes de cada push. Hoy hay 170 pruebas y ninguna puede romperse.
3. Pull request contra `main` con:
   - qué hace;
   - cómo probarlo;
   - capturas a 390 px y a 1280 px;
   - la lista de archivos tocados.
4. Si necesitas cambiar un archivo que no es tuyo, lo propones en el PR o le escribes a Felipe; no lo editas por tu cuenta.
5. Nada de datos reales en el repo. El repo es **público**.

## 5. Listo significa

- [ ] Un Excel de mapeo de muestra carga en el Módulo I y produce exactamente los registros esperados (prueba de contrato).
- [ ] La plantilla del Módulo IV se descarga desde Alimentación, se llena y carga sus 5 hojas, respetando las referencias entre hojas: una validación apunta a un riesgo y a un grupo que existen en la base o en el mismo archivo.
- [ ] Los errores se muestran por hoja y fila, y nada se guarda sin confirmar.
- [ ] Subir dos veces el mismo archivo no duplica registros.
- [ ] Un registro cargado por Excel es idéntico al del formulario (prueba).
- [ ] Se usa a 390 px de ancho y con teclado. Funciona en tema claro y oscuro.
- [ ] `npm test` está en verde y el PR está abierto el jueves a las 12:00.

**Fuera de alcance:** exportar a Excel, cargas en los Módulos II y III, y editar el Excel dentro de la plataforma.
