# Diseño base del Kit · Meleia

**Fuente de verdad del diseño.** Documenta lo que existe hoy en el código (actualizado el 5-nov-2026: paleta tomada del logo de Meleia, estructura y tipografía del Radar 360, solo marca Meleia, aprobado por Felipe). No propone cambios. Prevalece sobre cualquier skill de diseño; cambiar la paleta, las tipografías, los semáforos o la banda de encabezado requiere aprobación explícita de Felipe.

Archivos donde vive cada cosa: `public/estilos.css` (tokens y base), `public/estilos-kit.css` (armazón del Kit, Home), `public/estilos-kit-actores.css` (Módulo I), `public/estilos-kit-ddhh.css` (Módulo II), `public/estilos-kit-materialidad.css` (Módulo III), `public/estilos-kit-riesgos.css` (Módulo IV). Las reglas de relato y gráficos están en `docs/sistema-diseno.md`.

## 1. Paleta Meleia (`estilos.css`)

| Nombre | Token | Claro | Oscuro | Uso |
|---|---|---|---|---|
| Oliva (antes Forest) | `--forest`, `--principal` | `#3A4733` | `--principal: #C9D6B4` | Marca, cifras, enlaces |
| Forest fuerte | `--principal-fuerte` | `#2A3424` | `#E8EDE0` | Énfasis |
| Ivory | `--ivory`, `--fondo` | `#F9F6F2` | `--fondo: #14170F` | Fondo de página |
| Sand | `--sand`, `--fondo-alterno` | `#F1ECE3` | `#1A1E14` | Bandas alternas |
| Blanco | `--superficie` | `#FFFFFF` | `#20251A` | Tarjetas, ventanas |
| Sage | `--sage`, `--suave` | `#E8EDE0` | `--suave: #2C3323` | Superficies suaves |
| Blue | `--blue`, `--secundario` | `#EEF0E8` | — | Superficies suaves |
| Gold (dorado) | `--gold`, `--oro`, `--acento` | `#B78D36` | `#B78D36` | Acento; nunca texto pequeño |
| Dorado texto | `--oro-texto` | `#7A5B1E` | `#D8C9A0` | Dorado legible como texto |
| Terra | `--terra` | `#D9A58F` | — | Reservado |
| Texto | `--texto` | `#1F241B` | `#F1EEE6` | Texto principal |
| Texto suave | `--texto-suave` | `#5B5E52` | `#C4C6B5` | Texto secundario |
| Línea | `--linea` | `#7C7F70` | `#9DA28C` | Filetes, ejes |
| Borde | `--borde` / `--borde-fuerte` | `#DCD5C6` / `#C4BDAF` | `#363D2C` / `#525B44` | Bordes |

Niveles alto, medio y bajo (prioridad, posición desfavorable, errores):

| Token | Claro (texto / fondo) | Oscuro (texto / fondo) |
|---|---|---|
| `--alta` / `--alta-fondo` | `#8A3F2B` / `#F5E4DC` | `#EDB9A3` / `#3E2A22` |
| `--media` / `--media-fondo` | `#7A5A12` / `#F1E9D2` | `#E3CD8F` / `#352F1E` |
| `--baja` / `--baja-fondo` | `#3A4733` / `#E8EDE0` | `#C9D6B4` / `#2C3323` |

Tokens del armazón del Kit (`estilos-kit.css`, E23):

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--kit-titulo-fondo` / `--kit-titulo-borde` | `#E8EDE0` / `#3A4733` | `#2C3323` / `#C9D6B4` | Banda de encabezado, botones «Credenciales» y «Caso», verde de los cuadros |
| `--kit-desplegable-fondo` / `--kit-desplegable-borde` | `#F5EDDA` / `#B78D36` | `#2E2817` / `#C9A04E` | Paneles naranjas (credenciales, lista de casos), naranja de los cuadros |
| `--kit-tarjeta-gris` | `#E7E5E0` | `#1E2F28` | Tarjetas de módulo y de organización, franjas grises |

## 2. Tipografía

- Títulos (h1 a h4): **Fraunces** 500 y 600 (`--fuente-titulos`), con respaldo Georgia.
- Texto: **IBM Plex Sans** 400 a 700 (`--fuente`), con respaldo `system-ui`. Las dos vienen de Google Fonts, como en el Radar 360.
- Escala: `--t-display` clamp(2.6–4.4 rem), `--t-h1` clamp(2–2.9 rem), `--t-h2` clamp(1.5–1.9 rem), `--t-h3` 1.2 rem, `--t-cuerpo` 1.0625 rem (interlineado 1.6), `--t-chico` .875 rem, `--t-micro` .78 rem.
- Títulos en 600, interlineado 1.15, `letter-spacing: -.015em`, `text-wrap: balance`.
- Números con formato `es-CO` (coma decimal).

## 3. Ritmo, radios y sombras

- Espacios: `--e1` 4 · `--e2` 8 · `--e3` 16 · `--e4` 24 · `--e5` 32 · `--e6` 48 · `--e7` 72 · `--e8` 112 px.
- Ancho máximo `--ancho` 1200 px. Radios `--radio` 14 px y `--radio-chico` 8 px.
- Sombras `--sombra` y `--sombra-alta` (tinte Forest en claro, negro en oscuro). Curva `--ease-out` cubic-bezier(.23, 1, .32, 1).

## 4. Banda de encabezado (aprobada, boceto Home)

- `.kit-titulo`: franja con fondo `--kit-titulo-fondo`, borde 1 px `--kit-titulo-borde`, radio 8 px, relleno 24/32 px y 140 px a la derecha para el arco.
- `.kit-titulo-arco`: medio círculo de 104 × 52 px, trazo 2 px `--oro`, sin base, anclado abajo a la derecha (20 px), con un **punto dorado** de 10 px en el centro.
- Se aplica a **todos** los títulos: portada («Meleia»), cada módulo («Módulo I · Mapeo de actores») y los títulos de paneles y ventanas del Módulo I.
- En celular (≤ 560 px): arco de 72 × 36 px y 96 px de relleno a la derecha.

## 5. Semáforos de calificación

**Paleta de semáforo** (`estilos.css`, sobria, sin neón):

| Color | Sólido | Fondo claro | Fondo oscuro |
|---|---|---|---|
| Rojo | `--sem-rojo` `#B9503A` | `#F6E1DA` | `#43281F` |
| Naranja | `--sem-naranja` `#B78D36` | `#F5EDDA` | `#45311D` |
| Ámbar | `--sem-ambar` `#DDAE3E` | `#F7EDD2` | `#423719` |
| Amarillo | `--sem-amarillo` `#E6D267` | `#F6F1D3` | `#3D3A1E` |
| Verde | `--sem-verde` `#5A9452` | `#E1EEDD` | `#233A24` |
| Gris | `--sem-gris` `#AEB5AF` | `#ECEEEC` | `#2A322E` |

**Materialidad 0–5** (`config/kit-ddhh-catalogo.json` → `calificacion.materialidad`; se muestra en la metodología del Módulo II): 5 Muy alto **rojo** · 4 Alto **naranja** · 3 Medio **ámbar** · 2 Bajo **amarillo** · 1 Muy bajo **verde** · 0 Nulo **gris**. El Módulo III usa este semáforo en la ficha del aspecto, con redondeo al entero más cercano, número y etiqueta (boceto de Felipe, 28-oct). El mapa muestra cuadrantes con `--kit-titulo-fondo` (doble), `--ka-azul-fondo` (impacto), `--kit-desplegable-fondo` (financiera) y `--superficie` (no material). Los marcadores numerados combinan forma y color por dimensión ESG (pedido de Felipe, 28-oct), con tokens existentes y sin colores del semáforo: triángulo Ambiental `--forest` (oscuro: `--principal`), círculo Social `--oro-texto` y cuadrado Gobernanza `--ka-azul-borde`. Las tres vistas son mapas de cuatro cuadrantes, con umbrales vertical y horizontal en `--texto`: doble usa X financiera / Y importancia; impacto usa X probabilidad / Y importancia; financiera usa X probabilidad / Y financiera. Los umbrales respectivos son `umbral_financiero`, `umbral_impacto` y `umbral_probabilidad`; este último es opcional y se respalda con el promedio de probabilidad de todos los aspectos. En las tres vistas, arriba-derecha usa `--kit-titulo-fondo`, arriba-izquierda `--ka-azul-fondo`, abajo-derecha `--kit-desplegable-fondo` y abajo-izquierda `--superficie`. Solo doble lleva rótulos de esquina.

Cada marcador queda en sus coordenadas exactas. Los numerados miden aproximadamente 24 px; solo las coincidencias exactas entre numerados admiten un corrimiento horizontal fijo, de hasta 0,06 unidades, sin líneas guía. Los huecos se dibujan primero y el puesto 1 al final. Cada lista presenta el top 10 por promedio de los dos ejes, con desempate por orden; sus números coinciden con los marcadores. Lista y ficha no muestran validación. La ficha presenta el cuadrante de la vista activa (alta significa estrictamente por encima del umbral); la financiera destaca materialidad financiera y probabilidad y conserva la tabla del taller.

**Brechas / madurez 0–5** (`calificacion.brechas`, Módulo II): 5 Optimizado y 4 Gestionado **verde** · 3 En gestión **ámbar** · 2 Inicial **naranja** · 1 Declarativo y 0 Sin información **rojo**. Se pinta en círculos (`.res-puntaje`, `.dim-circulo`) con el nivel entero del puntaje.

**Umbrales de puntaje 0–5** (`config/kit-ddhh-catalogo.json` → `umbrales`, Módulo II, gráficos): menor que 3 → `--alta`; de 3 a menos de 4 → `--media`; 4 o más → `--baja`. Marcado en el catálogo como hipótesis («por confirmar»).

**Priorización de riesgos** (Módulo IV, `config/kit-riesgos-config.json` → `prioridad`, gravedad × probabilidad):

| Gravedad \ Probabilidad | Alta | Media | Baja |
|---|---|---|---|
| Alta | Alta | Alta | Media |
| Media | Alta | Media | Baja |
| Baja | Media | Baja | Baja |

Colores de celda y etiqueta: Alta `.kr-alta` (`--alta` sobre `--alta-fondo`), Media `.kr-media` (`--media` sobre `--media-fondo`), Baja `.kr-baja` (`--baja` sobre `--baja-fondo`).

**Escalas del Módulo I** (`estilos-kit-actores.css`):
- Intensidad 1–5 (impacto, influencia, dependencia, responsabilidad), verde de la marca, sin rojo: `#E6F0E8`, `#C9DFCE`, `#96BDA1`, `#39634B`, `#234331` (texto blanco en 4 y 5).
- Tensión 1–5, naranja → rojo: `#FAEAD8`, `#F3D2AE`, `#E9AD75`, `#98492C`, `#792A27`.
- Posición: Favorable (`--kit-titulo-*`), Neutral (`--kit-desplegable-*`), Desfavorable (`--alta` / `--alta-fondo`), Mixta (`--kit-tarjeta-gris`).
- Cuadrantes: Gestión activa **azul** (`--ka-azul-fondo` `#E1ECF7`, borde `#315B80`; oscuro `#203448` / `#96BEE3`), Involucramiento estratégico **verde** (`--kit-titulo-*`), Seguimiento periférico y Gestión cautelosa **naranja** (`--kit-desplegable-*`).

## 6. «Vencidas»

Existe solo en el plan de acción del Demo A (`public/vista-plan.js`, `public/estilos-plan.css`), que hoy **no se carga en el Kit**: `.estado-vencida` fondo `#FFD6D6`, texto `#8A1F1F`, borde `#F2AFAF` (oscuro: `#5A2424` / `#FFD6D6` / `#7A3434`); `.plan-plazo.vencido` texto `#8A1F1F` en negrita. Las medidas del Módulo IV del Kit no tienen hoy un estado «Vencida».

## 7. Componentes aprobados

| Componente | Clase | Dónde | Aprobado |
|---|---|---|---|
| Banda de encabezado con arco y punto dorado | `.kit-titulo` | Todos los títulos | Boceto Home (27-oct) |
| Botón «Credenciales» y panel naranja con X y 4 personas separadas por línea punteada | `.kit-credenciales-*`, `.kit-equipo` | Home | Boceto Home |
| Tarjetas grises de módulo (número, nombre, descripción, casos), rejilla 4 → 2 → 1 columnas | `.kit-modulo`, `.kit-rejilla` | Home | Boceto Home |
| Selector «Caso» desplegable con lista naranja | `.kit-casos`, `.kit-casos-lista` | Todos los módulos | Boceto Módulo I |
| Mapa 2 × 2 de cuadros-botón con círculo central gris | `.ka-mapa-e24`, `.ka-cuadro`, `.ka-centro` | Módulo I | Boceto Módulo I |
| Panel lateral derecho (filtros por posición, desplegable por grupo, secciones con línea punteada, tarjetas de organización con logo en recuadro blanco) | `.ka-dialogo`, `.ka-posiciones`, `.ka-organizacion`, `.ka-logo` | Módulo I | Boceto Módulo I |
| Ficha de organización (logo, nombre en franja verde, 3 cajas, franja gris «CARACTERIZACIÓN», tabla de actores, «MÁS DETALLE» plegado, nota de datos personales) | `.ka-ficha`, `.ka-franja-verde`, `.ka-franja-gris`, `.ka-tabla-ficha` | Módulo I | Boceto Módulo I + rediseño del listado |
| Ventana flotante centrada (resumen) | `.ka-fondo-centro` | Módulo I | Pedido de Felipe (27-oct) |
| Nota técnica al pie (metodología, fecha de corte mes y año, datos de ejemplo) | `.ka-nota-tecnica` | Módulo I | Boceto Módulo I |
| Capítulos, antetítulo dorado, relato y gráficos del Demo A conservados en los Módulos II–IV | ver `docs/sistema-diseno.md` | Módulos II–IV | Diseño del Demo A aprobado |

Reglas transversales vigentes: tema claro y oscuro con tokens; 1280 × 720 sin desplazar en el mapa del Módulo I; a 390 px nada se corta ni hay desplazamiento horizontal; los botones no parten palabras; logos de empresa eliminados por decisión de Felipe (27-oct).

## 8. Módulo IV · Ventana de riesgos (E33, boceto 28-oct-2026)

La matriz es la entrada única visible del módulo. No se dibuja barra de pestañas; las rutas de Medidas y Alimentación conservan sus permisos. Al pie, los enlaces con aspecto de botón secundario se alinean a la izquierda: «Medidas de gestión» para todos y «Alimentación» solo para quien puede editar. Ambas vistas secundarias incluyen «← Volver a la matriz» arriba. El selector de los dos casos se conserva.

- **Entrada E35**: selector de caso → matriz, sin banda de cifras de prioridad.
- **Matriz** `.kr-marco`: una tarjeta con marco, eje «Gravedad» rotado a la izquierda, filas 3 · Alta / 2 · Media / 1 · Baja; abajo las columnas 1 · Baja / 2 · Media / 3 · Alta y «Probabilidad». Celdas de al menos 9,5 rem en escritorio, con las clases de prioridad existentes y códigos como botones. Conserva tabla y encabezados accesibles. En celular reduce rellenos y altura de celdas, mantiene las tres columnas y permite crecer verticalmente.
- **Lista**: «Ver lista de riesgos» es un `details` cerrado inicialmente, con los cuatro filtros existentes y la lista ordenada por prioridad.
- **Ficha**: diálogo modal con Escape, foco atrapado (incluido el `summary`) y devolución del foco. El h2 presenta código y nombre en `--kit-titulo-fondo` con borde `--kit-titulo-borde`; descripción con saltos de línea. Dos columnas en escritorio, una en celular. La izquierda muestra gravedad, promedio con un decimal, probabilidad y prioridad, seguidas de los tres criterios. Una sola tabla técnica contiene seis filas de datos y una de subtítulo «Criterios de gravedad» con `colspan="2"`. Cada criterio es un `th scope="row"` en `--t-chico` y 700; cada valor es un `td` en 700 con `.kr-alta`, `.kr-media` o `.kr-baja` (3 alta, 2 media, 1 baja). Gravedad incluye el promedio con un decimal; los criterios incluyen número y nivel. Bordes de 1 px `--borde` entre todas las celdas en ambos temas, sin píldoras ni círculos. Sin calificación se indica «Sin calificar» sin color.
- **Detalle derecho**: derecho humano, relación, tipo de impacto, grupos afectados uno por línea y medidas asociadas agrupadas por nombre de componente. Sin medidas: «Sin medidas asociadas».
- **Validación**: al menos un registro muestra «Validado» con `--baja-fondo` / `--baja` y los grupos con su resultado debajo. Sin registros, «Sin validar» con `--sem-gris-fondo` / `--texto-suave`; no usa rojo ni «No». Justificación, contexto, controles, comentarios y propuestas permanecen en «Más información», plegado.

No se cambian tokens, paleta, tipografía, semáforos ni la banda global `.kit-titulo`. Los cálculos siguen a cargo de `KitRiesgos` y su configuración.

## 9. Ventanas y fichas del Kit

E34: `.kit-cerrar` unifica el cierre en los módulos I–IV y en credenciales: «×», 32 × 32 px, fondo transparente, texto suave y posición absoluta arriba a la derecha. Tiene `type="button"` y nombre accesible; hover y foco usan `--suave` / `--texto`, con el contorno global de foco visible.

La ficha IV usa `.kit-ficha` con relleno `--e5` y espacio reservado para el cierre junto al encabezado. Jerarquía: h2 `--t-h2`, 700, interlineado 1.15; h3 de recuadro `--t-micro`, 700, mayúsculas, espaciado .1em y `--oro-texto`; `.kit-ficha-rotulo` en `--t-chico`, 700 y texto suave; cuerpo `--t-cuerpo`, 400 e interlineado 1.6; `.kit-ficha-nota` en `--t-micro` y texto suave. Rótulo y valor se separan con `--e2`; datos y recuadros con `--e3`.

`.kit-caja` usa Sand (`--fondo-alterno`), borde `--borde`, radio chico y relleno `--e4`. `.kit-caja-destacada` usa los tokens verdes `--kit-titulo-fondo` / `--kit-titulo-borde`. `.kit-ficha-rejilla` organiza dos columnas iguales, apiladas por debajo de 760 px. Las calificaciones van en `.kit-mini-tabla` con encabezados de fila; los bordes internos pertenecen a las tablas, sin líneas sueltas entre secciones. Los mismos tokens resuelven ambos temas. El Módulo II conserva su contenido aprobado.


## 10. E35 · Resumen de organizaciones y ficha de materialidad

**Módulo I.** El círculo central muestra el total de organizaciones, con «Organizaciones identificadas» también en el nombre accesible. La ventana centrada presenta ese título sobre fondo `--kit-titulo-fondo`, con total grande a la derecha separado por filete. A la izquierda, tabla de categorías y cantidad de organizaciones, con bordes `--borde`, sin categorías vacías ni recuentos de actores. A la derecha, tres números grandes con el color de su posición, fuera de las cajas compactas Favorables / Neutrales / Desfavorables; debajo queda la nota de organizaciones con cargos de distinta posición. Separador vertical de 2 px dashed `--kit-desplegable-borde`; en celular las columnas se apilan y el separador es horizontal.

**Módulo III.** La ficha reutiliza `.dim-ficha*` del Módulo II: antetítulo ESG dorado con línea, h2 y descripción suave a la izquierda; panel con dos calificaciones apiladas, número grande y nivel a la derecha. El fondo del panel corresponde al nivel de la primera calificación (`sem-fondo-*`). Los rótulos siguen la vista activa. La banda Estado ocupa todo el ancho con fondo Sand; después, fila de estándares sobre `--superficie`, en línea y con viñetas oro. El cuerpo presenta los h3 y tablas por grupo/taller, conservando círculos 0–5 y nota de escala. Cierre `.kit-cerrar` arriba a la derecha; no usa `.kit-caja` ni `.kit-ficha-rejilla`. En celular la cabecera se apila.

La tabla de puntajes de los aspectos usa `--t-micro`, espaciado .04em y sin mayúsculas forzadas. Encabezados y celdas llevan `overflow-wrap: normal`, `word-break: normal` y `hyphens: manual`. El contenedor `.mat-tabla` permite desplazamiento horizontal interno, sin ensanchar la página.


**Resumen de organizaciones del Módulo I** (E36, 28-oct): usa la estructura de la ficha del Módulo II (`dim-ficha`): cabeza con antetítulo, título y nota, y panel «Total» en `--kit-titulo-fondo`; banda Sand «Posición frente al proyecto» con las tres posiciones en una fila (viñeta de color: favorable `--principal`, neutral `--kit-desplegable-borde`, desfavorable `--alta`); tabla `dim-ficha-tabla` Categoría | Organizaciones, sin categorías en cero.

## 5. Estructura común (5-nov-2026)

- Barra superior solo con el logo de Meleia y un **menú hamburguesa** (`#kit-menu`) que despliega Credenciales y los cuatro módulos.
- Cada módulo tiene las pestañas **Metodología, Alimentación y Resultados**, en ese orden. Abre en Metodología. Alimentación solo aparece para quien puede editar. El contenido de Metodología vive en `config/kit-metodologia.json`.
- Posición de los actores en gráficos: favorable verde hoja `#5E7A45`, neutral dorado `#B78D36`, desfavorable terracota `#A8503A`. Como el verde y la terracota se confunden con daltonismo, cada posición lleva además su forma (círculo, cuadrado, triángulo) y su nombre.
