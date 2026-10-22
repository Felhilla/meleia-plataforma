# E19 · Portada comercial y mapa de actores

La portada `#/` presenta GH Studio × Meleia, una introducción neutral, Credenciales («Próximamente») y cuatro módulos. No selecciona empresa ni consulta colecciones. El catálogo se lee una vez de `public/config/kit-modulos.json`; no hay consultas periódicas ni persistencia de datos de empresa.

## Casos y permisos

Los casos de cada módulo se obtienen de las empresas visibles de KitDatos. Una muestra comercial debe estar incluida en `casos`; un cliente real (`muestra_comercial: false`) aparece en todos los módulos. La configuración no concede acceso a empresas. Sin casos, tarjeta, navegación y pantalla del módulo lo indican explícitamente.

La cabecera conserva logos, rol más alto (Soporte GH, Responsable, Demostración), Salir y tema. La navegación es Portada · I · II · III · IV. El selector segmentado vive dentro del módulo, bajo el título; con un caso se muestra únicamente su nombre. Cambiar de caso conserva la pestaña si está permitida; de lo contrario abre la pestaña inicial. Alimentación depende de `KitDatos.puedeEditar` para esa empresa, tanto en los enlaces como al resolver la URL. RLS sigue siendo la autoridad del acceso a datos.

Las rutas son `#/{modulo}/{empresa}[/{pestaña}]`. Sin empresa se abre el primer caso visible, en el orden de KitDatos. Las rutas antiguas `#/e/{empresa}/{modulo}/…` se normalizan con `replaceState`; las desconocidas regresan a `#/`. Sin sesión se muestra Ingresar. Se elimina la preferencia global de empresa. El contrato de vistas conserva `empresa`, `rol`, `sub`, `puedeEditar` y `vigente()`; limpieza y cancelación lógica de vistas se mantienen.

## Módulo I

Orden de lectura: título y caso del armazón, pestañas, cuatro cifras compactas, Mapa 360°, leyenda, distribución plegable y lista con filtros. Las cifras son actores visibles, involucramiento estratégico, desfavorables y alertas. Los filtros de categoría, orden, posición y solo alertas están sobre la lista; subgrupo y ordenamiento se ubican entre esa barra y la tabla. Todos los filtros afectan también el mapa, las cifras y la distribución.

El mapa conserva la cuadrícula 2×2, influencia alta arriba e impacto alto a la derecha, con ejes rotulados una sola vez. Los cuadrantes tienen altura fija y desplazamiento interno; el estratégico tiene mayor intensidad y un filete dorado. Cada ficha compacta muestra institución con elipsis, punto de posición y alerta cuando corresponde. El nombre accesible y el tooltip incluyen institución completa, cargo, posición y alerta. Al abrirla se mantienen los detalles y la marca de ajuste, ausente del mapa. No se modifican cálculos ni edición.

La distribución por categoría y posición usa barras finas, cantidades y porcentajes en «Ver distribución». Los cuadrantes también conservan sus porcentajes. Los estilos usan tokens claros/oscuros; a 390 px se mantiene el mapa 2×2 y los controles pasan a dos columnas. La tabla permite desplazamiento horizontal local.

## Verificación

Las pruebas locales del armazón y la vista cubren rutas, casos comerciales y clientes reales, permisos por empresa, rol superior, estados vacíos, selector único/múltiple, seguridad de texto, renders obsoletos, orden visual del DOM, filtros compartidos, ficha y 180 actores sin truncar registros.

No se verificaron autenticación, Supabase, RLS, auditoría ni recursos remotos. El intento de navegador local sin red terminó al arrancar Chrome (salida 134); no se obtuvieron capturas ni una comprobación visual real a 390, 1280 o 1440 px. La revisión responsive y de temas es estática, sin medición de contraste ni lector de pantalla. El resultado final de la suite y cualquier excepción de anonimización quedan registrados en `privado/informe-E19.md`.
