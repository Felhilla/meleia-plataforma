# E24 · Mapa de actores por organización

El mapa agrupa los cargos por `institucion.trim()`, conservando mayúsculas, tildes y espacios interiores. El círculo cuenta registros. Cada cuadrante cuenta instituciones distintas con al menos un cargo en ese nivel final; el porcentaje usa como denominador todas las organizaciones del caso. Una organización puede estar en varios cuadrantes, por lo que los porcentajes no necesariamente suman 100 %. La nota de cada cuadrante informa cuántas organizaciones comparte.

El panel usa exclusivamente los cargos del cuadrante para calcular posiciones y categorías. Los filtros de posición se combinan mediante «o»; el filtro de categoría se combina con ellos mediante «y». Sin posiciones seleccionadas se muestran todas. Las autoridades se ordenan por alcance y luego alfabéticamente. Si una institución tiene varios alcances, se toma el primero en la secuencia Internacional, Nacional, Regional, Local. Si tiene varias categorías, aparece en cada sección correspondiente.

La ficha muestra todos los cargos de la organización, incluidos los de otros cuadrantes. Los rangos usan mínimo y máximo; su intensidad corresponde al máximo. Las escalas numéricas se leen con `KitActores.nivel`; el cuadrante y las alertas usan las funciones existentes. Las caracterizaciones se deduplican tras retirar espacios en los extremos. Los nombres y contactos proceden exclusivamente de la colección complementaria, sin recurrir a campos antiguos del actor.

## Colecciones complementarias

Los cuatro esquemas nuevos usan exclusivamente tipos ya admitidos por `KitValidacion`; no forman parte de la carga por Excel ni añaden formularios de alimentación.

| Colección | Identificador | Validación adicional al esquema |
| --- | --- | --- |
| `actores-contactos` | Referencia al identificador del actor | La vista omite correos sin estructura de correo válida; `ejemplo` es una lista de booleanos `true`/`false`, pues no existe tipo booleano |
| `actores-logos` | Slug, hasta 80 caracteres | La vista exige minúsculas ASCII, números y guiones entre segmentos; la institución se coteja por texto exacto recortado |
| `actores-resumen` | `resumen` | La fecha técnica solo se muestra con fecha ISO válida y se formatea en español de Colombia, sin desplazamiento de zona horaria |
| `perfil` | `logo` | Solo se crea un elemento de imagen cuando el contenido es admisible |

Las imágenes son texto de hasta 45.000 caracteres. La vista y el armazón solo admiten datos base64 con prefijos PNG, JPEG o WebP; rechazan SVG, URL, contenido base64 mal formado y exceso de longitud. JPEG se admite conforme a la regla explícita de visualización del encargo. El script que cargue estas colecciones deberá ejecutar el esquema, construir el slug a partir de la institución y mantener la correspondencia con los actores; la escritura está fuera de E24.

Se consultan actores, contactos y resumen al entrar al mapa. Los logos se consultan al abrir el primer panel o resumen; se comparte la promesa pendiente y el resultado durante esa vista. Los errores permiten reintentar. `perfil` se conserva por empresa en memoria durante la sesión; las respuestas tardías no se insertan en otra ruta y la caché se vacía al salir.

## Interacción y presentación

El selector compartido abre una lista de enlaces de caso, marca el actual y cierra con Escape. No se reserva espacio para un logo ausente o inválido. La pestaña se llama «Mapa de actores».

El panel conserva el patrón accesible del contexto y añade una pila para la ficha superior. Cada ventana tiene nombre accesible, modalidad, foco atrapado y cierre por Escape; al cerrar la ficha se restaura el foco en la tarjeta y al cerrar el panel en el cuadrante. La limpieza retira todas las ventanas y sus escuchas. Los detalles plegados no participan en el recorrido del foco.

El mapa tiene dos columnas en escritorio y una columna con franja superior de total en móvil. Las tablas de la ficha se presentan como tarjetas a 390 px. Las ayudas de escalas se asocian a los encabezados y aparecen debajo de la tabla al enfocarlos o pasar sobre ellos. Los seis SVG son dibujos propios de línea, sin marcas externas. Los colores semánticos usan tokens de marca y los azules nuevos tienen variantes clara y oscura. Las escalas tienen colores explícitos de texto para mantener contraste en ambos temas.

La suite automatizada usa datos inventados y dobles de DOM y de `KitDatos`. La revisión visual en navegador queda pendiente: el navegador local finalizó antes de generar capturas. No se han validado visualmente las dimensiones exactas ni lectores de pantalla reales.
