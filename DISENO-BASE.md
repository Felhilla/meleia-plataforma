# Diseño base del Kit · GH Estudio × Meleia

**Fuente de verdad del diseño.** Documenta lo que existe hoy en el código (27-oct-2026). No propone cambios. Prevalece sobre cualquier skill de diseño; cambiar la paleta, las tipografías, los semáforos o la banda de encabezado requiere aprobación explícita de Felipe.

Archivos donde vive cada cosa: `public/estilos.css` (tokens y base), `public/estilos-kit.css` (armazón del Kit, Home), `public/estilos-kit-actores.css` (Módulo I), `public/estilos-kit-ddhh.css` (Módulo II), `public/estilos-kit-materialidad.css` (Módulo III), `public/estilos-kit-riesgos.css` (Módulo IV). Las reglas de relato y gráficos están en `docs/sistema-diseno.md`.

## 1. Paleta Meleia (`estilos.css`)

| Nombre | Token | Claro | Oscuro | Uso |
|---|---|---|---|---|
| Forest | `--forest`, `--principal` | `#2F5548` | `--principal: #B8D6C6` | Marca, cifras, enlaces |
| Forest fuerte | `--principal-fuerte` | `#1F3D33` | `#DCE7DE` | Énfasis |
| Ivory | `--ivory`, `--fondo` | `#F8F6F1` | `--fondo: #0F1D17` | Fondo de página |
| Sand | `--sand`, `--fondo-alterno` | `#EFEAE1` | `#142620` | Bandas alternas |
| Blanco | `--superficie` | `#FFFFFF` | `#182C24` | Tarjetas, ventanas |
| Sage | `--sage`, `--suave` | `#DCE7DE` | `--suave: #24392F` | Superficies suaves |
| Blue | `--blue`, `--secundario` | `#DCE7EB` | — | Superficies suaves |
| Gold (dorado) | `--gold`, `--oro`, `--acento` | `#C9B789` | `#C9B789` | Acento; nunca texto pequeño |
| Dorado texto | `--oro-texto` | `#6B5A2E` | `#D8C9A0` | Dorado legible como texto |
| Terra | `--terra` | `#D9A58F` | — | Reservado |
| Texto | `--texto` | `#1F332B` | `#F1EEE6` | Texto principal |
| Texto suave | `--texto-suave` | `#55665D` | `#B9C7BD` | Texto secundario |
| Línea | `--linea` | `#77877D` | `#8DA397` | Filetes, ejes |
| Borde | `--borde` / `--borde-fuerte` | `#E3DDD0` / `#C4BDAF` | `#2C4338` / `#4A6357` | Bordes |

Niveles alto, medio y bajo (prioridad, posición desfavorable, errores):

| Token | Claro (texto / fondo) | Oscuro (texto / fondo) |
|---|---|---|
| `--alta` / `--alta-fondo` | `#8A3F2B` / `#F5E4DC` | `#EDB9A3` / `#3E2A22` |
| `--media` / `--media-fondo` | `#7A5A12` / `#F1E9D2` | `#E3CD8F` / `#352F1E` |
| `--baja` / `--baja-fondo` | `#2F5548` / `#DCE7DE` | `#B8D6C6` / `#24392F` |

Tokens del armazón del Kit (`estilos-kit.css`, E23):

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--kit-titulo-fondo` / `--kit-titulo-borde` | `#DCE7DE` / `#2F5548` | `#24392F` / `#B8D6C6` | Banda de encabezado, botones «Credenciales» y «Caso», verde de los cuadros |
| `--kit-desplegable-fondo` / `--kit-desplegable-borde` | `#F8E6D3` / `#D27F2F` | `#2E2419` / `#C98A4B` | Paneles naranjas (credenciales, lista de casos), naranja de los cuadros |
| `--kit-tarjeta-gris` | `#E7E5E0` | `#1E2F28` | Tarjetas de módulo y de organización, franjas grises |

## 2. Tipografía

- Familia única: **Lato** 400 y 700 (Google Fonts), con respaldo `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Escala: `--t-display` clamp(2.6–4.4 rem), `--t-h1` clamp(2–2.9 rem), `--t-h2` clamp(1.5–1.9 rem), `--t-h3` 1.2 rem, `--t-cuerpo` 1.0625 rem (interlineado 1.6), `--t-chico` .875 rem, `--t-micro` .78 rem.
- Títulos en 700, interlineado 1.15, `letter-spacing: -.015em`, `text-wrap: balance`.
- Números con formato `es-CO` (coma decimal).

## 3. Ritmo, radios y sombras

- Espacios: `--e1` 4 · `--e2` 8 · `--e3` 16 · `--e4` 24 · `--e5` 32 · `--e6` 48 · `--e7` 72 · `--e8` 112 px.
- Ancho máximo `--ancho` 1200 px. Radios `--radio` 14 px y `--radio-chico` 8 px.
- Sombras `--sombra` y `--sombra-alta` (tinte Forest en claro, negro en oscuro). Curva `--ease-out` cubic-bezier(.23, 1, .32, 1).

## 4. Banda de encabezado (aprobada, boceto Home)

- `.kit-titulo`: franja con fondo `--kit-titulo-fondo`, borde 1 px `--kit-titulo-borde`, radio 8 px, relleno 24/32 px y 140 px a la derecha para el arco.
- `.kit-titulo-arco`: medio círculo de 104 × 52 px, trazo 2 px `--oro`, sin base, anclado abajo a la derecha (20 px), con un **punto dorado** de 10 px en el centro.
- Se aplica a **todos** los títulos: Home («GH Estudio × Meleia»), cada módulo («Módulo I · Mapeo de actores») y los títulos de paneles y ventanas del Módulo I.
- En celular (≤ 560 px): arco de 72 × 36 px y 96 px de relleno a la derecha.

## 5. Semáforos de calificación

**Paleta de semáforo** (`estilos.css`, sobria, sin neón):

| Color | Sólido | Fondo claro | Fondo oscuro |
|---|---|---|---|
| Rojo | `--sem-rojo` `#B9503A` | `#F6E1DA` | `#43281F` |
| Naranja | `--sem-naranja` `#D27F2F` | `#F8E6D3` | `#45311D` |
| Ámbar | `--sem-ambar` `#DDAE3E` | `#F7EDD2` | `#423719` |
| Amarillo | `--sem-amarillo` `#E6D267` | `#F6F1D3` | `#3D3A1E` |
| Verde | `--sem-verde` `#5A9452` | `#E1EEDD` | `#233A24` |
| Gris | `--sem-gris` `#AEB5AF` | `#ECEEEC` | `#2A322E` |

**Materialidad 0–5** (`config/kit-ddhh-catalogo.json` → `calificacion.materialidad`; se muestra en la metodología del Módulo II): 5 Muy alto **rojo** · 4 Alto **naranja** · 3 Medio **ámbar** · 2 Bajo **amarillo** · 1 Muy bajo **verde** · 0 Nulo **gris**. El Módulo III (resultados publicados) no usa semáforo: barras en `--principal` con la marca del umbral en `--texto`.

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
