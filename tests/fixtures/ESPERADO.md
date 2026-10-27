# Resultado esperado de los Excel de muestra

Datos inventados. Los genera `scripts/generar-fixtures-excel.py`. Si cambias la estructura, vuelve a correr el script y actualiza esta tabla.

## mapeo-gh-muestra.xlsx (Módulo I)

Hojas ignoradas: «Índice», «Metodología» y «Comp. Ins. Gub» (todas las que empiezan por «Comp.»).

| Hoja, fila | Institución | Resultado esperado |
|---|---|---|
| Com. Aso, fila 14 | JAC vereda El Ejemplo | Se carga. Categoría «Comunidades y asociaciones». Influencia 3, impacto 5 → Gestión cautelosa (igual al archivo, sin ajuste). |
| Com. Aso, fila 15 | Asociación de Productores Ficticios | Se carga. 2/2 → Seguimiento periférico. «baja» en minúscula se lee bien. |
| Com. Aso, fila 16 | Colectivo Sin Nombre | **Error**: «Com. Aso, fila 16: Influencia = "Alto medio", …». No se guarda. |
| Ins. Gub, fila 14 | Alcaldía Municipal de Ejemplo | 5/4 → Involucramiento estratégico. **Sin columna Cargo**: ver la decisión pendiente en la ficha E20. |
| Ins. Gub, fila 15 | Gobernación Ficticia | 3/2 → Seguimiento periférico calculado. El archivo dice «Gestión Activa», un paso arriba: entra como ajuste con el motivo 5 («Ajuste del mapeo original»). |

Nombres y contactos:
- En «Ins. Gub» (servidores públicos), la columna Nombre se guarda en `nombre_servidor`: «Persona Inventada Tres» y «Persona Inventada Cuatro».
- En «Com. Aso», el nombre se descarta y la vista previa muestra el aviso.
- Contacto, Correo y Número no aparecen en ningún registro.

## mapeo-gh-muestra-b.xlsx (Módulo I, estructura de Santa Ana)

En esta variante no hay columna «Cargo» (queda vacío, por decisión del 27-oct). La persona está en la columna «Actor». «Dependencia» aparece dos veces: la primera es el área (`dependencia_area`) y la segunda, con escala debajo, es el criterio de 1 a 5.

| Hoja, fila | Institución | Resultado esperado |
|---|---|---|
| Ins. Gub., fila 14 | Concejo Municipal de Ejemplo | Orden «Local». Área «Concejal - Partido Inventado». `nombre_servidor` = «Persona Inventada Cinco». Influencia 4 e impacto 3 → Gestión activa calculada; el archivo dice Involucramiento estratégico (un paso arriba) → ajuste con el motivo 5. |
| Empleados, Contratistas y prove, fila 11 | Transportes Ficticios S.A.S. | Encabezado en la fila 9. Categoría «Empleados, contratistas y proveedores». Subgrupo «Contratistas». 2/3 → Seguimiento periférico. Nombre descartado, con aviso. |
| Medios de comunicación, fila 14 | Emisora Inventada Estéreo | «Alcance» se guarda en `orden` = «Regional». 3/4 → Gestión cautelosa. Nombre descartado, con aviso. |

## plantilla-iv-muestra.xlsx (Módulo IV)

| Hoja | Resultado esperado |
|---|---|
| Riesgos | R-01 se carga (id `r-01`, dos ámbitos separados por «;»). `r-2` da error de código («Usa un código como R-01.»). |
| Calificación técnica | R-01 da error: faltan «Tipo de impacto» y «Vinculación», que son obligatorios. Escala, alcance e irremediabilidad son válidos. |
| Grupos | Se carga «Mesa comunitaria inventada». |
| Validaciones | Referencia al riesgo por código (R-01) y al grupo por nombre. El lector los convierte en id antes de `KitRiesgos.preparar`. Le falta «Resultado», que es obligatorio: error. |
| Medidas | A-01 se carga, vinculada a `r-01`. Le faltan componente y estado, que son obligatorios: error. |
