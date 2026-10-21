/*
 * Dashboards de la página Reportes: KPIs logísticos y comerciales.
 *
 * Usa los mismos filtros que el mapa de calor (operativa y período) y las
 * filas del Trace WIS que ya cargó reportes.js, evaluadas con las mismas
 * reglas. Los movimientos se agregan una sola vez por día y operativa
 * (prepararIndiceDashboards); cada período suma esos días. También usa
 * Gestión de embarques. Incluye la comparación diaria de unidades contra el
 * período anterior y la evolución por ciclo 21–20 del año contra el año
 * anterior. Cada tarjeta explica su cálculo con el ícono ⓘ de
 * explicaciones-calculo.js (data-calculo="kpi:<clave>"), que toma el texto de
 * obtenerContenidoCalculoKpiDashboards. Las definiciones están en README.md,
 * sección "Indicadores de Reportes y dashboards".
 */
const METAS_DASHBOARDS = { sla: 95, fillRate: 98, ira: 97 };
// Hasta estos puntos por debajo de la meta el indicador queda en ámbar.
const TOLERANCIA_META_DASHBOARDS = 3;
const CICLOS_TENDENCIA_DASHBOARDS = 12;
// Tiempo asignado al último pickeo de cada operario en el día.
const SEGUNDOS_CIERRE_PICKEO_DASHBOARDS = 300;
const APLICACIONES_RECEPCION_DASHBOARDS = new Set(["REC501"]);
const APLICACIONES_ALMACENAMIENTO_DASHBOARDS = new Set(["REC510", "REC522"]);
const APLICACIONES_INVENTARIO_DASHBOARDS = new Set([
    "INV414",
    "INV540",
    "AJUSTE_MANUAL"
]);
const PREFIJOS_MUELLE_DASHBOARDS = ["1MPUE", "1MREC"];

/*
 * Cada KPI explica su cálculo en el ícono ⓘ de la tarjeta: `formula` dice
 * qué se calcula ("Indicador = cálculo"), `operacion` repite la cuenta con los
 * números del período y `nota` agrega lo que conviene saber para leerlo.
 */
const KPIS_PRINCIPALES_DASHBOARDS = [
    {
        clave: "lineasPicking",
        titulo: "Pickeos totales",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.unidadesPicking)} unidades · ` +
            `${formatearDecimalDashboards(r.unidadesPorLinea)} unidades por línea`,
        calculo: (r) => ({
            formula: "Pickeos totales = cantidad de líneas de picking del Trace WIS.",
            operacion: [
                `${formatearEnteroDashboards(r.lineasPicking)} líneas de picking`,
                r.lineasPicking
                    ? `${formatearEnteroDashboards(r.unidadesPicking)} unidades ÷ ` +
                        `${formatearEnteroDashboards(r.lineasPicking)} líneas = ` +
                        `${formatearDecimalDashboards(r.unidadesPorLinea)} unidades por línea`
                    : ""
            ],
            nota: "Cada fila de PRD095 con movimiento negativo es una línea."
        })
    },
    {
        clave: "embarques",
        titulo: "Embarques recibidos",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.contenedores)} contenedores · ` +
            `${formatearEnteroDashboards(r.bultos)} bultos`,
        calculo: (r) => ({
            formula: "Embarques recibidos = embarques con llegada confirmada dentro " +
                "del período.",
            operacion: [
                `${formatearEnteroDashboards(r.embarques)} embarques = ` +
                    `${formatearEnteroDashboards(r.contenedores)} contenedores + ` +
                    `${formatearEnteroDashboards(r.embarques - r.contenedores)} otras cargas`,
                `Bultos: suma de los bultos de esos embarques = ${formatearEnteroDashboards(r.bultos)}`
            ]
        })
    },
    {
        clave: "sla",
        titulo: "SLA embarques",
        formato: "porcentaje",
        meta: METAS_DASHBOARDS.sla,
        detalle: (r) => {
            if (!r.slaEvaluables) {
                return r.slaEnCurso
                    ? `${r.slaEnCurso} embarques todavía dentro del plazo`
                    : "Sin embarques evaluables en el período";
            }

            const fuera = [
                r.slaFueraControl ? `${r.slaFueraControl} en control` : "",
                r.slaFueraCierre
                    ? `${r.slaFueraCierre} en crossdocking o almacenamiento`
                    : ""
            ].filter(Boolean);

            return `${r.slaCumple} de ${r.slaEvaluables} embarques en meta` +
                (fuera.length ? ` · fuera: ${fuera.join(", ")}` : "") +
                (r.slaEnCurso ? ` · ${r.slaEnCurso} en curso` : "");
        },
        calculo: (r) => ({
            formula: "SLA embarques = embarques en meta ÷ embarques evaluables × 100.",
            operacion: [
                r.slaEvaluables
                    ? `${formatearEnteroDashboards(r.slaCumple)} ÷ ` +
                        `${formatearEnteroDashboards(r.slaEvaluables)} × 100 = ` +
                        formatearPorcentajeDashboards(r.sla)
                    : "Sin embarques evaluables: el indicador queda sin valor.",
                r.slaEvaluables && r.slaEvaluables > r.slaCumple
                    ? `Fuera de meta: ${formatearEnteroDashboards(r.slaFueraControl)} en control y ` +
                        `${formatearEnteroDashboards(r.slaFueraCierre)} en crossdocking o almacenamiento`
                    : ""
            ],
            nota: "En meta: control / ingreso dentro de 48 h y crossdocking o " +
                "almacenamiento dentro de su meta." +
                (r.slaEnCurso
                    ? ` ${formatearEnteroDashboards(r.slaEnCurso)} embarques siguen dentro ` +
                        "del plazo y todavía no cuentan."
                    : "")
        })
    },
    {
        clave: "fillRate",
        titulo: "Fill rate",
        formato: "porcentaje",
        meta: METAS_DASHBOARDS.fillRate,
        detalle: (r) => r.fillRate === null
            ? "Sin expediciones en el Trace del período"
            : `${formatearEnteroDashboards(r.unidadesExpedidas)} expedidas de ` +
                `${formatearEnteroDashboards(r.unidadesPicking)} pickeadas`,
        calculo: (r) => {
            const bruto = r.unidadesPicking
                ? r.unidadesExpedidas / r.unidadesPicking * 100
                : null;

            return {
                formula: "Fill rate = unidades expedidas ÷ unidades pickeadas × 100 " +
                    "(tope 100 %).",
                operacion: [
                    r.fillRate === null
                        ? "Sin expediciones o sin picking en el período."
                        : `${formatearEnteroDashboards(r.unidadesExpedidas)} ÷ ` +
                            `${formatearEnteroDashboards(r.unidadesPicking)} × 100 = ` +
                            formatearPorcentajeDashboards(bruto) +
                            (bruto > 100 ? " → se toma 100 %" : "")
                ],
                nota: "Expedidas: EXP040 al muelle 1MPUE. Es una aproximación: el " +
                    "Trace no trae lo pedido por el cliente."
            };
        }
    },
    {
        clave: "ira",
        titulo: "IRA · ajustes de inventario",
        formato: "porcentaje",
        meta: METAS_DASHBOARDS.ira,
        detalle: (r) => r.ira === null
            ? "Sin ubicaciones con movimiento"
            : `${formatearEnteroDashboards(r.posicionesAjustadas)} ubicaciones ajustadas de ` +
                `${formatearEnteroDashboards(r.posiciones)} · en unidades ` +
                formatearPorcentajeDashboards(r.exactitudUnidades),
        calculo: (r) => ({
            formula: "IRA = (1 − ubicaciones con ajuste ÷ ubicaciones con movimiento) × 100.",
            operacion: r.ira === null
                ? ["Sin ubicaciones con movimiento en el período."]
                : [
                    `(1 − ${formatearEnteroDashboards(r.posicionesAjustadas)} ÷ ` +
                        `${formatearEnteroDashboards(r.posiciones)}) × 100 = ` +
                        formatearPorcentajeDashboards(r.ira),
                    r.exactitudUnidades === null
                        ? ""
                        : `En unidades: (1 − ${formatearEnteroDashboards(r.unidadesAjustadas)} ÷ ` +
                            `${formatearEnteroDashboards(r.unidadesPicking + r.unidadesAlmacenadas)}) ` +
                            `× 100 = ${formatearPorcentajeDashboards(r.exactitudUnidades)}`
                ],
            nota: "Ajustes: INV414, INV540 y ajuste manual. Un conteo sin diferencia " +
                "no deja fila en el Trace, por eso cada ubicación movida se toma como verificada."
        })
    }
];

const KPIS_OPERACION_DASHBOARDS = [
    {
        clave: "unidadesRecibidas",
        titulo: "Unidades recibidas",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.lineasRecepcion)} líneas de recepción`,
        calculo: (r) => ({
            formula: "Unidades recibidas = suma de las unidades de REC501 con " +
                "movimiento positivo.",
            operacion: [
                `${formatearEnteroDashboards(r.lineasRecepcion)} líneas de recepción suman ` +
                    `${formatearEnteroDashboards(r.unidadesRecibidas)} unidades`
            ]
        })
    },
    {
        clave: "unidadesAlmacenadas",
        titulo: "Unidades almacenadas",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.lineasAlmacenamiento)} ubicaciones guardadas`,
        calculo: (r) => ({
            formula: "Unidades almacenadas = suma de las unidades de REC510 y REC522 " +
                "con movimiento positivo.",
            operacion: [
                `${formatearEnteroDashboards(r.lineasAlmacenamiento)} guardados suman ` +
                    `${formatearEnteroDashboards(r.unidadesAlmacenadas)} unidades`
            ]
        })
    },
    {
        clave: "transferencias",
        titulo: "Transferencias",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.unidadesTransferidas)} unidades reubicadas`,
        calculo: (r) => ({
            formula: "Transferencias = cantidad de filas + (destino) de las tareas " +
                "de transferencia.",
            operacion: [
                `${formatearEnteroDashboards(r.transferencias)} transferencias · ` +
                    `${formatearEnteroDashboards(r.unidadesTransferidas)} unidades reubicadas`
            ],
            nota: "Cada transferencia deja una fila − en el origen y una + en el " +
                "destino; se cuenta solo la del destino."
        })
    },
    {
        clave: "unidadesExpedidas",
        titulo: "Unidades expedidas",
        formato: "entero",
        detalle: (r) => `${formatearEnteroDashboards(r.lineasExpedicion)} líneas de expedición`,
        calculo: (r) => ({
            formula: "Unidades expedidas = suma de las unidades de EXP040 con " +
                "movimiento negativo hacia el muelle 1MPUE.",
            operacion: [
                `${formatearEnteroDashboards(r.lineasExpedicion)} líneas de expedición suman ` +
                    `${formatearEnteroDashboards(r.unidadesExpedidas)} unidades`
            ]
        })
    },
    {
        clave: "productividad",
        titulo: "Productividad de picking",
        formato: "decimal",
        sufijo: " unidades/h",
        detalle: (r) => `${formatearEnteroDashboards(r.unidadesPicking)} unidades en ` +
            `${formatearDecimalDashboards(r.horasPicking)} horas de picking`,
        calculo: (r) => ({
            formula: "Productividad de picking = unidades pickeadas ÷ horas de picking.",
            operacion: r.productividad === null
                ? ["Sin horas de picking en el período."]
                : [
                    `${formatearEnteroDashboards(r.unidadesPicking)} unidades ÷ ` +
                        `${formatearDecimalDashboards(r.horasPicking)} h = ` +
                        `${formatearDecimalDashboards(r.productividad)} unidades/h`,
                    `Referencia: ${formatearEnteroDashboards(r.lineasPicking)} líneas ÷ ` +
                        `${formatearDecimalDashboards(r.horasPicking)} h = ` +
                        `${formatearDecimalDashboards(r.lineasPicking / r.horasPicking)} líneas/h`
                ],
            nota: "Las horas de cada operario y día van de su primer a su último " +
                "pickeo, más 5 minutos. Con una operativa elegida, las horas se " +
                "reparten según las líneas de esa operativa."
        })
    },
    {
        clave: "dockToStock",
        titulo: "Dock to stock",
        formato: "decimal",
        sufijo: " h",
        menorEsMejor: true,
        detalle: (r) => r.cerradosDock
            ? `Promedio de ${r.cerradosDock} embarques cerrados`
            : "Sin embarques almacenados en el período",
        calculo: (r) => ({
            formula: "Dock to stock = promedio de horas entre la llegada de cada " +
                "embarque y su almacenamiento (o crossdocking).",
            operacion: [
                r.cerradosDock
                    ? `${formatearDecimalDashboards(r.horasDock)} h ÷ ` +
                        `${formatearEnteroDashboards(r.cerradosDock)} embarques = ` +
                        `${formatearDecimalDashboards(r.dockToStock)} h`
                    : "Sin embarques almacenados en el período."
            ],
            nota: "Menos horas es mejor."
        })
    },
    {
        clave: "posiciones",
        titulo: "Posiciones usadas",
        formato: "entero",
        detalle: () => "Ubicaciones distintas con movimiento",
        calculo: (r) => ({
            formula: "Posiciones usadas = ubicaciones distintas con picking, " +
                "guardado, transferencia o inventario.",
            operacion: [
                `${formatearEnteroDashboards(r.posiciones)} ubicaciones distintas, ` +
                    "cada una contada una sola vez en el período"
            ],
            nota: "No cuentan los muelles 1MREC ni 1MPUE."
        })
    },
    {
        clave: "ajusteNeto",
        titulo: "Ajuste neto de inventario",
        formato: "signo",
        sinVariacion: true,
        detalle: (r) => `${formatearEnteroDashboards(r.ajustes)} ajustes en total · ` +
            `${formatearEnteroDashboards(r.unidadesAjustadas)} unidades ajustadas`,
        // Recuento por signo: unidades que sumaron y que restaron al stock.
        recuento: (r) => [
            {
                signo: "positivo",
                etiqueta: "Positivos",
                unidades: r.unidadesAjustePositivo,
                ajustes: r.ajustesPositivos
            },
            {
                signo: "negativo",
                etiqueta: "Negativos",
                unidades: r.unidadesAjusteNegativo,
                ajustes: r.ajustesNegativos
            }
        ],
        calculo: (r) => ({
            formula: "Ajuste neto = unidades de los ajustes positivos − unidades de " +
                "los ajustes negativos.",
            operacion: [
                `+${formatearEnteroDashboards(r.unidadesAjustePositivo)} − ` +
                    `${formatearEnteroDashboards(r.unidadesAjusteNegativo)} = ` +
                    formatearValorKpiDashboards(r.ajusteNeto, { formato: "signo" }),
                `${formatearEnteroDashboards(r.ajustesPositivos)} ajustes positivos y ` +
                    `${formatearEnteroDashboards(r.ajustesNegativos)} negativos`
            ],
            nota: "Incluye INV414, INV540, el ajuste manual y otras tareas de " +
                "inventario o ajuste."
        })
    }
];

const METRICAS_PORCENTAJE_DASHBOARDS = new Set(["sla", "fillRate", "ira"]);
// Indicadores que se pueden acumular en el año (la tendencia muestra el total).
const METRICAS_SUMABLES_DASHBOARDS = new Set([
    "lineasPicking",
    "unidadesPicking",
    "embarques",
    "unidadesRecibidas",
    "unidadesExpedidas"
]);

let indiceDashboards = null;
let ultimoResultadoDashboards = null;

/*
 * Botones de período de Reportes. Arranca en el ciclo 21–20 vigente; el
 * modo (ciclo, mes o rango) se deduce de las fechas elegidas.
 */
function configurarPeriodoDashboards() {
    const mes = document.getElementById("mes-facturacion-reportes");
    const ciclo = document.getElementById("aplicar-ciclo-facturacion");
    const mesCompleto = document.getElementById("aplicar-mes-reportes");
    const metrica = document.getElementById("metrica-tendencia-dashboards");

    if (!mes || !ciclo || !mesCompleto) {
        return;
    }

    if (!obtenerValorControlInicio("filtro-desde-reportes")) {
        aplicarPeriodoDashboards("ciclo", false);
    }

    mes.addEventListener("change", () => {
        const modo = obtenerModoPeriodoDashboards();
        aplicarPeriodoDashboards(modo === "mes" ? "mes" : "ciclo");
    });
    ciclo.addEventListener("click", () => aplicarPeriodoDashboards("ciclo"));
    mesCompleto.addEventListener("click", () => aplicarPeriodoDashboards("mes"));

    metrica?.addEventListener("change", () => {
        renderizarTendenciaDashboards(ultimoResultadoDashboards);
    });

    actualizarBotonesPeriodoDashboards();
}

/* ---------- Índice diario del Trace WIS ---------- */

function crearIndiceVacioDashboards() {
    return {
        dias: new Map(),
        pickeoDiario: new Map(),
        totalFilas: 0,
        omitidas: 0
    };
}

/* Recibe las filas ya normalizadas por reportes.js (operativa incluida). */
function prepararIndiceDashboards(filas) {
    indiceDashboards = crearIndiceVacioDashboards();
    agregarFilasIndiceDashboards(filas);
}

/*
 * Suma filas al índice existente: cada consulta de Reportes lee solo las
 * importaciones que faltaban y no hace falta recorrer de nuevo las demás.
 */
function agregarFilasIndiceDashboards(filas) {
    if (!indiceDashboards) {
        indiceDashboards = crearIndiceVacioDashboards();
    }

    const indice = indiceDashboards;
    indice.totalFilas += filas.length;

    filas.forEach((fila) => {
        try {
            registrarFilaIndiceDashboards(indice, fila);
        } catch (error) {
            indice.omitidas += 1;
        }
    });
}

function crearAcumuladorDashboards() {
    return {
        lineasPicking: 0,
        unidadesPicking: 0,
        unidadesDevueltas: 0,
        lineasRecepcion: 0,
        unidadesRecibidas: 0,
        lineasAlmacenamiento: 0,
        unidadesAlmacenadas: 0,
        lineasExpedicion: 0,
        unidadesExpedidas: 0,
        transferencias: 0,
        unidadesTransferidas: 0,
        ajustes: 0,
        unidadesAjustadas: 0,
        ajusteNeto: 0,
        ajustesPositivos: 0,
        ajustesNegativos: 0,
        unidadesAjustePositivo: 0,
        unidadesAjusteNegativo: 0,
        // Unidades de las reglas marcadas para la comparación diaria.
        unidadesMovidas: 0,
        ubicaciones: new Set(),
        ubicacionesAjustadas: new Set(),
        pickers: new Map()
    };
}

function sumarAcumuladoresDashboards(destino, origen) {
    Object.keys(destino).forEach((clave) => {
        if (typeof destino[clave] === "number") {
            destino[clave] += origen[clave];
        }
    });
    origen.ubicaciones.forEach((ubicacion) => destino.ubicaciones.add(ubicacion));
    origen.ubicacionesAjustadas.forEach((ubicacion) => {
        destino.ubicacionesAjustadas.add(ubicacion);
    });
    origen.pickers.forEach((lineas, usuario) => {
        destino.pickers.set(usuario, (destino.pickers.get(usuario) || 0) + lineas);
    });
}

function registrarFilaIndiceDashboards(indice, fila) {
    const dia = obtenerFechaDiaGraficoInicio(fila);

    if (!dia) {
        indice.omitidas += 1;
        return;
    }

    const movimiento = Number(fila.movimiento ?? fila.cantidad ?? 0) || 0;
    const unidades = Math.abs(movimiento);
    const aplicacion = String(fila.aplicacion || "").trim().toUpperCase();
    const descripcionAplicacion = String(fila.descripcionAplicacion || "").trim();
    const ubicacion = String(fila.ubicacion || "").trim().toUpperCase();
    const usuario = String(fila.usuario || fila.colector || "").trim();
    const operativa = fila.operativa || SIN_OPERATIVA;
    // Misma fila que evalúa reportes.js: aprovecha el caché de evaluaciones.
    const evaluacion = evaluarMovimientoTraceWisDisponible(fila);
    const actividad = normalizarTextoInicio(
        `${evaluacion.actividad || ""} ${descripcionAplicacion}`
    );

    if (!indice.dias.has(dia)) {
        indice.dias.set(dia, new Map());
    }

    const delDia = indice.dias.get(dia);

    if (!delDia.has(operativa)) {
        delDia.set(operativa, crearAcumuladorDashboards());
    }

    const acumulador = delDia.get(operativa);
    const esPosicion = esUbicacionAlmacenamientoDashboards(ubicacion);
    let usaPosicion = false;

    if (evaluacion.visibleInicio) {
        acumulador.unidadesMovidas += Number(evaluacion.unidades || 0);
    }

    if (
        evaluacion.categoriaVolumen === "picking" ||
        Number(evaluacion.unidadesPicking || 0) > 0
    ) {
        acumulador.lineasPicking += 1;
        acumulador.unidadesPicking += unidades;
        acumulador.pickers.set(usuario, (acumulador.pickers.get(usuario) || 0) + 1);
        registrarPickeoDiarioDashboards(indice, dia, usuario, fila.fechaHora);
        usaPosicion = true;
    } else if (aplicacion === "PRD500" && movimiento > 0) {
        acumulador.unidadesDevueltas += unidades;
    } else if (APLICACIONES_RECEPCION_DASHBOARDS.has(aplicacion) && movimiento > 0) {
        acumulador.lineasRecepcion += 1;
        acumulador.unidadesRecibidas += unidades;
    } else if (APLICACIONES_ALMACENAMIENTO_DASHBOARDS.has(aplicacion) && movimiento > 0) {
        acumulador.lineasAlmacenamiento += 1;
        acumulador.unidadesAlmacenadas += unidades;
        usaPosicion = true;
    } else if (
        aplicacion === "EXP040" &&
        movimiento < 0 &&
        (evaluacion.facturable || ubicacion.startsWith("1MPUE"))
    ) {
        acumulador.lineasExpedicion += 1;
        acumulador.unidadesExpedidas += unidades;
    } else if (
        APLICACIONES_INVENTARIO_DASHBOARDS.has(aplicacion) ||
        actividad.includes("inventario") ||
        actividad.includes("ajuste")
    ) {
        if (movimiento !== 0) {
            acumulador.ajustes += 1;
            acumulador.unidadesAjustadas += unidades;
            acumulador.ajusteNeto += movimiento;

            if (movimiento > 0) {
                acumulador.ajustesPositivos += 1;
                acumulador.unidadesAjustePositivo += unidades;
            } else {
                acumulador.ajustesNegativos += 1;
                acumulador.unidadesAjusteNegativo += unidades;
            }

            if (esPosicion) {
                acumulador.ubicacionesAjustadas.add(ubicacion);
            }
        }
        usaPosicion = true;
    } else if (actividad.includes("transfer")) {
        // Cada transferencia deja una fila − en el origen y una + en el destino.
        if (movimiento > 0) {
            acumulador.transferencias += 1;
            acumulador.unidadesTransferidas += unidades;
        }
        usaPosicion = true;
    }

    if (usaPosicion && esPosicion) {
        acumulador.ubicaciones.add(ubicacion);
    }
}

function registrarPickeoDiarioDashboards(indice, dia, usuario, fechaHora) {
    if (!indice.pickeoDiario.has(dia)) {
        indice.pickeoDiario.set(dia, new Map());
    }

    const delDia = indice.pickeoDiario.get(dia);

    if (!delDia.has(usuario)) {
        delDia.set(usuario, { primero: null, ultimo: null, lineas: 0 });
    }

    const registro = delDia.get(usuario);
    const segundos = obtenerSegundosDiaDashboards(fechaHora);
    registro.lineas += 1;

    if (segundos === null) {
        return;
    }

    registro.primero = registro.primero === null
        ? segundos
        : Math.min(registro.primero, segundos);
    registro.ultimo = registro.ultimo === null
        ? segundos
        : Math.max(registro.ultimo, segundos);
}

function obtenerSegundosDiaDashboards(fechaHora) {
    const coincidencia = String(fechaHora || "")
        .slice(10)
        .match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

    if (!coincidencia) {
        return null;
    }

    return Number(coincidencia[1]) * 3600 +
        Number(coincidencia[2]) * 60 +
        Number(coincidencia[3] || 0);
}

function esUbicacionAlmacenamientoDashboards(ubicacion) {
    return Boolean(ubicacion) && !PREFIJOS_MUELLE_DASHBOARDS.some((prefijo) => {
        return ubicacion.startsWith(prefijo);
    });
}

/* ---------- Cálculo de indicadores ---------- */

function resumirPeriodoDashboards(rango, operativa) {
    const total = crearAcumuladorDashboards();
    const porOperativa = new Map();
    let horasPicking = 0;

    listarDiasDashboards(rango.desde, rango.hasta).forEach((dia) => {
        const delDia = indiceDashboards.dias.get(dia);

        if (delDia) {
            delDia.forEach((acumulador, nombre) => {
                if (operativa !== TODAS_LAS_OPERATIVAS && nombre !== operativa) {
                    return;
                }

                sumarAcumuladoresDashboards(total, acumulador);

                if (!porOperativa.has(nombre)) {
                    porOperativa.set(nombre, crearAcumuladorDashboards());
                }

                sumarAcumuladoresDashboards(porOperativa.get(nombre), acumulador);
            });
        }

        const pickeos = indiceDashboards.pickeoDiario.get(dia);

        if (!pickeos) {
            return;
        }

        // Si se filtra una operativa, las horas se reparten según sus líneas.
        pickeos.forEach((registro, usuario) => {
            if (registro.primero === null || !registro.lineas) {
                return;
            }

            const lineas = operativa === TODAS_LAS_OPERATIVAS
                ? registro.lineas
                : delDia?.get(operativa)?.pickers.get(usuario) || 0;
            const segundos = registro.ultimo - registro.primero +
                SEGUNDOS_CIERRE_PICKEO_DASHBOARDS;
            horasPicking += (segundos / 3600) * (lineas / registro.lineas);
        });
    });

    const embarques = resumirEmbarquesDashboards(rango, operativa);

    return {
        rango,
        indicadores: calcularIndicadoresDashboards(total, horasPicking, embarques),
        porOperativa,
        embarquesPorOperativa: embarques.porOperativa
    };
}

function calcularIndicadoresDashboards(total, horasPicking, embarques) {
    const posiciones = total.ubicaciones.size;
    const posicionesAjustadas = total.ubicacionesAjustadas.size;
    const unidadesOperadas = total.unidadesPicking + total.unidadesAlmacenadas;

    return {
        ...total,
        ubicaciones: undefined,
        ubicacionesAjustadas: undefined,
        pickers: undefined,
        posiciones,
        posicionesAjustadas,
        horasPicking,
        unidadesPorLinea: total.lineasPicking
            ? total.unidadesPicking / total.lineasPicking
            : null,
        // Unidades pickeadas por hora de picking.
        productividad: horasPicking > 0
            ? total.unidadesPicking / horasPicking
            : null,
        fillRate: calcularFillRateDashboards(total),
        ira: posiciones
            ? (1 - posicionesAjustadas / posiciones) * 100
            : null,
        exactitudUnidades: unidadesOperadas
            ? Math.max(0, 1 - total.unidadesAjustadas / unidadesOperadas) * 100
            : null,
        embarques: embarques.embarques,
        contenedores: embarques.contenedores,
        bultos: embarques.bultos,
        slaEvaluables: embarques.slaEvaluables,
        slaEnCurso: embarques.slaEnCurso,
        slaCumple: embarques.slaCumple,
        slaFueraControl: embarques.slaFueraControl,
        slaFueraCierre: embarques.slaFueraCierre,
        sla: embarques.slaEvaluables
            ? embarques.slaCumple / embarques.slaEvaluables * 100
            : null,
        cerradosDock: embarques.cerradosDock,
        horasDock: embarques.horasDock,
        dockToStock: embarques.cerradosDock
            ? embarques.horasDock / embarques.cerradosDock
            : null
    };
}

function calcularFillRateDashboards(acumulador) {
    if (!acumulador.unidadesPicking || !acumulador.lineasExpedicion) {
        return null;
    }

    return Math.min(
        100,
        acumulador.unidadesExpedidas / acumulador.unidadesPicking * 100
    );
}

function resumirEmbarquesDashboards(rango, operativa) {
    const todos = typeof obtenerEmbarques === "function" ? obtenerEmbarques() : [];
    const resumen = {
        embarques: 0,
        contenedores: 0,
        bultos: 0,
        slaEvaluables: 0,
        slaEnCurso: 0,
        slaCumple: 0,
        slaFueraControl: 0,
        slaFueraCierre: 0,
        horasDock: 0,
        cerradosDock: 0,
        porOperativa: new Map()
    };

    todos.forEach((embarque) => {
        const llegada = obtenerLlegadaEmbarque(embarque);
        const dia = obtenerFechaDiaEmbarque(llegada);

        if (!dia || dia < rango.desde || dia > rango.hasta) {
            return;
        }

        const nombre = normalizarOperativa(embarque.operativa);

        if (operativa !== TODAS_LAS_OPERATIVAS && nombre !== operativa) {
            return;
        }

        const contenedor = esContenedorEmbarque(embarque);
        const bultos = Number(embarque.bultos) || 0;

        if (!resumen.porOperativa.has(nombre)) {
            resumen.porOperativa.set(nombre, { embarques: 0, contenedores: 0, bultos: 0 });
        }

        const deOperativa = resumen.porOperativa.get(nombre);
        [resumen, deOperativa].forEach((destino) => {
            destino.embarques += 1;
            destino.contenedores += contenedor ? 1 : 0;
            destino.bultos += bultos;
        });

        const sla = evaluarSlaEmbarqueDashboards(embarque, todos);

        if (sla.estado === "en-curso") {
            resumen.slaEnCurso += 1;
        } else {
            resumen.slaEvaluables += 1;
            resumen.slaCumple += sla.enMeta ? 1 : 0;
            resumen.slaFueraControl += sla.etapaFuera === "control" ? 1 : 0;
            resumen.slaFueraCierre += sla.etapaFuera === "cierre" ? 1 : 0;
        }

        const inicio = obtenerFechaHoraEmbarque(llegada);
        const cierre = obtenerFechaHoraEmbarque(
            obtenerAlmacenamientoEmbarque(embarque) ||
            obtenerCrossdockingEmbarque(embarque)
        );

        if (inicio && cierre && cierre >= inicio) {
            resumen.horasDock += (cierre - inicio) / 3600000;
            resumen.cerradosDock += 1;
        }
    });

    return resumen;
}

/*
 * SLA: control / ingreso dentro de sus 48 h y crossdocking o almacenamiento
 * (los que se hicieron) dentro de su meta, con las mismas reglas de Gestión
 * de embarques. Mide solo los tiempos del depósito. Un embarque que sigue
 * dentro del plazo queda "en curso" y no se evalúa todavía.
 */
function evaluarSlaEmbarqueDashboards(embarque, todos) {
    const metas = obtenerMetasEmbarque(embarque, todos);
    const tarde = (meta) => {
        return meta.estado === CUMPLIMIENTO_EMBARQUE_FUERA_META ||
            meta.estado === CUMPLIMIENTO_EMBARQUE_VENCIDO;
    };
    const resuelta = (meta) => {
        return meta.estado === CUMPLIMIENTO_EMBARQUE_EN_META ||
            meta.estado === CUMPLIMIENTO_EMBARQUE_FUERA_META;
    };
    const fuera = (etapaFuera) => ({ estado: "evaluado", enMeta: false, etapaFuera });

    if (tarde(metas.control)) {
        return fuera("control");
    }

    if (!resuelta(metas.control)) {
        return { estado: "en-curso" };
    }

    const cierres = [metas.crossdocking, metas.almacenamiento].filter(resuelta);

    if (!cierres.length) {
        return metas.almacenamiento.estado === CUMPLIMIENTO_EMBARQUE_VENCIDO
            ? fuera("cierre")
            : { estado: "en-curso" };
    }

    return cierres.some(tarde)
        ? fuera("cierre")
        : { estado: "evaluado", enMeta: true, etapaFuera: "" };
}

/* ---------- Período ---------- */

function aplicarPeriodoDashboards(modo, recalcular = true) {
    const mes = obtenerValorControlInicio("mes-facturacion-reportes");
    const rango = modo === "mes"
        ? obtenerRangoMesCalendarioInicio(mes)
        : obtenerRangoFacturacionInicio(mes);

    if (!rango) {
        mostrarEstadoDashboards("Seleccioná un mes válido.", true);
        return;
    }

    asignarValorControlInicio("filtro-desde-reportes", rango.desde);
    asignarValorControlInicio("filtro-hasta-reportes", rango.hasta);
    actualizarBotonesPeriodoDashboards();

    // El período nuevo se aplica con "Consultar" (reportes.js).
    if (recalcular && typeof actualizarEstadoConsultaReportes === "function") {
        actualizarEstadoConsultaReportes();
    }
}

/* Ciclo 21–20, mes calendario o rango libre, según las fechas elegidas. */
function obtenerModoPeriodoDashboards(rango = obtenerRangoDashboards()) {
    if (!rango) {
        return "personalizado";
    }

    const ciclo = obtenerRangoFacturacionInicio(obtenerMesCicloDashboards(rango.hasta));

    if (ciclo && ciclo.desde === rango.desde && ciclo.hasta === rango.hasta) {
        return "ciclo";
    }

    const mes = obtenerRangoMesCalendarioInicio(rango.desde.slice(0, 7));

    if (mes && mes.desde === rango.desde && mes.hasta === rango.hasta) {
        return "mes";
    }

    return "personalizado";
}

function actualizarBotonesPeriodoDashboards() {
    const modo = obtenerModoPeriodoDashboards();
    const etiquetas = {
        ciclo: "ciclo de facturación 21–20",
        mes: "mes calendario completo",
        personalizado: "rango personalizado"
    };

    [
        ["aplicar-ciclo-facturacion", "ciclo"],
        ["aplicar-mes-reportes", "mes"]
    ].forEach(([id, modoBoton]) => {
        const boton = document.getElementById(id);

        if (boton) {
            boton.classList.toggle("activo", modo === modoBoton);
            boton.setAttribute("aria-pressed", String(modo === modoBoton));
        }
    });

    actualizarTexto(
        "detalle-periodo-dashboards",
        `Período activo: ${etiquetas[modo]}`
    );
}

function obtenerRangoDashboards() {
    const desde = obtenerValorControlInicio("filtro-desde-reportes");
    const hasta = obtenerValorControlInicio("filtro-hasta-reportes");

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(desde) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(hasta) ||
        desde > hasta
    ) {
        return null;
    }

    return { desde, hasta };
}

function obtenerRangoAnteriorDashboards(rango) {
    const desde = crearFechaLocalInicio(rango.desde);
    const hasta = crearFechaLocalInicio(rango.hasta);
    const modo = obtenerModoPeriodoDashboards(rango);

    if (modo === "ciclo") {
        return {
            desde: formatearFechaInputInicio(new Date(desde.getFullYear(), desde.getMonth() - 1, 21)),
            hasta: formatearFechaInputInicio(new Date(hasta.getFullYear(), hasta.getMonth() - 1, 20))
        };
    }

    if (modo === "mes") {
        return {
            desde: formatearFechaInputInicio(new Date(desde.getFullYear(), desde.getMonth() - 1, 1)),
            hasta: formatearFechaInputInicio(new Date(desde.getFullYear(), desde.getMonth(), 0))
        };
    }

    const dias = Math.round((hasta - desde) / 86400000) + 1;
    const hastaAnterior = new Date(desde);
    hastaAnterior.setDate(hastaAnterior.getDate() - 1);
    const desdeAnterior = new Date(hastaAnterior);
    desdeAnterior.setDate(desdeAnterior.getDate() - dias + 1);

    return {
        desde: formatearFechaInputInicio(desdeAnterior),
        hasta: formatearFechaInputInicio(hastaAnterior)
    };
}

/* Mes de cierre del ciclo 21–20 que contiene la fecha. */
function obtenerMesCicloDashboards(valorFecha) {
    const fecha = crearFechaLocalInicio(valorFecha);
    const cierre = new Date(
        fecha.getFullYear(),
        fecha.getMonth() + (fecha.getDate() >= 21 ? 1 : 0),
        1
    );
    return `${cierre.getFullYear()}-${String(cierre.getMonth() + 1).padStart(2, "0")}`;
}

function listarDiasDashboards(desde, hasta) {
    const dias = [];
    const fecha = crearFechaLocalInicio(desde);
    const limite = crearFechaLocalInicio(hasta);

    while (fecha <= limite && dias.length < 3700) {
        dias.push(formatearFechaInputInicio(fecha));
        fecha.setDate(fecha.getDate() + 1);
    }

    return dias;
}

/* ---------- Actualización y dibujo ---------- */

function actualizarDashboards() {
    if (!indiceDashboards || !document.getElementById("kpis-principales-dashboards")) {
        return;
    }

    const rango = obtenerRangoDashboards();
    const operativa = obtenerValorControlInicio("filtro-operativa-pickeos") ||
        TODAS_LAS_OPERATIVAS;

    if (!rango) {
        mostrarEstadoDashboards("Seleccioná un período válido.", true);
        return;
    }

    /*
     * Período en curso: se compara contra los mismos días transcurridos del
     * período anterior, así un ciclo a medio camino no parece una caída.
     */
    const hoy = formatearFechaInputInicio(new Date());
    const enCurso = rango.desde <= hoy && rango.hasta > hoy;
    const rangoAnterior = obtenerRangoAnteriorDashboards(rango);

    if (enCurso) {
        const transcurridos = listarDiasDashboards(rango.desde, hoy).length;
        const corte = listarDiasDashboards(rangoAnterior.desde, rangoAnterior.hasta)[
            transcurridos - 1
        ];

        if (corte) {
            rangoAnterior.hasta = corte;
        }
    }

    const actual = resumirPeriodoDashboards(rango, operativa);
    const anterior = resumirPeriodoDashboards(rangoAnterior, operativa);
    /*
     * Tendencia: los 12 ciclos 21–20 del año que contiene el fin del período
     * y los mismos ciclos del año anterior. Los ciclos que todavía no
     * empezaron no se calculan.
     */
    const mesFinal = obtenerMesCicloDashboards(rango.hasta);
    const anoTendencia = Number(mesFinal.slice(0, 4));
    const resumirCicloTendencia = (ano, numeroMes) => {
        const valorMes = `${ano}-${String(numeroMes).padStart(2, "0")}`;
        const rangoCiclo = obtenerRangoFacturacionInicio(valorMes);
        const futuro = rangoCiclo.desde > hoy;

        return {
            mes: valorMes,
            rango: rangoCiclo,
            futuro,
            enCurso: !futuro && rangoCiclo.hasta >= hoy,
            indicadores: futuro
                ? null
                : resumirPeriodoDashboards(rangoCiclo, operativa).indicadores
        };
    };
    const listarCiclosTendencia = (ano) => Array.from(
        { length: CICLOS_TENDENCIA_DASHBOARDS },
        (_, indice) => resumirCicloTendencia(ano, indice + 1)
    );
    /*
     * Los 24 ciclos necesitan unos dos años de movimientos. Si Reportes no
     * los leyó (consulta sin historial completo), la tendencia queda en null
     * y su tarjeta ofrece cargarlos.
     */
    const inicioTendencia = obtenerRangoFacturacionInicio(`${anoTendencia - 1}-01`).desde;
    const finTendencia = obtenerRangoFacturacionInicio(`${anoTendencia}-12`).hasta;
    const tendenciaDisponible = typeof traceWisCargadoCubre !== "function" ||
        traceWisCargadoCubre(inicioTendencia, finTendencia < hoy ? finTendencia : hoy);
    const tendencia = tendenciaDisponible
        ? {
            ano: anoTendencia,
            mesSeleccionado: mesFinal,
            ciclos: listarCiclosTendencia(anoTendencia),
            anteriores: listarCiclosTendencia(anoTendencia - 1)
        }
        : null;

    // La comparación diaria muestra el período anterior completo, sin recorte.
    const rangoComparacion = obtenerRangoAnteriorDashboards(rango);
    const comparacion = {
        rango,
        rangoAnterior: rangoComparacion,
        hoy: enCurso ? hoy : "",
        serie: obtenerSerieDiariaDashboards(rango, operativa),
        serieAnterior: obtenerSerieDiariaDashboards(rangoComparacion, operativa)
    };

    ultimoResultadoDashboards = {
        operativa,
        actual,
        anterior,
        tendencia,
        anoTendencia,
        enCurso,
        comparacion
    };

    renderizarTarjetasDashboards(
        "kpis-principales-dashboards",
        KPIS_PRINCIPALES_DASHBOARDS,
        actual.indicadores,
        anterior.indicadores
    );
    renderizarTarjetasDashboards(
        "kpis-operacion-dashboards",
        KPIS_OPERACION_DASHBOARDS,
        actual.indicadores,
        anterior.indicadores
    );
    renderizarComparacionDiariaDashboards(ultimoResultadoDashboards);
    renderizarTendenciaDashboards(ultimoResultadoDashboards);
    renderizarTablaComercialDashboards(actual);

    const etiquetaOperativa = operativa === TODAS_LAS_OPERATIVAS
        ? "todas las operativas"
        : operativa;
    const omitidas = indiceDashboards.omitidas
        ? ` · ${formatearEnteroDashboards(indiceDashboards.omitidas)} filas inválidas omitidas`
        : "";
    mostrarEstadoDashboards(
        indiceDashboards.error
            ? "No fue posible leer el Trace WIS; se muestran solo los embarques."
            : `${formatearFechaCortaInicio(rango.desde)} al ` +
                `${formatearFechaCortaInicio(rango.hasta)} · ${etiquetaOperativa} · ` +
                (enCurso ? "período en curso, " : "") +
                `comparado con ${formatearFechaCortaInicio(anterior.rango.desde)} al ` +
                `${formatearFechaCortaInicio(anterior.rango.hasta)} · ` +
                `${formatearEnteroDashboards(indiceDashboards.totalFilas)} filas WIS cargadas` +
                omitidas,
        indiceDashboards.error
    );
    actualizarTexto(
        "detalle-comercial-dashboards",
        `${formatearFechaCortaInicio(rango.desde)} al ` +
            `${formatearFechaCortaInicio(rango.hasta)} · ` +
            "conceptos que normalmente se cobran a cada cliente."
    );
}

function renderizarTarjetasDashboards(id, definiciones, actual, anterior) {
    const contenedor = document.getElementById(id);

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = definiciones.map((kpi) => {
        const valor = actual[kpi.clave];
        const estado = obtenerEstadoMetaDashboards(valor, kpi.meta);
        const meta = kpi.meta === undefined
            ? ""
            : `<span class="meta-kpi-dashboards">Meta ${kpi.meta} %</span>`;
        const barra = kpi.meta === undefined || valor === null
            ? ""
            : `<div class="barra-kpi-dashboards" aria-hidden="true">` +
                `<i style="width:${Math.max(0, Math.min(100, valor)).toFixed(1)}%"></i>` +
                `<b style="left:${kpi.meta}%"></b></div>`;

        // La unidad va más chica que el número para que no lo empuje a otra línea.
        const unidad = kpi.sufijo && valor !== null && valor !== undefined
            ? `<small class="unidad-kpi-dashboards">${escaparHtmlDashboards(kpi.sufijo.trim())}</small>`
            : "";

        return `
            <article class="tarjeta-kpi-dashboards" data-kpi="${kpi.clave}" data-estado="${estado}">
                <div class="cabecera-kpi-dashboards" data-calculo="kpi:${kpi.clave}" data-calculo-en-linea>
                    <h4>${escaparHtmlDashboards(kpi.titulo)}</h4>
                    ${meta}
                </div>
                <p class="valor-kpi-dashboards">${formatearValorKpiDashboards(valor, { ...kpi, sufijo: "" })}${unidad}</p>
                ${barra}
                ${kpi.recuento ? crearRecuentoDashboards(kpi.recuento(actual)) : ""}
                <p class="detalle-kpi-dashboards">${escaparHtmlDashboards(kpi.detalle(actual))}</p>
                ${kpi.sinVariacion ? "" : crearVariacionDashboards(valor, anterior[kpi.clave], kpi)}
            </article>
        `;
    }).join("");
}

/*
 * Recuento por signo (ajuste neto): una barra con la proporción de unidades
 * y una fila por signo con sus unidades y la cantidad de ajustes.
 */
function crearRecuentoDashboards(items) {
    const total = items.reduce((suma, item) => suma + item.unidades, 0);
    const barra = total
        ? `<div class="barra-recuento-dashboards" aria-hidden="true">` +
            items.filter((item) => item.unidades).map((item) => {
                return `<i data-signo="${item.signo}" style="flex-grow:${item.unidades}"></i>`;
            }).join("") +
            `</div>`
        : "";
    const filas = items.map((item) => `
        <li data-signo="${item.signo}">
            <span><b aria-hidden="true">${item.signo === "positivo" ? "▲" : "▼"}</b> ${escaparHtmlDashboards(item.etiqueta)}</span>
            <strong>${formatearUnidadesRecuentoDashboards(item)}</strong>
            <small>en ${formatearEnteroDashboards(item.ajustes)} ${item.ajustes === 1 ? "ajuste" : "ajustes"}</small>
        </li>
    `).join("");

    return `${barra}<ul class="recuento-kpi-dashboards">${filas}</ul>`;
}

function formatearUnidadesRecuentoDashboards(item) {
    const signo = item.unidades ? (item.signo === "positivo" ? "+" : "-") : "";
    return `${signo}${formatearEnteroDashboards(item.unidades)} ` +
        `${item.unidades === 1 ? "unidad" : "unidades"}`;
}

function obtenerEstadoMetaDashboards(valor, meta) {
    if (meta === undefined) {
        return "neutro";
    }

    if (valor === null || valor === undefined) {
        return "sin-datos";
    }

    if (valor >= meta) {
        return "cumple";
    }

    return valor >= meta - TOLERANCIA_META_DASHBOARDS ? "cerca" : "bajo";
}

function crearVariacionDashboards(valor, anterior, kpi) {
    if (valor === null || anterior === null || anterior === undefined) {
        return '<span class="variacion-kpi-dashboards">Sin dato del período anterior</span>';
    }

    const esPorcentaje = kpi.formato === "porcentaje";

    if (!esPorcentaje && !anterior) {
        return '<span class="variacion-kpi-dashboards">Sin actividad en el período anterior</span>';
    }

    const diferencia = esPorcentaje
        ? valor - anterior
        : (valor - anterior) / Math.abs(anterior) * 100;

    if (Math.abs(diferencia) < 0.05) {
        return '<span class="variacion-kpi-dashboards">= Igual que el período anterior</span>';
    }

    const mejora = kpi.menorEsMejor ? diferencia < 0 : diferencia > 0;
    const texto = `${diferencia > 0 ? "▲ +" : "▼ "}` +
        `${formatearDecimalDashboards(diferencia)}${esPorcentaje ? " pp" : " %"}`;

    return `<span class="variacion-kpi-dashboards ${mejora ? "positiva" : "negativa"}">` +
        `${texto} vs período anterior</span>`;
}

/* ---------- Cálculo de cada KPI (ícono ⓘ de explicaciones-calculo.js) ---------- */

/*
 * Texto del cálculo de un KPI con los números del período elegido. Las
 * tarjetas del mapa de calor traen su propio cálculo (mapa-calor.js).
 */
function obtenerContenidoCalculoKpiDashboards(clave) {
    if (typeof obtenerCalculoResumenMapaCalor === "function") {
        const delMapa = obtenerCalculoResumenMapaCalor(clave);

        if (delMapa) {
            return delMapa;
        }
    }

    const kpi = [...KPIS_PRINCIPALES_DASHBOARDS, ...KPIS_OPERACION_DASHBOARDS]
        .find((item) => item.clave === clave);
    const resultado = ultimoResultadoDashboards;

    if (!kpi || !kpi.calculo || !resultado) {
        return null;
    }

    const actual = resultado.actual.indicadores;
    const previo = resultado.anterior.indicadores;
    const rangoCorto = (rango) => `${formatearFechaCortaInicio(rango.desde)} al ` +
        formatearFechaCortaInicio(rango.hasta);
    const etiquetaOperativa = resultado.operativa === TODAS_LAS_OPERATIVAS
        ? "todas las operativas"
        : resultado.operativa;

    return {
        titulo: kpi.titulo,
        ...kpi.calculo(actual),
        contexto: `${rangoCorto(resultado.actual.rango)} · ${etiquetaOperativa}. ` +
            `Período anterior (${rangoCorto(resultado.anterior.rango)}): ` +
            formatearValorKpiDashboards(previo[kpi.clave], kpi)
    };
}

/* ---------- Comparación diaria contra el período anterior ---------- */

function obtenerSerieDiariaDashboards(rango, operativa) {
    return listarDiasDashboards(rango.desde, rango.hasta).map((fecha) => {
        let valor = 0;

        indiceDashboards.dias.get(fecha)?.forEach((acumulador, nombre) => {
            if (operativa === TODAS_LAS_OPERATIVAS || nombre === operativa) {
                valor += acumulador.unidadesMovidas;
            }
        });

        return { fecha, valor };
    });
}

/*
 * Índices de los picos: días que superan a todos sus vecinos dentro del
 * radio (en un empate queda el primero). Con 2 días de radio se ignoran las
 * oscilaciones de un día; en rangos largos el radio crece para no amontonar
 * etiquetas.
 */
function obtenerPicosSerieDashboards(serie, radio) {
    return serie.map((_, indice) => indice).filter((indice) => {
        const valor = serie[indice].valor;

        if (!(valor > 0)) {
            return false;
        }

        const desde = Math.max(0, indice - radio);
        const hasta = Math.min(serie.length - 1, indice + radio);

        for (let otro = desde; otro <= hasta; otro += 1) {
            const vecino = serie[otro].valor;

            if (otro !== indice && (vecino > valor || (vecino === valor && otro < indice))) {
                return false;
            }
        }

        return true;
    });
}

/* Máximo "redondo" del eje para que las guías caigan en valores legibles. */
function redondearMaximoEscalaDashboards(valor, divisiones) {
    const pasoMinimo = valor / divisiones;
    const magnitud = 10 ** Math.floor(Math.log10(pasoMinimo));
    const factor = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidato) => {
        return candidato * magnitud >= pasoMinimo;
    });

    return factor * magnitud * divisiones;
}

/*
 * Unidades por día del período elegido y del anterior (antes estaba en
 * Inicio). Las dos series se alinean por día del período y cada pico
 * indica el valor al que llegó. En un período en curso no se dibujan los
 * días que faltan, y el total se compara con los mismos días del anterior.
 */
function renderizarComparacionDiariaDashboards(resultado) {
    const contenedor = document.getElementById("grafico-comparacion-dashboards");
    const insigniaPico = document.getElementById("pico-comparacion-dashboards");

    if (!contenedor || !resultado?.comparacion) {
        return;
    }

    const { rango, rangoAnterior, hoy, serieAnterior } = resultado.comparacion;
    const serieCompleta = resultado.comparacion.serie;
    const serie = hoy
        ? serieCompleta.filter((punto) => punto.fecha <= hoy)
        : serieCompleta;
    const sumar = (puntos) => puntos.reduce((total, punto) => total + punto.valor, 0);
    const total = sumar(serie);
    const totalAnterior = sumar(serieAnterior.slice(0, serie.length));
    const etiquetaOperativa = resultado.operativa === TODAS_LAS_OPERATIVAS
        ? "todas las operativas"
        : resultado.operativa;
    const rangoCorto = (r) => `${formatearFechaCortaInicio(r.desde)} al ` +
        formatearFechaCortaInicio(r.hasta);
    const variacion = totalAnterior
        ? (total - totalAnterior) / totalAnterior * 100
        : null;

    actualizarTexto("etiqueta-periodo-actual-dashboards", `Período · ${rangoCorto(rango)}`);
    actualizarTexto("etiqueta-periodo-anterior-dashboards", `Anterior · ${rangoCorto(rangoAnterior)}`);
    actualizarTexto(
        "detalle-comparacion-dashboards",
        `${etiquetaOperativa} · ${formatearEnteroDashboards(total)} unidades` +
            (hoy ? " hasta hoy" : "") +
            (variacion === null
                ? " · sin unidades en el período anterior"
                : ` · ${variacion > 0 ? "+" : ""}${formatearDecimalDashboards(variacion)} % ` +
                    `contra ${formatearEnteroDashboards(totalAnterior)} del anterior` +
                    (hoy ? " en los mismos días" : ""))
    );

    const valores = [...serie, ...serieAnterior].map((punto) => punto.valor);
    const maximoDatos = Math.max(0, ...valores);

    if (!maximoDatos) {
        contenedor.innerHTML = '<p class="vacio-dashboards">Sin unidades en este período ni en el anterior.</p>';
        contenedor.setAttribute("aria-label", "Comparación diaria: sin datos");

        if (insigniaPico) {
            insigniaPico.hidden = true;
        }
        return;
    }

    const ancho = 760;
    const alto = 280;
    const margen = { arriba: 30, derecha: 16, abajo: 34, izquierda: 56 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const base = margen.arriba + altoUtil;
    const dias = Math.max(serieCompleta.length, serieAnterior.length);
    const paso = dias > 1 ? anchoUtil / (dias - 1) : anchoUtil;
    const maximo = redondearMaximoEscalaDashboards(maximoDatos, 4);
    const posicionX = (indice) => dias > 1
        ? margen.izquierda + paso * indice
        : margen.izquierda + anchoUtil / 2;
    const posicionY = (valor) => base - valor / maximo * altoUtil;
    const recorrido = (puntos) => puntos.map((punto, indice) => {
        return `${indice ? "L" : "M"} ${posicionX(indice).toFixed(1)} ${posicionY(punto.valor).toFixed(1)}`;
    }).join(" ");
    const area = (puntos) => `${recorrido(puntos)} ` +
        `L ${posicionX(puntos.length - 1).toFixed(1)} ${base} L ${posicionX(0).toFixed(1)} ${base} Z`;
    const textoUnidades = (punto) => punto
        ? `${formatearFechaCortaInicio(punto.fecha)}: ${formatearEnteroDashboards(punto.valor)} unidades`
        : "sin día equivalente";
    // Números completos en el eje; abreviados solo si no entran en el margen.
    const formatearEje = maximo >= 100000
        ? formatearNumeroCompactoInicio
        : formatearEnteroDashboards;
    const partes = [];

    for (let i = 0; i <= 4; i += 1) {
        const valor = maximo * i / 4;
        const y = posicionY(valor);
        partes.push(
            `<line class="guia-dashboards" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y}" y2="${y}"></line>`,
            `<text class="eje-dashboards" x="${margen.izquierda - 8}" y="${y + 4}" text-anchor="end">` +
                `${formatearEje(valor)}</text>`
        );
    }

    // Columnas invisibles por día: el cursor muestra la guía y los dos valores.
    for (let indice = 0; indice < dias; indice += 1) {
        const x = posicionX(indice);
        const actual = indice < serie.length ? serie[indice] : null;
        const anterior = serieAnterior[indice] || null;
        partes.push(
            `<g class="columna-comparacion-dashboards">` +
                `<rect x="${(x - paso / 2).toFixed(1)}" y="${margen.arriba}" width="${paso.toFixed(1)}" height="${altoUtil}"></rect>` +
                `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margen.arriba}" y2="${base}"></line>` +
                `<title>Día ${indice + 1} · ${textoUnidades(actual)} · anterior ${textoUnidades(anterior)}</title>` +
            `</g>`
        );
    }

    if (serieAnterior.length) {
        partes.push(
            `<path class="area-anterior-comparacion-dashboards" d="${area(serieAnterior)}"></path>`,
            `<path class="trazo-anterior-comparacion-dashboards" d="${recorrido(serieAnterior)}"></path>`
        );
    }

    if (serie.length) {
        partes.push(
            `<path class="area-comparacion-dashboards" d="${area(serie)}"></path>`,
            `<path class="trazo-comparacion-dashboards" d="${recorrido(serie)}"></path>`
        );
    }

    const radioPico = Math.max(2, Math.round(dias / 14));
    const picos = obtenerPicosSerieDashboards(serie, radioPico);
    const picosAnteriores = obtenerPicosSerieDashboards(serieAnterior, radioPico);
    const radioPunto = dias > 45 ? 2.2 : 3.2;

    serie.forEach((punto, indice) => {
        partes.push(
            `<circle class="punto-comparacion-dashboards" cx="${posicionX(indice).toFixed(1)}" ` +
                `cy="${posicionY(punto.valor).toFixed(1)}" r="${radioPunto}"></circle>`
        );
    });

    /*
     * Etiquetas de los picos: primero los del período, del más alto al más
     * bajo, y después los del anterior. Cada número va arriba de su punto;
     * si se superpone con otro, prueba a la derecha, a la izquierda y abajo.
     */
    const ocupadas = [];
    const etiquetarPico = (puntos, indice, clase) => {
        const punto = puntos[indice];
        const texto = formatearEnteroDashboards(punto.valor);
        const anchoTexto = texto.length * 6.6 + 6;
        const x = posicionX(indice);
        const y = posicionY(punto.valor);
        const lugar = [
            [x, y - 10],
            [x + anchoTexto / 2 + 8, y + 4],
            [x - anchoTexto / 2 - 8, y + 4],
            [x, y + 19]
        ].map(([lugarX, lugarY]) => [
            Math.min(
                Math.max(lugarX, margen.izquierda + anchoTexto / 2),
                ancho - margen.derecha - anchoTexto / 2
            ),
            Math.min(Math.max(lugarY, 12), base - 4)
        ]).find(([lugarX, lugarY]) => !ocupadas.some((otra) => {
            return Math.abs(otra.x - lugarX) < (otra.ancho + anchoTexto) / 2 + 4 &&
                Math.abs(otra.y - lugarY) < 14;
        }));

        if (!lugar) {
            return;
        }

        ocupadas.push({ x: lugar[0], y: lugar[1], ancho: anchoTexto });
        partes.push(
            `<circle class="marca-${clase}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" ` +
                `r="${clase === "pico-comparacion-dashboards" ? 5 : 3.5}"></circle>`,
            `<text class="${clase}" x="${lugar[0].toFixed(1)}" y="${lugar[1].toFixed(1)}" ` +
                `text-anchor="middle">${texto}</text>`
        );
    };
    const porValor = (puntos) => (a, b) => puntos[b].valor - puntos[a].valor;

    [...picos].sort(porValor(serie)).forEach((indice) => {
        etiquetarPico(serie, indice, "pico-comparacion-dashboards");
    });
    [...picosAnteriores].sort(porValor(serieAnterior)).forEach((indice) => {
        etiquetarPico(serieAnterior, indice, "pico-anterior-comparacion-dashboards");
    });

    const salto = Math.max(1, Math.ceil(dias / 7));

    serieCompleta.forEach((punto, indice) => {
        if (indice % salto === 0 || indice === serieCompleta.length - 1) {
            partes.push(
                `<text class="eje-dashboards" x="${posicionX(indice).toFixed(1)}" y="${alto - 12}" ` +
                    `text-anchor="middle">${formatearDiaGraficoInicio(punto.fecha)}</text>`
            );
        }
    });

    contenedor.innerHTML =
        `<svg viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="xMidYMid meet">${partes.join("")}</svg>`;
    contenedor.setAttribute(
        "aria-label",
        `Unidades por día del ${rangoCorto(rango)} en ${etiquetaOperativa}, ` +
            `comparadas con el ${rangoCorto(rangoAnterior)}. ` +
            `Picos del período: ${picos.map((indice) => textoUnidades(serie[indice])).join("; ") || "ninguno"}.`
    );

    if (insigniaPico) {
        const mayor = serie.reduce((elegido, punto) => {
            return !elegido || punto.valor > elegido.valor ? punto : elegido;
        }, null);

        insigniaPico.hidden = !mayor || !mayor.valor;

        if (mayor && mayor.valor) {
            insigniaPico.textContent = `Día pico: ${textoUnidades(mayor)}`;
        }
    }
}

/*
 * Evolución por ciclo 21–20: los 12 ciclos del año del período elegido en
 * verde y, detrás de cada uno, el mismo ciclo del año anterior en gris
 * translúcido y difuminado, como el período anterior de la comparación
 * diaria. El ciclo del período va resaltado; los que todavía no empezaron
 * muestran solo el año anterior. Debajo de cada mes va la variación contra
 * el año anterior (en puntos porcentuales para los indicadores en %).
 */
function renderizarTendenciaDashboards(resultado) {
    const contenedor = document.getElementById("grafico-tendencia-dashboards");
    const selector = document.getElementById("metrica-tendencia-dashboards");

    if (!contenedor || !resultado) {
        return;
    }

    if (!resultado.tendencia) {
        renderizarTendenciaSinHistorialDashboards(contenedor, resultado.anoTendencia);
        return;
    }

    const metrica = selector ? selector.value : "lineasPicking";
    const etiquetaMetrica = selector
        ? selector.options[selector.selectedIndex].textContent
        : "Pickeos";
    const esPorcentaje = METRICAS_PORCENTAJE_DASHBOARDS.has(metrica);
    const meta = METAS_DASHBOARDS[metrica];
    const { ano, mesSeleccionado, ciclos, anteriores } = resultado.tendencia;
    const leerValor = (ciclo) => ciclo?.indicadores?.[metrica] ?? null;
    const puntos = ciclos.map((ciclo, indice) => ({
        ...ciclo,
        valor: leerValor(ciclo),
        previo: anteriores[indice],
        valorPrevio: leerValor(anteriores[indice])
    }));
    const valores = puntos
        .flatMap((punto) => [punto.valor, punto.valorPrevio])
        .filter((valor) => valor !== null);
    const etiquetaOperativa = resultado.operativa === TODAS_LAS_OPERATIVAS
        ? "todas las operativas"
        : resultado.operativa;
    const encabezado = `${etiquetaMetrica} · ciclos 21–20 de ${ano} contra ${ano - 1} · ` +
        etiquetaOperativa;

    actualizarTexto("etiqueta-ano-actual-tendencia", String(ano));
    actualizarTexto("etiqueta-ano-anterior-tendencia", String(ano - 1));

    if (!valores.length || valores.every((valor) => !valor)) {
        contenedor.innerHTML = `<p class="vacio-dashboards">Sin datos para este indicador en ${ano} ni en ${ano - 1}.</p>`;
        contenedor.setAttribute("aria-label", `${etiquetaMetrica}: sin datos`);
        actualizarTexto("detalle-tendencia-dashboards", encabezado);
        return;
    }

    const ancho = 760;
    const alto = 284;
    const margen = { arriba: 24, derecha: 12, abajo: 50, izquierda: 52 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const base = margen.arriba + altoUtil;
    const minimo = esPorcentaje
        ? Math.max(0, Math.floor((Math.min(...valores, meta ?? 100) - 5) / 5) * 5)
        : 0;
    const maximo = esPorcentaje ? 100 : Math.max(...valores) * 1.15;
    const escalaY = (valor) => margen.arriba + altoUtil -
        (valor - minimo) / (maximo - minimo || 1) * altoUtil;
    const paso = anchoUtil / puntos.length;
    const anchoBarra = Math.min(34, paso * 0.5);
    // La barra del año anterior asoma a la izquierda de la del año actual.
    const desfase = anchoBarra * 0.4;
    const formatearCorto = (valor) => esPorcentaje
        ? formatearPorcentajeDashboards(valor)
        : metrica === "productividad"
            ? formatearDecimalDashboards(valor)
            : formatearNumeroCompactoInicio(valor);
    const formatearCompleto = (valor) => {
        if (valor === null) {
            return "sin datos";
        }

        return esPorcentaje
            ? formatearPorcentajeDashboards(valor)
            : metrica === "productividad"
                ? `${formatearDecimalDashboards(valor)} unidades/h`
                : formatearEnteroDashboards(valor);
    };
    const rangoCorto = (rango) => `${formatearFechaCortaInicio(rango.desde)} al ` +
        formatearFechaCortaInicio(rango.hasta);
    const partes = [
        '<defs><filter id="difuminado-tendencia-dashboards" x="-40%" y="-10%" width="180%" height="120%">' +
            '<feGaussianBlur stdDeviation="1.3"></feGaussianBlur></filter></defs>'
    ];

    for (let i = 0; i <= 4; i += 1) {
        const valor = minimo + (maximo - minimo) * i / 4;
        const y = escalaY(valor);
        partes.push(
            `<line class="guia-dashboards" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y}" y2="${y}"></line>`,
            `<text class="eje-dashboards" x="${margen.izquierda - 8}" y="${y + 4}" text-anchor="end">` +
                `${esPorcentaje ? `${Math.round(valor)}%` : formatearNumeroCompactoInicio(valor)}</text>`
        );
    }

    puntos.forEach((punto, indice) => {
        const centro = margen.izquierda + paso * indice + paso / 2;
        const xPrevio = centro - anchoBarra / 2 - desfase / 2;
        const xActual = centro - anchoBarra / 2 + desfase / 2;
        const seleccionado = punto.mes === mesSeleccionado;
        // El ciclo en curso se compara incompleto: no muestra variación.
        const variacion = punto.enCurso
            ? null
            : calcularVariacionAnualDashboards(punto.valor, punto.valorPrevio, esPorcentaje);
        const titulo = punto.futuro
            ? `Ciclo ${rangoCorto(punto.rango)}: todavía no empezó`
            : `Ciclo ${rangoCorto(punto.rango)}${punto.enCurso ? " (en curso)" : ""}: ` +
                formatearCompleto(punto.valor);

        partes.push(
            `<g class="ciclo-tendencia-dashboards">` +
                `<title>${titulo} · ${ano - 1} (${rangoCorto(punto.previo.rango)}): ` +
                `${formatearCompleto(punto.valorPrevio)}` +
                `${variacion ? ` · ${variacion.texto} contra ${ano - 1}` : ""}</title>` +
                `<rect class="zona-ciclo-tendencia-dashboards" x="${(centro - paso / 2).toFixed(1)}" ` +
                    `y="${margen.arriba}" width="${paso.toFixed(1)}" height="${altoUtil}"></rect>`
        );

        if (punto.valorPrevio !== null) {
            const y = escalaY(Math.max(minimo, punto.valorPrevio));
            partes.push(
                `<rect class="barra-anterior-dashboards" x="${xPrevio.toFixed(1)}" y="${y.toFixed(1)}" ` +
                    `width="${anchoBarra.toFixed(1)}" height="${Math.max(0, base - y).toFixed(1)}" rx="5" ` +
                    `filter="url(#difuminado-tendencia-dashboards)"></rect>`
            );
        }

        if (punto.valor !== null) {
            const y = escalaY(Math.max(minimo, punto.valor));
            partes.push(
                `<rect class="barra-dashboards${seleccionado ? " actual" : ""}" x="${xActual.toFixed(1)}" ` +
                    `y="${y.toFixed(1)}" width="${anchoBarra.toFixed(1)}" ` +
                    `height="${Math.max(0, base - y).toFixed(1)}" rx="5"></rect>`,
                `<text class="valor-barra-dashboards" x="${(xActual + anchoBarra / 2).toFixed(1)}" ` +
                    `y="${(y - 6).toFixed(1)}" text-anchor="middle">${formatearCorto(punto.valor)}</text>`
            );
        } else if (!punto.futuro) {
            partes.push(
                `<text class="eje-dashboards" x="${(xActual + anchoBarra / 2).toFixed(1)}" y="${base - 6}" ` +
                    `text-anchor="middle">s/d</text>`
            );
        }

        partes.push(
            `<text class="eje-dashboards${seleccionado ? " actual" : ""}${punto.futuro ? " futuro" : ""}" ` +
                `x="${centro.toFixed(1)}" y="${alto - 28}" text-anchor="middle">` +
                `${formatearMesCortoDashboards(punto.mes, false)}</text>`
        );

        if (variacion || punto.enCurso) {
            partes.push(
                `<text class="variacion-ciclo-dashboards ${variacion?.diferencia > 0
                    ? "positiva"
                    : variacion?.diferencia < 0 ? "negativa" : ""}" x="${centro.toFixed(1)}" y="${alto - 11}" text-anchor="middle">` +
                    `${variacion ? variacion.texto : "en curso"}</text>`
            );
        }

        partes.push("</g>");
    });

    if (meta !== undefined && meta >= minimo) {
        const y = escalaY(meta);
        partes.push(
            `<line class="meta-dashboards" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y}" y2="${y}"></line>`,
            `<text class="texto-meta-dashboards" x="${ancho - margen.derecha}" y="${y - 6}" text-anchor="end">Meta ${meta}%</text>`
        );
    }

    contenedor.innerHTML =
        `<svg viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="xMidYMid meet">${partes.join("")}</svg>`;
    contenedor.setAttribute(
        "aria-label",
        `${etiquetaMetrica} por ciclo 21–20 de ${ano}, con ${ano - 1} de fondo`
    );

    // Indicadores sumables: total de los ciclos cerrados contra los mismos de un año antes.
    let acumulado = "";

    if (METRICAS_SUMABLES_DASHBOARDS.has(metrica)) {
        const cerrados = puntos.filter((punto) => !punto.futuro && !punto.enCurso);
        const total = cerrados.reduce((suma, punto) => suma + (punto.valor || 0), 0);
        const totalPrevio = cerrados.reduce((suma, punto) => suma + (punto.valorPrevio || 0), 0);
        const variacionTotal = calcularVariacionAnualDashboards(total, totalPrevio, false);

        if (cerrados.length) {
            acumulado = ` · ciclos cerrados de ${ano}: ${formatearEnteroDashboards(total)} ` +
                `contra ${formatearEnteroDashboards(totalPrevio)} en ${ano - 1}` +
                (variacionTotal
                    ? ` (${variacionTotal.diferencia > 0 ? "+" : ""}` +
                        `${formatearDecimalDashboards(variacionTotal.diferencia)} %)`
                    : "");
        }
    }

    const enCurso = puntos.find((punto) => punto.enCurso);
    actualizarTexto(
        "detalle-tendencia-dashboards",
        encabezado + acumulado +
            (enCurso
                ? ` · el ciclo de ${formatearMesCortoDashboards(enCurso.mes, false)
                    .toLocaleLowerCase("es")} está en curso`
                : "")
    );
}

/* Consulta sin historial completo: la tendencia ofrece cargarlo (reportes.js). */
function renderizarTendenciaSinHistorialDashboards(contenedor, ano) {
    contenedor.innerHTML = `
        <div class="vacio-dashboards tendencia-sin-historial-dashboards">
            <p>La evolución compara los 12 ciclos 21–20 de ${ano} con los de
            ${ano - 1}, así que necesita unos dos años de movimientos. Para que
            la consulta sea rápida, todavía no se leyeron.</p>
            <button type="button" class="boton-secundario" data-cargar-historial-reportes>
                Cargar historial completo
            </button>
        </div>`;
    contenedor.setAttribute("aria-label", "Evolución por ciclo: falta cargar el historial");
    actualizarTexto("etiqueta-ano-actual-tendencia", String(ano));
    actualizarTexto("etiqueta-ano-anterior-tendencia", String(ano - 1));
    actualizarTexto(
        "detalle-tendencia-dashboards",
        "Disponible al consultar con «Incluir historial completo»."
    );
}

/* Variación contra el año anterior: % para cantidades, puntos para porcentajes. */
function calcularVariacionAnualDashboards(valor, previo, esPorcentaje) {
    if (valor === null || previo === null || valor === undefined || previo === undefined) {
        return null;
    }

    if (!esPorcentaje && !previo) {
        return null;
    }

    const diferencia = esPorcentaje
        ? valor - previo
        : (valor - previo) / Math.abs(previo) * 100;

    if (Math.abs(diferencia) < 0.05) {
        return { diferencia: 0, texto: esPorcentaje ? "= 0 pp" : "= 0 %" };
    }

    if (esPorcentaje) {
        return {
            diferencia,
            texto: `${diferencia > 0 ? "+" : ""}${formatearDecimalDashboards(diferencia)} pp`
        };
    }

    const redondeada = Math.abs(diferencia) < 10
        ? formatearDecimalDashboards(diferencia)
        : Math.round(diferencia).toLocaleString("es-UY");

    return {
        diferencia,
        texto: `${diferencia > 0 ? "+" : ""}${redondeada} %`
    };
}

function obtenerFilasComercialesDashboards(actual) {
    const nombres = new Set([
        ...actual.porOperativa.keys(),
        ...actual.embarquesPorOperativa.keys()
    ]);

    return [...nombres].map((nombre) => {
        const trace = actual.porOperativa.get(nombre) || crearAcumuladorDashboards();
        const embarques = actual.embarquesPorOperativa.get(nombre) ||
            { embarques: 0, contenedores: 0, bultos: 0 };

        return {
            operativa: nombre,
            operativaFisica: typeof obtenerOperativaFisicaDeOperativa === "function"
                ? obtenerOperativaFisicaDeOperativa(nombre) || ""
                : "",
            embarques: embarques.embarques,
            contenedores: embarques.contenedores,
            bultos: embarques.bultos,
            unidadesRecibidas: trace.unidadesRecibidas,
            unidadesAlmacenadas: trace.unidadesAlmacenadas,
            lineasPicking: trace.lineasPicking,
            unidadesPicking: trace.unidadesPicking,
            unidadesExpedidas: trace.unidadesExpedidas,
            posiciones: trace.ubicaciones.size,
            fillRate: calcularFillRateDashboards(trace)
        };
    }).sort((a, b) => {
        return b.lineasPicking - a.lineasPicking ||
            b.embarques - a.embarques ||
            a.operativa.localeCompare(b.operativa, "es");
    });
}

function renderizarTablaComercialDashboards(actual) {
    const cuerpo = document.getElementById("tabla-comercial-dashboards");
    const pie = document.getElementById("total-comercial-dashboards");

    if (!cuerpo || !pie) {
        return;
    }

    const filas = obtenerFilasComercialesDashboards(actual);
    const total = actual.indicadores;
    // Las unidades almacenadas no van aparte: repiten las recibidas.
    const celdas = (fila) => [
        fila.embarques,
        fila.contenedores,
        fila.bultos,
        fila.unidadesRecibidas,
        fila.lineasPicking,
        fila.unidadesPicking,
        fila.unidadesExpedidas,
        fila.posiciones
    ].map((valor) => `<td>${formatearEnteroDashboards(valor)}</td>`).join("") +
        `<td>${fila.fillRate === null ? "—" : formatearPorcentajeDashboards(fila.fillRate)}</td>`;

    if (!filas.length) {
        cuerpo.innerHTML = '<tr><td colspan="10" class="vacio-dashboards">Sin movimientos ni embarques en el período.</td></tr>';
        pie.innerHTML = "";
        return;
    }

    cuerpo.innerHTML = filas.map((fila) => `
        <tr>
            <th scope="row">
                ${escaparHtmlDashboards(fila.operativa)}
                ${fila.operativaFisica ? `<small>${escaparHtmlDashboards(fila.operativaFisica)}</small>` : ""}
            </th>
            ${celdas(fila)}
        </tr>
    `).join("");
    pie.innerHTML = `<tr><th scope="row">Total</th>${celdas(total)}</tr>`;
}

/* ---------- Exportación ---------- */

function obtenerHojasExportacionDashboards() {
    const resultado = ultimoResultadoDashboards;

    if (!resultado) {
        throw new Error("Tocá Consultar para cargar los indicadores antes de exportarlos.");
    }

    const { actual, anterior } = resultado;
    const redondear = (valor) => valor === null || valor === undefined
        ? ""
        : Math.round(valor * 10) / 10;
    const kpis = [...KPIS_PRINCIPALES_DASHBOARDS, ...KPIS_OPERACION_DASHBOARDS];

    return [
        {
            nombre: "Indicadores",
            filas: [
                ["Período", `${formatearFechaCortaInicio(actual.rango.desde)} al ${formatearFechaCortaInicio(actual.rango.hasta)}`],
                ["Operativa", resultado.operativa === TODAS_LAS_OPERATIVAS ? "Todas" : resultado.operativa],
                [],
                ["Indicador", "Valor", "Período anterior", "Meta", "Detalle"],
                ...kpis.flatMap((kpi) => [
                    [
                        kpi.titulo + (kpi.formato === "porcentaje" ? " (%)" : kpi.sufijo || ""),
                        redondear(actual.indicadores[kpi.clave]),
                        redondear(anterior.indicadores[kpi.clave]),
                        kpi.meta ?? "",
                        kpi.detalle(actual.indicadores)
                    ],
                    // El recuento por signo va en filas aparte; los negativos restan.
                    ...(kpi.recuento
                        ? kpi.recuento(actual.indicadores).map((item, indice) => {
                            const previo = kpi.recuento(anterior.indicadores)[indice];
                            const factor = item.signo === "negativo" ? -1 : 1;
                            return [
                                `${kpi.titulo} · ${item.etiqueta.toLowerCase()} (unidades)`,
                                factor * item.unidades,
                                factor * previo.unidades,
                                "",
                                `${formatearEnteroDashboards(item.ajustes)} ajustes`
                            ];
                        })
                        : [])
                ])
            ]
        },
        {
            nombre: "Base facturable",
            filas: [
                [
                    "Operativa", "Operativa física", "Embarques", "Contenedores",
                    "Bultos", "Unidades recibidas", "Unidades almacenadas",
                    "Líneas de picking", "Unidades pickeadas",
                    "Unidades expedidas", "Posiciones usadas", "Fill rate (%)"
                ],
                ...obtenerFilasComercialesDashboards(actual).map((fila) => [
                    fila.operativa, fila.operativaFisica, fila.embarques,
                    fila.contenedores, fila.bultos, fila.unidadesRecibidas,
                    fila.unidadesAlmacenadas, fila.lineasPicking,
                    fila.unidadesPicking, fila.unidadesExpedidas,
                    fila.posiciones, redondear(fila.fillRate)
                ])
            ]
        },
        {
            // Los 12 ciclos del año del período y, debajo, los del año anterior.
            nombre: "Tendencia ciclos",
            filas: resultado.tendencia ? [
                [
                    "Año", "Ciclo", "Desde", "Hasta", "Líneas de picking",
                    "Unidades pickeadas", "Embarques", "Unidades recibidas",
                    "Unidades expedidas", "SLA embarques (%)", "Fill rate (%)",
                    "IRA ajustes de inventario (%)", "Unidades por hora"
                ],
                ...[
                    ...resultado.tendencia.ciclos,
                    ...resultado.tendencia.anteriores
                ].map((ciclo) => {
                    const indicadores = ciclo.indicadores;

                    return [
                        ciclo.mes.slice(0, 4),
                        ciclo.mes,
                        formatearFechaCortaInicio(ciclo.rango.desde),
                        formatearFechaCortaInicio(ciclo.rango.hasta),
                        ...(indicadores
                            ? [
                                indicadores.lineasPicking,
                                indicadores.unidadesPicking,
                                indicadores.embarques,
                                indicadores.unidadesRecibidas,
                                indicadores.unidadesExpedidas,
                                redondear(indicadores.sla),
                                redondear(indicadores.fillRate),
                                redondear(indicadores.ira),
                                redondear(indicadores.productividad)
                            ]
                            : Array(9).fill(""))
                    ];
                })
            ] : [
                ["La tendencia necesita el historial completo: consultá con «Incluir historial completo» y volvé a exportar."]
            ]
        },
        crearHojaComparacionDiariaDashboards(resultado.comparacion)
    ];
}

function crearHojaComparacionDiariaDashboards(comparacion) {
    const { serie, serieAnterior, hoy } = comparacion;
    const dias = Math.max(serie.length, serieAnterior.length);
    const filas = [];

    for (let indice = 0; indice < dias; indice += 1) {
        const actual = serie[indice];
        const anterior = serieAnterior[indice];
        filas.push([
            indice + 1,
            actual ? formatearFechaCortaInicio(actual.fecha) : "",
            actual && (!hoy || actual.fecha <= hoy) ? actual.valor : "",
            anterior ? formatearFechaCortaInicio(anterior.fecha) : "",
            anterior ? anterior.valor : ""
        ]);
    }

    return {
        nombre: "Comparación diaria",
        filas: [
            [
                "Día del período", "Fecha", "Unidades",
                "Fecha del período anterior", "Unidades del período anterior"
            ],
            ...filas
        ]
    };
}

/* ---------- Formatos ---------- */

function formatearValorKpiDashboards(valor, kpi) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    switch (kpi.formato) {
        case "porcentaje":
            return formatearPorcentajeDashboards(valor);
        case "decimal":
            return `${formatearDecimalDashboards(valor)}${kpi.sufijo || ""}`;
        case "signo":
            return `${valor > 0 ? "+" : ""}${formatearEnteroDashboards(valor)}`;
        default:
            return formatearEnteroDashboards(valor);
    }
}

function formatearEnteroDashboards(valor) {
    return Math.round(Number(valor) || 0).toLocaleString("es-UY");
}

function formatearDecimalDashboards(valor) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    return Number(valor).toLocaleString("es-UY", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

function formatearPorcentajeDashboards(valor) {
    return valor === null || valor === undefined
        ? "—"
        : `${formatearDecimalDashboards(valor)} %`;
}

function formatearMesCortoDashboards(valorMes, conAno = true) {
    const [ano, mes] = valorMes.split("-").map(Number);
    return new Intl.DateTimeFormat("es-UY", { month: "short" })
        .format(new Date(ano, mes - 1, 1))
        .replace(".", "") + (conAno ? ` ${String(ano).slice(2)}` : "");
}

function escaparHtmlDashboards(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function mostrarEstadoDashboards(texto, esError = false) {
    const estado = document.getElementById("estado-dashboards");

    if (estado) {
        estado.textContent = texto;
        estado.classList.toggle("error", esError);
    }
}
