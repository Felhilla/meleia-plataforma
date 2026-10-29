# E38 · Carga por Excel del Módulo III con grupos variables

**Decisión de Felipe (29-oct-2026):** la plataforma calcula la doble materialidad desde las respuestas crudas, y los grupos de interés son variables. **Compromiso con Germán: viernes 6-nov.** Cronograma interno:

| Día | Trabajo |
|---|---|
| Jue 29-oct | Motor `KitMaterialidad.calcular` con sus pruebas (hecho) |
| Mar 3-nov | Lector, plantilla y migración de Precisagro |
| Mié 4-nov | Pantalla con grupos variables; revisión de Felipe |
| Jue 5-nov | Correcciones y publicación |
| Vie 6-nov | Día de reserva |

## 1. Reglas de cálculo (`KitMaterialidad.calcular`, en `public/kit-vista-materialidad-motor.js`)

1. **Blanco = 0.** Una casilla vacía, o una persona que no calificó un aspecto, cuenta como 0.
2. **Participantes y evaluadores** vienen en listas propias: quien no respondió nada también cuenta, con 0.
3. **Importancia de una respuesta:**
   - si viene escrita, se usa esa;
   - si no, en un impacto **positivo** es el promedio de escala y alcance;
   - en un impacto **negativo**, el promedio de escala, alcance e irremediabilidad.

   La irremediabilidad no aplica a un impacto positivo; en los formularios de Precisagro viene vacía en esos casos.
4. **Dos respuestas de la misma persona sobre el mismo aspecto:** cuenta la de mayor importancia, y la probabilidad sale de esa misma respuesta.
5. **Por grupo y entre grupos:**
   - cada grupo promedia a sus participantes;
   - la importancia y la probabilidad del aspecto son el **promedio simple de los grupos**, no de las personas.
6. **Financiera** = (rentabilidad + gasto operativo) / 2. Cada componente es el promedio de los evaluadores del taller.
7. **Umbral de cada eje** = promedio de los aspectos.
   - Material si supera el umbral de impacto o el financiero.
   - Cuadrante: Doble, Impacto, Financiera o No material.

**Validación:** con las respuestas crudas de Precisagro (`privado/recalculo-materialidad/`), el motor reproduce exactamente el recálculo del 28-oct. Se compararon 339 valores (aspectos, grupos, umbrales y cuadrantes) y no hubo ninguna diferencia.

## 2. Plantilla (pendiente, mar 3-nov)

| Hoja | Columnas |
|---|---|
| Instrucciones | Las reglas de la sección 1, con el blanco = 0 destacado. Solo códigos anónimos, nunca nombres. |
| Aspectos | Código, Orden, Nombre, Dimensión ESG, Marco de referencia, Definición, Validado por el comité (Sí/No). Si está validado: Estándar GRI, Descripción, Indicadores. |
| Grupos | Nombre del grupo, Mecanismo de consulta (encuesta, entrevista…) |
| Participantes | Código (anónimo), Grupo |
| Consulta | Participante, Aspecto, Tipo de impacto (Positivo/Negativo), Importancia, Escala, Alcance, Irremediabilidad, Probabilidad |
| Taller financiero | Evaluador (código), Aspecto, Impacto en la rentabilidad, Impacto en el gasto operativo |
| Resumen | Fuente, Escala |

Es todo o nada, como en el Módulo II. Son errores:
- un participante en dos grupos;
- un participante o un aspecto que no existe;
- un valor fuera de 0 a 5;
- la irremediabilidad en un impacto positivo.

## 3. Modelo de datos (pendiente, mar 3-nov; toca el contrato)

- **Nueva colección `materialidad-grupos`:** id, orden, nombre, mecanismo, participantes.
- **Nueva colección `materialidad-calificaciones`:** id `asp-XX--g-YY`, aspecto, grupo, importancia, probabilidad. Reemplaza los campos fijos `col_*`, `cli_*` y `pro_*` de `materialidad-aspectos`.
- **`materialidad-resumen`:** se retiran `participantes_colaboradores`, `_clientes` y `_proveedores`; ahora están en `materialidad-grupos`.
- **Migración de Precisagro:**
  - `respaldo.sh` antes y después;
  - genera los grupos y las calificaciones desde `privado/carga-precisagro-v2`;
  - borra los campos viejos en una sola transacción.
- **La pantalla** (`kit-vista-materialidad.js`): la tabla «Calificación de los grupos de interés» y la lista «Grupos de interés consultados» salen de `materialidad-grupos`, no de una lista fija.
