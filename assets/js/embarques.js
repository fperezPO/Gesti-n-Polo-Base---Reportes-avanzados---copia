const TODOS_LOS_ESTADOS_EMBARQUE = "Todos";
const ESTADO_EMBARQUE_PENDIENTE_LLEGADA = "Pendiente de llegada";
const ESTADO_EMBARQUE_LLEGADA = "Llegada confirmada";
const ESTADO_EMBARQUE_CONTROL = "Control / ingreso confirmado";
const ESTADO_EMBARQUE_CROSSDOCKING = "Crossdocking confirmado";
const ESTADO_EMBARQUE_ALMACENAMIENTO = "Almacenamiento confirmado";
const ESTADO_EMBARQUE_FINALIZADO = "Proceso finalizado";
const HORAS_META_CONTROL_EMBARQUE = 48;
const HORAS_META_CROSSDOCKING_EMBARQUE = 48;
const HORAS_META_ALMACENAMIENTO_EMBARQUE = 72;
const HORAS_INICIO_POR_CONTENEDOR_DIA = 24;
const CUMPLIMIENTO_EMBARQUE_EN_META = "en-meta";
const CUMPLIMIENTO_EMBARQUE_FUERA_META = "fuera-meta";
const CUMPLIMIENTO_EMBARQUE_PENDIENTE = "pendiente";
const CUMPLIMIENTO_EMBARQUE_VENCIDO = "vencido";
const CUMPLIMIENTO_EMBARQUE_NO_INICIADO = "no-iniciado";
const ESTADOS_EMBARQUE = [
    ESTADO_EMBARQUE_PENDIENTE_LLEGADA,
    ESTADO_EMBARQUE_LLEGADA,
    ESTADO_EMBARQUE_CONTROL,
    ESTADO_EMBARQUE_CROSSDOCKING,
    ESTADO_EMBARQUE_ALMACENAMIENTO,
    ESTADO_EMBARQUE_FINALIZADO
];

function inicializarEmbarques() {
    setTimeout(inicializarSugerenciasFechaArriboEmbarque, 0);
    const administrador = esAdministrador();
    const formulario = document.getElementById("form-embarque");
    const tabla = document.getElementById("tabla-embarques");
    const cancelar = document.getElementById("cancelar-edicion-embarque");
    const abrirFormulario = document.getElementById(
        "abrir-formulario-embarque"
    );
    const limpiarFiltros = document.getElementById(
        "limpiar-filtros-embarques"
    );
    const aplicarCiclo = document.getElementById("aplicar-ciclo-embarques");
    const mesCiclo = document.getElementById("mes-ciclo-embarques");

    document.querySelectorAll("[data-requiere-admin-embarques]")
        .forEach((elemento) => {
            elemento.hidden = !administrador;
        });

    const aviso = document.getElementById("aviso-embarques-lectura");

    if (aviso) {
        aviso.hidden = administrador;
    }

    cargarOpcionesOperativas(
        document.getElementById("operativa-embarque")
    );
    cargarOpcionesFiltroOperativas(
        document.getElementById("filtro-operativa-embarques")
    );
    cargarOpcionesEstadosEmbarque(
        document.getElementById("filtro-estado-embarques")
    );
    cargarOpcionesMotivosRetrasoEmbarque(
        document.getElementById("filtro-motivo-retraso-embarques")
    );

    if (mesCiclo && !mesCiclo.value) {
        mesCiclo.value = fechaHoyLocal().slice(0, 7);
    }

    mostrarEmbarques();

    if (formulario && administrador) {
        formulario.addEventListener("submit", guardarEmbarqueDesdeFormulario);
    }

    if (cancelar && administrador) {
        cancelar.addEventListener("click", limpiarFormularioEmbarque);
    }

    if (abrirFormulario && administrador) {
        abrirFormulario.addEventListener("click", () => {
            limpiarFormularioEmbarque();
            abrirPanelFormularioEmbarque();
        });
    }

    if (limpiarFiltros) {
        limpiarFiltros.addEventListener("click", limpiarFiltrosEmbarques);
    }

    if (aplicarCiclo) {
        aplicarCiclo.addEventListener("click", aplicarCicloFacturacionEmbarques);
    }

    [
        "tipo-carga-embarque",
        "fecha-llegada-embarque",
        "fecha-control-ingreso-embarque",
        "fecha-crossdocking-embarque",
        "fecha-almacenamiento-embarque"
    ].forEach((id) => {
        const control = document.getElementById(id);

        if (control && administrador) {
            control.addEventListener("change", actualizarVistaPreviaMetasEmbarque);
        }
    });

    [
        "filtro-operativa-embarques",
        "filtro-estado-embarques",
        "filtro-motivo-retraso-embarques",
        "filtro-desde-embarques",
        "filtro-hasta-embarques"
    ].forEach((id) => {
        const control = document.getElementById(id);

        if (control) {
            control.addEventListener("change", mostrarEmbarques);
        }
    });

    if (tabla && administrador) {
        tabla.addEventListener("click", (evento) => {
            const botonEditar = evento.target.closest(
                "[data-editar-embarque]"
            );
            const botonEliminar = evento.target.closest(
                "[data-eliminar-embarque]"
            );

            if (botonEditar) {
                editarEmbarque(botonEditar.dataset.editarEmbarque);
            }

            if (botonEliminar) {
                eliminarEmbarque(botonEliminar.dataset.eliminarEmbarque);
            }
        });
    }
}

function cargarOpcionesEstadosEmbarque(selector) {
    if (!selector) {
        return;
    }

    agregarOpcion(selector, TODOS_LOS_ESTADOS_EMBARQUE, "Todos los estados");
    ESTADOS_EMBARQUE.forEach((estado) => {
        agregarOpcion(selector, estado, estado);
    });
}

function cargarOpcionesMotivosRetrasoEmbarque(selector) {
    if (!selector) return;
    const motivos = [
        "Documentación pendiente", "Diferencia de cantidades",
        "Mercancía dañada", "Falta de espacio", "Falta de personal",
        "Equipo no disponible", "Bloqueo del sistema",
        "Espera de proveedor", "Prioridad operativa", "Otro"
    ];
    selector.innerHTML = "";
    agregarOpcion(selector, "Todos", "Todos los motivos");
    motivos.forEach((motivo) => agregarOpcion(selector, motivo, motivo));
}

function guardarEmbarqueDesdeFormulario(evento) {
    evento.preventDefault();

    if (!esAdministrador()) {
        return;
    }

    const id = valorCampoEmbarque("embarque-id");
    const referencia = valorCampoEmbarque("referencia-embarque");
    const operativa = valorCampoEmbarque("operativa-embarque");
    const origen = valorCampoEmbarque("origen-embarque");
    const tipoCarga = valorCampoEmbarque("tipo-carga-embarque");
    const bultos = numeroCampoEmbarque("bultos-embarque");
    const fechaEstimadaArribo = valorCampoEmbarque("fecha-estimada-arribo-embarque");
    const fechaLlegada = valorCampoEmbarque("fecha-llegada-embarque");
    const fechaControlIngreso = valorCampoEmbarque(
        "fecha-control-ingreso-embarque"
    );
    const fechaCrossdocking = valorCampoEmbarque(
        "fecha-crossdocking-embarque"
    );
    const fechaAlmacenamiento = valorCampoEmbarque(
        "fecha-almacenamiento-embarque"
    );
    const motivoRetraso = valorCampoEmbarque("motivo-retraso-embarque");
    const responsableResolucion = valorCampoEmbarque("responsable-resolucion-embarque");
    const fechaPrevistaResolucion = valorCampoEmbarque("fecha-prevista-resolucion-embarque");
    const observaciones = valorCampoEmbarque("observaciones-embarque");
    const embarques = obtenerEmbarques();

    if (!validarFechasEmbarque({
        fechaLlegada,
        fechaControlIngreso,
        fechaCrossdocking,
        fechaAlmacenamiento
    })) {
        return;
    }

    if (motivoRetraso && !responsableResolucion) {
        mostrarMensajeEmbarques("Indicá quién realizará el seguimiento del retraso.", "error");
        return;
    }
    if (fechaPrevistaResolucion && !motivoRetraso) {
        mostrarMensajeEmbarques("Seleccioná un motivo de retraso antes de indicar una fecha prevista.", "error");
        return;
    }

    const referenciaDuplicada = embarques.some((embarque) => {
        return embarque.id !== id &&
            String(embarque.referencia || "").toLowerCase() ===
                referencia.toLowerCase();
    });

    if (referenciaDuplicada) {
        mostrarMensajeEmbarques(
            "Ya existe un embarque con esa referencia.",
            "error"
        );
        return;
    }

    const existente = embarques.find((embarque) => embarque.id === id);
    const ahora = new Date().toISOString();
    const registro = {
        id: existente ? existente.id : generarId(),
        referencia,
        operativa,
        origen,
        tipoCarga,
        bultos,
        fechaEstimadaArribo,
        fechaLlegada,
        fechaControlIngreso,
        fechaCrossdocking,
        fechaAlmacenamiento,
        motivoRetraso,
        responsableResolucion,
        fechaPrevistaResolucion,
        // Alias heredados para conservar compatibilidad con datos y exportaciones.
        fechaConfirmada: fechaLlegada,
        fechaIngreso: fechaControlIngreso,
        fechaFinalizacion: fechaAlmacenamiento,
        observaciones,
        creadoPor: existente
            ? existente.creadoPor
            : obtenerUsuarioActual().id,
        fechaRegistro: existente ? existente.fechaRegistro : ahora,
        fechaActualizacion: ahora
    };
    const actualizados = existente
        ? embarques.map((embarque) => {
            return embarque.id === id ? registro : embarque;
        })
        : [...embarques, registro];

    if (!guardarEmbarques(actualizados)) {
        mostrarMensajeEmbarques(
            "No fue posible guardar el embarque.",
            "error"
        );
        return;
    }

    limpiarFormularioEmbarque();
    mostrarEmbarques();
    mostrarMensajeEmbarques(
        existente
            ? "Embarque actualizado correctamente."
            : "Embarque registrado correctamente.",
        "exito"
    );
}

function validarFechasEmbarque({
    fechaLlegada,
    fechaControlIngreso,
    fechaCrossdocking,
    fechaAlmacenamiento
}) {
    if (
        fechaControlIngreso &&
        !fechaLlegada
    ) {
        mostrarMensajeEmbarques(
            "Para confirmar el control / ingreso primero debés indicar la llegada.",
            "error"
        );
        return false;
    }

    if (
        fechaLlegada &&
        fechaControlIngreso &&
        obtenerFechaHoraEmbarque(fechaControlIngreso) <
            obtenerFechaHoraEmbarque(fechaLlegada)
    ) {
        mostrarMensajeEmbarques(
            "El control / ingreso no puede ser anterior a la llegada.",
            "error"
        );
        return false;
    }

    const hitosPosteriores = [
        [fechaCrossdocking, "crossdocking"],
        [fechaAlmacenamiento, "almacenamiento"]
    ];

    for (const [fechaHito, nombreHito] of hitosPosteriores) {
        if (fechaHito && !fechaControlIngreso) {
            mostrarMensajeEmbarques(
                `Para confirmar ${nombreHito} primero debés indicar el ` +
                    "control / ingreso.",
                "error"
            );
            return false;
        }

        if (
            fechaHito &&
            fechaControlIngreso &&
            obtenerFechaHoraEmbarque(fechaHito) <
                obtenerFechaHoraEmbarque(fechaControlIngreso)
        ) {
            mostrarMensajeEmbarques(
                `La confirmación de ${nombreHito} no puede ser anterior al ` +
                    "control / ingreso.",
                "error"
            );
            return false;
        }
    }

    return true;
}

function actualizarVistaPreviaMetasEmbarque() {
    const salida = document.getElementById("vista-previa-metas-embarque");

    if (!salida) {
        return;
    }

    const fechaLlegada = valorCampoEmbarque("fecha-llegada-embarque");
    const fechaControl = valorCampoEmbarque("fecha-control-ingreso-embarque");

    if (!fechaLlegada) {
        salida.textContent =
            "Confirmá la llegada para calcular los vencimientos.";
        return;
    }

    const embarques = obtenerEmbarques();
    const id = valorCampoEmbarque("embarque-id") || "vista-previa-embarque";
    const existente = embarques.find((embarque) => embarque.id === id);
    const embarqueVistaPrevia = {
        ...(existente || {}),
        id,
        tipoCarga: valorCampoEmbarque("tipo-carga-embarque"),
        fechaLlegada,
        fechaRegistro: existente
            ? existente.fechaRegistro
            : new Date().toISOString()
    };
    const embarquesVistaPrevia = existente
        ? embarques.map((embarque) => {
            return embarque.id === id ? embarqueVistaPrevia : embarque;
        })
        : [...embarques, embarqueVistaPrevia];
    const horasInicio = obtenerHorasInicioOperativoEmbarque(
        embarqueVistaPrevia,
        embarquesVistaPrevia
    );
    const inicioControl = sumarHorasEmbarque(fechaLlegada, horasInicio);
    const limiteControl = sumarHorasEmbarque(
        inicioControl,
        HORAS_META_CONTROL_EMBARQUE
    );
    const partes = [
        `Control hasta ${formatearFechaDiaEmbarque(limiteControl)}`
    ];

    if (horasInicio) {
        partes.unshift(
            `Inicio operativo ${formatearFechaDiaEmbarque(inicioControl)} ` +
                `(+${horasInicio} h por orden de registro)`
        );
    }

    if (fechaControl) {
        partes.push(
            `Crossdocking hasta ${formatearFechaDiaEmbarque(sumarHorasEmbarque(
                fechaControl,
                HORAS_META_CROSSDOCKING_EMBARQUE
            ))}`,
            `almacenamiento hasta ${formatearFechaDiaEmbarque(sumarHorasEmbarque(
                fechaControl,
                HORAS_META_ALMACENAMIENTO_EMBARQUE
            ))}`
        );
    } else {
        partes.push(
            "los vencimientos de crossdocking y almacenamiento se calcularán " +
                "al confirmar el control"
        );
    }

    salida.textContent = partes.join(" · ");
}

function obtenerLlegadaEmbarque(embarque) {
    return embarque.fechaLlegada || embarque.fechaConfirmada || "";
}

function obtenerControlIngresoEmbarque(embarque) {
    return embarque.fechaControlIngreso || embarque.fechaIngreso || "";
}

function obtenerCrossdockingEmbarque(embarque) {
    return embarque.fechaCrossdocking || "";
}

function obtenerAlmacenamientoEmbarque(embarque) {
    return embarque.fechaAlmacenamiento || embarque.fechaFinalizacion || "";
}

function obtenerFechaHoraEmbarque(valor) {
    if (valor instanceof Date) {
        return valor;
    }

    if (!valor) {
        return null;
    }

    const texto = String(valor).trim();
    const fecha = new Date(texto.length === 10 ? `${texto}T00:00:00` : texto);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function sumarHorasEmbarque(valor, horas) {
    const fecha = obtenerFechaHoraEmbarque(valor);

    if (!fecha) {
        return null;
    }

    return new Date(fecha.getTime() + horas * 60 * 60 * 1000);
}

function evaluarMetaEmbarque(
    fechaBase,
    fechaReal,
    horasMeta,
    horasHastaInicio = 0
) {
    const base = obtenerFechaHoraEmbarque(fechaBase);

    if (!base) {
        return {
            estado: CUMPLIMIENTO_EMBARQUE_NO_INICIADO,
            etiqueta: "Aún no inicia",
            limite: null,
            inicio: null,
            horasHastaInicio: 0
        };
    }

    const inicio = sumarHorasEmbarque(base, horasHastaInicio);
    const limite = sumarHorasEmbarque(inicio, horasMeta);
    const real = obtenerFechaHoraEmbarque(fechaReal);

    if (real) {
        const enMeta = real <= limite;
        return {
            estado: enMeta
                ? CUMPLIMIENTO_EMBARQUE_EN_META
                : CUMPLIMIENTO_EMBARQUE_FUERA_META,
            etiqueta: enMeta ? "En meta" : "Fuera de meta",
            limite,
            inicio,
            horasHastaInicio
        };
    }

    const vencido = new Date() > limite;
    return {
        estado: vencido
            ? CUMPLIMIENTO_EMBARQUE_VENCIDO
            : CUMPLIMIENTO_EMBARQUE_PENDIENTE,
        etiqueta: vencido ? "Vencido" : "Pendiente",
        limite,
        inicio,
        horasHastaInicio
    };
}

function esContenedorEmbarque(embarque) {
    return String(embarque.tipoCarga || "")
        .trim()
        .toLocaleLowerCase("es")
        .startsWith("contenedor");
}

function compararOrdenLlegadaContenedores(a, b) {
    const llegadaA = obtenerFechaHoraEmbarque(obtenerLlegadaEmbarque(a));
    const llegadaB = obtenerFechaHoraEmbarque(obtenerLlegadaEmbarque(b));
    const diferenciaLlegada = (llegadaA ? llegadaA.getTime() : 0) -
        (llegadaB ? llegadaB.getTime() : 0);

    if (diferenciaLlegada) {
        return diferenciaLlegada;
    }

    const registroA = obtenerFechaHoraEmbarque(a.fechaRegistro);
    const registroB = obtenerFechaHoraEmbarque(b.fechaRegistro);
    const diferenciaRegistro = (registroA ? registroA.getTime() : 0) -
        (registroB ? registroB.getTime() : 0);

    if (diferenciaRegistro) {
        return diferenciaRegistro;
    }

    return String(a.id || a.referencia || "").localeCompare(
        String(b.id || b.referencia || "")
    );
}

function obtenerHorasInicioOperativoEmbarque(
    embarque,
    embarques = obtenerEmbarques()
) {
    const diaLlegada = obtenerFechaDiaEmbarque(
        obtenerLlegadaEmbarque(embarque)
    );

    if (!diaLlegada || !esContenedorEmbarque(embarque)) {
        return 0;
    }

    const contenedoresDelDia = embarques.filter((item) => {
        return esContenedorEmbarque(item) &&
            obtenerFechaDiaEmbarque(obtenerLlegadaEmbarque(item)) ===
                diaLlegada;
    }).sort(compararOrdenLlegadaContenedores);

    if (contenedoresDelDia.length < 2) {
        return 0;
    }

    const posicion = contenedoresDelDia.findIndex((item) => {
        return item === embarque || Boolean(embarque.id) &&
            item.id === embarque.id;
    });

    return posicion >= 0
        ? (posicion + 1) * HORAS_INICIO_POR_CONTENEDOR_DIA
        : 0;
}

function obtenerMetasEmbarque(embarque, embarques = obtenerEmbarques()) {
    const llegada = obtenerLlegadaEmbarque(embarque);
    const control = obtenerControlIngresoEmbarque(embarque);
    const horasInicio = obtenerHorasInicioOperativoEmbarque(
        embarque,
        embarques
    );

    return {
        control: evaluarMetaEmbarque(
            llegada,
            control,
            HORAS_META_CONTROL_EMBARQUE,
            horasInicio
        ),
        crossdocking: evaluarMetaEmbarque(
            control,
            obtenerCrossdockingEmbarque(embarque),
            HORAS_META_CROSSDOCKING_EMBARQUE
        ),
        almacenamiento: evaluarMetaEmbarque(
            control,
            obtenerAlmacenamientoEmbarque(embarque),
            HORAS_META_ALMACENAMIENTO_EMBARQUE
        )
    };
}

function embarqueTieneMetaVencida(embarque, embarques = obtenerEmbarques()) {
    return Object.values(obtenerMetasEmbarque(embarque, embarques)).some((meta) => {
        return meta.estado === CUMPLIMIENTO_EMBARQUE_VENCIDO ||
            meta.estado === CUMPLIMIENTO_EMBARQUE_FUERA_META;
    });
}

function formatearFechaDiaEmbarque(valor) {
    const fecha = obtenerFechaHoraEmbarque(valor);

    if (!fecha) {
        return "Pendiente";
    }

    return fecha.toLocaleDateString("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function obtenerFechaDiaEmbarque(valor) {
    const texto = String(valor || "");
    return texto ? texto.slice(0, 10) : "";
}

function valorCampoEmbarque(id) {
    const control = document.getElementById(id);
    return control ? control.value.trim() : "";
}

function numeroCampoEmbarque(id) {
    const valor = Number(valorCampoEmbarque(id));
    return Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

function obtenerEstadoEmbarque(embarque) {
    const crossdocking = obtenerCrossdockingEmbarque(embarque);
    const almacenamiento = obtenerAlmacenamientoEmbarque(embarque);
    const registroHeredado = !Object.prototype.hasOwnProperty.call(
        embarque,
        "fechaCrossdocking"
    );

    if (
        almacenamiento &&
        (crossdocking || (registroHeredado && embarque.fechaFinalizacion))
    ) {
        return ESTADO_EMBARQUE_FINALIZADO;
    }

    if (almacenamiento) {
        return ESTADO_EMBARQUE_ALMACENAMIENTO;
    }

    if (crossdocking) {
        return ESTADO_EMBARQUE_CROSSDOCKING;
    }

    if (obtenerControlIngresoEmbarque(embarque)) {
        return ESTADO_EMBARQUE_CONTROL;
    }

    if (obtenerLlegadaEmbarque(embarque)) {
        return ESTADO_EMBARQUE_LLEGADA;
    }

    return ESTADO_EMBARQUE_PENDIENTE_LLEGADA;
}

function fechaHoyLocal() {
    const fecha = new Date();
    const ano = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatearFechaIsoLocalEmbarque(fecha) {
    const ano = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function obtenerRangoCicloFacturacionEmbarques(valorMes) {
    if (!/^\d{4}-\d{2}$/.test(valorMes)) {
        return null;
    }

    const [ano, mes] = valorMes.split("-").map(Number);
    const desde = new Date(ano, mes - 2, 21);
    const hasta = new Date(ano, mes - 1, 20);

    return {
        desde: formatearFechaIsoLocalEmbarque(desde),
        hasta: formatearFechaIsoLocalEmbarque(hasta)
    };
}

function aplicarCicloFacturacionEmbarques() {
    const rango = obtenerRangoCicloFacturacionEmbarques(
        valorCampoEmbarque("mes-ciclo-embarques")
    );

    if (!rango) {
        mostrarMensajeEmbarques(
            "Seleccioná un mes de cierre para aplicar el ciclo.",
            "error"
        );
        return;
    }

    asignarValorEmbarque("filtro-desde-embarques", rango.desde);
    asignarValorEmbarque("filtro-hasta-embarques", rango.hasta);
    mostrarEmbarques();
}

function actualizarDetalleCicloEmbarques(desde, hasta) {
    const detalle = document.getElementById("detalle-ciclo-embarques");

    if (!detalle) {
        return;
    }

    if (!desde && !hasta) {
        detalle.textContent = "Todos los períodos.";
        return;
    }

    const rangoCiclo = obtenerRangoCicloFacturacionEmbarques(
        valorCampoEmbarque("mes-ciclo-embarques")
    );
    const esCiclo = rangoCiclo && desde === rangoCiclo.desde &&
        hasta === rangoCiclo.hasta;
    const etiqueta = esCiclo ? "Ciclo 21–20" : "Período personalizado";
    const fechaDesde = desde ? formatearFechaDiaEmbarque(desde) : "inicio";
    const fechaHasta = hasta ? formatearFechaDiaEmbarque(hasta) : "hoy";
    detalle.textContent = `${etiqueta}: ${fechaDesde} al ${fechaHasta}.`;
}

function mostrarEmbarques() {
    const tabla = document.getElementById("tabla-embarques");

    if (!tabla) {
        return;
    }

    const embarques = obtenerEmbarques();
    const operativa = valorCampoEmbarque("filtro-operativa-embarques") ||
        TODAS_LAS_OPERATIVAS;
    const estado = valorCampoEmbarque("filtro-estado-embarques") ||
        TODOS_LOS_ESTADOS_EMBARQUE;
    const motivoRetraso = valorCampoEmbarque("filtro-motivo-retraso-embarques") || "Todos";
    const desde = valorCampoEmbarque("filtro-desde-embarques");
    const hasta = valorCampoEmbarque("filtro-hasta-embarques");
    actualizarDetalleCicloEmbarques(desde, hasta);
    const filtrados = embarques.filter((embarque) => {
        if (
            operativa !== TODAS_LAS_OPERATIVAS &&
            normalizarOperativa(embarque.operativa) !== operativa
        ) {
            return false;
        }

        if (
            estado !== TODOS_LOS_ESTADOS_EMBARQUE &&
            obtenerEstadoEmbarque(embarque) !== estado
        ) {
            return false;
        }

        if (motivoRetraso !== "Todos" && embarque.motivoRetraso !== motivoRetraso) {
            return false;
        }
        const fechaLlegada = obtenerFechaDiaEmbarque(
            obtenerLlegadaEmbarque(embarque)
        );

        if ((desde || hasta) && !fechaLlegada) {
            return false;
        }

        if (desde && fechaLlegada < desde) {
            return false;
        }

        if (hasta && fechaLlegada > hasta) {
            return false;
        }

        return true;
    }).sort(compararEmbarques);

    tabla.innerHTML = "";
    actualizarResumenEmbarques(filtrados, embarques);

    const detalle = document.getElementById("resultado-filtro-embarques");

    if (detalle) {
        const palabra = filtrados.length === 1 ? "embarque" : "embarques";
        detalle.textContent = `${filtrados.length} ${palabra}`;
    }

    if (filtrados.length === 0) {
        agregarFilaVacia(tabla, 15, "No hay embarques para mostrar.");
        return;
    }

    filtrados.forEach((embarque) => {
        const fila = document.createElement("tr");
        fila.appendChild(crearCelda(embarque.referencia));
        fila.appendChild(crearCelda(normalizarOperativa(embarque.operativa)));
        fila.appendChild(crearCelda(embarque.origen));
        fila.appendChild(crearCelda(embarque.tipoCarga));
        fila.appendChild(crearCelda(formatearVolumenEmbarque(embarque)));
        fila.appendChild(crearCelda(formatearFechaDiaEmbarque(
            obtenerLlegadaEmbarque(embarque)
        )));
        const metas = obtenerMetasEmbarque(embarque, embarques);
        fila.appendChild(crearCeldaHitoEmbarque(
            obtenerControlIngresoEmbarque(embarque),
            metas.control
        ));
        fila.appendChild(crearCeldaHitoEmbarque(
            obtenerCrossdockingEmbarque(embarque),
            metas.crossdocking
        ));
        fila.appendChild(crearCeldaHitoEmbarque(
            obtenerAlmacenamientoEmbarque(embarque),
            metas.almacenamiento
        ));
        fila.appendChild(crearCeldaEstadoEmbarque(embarque));
        fila.appendChild(crearCelda(embarque.motivoRetraso || "—"));
        fila.appendChild(crearCelda(embarque.responsableResolucion || "—"));
        fila.appendChild(crearCelda(embarque.fechaPrevistaResolucion ? formatearFechaDiaEmbarque(embarque.fechaPrevistaResolucion) : "—"));
        fila.appendChild(crearCelda(embarque.observaciones || "—"));
        fila.appendChild(crearCeldaAccionesEmbarque(embarque));
        tabla.appendChild(fila);
    });
}

function compararEmbarques(a, b) {
    const finalizadoA = obtenerEstadoEmbarque(a) ===
        ESTADO_EMBARQUE_FINALIZADO;
    const finalizadoB = obtenerEstadoEmbarque(b) ===
        ESTADO_EMBARQUE_FINALIZADO;

    if (finalizadoA !== finalizadoB) {
        return finalizadoA ? 1 : -1;
    }

    const fechaA = obtenerLlegadaEmbarque(a) || a.fechaRegistro || "";
    const fechaB = obtenerLlegadaEmbarque(b) || b.fechaRegistro || "";

    return finalizadoA
        ? fechaB.localeCompare(fechaA)
        : fechaA.localeCompare(fechaB);
}

function actualizarResumenEmbarques(embarques, todosEmbarques = embarques) {
    const activos = embarques.filter((embarque) => {
        return obtenerEstadoEmbarque(embarque) !== ESTADO_EMBARQUE_FINALIZADO;
    });
    const recibidos = embarques.filter((embarque) => {
        return Boolean(obtenerLlegadaEmbarque(embarque));
    });
    const metasVencidas = embarques.filter((embarque) => {
        return embarqueTieneMetaVencida(embarque, todosEmbarques);
    });
    const finalizados = embarques.filter((embarque) => {
        return obtenerEstadoEmbarque(embarque) === ESTADO_EMBARQUE_FINALIZADO;
    });

    const retrasosActivos = activos.filter((embarque) => Boolean(embarque.motivoRetraso));
    const hoy = fechaHoyLocal();
    const resolucionesVencidas = retrasosActivos.filter((embarque) => {
        const fecha = obtenerFechaDiaEmbarque(embarque.fechaPrevistaResolucion);
        return Boolean(fecha) && fecha < hoy;
    });
    const frecuencias = {};
    retrasosActivos.forEach((embarque) => {
        const motivo = embarque.motivoRetraso;
        frecuencias[motivo] = (frecuencias[motivo] || 0) + 1;
    });
    const causaPrincipal = Object.entries(frecuencias)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))[0];
    actualizarTexto("total-retrasos-activos-embarques", retrasosActivos.length);
    actualizarTexto("total-resoluciones-vencidas-embarques", resolucionesVencidas.length);
    actualizarTexto("causa-principal-retrasos-embarques", causaPrincipal ? causaPrincipal[0] : "Sin datos");
    actualizarTexto("detalle-causa-principal-retrasos-embarques", causaPrincipal ? `${causaPrincipal[1]} caso${causaPrincipal[1] === 1 ? "" : "s"}` : "No hay retrasos activos");
    actualizarTexto("total-embarques", activos.length);
    actualizarTexto("total-embarques-recibidos", recibidos.length);
    actualizarTexto("total-embarques-metas-vencidas", metasVencidas.length);
    actualizarTexto("total-embarques-finalizados", finalizados.length);
    actualizarGraficoCumplimientoEmbarques(embarques, todosEmbarques);
}

function obtenerEstadoCumplimientoGeneralEmbarque(embarque, embarques) {
    const estados = Object.values(obtenerMetasEmbarque(embarque, embarques))
        .map((meta) => meta.estado);

    if (estados.every((estado) => estado === CUMPLIMIENTO_EMBARQUE_EN_META)) {
        return "cumplida";
    }

    if (estados.some((estado) => {
        return estado === CUMPLIMIENTO_EMBARQUE_FUERA_META ||
            estado === CUMPLIMIENTO_EMBARQUE_VENCIDO;
    })) {
        return "incumplida";
    }

    return "pendiente";
}

function actualizarGraficoCumplimientoEmbarques(
    embarques,
    todosEmbarques = embarques
) {
    const grafico = document.getElementById("grafico-cumplimiento-embarques");

    if (!grafico) {
        return;
    }

    const contenedores = embarques.filter(esContenedorEmbarque);
    const totales = {
        cumplida: 0,
        incumplida: 0,
        pendiente: 0
    };

    contenedores.forEach((embarque) => {
        const estado = obtenerEstadoCumplimientoGeneralEmbarque(
            embarque,
            todosEmbarques
        );
        totales[estado] += 1;
    });

    const total = contenedores.length;
    const finCumplidas = total ? totales.cumplida / total * 100 : 0;
    const finIncumplidas = total
        ? (totales.cumplida + totales.incumplida) / total * 100
        : 0;
    const porcentajeCumplidas = total
        ? Math.round(totales.cumplida / total * 100)
        : 0;
    const palabra = total === 1 ? "contenedor evaluado" : "contenedores evaluados";

    grafico.style.setProperty("--fin-meta-cumplida", `${finCumplidas}%`);
    grafico.style.setProperty("--fin-meta-incumplida", `${finIncumplidas}%`);
    grafico.dataset.sinDatos = total ? "false" : "true";
    grafico.setAttribute(
        "aria-label",
        total
            ? `${totales.cumplida} con meta cumplida, ` +
                `${totales.incumplida} con meta no cumplida y ` +
                `${totales.pendiente} pendientes`
            : "Sin contenedores registrados"
    );

    actualizarTexto(
        "porcentaje-meta-cumplida-embarques",
        `${porcentajeCumplidas}%`
    );
    actualizarTexto("total-meta-cumplida-embarques", totales.cumplida);
    actualizarTexto("total-meta-incumplida-embarques", totales.incumplida);
    actualizarTexto("total-meta-pendiente-embarques", totales.pendiente);
    actualizarTexto(
        "detalle-grafico-cumplimiento-embarques",
        total ? `${total} ${palabra}.` : "Aún no hay contenedores registrados."
    );
}

function crearCeldaEstadoEmbarque(embarque) {
    const celda = document.createElement("td");
    const insignia = document.createElement("span");
    const estado = obtenerEstadoEmbarque(embarque);
    const clases = {
        [ESTADO_EMBARQUE_PENDIENTE_LLEGADA]: "estado-proximo",
        [ESTADO_EMBARQUE_LLEGADA]: "estado-confirmado",
        [ESTADO_EMBARQUE_CONTROL]: "estado-almacenaje",
        [ESTADO_EMBARQUE_CROSSDOCKING]: "estado-almacenaje",
        [ESTADO_EMBARQUE_ALMACENAMIENTO]: "estado-almacenaje",
        [ESTADO_EMBARQUE_FINALIZADO]: "estado-finalizado"
    };
    insignia.className = `insignia ${clases[estado]}`;
    insignia.textContent = estado;
    celda.appendChild(insignia);
    return celda;
}

function crearCeldaHitoEmbarque(fechaReal, meta) {
    const celda = document.createElement("td");
    const contenedor = document.createElement("div");
    contenedor.className = "detalle-hito-embarque";

    const fecha = document.createElement("strong");
    fecha.textContent = formatearFechaDiaEmbarque(fechaReal);
    const estado = document.createElement("span");
    estado.className =
        `insignia insignia-meta-embarque meta-${meta.estado}`;
    estado.textContent = meta.etiqueta;
    contenedor.append(fecha, estado);

    if (meta.limite) {
        if (meta.horasHastaInicio) {
            const inicio = document.createElement("small");
            inicio.textContent =
                `Inicio operativo: ${formatearFechaDiaEmbarque(meta.inicio)} ` +
                `(+${meta.horasHastaInicio} h)`;
            contenedor.appendChild(inicio);
        }

        const limite = document.createElement("small");
        limite.textContent =
            `Meta: ${formatearFechaDiaEmbarque(meta.limite)}`;
        contenedor.appendChild(limite);
    }

    celda.appendChild(contenedor);
    return celda;
}

function crearCeldaAccionesEmbarque(embarque) {
    const celda = document.createElement("td");

    if (!esAdministrador()) {
        celda.textContent = "Solo lectura";
        return celda;
    }

    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "boton-secundario";
    editar.textContent = "Editar";
    editar.dataset.editarEmbarque = embarque.id;

    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.className = "boton-eliminar";
    eliminar.textContent = "Eliminar";
    eliminar.dataset.eliminarEmbarque = embarque.id;

    const contenedor = document.createElement("div");
    contenedor.className = "acciones-formulario";
    contenedor.append(editar, eliminar);
    celda.appendChild(contenedor);
    return celda;
}

function formatearVolumenEmbarque(embarque) {
    const bultos = Number(embarque.bultos || 0);
    const fechaEstimada = obtenerFechaDiaEmbarque(
        embarque.fechaEstimadaArribo
    );
    const detalleBultos = bultos
        ? `${bultos.toLocaleString("es-UY")} bultos`
        : "Sin bultos";
    const detalleArribo = fechaEstimada
        ? `Arribo estimado: ${formatearFechaDiaEmbarque(fechaEstimada)}`
        : "Arribo estimado: sin fecha";

    return `${detalleBultos} / ${detalleArribo}`;
}

function editarEmbarque(embarqueId) {
    const embarque = obtenerEmbarques().find((item) => {
        return item.id === embarqueId;
    });

    if (!embarque || !esAdministrador()) {
        return;
    }

    asignarValorEmbarque("embarque-id", embarque.id);
    asignarValorEmbarque("referencia-embarque", embarque.referencia);
    asignarValorEmbarque("operativa-embarque", embarque.operativa);
    asignarValorEmbarque("origen-embarque", embarque.origen);
    asignarValorEmbarque("tipo-carga-embarque", embarque.tipoCarga);
    asignarValorEmbarque("bultos-embarque", embarque.bultos || "");
    asignarValorEmbarque(
        "fecha-estimada-arribo-embarque",
        obtenerFechaDiaEmbarque(embarque.fechaEstimadaArribo)
    );
    asignarValorEmbarque(
        "fecha-llegada-embarque",
        obtenerFechaDiaEmbarque(obtenerLlegadaEmbarque(embarque))
    );
    asignarValorEmbarque(
        "fecha-control-ingreso-embarque",
        obtenerFechaDiaEmbarque(obtenerControlIngresoEmbarque(embarque))
    );
    asignarValorEmbarque(
        "fecha-crossdocking-embarque",
        obtenerFechaDiaEmbarque(obtenerCrossdockingEmbarque(embarque))
    );
    asignarValorEmbarque(
        "fecha-almacenamiento-embarque",
        obtenerFechaDiaEmbarque(obtenerAlmacenamientoEmbarque(embarque))
    );
    asignarValorEmbarque("motivo-retraso-embarque", embarque.motivoRetraso);
    asignarValorEmbarque("responsable-resolucion-embarque", embarque.responsableResolucion);
    asignarValorEmbarque("fecha-prevista-resolucion-embarque", obtenerFechaDiaEmbarque(embarque.fechaPrevistaResolucion));
    asignarValorEmbarque(
        "observaciones-embarque",
        embarque.observaciones
    );

    actualizarTexto("titulo-form-embarque", "Actualizar embarque");
    const cancelar = document.getElementById("cancelar-edicion-embarque");

    if (cancelar) {
        cancelar.hidden = false;
    }

    actualizarVistaPreviaMetasEmbarque();
    abrirPanelFormularioEmbarque();
}

function abrirPanelFormularioEmbarque() {
    const panel = document.getElementById("panel-formulario-embarque");

    if (!panel) {
        return;
    }

    panel.open = true;
    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function limpiarFiltrosEmbarques() {
    asignarValorEmbarque(
        "filtro-operativa-embarques",
        TODAS_LAS_OPERATIVAS
    );
    asignarValorEmbarque(
        "filtro-estado-embarques",
        TODOS_LOS_ESTADOS_EMBARQUE
    );
    asignarValorEmbarque("filtro-motivo-retraso-embarques", "Todos");
    asignarValorEmbarque("filtro-desde-embarques", "");
    asignarValorEmbarque("filtro-hasta-embarques", "");
    mostrarEmbarques();
}

function asignarValorEmbarque(id, valor) {
    const control = document.getElementById(id);

    if (control) {
        control.value = valor || "";
    }
}

function limpiarFormularioEmbarque() {
    const formulario = document.getElementById("form-embarque");

    if (formulario) {
        formulario.reset();
    }

    asignarValorEmbarque("embarque-id", "");
    actualizarTexto("titulo-form-embarque", "Registrar embarque");

    const cancelar = document.getElementById("cancelar-edicion-embarque");

    if (cancelar) {
        cancelar.hidden = true;
    }

    const panel = document.getElementById("panel-formulario-embarque");

    if (panel) {
        panel.open = false;
    }

    actualizarVistaPreviaMetasEmbarque();
}

function eliminarEmbarque(embarqueId) {
    if (!esAdministrador()) {
        return;
    }

    if (!confirm("¿Querés eliminar este embarque?")) {
        return;
    }

    const embarques = obtenerEmbarques();
    const actualizados = embarques.filter((embarque) => {
        return embarque.id !== embarqueId;
    });

    if (!guardarEmbarques(actualizados)) {
        mostrarMensajeEmbarques(
            "No fue posible eliminar el embarque.",
            "error"
        );
        return;
    }

    mostrarEmbarques();
    mostrarMensajeEmbarques("Embarque eliminado correctamente.", "exito");
}

function mostrarMensajeEmbarques(texto, tipo) {
    mostrarMensajeTemporal("mensaje-embarques", texto, tipo);
}

function inicializarSugerenciasFechaArriboEmbarque() {
    document.querySelectorAll("[data-dias-arribo]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const dias = Number(boton.dataset.diasArribo || 0);
            const fecha = new Date();
            fecha.setHours(12, 0, 0, 0);
            fecha.setDate(fecha.getDate() + dias);
            const control = document.getElementById("fecha-estimada-arribo-embarque");
            if (control) {
                control.value = fecha.toISOString().slice(0, 10);
                control.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    });
}