# Metodología: cómo se replica en un módulo (E54)

La pestaña Metodología de los cuatro módulos usa **una sola vista** (`public/kit-vista-metodologia.js`) y **un solo modelo**. El diseño ya está resuelto. Para un módulo nuevo solo se escriben textos y un adaptador pequeño.

## Reglas de diseño que la vista ya cumple (no hay que reimplementarlas)

- **Lógica Muñeca Rusa:** el resumen se ve de una vez y cada cifra abre una ventana. Dentro de una ventana se abren otras. La X regresa un nivel, en el orden en que se abrieron.
- **Regreso rápido:** un clic en el fondo difuminado cierra todas las ventanas y vuelve a la vista central del módulo.
- **Laberinto inteligente:** cada pieza lleva a algo que ya existe. Los entregables llevan a Resultados, la cifra de un enfoque lleva a Proceso y la pastilla Criterios lleva a Criterios.
- **Texto a todo el ancho:** cuando un bloque de texto no comparte su fila con otro elemento, ocupa todo el ancho.
- **Paleta, tipografías y banda:** no se cambian sin aprobación de Felipe (AGENTS.md).

## Las dos fuentes de cada módulo

1. **Texto:** el bloque del módulo en `public/config/kit-metodologia.json`. Lleva el título, la descripción, las fichas de los estándares, los pasos del proceso, los enfoques y los textos de los criterios.
2. **Parámetros:** la configuración real del módulo (escalas, cortes, matrices, plazos) y los esquemas de su Alimentación (`config/esquemas/*.json`). Se declaran en `FUENTES`.

**Regla de oro:** ninguna cifra se escribe a mano en el texto. Si el módulo cambia una escala o un corte, la Metodología cambia sola.

## Bloque de texto (`kit-metodologia.json`)

```
estado, romano, nombre, afirmacion, resumen, cuando
estandares: { titular, intro, fichas: [{ id, sigla, nombre, emisor, anio, tipo, color, enlace, enlace_texto, que_es, por_que, portada?, cruces: [{ con, texto }] }] }
proceso:    { rotulo, sub, ante, titular, intro, nav, centro: [antetitulo, frase], pasos: [paso] }
paso:       { id, icono, titulo, oficial, ref: { texto, ficha }, pide, pideRotulo?, buscamos?,
              documentos: [{ documento, esg: A|S|G, fuente }], respaldo: [{ texto, ficha }],
              campos: [{ esquema, ids, grupo? }], preguntasRotulo, preguntasUnidad, preguntasIntro }
enfoques:   { titular, intro, items: [{ titulo, pregunta, entregables }] }
criterios:  { ante, titular, intro, preguntas: { campo: texto }, reglas: [{ titulo, texto }] }
```

- **`campos`:** dice qué campos del esquema se registran o se califican en ese paso. Una prueba comprueba que cada campo exista en su esquema. Así la Metodología no promete algo que la Alimentación no recoge.
- **`documentos`:** son los documentos que los estándares piden, mencionan o recomiendan. Cada uno lleva su dimensión ESG (A ambiental, S social, G gobernanza, que incluye lo económico) y su `fuente`. Cuando un documento no sale de un estándar, la fuente es "Práctica de Meleia". Nunca se atribuye a un estándar algo que el estándar no dice.
- **`icono`:** un nombre del mapa `ICONOS`. Si hace falta uno nuevo, se dibuja con trazo de 24 × 24.
- **Enlaces:** solo oficiales y comprobados.
- **Protocolo de redacción:** sin punto y coma, sin comillas angulares y sin punto medio. La prueba lo revisa.

## Adaptador

Se escribe una función `datosX(parametros, esquemas, m)` que devuelve `{ fichas, partes, enfoques, criterios, tiles }`. Sirven de modelo `datosActores`, `datosMaterialidad` y `datosRiesgos`. Cada una completa los pasos con `pasosDe(m, esquemas, niveles, extras)` y calcula con los parámetros las cifras de los enfoques, los criterios y las 4 cifras doradas del primer vistazo. Después hay que registrarla en `datos()` y declarar sus archivos en `FUENTES`.

## Antes del pull request

- `npm test` en verde. La prueba E54 recorre las ventanas de cada módulo.
- Revisar en el navegador: el primer vistazo, cada paso y su ficha, "¿Qué preguntamos?", Enfoques y Criterios, con tema claro y oscuro y a 390 px de ancho.
- Ningún dato de cliente en el repo.

## Ventana Criterios de calificación (E55, boceto 261108_Home_Criterios)

Ya está en el Módulo II y es la base para los otros tres. El adaptador devuelve `calificar` y la vista pinta:

1. **Enfoque:** la pastilla cambia entre los enfoques del módulo. Debajo va una breve explicación de la metodología.
2. **Temas:** un botón con ícono por cada tema del enfoque, en carrusel. Cada uno lleva a lo que se califica en ese tema (laberinto inteligente).
3. **Una escala para todos:** un color por nivel (tokens `--nivel-*`). Al pasar el cursor, con el foco o con un toque se abre un **Vistazo** con la descripción del nivel para la variable.
4. **Variable:** qué es, qué no es y qué evalúa.
5. **Lo que se llena:** grupos de datos con su Vistazo (sus nombres salen de `kit-carga-excel.json`) y Alimentación, cuyo Vistazo tiene las reglas de llenado.

Para replicarla: escribir `criterios.enfoques` en el bloque del módulo y devolver `calificar` desde el adaptador. Los nombres y las descripciones de los niveles se adaptan a las variables de cada módulo y salen de sus parámetros, nunca del texto.

## Reglas de contenido (8-nov)

- **Verificar siempre el instrumento original** (la hoja principal, no las hojas resumen) antes de escribir o corregir nombres.
- **Una sola palabra por concepto:** la que más unifica con lo que ya existe. En el Módulo II se dice "criterio" (el instrumento dice "Criterios mínimos").
- **Etiqueta de cada pregunta:** vive en el catálogo (`indicadores[].etiqueta`), con el formato módulo, etapa (E) o derecho (D), criterio (C) y número de pregunta dentro de la etapa o el derecho (P). Por ejemplo, `II-E3-C2-P11`. La muestran la Metodología, la plantilla de Excel (columna Etiqueta, informativa), el cuestionario y los Resultados. Al replicar en otro módulo, se agrega la etiqueta en su catálogo con el mismo formato.

## Pendiente

- **Criterios en los Módulos I, III y IV:** siguen con la ventana provisional hasta replicar la del Módulo II.
- **Módulo II:** es el único con cruce de estándares por sector. Su adaptador es `datosDdhh`.
