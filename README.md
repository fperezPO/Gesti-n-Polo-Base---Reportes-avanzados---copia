# Gestión de Personal

Proyecto de gestión de personal desarrollado con HTML, CSS y JavaScript.

## Inicio en Windows

Para abrir la aplicación desde una copia descargada, ejecutá
`Iniciar Polo Oeste.bat` y dejá abierta la ventana del servidor mientras la
utilizás. No abras `index.html` directamente: los navegadores bloquean la carga
de las páginas internas cuando el proyecto se ejecuta mediante `file://`.

## Operativas

Los nombres de las cuatro operativas se encuentran al comienzo de
`assets/js/ui.js`, dentro de la constante `OPERATIVAS`.

La pantalla Personal permite:

- asignar una operativa al registrar un operario;
- reasignar la operativa desde la tabla;
- filtrar el personal por operativa;
- identificar registros anteriores mediante la opción `Sin asignar`.

El filtro de Inicio actualiza los contadores de operarios totales y activos.

## Tareas activas

La opción `Tareas activas` funciona como panel de supervisión. Reúne en un
único cuadro los handhelds activos, pausados y disponibles, junto con dos
indicadores simples de emergencia. La luz de
batería se enciende cuando un dispositivo reporta 20% o menos, mientras que la
luz de alarma antipérdida se activa cuando un equipo acumula 30 minutos sin
movimiento registrado.

El botón `Abrir handheld web` abre una pantalla independiente y adaptada a
móviles. Allí el usuario puede iniciar sesión, indicar el colector, seleccionar
la actividad e iniciar, pausar, reanudar y finalizar el registro. El mismo
catálogo se sincroniza con la aplicación Android. Al cerrar sesión se finaliza
cualquier registro abierto.

La exportación filtrada genera un libro Excel con una hoja de resumen y otra
con cada período activo, incluyendo inicio, fin, duración y segundos. El dato
de batería y la alarma antipérdida quedan reservados para las alertas
operativas y no forman parte del reporte.

El servidor local comparte estos registros con la aplicación Android cuando
la computadora y el handheld están conectados a la misma red. La aplicación
móvil se encuentra en `android/PoloOesteHandheld` e incorpora el envío de
batería, el acelerómetro y la alarma sonora con volumen máximo.

Al iniciar Polo Oeste, la consola muestra dos direcciones: una local para la
computadora y otra identificada como `Dirección para Android`. Esta última es
la que debe configurarse en la aplicación móvil. Windows puede solicitar
permiso para habilitar el acceso desde la red privada.

## Usuarios y permisos

En la primera apertura, el sistema solicita crear el administrador inicial.
Después de iniciar sesión:

- los administradores pueden crear operarios junto con sus cuentas;
- la sección `Usuarios` permite vincular cuentas a operarios anteriores;
- los administradores pueden cambiar roles y activar o desactivar accesos;
- los usuarios normales pueden consultar la información, pero no modificarla;
- la sesión se cierra al cerrar la pestaña o mediante `Cerrar sesión`.

Las contraseñas se derivan con PBKDF2 antes de guardarse. Sin embargo, esta
versión utiliza almacenamiento local del navegador y no reemplaza un sistema
de autenticación con servidor. Para utilizar varios equipos o dispositivos
Android será necesario incorporar una API y una base de datos central.

## Inasistencias

La sección `Inasistencias` permite a los administradores:

- registrar una jornada completa o una ausencia parcial;
- indicar el motivo, el período y observaciones;
- adjuntar certificados en PDF, JPG o PNG de hasta 5 MB;
- consultar totales, documentación pendiente y filtros por operario,
  operativa, motivo y fechas;
- descargar o eliminar los documentos adjuntos.

Los usuarios normales solo pueden consultar sus propios registros y no pueden
modificarlos. Los documentos se guardan en IndexedDB y los datos descriptivos
en el almacenamiento local del mismo navegador. Por tratarse de información
médica sensible, para un uso real en varios dispositivos se recomienda migrar
a un servidor con permisos, respaldo, cifrado y registro de auditoría.

## Gestión de embarques

La sección `Gestión de embarques` permite planificar y seguir la recepción de
carga por operativa. Cada registro incluye referencia, proveedor u origen,
tipo de carga, volumen estimado, llegada confirmada, ingreso al depósito y
finalización de almacenaje. Todas las confirmaciones se registran por día, sin
hora.

El estado se calcula automáticamente según el avance de las fechas:

- `Pendiente de llegada` mientras no se confirmó la fecha real;
- `Llegada confirmada` cuando se conoce el día de recepción;
- `Control / ingreso confirmado` después del ingreso al depósito;
- `Crossdocking confirmado` o `Almacenamiento confirmado` según los hitos;
- `Proceso finalizado` al completar crossdocking y almacenamiento.

El panel muestra embarques activos, llegadas confirmadas, metas vencidas y
procesos finalizados. También permite filtrar por operativa, estado y rango de
llegada confirmada, incluyendo el ciclo de facturación 21–20. Los
administradores pueden crear, editar y eliminar registros; los usuarios
normales tienen acceso de consulta.

Cuando se confirman dos o más contenedores en un mismo día, el inicio operativo
se escalona según el orden de registro: el primero comienza luego de 24 horas,
el segundo luego de 48 horas, el tercero luego de 72 horas y así sucesivamente.
La regla desplaza el inicio del control / ingreso sin modificar sus 48 horas de
duración ni las metas posteriores, que continúan calculándose desde el control.

## Reportes y dashboards

La página `Reportes y dashboards` (en el menú, con el ícono de gráfica
ascendente) une los indicadores del depósito con el mapa de calor. Trabaja con
el Trace de stock WIS y con Gestión de embarques. Pickeos diarios y
Almacenamiento diario ya no se ofrecen. Si había importaciones anteriores de
esos tipos, siguen en el historial, desde donde un administrador puede
eliminarlas.

Una sola selección de operativa y período actualiza toda la página. Se ordena
así:

1. Encabezado con tres botones: `Plantilla`, `Exportar Excel` (indicadores,
   base facturable, tendencia y comparación diaria) e `Importar Excel`.
2. Operativa y período: operativa, mes de referencia, calendario `Período` y
   los accesos `Ciclo 21–20` y `Mes completo`.
3. KPIs principales y flujo del depósito (ver "Indicadores de Reportes y
   dashboards").
4. Unidades por día contra el período anterior, con el valor de cada pico
   (Inicio tiene su propio gráfico diario).
5. Mapa de calor, con `Tarea en el mapa` y `Tipo de ubicación`, que acotan solo
   el plano.
6. Evolución por ciclo 21–20: los 12 ciclos del año, con el año anterior
   detrás.
7. Base facturable por operativa.
8. Historial de importaciones y explicación de cada cálculo.

La página no tiene búsquedas puntuales (producto, ubicación o usuario) ni
detalle fila por fila: esas consultas se hacen en el WMS.

El sistema comprueba el nombre, los encabezados y los datos obligatorios
antes de aceptar una carga, y evita importar dos veces el mismo archivo. Acepta
archivos cuyo nombre contenga `Movimientos` y utiliza exactamente ocho
columnas: `Fecha y hora`, `Nombre de usuario`, `Aplicación`, `Descripción de
aplicación`, `Ubicación`, `Producto`, `Descripción de producto` y `Movimiento`.
Las filas cuyo movimiento sea `0` se omiten por completo: no se guardan ni se
incluyen en indicadores o detalles. Conserva el signo positivo o negativo de
los demás movimientos, admite hasta 250.000 filas y permite descargar una
plantilla vacía. Para archivos filtrados directamente desde WIS también admite los
encabezados equivalentes `Alta`, `Usuario`, `Desc. Aplicación`, `Cód. Prod.` y
`Desc. Prod`.

El filtro `Tarea en el mapa` combina `Aplicación · Descripción de aplicación`,
para evitar confundir descripciones similares. Cada movimiento se clasifica
como incluido, excluido o pendiente. El catálogo de la sección `Actividades`
define si la fila aporta unidades, calor en el mapa o visibilidad en Inicio y
en la comparación diaria de Reportes y dashboards (campo `visibleInicio`).

La sección `Actividades` también contiene el catálogo que utiliza el registro
de horas por actividad. Los administradores pueden crear, modificar,
activar, desactivar o quitar actividades manuales; cada una utiliza un código
único y queda registrada en un historial local. Las aplicaciones detectadas en
las reglas WIS se incorporan automáticamente como elementos protegidos y sus
códigos no pueden duplicarse desde el catálogo manual. El handheld web y la
aplicación Android reciben este catálogo y guardan la actividad seleccionada
en cada registro de Tareas activas.

El historial de actividades manuales muestra la fecha y hora, el usuario, la
acción, el código, la versión y el detalle de los campos modificados. Para las
ediciones compara nombre, código, descripción, operativa y estado, indicando el
valor anterior y el nuevo. También identifica claramente las altas y bajas.

Las reglas predeterminadas incluyen los movimientos negativos de `EXP040` cuya
ubicación comienza por `1MPUE` y los movimientos negativos de `PRD095`. Las
filas `EXP040` de ubicaciones `1FUNC` se conservan como referencia, pero no
aportan unidades, ubicación, visibilidad en Inicio ni comparación diaria. En
`PRD095 · Preparación de picking`, la salida del producto desde su ubicación
aporta unidades y calor; la contrapartida positiva se conserva como
referencia sin duplicar unidades. Los negativos de `INV414`, `INV540` y
`AJUSTE_MANUAL` quedan pendientes mientras se revisan los ajustes de inventario.
Un administrador puede crear reglas por operativa, aplicación, descripción
exacta o comodín, signo y vigencia. Cada cambio incrementa la versión y queda
registrado en el historial local del catálogo.

Las unidades de un movimiento productivo se toman en valor absoluto, sin
duplicar los pares que genera WIS. Para
`PRD095 · Preparación de picking` suma las unidades de la fila negativa y
utiliza esa misma fila en el mapa de calor porque contiene la ubicación física
de origen. Los registros sin una posición válida permanecen en el total, pero
no pueden dibujarse. En las demás aplicaciones conserva el signo productivo
definido por sus reglas y también muestra su valor absoluto en unidades.
El criterio de unidades es común a todas las aplicaciones de Trace WIS:
la intensidad del mapa siempre utiliza `Math.abs(Movimiento)`.

`calcularProductividadTrace` (en `assets/js/tareas-activas.js`) cruza usuario,
aplicación/actividad y fecha-hora del Trace WIS con los períodos de Tareas
activas. Si el primer movimiento ocurre dentro de los primeros 10 minutos se
conserva la hora marcada por el operario; si ocurre después, el tiempo
productivo comienza con ese primer movimiento. Las pausas se calculan como
períodos independientes. Lo usan la tarjeta `Productividad por hora` y el top
de operarios de Inicio.

La plantilla del Trace incluye `Cod. Empresa` y `Empresa`. Al importar, cada
fila toma su operativa (cliente) y su operativa física desde el número de
empresa, según el catálogo de `assets/js/catalogo-empresas.js` (ver
"Operativas y empresas WIS"). Las filas de empresas excluidas o que no están en
el catálogo no se importan, y el mensaje final indica cuántas se descartaron y
de qué empresas. Los registros se guardan en IndexedDB y se analizan por
operativa y período. La importación muestra en el historial su operativa, o
`Varias operativas` si el archivo trae más de una. Cada importación puede
eliminarse completa sin afectar las demás.
Los usuarios normales pueden consultar, descargar la plantilla y exportar,
pero no importar ni eliminar datos.

El período de análisis se elige en un único calendario (`Período`): el primer
clic marca el inicio y el segundo el fin; el mismo día dos veces filtra solo
esa fecha. El mismo selector se usa en Inicio, Inasistencias, Embarques y
Tareas activas (`assets/js/selector-rango-fechas.js`). También incluye un
acceso rápido por mes de facturación que calcula automáticamente el ciclo desde
el día 21 del mes anterior hasta el día 20 del mes seleccionado, y `Mes
completo`, del primer al último día. La página abre en el ciclo vigente y el
modo activo (ciclo, mes o rango libre) se deduce de las fechas elegidas. Los
indicadores, el mapa, la base facturable y la exportación respetan la
selección.

## Mapa de calor

El mapa de calor aparece en `Reportes y dashboards`, debajo de los KPIs, y
utiliza directamente los movimientos del Trace de stock WIS. No es necesario
importar el mismo archivo nuevamente. Toma la operativa y el período de la
selección de la página; `Tarea en el mapa`, `Tipo de ubicación` y los pisos
solo acotan el plano, no los indicadores.

Cada mapa de calor corresponde a una operativa física (un plano) y se elige con
el selector `Mapa`: `Mezzanine`, `E4`, `Integra`, `Vehículos` y `Paraguay`. Por
ahora solo Mezzanine tiene plano. Los demás figuran en el selector y muestran
"Plano pendiente" hasta que se incorpore su maestro de ubicaciones. Forum ya
no tiene mapa de calor, aunque sigue existiendo como operativa de los datos.

El mapa muestra todo movimiento cuya ubicación pertenezca a su plano, y la
operativa de los datos acota el resultado. El filtro arranca en `Todas`, así se
ven juntas las cuentas que comparten el plano (por ejemplo Decathlon,
Teleshopping y las ubicaciones genéricas de Mezzanine). Al elegir Decathlon se
sugiere el mapa Mezzanine, y el usuario puede cambiarlo. Como Mezzanine se
filtra por piso, solo cuentan los movimientos con una ubicación del plano.
Trace de stock WIS también alimenta el mapa de calor. Para evitar duplicar los
pares positivos y negativos, el mapa utiliza exclusivamente las filas cuya
regla habilita `Participa en mapa`. La intensidad representa la cantidad de unidades en valor absoluto
por ubicación, no la cantidad de filas u operaciones.
Las visitas se contabilizan por separado: cada fila con una ubicación válida
suma una visita al módulo, incluso si corresponde a otra altura del mismo
módulo. El detalle de cada casilla presenta unidades y visitas juntas.
Debajo de las herramientas, el mapa resume `Visitas en el plano` (movimientos
con ubicación en los pisos visibles) y `Cobertura` (ubicaciones visibles con
movimiento sobre el total). No suma unidades de tareas distintas, porque
picking, guardado y las dos patas de una transferencia no se pueden sumar
entre sí.

En Mezzanine, `JAULADT10`, `JAULADT20` y `JAULADT30` se reconocen como zonas
especiales de picking y participan tanto en el total de unidades como en el
recuento de visitas y el mapa de calor. Las zonas especiales que no pertenecen
a un módulo físico se muestran en una sola casilla `Fuera del plano`:
`PISOX`, `PISOY`, `PISOZ`, `AVERIAS`, las jaulas DT, los tubos del piso X
(`X04-DER-1` … `X20-DER-13`, agrupados por bloque) y el pasillo `ZESP`. La
casilla solo aparece cuando esas zonas tienen actividad en la selección, y
suma sus unidades y visitas.

Las ubicaciones físicas sin movimientos durante tres meses se identifican en
azul-violeta como candidatas a reubicación. El cálculo toma como referencia la
fecha final seleccionada (o la fecha actual si no se indicó una) y respeta la
operativa, actividad y, en Mezzanine, los filtros de piso y tipo. No utiliza
la fecha inicial, porque cualquier movimiento de la ubicación debe mantenerla
activa.

La marca de inactividad solo se habilita si los datos cargados alcanzan la
fecha límite de tres meses; de lo contrario, la leyenda indica que el historial
es insuficiente. Las zonas especiales como PISO y AVERIAS quedan excluidas.

Las ubicaciones que **nunca tuvieron movimientos** en todo el historial
importado (con los mismos filtros de operativa, actividad, piso y tipo) se
pintan de un violeta más oscuro y la leyenda informa cuántas son (`Nunca
movidas`). Esta marca no necesita tres meses de historial: alcanza con que haya
datos cargados. Así, una posición puede verse de cuatro formas sin actividad:

| Color | Significado |
|---|---|
| Violeta oscuro | Nunca tuvo movimientos en el historial importado |
| Azul-violeta | Su último movimiento fue hace tres meses o más |
| Gris | Se movió hace menos de tres meses, pero no en el período elegido. El detalle muestra la fecha de su último movimiento, o aclara que empezó a moverse después del período |
| Borde punteado | Posición estructural sin ubicación en el maestro |

La vista 3D usa los mismos colores, pero evalúa cada altura por separado: una
altura que nunca se movió se pinta violeta oscuro aunque otra altura del mismo
módulo tenga movimientos, y un bloque gris indica en el detalle la fecha de su
último movimiento. En el plano 2D el color es el del módulo completo, y el
detalle aclara el estado de cada ubicación ("nunca se movió", "sin movimientos
desde…" o "último: …"). El cálculo por altura está en
`obtenerInactividadNivelesMapa` (`mapa-calor.js`).
El color representa la cantidad de movimientos en cada ubicación y la escala se
ajusta por percentil para que los valores extremos no oculten el resto de la
actividad.

En el plano 2D, todas las alturas de un mismo frente se consolidan en su
módulo, y la tabla de datos conserva el código completo importado. En Inicio,
las ubicaciones de la operativa Forum se siguen contando por sus primeros siete
caracteres (`A.A.001.01` y `A.A.001.02` cuentan como `A.A.001`, y las que
empiezan por `B` como `Piso Z`).

El plano de Mezzanine utiliza las exportaciones del maestro WIS
`REG040-2026-10-03_08_07.xlsx` (piso X), `… (1).xlsx` (piso Y) y `… (2).xlsx`
(piso Z). Se excluyen solo las ubicaciones con `Cód. Estado` = 16, que son
las del área `INACTIVO` e incluyen todas las posiciones 5B. Se conservan las de
código 15 y las de código 42 (ubicaciones vacías). En total quedan 28.701 de
las 30.068 ubicaciones del maestro, con 8.243 frentes físicos (X 2.742,
Y 2.719, Z 2.782) y 13 tipos de ubicación (Mezanine, Decathlon por sector,
Teleshopping, tubos, selectivo y pasillo). Si hay movimientos en una ubicación
excluida, igual se muestran en el plano como posición "sin referencia
maestra". La versión compacta utilizada por la web está en
`assets/data/ubicaciones-mezzanine.json`.

El código WIS de Mezzanine se traduce así:

| Parte | Caracteres | Significado |
|---|---|---|
| Piso | 1 | `X` piso cero, `Y` segundo piso, `Z` tercer piso |
| Calle | 2 | `01` a `20` |
| Columna o módulo | 3 | `001`–`080` y `091`–`156`; impares y pares enfrentados |
| Altura | 2 | `10`, `20`, `30`, `40`; en el piso X la altura 40 figura como `5A` (las `5B` tienen estado 16 y se excluyen) |
| Control | 2 | dígitos verificadores, no intervienen en el plano |

Por ejemplo, `Y031202080` es piso Y, calle 03, módulo 120, altura 20, y
`X010015A00` es piso X, calle 01, módulo 001, altura 40. Los códigos
con guiones (`Y20-021-10`) se interpretan igual. Permite filtrar por piso `X`,
`Y` o `Z` y por tipo. El código completo se usa para vincular el movimiento con
su clasificación, mientras que el color del plano 2D se consolida por piso,
calle y módulo.

Internamente cada módulo se identifica como `Y.03.120`, pero en pantalla se
muestran siempre los códigos WIS reales. Al pasar el cursor o seleccionar un
módulo, el tooltip empieza por los códigos de sus ubicaciones y el detalle
lista cada una (por ejemplo, `Y030021020`, `Y030022061` y `Y030023012`) con
su altura, unidades y visitas en la selección; las que no se movieron dicen
"sin movimientos en la selección". La casilla `Fuera del plano` lista solo
las ubicaciones con movimiento, hasta 12 (las de más actividad). En la vista
3D, cada bloque de altura muestra su código WIS en el tooltip y en el
detalle. La comparación de pisos nombra el módulo como `Calle 03 · Módulo
120`. Las tarjetas `Visitas en el plano` y `Cobertura` también tienen el ícono
ⓘ con su cálculo.

Los pisos X, Y y Z utilizan una estructura visual completa y comparable de 20
calles y 2.920 posiciones por piso. Las posiciones que todavía no existen en la
referencia maestra se muestran con borde punteado y no participan en cobertura
ni en el cálculo de inactividad. Los tres pisos comparten exactamente la misma
distribución, incluido el espacio central entre los módulos 080 y 091; solamente
cambia su identificación X, Y o Z.

La barra de visibilidad permite trabajar con un piso, ver los tres o comparar
dos pisos lado a lado con la misma escala de color. También permite colorear
por actividad o visitas, fijar una ubicación con un clic, ampliar o reducir el
plano, ajustarlo al ancho y desplazarse arrastrándolo. La comparación resume
totales, diferencia porcentual, mayor crecimiento y mayor caída entre módulos
equivalentes.

La página de Reportes utiliza un ancho mayor y los módulos del plano se adaptan
al espacio disponible. En pantallas de escritorio esto reduce el desplazamiento
horizontal, especialmente en el mapa de Mezzanine; en pantallas pequeñas se
mantiene el desplazamiento como respaldo para no perder ubicaciones.

Para sumar un mapa nuevo (por ejemplo, otra operativa física) se agrega su
entrada en `CONFIGURACIONES_MAPA_CALOR` dentro de `assets/js/mapa-calor.js`,
junto con la lógica que traduce sus códigos de ubicación. Las importaciones
anteriores a la clasificación por operativa se interpretan como Forum para
mantener compatibilidad.

## Mapa de calor 3D

En Mezzanine, la barra de herramientas del mapa incluye `Visualización`, con
`Plano 2D` y `Vista 3D`. La vista 3D usa exactamente los mismos filtros del
plano (operativa, período, tarea, piso y tipo de ubicación) y la misma escala
de colores, pero no consolida las alturas: cada
ubicación se dibuja en su piso, calle, módulo y altura según la tabla anterior.

- `Racks por altura` dibuja un bloque por cada altura registrada en la
  referencia maestra, coloreado según su propia actividad o visitas. En el
  piso X, las ubicaciones `5A` se dibujan en la altura 40. Una altura
  irregular cargada en el WIS (por ejemplo, 19) se suma al bloque de la
  altura más cercana.
- `Barras por módulo` dibuja una barra por módulo; su alto y color indican la
  suma de las alturas visibles.
- `Alturas visibles` permite mostrar u ocultar cada nivel para ver el interior
  de los racks. Este filtro solo afecta la vista 3D.
- `Calle` aísla una calle y ensancha el pasillo para ver ambos frentes.
- `Cámara` ofrece vista `Aérea`, `Isométrica` y `Lateral`. Con el mouse se
  rota arrastrando, se desplaza con clic derecho o Shift y se acerca con la
  rueda. Un clic fija la ubicación y Esc la libera.
- `Disposición` ubica los módulos impares y pares enfrentados a ambos lados
  de la calle, o bien en columnas iguales al plano 2D.
- Con `Todos`, los pisos X, Y y Z se apilan y `Separación entre pisos` permite
  separarlos. Con `Comparar`, los dos pisos se muestran lado a lado.

La escala usa el percentil 95 de los bloques visibles, por lo que se calcula
por altura en `Racks` y por módulo en `Barras`. Las zonas fuera del plano
(averías, pisos, tubos, jaulas DT y códigos sin posición en la grilla) se
informan debajo del lienzo y su detalle sigue en el plano 2D. La librería Three.js se incluye en `assets/vendor` y se carga
solo al abrir la vista 3D, por lo que no requiere conexión a internet. Si el
equipo no admite WebGL, se informa en el panel y el plano 2D sigue disponible.

## Visibilidad por clasificación de usuario

La navegación combina la clasificación del Personal vinculado con el rol de
seguridad de la cuenta. Los Operarios no pueden abrir Horas, Actividades,
Inasistencias ni Reportes y dashboards (que incluye información comercial);
esas opciones tampoco aparecen en su menú. Administrativos y
Supervisores mantienen acceso a las secciones operativas. La administración de
Usuarios continúa reservada exclusivamente a cuentas con rol Administrador.
Las restricciones se validan también al intentar abrir una página directamente.

Operarios, Horas, Inasistencias y Directorio están inhabilitadas para todos los
usuarios (`PAGINAS_INHABILITADAS` en `assets/js/auth.js`): no aparecen en el
menú, no se pueden abrir, Inicio no muestra las tarjetas de horas e
inasistencias y la exportación completa no incluye las hojas Personal e
Inasistencias. Los datos guardados se conservan, y los operarios se siguen
usando para la clasificación de cada cuenta, la importación de usuarios y
Tareas activas. Usuarios queda como opción propia del menú. Para volver a
habilitar una sección, basta con quitarla de ese conjunto.

## Resumen operativo en Inicio

La pantalla `Inicio` consulta el Trace WIS guardado en `Reportes y dashboards`
y permite elegir tarea, operativa y período. El calendario de `Período` admite
consultas de uno o varios días, semanas o cualquier rango personalizado. El
acceso `Ciclo 21–20` calcula desde el día 21 del mes anterior hasta el día 20
del mes de referencia, mientras que `Mes completo` selecciona automáticamente
desde el primer hasta el último día del mes.

Inicio utiliza un único selector de operativa. Este filtro actualiza el gráfico
y también los indicadores de horas, inasistencias y embarques activos (mientras
Horas e Inasistencias estén inhabilitadas, solo se ven los embarques). Las
tarjetas de cantidad de operarios y operarios activos no forman parte de este
resumen; esa información continúa disponible en la sección `Personal`.

El gráfico diario muestra Cantidad de unidades y conserva como referencia el
período anterior; la distribución lateral suma unidades por tarea. Los
indicadores muestran unidades, usuarios, visitas por ubicación y productividad.
Debajo se incorpora un top de hasta diez operarios, ordenable por unidades o
visitas y ligado a los mismos filtros, con horas productivas y unidades por hora.
`Profundizar en Reportes` abre `Reportes y dashboards` con la misma operativa
y período (ciclo, mes completo o rango); la tarea elegida pasa a `Tarea en el
mapa`.

## Cómo se calcula cada indicador

Cada indicador, gráfico y columna calculada muestra un ícono ⓘ: en la esquina
superior derecha de las tarjetas, o junto al título en encabezados de tabla,
leyendas, gráficos y bloques con controles propios. Al pasar el cursor,
enfocarlo con el teclado o tocarlo aparece un globo con la fórmula en una línea
(por ejemplo, `Visitas por ubicación = cantidad de movimientos del mapa con una
ubicación válida`) y, si hace falta, una aclaración breve. En los KPIs de
`Reportes y dashboards` el globo suma la cuenta hecha con los números del
período y el valor del período anterior (ver "Indicadores de Reportes y
dashboards"). Los textos están en `assets/js/explicaciones-calculo.js` y deben
coincidir con el cálculo real.

## Indicadores de Reportes y dashboards

Los KPIs de `Reportes y dashboards` usan la operativa y el período de la
página. Cada indicador se compara con el período anterior equivalente: el
ciclo anterior, el mes anterior o un rango de igual duración inmediatamente
antes. Si el período está en curso, la comparación usa solo la misma cantidad
de días del período anterior. Las fuentes son el Trace WIS, evaluado con las
mismas reglas que el mapa, y Gestión de embarques. Cada número se verificó
contra un recálculo independiente desde las filas del Trace y los embarques.

| Indicador | Cálculo | Meta |
|---|---|---|
| Pickeos totales | Líneas de picking (PRD095 −) y sus unidades | — |
| Embarques recibidos | Llegada confirmada en el período, con contenedores y bultos | — |
| SLA embarques | Embarques dentro de los tiempos del depósito: control / ingreso en 48 h y crossdocking o almacenamiento (los que se hicieron) dentro de su meta, con las reglas de Gestión de embarques. No mira motivos de diferencia ni daños. Se divide por los embarques ya evaluables; los que siguen dentro del plazo quedan "en curso". La tarjeta indica si los fuera de meta fallaron en el control o en crossdocking / almacenamiento | 95 % |
| Fill rate | Unidades expedidas (EXP040 a 1MPUE) ÷ unidades pickeadas. Es una aproximación hasta importar lo pedido | 98 % |
| IRA · ajustes de inventario | 1 − ubicaciones con ajuste (INV414, INV540, ajuste manual) ÷ ubicaciones con movimiento. Un conteo sin diferencia no deja fila en el Trace | 97 % |
| Productividad de picking | Unidades pickeadas ÷ horas de picking (unidades/h). Las horas de cada operario y día van del primer al último pickeo, más 5 min. Con una operativa elegida, las horas de cada operario se reparten según sus líneas de esa operativa | — |
| Dock to stock | Horas promedio de llegada a almacenamiento (o crossdocking) | — |
| Posiciones usadas | Ubicaciones distintas con movimiento, sin los muelles 1MREC ni 1MPUE | — |
| Ajuste neto de inventario | Suma con signo de los ajustes (INV414, INV540, ajuste manual y otras tareas de inventario o ajuste). La tarjeta trae el recuento por signo: unidades positivas y negativas, con cuántos ajustes hubo de cada tipo y una barra con su proporción. En el Excel van como dos filas aparte | — |

La tarjeta de cada indicador con meta es verde si la cumple. Pasa a ámbar
hasta 3 puntos por debajo de la meta y a rojo por debajo de eso.

Cada tarjeta tiene el ícono ⓘ arriba a la derecha, igual que el resto de la
web. Su globo muestra la fórmula (`Productividad de picking = unidades
pickeadas ÷ horas de picking`), la cuenta hecha con los números del período
(por ejemplo, `12.214 unidades ÷ 463,1 h = 26,4 unidades/h`), una nota cuando
hace falta y el valor del período anterior. Se abre al pasar el cursor o al
tocarlo, y se cierra con Esc o al tocar fuera. Cada KPI define su texto en la
propiedad `calculo` de `KPIS_PRINCIPALES_DASHBOARDS` y
`KPIS_OPERACION_DASHBOARDS`; las tarjetas del mapa lo toman de
`obtenerCalculoResumenMapaCalor` (`mapa-calor.js`).

La comparación diaria suma por día las unidades de las reglas marcadas en
`Actividades` (por defecto recepción, almacenamiento, picking y expedición) y
las dibuja contra el período anterior completo, alineadas por día del período.
En un período en curso no se dibujan los días que faltan, y el total se compara
con los mismos días del anterior. Un pico es un día que supera a todos sus
vecinos en 2 días a cada lado (en rangos largos el radio crece); cada pico
muestra su valor arriba del punto o, si se superpone con otro número, al
costado o abajo.

La gráfica `Evolución por ciclo 21–20` muestra, para el indicador elegido, los
12 ciclos (enero a diciembre) del año que contiene el fin del período. Cada
ciclo del año va en verde (el del período, más oscuro) y, detrás, el mismo
ciclo del año anterior en gris translúcido y difuminado, el mismo lenguaje que
el período anterior de la comparación diaria. Los ciclos que todavía no
empezaron muestran solo el año anterior. Debajo de cada mes va la variación
contra el año anterior: en % para cantidades y en puntos (pp) para los
indicadores en %. El ciclo en curso dice "en curso" en lugar de una variación,
porque está incompleto. Para los indicadores que se suman (pickeos, unidades,
embarques) el texto de arriba compara el total de los ciclos cerrados con los
mismos ciclos del año anterior. La tabla "Base
facturable por operativa" suma lo que normalmente se cobra a cada cliente:
embarques, contenedores, bultos, unidades recibidas, pickeadas y expedidas,
líneas de picking, posiciones usadas y fill rate. Las unidades almacenadas no
se muestran aparte porque repiten las recibidas: el guardado se cobra por
posición. `Exportar Excel` descarga cuatro hojas: indicadores, base facturable,
tendencia (los 12 ciclos del año y, debajo, los del año anterior, con una
columna `Año`) y comparación diaria. Las metas se definen en
`METAS_DASHBOARDS`, en `assets/js/dashboards.js`.

## Hoja de ruta logística

Los puntos pendientes de conciliación, base central, capacidad, planificación,
calidad, embarques, Power BI y Android/PWA quedan conservados en
`ROADMAP_LOGISTICO.md` para desarrollarlos por etapas.

## Datos de demostración del Trace (Mezzanine)

Para tener un visual de cómo se ve la operación con mucho volumen,
`assets/js/datos-demo-trace-mezzanine.js` agrega datos sintéticos del Trace WIS
como **una importación por mes**: "DEMO · Movimientos WIS Mezzanine AAAA-MM
(sintético).xlsx". No son movimientos reales. Son unas 650.000 filas del
21/12/2024 a octubre de 2026: 2025 completo sirve para comparar cada ciclo,
filtro y mapa de calor con el año anterior. La primera vez que se inicia sesión
tardan unos 3 minutos en guardarse (si había una versión anterior de la demo,
primero se borra y el total ronda los 4 a 5 minutos), y Reportes muestra el
avance mes a mes. Después, Reportes tarda unos 20 a 30 segundos en cargar y
usa cerca de 800 MB de memoria del navegador. Cada mes se puede eliminar desde
el historial, y lo eliminado no vuelve a aparecer. Para recrear todo, ejecutá
`regenerarTraceDemoMezzanine()` en la consola del navegador. Si el navegador
tenía una versión anterior de la demo (solo 2026, o 2025 sin el ajuste de
dotación), se reemplaza sola.

- Período: del 21/12/2024 (inicio del ciclo 21–20 de enero de 2025) hasta el
  día anterior a la carga, como máximo octubre de 2026. Lunes a viernes en dos
  turnos (06–14 y 14–22) y sábados de 06 a 12. No hay movimientos los domingos
  ni los feriados no laborables (1/1, 1/5, 18/7, 25/8 y 25/12). En Reyes,
  Carnaval, Semana de Turismo, el 18/5 y el 19/6 trabaja media dotación (con
  las fechas de cada año). Cada mes tiene un factor de estacionalidad: enero es
  el más bajo y marzo, julio y diciembre los picos.
- Crecimiento: hasta 2025 se trabaja con un 10 % menos de dotación, así cada
  ciclo de 2026 queda alrededor de un 10 % arriba del mismo ciclo de 2025 (más
  o menos según dónde caen Carnaval y Turismo). La dotación de cada día sale de
  la parte esperada de cada equipo (rol y turno) con redondeo al azar, para que
  el volumen siga la estacionalidad sin saltos grandes.
- Operarios: los usuarios MZ de la exportación SEG030, sin cuentas RF duplicadas.
  Cada uno tiene un rol (recepción, almacenamiento, picking, transferencia o
  inventario) y un turno fijos.
- Empresas: las de Mezzanine del catálogo. Decathlon usa las ubicaciones "MZ
  Decathlon", Teleshopping el piso Z y el resto se reparte la zona "Mezanine".
  El movimiento se concentra al inicio de los pasillos y en las calles centrales.
  El picking usa alturas bajas y el almacenamiento, altas.
- Aplicaciones que mueven el mapa de calor: almacenamiento (REC510/REC522),
  picking (PRD095), transferencias (TRA110) e inventario (INV414/INV540). También
  hay recepción (REC501) y expedición (EXP040). Todo lo pickeado se expide el
  mismo día en oleadas, y un único operario hace toda la expedición. Así,
  Preparación de picking = Expedición en cualquier rango de días. No se generan
  devoluciones de picking (PRD500), porque romperían esa igualdad.
- Transferencias (TRA110): pueden ser reabastecimientos (de una altura alta a la
  posición de picking del mismo módulo) o reubicaciones (hacia otra zona).
  Generan una fila `−` en el origen y otra `+` en el destino. **TRA110 es un
  código provisorio**: la demo crea, si falta y si entra un administrador, una
  regla para cada signo. En el destino suma unidades operativas y participa del
  mapa; en el origen solo participa del mapa, sin sumar unidades. Si el WIS usa
  otro código para las transferencias, hay que cambiarlo en
  `APLICACION_TRANSFERENCIA` y en esas reglas (Consulta de tareas).

Para que embarques, SLA y dock to stock también se puedan comparar con el año
anterior, `assets/js/datos-demo-embarques-historico.js` agrega unos 250
embarques sintéticos del 21/12/2024 al 31/07/2026 (agosto a octubre de 2026 ya
los traen las otras demos de embarques). Son de las operativas de Mezzanine,
llegan de lunes a viernes (unos 3 por semana, con la misma estacionalidad y un
10 % menos en 2025) y tienen referencias `DEMO-H-AAAA-NNN`. Uno de cada 11
embarques de 2025 y uno de cada 33 de 2026 se demora en una etapa y queda fuera
de meta, con su motivo: el SLA queda cerca del 91 % en 2025 y del 97 % en 2026.
`eliminarEmbarquesDemoHistorico()` los borra.

Las demos de agosto a octubre de 2026 solo traen Forum y Decathlon. Para que esos
meses no queden por debajo de 2025, `assets/js/datos-demo-embarques-recientes.js`
agrega, con el mismo ritmo, los embarques de las otras operativas de Mezzanine
desde el 1/8/2026, y los de todas desde noviembre, hasta 4 semanas después del
día de la carga (como máximo el 31/12/2026). Las etapas posteriores a ese día
quedan sin fecha, así hay embarques en curso y pendientes de llegada. Tienen
referencias `DEMO-R-2026-NNN`; `eliminarEmbarquesDemoRecientes()` los borra.

### Personal e inasistencias de ejemplo (2026)

`assets/js/datos-demo-personal.js` agrega un plantel sintético y sus
inasistencias de 2026, para que Personal, Inasistencias e Inicio tengan datos.
No son personas reales: los legajos son `DEMO-001` a `DEMO-076`.

- Plantel: 76 personas de las operativas de Mezzanine, Integra, Vehículos y
  Paraguay (operarios, supervisores operativos y administrativos operativos),
  más dos técnicos de mantenimiento y un analista administrativo sin operativa.
  Cada una tiene área, turno y operativa física. En 2026 hay 4 altas y 3 bajas,
  que figuran como inactivas. No se crean cuentas de usuario, porque se
  enviarían al servidor local y servirían para entrar a la app Android.
- Inasistencias: del 2/1/2026 hasta el día anterior a la carga (unas 370 a fin
  de octubre), más las licencias, los trámites y las faltas con aviso de las 3
  semanas siguientes. Hay jornadas completas, ausencias parciales al inicio o al
  final del turno y certificados de varios días. Las certificaciones y las
  enfermedades sin certificado suben en invierno, algunas personas faltan sin
  aviso más seguido, supervisores y administrativos faltan menos, y solo el
  personal de depósito tiene accidentes laborales.
- Las certificaciones médicas y los accidentes laborales traen un PDF sintético
  que dice "DATO DE DEMOSTRACIÓN". Parte de las certificaciones de la última
  semana quedan como documentación pendiente.

Se crean una sola vez por navegador. `eliminarPersonalDemo()` los borra (también
los PDF) y no se vuelven a crear; conserva a las personas que tengan una cuenta
vinculada o inasistencias cargadas a mano. `regenerarPersonalDemo()` los arma
de nuevo.

### Horas de ejemplo en Tareas activas

Para ver la productividad por operario de Inicio (`Productividad por hora` y el
top de operarios), `assets/js/datos-demo-tareas-activas.js` agrega registros
sintéticos de Tareas activas. Se arman cuando termina la demo del Trace, a
partir de sus movimientos guardados, y cubren los últimos tres ciclos 21–20
hasta ayer (unos 1.300 registros):

- Cada operario registra como máximo 9 horas por día, la ventana con más
  movimientos. Dentro de esa jornada, cada bloque de trabajo es un registro con
  la aplicación que más usó (por ejemplo, `PRD095 · Preparación de picking`).
  El bloque se corta tras 90 minutos sin movimientos, y una espera de más de 28
  minutos (el descanso del turno) queda como pausa.
- El inicio se marca entre 1 y 14 minutos antes del primer movimiento, así una
  parte queda fuera de los 10 minutos de tolerancia y las horas productivas
  arrancan en el primer movimiento. El cierre se marca entre 2 y 12 minutos
  después del último. Un 4 % de los bloques no se registra.
- El colector es fijo por operario (`HH-01` a `HH-14`). Si el usuario WIS tiene
  cuenta en la web, el registro toma su nombre y su usuario.

Solo aportan productividad en Inicio las tareas que suman unidades visibles allí
según las reglas (picking, almacenamiento, recepción y expedición);
transferencias e inventario tienen horas registradas, pero sin productividad.
Los registros de ejemplo quedan solo en este navegador: `tareas-activas.js` no
los envía al servidor ni los pisa al sincronizar, así no llegan a los handhelds.
`eliminarTareasDemo()` los borra y no se vuelven a crear;
`regenerarTareasDemo()` los arma de nuevo.

## Operativas y empresas WIS

Las operativas por cliente de toda la web (Operarios, Inasistencias,
Embarques, Consulta de tareas, Inicio y Reportes) son las empresas del WIS,
tomadas de la exportación `REG100` (columnas `Código` y `Nombre`) y guardadas
en `assets/js/catalogo-empresas.js`. Cada empresa se opera en una operativa
física, que coincide con los planos del mapa de calor:

| Cod. Empresa | Operativa física |
|---|---|
| 1 | Predio Polo Oeste Uruguay |
| 2 | Predio Paraguay |
| 3 a 99 | Paraguay |
| 1000 y 7000 | Integra |
| 3000 a 3999 | Vehículos |
| 5000 a 5999 | Integra |
| 6000 a 6999 | Mezzanine |

Se excluyen las empresas cuyo nombre contiene `Averias Decathlon`,
`Pallet Forum` o `Forum Pallet`, y por el momento los códigos 532, 1111 y 4000,
que no tienen operativa física definida. Los selectores agrupan las operativas
por operativa física. Elegir una operativa en Reportes sugiere su mapa de calor.
DirecTV y Libre se quitaron: los registros anteriores con esas operativas se
muestran como `Sin asignar`. Si llega un REG100 nuevo, se actualiza
`EMPRESAS_WIS` con el mismo esquema (`codigo`, `nombre` del WIS y `operativa`,
el nombre que se muestra y que guardan los registros).

## Identidad visual

La interfaz utiliza la paleta institucional de Polo Oeste basada en verde,
gris y blanco. La marca compacta se encuentra en
`assets/img/polo-oeste-marca.png` y se usa como favicon y en `handheld.html`.
En `index.html` (pantalla de acceso y cabecera) la marca está redibujada como
SVG en línea con las mismas coordenadas, para que tome los colores del tema:
en modo oscuro la ficha se oscurece y el gris se aclara. Los colores
principales pueden ajustarse desde `assets/css/variables.css`.

Al iniciar sesión se reproduce una intro animada del logo
(`assets/js/intro-logo.js` y `assets/css/intro-logo.css`) que termina
aterrizando sobre el logo de la cabecera; no se muestra al recargar con la
sesión abierta y se saltea con un clic o una tecla. Si el tema se cambia en la
pantalla de acceso, el usuario entra con esa elección y queda guardada como su
preferencia; si no se toca, se aplica la preferencia guardada del usuario.

`assets/css/refinamiento-visual.css` se carga al final y suma movimiento a la
interfaz sin cambiar colores ni marca:

- transiciones suaves en botones, campos, tarjetas y navegación;
- una leve elevación al pasar el cursor y respuesta al presionar;
- foco visible al usar el teclado;
- entrada escalonada de cada página y aparición animada de diálogos,
  mensajes y submenús;
- barras de desplazamiento discretas.

Si el equipo tiene activada la preferencia de movimiento reducido, las
animaciones se desactivan. La distribución propia de Reportes está en
`assets/css/reportes.css`.

La pantalla de acceso incorpora un campo de puntos interactivo desarrollado
en JavaScript y Canvas, ubicado en `assets/js/dotfield.js`. El efecto responde
suavemente al cursor, reduce su densidad en pantallas pequeñas, respeta la
preferencia de movimiento reducido del dispositivo y se detiene mientras la
aplicación principal está visible.

## Exportaciones Excel

Las secciones Inicio, Personal, Usuarios, Gestión de embarques e Inasistencias
permiten descargar
archivos `.xlsx`. La exportación completa de Inicio crea hojas separadas para
el resumen y cada conjunto de datos disponible, sin las secciones
inhabilitadas. Las hojas incluyen encabezados,
filtros, primera fila fija y anchos de columna adaptados al contenido.

Los archivos médicos adjuntos, las contraseñas derivadas y los datos internos
de autenticación no se incorporan a ninguna exportación. Los usuarios normales
solo exportan las inasistencias que pueden consultar en pantalla. La generación
se realiza localmente con JSZip, incluido en `assets/vendor`, por lo que no
requiere conexión a internet.
