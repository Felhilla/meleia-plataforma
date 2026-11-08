# Alimentación por secciones: propuesta (E58, 8-nov-2026)

Estado: **decidida el 8-nov-2026. Módulo II construido (E60).** Los Módulos I, III y IV siguen.

## 1. Qué resuelve

Hoy la Alimentación tiene dos caminos y los dos son de una sola sentada:

- **Cuestionario:** el borrador vive solo en el navegador (`localStorage`). Si se cambia de equipo o se borran los datos del navegador, se pierde, y nadie más lo ve.
- **Excel:** todo o nada al cargar.

La propuesta: un formulario **por secciones**, como un formulario de Google, que:
- guarda cada sección en la base;
- se puede retomar otro día, desde otro equipo y por otra persona del equipo de la empresa;
- recibe evidencias (archivos, enlaces y texto);
- tiene un **tablero de avance**.

## 2. Principios

1. **Un solo camino de datos.** El formulario, el Excel y el tablero leen y escriben lo mismo (los esquemas y el contrato de la carga). El Excel pasa a ser otra forma de llenar secciones.
2. **La etiqueta identifica cada pregunta** (`II-E3-C2-P01`). Las respuestas y las evidencias se guardan con su etiqueta, nunca con su posición.
3. **Seguridad desde el diseño.** Los permisos viven en la base (RLS), igual que hoy. Cada guardado queda en el historial. Un archivo solo lo ve quien es miembro de la empresa.
4. **Nada se calcula a medias sin decirlo.** El tablero muestra el avance. Los Resultados se calculan solo con secciones completas, y lo dicen.

## 3. Secciones por módulo

| Módulo | Secciones | Unidad que se llena |
|---|---|---|
| I. Actores | Una por categoría de actor (6), más Organizaciones y Fecha de corte | Cada actor (registro repetible) |
| II. Debida diligencia | 6 etapas y 10 derechos (16). Dentro, un bloque por criterio. Al final, Hallazgos por dimensión | Cada pregunta (159, con etiqueta) |
| III. Materialidad | Temas y aspectos, una sección por grupo de interés que califica, una por área del comité financiero y la validación | Cada aspecto por evaluador |
| IV. Riesgos | Identificación, Calificación técnica, una por cada sesión de validación con grupos y Plan de medidas por componente (6) | Cada riesgo o cada medida |

## 4. Cómo se ve (escritorio)

**Pantalla 1. Tablero de avance** (la portada de la Alimentación, con la banda oscura del Look and Feel):
- Cuatro cifras doradas: avance total (%), secciones completas de N, preguntas sin evidencia y preguntas en blanco (que valdrán 0).
- Una barra o arco por sección, con su estado: sin empezar, en curso, completa o revisada. También quién la tocó por última vez y cuándo.
- Botón "Seguir donde quedé", que abre la primera sección en curso.

**Pantalla 2. Sección** (como un formulario de Google):
- Encabezado con la sección, el criterio y la barra de avance de la sección.
- Cada pregunta muestra su etiqueta, el texto, la escala con Vistazo (la misma de Criterios), Incorporado, Hallazgo, Brecha y **Evidencias**.
- **Evidencias:** adjuntar archivo (PDF, Excel, Word o imagen), pegar enlace o escribir el documento analizado. Cada evidencia queda unida a la etiqueta de su pregunta.
- **Guardado automático** al salir de cada pregunta, con el aviso "Guardado a las 10:42". Botón "Marcar sección como completa", que valida que no falten datos obligatorios.

**Pantalla 3. Revisión** (para Meleia): marca una sección como revisada o la devuelve con un comentario.

## 5. Datos (sin tablas nuevas para las respuestas)

- **Respuestas:** se guardan en las colecciones que ya existen (`ddhh-indicadores`, `actores`, `riesgos-calificacion`…), registro por registro. Así los Resultados no cambian.
- **Avance:** nueva colección `alimentacion-secciones`, un registro por módulo, evaluación y sección, con `{ estado, completas, total, sin_evidencia, actualizado_por, fecha, comentario_revision }`. Usa la tabla `datos` y sus permisos actuales.
- **Evidencias:** nueva colección `evidencias`, `{ etiqueta, tipo: archivo | enlace | texto, nombre, ruta_o_url, tamano }`.
- **Archivos:** bucket privado de Supabase Storage, con la ruta `empresa/modulo/evaluacion/etiqueta/archivo` y políticas RLS por miembro de la empresa. Se descargan con enlaces firmados de corta duración.

## 6. Riesgos que hay que aceptar o resolver

1. **Los archivos no entran al respaldo.** `respaldo.sh` copia la base, no el Storage. En el plan gratuito, un archivo borrado por error no se recupera.
2. **Capacidad del plan gratuito:** 1 GB de archivos en total y 50 MB por archivo (cifras por confirmar en la página de precios de Supabase antes de construir). Un cliente con muchos PDF lo llena rápido.
3. **Documentos confidenciales del cliente** quedan en la nube de Meleia. Eso exige decirlo en el acuerdo con el cliente y definir cuándo se borran.
4. **Dos personas en la misma sección:** gana el último guardado. El historial permite ver y recuperar lo anterior. Bloquear la sección mientras alguien la edita es más seguro, pero más lento de construir.

## 7. Decisiones de Felipe (8-nov-2026)

1. **Archivos:** solo enlaces a la nube del cliente. Si el cliente borra o mueve el archivo, es su responsabilidad. No hay Storage de Meleia, así que los riesgos 1 a 3 de la sección 6 no aplican.
2. **Cierre de secciones:** la empresa las cierra sola. La auditoría de Meleia es un servicio aparte. La idea es que la empresa gestione la plataforma sin depender de Meleia.
3. **Resultados:** se calculan al completar las 16 secciones. Mientras tanto, la pestaña Resultados muestra una animación y el letrero "En proceso".
4. **Asignar secciones a personas:** no entra en la primera versión.

## 8. Lo construido en el Módulo II (E60)

- `public/kit-vista-alimentacion-ddhh.js` envuelve la Alimentación del Módulo II. El Excel y el cuestionario de una sola sentada quedan en "Otras formas de cargar".
- Colecciones nuevas en la tabla `datos` (mismos permisos e historial): `ddhh-borrador` (una respuesta por pregunta, con su etiqueta como id, y los hallazgos por dimensión) y `ddhh-avance` (la evaluación en proceso, con su ciclo, y el estado de cada sección).
- Cada evaluación nueva abre un ciclo. Lo que no se toca en el ciclo parte de la última evaluación publicada.
- Al calcular se usa `KitEstudios.prepararDdhh`, el mismo camino del Excel y del cuestionario.

## 9. Lo que sigue

1. Módulos IV, I y III con el mismo motor de secciones (sus secciones están en la tabla de la sección 3).
2. El Excel llena secciones con la misma validación.
