# E22 · Materialidad con resultados publicados

El Módulo III presenta los resultados publicados de un estudio de doble materialidad. No reconstruye cuadrantes ni calificaciones de temas que no están disponibles. El nombre visible procede de la empresa autorizada en la base; los textos sustituyen `{empresa}` mediante texto seguro.

## Colecciones y lecturas

| Colección | Contenido | Vista |
|---|---|---|
| `materialidad-resumen` | Fuente, umbrales, escala, participantes y notas; único registro `resumen` | Todas las lecturas |
| `materialidad-temas` | Orden, nombre, dimensión, tipo, estándar, descripción e indicadores | Doble |
| `materialidad-impacto-top` | Puesto, aspecto, importancia y probabilidad | Impacto |
| `materialidad-financiera-top` | Variable, puesto, aspecto, impacto promedio, probabilidad e índice | Financiera |
| `materialidad-convergencia` | Aspecto, tres marcas Sí/No y cantidad de dimensiones | Doble |

Los esquemas de impacto, financiera y participación de E21 permanecen intactos, pero el módulo ya no los consulta. El catálogo anterior tampoco alimenta las nuevas lecturas. Las calificaciones históricas siguen perteneciendo al modelo anterior.

Doble calcula el titular según los tipos registrados, agrupa los temas y muestra la convergencia ordenada por cantidad de dimensiones. La ficha informa explícitamente cuando no existe descripción. Impacto muestra hasta diez posiciones publicadas, importancia sobre cinco, probabilidad y umbral, junto a una tabla accesible. Financiera separa las dos variables y ordena hasta cinco aspectos por índice, con barras sobre 25. Conserva el índice publicado, sin recalcularlo a partir de valores posiblemente redondeados.

Cada lectura pide exclusivamente el resumen y las colecciones de su pestaña. Alimentación consulta la colección abierta; el resumen inicial permite conservar la fuente al cambiar de subpestaña sin consultas adicionales. El historial consulta las cinco colecciones solo a petición. No hay sondeos periódicos ni respaldo de datos de empresa en archivos públicos.

## Edición y accesibilidad

Se reutiliza la alimentación de E21. El resumen no ofrece Agregar si existe, conserva su clave y rechaza una colección con múltiples resúmenes o claves distintas. Las marcas de convergencia se guardan como `Sí`/`No`, valores compatibles con el validador y los controles existentes. La cantidad de dimensiones debe coincidir con esas marcas.

Los formularios y el generador usan los esquemas nuevos y `KitMaterialidad.validar`, sobre el validador compartido sin modificarlo. Índices fuera de 0–25 y puntuaciones fuera de 0–5 se rechazan. Las acciones conservan confirmación, errores junto al campo e historial. El demostrador no recibe controles de edición; la seguridad continúa dependiendo de RLS.

La ficha usa diálogo modal con título accesible, fondo inerte, cierre con Escape, foco confinado y devolución al botón del tema. La limpieza al navegar retira eventos y restaura el fondo. El DOM utiliza `App.el` y `textContent`.

Las barras, tablas y tarjetas usan tokens del Kit para ambos temas, columnas fluidas y ajuste de texto. Se elimina el ancho mínimo del antiguo mapa. Editar y Borrar mantienen las palabras completas en alimentación de los módulos II y III.

## Generador local

```
node scripts/kit-materialidad-registros.mjs <archivo de entrada> <carpeta de salida>
```

La entrada tiene `meta`, `temas`, `impacto_top`, `financiera_top` y `convergencia`. `meta.pendientes` se convierte en notas separadas por saltos de línea; los booleanos de convergencia se convierten en Sí/No. No hay nombres de empresa ni datos del estudio dentro del generador.

Se validan las cinco colecciones completas antes de crear la carpeta o sobrescribir archivos. El error identifica colección, registro y campo. También se rechazan campos desconocidos en registros, códigos duplicados y puestos u órdenes duplicados dentro de su variable. No se exige una cantidad fija de temas: el titular refleja los datos disponibles. La muestra de pruebas mantiene la estructura de entrada con temas y números inventados.

## Compatibilidad y anonimización

El generador histórico de E21 y su prueba necesitan el esquema anterior de temas para seguir validando sus 382 registros. Se conserva ese esquema, sin datos de empresa, en `tests/fixtures/materialidad-temas-e21.json`; únicamente el generador histórico y su prueba lo leen. El generador nuevo usa exclusivamente los esquemas actuales. La prueba de E21 identifica explícitamente su generador, evitando seleccionar el nuevo por el orden de archivos.

El caso previo del Módulo III era `empresa-demo`. Por ello no cambian los conteos de `tests/fixtures/e21-legado-huellas.json`: siguen siendo uno en configuración y cinco en las pruebas del armazón. No se amplían las huellas ni se excluyen carpetas. La prueba general de anonimización exceptúa únicamente el campo de casos del Módulo III, autorizado por este encargo y fijado por SHA-256; todo el resto del documento sigue bajo comprobación. La prueba del armazón verifica un único caso y su ruta inicial.

Estos esquemas pertenecen al Módulo III; no incorporan carga por Excel. Por la prohibición expresa del encargo no se modifican su configuración, plantillas, librería ni archivos de contrato compartidos. Las pruebas existentes del contrato Excel continúan ejecutándose.

## Verificación y límites

`npm test`: 208 pruebas aprobadas, sin fallos ni omisiones. `git diff --check` sin observaciones.

Las pruebas cubren conteos, agrupación, falta de ficha, convergencia, umbral, escala financiera, nombre autorizado, permisos, vacíos, resumen único, errores, claves de guardado, borrado, historial, foco, limpieza y navegación obsoleta. El generador se ejecuta con la muestra y rechaza un valor fuera de escala antes de escribir.

No se verificaron base, RLS, sesión real ni carga remota. La inspección visual en navegador a 390 px y en ambos temas sigue pendiente: Chrome local abortó con código 134 antes de renderizar la página autónoma con datos inventados. La revisión de CSS y las pruebas DOM no sustituyen esa inspección ni una prueba con lector de pantalla. No hubo acceso a red, commit ni push.
