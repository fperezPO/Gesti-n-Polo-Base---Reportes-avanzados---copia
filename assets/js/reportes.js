const TIPO_REPORTE_PICKEOS = "pickeos_diarios";
const NOMBRE_REPORTE_PICKEOS = "Pickeos diarios";
const TIPO_REPORTE_ALMACENAMIENTO = "almacenamiento_diario";
const NOMBRE_REPORTE_ALMACENAMIENTO = "Almacenamiento diario";
const TIPO_REPORTE_TRACE_WIS = "trace_stock_wis";
const NOMBRE_REPORTE_TRACE_WIS = "Trace de stock WIS";
const TODAS_OPERACIONES_TRACE_WIS = "Todas";
const SIN_DESCRIPCION_APLICACION = "__sin_descripcion__";
const SEPARADOR_OPERACION_TRACE_WIS = "\u001f";
const FILA_TRACE_WIS_MOVIMIENTO_CERO = Symbol("movimiento-cero-trace-wis");
const FILA_TRACE_WIS_EMPRESA_DESCARTADA = Symbol("empresa-descartada-trace-wis");
const OPERATIVAS_VARIAS_IMPORTACION = "Varias operativas";
const NOMBRE_BASE_REPORTES = "gestion_personal_reportes";
const VERSION_BASE_REPORTES = 2;
const ALMACEN_IMPORTACIONES = "importaciones";
const ALMACEN_FILAS_REPORTES = "filas";
const TAMANO_MAXIMO_REPORTE = 25 * 1024 * 1024;
const MAXIMO_FILAS_REPORTE = 100000;
const OPERATIVA_REPORTE_PREDETERMINADA = "Forum";
const PLANTILLA_PICKEOS =
    "assets/templates/plantilla-pickeos-diarios.xlsx";
const PLANTILLA_ALMACENAMIENTO =
    "assets/templates/plantilla-almacenamiento-diario.xlsx";
const PLANTILLA_TRACE_WIS =
    "assets/templates/plantilla-trace-stock-wis.xlsx?v=20261004-1";
const ENCABEZADOS_PICKEOS = [
    { nombre: "Ubicación", clave: "ubicacion" },
    { nombre: "Producto", clave: "producto" },
    { nombre: "Descripción", clave: "descripcion" },
    { nombre: "Cantidad preparada", clave: "cantidad" },
    { nombre: "Fecha y hora", clave: "fechaHora" },
    { nombre: "Usuario", clave: "usuario", alias: ["Colector"] }
];
const ENCABEZADOS_ALMACENAMIENTO = [
    { nombre: "Ubicación", clave: "ubicacion" },
    { nombre: "Producto", clave: "producto" },
    { nombre: "Descripción", clave: "descripcion" },
    { nombre: "Cantidad almacenada", clave: "cantidad" },
    { nombre: "Fecha y hora", clave: "fechaHora" },
    { nombre: "Usuario", clave: "usuario", alias: ["Colector"] }
];
const ENCABEZADOS_TRACE_WIS = [
    { nombre: "Fecha y hora", clave: "fechaHora", alias: ["Alta"] },
    {
        nombre: "Nombre de usuario",
        clave: "usuario",
        alias: ["Usuario"]
    },
    { nombre: "Aplicación", clave: "aplicacion" },
    {
        nombre: "Descripción de aplicación",
        clave: "descripcionAplicacion",
        alias: ["Desc. Aplicación", "Descripción aplicación"]
    },
    {
        nombre: "Ubicación",
        clave: "ubicacion"
    },
    {
        nombre: "Producto",
        clave: "producto",
        alias: ["Cód. Prod.", "Código de producto"]
    },
    {
        nombre: "Descripción de producto",
        clave: "descripcion",
        alias: ["Desc. Prod", "Desc. Producto", "Descripción"]
    },
    { nombre: "Movimiento", clave: "movimiento" },
    {
        nombre: "Cod. Empresa",
        clave: "codigoEmpresa",
        alias: ["Código de empresa", "Código empresa"]
    },
    { nombre: "Empresa", clave: "empresa" }
];
const CONFIGURACIONES_REPORTES = {
    [TIPO_REPORTE_PICKEOS]: {
        tipo: TIPO_REPORTE_PICKEOS,
        nombre: NOMBRE_REPORTE_PICKEOS,
        plantilla: PLANTILLA_PICKEOS,
        nombrePlantilla: "Plantilla pickeos diarios.xlsx",
        palabrasNombre: ["pickeo", "diari"],
        nombreEsperado: "Pickeos diarios - AAAA-MM-DD.xlsx",
        encabezados: ENCABEZADOS_PICKEOS,
        requiereUbicacion: false,
        encabezadoCantidad: "Cantidad preparada",
        prefijoExportacion: "pickeos-diarios",
        descripcionSelector:
            "Preparación diaria por ubicación, producto y usuario.",
        tituloLineas: "Líneas de pickeo",
        tituloUnidades: "Unidades preparadas",
        tituloConsolidado: "Pickeos consolidados"
    },
    [TIPO_REPORTE_ALMACENAMIENTO]: {
        tipo: TIPO_REPORTE_ALMACENAMIENTO,
        nombre: NOMBRE_REPORTE_ALMACENAMIENTO,
        plantilla: PLANTILLA_ALMACENAMIENTO,
        nombrePlantilla: "Plantilla almacenamiento diario.xlsx",
        palabrasNombre: ["almacenamiento", "diari"],
        nombreEsperado: "Almacenamiento diario - AAAA-MM-DD.xlsx",
        encabezados: ENCABEZADOS_ALMACENAMIENTO,
        requiereUbicacion: true,
        encabezadoCantidad: "Cantidad almacenada",
        prefijoExportacion: "almacenamiento-diario",
        descripcionSelector:
            "Mercadería almacenada por ubicación, producto y usuario.",
        tituloLineas: "Líneas almacenadas",
        tituloUnidades: "Unidades almacenadas",
        tituloConsolidado: "Almacenamiento consolidado"
    },
    [TIPO_REPORTE_TRACE_WIS]: {
        tipo: TIPO_REPORTE_TRACE_WIS,
        nombre: NOMBRE_REPORTE_TRACE_WIS,
        plantilla: PLANTILLA_TRACE_WIS,
        nombrePlantilla: "Plantilla movimientos WIS.xlsx",
        palabrasNombre: ["movimiento"],
        nombreEsperado: "Movimientos WIS - AAAA-MM-DD.xlsx",
        encabezados: ENCABEZADOS_TRACE_WIS,
        requiereUbicacion: true,
        encabezadoCantidad: "Movimiento",
        prefijoExportacion: "trace-stock-wis",
        descripcionSelector:
            "Movimientos WIS clasificados por aplicación y actividad.",
        tituloLineas: "Registros considerados",
        tituloUnidades: "Cantidad de unidades",
        tituloConsolidado: "Trace de stock WIS consolidado",
        mostrarMapa: true,
        resumenValorAbsoluto: true,
        maximoFilas: 250000,
        // Cada fila toma su operativa de "Cod. Empresa" (catalogo-empresas.js).
        operativaPorFila: true,
        etiquetaBusqueda: "Producto, ubicación o aplicación",
        descripcionPeriodo:
            "El rango se aplica al Trace WIS. El mapa utiliza solo los " +
            "movimientos habilitados por el catálogo de reglas."
    }
};

/*
 * La página Reportes trabaja solo con el Trace de stock WIS. Pickeos y
 * Almacenamiento diario se conservan en CONFIGURACIONES_REPORTES para que el
 * historial pueda mostrar y eliminar importaciones anteriores.
 */
const TIPOS_REPORTE_DISPONIBLES = [TIPO_REPORTE_TRACE_WIS];

let importacionesReportesCache = [];
let filasPickeosCache = [];
let filasAlmacenamientoCache = [];
let filasTraceWisCache = [];
// En false, la próxima actualización descarta lo cargado (lo usa la demo).
let filasTraceWisCargadas = false;
let temporizadorMensajeReportes = null;
let tipoReporteActivo = TIPO_REPORTE_TRACE_WIS;
let promesaModuloReglasTraceWis = null;
/*
 * Carga a demanda del Trace WIS: al entrar a la página no se lee ningún
 * movimiento. "Consultar" lee solo las importaciones que tocan la selección
 * (período, período anterior y los meses de inactividad del mapa) y las
 * suma a las que ya estaban en memoria. Se cargan con todas sus operativas:
 * la productividad reparte las horas de cada operario entre las operativas
 * en las que trabajó ese día, así que filtrar al leer cambiaría el KPI.
 */
let importacionesTraceWisCargadas = new Set();
let indiceTraceWisVigente = false;
let seleccionConsultadaReportes = null;
let consultaReportesEnCurso = null;
let operacionPendienteDesdeInicio = "";
// Margen antes de la fecha límite de inactividad para tener historial previo.
const DIAS_MARGEN_INACTIVIDAD_REPORTES = 7;

function asegurarModuloReglasTraceWis() {
    if (typeof globalThis.evaluarMovimientoTraceWis === "function") {
        return Promise.resolve();
    }

    if (promesaModuloReglasTraceWis) {
        return promesaModuloReglasTraceWis;
    }

    promesaModuloReglasTraceWis = new Promise((resolve, reject) => {
        const ruta = "assets/js/reglas-trace.js";
        const existente = Array.from(document.scripts).find((script) => {
            return script.src && script.src.endsWith(`/${ruta}`);
        });
        const script = existente || document.createElement("script");

        const finalizar = () => {
            if (typeof globalThis.evaluarMovimientoTraceWis === "function") {
                resolve();
                return;
            }

            reject(new Error(
                "reglas-trace.js se cargó, pero no publicó " +
                "evaluarMovimientoTraceWis."
            ));
        };

        if (existente) {
            if (typeof globalThis.evaluarMovimientoTraceWis === "function") {
                resolve();
            } else {
                existente.addEventListener("load", finalizar, { once: true });
                existente.addEventListener("error", () => reject(new Error(
                    `No se pudo cargar ${ruta}.`
                )), { once: true });
            }
            return;
        }

        script.src = ruta;
        script.async = false;
        script.addEventListener("load", finalizar, { once: true });
        script.addEventListener("error", () => reject(new Error(
            `No se pudo cargar ${ruta}.`
        )), { once: true });
        document.head.appendChild(script);
    }).catch((error) => {
        promesaModuloReglasTraceWis = null;
        throw error;
    });

    return promesaModuloReglasTraceWis;
}

function evaluarMovimientoTraceWisDisponible(fila) {
    const evaluar = globalThis.evaluarMovimientoTraceWis;

    if (typeof evaluar !== "function") {
        throw new Error(
            "El evaluador Trace WIS no está disponible. " +
            "Verificá la carga de assets/js/reglas-trace.js."
        );
    }

    return evaluar(fila);
}

function obtenerEstadoProductivoTraceWisDisponible(fila) {
    const obtenerEstado = globalThis.obtenerEstadoProductivoTraceWis;

    if (typeof obtenerEstado !== "function") {
        throw new Error("El módulo de reglas Trace WIS no está disponible.");
    }

    return obtenerEstado(fila);
}

if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("reglas-trace-actualizadas", () => {
        // Las reglas cambian la clasificación: el índice de KPIs se rehace.
        indiceTraceWisVigente = false;

        if (!document.getElementById("bloque-mapa-reportes")) {
            return;
        }

        mostrarHistorialImportaciones();

        // Con la selección sin consultar, el índice se rehace al consultar.
        if (!seleccionConsultadaReportes || hayCambiosSinConsultarReportes()) {
            return;
        }

        asegurarIndiceTraceWis();

        if (typeof actualizarDashboards === "function") {
            actualizarDashboards();
        }

        // El mapa vuelve a evaluar sus filas (y su inactividad) con las reglas nuevas.
        actualizarMapaCalorDesdeReportes().catch(console.error);
    });
}

async function inicializarReportes() {
    // Cada visita arranca sin consulta: no se dibuja nada hasta Consultar.
    seleccionConsultadaReportes = null;
    operacionPendienteDesdeInicio = "";
    await asegurarModuloReglasTraceWis();
    if (window.PoloOesteTareas?.sincronizarRegistrosServidor) {
        await window.PoloOesteTareas.sincronizarRegistrosServidor();
    }

    const administrador = esAdministrador();
    const filtrosDesdeInicio = obtenerFiltrosReportesDesdeInicio();
    tipoReporteActivo = TIPO_REPORTE_TRACE_WIS;

    if (
        filtrosDesdeInicio &&
        TIPOS_REPORTE_DISPONIBLES.includes(filtrosDesdeInicio.tipo)
    ) {
        tipoReporteActivo = filtrosDesdeInicio.tipo;
    }

    const archivo = document.getElementById("archivo-reporte-excel");
    const menu = document.getElementById("menu-excel-reportes");
    const tablaImportaciones = document.getElementById(
        "tabla-importaciones-reportes"
    );

    const aviso = document.getElementById("aviso-reportes-lectura");

    if (aviso) {
        aviso.hidden = administrador;
    }

    document.querySelectorAll("[data-requiere-admin-reportes]")
        .forEach((control) => {
            control.disabled = !administrador;
            control.title = administrador
                ? ""
                : "Solo los administradores pueden importar archivos";
        });

    cargarOperativasReportes();
    configurarSelectorTipoReporte();

    if (menu) {
        menu.addEventListener("click", manejarAccionMenuReportes);
    }

    if (archivo && administrador) {
        archivo.addEventListener("change", manejarArchivoReporte);
    }

    mostrarResultadosReportes(false);

    // Operativa y período se aplican con "Consultar"; mientras tanto, lo que
    // se ve queda atenuado como desactualizado.
    [
        "filtro-desde-reportes",
        "filtro-hasta-reportes",
        "filtro-operativa-pickeos",
        "incluir-historial-reportes"
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener(
            "change",
            actualizarEstadoConsultaReportes
        );
    });

    // Tarea, piso y tipo de ubicación solo acotan el plano, con lo ya cargado.
    [
        "filtro-operacion-trace-wis",
        "filtro-piso-mapa",
        "filtro-tipo-ubicacion-mapa"
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", () => {
            if (typeof mostrarMapaCalor === "function" && seleccionConsultadaReportes) {
                mostrarMapaCalor();
            }
        });
    });

    document.getElementById("consultar-reportes")?.addEventListener(
        "click",
        () => consultarReportes().catch(console.error)
    );

    // "Cargar historial completo" desde la tendencia o el mapa.
    document.querySelector(".pagina-reportes")?.addEventListener("click", (evento) => {
        if (!evento.target.closest("[data-cargar-historial-reportes]")) {
            return;
        }

        const historial = document.getElementById("incluir-historial-reportes");

        if (historial) {
            historial.checked = true;
        }

        consultarReportes().catch(console.error);
    });

    const mesFacturacion = document.getElementById(
        "mes-facturacion-reportes"
    );

    if (mesFacturacion && !mesFacturacion.value) {
        mesFacturacion.value = obtenerMesFacturacionActual();
    }

    // Ciclo 21–20 por defecto; los botones de período los maneja dashboards.js.
    if (typeof configurarPeriodoDashboards === "function") {
        configurarPeriodoDashboards();
    }

    if (tablaImportaciones && administrador) {
        tablaImportaciones.addEventListener("click", (evento) => {
            const boton = evento.target.closest(
                "[data-eliminar-importacion]"
            );

            if (boton) {
                eliminarImportacionReporte(
                    boton.dataset.eliminarImportacion
                );
            }
        });
    }

    configurarDialogoOperativaImportacion();

    try {
        // Solo el historial de importaciones: los movimientos esperan a Consultar.
        await actualizarDatosReportes();
    } catch (error) {
        console.error(error);
        mostrarMensajeReportes(
            "No fue posible abrir el almacenamiento de reportes.",
            "error"
        );
        return;
    }

    // Desde Inicio ("Profundizar en Reportes") la selección ya está elegida.
    if (filtrosDesdeInicio) {
        aplicarFiltrosReportesDesdeInicio(filtrosDesdeInicio);
        await consultarReportes();
    } else {
        actualizarEstadoConsultaReportes();
    }
}

function obtenerFiltrosReportesDesdeInicio() {
    const filtros = globalThis.filtrosReportesDesdeInicio;
    return filtros && typeof filtros === "object" ? filtros : null;
}

function aplicarFiltrosReportesDesdeInicio(filtros) {
    if (!filtros) {
        return;
    }

    globalThis.filtrosReportesDesdeInicio = null;
    asignarValorFiltroReporte(
        "filtro-desde-reportes",
        String(filtros.desde || "")
    );
    asignarValorFiltroReporte(
        "filtro-hasta-reportes",
        String(filtros.hasta || "")
    );

    const operativa = OPERATIVAS.includes(filtros.operativa)
        ? filtros.operativa
        : TODAS_LAS_OPERATIVAS;
    asignarValorFiltroReporte("filtro-operativa-pickeos", operativa);

    // Las tareas del mapa salen de los movimientos: se elige al terminar la consulta.
    const operacion = String(filtros.operacion || "");
    operacionPendienteDesdeInicio = operacion !== TODAS_OPERACIONES_TRACE_WIS
        ? operacion
        : "";

    // El período llega de Inicio: el mes y los botones Ciclo / Mes completo
    // se alinean con esas fechas (dashboards.js deduce el modo).
    if (
        typeof obtenerModoPeriodoDashboards === "function" &&
        typeof actualizarBotonesPeriodoDashboards === "function"
    ) {
        const modo = obtenerModoPeriodoDashboards();

        if (modo !== "personalizado") {
            asignarValorFiltroReporte(
                "mes-facturacion-reportes",
                modo === "mes"
                    ? String(filtros.desde).slice(0, 7)
                    : obtenerMesCicloDashboards(String(filtros.hasta))
            );
        }

        actualizarBotonesPeriodoDashboards();
    }
}

function configurarSelectorTipoReporte() {
    const selector = document.getElementById("selector-tipo-reporte");

    if (selector) {
        selector.value = tipoReporteActivo;
        selector.addEventListener("change", async () => {
            await seleccionarTipoReporte(selector.value);
        });
    }
    actualizarInterfazTipoReporte();
}

async function seleccionarTipoReporte(tipo) {
    if (!TIPOS_REPORTE_DISPONIBLES.includes(tipo) || tipo === tipoReporteActivo) {
        return;
    }

    tipoReporteActivo = tipo;
    actualizarInterfazTipoReporte();

    if (seleccionConsultadaReportes) {
        await consultarReportes();
    }

    mostrarHistorialImportaciones();
}

function actualizarInterfazTipoReporte() {
    const configuracion = obtenerConfiguracionReporteActivo();

    const selectorTipo = document.getElementById("selector-tipo-reporte");

    if (selectorTipo) {
        selectorTipo.value = tipoReporteActivo;
    }

    actualizarTexto(
        "titulo-dialogo-importacion",
        `¿A qué operativa pertenece ${configuracion.nombre}?`
    );
    actualizarTexto(
        "detalle-dialogo-importacion",
        `La selección vinculará ${configuracion.nombre.toLowerCase()} ` +
            "con una operativa y no podrá cambiarse después de la carga."
    );

    const esTraceWis = configuracion.tipo === TIPO_REPORTE_TRACE_WIS;
    const campoDescripcion = document.getElementById(
        "campo-filtro-operacion-trace-wis"
    );

    if (campoDescripcion) {
        campoDescripcion.hidden = !esTraceWis;
    }

    const mapa = document.getElementById("bloque-mapa-reportes");

    if (mapa) {
        // Como el resto de los resultados, el mapa aparece recién al consultar.
        mapa.hidden = configuracion.mostrarMapa === false ||
            !seleccionConsultadaReportes;
    }
}

function obtenerConfiguracionReporteActivo() {
    return CONFIGURACIONES_REPORTES[tipoReporteActivo] ||
        CONFIGURACIONES_REPORTES[TIPO_REPORTE_TRACE_WIS];
}

async function asegurarModuloMapaCalor() {
    if (typeof inicializarMapaCalor === "function") {
        await inicializarMapaCalor();
        return;
    }

    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/js/mapa-calor.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error(
            "No se pudo cargar assets/js/mapa-calor.js."
        ));
        document.head.appendChild(script);
    });

    if (typeof inicializarMapaCalor !== "function") {
        throw new Error("El módulo del mapa de calor no se inició.");
    }

    await inicializarMapaCalor();
}

function cargarOperativasReportes() {
    const selectorImportacion = document.getElementById(
        "operativa-importacion-reportes"
    );
    const selectorFiltro = document.getElementById(
        "filtro-operativa-pickeos"
    );

    if (selectorImportacion) {
        selectorImportacion.innerHTML = "";
        agregarOpcionesOperativasAgrupadas(selectorImportacion);
        selectorImportacion.value = OPERATIVA_REPORTE_PREDETERMINADA;
    }

    if (selectorFiltro) {
        selectorFiltro.innerHTML = "";
        agregarOpcion(selectorFiltro, TODAS_LAS_OPERATIVAS, "Todas");
        agregarOpcionesOperativasAgrupadas(selectorFiltro);
        // Con "Todas", el mapa Mezzanine muestra todos los movimientos de su plano.
        selectorFiltro.value = TODAS_LAS_OPERATIVAS;
    }
}

// Operativas que ya no están en el catálogo (DirecTV, Libre) quedan "Sin asignar".
function normalizarOperativaReporte(operativa) {
    return OPERATIVAS.includes(operativa) ||
        operativa === OPERATIVAS_VARIAS_IMPORTACION
        ? operativa
        : SIN_OPERATIVA;
}

function obtenerOperativaImportacionReporte() {
    return normalizarOperativaReporte(
        obtenerValorReporte("operativa-importacion-reportes")
    );
}

function configurarDialogoOperativaImportacion() {
    const dialogo = document.getElementById(
        "dialogo-operativa-importacion"
    );
    const archivo = document.getElementById("archivo-reporte-excel");
    const cancelar = document.querySelector(
        "[data-cancelar-operativa-importacion]"
    );

    if (archivo && dialogo) {
        archivo.addEventListener("change", () => {
            if (archivo.files.length) {
                dialogo.close();
            }
        });
    }

    if (cancelar && dialogo) {
        cancelar.addEventListener("click", () => dialogo.close());
    }
}

function solicitarOperativaImportacion() {
    const dialogo = document.getElementById(
        "dialogo-operativa-importacion"
    );

    const archivo = document.getElementById("archivo-reporte-excel");

    if (archivo) {
        archivo.value = "";
    }

    if (dialogo && typeof dialogo.showModal === "function") {
        dialogo.showModal();
        return;
    }

    const seleccion = window.prompt(
        `Indicá la operativa para ${obtenerConfiguracionReporteActivo()
            .nombre} (por ejemplo, Forum o Decathlon).`,
        OPERATIVA_REPORTE_PREDETERMINADA
    );

    if (!seleccion) {
        return;
    }

    const operativa = OPERATIVAS.find((item) => {
        return normalizarTextoReporte(item) ===
            normalizarTextoReporte(seleccion);
    });

    if (!operativa) {
        mostrarMensajeReportes("La operativa indicada no es válida.", "error");
        return;
    }

    asignarValorFiltroReporte("operativa-importacion-reportes", operativa);
    abrirSelectorArchivoReporte();
}

function abrirSelectorArchivoReporte() {
    const archivo = document.getElementById("archivo-reporte-excel");

    if (archivo) {
        archivo.value = "";
        archivo.click();
    }
}

async function manejarAccionMenuReportes(evento) {
    const boton = evento.target.closest("[data-accion-reporte]");

    if (!boton || boton.disabled) {
        return;
    }

    const menu = document.getElementById("menu-excel-reportes");

    if (menu) {
        menu.open = false;
    }

    switch (boton.dataset.accionReporte) {
        case "descargar-plantilla":
            descargarPlantillaReporteActivo();
            break;

        case "importar": {
            if (!esAdministrador()) {
                return;
            }

            // El Trace trae la empresa en cada fila: no hace falta preguntar.
            if (obtenerConfiguracionReporteActivo().operativaPorFila) {
                abrirSelectorArchivoReporte();
            } else {
                solicitarOperativaImportacion();
            }
            break;
        }

        // Exporta los indicadores; el detalle fila a fila se consulta en el WMS.
        case "exportar":
            await exportarIndicadoresReportes(boton);
            break;
    }
}

function descargarPlantillaReporteActivo() {
    const configuracion = obtenerConfiguracionReporteActivo();
    const enlace = document.createElement("a");
    enlace.href = configuracion.plantilla;
    enlace.download = configuracion.nombrePlantilla;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    mostrarMensajeReportes(
        `Plantilla de ${configuracion.nombre} descargada.`,
        "exito"
    );
}

async function manejarArchivoReporte(evento) {
    const archivo = evento.target.files[0] || null;

    if (!archivo || !esAdministrador()) {
        return;
    }

    bloquearAccionesReportes(true);
    mostrarMensajeReportes(
        `Validando ${archivo.name}...`,
        ""
    );

    try {
        const configuracion = obtenerConfiguracionReporteActivo();
        validarArchivoReporte(archivo, configuracion);
        const operativa = configuracion.operativaPorFila
            ? ""
            : obtenerOperativaImportacionReporte();
        const firma = crearFirmaArchivoReporte(archivo);
        const existente = importacionesReportesCache.some((importacion) => {
            return importacion.firmaArchivo === firma;
        });

        if (existente) {
            throw new Error(
                "Este mismo archivo ya fue importado anteriormente."
            );
        }

        const filas = await leerReporteDesdeXlsx(archivo, configuracion);
        const importacion = crearImportacionReporte(
            archivo,
            firma,
            filas,
            operativa,
            configuracion
        );
        await guardarImportacionReporte(importacion, filas);
        if (window.PoloOesteTareas?.sincronizarRegistrosServidor) {
            await window.PoloOesteTareas.sincronizarRegistrosServidor();
        }
        // Si hay una consulta a la vista y el archivo la toca, se lee y se suma.
        await actualizarDatosReportes();
        mostrarMensajeReportes(
            `${archivo.name}: ${filas.length.toLocaleString("es-UY")} ` +
                `registros importados para ${importacion.operativa}.` +
                describirDescartesEmpresaTraceWis(filas.descartesEmpresa),
            "exito"
        );
    } catch (error) {
        console.warn(error.message || error);
        mostrarMensajeReportes(
            error.message || "No fue posible importar el archivo.",
            "error"
        );
    } finally {
        evento.target.value = "";
        bloquearAccionesReportes(false);
    }
}

function validarArchivoReporte(archivo, configuracion) {
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("El archivo debe estar en formato .xlsx.");
    }

    if (archivo.size > TAMANO_MAXIMO_REPORTE) {
        throw new Error("El archivo supera el máximo permitido de 25 MB.");
    }

    const nombre = normalizarTextoReporte(archivo.name);

    const coincideNombre = configuracion.palabrasNombre.every((palabra) => {
        return nombre.includes(palabra);
    });

    if (!coincideNombre) {
        throw new Error(
            `El nombre no corresponde a ${configuracion.nombre}. ` +
            `Usá el formato “${configuracion.nombreEsperado}”.`
        );
    }
}

async function leerReporteDesdeXlsx(archivo, configuracion) {
    if (typeof JSZip !== "function") {
        throw new Error("No se encontró el lector de archivos Excel.");
    }

    const zip = await JSZip.loadAsync(archivo);
    const compartidos = await leerTextosCompartidosXlsx(zip);
    const rutaHoja = await obtenerRutaPrimeraHojaXlsx(zip);
    const hoja = zip.file(rutaHoja);

    if (!hoja) {
        throw new Error("El Excel no contiene una hoja de datos válida.");
    }

    const xml = await hoja.async("string");

    if (configuracion.tipo === TIPO_REPORTE_TRACE_WIS) {
        return convertirXmlXlsxEnTraceWis(
            xml,
            compartidos,
            configuracion
        );
    }

    const filasCrudas = convertirHojaXlsxEnFilas(xml, compartidos);

    if (filasCrudas.length < 2) {
        throw new Error(
            "La plantilla no contiene datos. Conservá los encabezados y " +
            "agregá al menos una fila."
        );
    }

    return convertirFilasCrudasEnReporte(filasCrudas, configuracion);
}

async function leerTextosCompartidosXlsx(zip) {
    const archivo = zip.file("xl/sharedStrings.xml");

    if (!archivo) {
        return [];
    }

    const xml = await archivo.async("string");
    const textos = [];
    const expresion = /<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g;
    let coincidencia;

    while ((coincidencia = expresion.exec(xml))) {
        textos.push(extraerTextosXmlReporte(coincidencia[1]));
    }

    return textos;
}

async function obtenerRutaPrimeraHojaXlsx(zip) {
    const libro = zip.file("xl/workbook.xml");
    const relaciones = zip.file("xl/_rels/workbook.xml.rels");

    if (!libro || !relaciones) {
        return "xl/worksheets/sheet1.xml";
    }

    const documentoLibro = parsearXmlReporte(
        await libro.async("string"),
        "libro"
    );
    const primeraHoja = obtenerElementosXmlXlsx(
        documentoLibro,
        "sheet"
    )[0];
    const relacionId = primeraHoja
        ? primeraHoja.getAttribute("r:id")
        : "";
    const documentoRelaciones = parsearXmlReporte(
        await relaciones.async("string"),
        "relaciones del libro"
    );
    const relacion = obtenerElementosXmlXlsx(
        documentoRelaciones,
        "Relationship"
    ).find((item) => item.getAttribute("Id") === relacionId);
    const destino = relacion ? relacion.getAttribute("Target") : "";

    if (!destino) {
        return "xl/worksheets/sheet1.xml";
    }

    return normalizarRutaInternaXlsx(destino);
}

function obtenerElementosXmlXlsx(documento, nombre) {
    const porEspacioDeNombres = documento.getElementsByTagNameNS
        ? Array.from(documento.getElementsByTagNameNS("*", nombre))
        : [];

    if (porEspacioDeNombres.length) {
        return porEspacioDeNombres;
    }

    return Array.from(documento.getElementsByTagName(nombre));
}

function normalizarRutaInternaXlsx(destino) {
    const rutaInicial = destino.startsWith("/")
        ? destino.slice(1)
        : destino.startsWith("xl/")
            ? destino
            : `xl/${destino}`;
    const partes = [];

    rutaInicial.split("/").forEach((parte) => {
        if (parte === "..") {
            partes.pop();
        } else if (parte && parte !== ".") {
            partes.push(parte);
        }
    });

    return partes.join("/");
}

function convertirHojaXlsxEnFilas(xml, compartidos) {
    return Array.from(iterarFilasXlsxReporte(xml, compartidos));
}

function* iterarFilasXlsxReporte(xml, compartidos) {
    const expresionFilas = /<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g;
    let coincidenciaFila;

    while ((coincidenciaFila = expresionFilas.exec(xml))) {
        const valores = [];
        const atributosFila = coincidenciaFila[1] || "";
        const contenidoFila = coincidenciaFila[2] || "";
        const expresionCeldas = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
        let coincidenciaCelda;

        while ((coincidenciaCelda = expresionCeldas.exec(contenidoFila))) {
            const atributosCelda = coincidenciaCelda[1] || "";
            const referencia = obtenerAtributoXmlReporte(
                atributosCelda,
                "r"
            ) || "A1";
            const columna = indiceColumnaXlsx(referencia);
            valores[columna] = obtenerValorCeldaXlsxDesdeXml(
                atributosCelda,
                coincidenciaCelda[2] || "",
                compartidos
            );
        }

        if (valores.some((valor) => String(valor ?? "").trim() !== "")) {
            yield {
                numero: Number(obtenerAtributoXmlReporte(
                    atributosFila,
                    "r"
                )) || 0,
                valores
            };
        }
    }
}

function obtenerValorCeldaXlsxDesdeXml(
    atributos,
    contenido,
    compartidos
) {
    const tipo = obtenerAtributoXmlReporte(atributos, "t") || "";

    if (tipo === "inlineStr") {
        return extraerTextosXmlReporte(contenido);
    }

    const coincidenciaValor = contenido.match(
        /<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/
    );
    const valor = coincidenciaValor
        ? decodificarTextoXmlReporte(coincidenciaValor[1])
        : "";

    if (tipo === "s") {
        return compartidos[Number(valor)] ?? "";
    }

    if (tipo === "b") {
        return valor === "1" ? "Sí" : "No";
    }

    if (
        (!tipo || tipo === "n") &&
        valor !== "" &&
        Number.isFinite(Number(valor))
    ) {
        return Number(valor);
    }

    return valor;
}

function extraerTextosXmlReporte(contenido) {
    const textos = [];
    const expresion = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g;
    let coincidencia;

    while ((coincidencia = expresion.exec(contenido))) {
        textos.push(decodificarTextoXmlReporte(coincidencia[1]));
    }

    return textos.join("");
}

function obtenerAtributoXmlReporte(atributos, nombre) {
    const expresion = new RegExp(
        `(?:^|\\s)${nombre}="([^"]*)"`,
        "i"
    );
    const coincidencia = atributos.match(expresion);
    return coincidencia
        ? decodificarTextoXmlReporte(coincidencia[1])
        : "";
}

function decodificarTextoXmlReporte(valor) {
    return String(valor ?? "")
        .replace(/&#x([0-9a-f]+);/gi, (_, codigo) => {
            return String.fromCodePoint(parseInt(codigo, 16));
        })
        .replace(/&#(\d+);/g, (_, codigo) => {
            return String.fromCodePoint(Number(codigo));
        })
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

function indiceColumnaXlsx(referencia) {
    const letras = (referencia.match(/[A-Z]+/i) || ["A"])[0]
        .toUpperCase();
    let indice = 0;

    for (const letra of letras) {
        indice = indice * 26 + letra.charCodeAt(0) - 64;
    }

    return indice - 1;
}

function convertirFilasCrudasEnReporte(filas, configuracion) {
    const encabezados = filas[0].valores.map((valor) => {
        return String(valor ?? "").trim();
    });
    const indices = validarEncabezadosReporte(encabezados, configuracion);

    if (configuracion.tipo === TIPO_REPORTE_TRACE_WIS) {
        return convertirFilasCrudasEnTraceWis(
            filas,
            indices,
            configuracion
        );
    }

    const errores = [];
    const datos = filas.slice(1).map((fila) => {
        const cantidad = normalizarNumeroReporte(
            fila.valores[indices.cantidad]
        );
        const fecha = normalizarFechaHoraReporte(
            fila.valores[indices.fechaHora]
        );
        const ubicacion = textoCeldaReporte(fila, indices.ubicacion);
        const producto = textoCeldaReporte(fila, indices.producto);
        const usuario = textoCeldaReporte(fila, indices.usuario);

        if (
            !producto ||
            !Number.isFinite(cantidad) ||
            cantidad < 0 ||
            !fecha ||
            !usuario ||
            (configuracion.requiereUbicacion && !ubicacion)
        ) {
            errores.push(fila.numero || "sin número");
            return null;
        }

        return {
            ubicacion,
            producto,
            descripcion: textoCeldaReporte(fila, indices.descripcion),
            cantidad,
            fechaHora: fecha.fechaHora,
            fechaDia: fecha.fechaDia,
            usuario
        };
    }).filter(Boolean);

    if (errores.length) {
        const muestra = errores.slice(0, 5).join(", ");
        throw new Error(
            `Hay datos incompletos o inválidos en las filas ${muestra}. ` +
            (configuracion.requiereUbicacion
                ? "Ubicación, producto, cantidad, fecha y usuario son obligatorios."
                : "Producto, cantidad, fecha y usuario son obligatorios.")
        );
    }

    if (!datos.length) {
        throw new Error(
            `El archivo no contiene filas válidas de ${configuracion.nombre}.`
        );
    }

    const maximoFilas = configuracion.maximoFilas || MAXIMO_FILAS_REPORTE;

    if (datos.length > maximoFilas) {
        throw new Error(
            `El archivo supera el límite de ${maximoFilas.toLocaleString("es-UY")} filas.`
        );
    }

    return datos;
}

function crearDescartesEmpresaTraceWis() {
    return { excluidas: new Map(), desconocidas: new Map() };
}

function sumarDescarteEmpresaTraceWis(mapa, clave) {
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
}

function describirDescartesEmpresaTraceWis(descartes) {
    if (!descartes) {
        return "";
    }

    const formatear = (mapa) => [...mapa.entries()]
        .map(([clave, cantidad]) => `${clave} (${cantidad.toLocaleString("es-UY")})`)
        .join(", ");
    const partes = [];

    if (descartes.excluidas.size) {
        partes.push(`empresas excluidas: ${formatear(descartes.excluidas)}`);
    }

    if (descartes.desconocidas.size) {
        partes.push(
            `códigos de empresa que no están en el catálogo: ` +
            formatear(descartes.desconocidas)
        );
    }

    return partes.length
        ? ` No se tomaron en cuenta filas de ${partes.join("; ")}.`
        : "";
}

function convertirFilasCrudasEnTraceWis(filas, indices, configuracion) {
    const errores = [];
    const descartes = crearDescartesEmpresaTraceWis();
    const datos = filas.slice(1).map((fila) => {
        const dato = convertirFilaCrudaTraceWis(fila, indices, descartes);

        if (
            dato === FILA_TRACE_WIS_MOVIMIENTO_CERO ||
            dato === FILA_TRACE_WIS_EMPRESA_DESCARTADA
        ) {
            return null;
        }

        if (!dato) {
            errores.push(fila.numero || "sin número");
        }

        return dato;
    }).filter(Boolean);

    datos.descartesEmpresa = descartes;
    validarResultadoTraceWis(datos, errores, configuracion);
    return datos;
}

function convertirXmlXlsxEnTraceWis(xml, compartidos, configuracion) {
    let indices = null;
    const datos = [];
    const errores = [];
    const descartes = crearDescartesEmpresaTraceWis();
    const maximoFilas = configuracion.maximoFilas || MAXIMO_FILAS_REPORTE;

    for (const fila of iterarFilasXlsxReporte(xml, compartidos)) {
        if (!indices) {
            const encabezados = fila.valores.map((valor) => {
                return String(valor ?? "").trim();
            });
            indices = validarEncabezadosReporte(
                encabezados,
                configuracion
            );
            continue;
        }

        const dato = convertirFilaCrudaTraceWis(fila, indices, descartes);

        if (
            dato === FILA_TRACE_WIS_MOVIMIENTO_CERO ||
            dato === FILA_TRACE_WIS_EMPRESA_DESCARTADA
        ) {
            continue;
        } else if (!dato) {
            errores.push(fila.numero || "sin número");
        } else {
            datos.push(dato);
        }

        if (datos.length > maximoFilas) {
            throw new Error(
                `El archivo supera el límite de ${maximoFilas.toLocaleString("es-UY")} filas.`
            );
        }
    }

    if (!indices) {
        throw new Error("El Excel no contiene una hoja de datos válida.");
    }

    datos.descartesEmpresa = descartes;
    validarResultadoTraceWis(datos, errores, configuracion);
    return datos;
}

/*
 * La operativa de cada fila sale de "Cod. Empresa". Las empresas excluidas
 * del catálogo o desconocidas no se importan; se cuentan en `descartes`.
 */
function convertirFilaCrudaTraceWis(fila, indices, descartes) {
    const fecha = normalizarFechaHoraReporte(
        fila.valores[indices.fechaHora]
    );
    const usuario = textoCeldaReporte(fila, indices.usuario);
    const aplicacion = textoCeldaReporte(fila, indices.aplicacion);
    const producto = textoCeldaReporte(fila, indices.producto);
    const ubicacion = textoCeldaReporte(fila, indices.ubicacion);
    const movimiento = normalizarNumeroReporte(
        fila.valores[indices.movimiento]
    );

    if (Number.isFinite(movimiento) && movimiento === 0) {
        return FILA_TRACE_WIS_MOVIMIENTO_CERO;
    }

    const codigoEmpresa = textoCeldaReporte(fila, indices.codigoEmpresa);
    const empresa = obtenerEmpresaWisPorCodigo(codigoEmpresa);

    if (!empresa || empresa.excluida) {
        if (descartes) {
            sumarDescarteEmpresaTraceWis(
                empresa ? descartes.excluidas : descartes.desconocidas,
                empresa
                    ? `${empresa.codigo} ${empresa.operativa}`
                    : codigoEmpresa || "sin código"
            );
        }
        return FILA_TRACE_WIS_EMPRESA_DESCARTADA;
    }

    if (
        !fecha ||
        !usuario ||
        !aplicacion ||
        !producto ||
        !ubicacion ||
        !Number.isFinite(movimiento)
    ) {
        return null;
    }

    return {
        fechaHora: fecha.fechaHora,
        fechaDia: fecha.fechaDia,
        usuario,
        aplicacion,
        descripcionAplicacion: textoCeldaReporte(
            fila,
            indices.descripcionAplicacion
        ),
        producto,
        descripcion: textoCeldaReporte(fila, indices.descripcion),
        ubicacion,
        movimiento,
        cantidad: movimiento,
        codigoEmpresa: empresa.codigo,
        empresa: textoCeldaReporte(fila, indices.empresa) || empresa.nombre,
        operativa: empresa.operativa,
        operativaFisica: empresa.operativaFisica
    };
}

function validarResultadoTraceWis(datos, errores, configuracion) {

    if (errores.length) {
        const muestra = errores.slice(0, 5).join(", ");
        throw new Error(
            `Hay datos incompletos o inválidos en las filas ${muestra}. ` +
            "Fecha y hora, nombre de usuario, aplicación, producto, " +
            "ubicación y un movimiento numérico son obligatorios."
        );
    }

    if (!datos.length) {
        throw new Error(
            "El archivo no contiene movimientos válidos del Trace de stock WIS." +
            describirDescartesEmpresaTraceWis(datos.descartesEmpresa)
        );
    }

    const maximoFilas = configuracion.maximoFilas || MAXIMO_FILAS_REPORTE;

    if (datos.length > maximoFilas) {
        throw new Error(
            `El archivo supera el límite de ${maximoFilas.toLocaleString("es-UY")} filas.`
        );
    }
}

function validarEncabezadosReporte(encabezados, configuracion) {
    const noVacios = encabezados.filter((encabezado) => encabezado !== "");
    const esperados = configuracion.encabezados.length;
    const faltantes = configuracion.encabezados.filter((item) => {
        return !noVacios.some((encabezado) => {
            return coincideEncabezadoReporte(item, encabezado);
        });
    });

    if (faltantes.length || noVacios.length !== esperados) {
        const detalle = faltantes.length
            ? ` Faltan: ${faltantes.map((item) => item.nombre).join(", ")}.`
            : "";
        throw new Error(
            `Los encabezados no coinciden con la plantilla de ` +
            `${configuracion.nombre}.${detalle} Descargá la plantilla y ` +
            `respetá sus ${esperados} columnas.`
        );
    }

    const indices = {};

    configuracion.encabezados.forEach((item) => {
        indices[item.clave] = encabezados.findIndex((encabezado) => {
            return coincideEncabezadoReporte(item, encabezado);
        });
    });

    return indices;
}

function coincideEncabezadoReporte(definicion, encabezado) {
    const recibido = normalizarTextoReporte(encabezado);
    const nombresValidos = [
        definicion.nombre,
        ...(definicion.alias || [])
    ];
    return nombresValidos.some((nombre) => {
        return normalizarTextoReporte(nombre) === recibido;
    });
}

function textoCeldaReporte(fila, indice) {
    return String(fila.valores[indice] ?? "").trim();
}

function normalizarNumeroReporte(valor) {
    if (typeof valor === "number") {
        return valor;
    }

    let texto = String(valor ?? "").trim().replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
        texto = texto.lastIndexOf(",") > texto.lastIndexOf(".")
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto.replace(/,/g, "");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : NaN;
}

function normalizarFechaHoraReporte(valor) {
    if (typeof valor === "number" && Number.isFinite(valor)) {
        const milisegundos = Math.round((valor - 25569) * 86400000);
        const fecha = new Date(milisegundos);

        if (!Number.isNaN(fecha.getTime())) {
            return crearFechaReporte(
                fecha.getUTCFullYear(),
                fecha.getUTCMonth() + 1,
                fecha.getUTCDate(),
                fecha.getUTCHours(),
                fecha.getUTCMinutes(),
                fecha.getUTCSeconds()
            );
        }
    }

    const texto = String(valor ?? "").trim();
    const iso = texto.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (iso) {
        return crearFechaReporte(
            Number(iso[1]),
            Number(iso[2]),
            Number(iso[3]),
            Number(iso[4] || 0),
            Number(iso[5] || 0),
            Number(iso[6] || 0)
        );
    }

    const local = texto.match(
        /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (local) {
        let ano = Number(local[3]);
        ano = ano < 100 ? 2000 + ano : ano;
        return crearFechaReporte(
            ano,
            Number(local[2]),
            Number(local[1]),
            Number(local[4] || 0),
            Number(local[5] || 0),
            Number(local[6] || 0)
        );
    }

    return null;
}

function crearFechaReporte(ano, mes, dia, hora, minuto, segundo) {
    const fecha = new Date(ano, mes - 1, dia, hora, minuto, segundo);

    if (
        fecha.getFullYear() !== ano ||
        fecha.getMonth() !== mes - 1 ||
        fecha.getDate() !== dia
    ) {
        return null;
    }

    const fechaDia = [ano, mes, dia]
        .map((parte, indice) => {
            return indice === 0
                ? String(parte).padStart(4, "0")
                : String(parte).padStart(2, "0");
        })
        .join("-");
    const horario = [hora, minuto, segundo]
        .map((parte) => String(parte).padStart(2, "0"))
        .join(":");

    return {
        fechaDia,
        fechaHora: `${fechaDia}T${horario}`
    };
}

function parsearXmlReporte(xml, nombre) {
    const documento = new DOMParser().parseFromString(
        xml,
        "application/xml"
    );

    if (documento.getElementsByTagName("parsererror").length) {
        throw new Error(`El Excel contiene ${nombre} dañados.`);
    }

    return documento;
}

function crearFirmaArchivoReporte(archivo) {
    return `${archivo.name}|${archivo.size}|${archivo.lastModified}`;
}

function crearImportacionReporte(
    archivo,
    firma,
    filas,
    operativa,
    configuracion
) {
    const fechas = filas.map((fila) => fila.fechaDia).sort();
    // Con operativa por fila, la importación resume las operativas que trae.
    const operativas = configuracion.operativaPorFila
        ? [...new Set(filas.map((fila) => fila.operativa))].sort()
        : [];
    const operativaImportacion = configuracion.operativaPorFila
        ? (operativas.length === 1 ? operativas[0] : OPERATIVAS_VARIAS_IMPORTACION)
        : operativa;
    const totalUnidades = filas.reduce((total, fila) => {
        if (configuracion.tipo === TIPO_REPORTE_TRACE_WIS) {
            const evaluacion = evaluarMovimientoTraceWisDisponible({
                ...fila,
                operativa: fila.operativa || operativa
            });
            const unidades = Number(
                evaluacion.unidades ??
                (
                    Number(evaluacion.unidadesFacturables || 0) +
                    Number(evaluacion.unidadesPicking || 0) +
                    Number(evaluacion.unidadesOperativas || 0)
                )
            );
            return total + (Number.isFinite(unidades) ? unidades : 0);
        }

        const cantidad = Number(fila.cantidad || 0);
        return total + (configuracion.resumenValorAbsoluto
            ? Math.abs(cantidad)
            : cantidad);
    }, 0);

    return {
        id: generarId(),
        tipo: configuracion.tipo,
        nombreTipo: configuracion.nombre,
        operativa: normalizarOperativaReporte(operativaImportacion),
        operativas,
        nombreArchivo: archivo.name,
        firmaArchivo: firma,
        tamanoArchivo: archivo.size,
        cantidadFilas: filas.length,
        totalUnidades,
        fechaDesde: fechas[0],
        fechaHasta: fechas[fechas.length - 1],
        importadoPor: obtenerUsuarioActual().id,
        fechaImportacion: new Date().toISOString()
    };
}

function abrirBaseReportes() {
    return new Promise((resolve, reject) => {
        const solicitud = indexedDB.open(
            NOMBRE_BASE_REPORTES,
            VERSION_BASE_REPORTES
        );

        solicitud.onupgradeneeded = () => {
            const base = solicitud.result;
            const transaccion = solicitud.transaction;
            let importaciones;

            if (!base.objectStoreNames.contains(ALMACEN_IMPORTACIONES)) {
                importaciones = base.createObjectStore(
                    ALMACEN_IMPORTACIONES,
                    { keyPath: "id" }
                );
            } else {
                importaciones = transaccion.objectStore(
                    ALMACEN_IMPORTACIONES
                );
            }

            if (!importaciones.indexNames.contains("tipo")) {
                importaciones.createIndex("tipo", "tipo", { unique: false });
            }

            if (!importaciones.indexNames.contains("firmaArchivo")) {
                importaciones.createIndex(
                    "firmaArchivo",
                    "firmaArchivo",
                    { unique: false }
                );
            }

            let filas;

            if (!base.objectStoreNames.contains(ALMACEN_FILAS_REPORTES)) {
                filas = base.createObjectStore(
                    ALMACEN_FILAS_REPORTES,
                    { keyPath: "id" }
                );
            } else {
                filas = transaccion.objectStore(ALMACEN_FILAS_REPORTES);
            }

            if (!filas.indexNames.contains("tipo")) {
                filas.createIndex("tipo", "tipo", { unique: false });
            }

            if (!filas.indexNames.contains("importacionId")) {
                filas.createIndex("importacionId", "importacionId", {
                    unique: false
                });
            }
        };

        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
        solicitud.onblocked = () => reject(new Error(
            "La base de Reportes está abierta en otra pestaña. " +
            "Cerrala y recargá esta página para actualizarla."
        ));
    });
}

async function guardarImportacionReporte(importacion, filas) {
    const base = await abrirBaseReportes();

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(
            [ALMACEN_IMPORTACIONES, ALMACEN_FILAS_REPORTES],
            "readwrite"
        );
        transaccion.objectStore(ALMACEN_IMPORTACIONES).add(importacion);
        const almacenFilas = transaccion.objectStore(
            ALMACEN_FILAS_REPORTES
        );

        filas.forEach((fila, indice) => {
            almacenFilas.add({
                ...fila,
                id: `${importacion.id}-${indice + 1}`,
                importacionId: importacion.id,
                tipo: importacion.tipo,
                operativa: fila.operativa || importacion.operativa,
                nombreArchivo: importacion.nombreArchivo
            });
        });

        transaccion.oncomplete = () => {
            base.close();
            resolve();
        };
        transaccion.onerror = () => {
            base.close();
            reject(transaccion.error);
        };
    });
}

async function obtenerDatosAlmacenReportes(almacen, indice, valor) {
    const base = await abrirBaseReportes();

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(almacen, "readonly");
        const objeto = transaccion.objectStore(almacen);
        const indiceDisponible = Boolean(
            indice && objeto.indexNames.contains(indice)
        );
        const solicitud = indiceDisponible
            ? objeto.index(indice).getAll(valor)
            : objeto.getAll();

        solicitud.onsuccess = () => {
            const resultados = solicitud.result || [];
            resolve(
                indice && !indiceDisponible
                    ? resultados.filter((registro) => {
                        return registro && registro[indice] === valor;
                    })
                    : resultados
            );
        };
        solicitud.onerror = () => {
            base.close();
            reject(solicitud.error);
        };
        transaccion.oncomplete = () => base.close();
        transaccion.onabort = () => {
            base.close();
            reject(transaccion.error);
        };
    });
}

/*
 * Relee el historial de importaciones, que es liviano, y saca de memoria las
 * filas de importaciones borradas. Si hay una consulta a la vista, se repite
 * para sumar lo importado; si no, los movimientos siguen sin leerse.
 */
async function actualizarDatosReportes() {
    const importaciones = await obtenerDatosAlmacenReportes(
        ALMACEN_IMPORTACIONES,
        "",
        ""
    );

    importacionesReportesCache = importaciones.map((importacion) => ({
        ...importacion,
        operativa: normalizarOperativaReporte(importacion.operativa)
    })).sort((a, b) => {
        return b.fechaImportacion.localeCompare(a.fechaImportacion);
    });
    // Pickeos y Almacenamiento ya no se leen: solo figuran en el historial.
    filasPickeosCache = [];
    filasAlmacenamientoCache = [];
    sincronizarTraceWisConImportaciones();

    if (!document.getElementById("bloque-mapa-reportes")) {
        return;
    }

    mostrarHistorialImportaciones();

    if (seleccionConsultadaReportes && !hayCambiosSinConsultarReportes()) {
        await consultarReportes();
    } else {
        actualizarEstadoConsultaReportes();
    }
}

function sincronizarTraceWisConImportaciones() {
    if (!filasTraceWisCargadas) {
        // Pedido explícito (la demo al regenerarse): se descarta lo cargado.
        reiniciarCargaTraceWis();
        return;
    }

    const vigentes = new Set(importacionesReportesCache.map((importacion) => {
        return importacion.id;
    }));
    const borradas = new Set([...importacionesTraceWisCargadas].filter((id) => {
        return !vigentes.has(id);
    }));

    if (!borradas.size) {
        return;
    }

    filasTraceWisCache = filasTraceWisCache.filter((fila) => {
        return !borradas.has(fila.importacionId);
    });
    borradas.forEach((id) => importacionesTraceWisCargadas.delete(id));
    indiceTraceWisVigente = false;
}

function reiniciarCargaTraceWis() {
    filasTraceWisCache = [];
    importacionesTraceWisCargadas = new Set();
    indiceTraceWisVigente = false;
    // La memoria vacía también está al día con la base.
    filasTraceWisCargadas = true;
}

/* ---------- Consulta a demanda ---------- */

/* Operativa, período y si se pidió el historial completo; null si el período no es válido. */
function obtenerSeleccionReportes() {
    const desde = obtenerValorReporte("filtro-desde-reportes");
    const hasta = obtenerValorReporte("filtro-hasta-reportes");
    const formato = /^\d{4}-\d{2}-\d{2}$/;

    if (!formato.test(desde) || !formato.test(hasta) || desde > hasta) {
        return null;
    }

    return {
        operativa: obtenerValorReporte("filtro-operativa-pickeos") ||
            TODAS_LAS_OPERATIVAS,
        desde,
        hasta,
        historial: Boolean(
            document.getElementById("incluir-historial-reportes")?.checked
        )
    };
}

function obtenerClaveSeleccionReportes(seleccion) {
    return seleccion
        ? [
            seleccion.operativa,
            seleccion.desde,
            seleccion.hasta,
            seleccion.historial
        ].join("|")
        : "";
}

function hayCambiosSinConsultarReportes() {
    return obtenerClaveSeleccionReportes(obtenerSeleccionReportes()) !==
        obtenerClaveSeleccionReportes(seleccionConsultadaReportes);
}

/*
 * Fechas que necesita la selección: el período, el período anterior con el
 * que se comparan los KPIs y, para la inactividad del mapa, desde unos días
 * antes de los 3 meses previos al fin del período. "" = sin límite.
 */
function calcularVentanaCargaReportes(seleccion) {
    if (seleccion.historial) {
        return { desde: "", hasta: "" };
    }

    const rango = { desde: seleccion.desde, hasta: seleccion.hasta };
    const inicios = [rango.desde];

    if (typeof obtenerRangoAnteriorDashboards === "function") {
        inicios.push(obtenerRangoAnteriorDashboards(rango).desde);
    }

    if (typeof restarMesesFechaMapa === "function") {
        const limite = crearFechaLocalInicio(
            restarMesesFechaMapa(rango.hasta, MESES_INACTIVIDAD_MAPA)
        );
        limite.setDate(limite.getDate() - DIAS_MARGEN_INACTIVIDAD_REPORTES);
        inicios.push(formatearFechaInputInicio(limite));
    }

    return { desde: inicios.sort()[0], hasta: rango.hasta };
}

function importacionTocaVentanaReportes(importacion, ventana) {
    // Sin fechas guardadas no se puede descartar: se lee.
    if (!importacion.fechaDesde || !importacion.fechaHasta) {
        return true;
    }

    return (!ventana.hasta || importacion.fechaDesde <= ventana.hasta) &&
        (!ventana.desde || importacion.fechaHasta >= ventana.desde);
}

function listarImportacionesTraceWisVentana(ventana) {
    return importacionesReportesCache.filter((importacion) => {
        return importacion.tipo === TIPO_REPORTE_TRACE_WIS &&
            importacionTocaVentanaReportes(importacion, ventana);
    });
}

/*
 * true si ya están en memoria todas las importaciones del Trace que tocan
 * esas fechas ("" = sin límite). La tendencia y las ubicaciones "nunca
 * movidas" del mapa lo usan para saber si tienen el historial que necesitan.
 */
function traceWisCargadoCubre(desde = "", hasta = "") {
    return listarImportacionesTraceWisVentana({ desde, hasta })
        .every((importacion) => importacionesTraceWisCargadas.has(importacion.id));
}

/* Primer día de los movimientos en memoria (para "sin movimientos desde…"). */
function obtenerInicioCargaTraceWis() {
    return importacionesReportesCache
        .filter((importacion) => importacionesTraceWisCargadas.has(importacion.id))
        .map((importacion) => importacion.fechaDesde || "")
        .filter(Boolean)
        .sort()[0] || "";
}

function listarImportacionesFaltantesReportes(seleccion) {
    return listarImportacionesTraceWisVentana(
        calcularVentanaCargaReportes(seleccion)
    ).filter((importacion) => !importacionesTraceWisCargadas.has(importacion.id));
}

function describirCargaPendienteReportes(seleccion) {
    if (!importacionesReportesCache.some((importacion) => {
        return importacion.tipo === TIPO_REPORTE_TRACE_WIS;
    })) {
        return "Todavía no hay archivos del Trace WIS: se verán solo los embarques.";
    }

    const faltantes = listarImportacionesFaltantesReportes(seleccion);

    if (!faltantes.length) {
        return "Los movimientos de esta selección ya están cargados: se ve al instante.";
    }

    const filas = faltantes.reduce((total, importacion) => {
        return total + (Number(importacion.cantidadFilas) || 0);
    }, 0);

    return `Se van a leer ${faltantes.length.toLocaleString("es-UY")} ` +
        `${faltantes.length === 1 ? "archivo" : "archivos"} del Trace WIS ` +
        `(${filas.toLocaleString("es-UY")} filas).`;
}

/*
 * Aplica la selección: lee solo las importaciones que faltan, actualiza el
 * índice de KPIs y dibuja dashboards y mapa. Una consulta espera a la que
 * esté en curso, así dos clics no leen lo mismo dos veces.
 */
async function consultarReportes() {
    while (consultaReportesEnCurso) {
        await consultaReportesEnCurso.catch(() => {});
    }

    const promesa = ejecutarConsultaReportes();
    consultaReportesEnCurso = promesa;
    let exito = false;

    try {
        exito = await promesa;
    } finally {
        if (consultaReportesEnCurso === promesa) {
            consultaReportesEnCurso = null;
        }

        // Si falló, queda a la vista el error junto al botón.
        if (exito) {
            actualizarEstadoConsultaReportes();
        } else {
            document.getElementById("consultar-reportes")
                ?.classList.add("pendiente");
        }
    }
}

/* Devuelve true si la consulta terminó; los errores quedan junto al botón. */
async function ejecutarConsultaReportes() {
    const seleccion = obtenerSeleccionReportes();

    if (!seleccion) {
        mostrarEstadoConsultaReportes("Seleccioná un período válido.", true);
        return false;
    }

    const faltantes = listarImportacionesFaltantesReportes(seleccion);
    bloquearConsultaReportes(true);

    try {
        if (faltantes.length) {
            const nuevas = await leerImportacionesTraceWis(
                faltantes,
                (posicion) => mostrarEstadoConsultaReportes(
                    `Leyendo ${posicion + 1} de ${faltantes.length} ` +
                        `${faltantes.length === 1 ? "archivo" : "archivos"} ` +
                        "del Trace WIS…"
                )
            );
            agregarFilasTraceWis(nuevas, faltantes);
        }

        mostrarEstadoConsultaReportes("Calculando indicadores…");
        // Deja pintar el aviso antes del cálculo, que bloquea la pantalla
        // (con la pestaña en segundo plano no hay cuadros: sigue igual).
        await new Promise((resolve) => {
            requestAnimationFrame(() => setTimeout(resolve));
            setTimeout(resolve, 200);
        });

        asegurarIndiceTraceWis();
        seleccionConsultadaReportes = seleccion;
        mostrarResultadosReportes(true);
        actualizarOpcionesOperacionesTraceWis();
        aplicarOperacionPendienteDesdeInicio();

        if (typeof actualizarDashboards === "function") {
            actualizarDashboards();
        }

        mostrarHistorialImportaciones();
        mostrarEstadoConsultaReportes("Dibujando el mapa de calor…");
        await asegurarMapaReportes();
        return true;
    } catch (error) {
        console.error(error);
        mostrarEstadoConsultaReportes(
            "No fue posible leer los movimientos del Trace WIS.",
            true
        );
        return false;
    } finally {
        bloquearConsultaReportes(false);
    }
}

/* Lee las importaciones de a una (con su avance) por el índice importacionId. */
async function leerImportacionesTraceWis(importaciones, alAvanzar) {
    const base = await abrirBaseReportes();
    const operativasPorImportacion = new Map(
        importacionesReportesCache.map((importacion) => [
            importacion.id,
            importacion.operativa
        ])
    );
    const nuevas = [];

    try {
        for (const [posicion, importacion] of importaciones.entries()) {
            alAvanzar(posicion);
            const filas = await leerFilasImportacionReportes(
                base,
                importacion.id
            );
            normalizarFilasGuardadasReporte(filas, operativasPorImportacion)
                .forEach((fila) => nuevas.push(fila));
        }
    } finally {
        base.close();
    }

    return nuevas;
}

function leerFilasImportacionReportes(base, importacionId) {
    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(ALMACEN_FILAS_REPORTES, "readonly");
        const solicitud = transaccion.objectStore(ALMACEN_FILAS_REPORTES)
            .index("importacionId")
            .getAll(IDBKeyRange.only(importacionId));

        solicitud.onsuccess = () => resolve(solicitud.result || []);
        solicitud.onerror = () => reject(solicitud.error);
        transaccion.onabort = () => reject(transaccion.error);
    });
}

function agregarFilasTraceWis(filas, importaciones) {
    filas.forEach((fila) => filasTraceWisCache.push(fila));
    importaciones.forEach((importacion) => {
        importacionesTraceWisCargadas.add(importacion.id);
    });

    // El índice suma solo lo nuevo; si estaba desactualizado se rehace entero.
    if (indiceTraceWisVigente && typeof agregarFilasIndiceDashboards === "function") {
        agregarFilasIndiceDashboards(filas);
    } else {
        indiceTraceWisVigente = false;
    }
}

function asegurarIndiceTraceWis() {
    if (indiceTraceWisVigente || typeof prepararIndiceDashboards !== "function") {
        return;
    }

    prepararIndiceDashboards(filasTraceWisCache);
    indiceTraceWisVigente = true;
}

/* El mapa se inicia en la primera consulta de cada visita a la página. */
async function asegurarMapaReportes() {
    const bloque = document.getElementById("bloque-mapa-reportes");

    if (!bloque || obtenerConfiguracionReporteActivo().mostrarMapa === false) {
        return;
    }

    if (bloque.dataset.mapaListo === "true") {
        await actualizarMapaCalorDesdeReportes();
        return;
    }

    bloque.dataset.mapaListo = "true";
    await asegurarModuloMapaCalor();
}

function aplicarOperacionPendienteDesdeInicio() {
    const operacion = operacionPendienteDesdeInicio;
    const selector = document.getElementById("filtro-operacion-trace-wis");
    operacionPendienteDesdeInicio = "";

    if (
        selector &&
        operacion &&
        [...selector.options].some((opcion) => opcion.value === operacion)
    ) {
        selector.value = operacion;
    }
}

function mostrarResultadosReportes(visible) {
    const sinMapa = obtenerConfiguracionReporteActivo().mostrarMapa === false;

    document.querySelectorAll("[data-resultado-reportes]").forEach((bloque) => {
        bloque.hidden = !visible ||
            (sinMapa && bloque.id === "bloque-mapa-reportes");
    });

    const aviso = document.getElementById("aviso-consulta-reportes");

    if (aviso) {
        aviso.hidden = visible;
    }
}

/*
 * Mientras la selección no coincide con lo consultado (o hay una lectura en
 * curso), los resultados quedan atenuados e inactivos y el aviso junto al
 * botón dice cuánto falta leer.
 */
function actualizarEstadoConsultaReportes() {
    const seleccion = obtenerSeleccionReportes();
    const enCurso = Boolean(consultaReportesEnCurso);
    const pendiente = Boolean(seleccionConsultadaReportes) &&
        hayCambiosSinConsultarReportes();
    const boton = document.getElementById("consultar-reportes");

    marcarResultadosDesactualizadosReportes(pendiente || enCurso);
    boton?.classList.toggle(
        "pendiente",
        !enCurso && (!seleccionConsultadaReportes || pendiente)
    );

    if (enCurso) {
        return;
    }

    if (!seleccion) {
        mostrarEstadoConsultaReportes("Seleccioná un período válido.", true);
        return;
    }

    if (seleccionConsultadaReportes && !pendiente) {
        mostrarEstadoConsultaReportes("");
        return;
    }

    mostrarEstadoConsultaReportes(
        (pendiente ? "La selección cambió. " : "") +
            describirCargaPendienteReportes(seleccion)
    );
}

function marcarResultadosDesactualizadosReportes(desactualizados) {
    document.querySelectorAll("[data-resultado-reportes]").forEach((bloque) => {
        bloque.classList.toggle("resultados-desactualizados", desactualizados);
        bloque.inert = desactualizados;
    });
}

/*
 * Durante la lectura la selección queda fija: los KPIs y el mapa leen los
 * filtros al dibujarse y deben coincidir con lo que se está cargando.
 */
function bloquearConsultaReportes(bloquear) {
    const boton = document.getElementById("consultar-reportes");

    document.querySelectorAll(
        ".tarjeta-filtros-reportes :is(button, select, input)"
    ).forEach((control) => {
        control.disabled = bloquear;
    });

    if (boton) {
        boton.setAttribute("aria-busy", String(bloquear));
    }

    if (bloquear) {
        marcarResultadosDesactualizadosReportes(true);
        boton?.classList.remove("pendiente");
    }
}

function mostrarEstadoConsultaReportes(texto, esError = false) {
    const estado = document.getElementById("estado-consulta-reportes");

    if (estado) {
        estado.textContent = texto;
        estado.classList.toggle("error", esError);
    }
}

/*
 * Completa cada fila en el mismo objeto que devolvió IndexedDB, sin copiarla:
 * con cientos de miles de filas, cada copia costaba memoria y tiempo, y el
 * caché de evaluaciones de reglas-trace.js reconoce la fila por su objeto
 * (así el índice de KPIs y el mapa reutilizan la misma evaluación).
 */
function normalizarFilasGuardadasReporte(filas, operativasPorImportacion) {
    return filas.filter((fila) => {
        if (fila.tipo !== TIPO_REPORTE_TRACE_WIS) {
            return true;
        }

        return Number(fila.movimiento ?? fila.cantidad ?? 0) !== 0;
    }).map((fila) => {
        const esTraceWis = fila.tipo === TIPO_REPORTE_TRACE_WIS;
        const cantidad = Number(
            esTraceWis
                ? fila.movimiento ?? fila.cantidad ?? 0
                : fila.cantidad ??
                    fila.cantidadPreparada ??
                    fila.cantidadAlmacenada ??
                    0
        );

        fila.movimiento = esTraceWis
            ? Number(fila.movimiento ?? cantidad)
            : fila.movimiento;
        fila.cantidad = cantidad;
        fila.usuario = fila.usuario || fila.colector || "";
        fila.operativa = normalizarOperativaReporte(
            fila.operativa ||
            operativasPorImportacion.get(fila.importacionId)
        );

        if (esTraceWis) {
            fila.estadoProductivo =
                obtenerEstadoProductivoTraceWisDisponible(fila);
        }

        return fila;
    });
}

async function actualizarMapaCalorDesdeReportes() {
    if (
        !seleccionConsultadaReportes ||
        obtenerConfiguracionReporteActivo().mostrarMapa === false
    ) {
        return;
    }

    if (
        !document.getElementById("mapa-calor-contenedor") ||
        typeof cargarDatosMapaCalor !== "function"
    ) {
        return;
    }

    await cargarDatosMapaCalor();
    mostrarMapaCalor();
}

function actualizarOpcionesOperacionesTraceWis() {
    const selector = document.getElementById(
        "filtro-operacion-trace-wis"
    );

    if (!selector || tipoReporteActivo !== TIPO_REPORTE_TRACE_WIS) {
        return;
    }

    const seleccionado = selector.value || TODAS_OPERACIONES_TRACE_WIS;
    const operativa = obtenerValorReporte("filtro-operativa-pickeos") ||
        TODAS_LAS_OPERATIVAS;
    const filasOperativa = operativa === TODAS_LAS_OPERATIVAS
        ? filasTraceWisCache
        : filasTraceWisCache.filter((fila) => {
            return fila.operativa === operativa;
        });
    const operaciones = new Map();

    filasOperativa.forEach((fila) => {
        const clave = obtenerClaveOperacionTraceWis(fila);

        if (!operaciones.has(clave)) {
            operaciones.set(clave, obtenerEtiquetaOperacionTraceWis(fila));
        }
    });
    const opciones = [...operaciones.entries()].sort((a, b) => {
        return a[1].localeCompare(b[1], "es", { numeric: true });
    });

    selector.innerHTML = "";
    agregarOpcion(
        selector,
        TODAS_OPERACIONES_TRACE_WIS,
        "Todas las tareas"
    );
    opciones.forEach(([clave, etiqueta]) => {
        agregarOpcion(selector, clave, etiqueta);
    });
    selector.value = operaciones.has(seleccionado)
        ? seleccionado
        : TODAS_OPERACIONES_TRACE_WIS;
}

function obtenerValorDescripcionAplicacionWis(fila) {
    const descripcion = String(fila.descripcionAplicacion || "").trim();
    return descripcion || SIN_DESCRIPCION_APLICACION;
}

function obtenerClaveOperacionTraceWis(fila) {
    const aplicacion = String(fila.aplicacion || "").trim().toUpperCase();
    return `${aplicacion}${SEPARADOR_OPERACION_TRACE_WIS}` +
        obtenerValorDescripcionAplicacionWis(fila);
}

function obtenerEtiquetaOperacionTraceWis(fila) {
    const aplicacion = String(fila.aplicacion || "Sin aplicación")
        .trim()
        .toUpperCase();
    const descripcion = obtenerValorDescripcionAplicacionWis(fila);
    return `${aplicacion} · ${descripcion === SIN_DESCRIPCION_APLICACION
        ? "Sin descripción"
        : descripcion}`;
}

function obtenerEtiquetaClaveOperacionTraceWis(clave) {
    if (!clave || clave === TODAS_OPERACIONES_TRACE_WIS) {
        return "Todas las tareas";
    }

    const [aplicacion, descripcion = SIN_DESCRIPCION_APLICACION] =
        clave.split(SEPARADOR_OPERACION_TRACE_WIS);
    return `${aplicacion} · ${descripcion === SIN_DESCRIPCION_APLICACION
        ? "Sin descripción"
        : descripcion}`;
}

function obtenerMesFacturacionActual() {
    const hoy = new Date();
    const desplazamiento = hoy.getDate() >= 21 ? 1 : 0;
    const cierre = new Date(
        hoy.getFullYear(),
        hoy.getMonth() + desplazamiento,
        1
    );
    return `${cierre.getFullYear()}-${String(
        cierre.getMonth() + 1
    ).padStart(2, "0")}`;
}

function asignarValorFiltroReporte(id, valor) {
    const control = document.getElementById(id);

    if (control) {
        control.value = valor;
    }
}

function obtenerFilasReporteActivo() {
    if (tipoReporteActivo === TIPO_REPORTE_ALMACENAMIENTO) {
        return filasAlmacenamientoCache;
    }

    if (tipoReporteActivo === TIPO_REPORTE_TRACE_WIS) {
        return filasTraceWisCache;
    }

    return filasPickeosCache;
}

/*
 * Una selección (operativa o período) actualiza a la vez el mapa de calor y
 * los dashboards (dashboards.js).
 */
function mostrarReporteActivo() {
    if (
        !document.getElementById("bloque-mapa-reportes") ||
        !seleccionConsultadaReportes
    ) {
        return;
    }

    if (
        obtenerConfiguracionReporteActivo().mostrarMapa !== false &&
        typeof mostrarMapaCalor === "function" &&
        document.getElementById("mapa-calor-contenedor")
    ) {
        mostrarMapaCalor();
    }

    if (typeof actualizarDashboards === "function") {
        actualizarDashboards();
    }
}

async function exportarIndicadoresReportes(boton) {
    if (!seleccionConsultadaReportes) {
        mostrarMensajeReportes(
            "Tocá Consultar para cargar los indicadores antes de exportarlos.",
            "error"
        );
        return;
    }

    boton.disabled = true;

    try {
        await exportarExcel("dashboards");
        mostrarMensajeReportes("Indicadores exportados a Excel.", "exito");
    } catch (error) {
        console.error(error);
        mostrarMensajeReportes(
            error.message || "No fue posible exportar los indicadores.",
            "error"
        );
    } finally {
        boton.disabled = false;
    }
}

function mostrarHistorialImportaciones() {
    const tabla = document.getElementById("tabla-importaciones-reportes");

    if (!tabla) {
        return;
    }

    const usuarios = obtenerUsuarios();
    const unidadesTracePorImportacion = new Map();

    // Los archivos ya leídos se recalculan con las reglas vigentes; el resto
    // muestra el total calculado al importarlos.
    if (importacionesTraceWisCargadas.size) {
        filasTraceWisCache.forEach((filaTrace) => {
            const evaluacion = evaluarMovimientoTraceWisDisponible(filaTrace);

            const unidades = Number(
                evaluacion.unidades ??
                (
                    Number(evaluacion.unidadesFacturables || 0) +
                    Number(evaluacion.unidadesPicking || 0) +
                    Number(evaluacion.unidadesOperativas || 0)
                )
            );
            if (!(unidades > 0) || !filaTrace.importacionId) {
                return;
            }

            unidadesTracePorImportacion.set(
                filaTrace.importacionId,
                (unidadesTracePorImportacion.get(filaTrace.importacionId) || 0) +
                    unidades
            );
        });
    }

    tabla.innerHTML = "";

    if (!importacionesReportesCache.length) {
        agregarFilaVacia(tabla, 9, "Todavía no se importaron archivos.");
        return;
    }

    importacionesReportesCache.forEach((importacion) => {
        const fila = document.createElement("tr");
        const usuario = usuarios.find((item) => {
            return item.id === importacion.importadoPor;
        });
        fila.appendChild(crearCelda(importacion.nombreArchivo));

        const tipo = document.createElement("td");
        const estado = document.createElement("span");
        const configuracion = CONFIGURACIONES_REPORTES[importacion.tipo];
        estado.className = "estado-importacion";
        estado.textContent = importacion.nombreTipo ||
            (configuracion ? configuracion.nombre : "Reporte operativo");
        tipo.appendChild(estado);
        fila.appendChild(tipo);

        fila.appendChild(crearCelda(importacion.operativa));

        fila.appendChild(crearCelda(
            formatearPeriodoImportacion(importacion)
        ));
        fila.appendChild(crearCelda(
            Number(importacion.cantidadFilas).toLocaleString("es-UY")
        ));
        fila.appendChild(crearCelda(
            Number(
                importacion.tipo === TIPO_REPORTE_TRACE_WIS &&
                importacionesTraceWisCargadas.has(importacion.id)
                    ? unidadesTracePorImportacion.get(importacion.id) || 0
                    : importacion.totalUnidades
            ).toLocaleString("es-UY", {
                maximumFractionDigits: 2
            })
        ));
        fila.appendChild(crearCelda(
            usuario ? usuario.nombreUsuario : "Usuario no disponible"
        ));
        fila.appendChild(crearCelda(
            formatearFechaHoraExcel(importacion.fechaImportacion)
        ));
        fila.appendChild(crearCeldaAccionesImportacion(importacion));
        tabla.appendChild(fila);
    });
}

function crearCeldaAccionesImportacion(importacion) {
    const celda = document.createElement("td");

    if (!esAdministrador()) {
        celda.textContent = "Solo lectura";
        return celda;
    }

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-eliminar";
    boton.textContent = "Eliminar carga";
    boton.dataset.eliminarImportacion = importacion.id;
    celda.appendChild(boton);
    return celda;
}

async function eliminarImportacionReporte(importacionId) {
    if (!esAdministrador()) {
        return;
    }

    const importacion = importacionesReportesCache.find((item) => {
        return item.id === importacionId;
    });

    if (!importacion) {
        return;
    }

    if (!confirm(
        `¿Querés eliminar ${importacion.nombreArchivo} y todos sus datos?`
    )) {
        return;
    }

    try {
        await eliminarImportacionDeBase(importacionId);
        // Saca sus filas de memoria y, si hay una consulta a la vista, la rehace.
        await actualizarDatosReportes();
        mostrarMensajeReportes(
            "La importación fue eliminada correctamente.",
            "exito"
        );
    } catch (error) {
        console.error(error);
        mostrarMensajeReportes(
            "No fue posible eliminar la importación.",
            "error"
        );
    }
}

async function eliminarImportacionDeBase(importacionId) {
    const base = await abrirBaseReportes();

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(
            [ALMACEN_IMPORTACIONES, ALMACEN_FILAS_REPORTES],
            "readwrite"
        );
        transaccion.objectStore(ALMACEN_IMPORTACIONES).delete(importacionId);
        // Las filas se guardan como "<importación>-<n>": un solo rango las
        // borra todas, mucho más rápido que de a una en importaciones grandes.
        transaccion.objectStore(ALMACEN_FILAS_REPORTES).delete(
            IDBKeyRange.bound(`${importacionId}-`, `${importacionId}-￿`)
        );
        // Por las dudas, el índice levanta cualquier fila que haya quedado.
        const indice = transaccion.objectStore(ALMACEN_FILAS_REPORTES)
            .index("importacionId");
        const cursor = indice.openKeyCursor(IDBKeyRange.only(importacionId));

        cursor.onsuccess = () => {
            const resultado = cursor.result;

            if (resultado) {
                transaccion.objectStore(ALMACEN_FILAS_REPORTES)
                    .delete(resultado.primaryKey);
                resultado.continue();
            }
        };

        transaccion.oncomplete = () => {
            base.close();
            resolve();
        };
        transaccion.onerror = () => {
            base.close();
            reject(transaccion.error);
        };
    });
}

function formatearPeriodoImportacion(importacion) {
    const desde = formatearFechaExcel(importacion.fechaDesde);
    const hasta = formatearFechaExcel(importacion.fechaHasta);
    return desde === hasta ? desde : `${desde} al ${hasta}`;
}

function obtenerValorReporte(id) {
    const control = document.getElementById(id);
    return control ? control.value.trim() : "";
}

function normalizarTextoReporte(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function bloquearAccionesReportes(bloquear) {
    document.querySelectorAll("[data-accion-reporte]").forEach((boton) => {
        const requiereAdmin = boton.hasAttribute(
            "data-requiere-admin-reportes"
        );
        boton.disabled = bloquear || (requiereAdmin && !esAdministrador());
    });

    document.querySelectorAll("[data-bloqueo-reportes]").forEach((control) => {
        control.disabled = bloquear || !esAdministrador();
    });

    const selectorTipo = document.getElementById("selector-tipo-reporte");

    if (selectorTipo) {
        selectorTipo.disabled = bloquear;
    }
}

function mostrarMensajeReportes(texto, tipo) {
    const mensaje = document.getElementById("mensaje-reportes");

    if (!mensaje) {
        return;
    }

    clearTimeout(temporizadorMensajeReportes);
    mensaje.textContent = texto;
    mensaje.className = `mensaje${tipo ? ` ${tipo}` : ""}`;

    if (tipo === "exito") {
        temporizadorMensajeReportes = setTimeout(() => {
            if (mensaje.isConnected) {
                mensaje.textContent = "";
                mensaje.className = "mensaje";
            }
        }, 5000);
    }
}
