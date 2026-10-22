# E18 · Módulo I: mapeo de actores

Implementación según `docs/ficha-modulo-i.md` v0.2, sobre el armazón E16 y los patrones E17. Las vistas `actores/mapa` y `actores/alimentacion` leen únicamente `actores` de la empresa abierta. No hay consultas periódicas, datos de ejemplo persistidos ni almacenamiento local de actores.

## Archivos y contratos

- `public/config/esquemas/actores.json`: campos de entrada; cinco niveles de escala 5, listas y motivos. `dependencia_area` identifica el área institucional y `dependencia` el criterio numérico. No incluye nombre de persona ni contacto.
- `public/config/kit-actores-config.json`: corte 4, nombres y descripciones de niveles, fila/columna y ejes de cada cuadrante, subidas permitidas, escalas, motivos y alerta.
- `public/kit-actores.js`: motor puro UMD/CommonJS. Expone `nivel`, `nivelCalculado`, `permitidos`, `validarAjuste`, `validar`, `nivelFinal`, `alerta` e `indicadores`. Recibe configuración explícita; la validación recibe además esquema y origen (`manual`, predeterminado, o `carga`).
- `public/kit-vista-actores.js` y `public/estilos-kit-actores.css`: vistas, edición, diálogos y estilos aislados con tokens de ambos temas.
- `tests/kit-actores.test.mjs` y `tests/kit-vista-actores.test.mjs`: cálculos y flujos con datos/DOM falsos.
- `public/index.html`: agrega estilo y scripts después del Módulo IV. La única modificación de una prueba anterior es la lista de scripts esperada.

`validar` devuelve `{ok, registro, errores}` y normaliza los cinco criterios con KitValidacion. Usa una lista explícita de campos permitidos porque el validador común conserva propiedades desconocidas. Así, nombre y contacto recibidos como propiedades ajenas no pasan al guardado. Esto no detecta datos personales escritos dentro de textos libres: deben registrarse instituciones y cargos, nunca personas.

Los nuevos identificadores son `act-` más UUID, en minúsculas. Los existentes se conservan al editar. Los ajustes solo suben un paso: periférico a activa/cautelosa, y activa/cautelosa a estratégico. Motivo y explicación son obligatorios. El motivo 5 se admite únicamente con origen `carga`; no aparece en el formulario. Al editar un actor con motivo 5 se pide elegir un motivo manual o retirar el ajuste. Los motivos describen una justificación declarada; no se inventan restricciones adicionales sobre sus criterios. `nivelFinal` ignora ajustes con salto inválido, motivo desconocido o explicación vacía; la validación devuelve los errores antes de guardar.

## Uso e interacción

El mapa muestra conteos y porcentajes por cuadrante, posición y categoría, junto con el número de alertas. Los filtros afectan resumen, cuadrantes y lista; los textos dicen «actores visibles». La lista admite orden ascendente/descendente por institución, cargo, categoría, nivel final o posición. El orden de nivel es alfabético por su nombre.

La cuadrícula conserva influencia alta arriba e impacto alto a la derecha, también en móvil. Cada cuadrante incluye su forma de relacionamiento, ejes, conteo y una región enfocable con desplazamiento interno de altura limitada. No se truncan actores: se prueban 180 botones. Color y posición escrita se complementan; la alerta incluye texto. La marca de ajuste aparece exclusivamente en la ficha del actor, que muestra los valores y definiciones de los cinco criterios.

Alimentación genera los controles desde el esquema. Las definiciones completas están a la vista. Influencia/impacto recalculan el nivel y las opciones del ajuste; un ajuste que deja de estar permitido se retira junto con su motivo y explicación. La validación muestra errores asociados al campo y una vista previa; solo «Confirmar guardado» escribe. Borrar exige una confirmación propia con cancelación. El historial consulta los 50 cambios más recientes de `actores`; la auditoría de valores anteriores/posteriores corresponde al disparador existente de la base, como en E17. Excel tiene un espacio informativo y no carga archivos todavía.

Los diálogos tienen nombre accesible, fondo inerte, Escape, confinamiento de Tab, retorno de foco y limpieza al navegar. Se comprueba vigencia después de operaciones asíncronas. Los controles de escritura comprueban permiso; RLS sigue siendo la autoridad. Las utilidades de diálogo/tabla/contexto del Módulo IV son privadas: se adaptó una copia aislada, sin modificar ni depender de `kit-vista-riesgos.js`.

## Decisiones y límites de las fuentes

1. La ficha 4.1 disponible resume únicamente los extremos 1 y 5. Las definiciones 2–4 son redacción operativa interpolada, pendiente de cotejo con las hojas «Metodología» originales, que no están en este repo. No se presenta como transcripción de esas hojas. Los textos se generalizan a «la empresa y su proyecto».
2. La ficha usa una denominación abreviada de la última categoría; se conserva «Empleados, contratistas y proveedores», solicitada en el encargo y coincidente con el catálogo actual del Módulo IV. No se cambió ese catálogo.
3. La ficha permite categorías editables por empresa. Se pueden definir listas en `categoriasPorEmpresa[empresaId]` en la configuración; si no existen, se usa el catálogo aprobado del esquema. No hay editor de configuración en la interfaz. Una futura carga debe aplicar la misma selección de catálogo por empresa. El corte y las definiciones también son configurables sin cambiar el motor.
4. Se respeta el aplazamiento de Excel del encargo. El motor ya distingue validación manual y de carga; no existe aún la vista previa de importación ni su política de recuperación por fila.
5. El sistema de diseño describe rutas históricas del Demo A; prevalece el contrato activo de E16 para el registro y las rutas por empresa.

## Verificación

`npm test`: 166 pruebas aprobadas, incluidas 13 nuevas. Cubren el caso completo de cinco actores, dos errores esperados, cuatro bordes 3/4, corte configurable, ajustes ascendentes y rechazo de descenso/salto/lateral, motivo 5, normalización, campos ajenos, alerta, indicadores, ubicación en el mapa, ficha, permisos, formulario, vista previa, borrado, historial, filtros, vacío, 180 actores, texto seguro y foco. `git diff --check` sin errores.

No se verificaron apariencia real a 390/1280/1440 px, contraste medido, lector de pantalla, Supabase/RLS/auditoría/respaldo reales, autenticación, CDN o fuentes remotas. CSS revisado estáticamente; los dobles DOM no sustituyen una revisión visual. Trabajo sin red, commit ni push.
