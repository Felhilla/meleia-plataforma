# E21 · Derechos humanos y doble materialidad

Los módulos II y III consultan exclusivamente la empresa seleccionada mediante `App.datos.listar(params.empresa, colección)`. El nombre mostrado procede de `App.datos.empresas()`: los registros conservan la marca `{empresa}`, que se sustituye sobre copias para presentar las vistas. Alimentación conserva la marca al editar y guardar.

## Colecciones

Todos los registros tienen `id`. Cada colección tiene un esquema homónimo en `public/config/esquemas/`, compuesto por tipos de `KitValidacion`.

| Colección | Contenido | Referencias | Registros preparados |
|---|---|---|---:|
| `ddhh-evaluaciones` | Nombre, fecha, origen y puntajes por eje | Ejes del catálogo | 2 |
| `ddhh-indicadores` | Calificación, incorporación, hallazgo, documentos, brecha/recomendación, nota y procedencia | Evaluación e indicador | 159 |
| `ddhh-componentes` | Calificaciones de componentes | Evaluación y componente | 12 |
| `ddhh-dimensiones` | Hallazgos y brechas, una entrada por línea | Evaluación y dimensión/eje | 18 |
| `ddhh-resultados` | Titular y mensajes ordenados | Sin referencias | 5 |
| `materialidad-temas` | Tema, dimensión ESG, descripción, origen y cruce con estándares | Ejes del catálogo | 15 |
| `materialidad-impacto` | Escala, alcance, irremediabilidad y probabilidad | Tema y grupo metodológico | 90 |
| `materialidad-financiera` | Rentabilidad y gasto operativo | Tema y función evaluadora | 75 |
| `materialidad-participacion` | Mecanismo, cantidad de participantes y descripción de la consulta | Grupo metodológico | 6 |

Son 382 registros. Los puntajes agregados del eje y del componente se conservan como mediciones explícitas de la fuente: no se recalculan promediando todos los indicadores indiscriminadamente. Los hallazgos de dimensiones e indicadores están vinculados a su evaluación; otra evaluación no los hereda.

Los identificadores existentes se conservan. Los registros derivados usan claves compuestas de evaluación/indicador, evaluación/componente, evaluación/dimensión o tema/evaluador. Las altas manuales usan UUID con prefijo `r-`; el formulario rechaza duplicados de clave y de combinación semántica. Editar conserva el identificador. KitDatos sigue usando upsert: no hay exclusión mutua entre dos sesiones concurrentes.

## Catálogo y datos de empresa

`kit-ddhh-catalogo.json` contiene instrumentos de evaluación, escalas propias, ejes, componentes, preguntas de indicadores, nombres/preguntas de dimensiones, referencias a estándares, logos y leyendas de calificación. Los textos descriptivos de la empresa quedan fuera. Se conservaron solo nombre, sigla, emisor, imagen y requerimientos de las referencias metodológicas: las explicaciones del caso sobre por qué se usó cada estándar no se copiaron al catálogo.

`kit-materialidad-catalogo.json` contiene las fórmulas, umbrales, cuadrantes, escala y plantillas de grupos y funciones evaluadoras. Las cantidades de participantes, los mecanismos y las descripciones particulares pasan a `materialidad-participacion`. Las etapas narrativas del caso no se copiaron como metodología genérica.

Los nombres de criterios, preguntas y estándares se consideran catálogo. Los documentos aportados, afirmaciones sobre políticas implementadas, evidencias de certificación, hallazgos y brechas se consideran datos de empresa, aun sin nombrarla. La nota de incertidumbre de un indicador también se conserva como dato. Una calificación ausente permanece `null`, nunca cero.

## Escalas

Cada instrumento de `estandares` declara su `escala`:

- Numérica: `{tipo: 'decimal', min: 0, max: 5, niveles: [...]}`.
- Ordenada: `{tipo: 'lista', valores: ['C', 'B', 'A', 'AA', 'AAA']}`; también admite Sí/No.

`KitEstudios.esquema` deriva los campos de evaluación y la regla del indicador/componente elegido desde esa escala. Tanto los formularios como el generador pasan por `KitEstudios.validar`, que usa `KitValidacion` y admite coma decimal. Las referencias de empresa se validan con conjuntos de ids de sus colecciones; no se hacen consultas desde el motor.

Las escalas actuales mantienen las arañas y los semáforos originales. Para instrumentos con otra escala, la vista usa fichas desplegables y comparación en la unidad original: no promedia letras ni las presenta como una escala 0–5. El motor ofrece una posición ordinal normalizada, separada de la calificación guardada. Los estándares de prueba solo existen en las pruebas; no se agregó contenido de protocolos futuros al sitio.

## Vistas y diseño

- `ddhh/resultados`: titular, mensajes y evidencia de estándares del capítulo 03, seguidos por las dimensiones del capítulo 04.
- `ddhh/estandares`: comparación de evaluaciones, arañas, componentes e indicadores con hallazgos, documentos y brechas.
- `materialidad/doble`, `materialidad/impacto`, `materialidad/financiera`: cuadrantes y ficha del tema del capítulo 05, con la tabla de calificaciones de grupos/áreas y referencias al Módulo II.
- `ddhh/alimentacion` y `materialidad/alimentacion`: subpestañas por colección, tabla, agregar, editar, borrar con confirmación dentro de la página, formulario desde esquema, errores junto al campo, vista previa, confirmación de guardado e historial.

La estructura gráfica y los CSS proceden de las vistas aprobadas del Demo A, que permanecen intactas. Se adaptaron el acceso a datos, las rutas y el ciclo de vida. El formulario de evaluaciones adapta la organización del formulario legado: grupos de puntajes por dimensión, nombre/fecha, prellenado desde la evaluación actual y teclado decimal. Se emplea la validación por esquema y la confirmación del Kit.

Se retiraron de las fichas de materialidad los cruces con riesgos y acciones del Demo A: pertenecen al Módulo IV, que tiene otros casos. No se consulta ese módulo. Los mensajes editoriales originales de resultados se conservan completos; los mensajes sobre riesgos, plan y materialidad se presentan como narrativa, sin reconstruir sus gráficos del capítulo 03 ni enlazar a riesgos/plan. El mensaje de estándares conserva sus barras y brechas; materialidad enlaza a su propia vista. Los mensajes son registros editables y no cambian automáticamente al modificar puntajes.

Se prefiere la evaluación real más reciente; la evaluación futura de ejemplo solo aparece por selección explícita cuando hay evaluaciones reales. Los hallazgos no se transfieren a una nueva evaluación. Los temas de origen ilustrativo se identifican como tales; los nuevos datos no reciben automáticamente esa etiqueta.

Las lecturas verifican `params.vigente()` y las escrituras no repintan una vista abandonada. Los diálogos limpian eventos y restauran el fondo; Escape y Tab funcionan dentro de ellos. La navegación entre colecciones descarta respuestas tardías. El DOM usa `App.el`, `textContent` y SVG creado por API. No hay temporizadores ni almacenamiento persistente de datos de empresa.

## Lecturas

| Vista | Colecciones |
|---|---|
| Resultados | Las cinco de DDHH |
| Cruce de estándares | Evaluaciones, indicadores, componentes y dimensiones |
| Las tres lecturas de materialidad | Temas, impacto y financiera |
| Alimentación | Colección abierta y sus referencias |
| Confirmación de borrado | Colecciones dependientes, solo al solicitar borrar |
| Historial | Colecciones del módulo, hasta 50 cambios recientes en conjunto |

Los catálogos y esquemas públicos se reutilizan en memoria. No existe respaldo con `public/data/` en las vistas. La materialidad requiere al menos una evaluación de cada dimensión por tema; mientras un tema esté incompleto no calcula un universo parcial. Las medias usan las respuestas registradas, no imputan ceros a grupos sin respuesta.

Alimentación solo se ofrece a responsable/admin. El armazón protege la ruta y las vistas comprueban `puedeEditar`; esto no sustituye RLS. Excel queda expresamente marcado como próximo, sin importador ni cambios en el contrato de los módulos I y IV.

## Preparación local

El generador `scripts/kit-<caso>-registros.mjs` lee los JSON legados, sustituye el nombre indicado por `empresa-config.json`, valida todas las colecciones y solo después escribe `privado/carga-<caso>/<coleccion>.json`. El id de destino se toma del nombre del script; los archivos no incluyen una empresa fija. `privado/` ya está ignorado por Git.

Las fechas mensuales del legado se representan con día 01 para cumplir el tipo `fecha` de KitValidacion. Ese día es una convención de migración, no una fecha diaria acreditada. La selección visual sigue mostrando mes y año.

El script no sube datos ni genera respaldos de la base. La carga posterior debe usar la empresa autorizada, conservar los ids y realizar respaldo antes y después. Para referencias, cargar evaluaciones antes de sus detalles y temas antes de sus calificaciones. Un error incluye colección, registro, campo y regla esperada; la validación completa precede cualquier escritura de archivos.

## Cambios mínimos de integración

`kit-armazon.js` solo cambia `tabsModulo` y los rótulos visibles de las pestañas. Las rutas, selección de casos, permisos y limpieza existentes se reutilizan. `index.html` solo agrega dos CSS y seis scripts, después del Módulo I. Se actualizaron las expectativas de rutas, permisos y orden de scripts de `tests/kit-armazon.test.mjs`; ninguna prueba de cálculo o del legado se eliminó.

Los archivos nuevos son los nueve esquemas, dos catálogos, dos CSS, seis scripts de vistas/motores/ayudas, el generador, tres suites, un doble DOM compartido y la lista de huellas del legado. El informe detallado y los archivos de carga quedan en `privado/`.

## Pruebas y límites

`npm test`: 205 pruebas en verde (179 anteriores y 26 nuevas). Las suites nuevas cubren empresa activa, sustitución segura del nombre, permiso de edición, vacíos, cancelación, separación por evaluación, comparación, escalas numéricas y ordenadas, referencias, confirmaciones, guardado, borrado, historial, fallos de red simulados, foco, generación y rechazo de una carga inválida antes de escribir.

La exigencia literal de ausencia de los dos nombres en todo el árbol entra en conflicto con preservar los archivos legados, que ya los contienen. La prueba fija por SHA-256 los cinco archivos legados afectados y cuenta los usos existentes del identificador de caso en configuración y pruebas del armazón. Todo archivo nuevo y todo registro preparado debe estar libre de esos nombres. No se amplió la lista de excepciones a carpetas completas.

No se verificaron base real, RLS, auditoría, sesión real ni carga posterior. No hubo acceso a red, commit ni push. Chrome local terminó con código 134 antes de generar capturas de la página de prueba sin recursos externos: quedan pendientes la inspección visual real en ambos temas a 390/1280/1440 px, contraste y lector de pantalla. CSS y DOM fueron revisados y probados localmente; eso no sustituye la revisión visual.
