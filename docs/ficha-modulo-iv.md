Kit Comercial Meleia · Ficha de especificación
# Módulo IV · Identificación, calificación y gestión de riesgos
Versión 0.2 · 22 de octubre de 2026 · Incorpora las decisiones de Felipe sobre la v0.1. Base para los encargos de desarrollo.
| Qué cambió frente a la v0.1 La calificación es técnica (la hace el responsable del cliente) y los grupos de interés la validan. Ya no hay consolidación entre grupos. Solo riesgos de derechos humanos: el derecho afectado es obligatorio. La prioridad sale del cruce simétrico gravedad × probabilidad (tabla 4.3). Todo lo captura un único responsable por cliente, sin intervención de GH. |
|---|


## 1. Para qué sirve el módulo
Permite que una empresa califique sus riesgos de derechos humanos, los valide con sus grupos de interés, los priorice en una matriz y haga seguimiento a las medidas de gestión que responden a cada uno. El responsable del cliente alimenta todo; GH entrega la herramienta y solo vuelve para soporte técnico.
| Pestaña | Qué muestra | Base existente |
|---|---|---|
| Matriz de riesgos | Los riesgos ubicados por gravedad y probabilidad, la lista priorizada y la ficha de cada riesgo con su calificación técnica y la validación de cada grupo. | Demo A, capítulo 04 · Riesgos identificados |
| Medidas de gestión | El plan de acción: avance general, componentes (pilares) y ficha de cada acción, vinculada a los riesgos que atiende. | Demo A, capítulo 06 · Plan de acción |
| Alimentación | Carga y edición de riesgos, calificaciones, validaciones y medidas, por ficha manual o por plantilla Excel. | Nueva (patrón común a los 4 módulos) |


## 2. Decisiones tomadas
| # | Decisión | Consecuencia en el diseño |
|---|---|---|
| D1 | Calificación técnica + validación de los grupos | Una sola calificación oficial por riesgo. Cada grupo confirma o propone un ajuste con comentario. Cambia el criterio 5 del plan. |
| D2 | No aplica | Sin consolidación entre grupos. |
| D3 | Cruce gravedad × probabilidad, versión simétrica | Tabla de 9 celdas en 4.3, configurable. |
| D4 | Solo DDHH | Derecho humano afectado obligatorio. Los riesgos ambientales o sociales de los informes se redactan como impactos sobre un derecho (ej.: riesgo hídrico → derecho al agua). |
| D5 | Captura un único responsable del cliente | Rol «responsable del cliente» con escritura sobre su empresa. GH solo soporte. Requiere guía de uso. |
| D6 | Riesgos de Libero y Santa Ana sistematizados desde sus informes | GH redacta y califica técnicamente; la sección de validación queda lista y vacía, para que el cliente la alimente. |


## 3. Datos de entrada
Todo registro pertenece a una empresa. Una empresa nunca ve los datos de otra. Los campos marcados con * son obligatorios.

### 3.1 Riesgo (catálogo de la empresa)
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Código * | Texto corto | R-01, R-02… Único dentro de la empresa. |
| Nombre * | Texto | Redactado con verbo («Afectación de…», «Exceso de…»). |
| Descripción | Texto largo | Qué pasa, dónde y por qué. |
| Derecho humano afectado * | Lista | Misma lista del Demo A. |
| Ámbito | Lista múltiple | Operación propia, cadena de suministro, cadena de distribución, comunidades del área de influencia. |
| Localización | Texto | Área, municipio o frente de trabajo. |
| Actividades que lo generan | Texto largo |  |
| Medidas de control existentes | Texto largo | Lo que la empresa ya hace. |
| Análisis de controles | Texto largo | Brechas de los controles existentes. |


### 3.2 Calificación técnica (una por riesgo)
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Riesgo * | Referencia | Código del riesgo. |
| Escala * | Entero 1–3 | Ver tabla 4.1. |
| Alcance * | Entero 1–3 | Ver tabla 4.1. |
| Irremediabilidad * | Entero 1–3 | Ver tabla 4.1. |
| Probabilidad * | Lista | Alta, Media, Baja. |
| Tipo de impacto * | Lista | Potencial o manifestado. |
| Vinculación * | Lista | Causa, Contribuye, Directamente vinculada. Define el tipo de medida (4.5). |
| Justificación | Texto largo | Por qué se calificó así. |


### 3.3 Grupo validador
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Nombre del grupo * | Texto | Ej.: «Junta de Acción Comunal vereda X». |
| Categoría de actor * | Lista | Las mismas categorías del Módulo I, para cruzar los dos módulos. |
| Número de participantes | Entero | Sin nombres ni datos personales. |
| Fecha de la sesión * | Fecha |  |


### 3.4 Validación (una por grupo y por riesgo)
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Riesgo * | Referencia |  |
| Grupo * | Referencia |  |
| Resultado * | Lista | Confirma · Propone ajuste. |
| Valores propuestos | Igual que 3.2 | Solo si propone ajuste: los criterios que el grupo cambiaría. |
| Comentario del grupo | Texto | Lo que el grupo dijo. Da vida a la ficha del riesgo. |


### 3.5 Medida de gestión
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Código * | Texto corto | A-01, A-02… |
| Título * | Texto |  |
| Descripción | Texto largo |  |
| Componente * | Lista | Los 6 componentes del Demo A, editables por empresa. |
| Riesgos que atiende | Lista múltiple | Códigos de riesgo. |
| Responsable | Texto | Área o cargo, nunca nombre de persona. |
| Plazo | Fecha | Si se deja vacío, se propone según la prioridad (4.4). |
| Estado * | Lista | Pendiente, En curso, Cumplida. |


## 4. Reglas de cálculo
Las reglas viven en archivos de configuración, no en el código.

### 4.1 Criterios de gravedad (escala 1–3, del Demo A)
| Criterio | 3 | 2 | 1 |
|---|---|---|---|
| Escala | Causará muerte o efectos adversos en la salud que puedan llevar a una reducción significativa en la calidad de vida y/o duración de esta. | Infracción tangible a un derecho humano de acceso a necesidades básicas; impacto cultural, económico, natural o social a bienes identificados como altamente valiosos; impacto a servicios ecosistémicos prioritarios para la vida, la salud, la seguridad o la cultura. | Todos los otros impactos. |
| Alcance | Más del 20 % de la población del área de impacto o más del 50 % de un grupo identificable. | Más del 10 % de la población del área de impacto o entre 11 y 50 % de un grupo identificable. | Más del 5 % de la población del área de impacto o más del 10 % de un grupo identificable. |
| Irremediabilidad | Difícil: requerimientos técnicos complejos, poca aceptación de la remediación, baja capacidad del socio implementador, sin reemplazo viable de la pérdida. | Moderado: requerimientos técnicos más sencillos, aceptación de los grupos; el socio puede cumplir si se construyen capacidades. | Fácil: requerimientos técnicos simples, aceptación de los grupos; el socio puede cumplir con la reparación. |


### 4.2 Gravedad
- Gravedad = promedio de escala, alcance e irremediabilidad (de 1 a 3).
- Nivel: Baja si es menor que 1,5 · Media si es menor que 2,5 · Alta desde 2,5.

### 4.3 Prioridad: cruce simétrico gravedad × probabilidad
| Gravedad \ Probabilidad | Alta | Media | Baja |
|---|---|---|---|
| Alta | Alta | Alta | Media |
| Media | Alta | Media | Baja |
| Baja | Media | Baja | Baja |

Regla en una frase: si ningún eje está en Baja, manda el más alto; si uno está en Baja, la prioridad baja un nivel desde el otro.

### 4.4 Validación y plazos
- Calificación oficial: siempre la técnica. Si un grupo propone un ajuste, la ficha lo muestra al lado; el responsable decide si cambia la calificación técnica (y el cambio queda en el historial).
- Indicador de validación por riesgo: grupos que confirman ÷ grupos que lo revisaron (ej.: «2 de 3 grupos confirman»). Sin validaciones: «pendiente de validación».
- Plazo propuesto de una medida (si no tiene fecha): prioridad Alta, 6 meses; Media, 12; Baja, 18; medidas sin riesgo vinculado, 12. Tomado del Demo A.

### 4.5 Tipo de medida según la vinculación (Principios Rectores, del Demo A)
| Vinculación | Si el impacto es potencial | Si el impacto ya se manifestó |
|---|---|---|
| Causa | Cesar y/o poner fin · Prevenir y/o mitigar | Reparar |
| Contribuye | Cesar y/o poner fin · Prevenir y/o mitigar · Ejercicio de influencia | Reparar · Colaborar en reparar |
| Directamente vinculada | Ejercicio de influencia | Ejercicio de influencia |


### 4.6 Avance del plan
- Avance = medidas cumplidas ÷ total de medidas, por componente y en total. «En curso» no suma avance.

## 5. Resultados por pestaña

### 5.1 Matriz de riesgos
- Mapa de calor 3 × 3 (probabilidad en el eje horizontal, gravedad en el vertical), coloreado por prioridad, con los códigos de los riesgos en cada celda.
- Lista priorizada con filtros por derecho afectado, ámbito, prioridad y estado de validación.
- Ficha del riesgo: descripción, calificación técnica con su justificación, validación de cada grupo con sus comentarios y ajustes propuestos, y las medidas que lo atienden.
- Resumen: riesgos por prioridad, porcentaje validado y riesgos sin ninguna medida.

### 5.2 Medidas de gestión
- Se reutiliza el capítulo 06 del Demo A: panel de avance, pilares (componentes), ficha de pilar y ficha de acción editable.
- Nuevo: cada acción muestra los riesgos que atiende y su prioridad; cada riesgo sin medida aparece como alerta.

## 6. Alimentación
- Ficha manual: un formulario por tipo de registro, con las definiciones de las escalas a la vista. Solo deja guardar valores admitidos.
- Plantilla Excel: cinco hojas (Riesgos, Calificación técnica, Grupos, Validaciones, Medidas) con las columnas de la sección 3 y listas desplegables. Se lee en el navegador.
- Vista previa antes de guardar, con errores por hoja y fila («Calificación técnica, fila 12: Alcance = 4, se esperaba 1 a 3»). Nada se guarda hasta confirmar.
- Mismo resultado por las dos vías (criterio 2 del plan).

## 7. Seguridad y control de cambios
- Inicio de sesión obligatorio; no hay vista pública ni caso ficticio.
- Permisos en la base de datos, no en la pantalla. Roles: responsable del cliente (lee y alimenta solo su empresa), demostrador (Germán: lee las empresas de la muestra comercial, no edita) y administrador GH (soporte técnico).
- Rastro de cambios: cada creación, edición o borrado queda registrada con quién, cuándo y el valor anterior. El historial no se puede editar desde la plataforma.
- Sin datos personales de participantes: solo el nombre del grupo y el número de personas.
- Respaldo automático cada hora mientras Supabase esté en el plan gratuito.
- Verificación del criterio 8: lectura sin sesión y con la cuenta de otra empresa; ambas deben fallar.

## 8. Casos de prueba (ficticios)
Caso 1 · R-01 · Afectación del derecho al agua por disminución del caudal de fuentes usadas por la comunidad.
| Escala | Alcance | Irremed. | Gravedad | Probabilidad | Prioridad | Plazo propuesto |
|---|---|---|---|---|---|---|
| 3 | 2 | 2 | 2,33 → Media | Alta | Alta (Media × Alta) | 6 meses |

| Grupo validador | Resultado | Propuesta | Efecto |
|---|---|---|---|
| G1 · Acueducto veredal | Confirma | — |  |
| G2 · Productores agrícolas | Propone ajuste | Alcance 3 → gravedad 2,67 (Alta) | Se muestra al lado; la oficial no cambia sola. |
| G3 · Comerciantes | Confirma | — |  |

Esperado: prioridad Alta; indicador «2 de 3 grupos confirman»; la propuesta de G2 visible en la ficha.
Caso 2 · R-02 · Escala 1, alcance 1, irremediabilidad 2 → gravedad 1,33 (Baja); probabilidad Media → prioridad Baja (Baja × Media); plazo propuesto 18 meses; sin validaciones → «pendiente de validación».
Caso 3 · error: una calificación con alcance 4 se rechaza en la vista previa con su hoja y fila.

## 9. Fuentes
- Plan v3 Kit Comercial Meleia (19-oct-2026) y sección 11 (decisiones del 22-oct).
- Ficha Módulo IV v0.1 con las respuestas de Felipe (Planeación/Versiones previas fichas).
- Demo A, repositorio meleia-plataforma: criticidad-config.json, riesgos.js, plan-config.json.
- Granola: reuniones del 8-oct y 17-oct.
