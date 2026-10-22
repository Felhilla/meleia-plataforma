# E16 · Armazón del Kit Comercial

El sitio carga el Kit con acceso por correo y contraseña, empresas autorizadas, rol efectivo, portada y cuatro módulos. Se conserva la identidad E11 y sus tokens en ambos temas. `index.html` carga el SDK UMD de Supabase 2.45.4 antes de los scripts propios; los valores de `config.js` permanecen intactos.

`app.js`, `api-supabase.js`, las vistas, los motores anteriores y `public/data/` se conservan como material reutilizable, pero ninguno se carga desde el Kit. No hay lectura de `caso.json` ni respaldo local. Las pruebas históricas que cargan esos componentes directamente siguen siendo pruebas del legado, no del sitio activo.

## KitDatos

En navegador: `KitDatos.crear(clienteSupabase)`. En Node: `import KitDatos from '../public/kit-datos.js'`. La instancia se expone a las vistas como `App.datos`.

- `iniciarSesion(correo, clave)` devuelve el usuario. `cerrarSesion()` cierra la sesión local mediante el SDK y limpia la caché. `usuarioActual()` devuelve el usuario de la sesión del SDK o `null`.
- `empresas()` devuelve `{id,nombre,muestra_comercial,rol}[]`. Consulta empresas y las membresías del usuario; administrador tiene prioridad. No usa la marca comercial para otorgar permisos.
- `puedeEditar(empresa)` es síncrono, después de cargar empresas; devuelve verdadero para responsable/admin. Solo orienta controles. La base aplica RLS.
- `listar(empresa, coleccion)` devuelve los objetos `data`, ordenados por el id de la tabla. Páginas de 1000 evitan truncar colecciones grandes. Caché y lecturas concurrentes se separan por empresa/colección; las respuestas son copias defensivas.
- `guardar(empresa, coleccion, id, data)` exige objeto, id válido e idéntico a `data.id`; devuelve copia del registro. `guardarVarios(empresa, coleccion, registros)` valida todos antes de enviar y escribe lotes de hasta 200. No existe transacción entre lotes: un fallo posterior puede dejar lotes previos guardados. Ambos invalidan la colección; también ante fallo parcial.
- `borrar(empresa, coleccion, id)` elimina por las tres claves e invalida. No escribe el historial: lo hace el disparador de la base.
- `historial(empresa, {coleccion, registroId, limite = 50})` devuelve cambios recientes, ordenados por `n` descendente. Filtros opcionales; límite entero entre 1 y 1000.
- `observarSesion(fn)` notifica cierre de sesión y devuelve función para desuscribirse. La caché y roles se limpian al cambiar identidad; el armazón vuelve a Ingresar al cierre.

Los errores son `Error` en español; incluyen `codigo`, `cause` y `sesionCerrada`. 401/JWT inválido lleva a ingreso; 403/42501 informa falta de permiso; fallos de transporte informan falta de conexión. Nunca se sustituyen por archivos locales. El tamaño se comprueba en UTF-8 antes de enviar; la restricción exacta sobre la representación JSONB pertenece a la base.

No hay consultas periódicas, precarga de módulos ni recarga automática. La portada solicita únicamente `portada` de la empresa elegida. La sesión persistente usa el SDK con `autoRefreshToken: false` y `detectSessionInUrl: false`; una sesión caducada que la base rechace requiere ingresar de nuevo. El botón Reintentar es una acción explícita del usuario.

## KitValidacion

`KitValidacion.validar(registro, esquema, referencias = {})` devuelve `{ok, registro, errores: [{campo,mensaje}]}`. No muta la entrada. `esquema.campos` es un objeto de reglas por nombre; se conservan campos no declarados. `public/config/esquemas/ejemplo.json` documenta todos los tipos y solo sirve para pruebas.

Reglas comunes: `tipo`, `etiqueta`, `obligatorio`, `obligatorioSi: {campo,valor}` (igualdad estricta contra la entrada). Vacíos opcionales se conservan. Texto se recorta y acepta `max`; entero/decimal aceptan números o texto decimal y límites `min/max`; fecha exige fecha real AAAA-MM-DD. Lista exige `valores` y opcionalmente `multiple: true`. Referencia declara `coleccion` y recibe `referencias[coleccion] = new Set(ids)`; no hace consultas.

Nivel usa `escala: 3|5` (o `max`), etiquetas predeterminadas Bajo/Medio/Alto o Muy bajo/Bajo/Medio/Alto/Muy alto. `etiquetas` puede ser arreglo en orden ascendente u objeto de número a texto. Acepta números y texto numérico; ignora tildes, mayúsculas, espacios exteriores y género de bajo/medio/alto. Siempre normaliza a número. Los errores muestran valor recibido y expectativa. Los esquemas son configuración de confianza del módulo; no se descargan ni se inventan esquemas definitivos en E16.

## Enchufar una vista

Registrar un script propio diferido después de `kit-armazon.js` en `index.html`. El arranque espera a DOMContentLoaded.

```js
App.registrarVista('riesgos/matriz', {
  async render(contenedor, datos, params) {
    const registros = await datos.listar(params.empresa, 'riesgos');
    if (!params.vigente()) return;
    contenedor.append(App.el('p', `${registros.length} riesgos`));
    // Devolver opcionalmente una función que retire listeners/paneles propios.
    return () => {};
  }
});
```

Claves: `actores/mapa`, `actores/alimentacion`, `ddhh`, `materialidad`, `riesgos/matriz`, `riesgos/medidas`, `riesgos/alimentacion`. Las rutas base de actores/riesgos abren mapa/matriz. `params` contiene `empresa` (id), `rol`, `sub`, `puedeEditar` y `vigente()`. El armazón dibuja h1 y pestañas; la vista empieza debajo. `App.el` usa textContent. Evitar innerHTML para datos. Después de una escritura explícita se puede llamar `App.actualizarVista()`; la colección escrita ya estará invalidada.

La navegación cancela lógicamente renders antiguos y ejecuta limpieza; las vistas asíncronas deben comprobar `vigente()` antes de actuar fuera de su contenedor. Alimentación se oculta y su URL se devuelve a portada para demostradores; esto no reemplaza RLS.

Empresa y tema se recuerdan con localStorage protegido. Una empresa recordada solo se usa si está en la lista autorizada. No se guardan datos de módulos en almacenamiento persistente. El SDK gestiona su propia sesión.

## Pruebas y cambios de pruebas anteriores

`node --test` mediante `npm test`, íntegramente local con clientes y DOM falsos. Las nuevas suites cubren datos/roles/caché/lotes/errores/paginación/carreras, todos los tipos del validador, rutas, ingreso, soporte, selector, salida, mensajes y registro de vistas.

Se retiraron únicamente dos expectativas duplicadas del orden de scripts del Demo A: en `tests/relato.test.mjs` y `tests/vista-riesgos.test.mjs`. Su reemplazo en `tests/kit-armazon.test.mjs` exige el SDK fijo, el nuevo orden, título y ausencia de scripts del relato. Ninguna prueba de cálculos, geometría, datos o vistas reutilizables se retiró. `recorrido-e10` e `identidad-e11` continúan probando los archivos preservados.

## Pendientes

E17 implementará riesgos; E18, actores. DDHH y materialidad permanecen en construcción hasta fase 3. Faltan esquemas reales y vistas de edición. No se verificó Supabase real, RLS, autenticación real, carga del CDN o de Lato: no hubo acceso a red. La revisión de CSS es estática (rejilla de dos columnas en escritorio, una en móvil; cabecera flexible y tokens por tema); falta confirmación visual en navegador a 390, 1280 y 1440 px y con lector de pantalla. Los dobles DOM no sustituyen esas verificaciones.
