# Reglas del repositorio meleia-plataforma

Aplican a cualquier persona o asistente (Claude Code, Codex u otro) que modifique este repositorio.

## Generales
- Nunca datos de clientes en el repo: ni nombres de personas, ni contactos, ni Excel reales. Los archivos de prueba llevan datos inventados.
- Nadie publica directo en `main`: cada cambio llega por pull request y se integra solo con `npm test` en verde. Un push a `main` publica el sitio.
- Los permisos viven en la base (RLS). La interfaz nunca es la barrera de seguridad.

## Regla de la carga por Excel (contrato)

La carga por Excel lee lo mismo que guardan los formularios. Para que los cambios de un lado no rompan el otro:

1. **Una sola fuente de verdad.** Campos, etiquetas, listas de valores y obligatorios salen de `public/config/esquemas/*.json` y de las funciones de los módulos. La carga por Excel **no copia** listas ni reglas en su propio código. Lo único propio es la tabla de columnas `public/config/kit-carga-excel.json`, que dice qué encabezado del Excel corresponde a qué campo.
2. **Un solo camino para preparar y validar.** El formulario y el Excel usan las mismas funciones del contrato. La carga por Excel solo llama a estas funciones y no reimplementa ninguna:
   - `KitActores.validar(registro, cfg, esquema, 'carga')`
   - `KitRiesgos.esquema(...)` / `KitRiesgos.preparar(...)`
   - `KitDatos.guardarVarios(...)`
3. **Archivos del contrato.** Los esquemas, `kit-datos.js`, `kit-validacion.js`, `kit-actores.js`, `kit-riesgos.js`, `config/kit-actores-config.json`, `config/kit-riesgos-config.json` y `data/derechos.json` son el contrato. Si cambias uno de ellos, en el **mismo** pull request debes:
   - actualizar `public/config/kit-carga-excel.json` y las plantillas en `public/plantillas/`;
   - correr `npm test`, incluidas las pruebas de contrato (`tests/kit-contrato.test.mjs` y `tests/kit-carga-excel*.test.mjs`);
   - decirlo en la descripción del pull request («toca el contrato de la carga por Excel»).
4. **Pruebas de contrato.** Unos Excel de muestra con datos inventados (`tests/fixtures/`) se leen en cada `npm test` y deben producir exactamente los registros esperados. Además, una prueba verifica que cada campo de cada esquema tenga su columna en `kit-carga-excel.json` y en la plantilla. Si una prueba de contrato falla, se corrige el cambio o se actualiza el contrato a propósito. Nunca se borra ni se debilita la prueba para que pase.
5. **Dueños.** `kit-carga-excel.js`, su vista y sus pruebas son de quien construye la carga (Sebastián). El resto del repo es de Felipe, Claude y Codex. Quien necesite cambiar un archivo del otro lado lo pide o lo propone en el pull request; no lo edita por su cuenta.
6. **Nada nuevo sale de la red.** La librería de Excel (SheetJS 0.20.3, de cdn.sheetjs.com) va copiada en `public/vendor/xlsx.full.min.js`. Una prueba verifica su huella SHA-256. No se carga desde un CDN ni se cambia de versión sin revisión.

## Diseño
DISENO-BASE.md es la fuente de verdad del diseño y prevalece sobre cualquier skill. Las skills impeccable, data-visualization y dashboard-creator se usan solo para auditar y proponer mejoras de jerarquía de textos y resalte de datos, siempre con los colores, tipografías y componentes de DISENO-BASE.md. Está prohibido cambiar la paleta, las tipografías, los semáforos o la banda de encabezado sin aprobación explícita de Felipe. dashboard-creator se usa solo como referencia de patrones (por ejemplo, tarjetas de indicadores), nunca para generar vistas completas. Para Codex: la skill data-visualization está en `~/.claude/plugins/marketplaces/dataink/skills/data-visualization/SKILL.md`.
