# E17 · Módulo IV: riesgos

Implementación sobre E16, según `docs/ficha-modulo-iv.md` v0.2. Las tres vistas se registran después del armazón. No se cargan los motores del Demo A ni datos de empresas ficticias. El mapa, las fichas, el panel de avance y los pilares adaptan su diseño visual con los tokens existentes.

## Archivos y contratos

- `public/config/esquemas/riesgos.json`: catálogo, código, derecho obligatorio, ámbitos y controles.
- `riesgos-calificacion.json`: referencia al riesgo, tres enteros 1–3, probabilidad, impacto, vinculación y justificación.
- `riesgos-grupos.json`: nombre, categoría, participantes y fecha.
- `riesgos-validaciones.json`: riesgo, grupo, resultado, campos opcionales `propuesta_*` y comentario.
- `riesgos-medidas.json`: código, título, componente, referencias múltiples, responsable, fecha y estado.
- `public/config/kit-riesgos-config.json`: criterios, cortes, nueve prioridades, orden de niveles, plazos, tipos de medida, resultados de validación, estado cumplido y componentes.
- `public/kit-riesgos.js`: motor puro UMD/CommonJS, importable en Node, sin DOM ni persistencia.
- `public/kit-vista-riesgos.js`: registro de vistas, lectura por empresa, formularios y diálogos.
- `public/estilos-kit-riesgos.css`: estilos aislados del módulo, tokens claros/oscuros y adaptación móvil.
- `tests/kit-riesgos.test.mjs`, `tests/kit-vista-riesgos.test.mjs`: cálculos y flujos DOM con KitDatos falso.

Los registros siempre incluyen `id`. Riesgos y medidas derivan ese identificador del código en minúsculas; los códigos visibles se normalizan a mayúsculas. Calificación usa el id del riesgo; validación usa `{riesgo}--{grupo}`; grupos usan `g-` más UUID. Los códigos se limitan a 40 caracteres para que el id compuesto quepa en los 80 caracteres admitidos por KitDatos. Los identificadores de registros existentes no son editables. Se rechazan duplicados antes de guardar; la base conserva su clave única. No hay garantía de exclusión entre dos sesiones simultáneas que creen la misma clave: KitDatos usa upsert.

Los valores de listas respetan mayúsculas y tildes: `Alta/Media/Baja`, `Potencial/Manifestado`, `Causa/Contribuye/Directamente vinculada`, `Confirma/Propone ajuste`, `Pendiente/En curso/Cumplida`. `irremediabilidad` sustituye el nombre legado `irreparable`; las ayudas se leen del archivo legado usando ese alias, sin modificarlo. Las propuestas se almacenan en campos planos como `propuesta_alcance`, compatibles con KitValidacion.

## Reglas y decisiones

- La evaluación técnica es siempre la oficial. El ajuste se calcula sobre una copia con solo los campos propuestos no vacíos. Nunca se guarda automáticamente sobre la técnica.
- “% validado” significa porcentaje de riesgos revisados por al menos un grupo, incluso si propuso ajuste. Se explica junto al indicador. Los filtros distinguen pendientes, revisados, con ajustes y todos confirman.
- Los riesgos sin evaluación no se ubican artificialmente en una celda; tienen sección propia y quedan al final de la lista.
- Una medida con varios riesgos usa la prioridad más alta. Si falta alguna calificación, se solicita completarla antes de sugerir plazo. Sin riesgos son 12 meses. Una fecha explícita se conserva.
- La interfaz propone una duración desde la aprobación de la medida; no inventa una fecha histórica de aprobación. El motor también puede calcular una fecha desde una base explícita y ajusta correctamente finales de mes.
- El avance solo cuenta medidas cumplidas; en curso vale cero. Los componentes sin medidas muestran 0 %.
- Los componentes se personalizan por empresa en `componentesPorEmpresa[empresaId]` dentro de la configuración, con objetos `{id,nombre}`. Mantener ids al renombrar evita romper vínculos. No se agregó una sexta colección ni un editor de componentes en la interfaz.
- Los derechos se obtienen en tiempo de ejecución de `public/data/derechos.json`; el esquema incluye la misma lista como referencia local para validación independiente.

## Guía de uso

1. En Alimentación → Riesgos, agrega el código, nombre y derecho; completa contexto y controles cuando estén disponibles.
2. En Calificación técnica, selecciona el riesgo y los criterios. Las definiciones están visibles y la gravedad/prioridad se calculan mientras escribes. Revisa los datos y confirma el guardado.
3. Registra grupos y sesiones, sin nombres personales, una vez incorporado el catálogo aprobado de categorías señalado abajo.
4. En Validaciones, selecciona riesgo y grupo. Al proponer ajuste, completa solo lo que cambia; los valores aparecen junto a la evaluación oficial.
5. En Medidas, registra acciones y vincula los riesgos. Usa área o cargo como responsable.
6. En Medidas de gestión, abre un pilar y luego una acción para editar estado, plazo y responsable. El demostrador solo consulta.
7. Para corregir un registro, usa Editar. Borrar exige confirmación dentro de la página. No se permite borrar riesgos o grupos con referencias; primero retira los vínculos correspondientes.
8. Historial de cambios consulta los 50 cambios más recientes del módulo; no ofrece edición del historial.

Todos los formularios pasan por KitValidacion y muestran errores junto al campo, con nombre de ficha y fila. Tras validar, muestran una vista previa y requieren “Confirmar guardado”. El borrado también tiene su confirmación propia; no se usan alert/confirm del navegador.

## Lecturas y accesibilidad

Matriz lee riesgos, calificación, validaciones y medidas; grupos se solicita al abrir una ficha. Medidas lee riesgos, calificación y medidas. Alimentación lee solo la subpestaña abierta y las referencias necesarias. La validación necesita además la técnica para calcular ajustes. El borrado solicita referencias únicamente cuando se intenta borrar. Historial consulta cada colección del módulo con límite 50 y combina los últimos 50, evitando que cambios de otros módulos oculten los de riesgos. No hay temporizadores, consultas periódicas ni datos de otras empresas.

Cada vista conserva su propio contexto y verifica `params.vigente()` tras las operaciones asíncronas. Recursos públicos de configuración se reutilizan en memoria; no se persisten datos de empresa. Los fallos se muestran y un cierre de sesión solicita actualizar el armazón. RLS continúa siendo responsabilidad de la base.

Los diálogos tienen rol, nombre accesible, fondo inerte, Escape, confinamiento de Tab y retorno de foco. Al navegar se limpian listeners y fondo inerte. Si el control original desapareció al repintar, el foco vuelve al contenedor. Los textos se insertan con App.el/textContent. Matriz con roles de tabla, ejes identificados, prioridad escrita además de color; errores asociados con aria-describedby/aria-invalid. Celdas fluidas, formularios de una columna en móvil y tablas con desbordamiento local.

## Pendientes y diferencias con la ficha

1. **Falta el catálogo aprobado de categorías de actor del Módulo I.** No existe en los archivos disponibles. Se solicitó al usuario; mientras no esté definido, `riesgos-grupos.json` conserva `categoria.valores: []`, la pantalla explica el pendiente y no permite guardar categorías inventadas. Esto impide completar el alta/edición de grupos. Para habilitarla hay que incorporar los valores aprobados en ese esquema y actualizar la prueba que documenta esta ausencia. Las fichas pueden leer grupos y validaciones existentes.
2. El caso 1 de la ficha menciona el derecho al agua, ausente del catálogo de derechos indicado por el encargo. Se conserva el caso matemático y su descripción en pruebas, sin ampliar unilateralmente el catálogo. El doble DOM usa un derecho admitido; no se sembraron registros reales.
3. La sección 6 de la ficha describe Excel. Se siguió el límite explícito de E17: queda el espacio explicado, sin importador. El caso 3 se verifica con campo, ficha y fila en la vista previa manual; la hoja/fila de un archivo Excel corresponde a E19.
4. Componentes por empresa son editables en configuración, no desde un formulario de administración.
5. La prueba de entrada de E16 exigía exactamente cinco scripts y prohibía cualquier texto `vista-`. Se actualizó únicamente esa expectativa para los dos scripts del Kit; sigue rechazando scripts de vistas del Demo A.

## Verificación

`node --test tests/kit-riesgos.test.mjs tests/kit-vista-riesgos.test.mjs`: 19 pruebas. Incluyen los tres casos de la ficha, nueve cruces, bordes, plazos, ajustes, avance, referencias, permisos visibles, id de guardado, foco, borrado e historial.

`npm test`: 153 pruebas, todas en verde. No se modificaron `kit-armazon.js`, `kit-datos.js` ni `kit-validacion.js`.

No se verificaron Supabase real, RLS, auditoría real, respaldo, autenticación remota ni CDN: trabajo sin red. Tampoco se hizo inspección visual en navegador a 390/1280/1440 px, contraste medido ni lector de pantalla; la revisión de CSS es estática y las pruebas DOM no sustituyen esas comprobaciones. No hubo commit ni push.
