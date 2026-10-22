Kit Comercial Meleia · Ficha de especificación
# Módulo I · Mapeo de actores
Versión 0.2 · 22 de octubre de 2026 · Incorpora las decisiones de Felipe sobre la v0.1. Base para los encargos de desarrollo.
| Qué cambió frente a la v0.1 El nivel de relacionamiento se calcula con la regla del playbook y admite ajustes justificados (sección 4.3). Se cargan todos los grupos de interés de cada empresa. Se muestran datos reales con el nombre de la empresa, sin nombres de personas ni contactos. El formato de entrada sigue siendo el mismo Excel de mapeo que GH ya entrega (objetivo 2). |
|---|


## 1. Para qué sirve el módulo
Muestra quiénes son los actores de un proyecto, qué tan fuerte es cada uno y cómo conviene relacionarse con ellos. El resultado central es el Mapa 360°: los actores distribuidos en cuatro cuadrantes según su influencia y el impacto que el proyecto tiene sobre ellos, cada cuadrante con su forma de relacionamiento.
| Pestaña | Qué muestra | Base existente |
|---|---|---|
| Mapa 360° | Cuadrantes de influencia × impacto con cada actor ubicado, la lista filtrable y la ficha de cada actor. | Vista de cuadrantes de la herramienta del taller de Olivia (se reutiliza el diseño, no sus criterios) |
| Alimentación | Carga y edición de actores por ficha manual o por el Excel de mapeo de GH. | Nueva (patrón común a los 4 módulos) |


### Metodología: AA1000SES
En la reunión del 8 de octubre, Germán pidió mostrar en Libero «la metodología AMILSES, los criterios que calificamos… de influencia, dependencia y demás». Es la transcripción de AA1000SES (AccountAbility), la metodología del playbook de mapeo de GH y la que usan los mapeos ya entregados a Libero Cobre y Minerales Santa Ana. Con esto se cierra la pendiente 3 del Plan v3.
La herramienta de Olivia usaba otros ejes (impacto × esfuerzo, para priorizar alianzas). Del Módulo I se toma su vista de cuadrantes, pero los ejes y niveles son los de AA1000SES.

## 2. Decisiones tomadas
| # | Decisión | Consecuencia en el diseño |
|---|---|---|
| D1 | Regla fija del playbook + ajuste justificado | Criterios de ajuste en 4.3. La marca «ajustado» va solo en la ficha del actor, no en el mapa. Los niveles de los mapeos entregados que no siguen la regla entran como ajustes (unos 102 de 180 en Santa Ana y 35 de 100 en Libero). |
| D2 | Todos los grupos de interés | Santa Ana: 180 actores calificados; Libero: 100. Germán dirá si algo sobra. |
| D3 | Datos reales con el nombre de la empresa | Germán, como representante legal, asegura los permisos (confirmación por correo pendiente). Nunca nombres de personas ni contactos. Se retira del Demo A todo lo relacionado con «El caso». |


## 3. Datos de entrada
Las columnas son las del Excel de mapeo de GH (playbook, sección 4.1). Los campos marcados con * son obligatorios.
| Campo | Tipo | Valores admitidos / nota |
|---|---|---|
| Categoría * | Lista | Una por hoja del Excel: instituciones gubernamentales, comunidades y asociaciones, academia, empresas y gremios, medios de comunicación, empleados y proveedores. Editable por empresa. |
| Subgrupo | Texto | Ej.: «Comunidad», «Junta de acción comunal». |
| Orden o alcance | Lista | Nacional, regional, local. |
| Institución u organización * | Texto |  |
| Dependencia o área | Texto | Dentro de la institución. |
| Cargo o rol * | Texto | Ej.: «Presidente JAC». Sin nombre de la persona (ver D3). |
| Caracterización | Texto largo | Párrafo natural, sin URLs ni notas de fuente. |
| Posición * | Lista | Favorable, Neutral, Desfavorable. |
| Dependencia * | 1–5 | Muy baja … Muy alta. Definiciones en 4.1. |
| Tensión * | 1–5 | Ídem. |
| Responsabilidad * | 1–5 | Ídem. |
| Influencia * | 1–5 | Ídem. |
| Impacto * | 1–5 | Ídem. |
| Nivel ajustado | Lista | Opcional. Solo un paso hacia arriba del nivel calculado (4.3). |
| Motivo del ajuste | Lista | Obligatorio si hay nivel ajustado. Ver 4.3. |
| Explicación del ajuste | Texto | Obligatoria si hay nivel ajustado. Una o dos frases. |
| Nombre y contacto | Texto | Solo en la versión que se entrega a un cliente, visible solo para su responsable. Nunca en la muestra comercial. |

Lectura del Excel: acepta el texto («Muy Baja», «Medio», «Muy alta», con o sin tilde ni mayúsculas, en masculino o femenino) o el número de 1 a 5. Todo se guarda como número.

## 4. Reglas de cálculo

### 4.1 Escalas (definiciones de los mapeos de GH)
Las definiciones de cada valor (1 a 5) se toman de la hoja «Metodología» de los mapeos de GH y se muestran como ayuda al calificar y en la ficha del actor. Se redactan una vez de forma genérica («la empresa y su proyecto») para que sirvan a cualquier cliente. Resumen:
| Criterio | Qué mide | 1 (Muy baja) | 5 (Muy alta) |
|---|---|---|---|
| Influencia | Capacidad del actor para incidir en el proyecto | Sin recursos ni capacidad para incidir | Recursos y capacidad para movilizar a muchos y llegar a medios |
| Impacto | Cuánto afecta el proyecto al actor | No se vería afectado en nada | Afectado en casi todos los aspectos de su vida e intereses |
| Dependencia | Vínculo operativo, estratégico o social entre las partes | Sin dependencia | Vulnerabilidad mutua; la operación depende del actor o viceversa |
| Tensión | Nivel de conflicto en la relación | Relación estable | Conflicto abierto o acciones que impiden la operación |
| Responsabilidad | Obligación de la empresa frente al actor | Sin relación normativa | Responsabilidad directa y crítica (autoridades, comunidades con impacto directo) |


### 4.2 Nivel de relacionamiento y cuadrante
Nivel calculado con la regla del playbook:
|  | Impacto bajo (1–3) | Impacto alto (4–5) |
|---|---|---|
| Influencia alta (4–5) | Gestión activa · interacción estratégica y monitoreo constante | Involucramiento estratégico · colaboración directa, corresponsabilidad y participación estructurada |
| Influencia baja (1–3) | Seguimiento periférico · comunicación básica y monitoreo | Gestión cautelosa · escucha activa, información continua y medidas de mitigación |

El corte (4) vive en la configuración: cambiarlo no requiere programar.

### 4.3 Ajustes justificados del nivel
Reglas derivadas de los 137 ajustes manuales hechos en los mapeos de Libero y Santa Ana: todos subieron, todos un solo paso y casi siempre con un eje en 3 (Media).
- Solo hacia arriba y un paso: de Seguimiento periférico a Gestión activa o Gestión cautelosa; de cualquiera de estas dos a Involucramiento estratégico. Si un actor parece estar demasiado alto, se corrige su calificación, no su nivel.
- Motivo obligatorio, de esta lista: (1) calificación en el límite: un eje en 3 que se comporta como alto; (2) conflicto: tensión de 4 o más, o posición desfavorable con capacidad de movilizar; (3) obligación legal o contractual directa: responsabilidad de 4 o más; (4) decisión estratégica de la empresa. Solo en la carga de los mapeos ya entregados se usa el motivo (5) «ajuste del mapeo original, criterio experto GH».
- Explicación obligatoria de una o dos frases. El ajuste queda en el historial de cambios.
- Dónde se ve: solo en la ficha del actor («Nivel calculado: Gestión activa · Ajustado a Involucramiento estratégico · Motivo: … »). El mapa muestra el nivel final sin marca.
- Carga por Excel: si el nivel del archivo es un paso arriba del calculado, entra como ajuste con motivo (5); si es más de un paso arriba o es más bajo, la vista previa lo señala y se usa el nivel calculado.

### 4.4 Indicadores del mapa
- Número y porcentaje de actores por cuadrante, por posición y por categoría.
- Alerta de atención: actores con posición desfavorable y tensión de 4 o más. Se marcan en el mapa sin cambiar su cuadrante.

## 5. Resultados

### 5.1 Mapa 360°
- Cuatro cuadrantes (influencia en el eje vertical, impacto en el horizontal). Cada actor aparece como una ficha pequeña dentro del cuadrante de su nivel final (calculado o ajustado), coloreada por posición (favorable, neutral, desfavorable) y con la marca de alerta cuando aplica.
- Filtros: categoría, subgrupo, orden (nacional, regional, local), posición, alerta.
- Ficha del actor al hacer clic: institución, cargo, caracterización, las cinco calificaciones con su definición y el nivel de relacionamiento con lo que implica.
- Resumen arriba del mapa con los indicadores de 4.4.

### 5.2 Conexión con los demás módulos
- Las categorías de actores son las mismas que usa el Módulo IV para identificar a los grupos que validan los riesgos.

## 6. Alimentación
- Ficha manual: formulario por actor con las escalas y sus definiciones a la vista. Solo deja guardar valores admitidos.
- Excel de mapeo de GH: se sube el mismo archivo que GH entrega (una hoja por categoría). La plataforma reconoce las columnas por su nombre, no por su posición, e ignora las hojas «Índice» y «Metodología». Ojo: «Dependencia» aparece dos veces en algunas hojas (el área de la institución y el criterio 1–5); se distinguen por la fila de escala que va debajo del encabezado.
- Vista previa antes de guardar, con los errores por hoja y fila («Com. Aso., fila 14: Influencia = "Alto medio", valor no reconocido»). Las columnas de nombre y contacto se descartan al cargar en la muestra comercial.
- Mismo resultado por las dos vías (criterio 2 del plan).

## 7. Seguridad y control de cambios
- Lo mismo que en el Módulo IV: inicio de sesión obligatorio, permisos en la base de datos por empresa, rastro de cada cambio (quién, cuándo, valor anterior) y respaldo automático cada hora.
- Roles según el modelo de servicio: responsable del cliente (lee y alimenta su empresa), demostrador (Germán: lee la muestra comercial) y administrador GH (solo soporte técnico).
- Sin nombres de personas ni contactos en la muestra comercial (D3).

## 8. Caso de prueba (ficticio)
Cinco actores inventados: uno por cuadrante con la regla del playbook y uno ajustado. Incluye valores escritos de distintas formas, para probar la lectura del Excel.
| Actor (cargo) | Influencia en el Excel | Impacto en el Excel | Posición | Tensión | Nivel esperado | Alerta |
|---|---|---|---|---|---|---|
| Alcaldía municipal (alcalde) | Muy alta → 5 | Alto → 4 | Neutral | 2 | Involucramiento estratégico | No |
| Emisora regional (director) | 4 | Bajo → 2 | Favorable | 1 | Gestión activa | No |
| JAC vereda El Ejemplo (presidente) | Media → 3 | Muy Alto → 5 | Desfavorable | 4 | Gestión cautelosa | Sí |
| Universidad local (decano) | baja → 2 | 1 | Neutral | 1 | Seguimiento periférico | No |
| Gobernación (secretario de minas) | 3 | 1 | Neutral | 2 | Calculado: Seguimiento periférico · Ajustado: Gestión activa, motivo (1) | No |

Esperado: la Gobernación aparece en el cuadrante Gestión activa sin marca; su ficha muestra el nivel calculado, el ajustado y el motivo.
Errores esperados: una fila con Influencia = «Alto medio» se rechaza; un ajuste de Seguimiento periférico a Involucramiento estratégico (dos pasos) se rechaza.

## 9. Lo que este módulo deja para futuros clientes (objetivo 2)
- Un mapeo hecho con el playbook de GH se convierte en herramienta solo con subir el Excel: sin programación por cliente.
- Las definiciones de las escalas quedan escritas una sola vez, de forma genérica.
- La regla del nivel de relacionamiento y sus ajustes quedan escritos (4.2 y 4.3); antes vivían en el criterio de cada equipo. Conviene llevarlos también al playbook de mapeo de GH.

## 10. Fuentes
- Plan v3 Kit Comercial Meleia (19-oct-2026) y su sección 11 (decisiones del 22-oct).
- Ficha Módulo I v0.1 con las respuestas de Felipe (Planeación/Versiones previas fichas).
- Playbook «Metodologia_Mapeo_de_Actores.md» (Docs. GH/Formatos de analisis), secciones 1.6, 4.1 y 4.2.
- Mapeos entregados: EAN/Minerales Santa Ana/Entregables/20260213 Mapeo de actores.xlsx y EAN/Libero Cobre/Revisión/Mapeo de Actores VF.xlsx (hojas de calificación y «Metodología»).
- Granola: reunión del 8-oct («Dashboards y protocolos TSM para minería: ACM, Libero Cobre y Santa Ana»).
- Herramienta del taller de Olivia (Radar360-web): priorizacion-criterios.json, vista de cuadrantes.
