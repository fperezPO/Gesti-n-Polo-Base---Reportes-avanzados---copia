const TODAS_TAREAS_INICIO = "Todas";
const SEPARADOR_TAREA_INICIO = "\u001f";
const MAXIMO_BARRAS_DISTRIBUCION_INICIO = 8;
const ESPACIO_NOMBRES_SVG = "http://www.w3.org/2000/svg";

let solicitudGraficoInicio = 0;
let modoPeriodoGraficoInicio = "ciclo";
let filasTraceInicioCache = [];
let datosTraceInicioCargados = false;
let filasTopOperariosInicioActuales = [];
let filasTraceInicioOmitidas = 0;

if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("reglas-trace-actualizadas", () => {
        datosTraceInicioCargados = false;
        filasTraceInicioCache = [];

        if (document.getElementById("grafico-operativo-inicio")) {
            cargarResumenOperativoInicio(true).catch(console.error);
        }
    });
}

async function inicializarResumenOperativoInicio() {
    if (window.PoloOesteTareas?.sincronizarRegistrosServidor) {
        await window.PoloOesteTareas.sincronizarRegistrosServidor();
    }

    if (typeof inicializarPersonalizacionInicio === "function") {
        inicializarPersonalizacionInicio();
    }

    const operativa = document.getElementById(
        "filtro-operativa-grafico-inicio"
    );
    const aplicacion = document.getElementById(
        "filtro-aplicacion-grafico-inicio"
    );
    const mes = document.getElementById("mes-grafico-inicio");
    const desde = document.getElementById("filtro-desde-grafico-inicio");
    const hasta = document.getElementById("filtro-hasta-grafico-inicio");
    const aplicarCiclo = document.getElementById(
        "aplicar-ciclo-grafico-inicio"
    );
    const aplicarMes = document.getElementById(
        "aplicar-mes-grafico-inicio"
    );
    const abrirReportes = document.getElementById(
        "abrir-reportes-desde-inicio"
    );
    const metricaTop = document.getElementById(
        "metrica-top-operarios-inicio"
    );
    const metricaTendencia = document.getElementById(
        "metrica-tendencia-inicio"
    );

    if (
        !operativa ||
        !aplicacion ||
        !mes ||
        !desde ||
        !hasta ||
        !aplicarCiclo ||
        !aplicarMes
    ) {
        return;
    }

    // "Todas las operativas" viene en el HTML; el resto sale del catálogo de empresas.
    if (!operativa.querySelector("optgroup")) {
        agregarOpcionesOperativasAgrupadas(operativa);
    }

    if (!mes.value) {
        mes.value = typeof obtenerMesFacturacionActual === "function"
            ? obtenerMesFacturacionActual()
            : obtenerMesFacturacionInicioActual();
    }

    if (!desde.value || !hasta.value) {
        aplicarPeriodoRapidoInicio("ciclo", false);
    }

    operativa.addEventListener("change", () => {
        actualizarOpcionesAplicacionesInicio();

        if (typeof actualizarResumenInicio === "function") {
            actualizarResumenInicio();
        }

        cargarResumenOperativoInicio(false);
    });

    aplicacion.addEventListener("change", () => {
        seleccionarMetricaTendenciaSegunTareaInicio();
        cargarResumenOperativoInicio(false);
    });

    mes.addEventListener("change", () => {
        if (
            modoPeriodoGraficoInicio === "ciclo" ||
            modoPeriodoGraficoInicio === "mes"
        ) {
            aplicarPeriodoRapidoInicio(modoPeriodoGraficoInicio);
        }
    });

    [desde, hasta].forEach((control) => {
        control.addEventListener("change", () => {
            seleccionarModoPeriodoInicio("personalizado");
            cargarResumenOperativoInicio(false);
        });
    });

    aplicarCiclo.addEventListener("click", () => {
        aplicarPeriodoRapidoInicio("ciclo");
    });

    aplicarMes.addEventListener("click", () => {
        aplicarPeriodoRapidoInicio("mes");
    });

    if (abrirReportes) {
        abrirReportes.addEventListener("click", abrirReportesDesdeInicio);
    }

    if (metricaTop) {
        metricaTop.addEventListener("change", () => {
            renderizarTopOperariosInicio(filasTopOperariosInicioActuales);
        });
    }

    if (metricaTendencia) {
        metricaTendencia.addEventListener("change", () => {
            cargarResumenOperativoInicio(false);
        });
    }

    await cargarResumenOperativoInicio(true);
}

async function cargarResumenOperativoInicio(recargarDatos = false) {
    const numeroSolicitud = ++solicitudGraficoInicio;
    const operativa = obtenerValorControlInicio(
        "filtro-operativa-grafico-inicio"
    ) || TODAS_LAS_OPERATIVAS;
    const aplicacion = obtenerValorControlInicio(
        "filtro-aplicacion-grafico-inicio"
    ) || TODAS_TAREAS_INICIO;
    const rango = obtenerRangoSeleccionadoInicio();
    const rangoComparacion = obtenerRangoComparacionInicio(rango);

    mostrarEstadoGraficoInicio("Cargando movimientos del Trace WIS…");

    if (!rango) {
        mostrarEstadoGraficoInicio(
            obtenerMensajeErrorPeriodoInicio(),
            true
        );
        actualizarIndicadoresGraficoInicio([]);
        renderizarTopOperariosInicio([]);
        renderizarGraficosInicio([], [], aplicacion, operativa, null, null);
        actualizarResumenEmbarquesPeriodoInicio(null, operativa);
        return;
    }

    actualizarResumenEmbarquesPeriodoInicio(rango, operativa);

    try {
        if (recargarDatos || !datosTraceInicioCargados) {
            filasTraceInicioCache = await obtenerFilasTraceInicio();
            datosTraceInicioCargados = true;
            actualizarOpcionesAplicacionesInicio();
        }

        if (
            numeroSolicitud !== solicitudGraficoInicio ||
            !document.getElementById("grafico-operativo-inicio")
        ) {
            return;
        }

        const filasProductivasSinAlcance = filasTraceInicioCache.filter((fila) => {
            return fila.esVisibleInicio && (
                fila.cantidadUnidades > 0 || fila.esMovimientoMapa
            );
        });
        const filasProductivas =
            typeof aplicarAlcanceVistaInicio === "function"
                ? aplicarAlcanceVistaInicio(filasProductivasSinAlcance)
                : filasProductivasSinAlcance;
        const filasOperativa = filasProductivas.filter((fila) => {
            return operativa === TODAS_LAS_OPERATIVAS ||
                fila.operativa === operativa;
        });
        const filasTarea = aplicacion === TODAS_TAREAS_INICIO
            ? filasOperativa
            : filasOperativa.filter((fila) => {
                return obtenerClaveTareaInicio(fila) === aplicacion;
            });
        const filtradas = filasTarea.filter((fila) => {
            return fila.fechaDia >= rango.desde &&
                fila.fechaDia <= rango.hasta;
        });
        const filtradasAnteriores = filasTarea.filter((fila) => {
            return rangoComparacion &&
                fila.fechaDia >= rangoComparacion.desde &&
                fila.fechaDia <= rangoComparacion.hasta;
        });

        actualizarIndicadoresGraficoInicio(filtradas);
        renderizarTopOperariosInicio(filtradas);
        renderizarGraficosInicio(
            filtradas,
            filtradasAnteriores,
            aplicacion,
            operativa,
            rango,
            rangoComparacion
        );
        mostrarEstadoGraficoInicio(
            `${formatearFechaCortaInicio(rango.desde)} al ` +
            `${formatearFechaCortaInicio(rango.hasta)} · ` +
            `${obtenerEtiquetaModoPeriodoInicio()} · ` +
            (
                typeof preferenciaInicioActual !== "undefined" &&
                preferenciaInicioActual?.plantilla === "operario"
                    ? "Vista Operario · "
                    : ""
            ) +
            `${filtradas.length.toLocaleString("es-UY")} filas WIS evaluadas` +
            (filasTraceInicioOmitidas
                ? ` · ${filasTraceInicioOmitidas.toLocaleString("es-UY")} ` +
                    "filas inválidas omitidas"
                : "")
        );
    } catch (error) {
        console.error(error);
        const detalleError = String(error && error.message || "")
            .replace(/[<>]/g, "")
            .slice(0, 160);
        mostrarEstadoGraficoInicio(
            "No fue posible leer los movimientos del Trace WIS" +
                (detalleError ? `: ${detalleError}` : ".") +
                " La base se conserva; recargá la página para completar " +
                "su actualización.",
            true
        );
        actualizarIndicadoresGraficoInicio([]);
        renderizarTopOperariosInicio([]);
        renderizarGraficosInicio(
            [],
            [],
            aplicacion,
            operativa,
            rango,
            rangoComparacion
        );
    }
}

function actualizarResumenEmbarquesPeriodoInicio(rango, operativa) {
    const embarques = typeof obtenerEmbarques === "function"
        ? obtenerEmbarques()
        : [];
    const filtradosOperativa = embarques.filter((embarque) => {
        return operativa === TODAS_LAS_OPERATIVAS ||
            normalizarOperativa(embarque.operativa) === operativa;
    });
    const coincideRango = (valor) => {
        if (!rango || !valor) {
            return false;
        }

        const fecha = obtenerFechaDiaEmbarque(valor);
        return fecha >= rango.desde && fecha <= rango.hasta;
    };
    const recibidos = filtradosOperativa.filter((embarque) => {
        return coincideRango(obtenerLlegadaEmbarque(embarque));
    });
    const detalle = document.getElementById(
        "detalle-embarques-periodo-inicio"
    );

    actualizarTexto(
        "embarques-recibidos-inicio",
        recibidos.length.toLocaleString("es-UY")
    );

    if (detalle) {
        const etiquetaOperativa = operativa === TODAS_LAS_OPERATIVAS
            ? "todas las operativas"
            : operativa;
        detalle.textContent = rango
            ? `${formatearFechaCortaInicio(rango.desde)} al ` +
                `${formatearFechaCortaInicio(rango.hasta)} · ` +
                etiquetaOperativa
            : "Seleccioná un rango de fechas válido.";
    }

    actualizarGraficoEmbarquesInicio(filtradosOperativa, recibidos, rango);
    actualizarMetaEmbarquesInicio(
        "meta-control-inicio",
        recibidos,
        "control"
    );
    actualizarMetaEmbarquesInicio(
        "meta-crossdocking-inicio",
        recibidos,
        "crossdocking"
    );
    actualizarMetaEmbarquesInicio(
        "meta-almacenamiento-inicio",
        recibidos,
        "almacenamiento"
    );
}

function actualizarMetaEmbarquesInicio(id, embarques, nombreMeta) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    if (!embarques.length) {
        elemento.textContent = "Sin recepciones";
        elemento.dataset.cumplimiento = "sin-datos";
        return;
    }

    const estados = embarques.map((embarque) => {
        return obtenerMetasEmbarque(embarque)[nombreMeta].estado;
    });
    const enMeta = estados.filter((estado) => {
        return estado === CUMPLIMIENTO_EMBARQUE_EN_META;
    }).length;
    const fuera = estados.filter((estado) => {
        return estado === CUMPLIMIENTO_EMBARQUE_FUERA_META ||
            estado === CUMPLIMIENTO_EMBARQUE_VENCIDO;
    }).length;
    const pendientes = estados.length - enMeta - fuera;
    const partes = [`${enMeta} en meta`];

    if (fuera) {
        partes.push(`${fuera} fuera`);
    }

    if (pendientes) {
        partes.push(`${pendientes} pendientes`);
    }

    elemento.textContent = partes.join(" · ");
    elemento.dataset.cumplimiento = fuera ? "fuera" : "en-meta";
}

async function obtenerFilasTraceInicio() {
    const [importaciones, filas] = await Promise.all([
        obtenerDatosAlmacenReportes(
            ALMACEN_IMPORTACIONES,
            "tipo",
            TIPO_REPORTE_TRACE_WIS
        ),
        obtenerDatosAlmacenReportes(
            ALMACEN_FILAS_REPORTES,
            "tipo",
            TIPO_REPORTE_TRACE_WIS
        )
    ]);
    const operativasPorImportacion = new Map(
        importaciones.map((importacion) => [
            importacion.id,
            normalizarOperativaGraficoInicio(importacion.operativa)
        ])
    );

    filasTraceInicioOmitidas = 0;
    const normalizadas = [];

    filas.forEach((fila) => {
        try {
            const movimiento = Number(
                fila.movimiento ?? fila.cantidad ?? 0
            ) || 0;
            const operativa = normalizarOperativaGraficoInicio(
                fila.operativa ||
                operativasPorImportacion.get(fila.importacionId)
            );
            const filaNormalizada = {
                importacionId: fila.importacionId,
                movimiento,
                cantidad: Math.abs(movimiento),
                usuario: String(
                    fila.usuario || fila.colector || ""
                ).trim(),
                aplicacion: String(fila.aplicacion || "")
                    .trim()
                    .toUpperCase(),
                descripcionAplicacion: String(
                    fila.descripcionAplicacion || "Sin descripción"
                ).trim() || "Sin descripción",
                operativa,
                fechaHora: fila.fechaHora || "",
                fechaDia: obtenerFechaDiaGraficoInicio(fila),
                ubicacion: fila.ubicacion || "",
                frenteUbicacion: obtenerFrenteUbicacionInicio(
                    fila.ubicacion,
                    operativa
                )
            };
            const evaluacion = evaluarMovimientoTraceInicio(
                filaNormalizada
            );

            normalizadas.push({
                ...filaNormalizada,
                actividadLogistica:
                    evaluacion.actividad || "Sin clasificar",
                categoriaVolumen:
                    evaluacion.categoriaVolumen || "ninguno",
                cantidadFacturable: Number(
                    evaluacion.unidadesFacturables || 0
                ),
                cantidadPicking: Number(
                    evaluacion.unidadesPicking || 0
                ),
                cantidadUnidades: Number(
                    evaluacion.unidades ??
                    (
                        Number(evaluacion.unidadesFacturables || 0) +
                        Number(evaluacion.unidadesPicking || 0) +
                        Number(evaluacion.unidadesOperativas || 0)
                    )
                ),
                esMovimientoFacturable: Boolean(evaluacion.facturable),
                esMovimientoPicking: Boolean(
                    evaluacion.categoriaVolumen === "picking" ||
                    evaluacion.unidadesPicking
                ),
                esMovimientoOperacion: Boolean(
                    evaluacion.cuentaOperacion
                ),
                esMovimientoMapa: Boolean(evaluacion.participaMapa),
                esVisibleInicio: Boolean(evaluacion.visibleInicio)
            });
        } catch (error) {
            filasTraceInicioOmitidas += 1;
        }
    });

    return normalizadas;
}

function evaluarMovimientoTraceInicio(fila) {
    if (typeof evaluarMovimientoTraceWis === "function") {
        return evaluarMovimientoTraceWis(fila);
    }

    const aplicacion = String(fila.aplicacion || "").toUpperCase();
    const movimiento = Number(fila.movimiento || 0);
    const ubicacion = String(fila.ubicacion || "").trim().toUpperCase();
    const esFacturable = (
        ["REC501", "REC510", "REC522"].includes(aplicacion) &&
        movimiento > 0
    ) || (
        aplicacion === "EXP040" &&
        movimiento < 0 &&
        ubicacion.startsWith("1MPUE")
    );
    const esPicking = aplicacion === "PRD095" && movimiento < 0;
    const incluido = esFacturable || esPicking;
    const unidades = Math.abs(movimiento);

    return {
        actividad: fila.descripcionAplicacion || "Sin clasificar",
        categoriaVolumen: esFacturable
            ? "facturable"
            : esPicking
                ? "picking"
                : "ninguno",
        facturable: esFacturable,
        unidadesFacturables: esFacturable ? unidades : 0,
        unidadesPicking: esPicking ? unidades : 0,
        cuentaOperacion: incluido,
        participaMapa: incluido,
        visibleInicio: incluido
    };
}

function actualizarOpcionesAplicacionesInicio() {
    const selector = document.getElementById(
        "filtro-aplicacion-grafico-inicio"
    );

    if (!selector) {
        return;
    }

    const seleccionada = selector.value || TODAS_TAREAS_INICIO;
    const operativa = obtenerValorControlInicio(
        "filtro-operativa-grafico-inicio"
    ) || TODAS_LAS_OPERATIVAS;
    const tareas = new Map();

    const filasDisponibles =
        typeof aplicarAlcanceVistaInicio === "function"
            ? aplicarAlcanceVistaInicio(filasTraceInicioCache)
            : filasTraceInicioCache;

    filasDisponibles.forEach((fila) => {
        if (
            !fila.esVisibleInicio ||
            !fila.aplicacion ||
            !(
                fila.esMovimientoFacturable ||
                fila.esMovimientoPicking ||
                fila.esMovimientoOperacion ||
                fila.esMovimientoMapa
            ) ||
            (
                operativa !== TODAS_LAS_OPERATIVAS &&
                fila.operativa !== operativa
            )
        ) {
            return;
        }

        tareas.set(
            obtenerClaveTareaInicio(fila),
            fila.descripcionAplicacion
        );
    });

    const opciones = [...tareas.entries()].sort((a, b) => {
        return a[1].localeCompare(b[1], "es", { numeric: true });
    });

    selector.innerHTML = "";
    agregarOpcionInicio(
        selector,
        TODAS_TAREAS_INICIO,
        "Todas las tareas"
    );

    opciones.forEach(([clave, descripcion]) => {
        agregarOpcionInicio(selector, clave, descripcion);
    });

    selector.value = tareas.has(seleccionada)
        ? seleccionada
        : TODAS_TAREAS_INICIO;
}

function obtenerClaveTareaInicio(fila) {
    return `${fila.aplicacion}${SEPARADOR_TAREA_INICIO}` +
        fila.descripcionAplicacion;
}

function obtenerDescripcionTareaInicio(clave) {
    if (!clave || clave === TODAS_TAREAS_INICIO) {
        return "recepción, almacenamiento, expedición y picking";
    }

    return clave.split(SEPARADOR_TAREA_INICIO)[1] || "Tarea seleccionada";
}

function seleccionarMetricaTendenciaSegunTareaInicio() {
    const selectorTop = document.getElementById(
        "metrica-top-operarios-inicio"
    );
    if (selectorTop) selectorTop.value = "unidades";
}

function agregarOpcionInicio(selector, valor, etiqueta) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = etiqueta;
    selector.appendChild(opcion);
}

function actualizarIndicadoresGraficoInicio(filas) {
    const unidades = sumarUnidadesGraficoInicio(filas);
    const usuarios = new Set(
        filas.map((fila) => fila.usuario).filter(Boolean)
    );
    const visitas = filas.filter((fila) => {
        return fila.esMovimientoMapa && fila.frenteUbicacion;
    }).length;

    actualizarTexto(
        "total-unidades-inicio",
        unidades.toLocaleString("es-UY", { maximumFractionDigits: 2 })
    );
    actualizarTexto(
        "total-usuarios-inicio",
        usuarios.size.toLocaleString("es-UY")
    );
    actualizarTexto(
        "total-ubicaciones-inicio",
        visitas.toLocaleString("es-UY")
    );
    const productividad = window.PoloOesteTareas?.calcularProductividadTrace(
        filas,
        obtenerRangoSeleccionadoInicio() || {}
    );
    actualizarTexto(
        "total-productividad-inicio",
        productividad?.productividad == null
            ? "—"
            : `${productividad.productividad.toLocaleString("es-UY", {
                maximumFractionDigits: 1
            })} un/h`
    );
    actualizarTexto(
        "detalle-productividad-inicio",
        productividad?.filasVinculadas
            ? `${productividad.filasVinculadas.toLocaleString("es-UY")} ` +
                `movimientos vinculados · tolerancia ${productividad.toleranciaMinutos} min`
            : "Sin coincidencias entre Trace WIS y Tareas activas"
    );
}

function renderizarTopOperariosInicio(filas) {
    const tabla = document.getElementById("tabla-top-operarios-inicio");
    const detalle = document.getElementById("detalle-top-operarios-inicio");
    const selector = document.getElementById("metrica-top-operarios-inicio");

    filasTopOperariosInicioActuales = Array.isArray(filas) ? filas : [];

    if (!tabla) {
        return;
    }

    const metrica = selector ? selector.value : "unidades";
    const productividad = window.PoloOesteTareas?.calcularProductividadTrace(
        filasTopOperariosInicioActuales,
        obtenerRangoSeleccionadoInicio() || {}
    );
    const resumen = new Map();

    filasTopOperariosInicioActuales.forEach((fila) => {
        const usuario = String(fila.usuario || "").trim();

        if (!usuario) {
            return;
        }

        const actual = resumen.get(usuario) || {
            usuario,
            unidades: 0,
            visitas: 0,
            horasProductivas: 0,
            productividad: null
        };

        actual.unidades += Number(fila.cantidadUnidades || 0);

        if (fila.esMovimientoMapa && fila.frenteUbicacion) {
            actual.visitas += 1;
        }

        resumen.set(usuario, actual);
    });

    resumen.forEach((registro, usuario) => {
        const enlazado = productividad?.porUsuario.get(
            normalizarTextoInicio(usuario)
        );
        if (!enlazado) return;
        registro.horasProductivas = enlazado.segundosProductivos / 3600;
        registro.productividad = enlazado.productividad;
    });

    const ordenados = [...resumen.values()]
        .filter((registro) => registro[metrica] > 0)
        .sort((a, b) => {
            return b[metrica] - a[metrica] ||
                b.unidades - a.unidades ||
                a.usuario.localeCompare(b.usuario, "es", { numeric: true });
        })
        .slice(0, 10);

    tabla.innerHTML = "";

    if (!ordenados.length) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 6;
        celda.className = "estado-vacio-tabla";
        celda.textContent = "No hay operarios con actividad para esta selección.";
        fila.appendChild(celda);
        tabla.appendChild(fila);
    } else {
        ordenados.forEach((registro, indice) => {
            const fila = document.createElement("tr");
            [
                `#${indice + 1}`,
                registro.usuario,
                registro.unidades.toLocaleString("es-UY", {
                    maximumFractionDigits: 2
                }),
                registro.visitas.toLocaleString("es-UY"),
                registro.horasProductivas
                    ? registro.horasProductivas.toLocaleString("es-UY", {
                        maximumFractionDigits: 2
                    })
                    : "—",
                registro.productividad == null
                    ? "—"
                    : `${registro.productividad.toLocaleString("es-UY", {
                        maximumFractionDigits: 1
                    })} un/h`
            ].forEach((valor, columna) => {
                const celda = document.createElement("td");
                celda.textContent = valor;

                if (columna === 0) {
                    celda.className = "posicion-top-operario";
                }

                if (columna === 5) {
                    celda.title = "Trace WIS vinculado con Tareas activas";
                }

                fila.appendChild(celda);
            });
            tabla.appendChild(fila);
        });
    }

    if (detalle) {
        const etiquetas = {
            unidades: "cantidad de unidades",
            visitas: "visitas por ubicación"
        };
        detalle.textContent = `Top ${ordenados.length} por ` +
            `${etiquetas[metrica] || etiquetas.unidades} · mismos filtros ` +
            "del resumen superior.";
    }
}

function renderizarGraficosInicio(
    filas,
    filasAnteriores,
    aplicacion,
    operativa,
    rango,
    rangoComparacion
) {
    renderizarTendenciaInicio(
        filas,
        filasAnteriores,
        aplicacion,
        operativa,
        rango,
        rangoComparacion
    );
    renderizarDistribucionInicio(filas, aplicacion);
}

function renderizarTendenciaInicio(
    filas,
    filasAnteriores,
    aplicacion,
    operativa,
    rango,
    rangoComparacion
) {
    const contenedor = document.getElementById("grafico-operativo-inicio");
    const titulo = document.getElementById("titulo-grafico-inicio");
    const detalle = document.getElementById("detalle-grafico-inicio");
    const pico = document.getElementById("pico-grafico-inicio");
    const etiquetaAnterior = document.getElementById(
        "etiqueta-periodo-anterior-inicio"
    );

    if (!contenedor) {
        return;
    }

    const etiquetaAplicacion = obtenerDescripcionTareaInicio(aplicacion);
    const etiquetaOperativa = operativa === TODAS_LAS_OPERATIVAS
        ? "todas las operativas"
        : operativa;
    const metrica = obtenerMetricaTendenciaInicio();

    if (titulo) {
        titulo.textContent = `${metrica.titulo} por día`;
    }

    if (detalle) {
        detalle.textContent = `${etiquetaAplicacion} · ${etiquetaOperativa}`;
    }

    if (etiquetaAnterior) {
        etiquetaAnterior.textContent = rangoComparacion
            ? `Anterior · ${formatearFechaCortaInicio(
                rangoComparacion.desde
            )}–${formatearFechaCortaInicio(rangoComparacion.hasta)}`
            : "Período anterior";
    }

    const datos = obtenerSerieDiariaGraficoInicio(
        filas,
        rango,
        metrica.clave
    );
    const datosAnteriores = obtenerSerieDiariaGraficoInicio(
        filasAnteriores,
        rangoComparacion,
        metrica.clave
    );
    renderizarLineaDiariaInicio(
        contenedor,
        datos,
        datosAnteriores,
        pico,
        metrica.unidad
    );
    contenedor.setAttribute(
        "aria-label",
        `Evolución diaria de ${metrica.titulo.toLowerCase()} para ` +
        `${etiquetaAplicacion} en ` +
        `${etiquetaOperativa}, comparada con el período anterior.`
    );
}

function renderizarLineaDiariaInicio(
    contenedor,
    datos,
    datosAnteriores,
    pico,
    unidad = "unidades"
) {
    contenedor.innerHTML = "";
    contenedor.className = "grafico-operativo-inicio grafico-linea-inicio";
    const maximo = Math.max(
        ...datos.map((dato) => dato.valor),
        ...datosAnteriores.map((dato) => dato.valor),
        0
    );

    if (!maximo) {
        mostrarGraficoVacioInicio(contenedor, pico);
        return;
    }

    const ancho = 720;
    const alto = 270;
    const margen = { superior: 18, derecho: 18, inferior: 44, izquierdo: 58 };
    const anchoUtil = ancho - margen.izquierdo - margen.derecho;
    const altoUtil = alto - margen.superior - margen.inferior;
    const svg = crearElementoSvgInicio("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        preserveAspectRatio: "xMidYMid meet",
        "aria-hidden": "true"
    });

    for (let nivel = 0; nivel <= 4; nivel += 1) {
        const y = margen.superior + (altoUtil * nivel) / 4;
        const valor = maximo * (1 - nivel / 4);
        svg.appendChild(crearElementoSvgInicio("line", {
            x1: margen.izquierdo,
            y1: y,
            x2: ancho - margen.derecho,
            y2: y,
            class: "linea-guia-grafico-inicio"
        }));
        const etiqueta = crearElementoSvgInicio("text", {
            x: margen.izquierdo - 9,
            y: y + 4,
            class: "etiqueta-eje-grafico-inicio",
            "text-anchor": "end"
        });
        etiqueta.textContent = formatearNumeroCompactoInicio(valor);
        svg.appendChild(etiqueta);
    }

    const crearPuntos = (serie) => serie.map((dato, indice) => {
        const x = serie.length === 1
            ? margen.izquierdo + anchoUtil / 2
            : margen.izquierdo + (anchoUtil * indice) / (serie.length - 1);
        const y = margen.superior + altoUtil -
            (dato.valor / maximo) * altoUtil;
        return { ...dato, x, y };
    });
    const puntos = crearPuntos(datos);
    const puntosAnteriores = crearPuntos(datosAnteriores);
    const recorrido = puntos.map((punto, indice) => {
        return `${indice ? "L" : "M"} ${punto.x} ${punto.y}`;
    }).join(" ");
    const recorridoAnterior = puntosAnteriores.map((punto, indice) => {
        return `${indice ? "L" : "M"} ${punto.x} ${punto.y}`;
    }).join(" ");
    const area = `${recorrido} L ${puntos[puntos.length - 1].x} ` +
        `${margen.superior + altoUtil} L ${puntos[0].x} ` +
        `${margen.superior + altoUtil} Z`;
    const areaAnterior = recorridoAnterior
        ? `${recorridoAnterior} L ` +
            `${puntosAnteriores[puntosAnteriores.length - 1].x} ` +
            `${margen.superior + altoUtil} L ${puntosAnteriores[0].x} ` +
            `${margen.superior + altoUtil} Z`
        : "";

    if (areaAnterior) {
        svg.appendChild(crearElementoSvgInicio("path", {
            d: areaAnterior,
            class: "area-periodo-anterior-inicio"
        }));
        svg.appendChild(crearElementoSvgInicio("path", {
            d: recorridoAnterior,
            class: "trazo-periodo-anterior-inicio"
        }));
    }

    svg.appendChild(crearElementoSvgInicio("path", {
        d: area,
        class: "area-grafico-inicio"
    }));
    svg.appendChild(crearElementoSvgInicio("path", {
        d: recorrido,
        class: "trazo-grafico-inicio"
    }));

    const saltoEtiquetas = Math.max(1, Math.ceil(datos.length / 6));

    puntos.forEach((punto, indice) => {
        const circulo = crearElementoSvgInicio("circle", {
            cx: punto.x,
            cy: punto.y,
            r: datos.length > 45 ? 2.2 : 3.5,
            class: "punto-grafico-inicio"
        });
        const descripcion = crearElementoSvgInicio("title");
        descripcion.textContent =
            `${formatearFechaCortaInicio(punto.fecha)}: ` +
            `${punto.valor.toLocaleString("es-UY", {
                maximumFractionDigits: 2
            })} ${unidad}`;
        circulo.appendChild(descripcion);
        svg.appendChild(circulo);

        if (
            indice % saltoEtiquetas === 0 ||
            indice === puntos.length - 1
        ) {
            const etiqueta = crearElementoSvgInicio("text", {
                x: punto.x,
                y: alto - 14,
                class: "etiqueta-fecha-grafico-inicio",
                "text-anchor": "middle"
            });
            etiqueta.textContent = formatearDiaGraficoInicio(punto.fecha);
            svg.appendChild(etiqueta);
        }
    });

    contenedor.appendChild(svg);
    const mayor = [...datos].sort((a, b) => b.valor - a.valor)[0];

    if (pico) {
        if (mayor && mayor.valor > 0) {
            pico.textContent =
                `Día pico: ${formatearFechaCortaInicio(mayor.fecha)}`;
            pico.hidden = false;
        } else {
            pico.hidden = true;
        }
    }
}

function crearElementoSvgInicio(nombre, atributos = {}) {
    const elemento = document.createElementNS(ESPACIO_NOMBRES_SVG, nombre);

    Object.entries(atributos).forEach(([atributo, valor]) => {
        elemento.setAttribute(atributo, String(valor));
    });

    return elemento;
}

function renderizarDistribucionInicio(filas, aplicacion) {
    const contenedor = document.getElementById(
        "grafico-distribucion-inicio"
    );
    const titulo = document.getElementById("titulo-distribucion-inicio");
    const detalle = document.getElementById("detalle-distribucion-inicio");
    const pico = document.getElementById("pico-distribucion-inicio");

    if (!contenedor) {
        return;
    }

    const grupos = new Map();

    filas.filter((fila) => fila.cantidadUnidades > 0).forEach((fila) => {
        const clave = fila.descripcionAplicacion || "Sin descripción";
        const unidades = Math.abs(Number(
            fila.movimiento ?? fila.cantidad ?? 0
        ));

        if (!Number.isFinite(unidades)) {
            return;
        }

        grupos.set(clave, (grupos.get(clave) || 0) + unidades);
    });

    const datos = obtenerPrincipalesDistribucionInicio(
        [...grupos.entries()].map(([etiqueta, valor]) => ({
            etiqueta,
            valor
        }))
    );

    if (titulo) {
        titulo.textContent = "Unidades movidas por tarea";
    }

    if (detalle) {
        detalle.textContent =
            "Suma de unidades movidas según la descripción de cada tarea.";
    }

    renderizarBarrasDistribucionInicio(contenedor, datos, pico);
    contenedor.setAttribute(
        "aria-label",
        `Distribución de unidades movidas para ${obtenerDescripcionTareaInicio(
            aplicacion
        )}.`
    );
}

function obtenerPrincipalesDistribucionInicio(datos) {
    const ordenados = datos.sort((a, b) => b.valor - a.valor);

    if (ordenados.length <= MAXIMO_BARRAS_DISTRIBUCION_INICIO) {
        return ordenados;
    }

    const visibles = ordenados.slice(
        0,
        MAXIMO_BARRAS_DISTRIBUCION_INICIO - 1
    );
    const otras = ordenados.slice(MAXIMO_BARRAS_DISTRIBUCION_INICIO - 1)
        .reduce((total, dato) => total + dato.valor, 0);
    visibles.push({ etiqueta: "Otras", valor: otras });
    return visibles;
}

function renderizarBarrasDistribucionInicio(contenedor, datos, pico) {
    contenedor.innerHTML = "";
    contenedor.className =
        "grafico-operativo-inicio grafico-barras-operativas " +
        "grafico-distribucion-inicio";
    const maximo = Math.max(...datos.map((dato) => dato.valor), 0);

    if (!maximo) {
        mostrarGraficoVacioInicio(contenedor, pico);
        return;
    }

    datos.forEach((dato) => {
        const fila = document.createElement("div");
        fila.className = "fila-barra-operativa";

        const etiqueta = document.createElement("strong");
        etiqueta.textContent = dato.etiqueta;
        etiqueta.title = dato.etiqueta;

        const pista = document.createElement("span");
        pista.className = "pista-barra-operativa";
        const barra = document.createElement("i");
        barra.className = "relleno-barra-operativa";
        barra.style.width = dato.valor
            ? `${Math.max(2, (dato.valor / maximo) * 100)}%`
            : "0%";
        pista.appendChild(barra);

        const valor = document.createElement("span");
        valor.className = "valor-barra-operativa";
        valor.textContent = dato.valor.toLocaleString("es-UY", {
            maximumFractionDigits: 2
        });

        fila.title = `${dato.etiqueta}: ${valor.textContent} unidades`;
        fila.append(etiqueta, pista, valor);
        contenedor.appendChild(fila);
    });

    if (pico) {
        pico.textContent = `Mayor cantidad: ${datos[0].etiqueta}`;
        pico.hidden = false;
    }
}

function mostrarGraficoVacioInicio(contenedor, pico) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio-grafico-inicio";
    const titulo = document.createElement("strong");
    titulo.textContent = "Sin actividad en este período";
    const detalle = document.createElement("span");
    detalle.textContent =
        "Importá el Trace WIS o elegí otra combinación de filtros.";
    vacio.append(titulo, detalle);
    contenedor.appendChild(vacio);

    if (pico) {
        pico.hidden = true;
    }
}

function obtenerMetricaTendenciaInicio() {
    return {
        clave: "unidades",
        titulo: "Cantidad de unidades",
        unidad: "unidades"
    };
}

function obtenerSerieDiariaGraficoInicio(filas, rango, metrica) {
    if (!rango) {
        return [];
    }

    const unidadesPorDia = new Map();

    filas.forEach((fila) => {
        const valor = metrica === "unidades"
            ? Number(fila.cantidadUnidades || 0)
            : 0;

        if (!valor) {
            return;
        }

        unidadesPorDia.set(
            fila.fechaDia,
            (unidadesPorDia.get(fila.fechaDia) || 0) + valor
        );
    });

    const datos = [];
    const cursor = crearFechaLocalInicio(rango.desde);
    const fin = crearFechaLocalInicio(rango.hasta);

    while (cursor <= fin) {
        const fecha = formatearFechaInputInicio(cursor);
        datos.push({ fecha, valor: unidadesPorDia.get(fecha) || 0 });
        cursor.setDate(cursor.getDate() + 1);
    }

    return datos;
}

function abrirReportesDesdeInicio() {
    globalThis.filtrosReportesDesdeInicio = {
        tipo: TIPO_REPORTE_TRACE_WIS,
        operativa: obtenerValorControlInicio(
            "filtro-operativa-grafico-inicio"
        ) || TODAS_LAS_OPERATIVAS,
        operacion: obtenerValorControlInicio(
            "filtro-aplicacion-grafico-inicio"
        ) || TODAS_TAREAS_INICIO,
        desde: obtenerValorControlInicio("filtro-desde-grafico-inicio"),
        hasta: obtenerValorControlInicio("filtro-hasta-grafico-inicio")
    };

    if (typeof cargarPagina === "function") {
        cargarPagina("reportes");
    }
}

function obtenerRangoFacturacionInicio(mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
        return null;
    }

    const [ano, numeroMes] = mes.split("-").map(Number);
    const desde = new Date(ano, numeroMes - 2, 21);
    const hasta = new Date(ano, numeroMes - 1, 20);

    return {
        desde: formatearFechaInputInicio(desde),
        hasta: formatearFechaInputInicio(hasta)
    };
}

function obtenerRangoMesCalendarioInicio(mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
        return null;
    }

    const [ano, numeroMes] = mes.split("-").map(Number);
    const desde = new Date(ano, numeroMes - 1, 1);
    const hasta = new Date(ano, numeroMes, 0);

    return {
        desde: formatearFechaInputInicio(desde),
        hasta: formatearFechaInputInicio(hasta)
    };
}

function obtenerRangoSeleccionadoInicio() {
    const desde = obtenerValorControlInicio("filtro-desde-grafico-inicio");
    const hasta = obtenerValorControlInicio("filtro-hasta-grafico-inicio");

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(desde) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(hasta) ||
        desde > hasta
    ) {
        return null;
    }

    return { desde, hasta };
}

function obtenerRangoComparacionInicio(rango) {
    if (!rango) {
        return null;
    }

    const desdeActual = crearFechaLocalInicio(rango.desde);
    const hastaActual = crearFechaLocalInicio(rango.hasta);

    if (modoPeriodoGraficoInicio === "ciclo") {
        return {
            desde: formatearFechaInputInicio(new Date(
                desdeActual.getFullYear(),
                desdeActual.getMonth() - 1,
                21
            )),
            hasta: formatearFechaInputInicio(new Date(
                hastaActual.getFullYear(),
                hastaActual.getMonth() - 1,
                20
            ))
        };
    }

    if (modoPeriodoGraficoInicio === "mes") {
        return {
            desde: formatearFechaInputInicio(new Date(
                desdeActual.getFullYear(),
                desdeActual.getMonth() - 1,
                1
            )),
            hasta: formatearFechaInputInicio(new Date(
                desdeActual.getFullYear(),
                desdeActual.getMonth(),
                0
            ))
        };
    }

    const duracionDias = Math.round(
        (hastaActual - desdeActual) / 86400000
    ) + 1;
    const hastaAnterior = new Date(desdeActual);
    hastaAnterior.setDate(hastaAnterior.getDate() - 1);
    const desdeAnterior = new Date(hastaAnterior);
    desdeAnterior.setDate(desdeAnterior.getDate() - duracionDias + 1);

    return {
        desde: formatearFechaInputInicio(desdeAnterior),
        hasta: formatearFechaInputInicio(hastaAnterior)
    };
}

function aplicarPeriodoRapidoInicio(modo, recargar = true) {
    const mes = obtenerValorControlInicio("mes-grafico-inicio");
    const rango = modo === "mes"
        ? obtenerRangoMesCalendarioInicio(mes)
        : obtenerRangoFacturacionInicio(mes);

    if (!rango) {
        mostrarEstadoGraficoInicio(
            "Seleccioná un mes de referencia válido.",
            true
        );
        return;
    }

    asignarValorControlInicio("filtro-desde-grafico-inicio", rango.desde);
    asignarValorControlInicio("filtro-hasta-grafico-inicio", rango.hasta);
    seleccionarModoPeriodoInicio(modo);

    if (recargar) {
        cargarResumenOperativoInicio(false);
    }
}

function seleccionarModoPeriodoInicio(modo) {
    modoPeriodoGraficoInicio = modo;
    const ciclo = document.getElementById("aplicar-ciclo-grafico-inicio");
    const mes = document.getElementById("aplicar-mes-grafico-inicio");
    const detalle = document.getElementById("detalle-modo-periodo-inicio");

    [
        { control: ciclo, modo: "ciclo" },
        { control: mes, modo: "mes" }
    ].forEach((item) => {
        if (!item.control) {
            return;
        }

        const activo = modo === item.modo;
        item.control.classList.toggle("activo", activo);
        item.control.setAttribute("aria-pressed", String(activo));
    });

    if (detalle) {
        detalle.textContent =
            `Período activo: ${obtenerEtiquetaModoPeriodoInicio()}`;
    }
}

function obtenerEtiquetaModoPeriodoInicio() {
    const etiquetas = {
        ciclo: "ciclo de facturación 21–20",
        mes: "mes calendario completo",
        personalizado: "rango personalizado"
    };
    return etiquetas[modoPeriodoGraficoInicio] || etiquetas.personalizado;
}

function obtenerMensajeErrorPeriodoInicio() {
    const desde = obtenerValorControlInicio("filtro-desde-grafico-inicio");
    const hasta = obtenerValorControlInicio("filtro-hasta-grafico-inicio");

    if (desde && hasta && desde > hasta) {
        return "La fecha Desde no puede ser posterior a la fecha Hasta.";
    }

    return "Seleccioná una fecha Desde y una fecha Hasta válidas.";
}

function obtenerMesFacturacionInicioActual() {
    const hoy = new Date();
    const cierre = new Date(
        hoy.getFullYear(),
        hoy.getMonth() + (hoy.getDate() >= 21 ? 1 : 0),
        1
    );
    return `${cierre.getFullYear()}-${String(
        cierre.getMonth() + 1
    ).padStart(2, "0")}`;
}

function normalizarOperativaGraficoInicio(valor) {
    if (typeof normalizarOperativaReporte === "function") {
        return normalizarOperativaReporte(valor);
    }

    return obtenerNombresOperativasCatalogo().includes(valor)
        ? valor
        : SIN_OPERATIVA;
}

function obtenerFechaDiaGraficoInicio(fila) {
    const valor = String(fila.fechaDia || fila.fechaHora || "").trim();
    const coincidencia = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    return coincidencia ? coincidencia[1] : "";
}

function obtenerFrenteUbicacionInicio(valor, operativa) {
    if (typeof normalizarCodigoUbicacionMapa === "function") {
        return normalizarCodigoUbicacionMapa(valor, operativa) || "";
    }

    return String(valor || "").trim().toUpperCase();
}

function sumarUnidadesGraficoInicio(filas) {
    return filas.reduce((total, fila) => {
        return total + Number(fila.cantidadUnidades || 0);
    }, 0);
}

function normalizarTextoInicio(valor) {
    return String(valor ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function formatearFechaInputInicio(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
        2,
        "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function crearFechaLocalInicio(valor) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0);
}

function formatearFechaCortaInicio(valor) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatearDiaGraficoInicio(valor) {
    return new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "short"
    }).format(crearFechaLocalInicio(valor)).replace(".", "");
}

function formatearNumeroCompactoInicio(valor) {
    return new Intl.NumberFormat("es-UY", {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(valor);
}

function obtenerValorControlInicio(id) {
    const control = document.getElementById(id);
    return control ? control.value.trim() : "";
}

function asignarValorControlInicio(id, valor) {
    const control = document.getElementById(id);

    if (control) {
        control.value = valor;
    }
}

function mostrarEstadoGraficoInicio(texto, esError = false) {
    const estado = document.getElementById("estado-grafico-inicio");

    if (!estado) {
        return;
    }

    estado.textContent = texto;
    estado.classList.toggle("error", esError);
}

function actualizarGraficoEmbarquesInicio(todosOperativa, recibidos, rango) {
    const grafico = document.getElementById("grafico-cumplimiento-embarques-inicio");
    if (!grafico) return;

    const contenedoresRecibidos = recibidos.filter((embarque) => {
        return typeof esContenedorEmbarque !== "function" || esContenedorEmbarque(embarque);
    });
    const pendientesLlegada = todosOperativa.filter((embarque) => {
        if (obtenerLlegadaEmbarque(embarque)) return false;
        const fechaEstimada = obtenerFechaDiaEmbarque(embarque.fechaEstimadaArribo);
        return rango && fechaEstimada >= rango.desde && fechaEstimada <= rango.hasta;
    });
    const estados = contenedoresRecibidos.map((embarque) => {
        return typeof obtenerEstadoCumplimientoGeneralEmbarque === "function"
            ? obtenerEstadoCumplimientoGeneralEmbarque(embarque, todosOperativa)
            : "pendiente";
    });
    const enMeta = estados.filter((estado) => estado === "cumplida").length;
    const fueraMeta = estados.filter((estado) => estado === "incumplida").length;
    const pendientes = estados.filter((estado) => estado === "pendiente").length;
    const total = estados.length;
    const porcentaje = total ? Math.round((enMeta / total) * 100) : 0;
    const gradosMeta = total ? (enMeta / total) * 360 : 0;
    const gradosFuera = total ? ((enMeta + fueraMeta) / total) * 360 : 0;

    grafico.style.background = total
        ? `conic-gradient(var(--verde-marca) 0 ${gradosMeta}deg, var(--rojo) ${gradosMeta}deg ${gradosFuera}deg, var(--gris-300) ${gradosFuera}deg 360deg)`
        : "var(--gris-200)";
    grafico.setAttribute("aria-label", total
        ? `${enMeta} en meta, ${fueraMeta} fuera de meta y ${pendientes} pendientes`
        : "Sin contenedores recibidos en el periodo");
    actualizarTexto("porcentaje-embarques-meta-inicio", `${porcentaje}%`);
    actualizarTexto("embarques-en-meta-inicio", enMeta);
    actualizarTexto("embarques-fuera-meta-inicio", fueraMeta);
    actualizarTexto("embarques-meta-pendiente-inicio", pendientes);
    actualizarTexto("embarques-pendientes-llegada-inicio", pendientesLlegada.length);
    actualizarTexto("detalle-resumen-embarques-inicio", rango
        ? `${formatearFechaCortaInicio(rango.desde)} al ${formatearFechaCortaInicio(rango.hasta)} · ${total} contenedores recibidos evaluados`
        : "Seleccioná un rango de fechas válido.");
}