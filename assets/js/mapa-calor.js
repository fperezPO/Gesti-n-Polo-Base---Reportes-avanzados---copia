/*
 * Cada mapa de calor corresponde a una operativa física (un plano). Mezzanine
 * se completa al cargar assets/data/ubicaciones-mezzanine.json. E4, Integra,
 * Vehículos y Paraguay ya figuran en el selector y muestran "Plano pendiente"
 * hasta que se cargue su maestro de ubicaciones; para habilitarlos se completa
 * su entrada aquí y la lógica que traduce sus códigos (obtenerCodigoFilaMapa).
 */
const MAPA_MEZZANINE = "Mezzanine";
const CONFIGURACIONES_MAPA_CALOR = {
    Mezzanine: null,
    E4: null,
    Integra: null,
    "Vehículos": null,
    Paraguay: null
};
/*
 * Mapa sugerido al elegir una operativa de los datos; el usuario puede
 * cambiarlo. Sale del catálogo de empresas WIS: cada operativa por cliente
 * se opera en una operativa física (Mezzanine, Integra, Vehículos, Paraguay).
 */
function obtenerMapaSugeridoOperativa(operativa) {
    const mapa = typeof obtenerOperativaFisicaDeOperativa === "function"
        ? obtenerOperativaFisicaDeOperativa(operativa)
        : "";
    return CONFIGURACIONES_MAPA_CALOR.hasOwnProperty(mapa) ? mapa : "";
}
// La operativa Forum no tiene plano, pero Inicio cuenta sus ubicaciones (A.x.nnn).
const OPERATIVA_FORUM = "Forum";

let filasMapaCalorCache = [];
let importacionesMapaCalorCache = [];
let tipoReporteMapaCalorCache = null;
let cacheInactividadMapa = { clave: "", resultado: null };
let estadoInactividadMapaActual = {
    habilitado: false,
    codigos: new Set(),
    ultimasFechas: new Map(),
    fechaLimite: "",
    fechaReferencia: ""
};
let referenciaMezzanineCache = null;
let promesaReferenciaMezzanine = null;
let visitasPorUbicacionMapaActual = new Map();
// Por frente: cada ubicación WIS real con sus unidades y visitas en la selección.
let ubicacionesWisMapaActual = new Map();
// Visitas y cobertura de la última selección, para el botón "?" de sus tarjetas.
let ultimoResumenMapaCalor = null;
// En el detalle se listan como máximo estas ubicaciones (las de más actividad).
const MAXIMO_UBICACIONES_DETALLE_MAPA = 12;
const RUTA_REFERENCIA_MEZZANINE =
    "assets/data/ubicaciones-mezzanine.json";
const UBICACIONES_ESPECIALES_MEZZANINE = [
    "AVERIAS",
    "PISOX",
    "PISOY",
    "PISOZ",
    "JAULADT10",
    "JAULADT20",
    "JAULADT30",
    "ZESP"
];
/*
 * Código WIS de Mezzanine: piso (X, Y, Z) · calle (2) · columna o módulo (3)
 * · altura (2) · dígitos de control (2). Las alturas son 10, 20, 30 y 40.
 * En el piso X, la altura 40 figura en el WIS como 5A.
 * Ejemplos: Y031202080 → Y.03.120 altura 20; X010015A00 → X.01.001 altura 40.
 * "Y.03.120" es la clave interna del frente; en pantalla se muestran los
 * códigos WIS reales de sus ubicaciones (obtenerUbicacionesWisFrenteMapa).
 */
const PATRON_UBICACION_MEZZANINE = /^([XYZ])(\d{2})(\d{3})([0-9][0-9A-Z])/;
const EQUIVALENCIAS_ALTURA_MEZZANINE = { "5A": "40" };
// Tubos del piso X (X04-DER-1 … X20-DER-13): se agrupan por bloque fuera del plano.
const PATRON_TUBO_MEZZANINE = /^([XYZ]\d{2})DER\d+$/;
const ZONAS_PICKING_DT_MEZZANINE = [
    {
        codigo: "JAULADT10",
        nombre: "Jaula DT10",
        descripcion: "Ubicación operativa de picking DT"
    },
    {
        codigo: "JAULADT20",
        nombre: "Jaula DT20",
        descripcion: "Ubicación operativa de picking DT"
    },
    {
        codigo: "JAULADT30",
        nombre: "Jaula DT30",
        descripcion: "Ubicación operativa de picking DT"
    }
];
const MESES_INACTIVIDAD_MAPA = 3;
const CORREDORES_CENTRALES_MEZZANINE = {
    X: { despuesDe: 80, ancho: 10, desplazarModulos: false },
    Y: { despuesDe: 80, ancho: 10, desplazarModulos: false },
    Z: { despuesDe: 80, ancho: 10, desplazarModulos: false }
};
const PISOS_MAPA_MEZZANINE = ["X", "Y", "Z"];
const CALLES_PLANO_COMPLETO_MEZZANINE = Array.from(
    { length: 20 },
    (_, indice) => String(indice + 1).padStart(2, "0")
);
const MODULOS_PLANO_COMPLETO_MEZZANINE = [
    ...Array.from({ length: 80 }, (_, indice) => indice + 1),
    ...Array.from({ length: 66 }, (_, indice) => indice + 91)
];
const ZOOM_MINIMO_MAPA = 0.5;
const ZOOM_MAXIMO_MAPA = 2;
const PASO_ZOOM_MAPA = 0.1;

let modoVistaPisosMapa = "individual";
let mapaCodigosFilasCache = "";
let zoomMapaActual = 1;
let codigoSeleccionadoMapa = "";
let arrastreMapaActual = null;
let eventoTecladoMapaConfigurado = false;

async function inicializarMapaCalor() {
    const selectorOperativaDatos = document.getElementById(
        "filtro-operativa-pickeos"
    );
    const contenedor = document.getElementById("mapa-calor-contenedor");

    if (!selectorOperativaDatos || !contenedor) {
        return;
    }

    contenedor.addEventListener("pointerover", mostrarDetalleCeldaMapa);
    contenedor.addEventListener("click", seleccionarCeldaMapa);
    cargarOpcionesMapaCalor();
    configurarHerramientasVisualizacionMapa();
    actualizarControlesMapaMezzanine(obtenerMapaCalorSeleccionado());

    try {
        await cargarDatosMapaCalor();
        mostrarMapaCalor();
    } catch (error) {
        console.error(error);
        mostrarMensajeMapaCalor(
            "No fue posible leer los archivos guardados en Reportes.",
            "error"
        );
    }
}

function cargarOpcionesMapaCalor() {
    const selector = document.getElementById("filtro-mapa-calor");

    if (!selector) {
        return;
    }

    const seleccionado = selector.value;
    selector.innerHTML = "";
    Object.keys(CONFIGURACIONES_MAPA_CALOR).forEach((mapa) => {
        selector.add(new Option(mapa, mapa));
    });
    selector.value = CONFIGURACIONES_MAPA_CALOR.hasOwnProperty(seleccionado)
        ? seleccionado
        : MAPA_MEZZANINE;
    selector.addEventListener("change", () => {
        codigoSeleccionadoMapa = "";
        mostrarMapaCalor();
    });
}

function obtenerMapaCalorSeleccionado() {
    const mapa = obtenerValorMapa("filtro-mapa-calor");
    return CONFIGURACIONES_MAPA_CALOR.hasOwnProperty(mapa)
        ? mapa
        : MAPA_MEZZANINE;
}

/*
 * Al cambiar la operativa de los datos se sugiere su plano según el catálogo
 * de empresas (Decathlon → Mezzanine, Conaprole → Integra, Iveco →
 * Vehículos…). Con "Todas" u operativas sin plano (predios) se mantiene el
 * mapa elegido. La última operativa sincronizada se guarda en
 * el propio selector: cada vez que se vuelve a Reportes el DOM es nuevo y
 * se sincroniza desde cero, aunque mostrarMapaCalor() corra antes de
 * inicializarMapaCalor().
 */
function sincronizarMapaConOperativa(operativa) {
    const selector = document.getElementById("filtro-mapa-calor");

    if (!selector || selector.dataset.operativaSincronizada === operativa) {
        return;
    }

    selector.dataset.operativaSincronizada = operativa;
    const sugerido = obtenerMapaSugeridoOperativa(operativa);

    if (sugerido && selector.value !== sugerido) {
        selector.value = sugerido;
        codigoSeleccionadoMapa = "";
    }
}

function filaCoincideOperativaMapa(fila, operativa) {
    return !operativa ||
        operativa === TODAS_LAS_OPERATIVAS ||
        fila.operativa === operativa;
}

function configurarHerramientasVisualizacionMapa() {
    document.querySelectorAll("[data-modo-vista-mapa]")
        .forEach((boton) => {
            boton.addEventListener("click", () => {
                establecerModoVistaPisosMapa(
                    boton.dataset.modoVistaMapa
                );
            });
        });

    ["piso-comparacion-a-mapa", "piso-comparacion-b-mapa"]
        .forEach((id) => {
            document.getElementById(id)?.addEventListener(
                "change",
                () => cambiarPisosComparacionMapa(id)
            );
        });

    document.getElementById("metrica-visual-mapa")?.addEventListener(
        "change",
        mostrarMapaCalor
    );
    document.getElementById("reducir-zoom-mapa")?.addEventListener(
        "click",
        () => cambiarZoomMapa(-PASO_ZOOM_MAPA)
    );
    document.getElementById("aumentar-zoom-mapa")?.addEventListener(
        "click",
        () => cambiarZoomMapa(PASO_ZOOM_MAPA)
    );
    document.getElementById("restablecer-zoom-mapa")?.addEventListener(
        "click",
        () => aplicarZoomMapa(1)
    );
    document.getElementById("ajustar-zoom-mapa")?.addEventListener(
        "click",
        ajustarMapaAlAncho
    );

    const scroll = document.getElementById("mapa-calor-scroll");

    scroll?.addEventListener("wheel", manejarRuedaZoomMapa, {
        passive: false
    });
    scroll?.addEventListener("pointerdown", iniciarArrastreMapa);
    scroll?.addEventListener("pointermove", moverArrastreMapa);
    scroll?.addEventListener("pointerup", finalizarArrastreMapa);
    scroll?.addEventListener("pointercancel", finalizarArrastreMapa);

    if (!eventoTecladoMapaConfigurado) {
        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && codigoSeleccionadoMapa) {
                limpiarSeleccionMapa();
            }
        });
        eventoTecladoMapaConfigurado = true;
    }

    actualizarControlesModoVistaMapa();
    aplicarZoomMapa(zoomMapaActual);

    if (typeof inicializarMapaCalor3D === "function") {
        inicializarMapaCalor3D();
    }
}

function cambiarPisosComparacionMapa(controlCambiado) {
    const a = document.getElementById("piso-comparacion-a-mapa");
    const b = document.getElementById("piso-comparacion-b-mapa");

    if (a && b && a.value === b.value) {
        const otro = PISOS_MAPA_MEZZANINE.find((piso) => piso !== a.value);

        if (controlCambiado === "piso-comparacion-a-mapa") {
            b.value = otro;
        } else {
            a.value = otro;
        }
    }

    mostrarMapaCalor();
}

function establecerModoVistaPisosMapa(modo) {
    if (!["individual", "todos", "comparar"].includes(modo)) {
        return;
    }

    modoVistaPisosMapa = modo;
    codigoSeleccionadoMapa = "";
    actualizarControlesModoVistaMapa();
    mostrarMapaCalor();
}

function actualizarControlesModoVistaMapa() {
    document.querySelectorAll("[data-modo-vista-mapa]")
        .forEach((boton) => {
            const activo = boton.dataset.modoVistaMapa === modoVistaPisosMapa;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-pressed", String(activo));
        });

    const controlPiso = document.getElementById("control-piso-principal-mapa");
    const comparacion = document.getElementById("controles-comparacion-mapa");

    if (controlPiso) {
        controlPiso.hidden = modoVistaPisosMapa !== "individual";
    }

    if (comparacion) {
        comparacion.hidden = modoVistaPisosMapa !== "comparar";
    }
}

function obtenerPisosVisiblesMapaMezzanine() {
    if (modoVistaPisosMapa === "todos") {
        return [...PISOS_MAPA_MEZZANINE];
    }

    if (modoVistaPisosMapa === "comparar") {
        const pisoA = obtenerValorMapa("piso-comparacion-a-mapa") || "Y";
        const pisoB = obtenerValorMapa("piso-comparacion-b-mapa") || "Z";
        return [...new Set([pisoA, pisoB])];
    }

    return [obtenerValorMapa("filtro-piso-mapa") || "Y"];
}

async function cargarDatosMapaCalor() {
    const tipo = obtenerTipoReporteMapaCalor();
    const filasYaCargadas = tipo === TIPO_REPORTE_TRACE_WIS &&
        typeof filasTraceWisCache !== "undefined" &&
        Array.isArray(filasTraceWisCache)
        ? filasTraceWisCache
        : null;

    if (filasYaCargadas) {
        usarFilasTraceWisMapaCalor(filasYaCargadas);
        return;
    }

    const [importaciones, filas] = await Promise.all([
        obtenerDatosAlmacenReportes(
            ALMACEN_IMPORTACIONES,
            "tipo",
            tipo
        ),
        filasYaCargadas || obtenerDatosAlmacenReportes(
            ALMACEN_FILAS_REPORTES,
            "tipo",
            tipo
        )
    ]);

    const mapa = obtenerMapaCalorSeleccionado();
    tipoReporteMapaCalorCache = tipo;
    importacionesMapaCalorCache = importaciones.map((importacion) => ({
        ...importacion,
        operativa: normalizarOperativaReporte(importacion.operativa)
    }));
    const operativasPorImportacion = new Map(
        importacionesMapaCalorCache.map((importacion) => [
            importacion.id,
            importacion.operativa
        ])
    );

    filasMapaCalorCache = filas.map((fila) => {
        const operativa = normalizarOperativaReporte(
            fila.operativa || operativasPorImportacion.get(fila.importacionId)
        );
        const filaNormalizada = {
            ...fila,
            usuario: fila.usuario || fila.colector || "",
            operativa
        };

        return {
            ...filaNormalizada,
            estadoProductivo: tipo === TIPO_REPORTE_TRACE_WIS &&
                typeof obtenerEstadoProductivoTraceWis === "function"
                ? obtenerEstadoProductivoTraceWis(filaNormalizada)
                : fila.estadoProductivo,
            ubicacionNormalizada: normalizarUbicacionMezzanine(
                fila.ubicacion
            ),
            codigoUbicacion: obtenerCodigoFilaMapa(filaNormalizada, mapa)
        };
    });
    mapaCodigosFilasCache = mapa;
    cacheInactividadMapa = { clave: "", resultado: null };
}

/*
 * Las filas del Trace que leyó reportes.js ya vienen normalizadas (operativa,
 * usuario, estado): el mapa les agrega su ubicación y su código de plano en
 * el mismo objeto, sin copiarlas. Solo se calculan las filas nuevas, salvo
 * que haya cambiado el plano.
 */
function usarFilasTraceWisMapaCalor(filas) {
    const mapa = obtenerMapaCalorSeleccionado();
    const recalcularCodigos = mapaCodigosFilasCache !== mapa;

    filas.forEach((fila) => {
        if (fila.ubicacionNormalizada === undefined) {
            fila.ubicacionNormalizada = normalizarUbicacionMezzanine(fila.ubicacion);
            fila.codigoUbicacion = obtenerCodigoFilaMapa(fila, mapa);
        } else if (recalcularCodigos) {
            fila.codigoUbicacion = obtenerCodigoFilaMapa(fila, mapa);
        }
    });

    tipoReporteMapaCalorCache = TIPO_REPORTE_TRACE_WIS;
    filasMapaCalorCache = filas;
    mapaCodigosFilasCache = mapa;
    cacheInactividadMapa = { clave: "", resultado: null };
}

/*
 * El código de cada fila depende del plano. Los mapas pendientes todavía no
 * tienen traducción de ubicaciones, así que ninguna fila cae en ellos.
 */
function obtenerCodigoFilaMapa(fila, mapa) {
    return mapa === MAPA_MEZZANINE
        ? normalizarCodigoUbicacionMezzanine(fila.ubicacion)
        : "";
}

function asegurarCodigosFilasMapa(mapa) {
    if (mapaCodigosFilasCache === mapa) {
        return;
    }

    filasMapaCalorCache.forEach((fila) => {
        fila.codigoUbicacion = obtenerCodigoFilaMapa(fila, mapa);
    });
    mapaCodigosFilasCache = mapa;
    cacheInactividadMapa = { clave: "", resultado: null };
}

function obtenerTipoReporteMapaCalor() {
    if (
        typeof tipoReporteActivo !== "undefined" &&
        typeof CONFIGURACIONES_REPORTES !== "undefined" &&
        CONFIGURACIONES_REPORTES[tipoReporteActivo]
    ) {
        return tipoReporteActivo;
    }

    return TIPO_REPORTE_TRACE_WIS;
}

function obtenerNombreActividadMapa() {
    const tipo = tipoReporteMapaCalorCache || obtenerTipoReporteMapaCalor();

    if (
        typeof CONFIGURACIONES_REPORTES !== "undefined" &&
        CONFIGURACIONES_REPORTES[tipo]
    ) {
        return CONFIGURACIONES_REPORTES[tipo].nombre;
    }

    return tipo === TIPO_REPORTE_ALMACENAMIENTO
        ? NOMBRE_REPORTE_ALMACENAMIENTO
        : NOMBRE_REPORTE_PICKEOS;
}

/*
 * Traduce una ubicación a su código de frente. El contexto puede ser un mapa
 * o una operativa de los datos (Inicio lo usa para contar ubicaciones). Las
 * operativas sin plano propio se ubican en Mezzanine cuando su código
 * coincide con ese formato.
 */
function normalizarCodigoUbicacionMapa(
    valor,
    contexto = OPERATIVA_REPORTE_PREDETERMINADA
) {
    if (contexto === OPERATIVA_FORUM) {
        return normalizarCodigoUbicacionForum(valor, true);
    }

    const mapa = CONFIGURACIONES_MAPA_CALOR.hasOwnProperty(contexto)
        ? contexto
        : obtenerMapaSugeridoOperativa(contexto);

    if (mapa === MAPA_MEZZANINE) {
        return normalizarCodigoUbicacionMezzanine(valor);
    }

    if (mapa) {
        return "";
    }

    return normalizarCodigoUbicacionMezzanine(valor) ||
        normalizarCodigoUbicacionForum(valor, false);
}

function normalizarCodigoUbicacionMezzanine(valor) {
    const ubicacion = normalizarUbicacionMezzanine(valor);

    if (UBICACIONES_ESPECIALES_MEZZANINE.includes(ubicacion)) {
        return ubicacion;
    }

    const coincidencia = ubicacion.match(PATRON_UBICACION_MEZZANINE);

    if (coincidencia) {
        return `${coincidencia[1]}.${coincidencia[2]}.${coincidencia[3]}`;
    }

    const tubo = ubicacion.match(PATRON_TUBO_MEZZANINE);
    return tubo ? `TUBOS_${tubo[1]}` : "";
}

// Operativa Forum: A.x.nnn por pasillo y módulo; las que comienzan por B son Piso Z.
function normalizarCodigoUbicacionForum(valor, incluirPisoZ = true) {
    const texto = String(valor ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s_\-/]+/g, ".")
        .replace(/\.{2,}/g, ".");

    if (incluirPisoZ && texto.startsWith("B")) {
        return "PISO_Z";
    }

    const frenteModulo = texto.slice(0, 7);
    const coincidencia = frenteModulo.match(/^A\.([A-Z])\.(\d{3})$/);

    if (!coincidencia) {
        return "";
    }

    const numero = Number(coincidencia[2]);

    if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
        return "";
    }

    return `A.${coincidencia[1]}.${String(numero).padStart(3, "0")}`;
}

function normalizarUbicacionMezzanine(valor) {
    return String(valor ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function obtenerAlturaMezzanine(segmento) {
    return EQUIVALENCIAS_ALTURA_MEZZANINE[segmento] || segmento;
}

// Piso + calle + módulo + altura física: "X010015A00" → "X0100140".
function obtenerClaveNivelMezzanine(ubicacionNormalizada) {
    const coincidencia = String(ubicacionNormalizada)
        .match(PATRON_UBICACION_MEZZANINE);

    return coincidencia
        ? `${coincidencia[1]}${coincidencia[2]}${coincidencia[3]}` +
            obtenerAlturaMezzanine(coincidencia[4])
        : "";
}

async function asegurarReferenciaMapaMezzanine() {
    if (referenciaMezzanineCache) {
        return referenciaMezzanineCache;
    }

    if (promesaReferenciaMezzanine) {
        return promesaReferenciaMezzanine;
    }

    promesaReferenciaMezzanine = fetch(RUTA_REFERENCIA_MEZZANINE)
        .then((respuesta) => {
            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo cargar ${RUTA_REFERENCIA_MEZZANINE}.`
                );
            }

            return respuesta.json();
        })
        .then((referencia) => prepararReferenciaMapaMezzanine(referencia))
        .finally(() => {
            promesaReferenciaMezzanine = null;
        });

    return promesaReferenciaMezzanine;
}

function prepararReferenciaMapaMezzanine(referencia) {
    if (
        !referencia ||
        !Array.isArray(referencia.tipos) ||
        !Array.isArray(referencia.frentes) ||
        !referencia.ubicaciones
    ) {
        throw new Error("La referencia de ubicaciones Mezzanine no es válida.");
    }

    const ubicaciones = new Map(Object.entries(referencia.ubicaciones));
    const frentesDetalle = new Map();
    const tiposPorNivel = new Map();

    referencia.frentes.forEach(([codigo, tipos]) => {
        frentesDetalle.set(codigo, {
            codigo,
            piso: codigo.split(".")[0],
            calle: codigo.split(".")[1],
            modulo: codigo.split(".")[2],
            tipos: new Set(tipos),
            alturas: new Set(),
            ubicaciones: 0
        });
    });

    // Tipos de cada zona especial según todas sus ubicaciones: un bloque de
    // tubos puede mezclar "Ub.Tubo" y "Ub.Selectivo".
    const tiposPorZona = new Map();

    ubicaciones.forEach((tipo, ubicacion) => {
        const codigo = normalizarCodigoUbicacionMezzanine(ubicacion);
        const esZona = UBICACIONES_ESPECIALES_MEZZANINE.includes(codigo) ||
            codigo.startsWith("TUBOS_");

        if (!esZona || !Number.isInteger(tipo)) {
            return;
        }

        if (!tiposPorZona.has(codigo)) {
            tiposPorZona.set(codigo, new Set());
        }
        tiposPorZona.get(codigo).add(tipo);
    });

    ubicaciones.forEach((tipo, ubicacion) => {
        if (UBICACIONES_ESPECIALES_MEZZANINE.includes(ubicacion)) {
            return;
        }

        const coincidencia = ubicacion.match(PATRON_UBICACION_MEZZANINE);

        if (!coincidencia) {
            return;
        }

        const codigo = `${coincidencia[1]}.${coincidencia[2]}.` +
            coincidencia[3];
        const altura = obtenerAlturaMezzanine(coincidencia[4]);
        const nivel = obtenerClaveNivelMezzanine(ubicacion);
        const detalle = frentesDetalle.get(codigo) || {
            codigo,
            piso: coincidencia[1],
            calle: coincidencia[2],
            modulo: coincidencia[3],
            tipos: new Set(),
            alturas: new Set(),
            ubicaciones: 0
        };

        if (Number.isInteger(tipo)) {
            detalle.tipos.add(tipo);

            if (!tiposPorNivel.has(nivel)) {
                tiposPorNivel.set(nivel, new Set());
            }
            tiposPorNivel.get(nivel).add(tipo);
        }

        detalle.alturas.add(altura);
        detalle.ubicaciones += 1;
        frentesDetalle.set(codigo, detalle);
    });

    const zonasEspecialesReferencia = referencia.zonasEspeciales.map((zona) => ({
        codigo: zona.codigo,
        nombre: zona.nombre || zona.codigo,
        piso: zona.piso || "",
        tipos: [...new Set([
            ...(Number.isInteger(zona.tipo) ? [zona.tipo] : []),
            ...(tiposPorZona.get(zona.codigo) || [])
        ])],
        descripcion: zona.descripcion || (zona.codigo === "AVERIAS"
            ? "Zona especial de averías"
            : `Zona especial del piso ${zona.piso || ""}`.trim())
    }));
    const codigosZonasReferencia = new Set(
        zonasEspecialesReferencia.map((zona) => zona.codigo)
    );
    // Códigos WIS reales de cada frente y de cada zona especial.
    const ubicacionesPorFrente = new Map();

    ubicaciones.forEach((_, ubicacion) => {
        const codigoWis = normalizarUbicacionMezzanine(ubicacion);
        const codigo = normalizarCodigoUbicacionMezzanine(codigoWis);

        if (!codigo) {
            return;
        }

        if (!ubicacionesPorFrente.has(codigo)) {
            ubicacionesPorFrente.set(codigo, []);
        }
        ubicacionesPorFrente.get(codigo).push(codigoWis);
    });
    const zonasEspeciales = [
        ...zonasEspecialesReferencia,
        ...ZONAS_PICKING_DT_MEZZANINE
            .filter((zona) => !codigosZonasReferencia.has(zona.codigo))
            .map((zona) => ({
                ...zona,
                piso: "",
                tipos: []
            }))
    ];

    referenciaMezzanineCache = {
        ...referencia,
        ubicacionesMapa: ubicaciones,
        ubicacionesPorFrente,
        frentesDetalle,
        tiposPorNivel,
        // Piso de cada zona especial ("" = visible con cualquier piso).
        pisoPorZona: new Map(
            zonasEspeciales.map((zona) => [zona.codigo, zona.piso || ""])
        ),
        tiposPorZona: new Map(
            zonasEspeciales.map((zona) => [zona.codigo, zona.tipos])
        )
    };
    CONFIGURACIONES_MAPA_CALOR.Mezzanine = {
        nombre: MAPA_MEZZANINE,
        tipoMapa: "mezzanine",
        referencia: referenciaMezzanineCache,
        zonasEspeciales,
        codigos: [
            ...frentesDetalle.keys(),
            ...zonasEspeciales.map((zona) => zona.codigo)
        ]
    };
    cargarTiposUbicacionMapaMezzanine();
    return referenciaMezzanineCache;
}

function cargarTiposUbicacionMapaMezzanine() {
    const selector = document.getElementById(
        "filtro-tipo-ubicacion-mapa"
    );

    if (!selector || !referenciaMezzanineCache) {
        return;
    }

    const seleccionado = selector.value || "Todos";
    selector.innerHTML = "";
    const todos = document.createElement("option");
    todos.value = "Todos";
    todos.textContent = "Todos los tipos";
    selector.appendChild(todos);

    referenciaMezzanineCache.tipos.forEach((tipo, indice) => {
        const opcion = document.createElement("option");
        opcion.value = String(indice);
        opcion.textContent = obtenerEtiquetaTipoUbicacionMapa(tipo);
        selector.appendChild(opcion);
    });

    selector.value = [...selector.options].some((opcion) => {
        return opcion.value === seleccionado;
    }) ? seleccionado : "Todos";
}

// "MZ Decathlon Agua" → "Decathlon Agua"; "MZ Teleshopping" → "Teleshopping".
function obtenerEtiquetaTipoUbicacionMapa(tipo) {
    return String(tipo || "").replace(/^MZ\s+/i, "");
}

function actualizarControlesMapaMezzanine(mapa) {
    const esMezzanine = mapa === MAPA_MEZZANINE;
    const controles = document.getElementById(
        "controles-mezzanine-mapa"
    );
    const herramientas = document.getElementById(
        "herramientas-visualizacion-mapa"
    );
    const leyendaEstructural = document.getElementById(
        "leyenda-estructural-mapa"
    );

    if (controles) {
        controles.hidden = !esMezzanine;
    }

    if (herramientas) {
        herramientas.hidden = !esMezzanine;
    }

    if (leyendaEstructural) {
        leyendaEstructural.hidden = !esMezzanine;
    }

    if (esMezzanine) {
        cargarTiposUbicacionMapaMezzanine();
        actualizarControlesModoVistaMapa();
    }
}

function mostrarCargaMapaMezzanine() {
    const titulo = document.getElementById("titulo-plano-mapa");
    const estado = document.getElementById("estado-fuente-mapa");
    const contenedor = document.getElementById("mapa-calor-contenedor");

    if (titulo) {
        titulo.textContent = "Cargando mapa de Mezzanine…";
    }

    if (estado) {
        estado.textContent =
            "Preparando las ubicaciones de Mezzanine y sus tipos.";
    }

    if (contenedor) {
        contenedor.innerHTML = "";
    }

    mostrarMensajeMapaCalor(
        "Cargando la estructura de pisos, calles y módulos…",
        ""
    );
}

function mostrarErrorReferenciaMapaMezzanine() {
    CONFIGURACIONES_MAPA_CALOR.Mezzanine = null;
    mostrarMensajeMapaCalor(
        "No fue posible cargar la referencia de ubicaciones Mezzanine.",
        "error"
    );
}

function obtenerTiposUbicacionMezzanine(ubicacion, codigoFrente = "") {
    if (!referenciaMezzanineCache) {
        return [];
    }

    const normalizada = normalizarUbicacionMezzanine(ubicacion);
    const tipoExacto = referenciaMezzanineCache.ubicacionesMapa.get(
        normalizada
    );

    if (Number.isInteger(tipoExacto)) {
        return [tipoExacto];
    }

    const porNivel = referenciaMezzanineCache.tiposPorNivel.get(
        obtenerClaveNivelMezzanine(normalizada)
    );

    if (porNivel) {
        return [...porNivel];
    }

    const detalle = referenciaMezzanineCache.frentesDetalle.get(
        codigoFrente
    );

    if (detalle) {
        return [...detalle.tipos];
    }

    // AVERIAS, PISOX/Y o un tubo que no está en el maestro: tipos de su zona.
    return [...(referenciaMezzanineCache.tiposPorZona.get(codigoFrente) || [])];
}

function obtenerFilasMapaFiltradas() {
    const tipoReporte = obtenerTipoReporteMapaCalor();
    const esTraceWis = tipoReporte === TIPO_REPORTE_TRACE_WIS;
    const operativa = obtenerValorMapa("filtro-operativa-pickeos");
    const esMezzanine = obtenerMapaCalorSeleccionado() === MAPA_MEZZANINE;
    const desde = obtenerValorMapa("filtro-desde-reportes");
    const hasta = obtenerValorMapa("filtro-hasta-reportes");
    const pisosMezzanine = obtenerPisosVisiblesMapaMezzanine();
    const tipoMezzanine = obtenerValorMapa(
        "filtro-tipo-ubicacion-mapa"
    ) || "Todos";
    const operacionTrace = esTraceWis
        ? obtenerValorMapa("filtro-operacion-trace-wis") ||
            TODAS_OPERACIONES_TRACE_WIS
        : TODAS_OPERACIONES_TRACE_WIS;

    if (desde && hasta && desde > hasta) {
        return [];
    }

    return filasMapaCalorCache.filter((fila) => {
        const esProductivo = !esTraceWis || (
            typeof esMovimientoUbicacionMapaTraceWis === "function" &&
            esMovimientoUbicacionMapaTraceWis(fila)
        );
        const coincideOperacion = !esTraceWis ||
            operacionTrace === TODAS_OPERACIONES_TRACE_WIS ||
            obtenerClaveOperacionTraceWis(fila) === operacionTrace;
        const coincideMezzanine = !esMezzanine || (
            coincidePisosMapaMezzanine(
                fila.codigoUbicacion,
                pisosMezzanine
            ) &&
            coincideTipoMapaMezzanine(
                fila,
                tipoMezzanine
            )
        );

        return esProductivo &&
            coincideOperacion &&
            filaCoincideOperativaMapa(fila, operativa) &&
            Boolean(fila.codigoUbicacion) &&
            coincideMezzanine &&
            (!desde || fila.fechaDia >= desde) &&
            (!hasta || fila.fechaDia <= hasta);
    });
}

function coincidePisosMapaMezzanine(codigo, pisos) {
    const seleccionados = Array.isArray(pisos) && pisos.length
        ? pisos
        : PISOS_MAPA_MEZZANINE;

    const pisoZona = referenciaMezzanineCache?.pisoPorZona.get(codigo);

    if (pisoZona !== undefined) {
        return !pisoZona || seleccionados.includes(pisoZona);
    }

    if (codigo === "AVERIAS") {
        return true;
    }

    if (codigo.startsWith("PISO")) {
        return seleccionados.includes(codigo.slice(-1));
    }

    return seleccionados.some((piso) => codigo.startsWith(`${piso}.`));
}

function coincideTipoMapaMezzanine(fila, tipo) {
    if (tipo === "Todos") {
        return true;
    }

    const indiceTipo = Number(tipo);
    return obtenerTiposUbicacionMezzanine(
        fila.ubicacionNormalizada || fila.ubicacion,
        fila.codigoUbicacion
    ).includes(indiceTipo);
}

function calcularInactividadMapa(configuracion, mapa, operativa) {
    const fechaReferencia = obtenerValorMapa("filtro-hasta-reportes") ||
        obtenerFechaActualMapa();
    const fechaLimite = restarMesesFechaMapa(
        fechaReferencia,
        MESES_INACTIVIDAD_MAPA
    );
    const tipoReporte = obtenerTipoReporteMapaCalor();
    const esTraceWis = tipoReporte === TIPO_REPORTE_TRACE_WIS;
    const operacionTrace = esTraceWis
        ? obtenerValorMapa("filtro-operacion-trace-wis") ||
            TODAS_OPERACIONES_TRACE_WIS
        : TODAS_OPERACIONES_TRACE_WIS;
    const pisosMezzanine = obtenerPisosVisiblesMapaMezzanine();
    const tipoMezzanine = obtenerValorMapa(
        "filtro-tipo-ubicacion-mapa"
    ) || "Todos";
    /*
     * Reportes lee solo las fechas de la consulta. Sin todo el historial no
     * se sabe si una ubicación sin movimientos en lo leído se movió alguna
     * vez antes: cuenta como inactiva (seguro no se movió en los 3 meses),
     * no como "nunca movida".
     */
    const historialParcial = esTraceWis &&
        typeof traceWisCargadoCubre === "function" &&
        !traceWisCargadoCubre();
    const claveCache = [
        tipoReporte,
        mapa,
        operativa,
        operacionTrace,
        pisosMezzanine.join(","),
        tipoMezzanine,
        fechaReferencia,
        filasMapaCalorCache.length,
        historialParcial
    ].join("|");

    if (!configuracion) {
        return {
            habilitado: false,
            motivo: "sin-plano",
            codigos: new Set(),
            nunca: new Set(),
            ultimasFechas: new Map(),
            fechaLimite,
            fechaReferencia,
            fechaMasAntigua: ""
        };
    }

    if (
        cacheInactividadMapa.clave === claveCache &&
        cacheInactividadMapa.resultado
    ) {
        return cacheInactividadMapa.resultado;
    }

    const ultimasFechas = new Map();
    // Ubicaciones con algún movimiento en todo el historial importado (sin
    // tope de fecha): las que no figuran nunca se movieron.
    const conMovimiento = new Set();
    /*
     * Lo mismo por altura (piso + calle + módulo + altura, "Z1908040"): el
     * 3D dibuja cada altura y el detalle lista cada ubicación, y una altura
     * puede no haberse movido nunca aunque su módulo sí.
     */
    const nivelesConMovimiento = new Set();
    const ultimasFechasNivel = new Map();
    let fechaMasAntigua = "";

    filasMapaCalorCache.forEach((fila) => {
        if (
            !filaCoincideOperativaMapa(fila, operativa) ||
            !fila.codigoUbicacion ||
            !fila.fechaDia
        ) {
            return;
        }

        if (
            esTraceWis && (
                !esMovimientoUbicacionMapaTraceWis(fila) ||
                (
                    operacionTrace !== TODAS_OPERACIONES_TRACE_WIS &&
                    obtenerClaveOperacionTraceWis(fila) !== operacionTrace
                )
            )
        ) {
            return;
        }

        if (
            mapa === MAPA_MEZZANINE && (
                !coincidePisosMapaMezzanine(
                    fila.codigoUbicacion,
                    pisosMezzanine
                ) ||
                !coincideTipoMapaMezzanine(fila, tipoMezzanine)
            )
        ) {
            return;
        }

        conMovimiento.add(fila.codigoUbicacion);
        const nivel = mapa === MAPA_MEZZANINE
            ? obtenerClaveNivelMezzanine(normalizarUbicacionMezzanine(fila.ubicacion))
            : "";

        if (nivel) {
            nivelesConMovimiento.add(nivel);
        }

        if (fila.fechaDia > fechaReferencia) {
            return;
        }

        if (!fechaMasAntigua || fila.fechaDia < fechaMasAntigua) {
            fechaMasAntigua = fila.fechaDia;
        }

        const ultima = ultimasFechas.get(fila.codigoUbicacion);

        if (!ultima || fila.fechaDia > ultima) {
            ultimasFechas.set(fila.codigoUbicacion, fila.fechaDia);
        }

        const ultimaNivel = nivel ? ultimasFechasNivel.get(nivel) : "";

        if (nivel && (!ultimaNivel || fila.fechaDia > ultimaNivel)) {
            ultimasFechasNivel.set(nivel, fila.fechaDia);
        }
    });

    const historialSuficiente = Boolean(
        configuracion &&
        fechaMasAntigua &&
        fechaMasAntigua <= fechaLimite
    );
    const codigos = new Set();
    const nunca = new Set();
    const candidatas = obtenerCodigosVisiblesMapa(configuracion)
        .filter((codigo) => {
            return esUbicacionCandidataInactividadMapa(codigo, configuracion);
        });

    /*
     * "Nunca" no depende de los 3 meses: alcanza con que haya historial
     * importado. La inactividad (último movimiento hace 3 meses o más) sí
     * necesita historial desde la fecha límite.
     */
    candidatas.forEach((codigo) => {
        if (!conMovimiento.has(codigo)) {
            if (historialParcial) {
                if (historialSuficiente) {
                    codigos.add(codigo);
                }
            } else if (conMovimiento.size) {
                nunca.add(codigo);
            }
            return;
        }

        const ultima = ultimasFechas.get(codigo);

        if (historialSuficiente && (!ultima || ultima <= fechaLimite)) {
            codigos.add(codigo);
        }
    });

    const resultado = {
        habilitado: historialSuficiente,
        parcial: historialParcial,
        codigos,
        nunca,
        conMovimiento,
        ultimasFechas,
        nivelesConMovimiento,
        ultimasFechasNivel,
        fechaLimite,
        fechaReferencia,
        fechaMasAntigua
    };
    cacheInactividadMapa = { clave: claveCache, resultado };
    return resultado;
}

/*
 * Inactividad de un conjunto de alturas (claves "Z1908040"): un bloque de la
 * vista 3D o una ubicación del detalle. "nunca" si ninguna se movió en todo
 * el historial; "inactiva" si su último movimiento fue hace 3 meses o más.
 * `ultima` es la fecha del último movimiento hasta el fin del período.
 */
function obtenerInactividadNivelesMapa(claves) {
    const estado = estadoInactividadMapaActual;
    const validas = claves.filter(Boolean);

    if (!validas.length || !estado.nivelesConMovimiento?.size) {
        return { estado: "", ultima: "" };
    }

    if (!validas.some((clave) => estado.nivelesConMovimiento.has(clave))) {
        // Con el historial parcial no se sabe si alguna vez se movió.
        if (estado.parcial) {
            return { estado: estado.habilitado ? "inactiva" : "", ultima: "" };
        }

        return { estado: "nunca", ultima: "" };
    }

    const ultima = validas
        .map((clave) => estado.ultimasFechasNivel.get(clave) || "")
        .sort()
        .pop();

    return {
        estado: estado.habilitado && (!ultima || ultima <= estado.fechaLimite)
            ? "inactiva"
            : "",
        ultima
    };
}

function esUbicacionCandidataInactividadMapa(codigo, configuracion) {
    if (esZonaPisoMapa(codigo, configuracion)) {
        return false;
    }

    return !(configuracion?.zonasEspeciales || []).some((zona) => {
        return zona.codigo === codigo;
    });
}

function obtenerFechaActualMapa() {
    const hoy = new Date();
    return [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0")
    ].join("-");
}

function restarMesesFechaMapa(valor, meses) {
    const [ano, mes, dia] = String(valor).split("-").map(Number);
    const primerDiaDestino = new Date(ano, mes - 1 - meses, 1);
    const ultimoDiaDestino = new Date(
        primerDiaDestino.getFullYear(),
        primerDiaDestino.getMonth() + 1,
        0
    ).getDate();
    const fecha = new Date(
        primerDiaDestino.getFullYear(),
        primerDiaDestino.getMonth(),
        Math.min(dia, ultimoDiaDestino)
    );
    return [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, "0"),
        String(fecha.getDate()).padStart(2, "0")
    ].join("-");
}

function mostrarMapaCalor() {
    const operativa = obtenerValorMapa("filtro-operativa-pickeos") ||
        TODAS_LAS_OPERATIVAS;
    sincronizarMapaConOperativa(operativa);
    const mapa = obtenerMapaCalorSeleccionado();
    actualizarControlesMapaMezzanine(mapa);
    asegurarCodigosFilasMapa(mapa);

    if (mapa === MAPA_MEZZANINE && !referenciaMezzanineCache) {
        mostrarCargaMapaMezzanine();
        asegurarReferenciaMapaMezzanine()
            .then(() => mostrarMapaCalor())
            .catch((error) => {
                console.error(error);
                mostrarErrorReferenciaMapaMezzanine();
            });
        return;
    }

    const configuracion = CONFIGURACIONES_MAPA_CALOR[mapa];
    const filas = obtenerFilasMapaFiltradas();
    const conteos = sumarMetricaPorUbicacion(filas);
    visitasPorUbicacionMapaActual = contarVisitasPorUbicacion(filas);
    ubicacionesWisMapaActual = agruparUbicacionesWisMapa(filas);
    estadoInactividadMapaActual = periodoMapaCalorEsValido()
        ? calcularInactividadMapa(configuracion, mapa, operativa)
        : {
            habilitado: false,
            codigos: new Set(),
            nunca: new Set(),
            ultimasFechas: new Map(),
            fechaLimite: "",
            fechaReferencia: ""
        };
    const titulo = document.getElementById("titulo-plano-mapa");
    const detalle = document.getElementById("detalle-ubicacion-mapa");
    const actividad = obtenerNombreActividadMapa();
    const contextoOperacion = obtenerDescripcionOperacionMapa();
    const contextoMezzanine = mapa === MAPA_MEZZANINE
        ? ` · ${obtenerDescripcionFiltrosMapaMezzanine()}`
        : "";
    const contextoOperativa = operativa === TODAS_LAS_OPERATIVAS ||
        operativa === mapa
        ? ""
        : ` · ${operativa}`;
    const esTraceWis = obtenerTipoReporteMapaCalor() ===
        TIPO_REPORTE_TRACE_WIS;

    if (titulo) {
        titulo.textContent = `${actividad} · ` +
            `${mapa}${contextoMezzanine}${contextoOperativa}` +
            contextoOperacion;
    }

    if (detalle) {
        detalle.textContent = configuracion
            ? `Pasá el cursor para consultar ${esTraceWis
                ? "las unidades"
                : "los movimientos"} del ${actividad}.`
            : "Los datos están clasificados; falta incorporar el plano físico.";
    }

    actualizarResumenMapaCalor(
        conteos,
        configuracion,
        visitasPorUbicacionMapaActual
    );
    actualizarEstadoFuenteMapa(filas, conteos, configuracion, mapa);
    actualizarIndicadorInactividadMapa(estadoInactividadMapaActual);

    if (!periodoMapaCalorEsValido()) {
        mostrarMensajeMapaCalor(
            "La fecha desde no puede ser posterior a la fecha hasta.",
            "error"
        );
        renderizarPlanoMapaCalor(configuracion, new Map(), mapa);
        notificarMapaCalor3D(mapa, configuracion, []);
        return;
    }

    mostrarMensajeMapaCalor("", "");
    renderizarPlanoMapaCalor(configuracion, conteos, mapa);
    aplicarMetricaVisualMapa();
    actualizarResumenComparacionMapa(conteos);
    notificarMapaCalor3D(mapa, configuracion, filas);
}

function notificarMapaCalor3D(mapa, configuracion, filas) {
    if (typeof actualizarMapaCalor3D === "function") {
        actualizarMapaCalor3D({ mapa, configuracion, filas });
    }
}

function actualizarIndicadorInactividadMapa(estadoInactividad) {
    const indicador = document.getElementById("estado-inactividad-mapa");
    const indicadorNunca = document.getElementById("estado-nunca-mapa");

    if (indicadorNunca) {
        const cantidad = estadoInactividad.nunca?.size || 0;
        indicadorNunca.textContent = estadoInactividad.parcial
            ? "Nunca movidas · requiere historial completo"
            : cantidad
                ? `${cantidad.toLocaleString("es-UY")} ubicaciones nunca movidas`
                : "Nunca movidas";
        indicadorNunca.title = estadoInactividad.parcial
            ? "Consultá con «Incluir historial completo» para separarlas: " +
                "mientras tanto, las ubicaciones sin movimientos se cuentan " +
                "como inactivas."
            : "";
    }

    if (!indicador) {
        return;
    }

    if (!estadoInactividad.fechaLimite) {
        indicador.textContent = "Inactividad de 3 meses";
        indicador.title = "Seleccioná un período válido para evaluar.";
        return;
    }

    if (estadoInactividad.motivo === "sin-plano") {
        indicador.textContent = "Inactividad · plano pendiente";
        indicador.title =
            "La operativa todavía no tiene un plano físico configurado.";
        return;
    }

    if (!estadoInactividad.habilitado) {
        indicador.textContent = "Inactividad · historial insuficiente";
        indicador.title =
            `Se necesitan movimientos desde el ` +
            `${formatearFechaMapa(estadoInactividad.fechaLimite)} o antes.`;
        return;
    }

    indicador.textContent =
        `${estadoInactividad.codigos.size.toLocaleString("es-UY")} ` +
        "ubicaciones sin movimiento en 3 meses";
    indicador.title =
        `Sin movimientos posteriores al ` +
        `${formatearFechaMapa(estadoInactividad.fechaLimite)}. ` +
        "Candidatas a reubicación.";
}

function obtenerDescripcionOperacionMapa() {
    if (obtenerTipoReporteMapaCalor() !== TIPO_REPORTE_TRACE_WIS) {
        return "";
    }

    const operacion = obtenerValorMapa(
        "filtro-operacion-trace-wis"
    ) || TODAS_OPERACIONES_TRACE_WIS;
    return operacion === TODAS_OPERACIONES_TRACE_WIS
        ? " · Todas las tareas"
        : ` · ${obtenerEtiquetaClaveOperacionTraceWis(operacion)}`;
}

function obtenerDescripcionFiltrosMapaMezzanine() {
    const pisos = obtenerPisosVisiblesMapaMezzanine();
    const tipo = obtenerValorMapa("filtro-tipo-ubicacion-mapa") || "Todos";
    const etiquetaPisos = modoVistaPisosMapa === "todos"
        ? "Todos los pisos"
        : modoVistaPisosMapa === "comparar"
            ? `Comparación ${pisos.join(" vs. ")}`
            : `Piso ${pisos[0]}`;
    const partes = [etiquetaPisos];

    if (
        tipo !== "Todos" &&
        referenciaMezzanineCache?.tipos[Number(tipo)]
    ) {
        partes.push(obtenerEtiquetaTipoUbicacionMapa(
            referenciaMezzanineCache.tipos[Number(tipo)]
        ));
    }

    return partes.join(" · ");
}

function sumarMetricaPorUbicacion(filas) {
    const conteos = new Map();

    filas.forEach((fila) => {
        const valor = obtenerValorFilaMapa(fila);

        if (!valor) {
            return;
        }

        conteos.set(
            fila.codigoUbicacion,
            (conteos.get(fila.codigoUbicacion) || 0) + valor
        );
    });

    return conteos;
}

function contarVisitasPorUbicacion(filas) {
    const visitas = new Map();

    filas.forEach((fila) => {
        visitas.set(
            fila.codigoUbicacion,
            (visitas.get(fila.codigoUbicacion) || 0) + 1
        );
    });

    return visitas;
}

/* Por frente, las unidades y visitas de cada ubicación WIS real. */
function agruparUbicacionesWisMapa(filas) {
    const porFrente = new Map();

    filas.forEach((fila) => {
        const frente = fila.codigoUbicacion;
        const ubicacion = normalizarUbicacionMezzanine(fila.ubicacion);

        if (!frente || !ubicacion) {
            return;
        }

        if (!porFrente.has(frente)) {
            porFrente.set(frente, new Map());
        }

        const delFrente = porFrente.get(frente);
        const actual = delFrente.get(ubicacion) || { valor: 0, visitas: 0 };
        actual.valor += obtenerValorFilaMapa(fila);
        actual.visitas += 1;
        delFrente.set(ubicacion, actual);
    });

    return porFrente;
}

/*
 * Ubicaciones WIS reales de un frente (piso · calle · módulo) o de una zona
 * especial: las del maestro más las que tuvieron movimientos sin estar en
 * él, con sus unidades y visitas en la selección, ordenadas por altura.
 * `alturas` las acota a esas alturas físicas (un bloque de la vista 3D).
 */
function obtenerUbicacionesWisFrenteMapa(codigoFrente, alturas = null) {
    const movidas = ubicacionesWisMapaActual.get(codigoFrente) || new Map();
    const codigos = new Set([
        ...(referenciaMezzanineCache?.ubicacionesPorFrente?.get(codigoFrente) || []),
        ...movidas.keys()
    ]);

    return [...codigos]
        .map((codigo) => {
            const coincidencia = codigo.match(PATRON_UBICACION_MEZZANINE);
            const metrica = movidas.get(codigo) || { valor: 0, visitas: 0 };

            return {
                codigo,
                altura: coincidencia ? obtenerAlturaMezzanine(coincidencia[4]) : "",
                valor: metrica.valor,
                visitas: metrica.visitas
            };
        })
        .filter((ubicacion) => !alturas || alturas.includes(ubicacion.altura))
        .sort((a, b) => {
            return a.altura.localeCompare(b.altura, "es", { numeric: true }) ||
                a.codigo.localeCompare(b.codigo);
        });
}

/* La casilla "Fuera del plano" reúne varias zonas: solo lista las que se movieron. */
function obtenerUbicacionesWisCeldaMapa(celda) {
    if (celda.dataset.frentes) {
        return celda.dataset.frentes
            .split(",")
            .flatMap((codigo) => obtenerUbicacionesWisFrenteMapa(codigo))
            .filter((ubicacion) => ubicacion.valor || ubicacion.visitas);
    }

    return obtenerUbicacionesWisFrenteMapa(celda.dataset.codigo || "");
}

/*
 * Escribe el detalle de una casilla o bloque: el texto y, debajo, los
 * códigos WIS reales de sus ubicaciones, cada uno con su altura, unidades y
 * visitas. Si son muchas, se listan las de más actividad.
 */
function escribirDetalleUbicacionMapa(texto, ubicaciones = []) {
    const detalle = document.getElementById("detalle-ubicacion-mapa");

    if (!detalle) {
        return;
    }

    detalle.textContent = "";
    const resumen = document.createElement("span");
    resumen.className = "texto-detalle-ubicacion-mapa";
    resumen.textContent = texto;
    detalle.appendChild(resumen);

    if (!ubicaciones.length) {
        return;
    }

    const visibles = ubicaciones.length > MAXIMO_UBICACIONES_DETALLE_MAPA
        ? [...ubicaciones]
            .sort((a, b) => b.valor - a.valor || b.visitas - a.visitas)
            .slice(0, MAXIMO_UBICACIONES_DETALLE_MAPA)
        : ubicaciones;
    const lista = document.createElement("ul");
    lista.className = "ubicaciones-wis-mapa";
    lista.setAttribute("aria-label", "Ubicaciones WIS");

    visibles.forEach((ubicacion) => {
        const item = document.createElement("li");
        const conMovimiento = Boolean(ubicacion.valor || ubicacion.visitas);
        // Sin movimiento en la selección: se aclara si nunca se movió o desde cuándo.
        const inactividad = conMovimiento
            ? { estado: "", ultima: "" }
            : obtenerInactividadNivelesMapa([obtenerClaveNivelMezzanine(ubicacion.codigo)]);
        item.dataset.actividad = conMovimiento ? "con" : inactividad.estado || "sin";
        const codigo = document.createElement("code");
        codigo.textContent = ubicacion.codigo;
        const metrica = document.createElement("span");
        metrica.textContent = (ubicacion.altura ? `Altura ${ubicacion.altura} · ` : "") +
            (conMovimiento
                ? describirValorCeldaMapa(ubicacion.valor, ubicacion.visitas)
                : describirInactividadUbicacionMapa(inactividad));
        item.append(codigo, metrica);
        lista.appendChild(item);
    });

    if (ubicaciones.length > visibles.length) {
        const resto = document.createElement("li");
        resto.className = "resto-ubicaciones-wis-mapa";
        resto.textContent = `y ${(ubicaciones.length - visibles.length).toLocaleString("es-UY")} ` +
            "ubicaciones más";
        lista.appendChild(resto);
    }

    detalle.appendChild(lista);
}

function describirInactividadUbicacionMapa(inactividad) {
    if (inactividad.estado === "nunca") {
        return "nunca se movió · candidata a reubicación";
    }

    if (inactividad.estado === "inactiva") {
        return (inactividad.ultima
            ? `sin movimientos desde el ${formatearFechaMapa(inactividad.ultima)}`
            : "sin movimientos en 3 meses") +
            " · candidata a reubicación";
    }

    return inactividad.ultima
        ? `sin movimientos en el período · último: ${formatearFechaMapa(inactividad.ultima)}`
        : "sin movimientos en la selección";
}

function obtenerValorFilaMapa(fila) {
    if (obtenerTipoReporteMapaCalor() !== TIPO_REPORTE_TRACE_WIS) {
        return 1;
    }

    const movimiento = Number(fila.movimiento ?? fila.cantidad ?? 0);
    return Number.isFinite(movimiento) ? Math.abs(movimiento) : 0;
}

function obtenerEtiquetaMetricaMapa(enUbicacion = false) {
    if (obtenerTipoReporteMapaCalor() === TIPO_REPORTE_TRACE_WIS) {
        return enUbicacion ? "unidades en ubicación" : "unidades";
    }

    return "movimientos";
}

function formatearVisitasMapa(cantidad) {
    return `${cantidad.toLocaleString("es-UY")} ` +
        (cantidad === 1 ? "visita" : "visitas");
}

function describirValorCeldaMapa(valor, visitas) {
    const metrica = `${valor.toLocaleString("es-UY")} ` +
        obtenerEtiquetaMetricaMapa();

    if (obtenerTipoReporteMapaCalor() !== TIPO_REPORTE_TRACE_WIS) {
        return metrica;
    }

    return `${metrica} · ${formatearVisitasMapa(visitas)}`;
}

/*
 * Solo se resumen visitas y cobertura: sumar unidades de tareas distintas
 * (picking, guardado, las dos patas de una transferencia) no tiene lectura
 * operativa, y la "ubicación con más actividad" es una consulta puntual.
 */
function actualizarResumenMapaCalor(conteos, configuracion, visitasPorUbicacion) {
    const codigosPlano = configuracion
        ? obtenerCodigosVisiblesMapa(configuracion)
        : [];
    const visitadasEnPlano = configuracion
        ? codigosPlano.filter((codigo) => conteos.has(codigo)).length
        : 0;
    const cobertura = configuracion && codigosPlano.length
        ? (visitadasEnPlano / codigosPlano.length) * 100
        : null;
    const totalVisitas = [...visitasPorUbicacion.values()]
        .reduce((total, cantidad) => total + cantidad, 0);

    ultimoResumenMapaCalor = {
        totalVisitas,
        visitadasEnPlano,
        totalPlano: codigosPlano.length,
        cobertura
    };
    actualizarTexto(
        "ubicaciones-visitadas-mapa",
        totalVisitas.toLocaleString("es-UY")
    );
    actualizarTexto(
        "cobertura-mapa",
        cobertura === null
            ? "Pendiente"
            : `${cobertura.toLocaleString("es-UY", {
                maximumFractionDigits: 1
            })}%`
    );
    actualizarTexto(
        "detalle-cobertura-mapa",
        configuracion
            ? `${visitadasEnPlano.toLocaleString("es-UY")} de ` +
                `${codigosPlano.length.toLocaleString("es-UY")} ubicaciones visibles con movimiento`
            : "Plano pendiente"
    );
}

/* Cálculo de las tarjetas del mapa para el botón "?" (lo muestra dashboards.js). */
function obtenerCalculoResumenMapaCalor(clave) {
    const resumen = ultimoResumenMapaCalor;

    if (!resumen || !["visitasMapa", "coberturaMapa"].includes(clave)) {
        return null;
    }

    const entero = (valor) => valor.toLocaleString("es-UY");
    const contexto = `${describirPeriodoMapaCalor()} · Mapa ${obtenerMapaCalorSeleccionado()}` +
        (obtenerMapaCalorSeleccionado() === MAPA_MEZZANINE
            ? ` · ${obtenerDescripcionFiltrosMapaMezzanine()}`
            : "") +
        obtenerDescripcionOperacionMapa();

    if (clave === "visitasMapa") {
        return {
            titulo: "Visitas en el plano",
            formula: "Visitas en el plano = cantidad de filas del Trace WIS con una " +
                "ubicación de los pisos visibles.",
            operacion: [
                `${entero(resumen.totalVisitas)} filas con ubicación en los pisos ` +
                    `visibles = ${entero(resumen.totalVisitas)} visitas`
            ],
            nota: "Cada fila suma una visita, aunque sea de otra altura del mismo " +
                "módulo. Cuentan solo las tareas que participan del mapa, con la " +
                "operativa, el período, la tarea, el tipo de ubicación y los pisos elegidos.",
            contexto
        };
    }

    return {
        titulo: "Cobertura",
        formula: "Cobertura = módulos y zonas visibles con movimiento ÷ módulos y " +
            "zonas visibles del plano × 100.",
        operacion: [
            resumen.cobertura === null
                ? "El plano de este mapa todavía está pendiente."
                : `${entero(resumen.visitadasEnPlano)} ÷ ${entero(resumen.totalPlano)} × 100 = ` +
                    `${resumen.cobertura.toLocaleString("es-UY", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                    })} %`
        ],
        nota: "Cada módulo (piso, calle y módulo) agrupa todas sus alturas. Las " +
            "posiciones sin referencia maestra no cuentan.",
        contexto
    };
}

function esZonaPisoMapa(codigo, configuracion) {
    const codigoNormalizado = normalizarTextoReporte(codigo);
    const etiquetaNormalizada = normalizarTextoReporte(
        obtenerEtiquetaCodigoMapa(codigo, configuracion)
    );
    return codigoNormalizado.startsWith("piso") ||
        etiquetaNormalizada.startsWith("piso");
}

function actualizarEstadoFuenteMapa(filas, conteos, configuracion, mapa) {
    const estado = document.getElementById("estado-fuente-mapa");

    if (!estado) {
        return;
    }

    const archivos = new Set(filas.map((fila) => fila.importacionId));
    const esTraceWis = obtenerTipoReporteMapaCalor() ===
        TIPO_REPORTE_TRACE_WIS;
    const totalMapa = [...conteos.values()].reduce((total, valor) => {
        return total + valor;
    }, 0);
    const totalVisitas = [...visitasPorUbicacionMapaActual.values()]
        .reduce((total, cantidad) => total + cantidad, 0);
    let texto = `${obtenerNombreActividadMapa()} · ` +
        `${(esTraceWis ? totalMapa : filas.length).toLocaleString("es-UY")} ` +
        `${obtenerEtiquetaMetricaMapa(esTraceWis)} · ` +
        (esTraceWis ? `${formatearVisitasMapa(totalVisitas)} · ` : "") +
        `${archivos.size.toLocaleString("es-UY")} archivos · ` +
        describirPeriodoMapaCalor();

    if (esTraceWis) {
        texto += obtenerDescripcionOperacionMapa();
    }

    if (configuracion) {
        const codigosPlano = new Set(obtenerCodigosVisiblesMapa(
            configuracion
        ));
        const fueraDelPlano = [...conteos.keys()].filter((codigo) => {
            return !codigosPlano.has(codigo);
        }).length;

        if (fueraDelPlano) {
            const sustantivoUbicacion = fueraDelPlano === 1
                ? "ubicación"
                : "ubicaciones";
            texto += configuracion.tipoMapa === "mezzanine"
                ? ` · ${fueraDelPlano} ${sustantivoUbicacion} ` +
                    "sin referencia maestra"
                : ` · ${fueraDelPlano} ${sustantivoUbicacion} fuera del plano`;
        }

        if (configuracion.tipoMapa === "mezzanine") {
            texto += ` · ${obtenerDescripcionFiltrosMapaMezzanine()}`;
        }
    } else {
        texto = `${texto} · Plano de ${mapa} pendiente`;
    }

    estado.textContent = texto;
}

function renderizarPlanoMapaCalor(configuracion, conteos, mapa) {
    const contenedor = document.getElementById("mapa-calor-contenedor");
    const scroll = document.getElementById("mapa-calor-scroll");
    const vacio = document.getElementById("mapa-calor-vacio");

    if (!contenedor || !scroll || !vacio) {
        return;
    }

    contenedor.innerHTML = "";
    contenedor.style.zoom = String(zoomMapaActual);

    if (!configuracion) {
        scroll.hidden = true;
        vacio.hidden = false;
        vacio.innerHTML = `
            <strong>Plano de ${mapa} pendiente</strong>
            <span>
                El mapa de calor de esta operativa se habilitará cuando se
                incorpore su maestro de ubicaciones.
            </span>
        `;
        return;
    }

    vacio.hidden = true;
    scroll.hidden = false;
    contenedor.classList.add("plano-calor-mezzanine");

    const referencia = obtenerReferenciaEscalaMapa(configuracion, conteos);
    const totalVisitas = [...conteos.values()].reduce((total, cantidad) => {
        return total + cantidad;
    }, 0);

    renderizarPlanoMapaMezzanine(
        contenedor,
        configuracion,
        conteos,
        referencia,
        totalVisitas
    );
}

function renderizarPlanoMapaMezzanine(
    contenedor,
    configuracion,
    conteos,
    referenciaEscala,
    totalVisitas
) {
    const codigosVisibles = new Set(
        obtenerCodigosVisiblesMapa(configuracion)
    );

    const zonasEspecialesVisibles = configuracion.zonasEspeciales
        .filter((zona) => codigosVisibles.has(zona.codigo));

    // Solo se muestra cuando hay actividad que el plano no puede dibujar.
    if (
        zonasEspecialesVisibles.length &&
        resumirZonasEspecialesMapa(zonasEspecialesVisibles, conteos).valor > 0
    ) {
        contenedor.appendChild(crearZonaConsolidadaMapa(
            zonasEspecialesVisibles,
            conteos,
            referenciaEscala,
            totalVisitas
        ));
    }

    const pisos = obtenerPisosVisiblesMapaMezzanine();
    const destinoPisos = modoVistaPisosMapa === "comparar"
        ? document.createElement("div")
        : contenedor;

    if (modoVistaPisosMapa === "comparar") {
        destinoPisos.className = "comparacion-pisos-mapa";
        contenedor.appendChild(destinoPisos);
    }

    pisos.forEach((piso) => {
        const frentes = obtenerFrentesVisualesMapaMezzanine(
            piso,
            codigosVisibles
        );
        destinoPisos.appendChild(crearPisoMapaMezzanine(
            piso,
            frentes,
            conteos,
            referenciaEscala,
            totalVisitas
        ));
    });
}

function obtenerFrentesVisualesMapaMezzanine(piso, codigosVisibles) {
    const tipo = obtenerValorMapa("filtro-tipo-ubicacion-mapa") || "Todos";
    const existentes = referenciaMezzanineCache.frentesDetalle;

    if (tipo !== "Todos") {
        return [...existentes.values()]
            .filter((detalle) => {
                return detalle.piso === piso &&
                    codigosVisibles.has(detalle.codigo);
            })
            .sort(ordenarFrentesMapaMezzanine);
    }

    const frentes = [];

    CALLES_PLANO_COMPLETO_MEZZANINE.forEach((calle) => {
        MODULOS_PLANO_COMPLETO_MEZZANINE.forEach((numeroModulo) => {
            const modulo = String(numeroModulo).padStart(3, "0");
            const codigo = `${piso}.${calle}.${modulo}`;
            const existente = existentes.get(codigo);
            frentes.push(existente || {
                codigo,
                piso,
                calle,
                modulo,
                tipos: new Set(),
                alturas: new Set(),
                ubicaciones: 0,
                estructural: true
            });
        });
    });

    return frentes;
}

function ordenarFrentesMapaMezzanine(a, b) {
    return a.calle.localeCompare(b.calle, "es", { numeric: true }) ||
        a.modulo.localeCompare(b.modulo, "es", { numeric: true });
}

function crearPisoMapaMezzanine(
    piso,
    frentes,
    conteos,
    referenciaEscala,
    totalVisitas
) {
    const nombresPisos = {
        X: "Piso cero",
        Y: "Segundo piso",
        Z: "Tercer piso"
    };
    const seccion = document.createElement("section");
    seccion.className = "piso-mapa-mezzanine";
    const cabecera = document.createElement("div");
    cabecera.className = "cabecera-piso-mezzanine";
    const titulo = document.createElement("h4");
    titulo.textContent = `Piso ${piso} · ${nombresPisos[piso]}`;
    const calles = new Set(frentes.map((detalle) => detalle.calle));
    const resumen = document.createElement("span");
    const reales = frentes.filter((detalle) => !detalle.estructural).length;
    resumen.textContent = `${calles.size} calles · ` +
        `${frentes.length.toLocaleString("es-UY")} posiciones · ` +
        `${reales.toLocaleString("es-UY")} con referencia`;
    cabecera.append(titulo, resumen);
    seccion.appendChild(cabecera);

    const maximoModulo = Math.max(
        ...frentes.map((detalle) => Number(detalle.modulo))
    );
    const corredorCentral = CORREDORES_CENTRALES_MEZZANINE[piso] || null;
    const columnasPlano = obtenerColumnasPlanoMapaMezzanine(
        piso,
        maximoModulo
    );
    const porCalle = new Map();

    frentes.forEach((detalle) => {
        if (!porCalle.has(detalle.calle)) {
            porCalle.set(detalle.calle, []);
        }
        porCalle.get(detalle.calle).push(detalle);
    });

    porCalle.forEach((modulos, calle) => {
        const fila = document.createElement("div");
        fila.className = "fila-calle-mezzanine";
        const etiqueta = document.createElement("strong");
        etiqueta.textContent = `Calle ${calle}`;
        const cuadricula = document.createElement("div");
        cuadricula.className = "modulos-calle-mezzanine";
        cuadricula.dataset.piso = piso;
        cuadricula.style.setProperty(
            "--modulos-mezzanine",
            String(columnasPlano)
        );
        cuadricula.style.minWidth = `${columnasPlano * 4}px`;

        if (corredorCentral) {
            const corredor = document.createElement("span");
            corredor.className = "corredor-central-mezzanine";
            corredor.setAttribute("aria-hidden", "true");
            corredor.style.gridColumn =
                `${corredorCentral.despuesDe + 1} / ` +
                `span ${corredorCentral.ancho}`;
            cuadricula.appendChild(corredor);
        }

        modulos.forEach((detalle) => {
            const celda = crearCeldaMapaMezzanine(
                detalle,
                conteos,
                referenciaEscala,
                totalVisitas
            );
            const numeroModulo = Number(detalle.modulo);
            celda.style.gridColumn = String(
                obtenerColumnaModuloMapaMezzanine(piso, numeroModulo)
            );
            cuadricula.appendChild(celda);
        });

        fila.append(etiqueta, cuadricula);
        seccion.appendChild(fila);
    });

    return seccion;
}

function obtenerColumnasPlanoMapaMezzanine(piso, maximoModulo) {
    const corredor = CORREDORES_CENTRALES_MEZZANINE[piso];
    return maximoModulo + (
        corredor?.desplazarModulos ? corredor.ancho : 0
    );
}

function obtenerColumnaModuloMapaMezzanine(piso, numeroModulo) {
    const corredor = CORREDORES_CENTRALES_MEZZANINE[piso];
    const desplazamiento = corredor?.desplazarModulos &&
        numeroModulo > corredor.despuesDe
        ? corredor.ancho
        : 0;
    return numeroModulo + desplazamiento;
}

function crearCeldaMapaMezzanine(
    detalle,
    conteos,
    referenciaEscala,
    totalVisitas
) {
    const valor = conteos.get(detalle.codigo) || 0;
    const visitas = visitasPorUbicacionMapaActual.get(detalle.codigo) || 0;
    const porcentaje = totalVisitas ? (valor / totalVisitas) * 100 : 0;
    const celda = document.createElement("span");
    const tipos = [...detalle.tipos].map((indice) => {
        return obtenerEtiquetaTipoUbicacionMapa(
            referenciaMezzanineCache.tipos[indice]
        );
    });
    const etiqueta = `Piso ${detalle.piso} · Calle ${detalle.calle} · ` +
        `Módulo ${detalle.modulo}`;
    celda.className = "celda-calor celda-mezzanine";
    celda.classList.toggle("celda-estructural-mapa", Boolean(
        detalle.estructural
    ));
    celda.dataset.nivel = String(calcularNivelMapa(
        valor,
        referenciaEscala
    ));
    celda.dataset.codigo = detalle.codigo;
    celda.dataset.etiqueta = etiqueta;
    celda.dataset.valor = String(valor);
    celda.dataset.visitas = String(visitas);
    celda.dataset.porcentaje = porcentaje.toLocaleString("es-UY", {
        maximumFractionDigits: 1
    });
    celda.dataset.estructural = String(Boolean(detalle.estructural));
    celda.dataset.detalle = detalle.estructural
        ? "Posición estructural sin ubicación maestra"
        : `${detalle.alturas.size} alturas · ` +
            `${detalle.ubicaciones.toLocaleString("es-UY")} ubicaciones · ` +
            `${tipos.join(", ") || "Sin tipo"}`;
    // El tooltip empieza por los códigos WIS reales del módulo (Y030021020…).
    const codigosWis = obtenerUbicacionesWisFrenteMapa(detalle.codigo)
        .map((ubicacion) => ubicacion.codigo);
    celda.title = (codigosWis.length ? `${codigosWis.join(" · ")}\n` : "") +
        `${etiqueta}: ${describirValorCeldaMapa(valor, visitas)} ` +
        `· ${celda.dataset.detalle}`;
    if (!detalle.estructural) {
        aplicarEstadoInactividadCelda(celda, detalle.codigo);
    }
    return celda;
}

function resumirZonasEspecialesMapa(zonas, conteos) {
    const zonasConMetrica = zonas.map((zona) => {
        return {
            ...zona,
            valor: conteos.get(zona.codigo) || 0,
            visitas: visitasPorUbicacionMapaActual.get(zona.codigo) || 0
        };
    });
    const detallesActivos = zonasConMetrica.filter((zona) => {
        return zona.valor || zona.visitas;
    });

    return {
        valor: zonasConMetrica.reduce(
            (total, zona) => total + zona.valor,
            0
        ),
        visitas: zonasConMetrica.reduce(
            (total, zona) => total + zona.visitas,
            0
        ),
        detalles: detallesActivos.length ? detallesActivos : zonasConMetrica
    };
}

function crearZonaConsolidadaMapa(
    zonas,
    conteos,
    referencia,
    totalVisitas
) {
    const resumen = resumirZonasEspecialesMapa(zonas, conteos);
    const porcentaje = totalVisitas
        ? (resumen.valor / totalVisitas) * 100
        : 0;
    const bloque = document.createElement("div");
    bloque.className = "zona-especial-mapa zona-especial-consolidada";

    const etiqueta = document.createElement("strong");
    etiqueta.textContent = "Fuera del plano";
    bloque.appendChild(etiqueta);

    const celda = document.createElement("span");
    celda.className = "celda-calor celda-especial-calor";
    celda.dataset.nivel = String(calcularNivelMapa(
        resumen.valor,
        referencia
    ));
    celda.dataset.codigo = resumen.detalles
        .map((zona) => zona.codigo)
        .join(", ");
    celda.dataset.frentes = resumen.detalles
        .map((zona) => zona.codigo)
        .join(",");
    celda.dataset.etiqueta = "Ubicaciones fuera del plano";
    celda.dataset.valor = String(resumen.valor);
    celda.dataset.visitas = String(resumen.visitas);
    celda.dataset.porcentaje = porcentaje.toLocaleString("es-UY", {
        maximumFractionDigits: 1
    });
    celda.dataset.detalle = `${resumen.detalles.length} ubicaciones ` +
        "consolidadas";
    celda.title = "Ubicaciones fuera del plano: " +
        describirValorCeldaMapa(resumen.valor, resumen.visitas);
    bloque.appendChild(celda);

    const total = document.createElement("span");
    total.textContent = describirValorCeldaMapa(
        resumen.valor,
        resumen.visitas
    );
    bloque.appendChild(total);
    return bloque;
}

function obtenerCodigosVisiblesMapa(configuracion) {
    const codigos = configuracion.codigos || [];

    if (configuracion.tipoMapa !== "mezzanine") {
        return codigos;
    }

    const pisos = obtenerPisosVisiblesMapaMezzanine();
    const tipo = obtenerValorMapa("filtro-tipo-ubicacion-mapa") || "Todos";
    const indiceTipo = tipo === "Todos" ? null : Number(tipo);

    return codigos.filter((codigo) => {
        const zona = configuracion.zonasEspeciales.find((item) => {
            return item.codigo === codigo;
        });

        if (zona) {
            const coincidePiso =
                !zona.piso ||
                pisos.includes(zona.piso);
            const coincideTipo = indiceTipo === null ||
                zona.tipos.includes(indiceTipo);
            return coincidePiso && coincideTipo;
        }

        const detalle = referenciaMezzanineCache?.frentesDetalle.get(codigo);

        if (!detalle) {
            return false;
        }

        return pisos.includes(detalle.piso) &&
            (indiceTipo === null || detalle.tipos.has(indiceTipo));
    });
}

function obtenerEtiquetaCodigoMapa(codigo, configuracion) {
    const zona = (configuracion?.zonasEspeciales || []).find((item) => {
        return item.codigo === codigo;
    });
    return zona ? zona.nombre : codigo;
}

function obtenerReferenciaEscalaMapa(configuracion, conteos) {
    const valores = obtenerCodigosVisiblesMapa(configuracion)
        .map((codigo) => conteos.get(codigo) || 0)
        .filter((valor) => valor > 0)
        .sort((a, b) => a - b);

    if (!valores.length) {
        return 1;
    }

    const indicePercentil = Math.min(
        valores.length - 1,
        Math.floor(valores.length * 0.95)
    );
    return Math.max(1, valores[indicePercentil]);
}

function calcularNivelMapa(visitas, referencia) {
    if (!visitas) {
        return 0;
    }

    const proporcion = Math.min(1, visitas / Math.max(1, referencia));
    return Math.max(1, Math.ceil(Math.sqrt(proporcion) * 5));
}

/*
 * Tres estados para una posición sin actividad:
 * - data-inactiva="nunca": ningún movimiento en todo el historial importado
 *   (violeta oscuro).
 * - data-inactiva="true": su último movimiento fue hace 3 meses o más (violeta).
 * - sin marca y nivel 0: se movió hace menos de 3 meses, pero no en el
 *   período elegido (gris); el detalle informa su último movimiento.
 */
function aplicarEstadoInactividadCelda(celda, codigo) {
    const estado = estadoInactividadMapaActual;

    if (estado.nunca?.has(codigo)) {
        celda.dataset.inactiva = "nunca";
        celda.dataset.detalleInactividad =
            "Sin movimientos en todo el historial importado";
        celda.title += " · Nunca tuvo movimientos · Candidata a reubicación";
        return;
    }

    if (!estado.habilitado || !estado.codigos.has(codigo)) {
        const ultima = estado.ultimasFechas?.get(codigo);

        if (celda.dataset.valor !== "0") {
            return;
        }

        if (ultima) {
            celda.dataset.ultimaActividad = ultima;
            celda.title += ` · Sin movimientos en el período · ` +
                `Último movimiento: ${formatearFechaMapa(ultima)}`;
        } else if (estado.conMovimiento?.has(codigo) && estado.fechaReferencia) {
            // Empezó a moverse después de la fecha de referencia del período.
            celda.dataset.movimientoPosterior = "true";
            celda.title += ` · Sin movimientos hasta el ` +
                `${formatearFechaMapa(estado.fechaReferencia)} · ` +
                "Tuvo movimientos después";
        }
        return;
    }

    const ultimaActividad = estado.ultimasFechas.get(codigo) || "";
    const detalleInactividad = ultimaActividad
        ? `Último movimiento: ${formatearFechaMapa(ultimaActividad)}`
        : describirSinMovimientosHistorialMapa();
    celda.dataset.inactiva = "true";
    celda.dataset.ultimaActividad = ultimaActividad;
    celda.dataset.detalleInactividad = detalleInactividad;
    celda.title += ` · ${detalleInactividad} · Candidata a reubicación`;
}

/* Inactiva sin fecha de último movimiento: depende de cuánto historial se leyó. */
function describirSinMovimientosHistorialMapa() {
    const inicio = estadoInactividadMapaActual.parcial &&
        typeof obtenerInicioCargaTraceWis === "function"
        ? obtenerInicioCargaTraceWis()
        : "";

    return inicio
        ? `Sin movimientos desde el ${formatearFechaMapa(inicio)} ` +
            "(inicio de los datos consultados)"
        : "Sin movimientos registrados en el historial";
}

function mostrarDetalleCeldaMapa(evento) {
    const celda = evento.target.closest(".celda-calor");

    if (!celda || codigoSeleccionadoMapa) {
        return;
    }

    mostrarDetalleElementoMapa(celda);
}

function seleccionarCeldaMapa(evento) {
    const celda = evento.target.closest(".celda-calor");

    if (!celda) {
        limpiarSeleccionMapa();
        return;
    }

    const codigo = celda.dataset.codigo || "";

    if (codigoSeleccionadoMapa === codigo) {
        limpiarSeleccionMapa();
        return;
    }

    codigoSeleccionadoMapa = codigo;
    document.querySelectorAll(".celda-calor.seleccionada")
        .forEach((item) => item.classList.remove("seleccionada"));
    celda.classList.add("seleccionada");
    mostrarDetalleElementoMapa(celda, true);
}

function limpiarSeleccionMapa() {
    codigoSeleccionadoMapa = "";
    document.querySelectorAll(".celda-calor.seleccionada")
        .forEach((item) => item.classList.remove("seleccionada"));
    const detalle = document.getElementById("detalle-ubicacion-mapa");

    if (detalle) {
        detalle.textContent =
            "Pasá el cursor o seleccioná una ubicación para consultar el detalle.";
    }
}

/* Detalle de la casilla: estado del módulo y los códigos WIS de sus ubicaciones. */
function mostrarDetalleElementoMapa(celda, seleccionada = false) {
    const prefijo = (seleccionada ? "Ubicación seleccionada · " : "") +
        `${celda.dataset.etiqueta || celda.dataset.codigo} · `;
    const sufijoDetalle = celda.dataset.detalle ? ` · ${celda.dataset.detalle}` : "";
    const valor = Number(celda.dataset.valor || 0);
    const visitas = Number(celda.dataset.visitas || 0);
    let texto;

    if (celda.dataset.inactiva === "nunca") {
        texto = prefijo +
            "Nunca tuvo movimientos · " +
            `${celda.dataset.detalleInactividad} · ` +
            "Candidata a reubicación";
    } else if (celda.dataset.inactiva === "true") {
        texto = prefijo +
            "Sin movimientos en los últimos 3 meses · " +
            `${celda.dataset.detalleInactividad} · ` +
            "Candidata a reubicación";
    } else if (!valor && !visitas && celda.dataset.ultimaActividad) {
        texto = prefijo +
            "Sin movimientos en el período · Último movimiento: " +
            `${formatearFechaMapa(celda.dataset.ultimaActividad)} ` +
            "(menos de 3 meses, todavía activa)" +
            sufijoDetalle;
    } else if (!valor && !visitas && celda.dataset.movimientoPosterior === "true") {
        texto = prefijo +
            "Sin movimientos hasta el final del período · " +
            "Empezó a moverse después" +
            sufijoDetalle;
    } else {
        texto = prefijo +
            `${valor.toLocaleString("es-UY")} ${obtenerEtiquetaMetricaMapa(true)}` +
            (obtenerTipoReporteMapaCalor() === TIPO_REPORTE_TRACE_WIS
                ? ` · ${formatearVisitasMapa(visitas)}`
                : "") +
            ` · ${celda.dataset.porcentaje}% del período` +
            sufijoDetalle;
    }

    escribirDetalleUbicacionMapa(texto, obtenerUbicacionesWisCeldaMapa(celda));
}

function aplicarMetricaVisualMapa() {
    const metrica = obtenerValorMapa("metrica-visual-mapa") || "actividad";
    const celdas = [...document.querySelectorAll(
        "#mapa-calor-contenedor .celda-calor"
    )];

    if (metrica !== "visitas") {
        restaurarSeleccionMapaRenderizada();
        return;
    }

    const valores = celdas
        .map((celda) => Number(celda.dataset.visitas || 0))
        .filter((valor) => valor > 0)
        .sort((a, b) => a - b);
    const indice = Math.min(
        valores.length - 1,
        Math.floor(valores.length * 0.95)
    );
    const referencia = valores.length ? Math.max(1, valores[indice]) : 1;

    celdas.forEach((celda) => {
        celda.dataset.nivel = String(calcularNivelMapa(
            Number(celda.dataset.visitas || 0),
            referencia
        ));
    });
    restaurarSeleccionMapaRenderizada();
}

function restaurarSeleccionMapaRenderizada() {
    // Con la vista 3D activa, el detalle pertenece a la selección 3D.
    if (
        !codigoSeleccionadoMapa ||
        (typeof mapaCalor3DActivo === "function" && mapaCalor3DActivo())
    ) {
        return;
    }

    const celda = [...document.querySelectorAll(
        "#mapa-calor-contenedor .celda-calor"
    )].find((item) => item.dataset.codigo === codigoSeleccionadoMapa);

    if (!celda) {
        codigoSeleccionadoMapa = "";
        return;
    }

    celda.classList.add("seleccionada");
    mostrarDetalleElementoMapa(celda, true);
}

function actualizarResumenComparacionMapa(conteosActividad) {
    const resumen = document.getElementById("resumen-comparacion-mapa");

    if (!resumen || obtenerMapaCalorSeleccionado() !== MAPA_MEZZANINE ||
        modoVistaPisosMapa !== "comparar") {
        if (resumen) {
            resumen.hidden = true;
            resumen.innerHTML = "";
        }
        return;
    }

    const [pisoA, pisoB] = obtenerPisosVisiblesMapaMezzanine();
    const metrica = obtenerValorMapa("metrica-visual-mapa") || "actividad";
    const conteos = metrica === "visitas"
        ? visitasPorUbicacionMapaActual
        : conteosActividad;
    const totalA = sumarMetricaPisoMapa(conteos, pisoA);
    const totalB = sumarMetricaPisoMapa(conteos, pisoB);
    const diferencia = totalB - totalA;
    const variacion = totalA
        ? (diferencia / totalA) * 100
        : totalB ? 100 : 0;
    const brechas = obtenerBrechasPisosMapa(conteos, pisoA, pisoB);
    const etiquetaMetrica = metrica === "visitas"
        ? "visitas"
        : obtenerEtiquetaMetricaMapa();

    resumen.hidden = false;
    resumen.innerHTML = `
        <div data-calculo="mapa-comparacion-piso">
            <span>Piso ${pisoA}</span>
            <strong>${totalA.toLocaleString("es-UY")}</strong>
            <small>${etiquetaMetrica}</small>
        </div>
        <div data-calculo="mapa-comparacion-piso">
            <span>Piso ${pisoB}</span>
            <strong>${totalB.toLocaleString("es-UY")}</strong>
            <small>${etiquetaMetrica}</small>
        </div>
        <div data-calculo="mapa-comparacion-diferencia">
            <span>Diferencia B − A</span>
            <strong>${diferencia > 0 ? "+" : ""}${diferencia.toLocaleString("es-UY")}</strong>
            <small>${variacion.toLocaleString("es-UY", { maximumFractionDigits: 1 })}%</small>
        </div>
        <div data-calculo="mapa-comparacion-crecimiento">
            <span>Mayor crecimiento</span>
            <strong>${formatearModuloComparacionMapa(brechas.crecimiento.codigo)}</strong>
            <small>${formatearBrechaMapa(brechas.crecimiento.valor)}</small>
        </div>
        <div data-calculo="mapa-comparacion-caida">
            <span>Mayor caída</span>
            <strong>${formatearModuloComparacionMapa(brechas.caida.codigo)}</strong>
            <small>${formatearBrechaMapa(brechas.caida.valor)}</small>
        </div>
    `;
}

/* "03.120" (calle y módulo, igual en los dos pisos) → "Calle 03 · Módulo 120". */
function formatearModuloComparacionMapa(sufijo) {
    const [calle, modulo] = String(sufijo || "").split(".");

    if (!sufijo) {
        return "—";
    }

    return modulo ? `Calle ${calle} · Módulo ${modulo}` : sufijo;
}

function sumarMetricaPisoMapa(conteos, piso) {
    const pisoPorZona = referenciaMezzanineCache?.pisoPorZona;

    return [...conteos.entries()].reduce((total, [codigo, valor]) => {
        const perteneceAlPiso = codigo.startsWith(`${piso}.`) ||
            codigo === `PISO${piso}` ||
            pisoPorZona?.get(codigo) === piso;
        return total + (perteneceAlPiso ? Number(valor || 0) : 0);
    }, 0);
}

function obtenerBrechasPisosMapa(conteos, pisoA, pisoB) {
    const sufijos = new Set();

    conteos.forEach((valor, codigo) => {
        if (codigo.startsWith(`${pisoA}.`) || codigo.startsWith(`${pisoB}.`)) {
            sufijos.add(codigo.slice(2));
        }
    });

    let crecimiento = { codigo: "", valor: 0 };
    let caida = { codigo: "", valor: 0 };

    sufijos.forEach((sufijo) => {
        const valorA = Number(conteos.get(`${pisoA}.${sufijo}`) || 0);
        const valorB = Number(conteos.get(`${pisoB}.${sufijo}`) || 0);
        const diferencia = valorB - valorA;

        if (diferencia > crecimiento.valor) {
            crecimiento = { codigo: sufijo, valor: diferencia };
        }

        if (diferencia < caida.valor) {
            caida = { codigo: sufijo, valor: diferencia };
        }
    });

    return { crecimiento, caida };
}

function formatearBrechaMapa(valor) {
    if (!valor) {
        return "Sin diferencia";
    }

    return `${valor > 0 ? "+" : ""}${valor.toLocaleString("es-UY")}`;
}

function cambiarZoomMapa(cambio) {
    aplicarZoomMapa(zoomMapaActual + cambio);
}

function aplicarZoomMapa(valor) {
    zoomMapaActual = Math.min(
        ZOOM_MAXIMO_MAPA,
        Math.max(ZOOM_MINIMO_MAPA, Math.round(valor * 10) / 10)
    );
    const contenedor = document.getElementById("mapa-calor-contenedor");
    const salida = document.getElementById("valor-zoom-mapa");

    if (contenedor) {
        contenedor.style.zoom = String(zoomMapaActual);
    }

    if (salida) {
        salida.value = `${Math.round(zoomMapaActual * 100)}%`;
        salida.textContent = salida.value;
    }
}

function ajustarMapaAlAncho() {
    const scroll = document.getElementById("mapa-calor-scroll");
    const contenedor = document.getElementById("mapa-calor-contenedor");

    if (!scroll || !contenedor) {
        return;
    }

    contenedor.style.zoom = "1";
    const factor = scroll.clientWidth / Math.max(1, contenedor.scrollWidth);
    aplicarZoomMapa(Math.min(1, factor));
    scroll.scrollTo({ left: 0, top: 0, behavior: "smooth" });
}

function manejarRuedaZoomMapa(evento) {
    if (!evento.ctrlKey) {
        return;
    }

    evento.preventDefault();
    cambiarZoomMapa(evento.deltaY < 0 ? PASO_ZOOM_MAPA : -PASO_ZOOM_MAPA);
}

function iniciarArrastreMapa(evento) {
    if (evento.button !== 0 || evento.target.closest("button, input, select")) {
        return;
    }

    const scroll = evento.currentTarget;
    arrastreMapaActual = {
        x: evento.clientX,
        y: evento.clientY,
        izquierda: scroll.scrollLeft,
        arriba: scroll.scrollTop,
        id: evento.pointerId
    };
    scroll.classList.add("arrastrando");
    scroll.setPointerCapture?.(evento.pointerId);
}

function moverArrastreMapa(evento) {
    if (!arrastreMapaActual || arrastreMapaActual.id !== evento.pointerId) {
        return;
    }

    const scroll = evento.currentTarget;
    scroll.scrollLeft = arrastreMapaActual.izquierda -
        (evento.clientX - arrastreMapaActual.x);
    scroll.scrollTop = arrastreMapaActual.arriba -
        (evento.clientY - arrastreMapaActual.y);
}

function finalizarArrastreMapa(evento) {
    if (!arrastreMapaActual || arrastreMapaActual.id !== evento.pointerId) {
        return;
    }

    evento.currentTarget.classList.remove("arrastrando");
    arrastreMapaActual = null;
}

function periodoMapaCalorEsValido() {
    const desde = obtenerValorMapa("filtro-desde-reportes");
    const hasta = obtenerValorMapa("filtro-hasta-reportes");
    return !(desde && hasta && desde > hasta);
}

function describirPeriodoMapaCalor() {
    const desde = obtenerValorMapa("filtro-desde-reportes");
    const hasta = obtenerValorMapa("filtro-hasta-reportes");

    if (desde && hasta) {
        return `${formatearFechaMapa(desde)} al ${formatearFechaMapa(hasta)}`;
    }

    if (desde) {
        return `Desde ${formatearFechaMapa(desde)}`;
    }

    if (hasta) {
        return `Hasta ${formatearFechaMapa(hasta)}`;
    }

    return "Sin límite de fechas";
}

function formatearFechaMapa(valor) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
}

function obtenerValorMapa(id) {
    const control = document.getElementById(id);
    return control ? control.value.trim() : "";
}

function mostrarMensajeMapaCalor(texto, tipo) {
    const mensaje = document.getElementById("mensaje-mapa-calor");

    if (!mensaje) {
        return;
    }

    mensaje.textContent = texto;
    mensaje.className = `mensaje${tipo ? ` ${tipo}` : ""}`;
}
