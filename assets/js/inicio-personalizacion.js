const CLAVE_VISTAS_INICIO = "gestion_personal_vistas_inicio";

const WIDGETS_INICIO = [
    { id: "gestion", titulo: "Gestión general", categoria: "Resumen" },
    { id: "filtros", titulo: "Período de análisis", categoria: "Filtros y período" },
    { id: "indicadores", titulo: "Indicadores operativos", categoria: "Resumen" },
    { id: "tendencia", titulo: "Tendencia diaria", categoria: "Análisis" },
    { id: "distribucion", titulo: "Unidades por tarea", categoria: "Análisis" },
    { id: "embarques", titulo: "Embarques del período", categoria: "Logística" },
    { id: "equipo", titulo: "Top de operarios", categoria: "Análisis" }
];

const ORDEN_WIDGETS_INICIO = WIDGETS_INICIO.map((widget) => widget.id);

const PLANTILLAS_VISTA_INICIO = {
    operario: {
        nombre: "Operario",
        descripcion: "Actividad básica generada por tu usuario WIS.",
        visibles: ["indicadores", "tendencia"],
        orden: [
            "indicadores",
            "tendencia",
            "filtros",
            "gestion",
            "distribucion",
            "embarques",
            "equipo"
        ]
    },
    administrativo: {
        nombre: "Administrativo",
        descripcion: "Números, filtros de fecha y ciclo de facturación 21–20.",
        visibles: [
            "gestion",
            "filtros",
            "indicadores",
            "distribucion",
            "embarques"
        ],
        orden: [
            "gestion",
            "filtros",
            "indicadores",
            "distribucion",
            "embarques",
            "tendencia",
            "equipo"
        ]
    },
    supervisor: {
        nombre: "Supervisor",
        descripcion: "Vista completa de la operación, el equipo y la logística.",
        visibles: ORDEN_WIDGETS_INICIO,
        orden: ORDEN_WIDGETS_INICIO
    }
};

let preferenciaInicioActual = null;
let vistaInicioEnEdicion = false;
let widgetInicioArrastrado = "";

function inicializarPersonalizacionInicio() {
    const tablero = document.getElementById("tablero-inicio-personalizable");

    if (!tablero) {
        return;
    }

    const usuario = obtenerUsuarioActual();
    const recomendada = obtenerVistaRecomendadaInicio(usuario);
    preferenciaInicioActual = obtenerPreferenciaInicio(usuario, recomendada);
    aplicarPreferenciaInicio();
    configurarControlesPersonalizacionInicio();
    configurarArrastreWidgetsInicio();
    configurarBotonesQuitarWidgetsInicio();
    alternarEdicionVistaInicio(false);
}

function obtenerVistaRecomendadaInicio(usuario = obtenerUsuarioActual()) {
    const operario = usuario && usuario.operarioId
        ? obtenerOperarios().find((item) => item.id === usuario.operarioId)
        : null;
    const cargo = normalizarTextoVistaInicio(operario?.cargo);

    if (cargo.includes("operario")) {
        return "operario";
    }

    if (cargo.includes("administrativo")) {
        return "administrativo";
    }

    if (cargo.includes("supervisor")) {
        return "supervisor";
    }

    return esAdministrador() ? "supervisor" : "administrativo";
}

function obtenerPreferenciaInicio(usuario, recomendada) {
    const guardadas = typeof leerStorage === "function"
        ? leerStorage(CLAVE_VISTAS_INICIO, {})
        : {};
    const guardada = usuario && guardadas && guardadas[usuario.id];

    if (!guardada || !PLANTILLAS_VISTA_INICIO[guardada.plantilla]) {
        return crearPreferenciaDesdePlantillaInicio(recomendada, false);
    }

    const ordenValido = normalizarOrdenWidgetsInicio(guardada.orden);
    const ocultosValidos = Array.isArray(guardada.ocultos)
        ? guardada.ocultos.filter((id) => ORDEN_WIDGETS_INICIO.includes(id))
        : [];

    return {
        plantilla: guardada.plantilla,
        orden: ordenValido,
        ocultos: ocultosValidos,
        personalizada: Boolean(guardada.personalizada)
    };
}

function crearPreferenciaDesdePlantillaInicio(plantillaId, personalizada = true) {
    const plantilla = PLANTILLAS_VISTA_INICIO[plantillaId] ||
        PLANTILLAS_VISTA_INICIO.administrativo;
    const visibles = new Set(plantilla.visibles);

    return {
        plantilla: PLANTILLAS_VISTA_INICIO[plantillaId]
            ? plantillaId
            : "administrativo",
        orden: normalizarOrdenWidgetsInicio(plantilla.orden),
        ocultos: ORDEN_WIDGETS_INICIO.filter((id) => !visibles.has(id)),
        personalizada
    };
}

function normalizarOrdenWidgetsInicio(orden) {
    const validos = Array.isArray(orden)
        ? orden.filter((id, indice) => {
            return ORDEN_WIDGETS_INICIO.includes(id) &&
                orden.indexOf(id) === indice;
        })
        : [];

    ORDEN_WIDGETS_INICIO.forEach((id) => {
        if (!validos.includes(id)) {
            validos.push(id);
        }
    });

    return validos;
}

function aplicarPreferenciaInicio() {
    const tablero = document.getElementById("tablero-inicio-personalizable");

    if (!tablero || !preferenciaInicioActual) {
        return;
    }

    const widgets = new Map(
        [...tablero.querySelectorAll("[data-inicio-widget]")].map((elemento) => {
            return [elemento.dataset.inicioWidget, elemento];
        })
    );

    preferenciaInicioActual.orden.forEach((id) => {
        const elemento = widgets.get(id);

        if (elemento) {
            elemento.hidden = preferenciaInicioActual.ocultos.includes(id);
            tablero.appendChild(elemento);
        }
    });

    actualizarDetalleVistaInicio();
    renderizarListaPersonalizacionInicio();
    actualizarBotonesPlantillaInicio();
}

function configurarControlesPersonalizacionInicio() {
    const abrir = document.getElementById("personalizar-vista-inicio");
    const cerrar = document.getElementById("cerrar-personalizar-inicio");
    const guardar = document.getElementById("guardar-vista-inicio");
    const restaurar = document.getElementById("restaurar-vista-inicio");
    const lista = document.getElementById("lista-personalizar-inicio");

    abrir?.addEventListener("click", () => alternarEdicionVistaInicio(true));
    cerrar?.addEventListener("click", () => alternarEdicionVistaInicio(false));
    guardar?.addEventListener("click", guardarVistaInicioManualmente);
    restaurar?.addEventListener("click", restaurarVistaRecomendadaInicio);

    document.querySelectorAll("[data-aplicar-vista-inicio]")
        .forEach((boton) => {
            boton.addEventListener("click", () => {
                aplicarPlantillaVistaInicio(boton.dataset.aplicarVistaInicio);
            });
        });

    lista?.addEventListener("change", (evento) => {
        const control = evento.target.closest("[data-mostrar-widget-inicio]");

        if (!control) {
            return;
        }

        cambiarVisibilidadWidgetInicio(
            control.dataset.mostrarWidgetInicio,
            control.checked
        );
    });

    lista?.addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-mover-widget-inicio]");

        if (!boton) {
            return;
        }

        moverWidgetInicio(
            boton.dataset.moverWidgetInicio,
            Number(boton.dataset.direccionWidgetInicio)
        );
    });
}

function configurarBotonesQuitarWidgetsInicio() {
    document.querySelectorAll("[data-inicio-widget]").forEach((widget) => {
        if (widget.querySelector(".quitar-widget-inicio")) {
            return;
        }

        const asa = widget.querySelector(".asa-widget-inicio");
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "quitar-widget-inicio";
        boton.textContent = "×";
        boton.title = "Quitar de mi vista";
        boton.setAttribute(
            "aria-label",
            `Quitar ${obtenerTituloWidgetInicio(widget.dataset.inicioWidget)} de mi vista`
        );
        boton.addEventListener("click", (evento) => {
            evento.stopPropagation();
            cambiarVisibilidadWidgetInicio(
                widget.dataset.inicioWidget,
                false
            );
            mostrarMensajePersonalizacionInicio(
                "Se quitó la sección. Podés recuperarla desde Personalizar vista."
            );
        });

        if (asa?.parentElement) {
            asa.parentElement.insertBefore(boton, asa);
        } else {
            widget.appendChild(boton);
        }
    });
}

function obtenerTituloWidgetInicio(widgetId) {
    return WIDGETS_INICIO.find((widget) => widget.id === widgetId)?.titulo ||
        "esta sección";
}

function guardarVistaInicioManualmente() {
    if (!preferenciaInicioActual) {
        return;
    }

    preferenciaInicioActual.personalizada = true;

    if (guardarPreferenciaInicio()) {
        actualizarDetalleVistaInicio();
        mostrarMensajePersonalizacionInicio(
            "Tu vista quedó guardada para este usuario."
        );
    } else {
        mostrarMensajePersonalizacionInicio(
            "No fue posible guardar la vista."
        );
    }
}

function alternarEdicionVistaInicio(activar) {
    const panel = document.getElementById("panel-personalizar-inicio");
    const boton = document.getElementById("personalizar-vista-inicio");
    const pagina = document.querySelector(".pagina-inicio-personalizable");

    vistaInicioEnEdicion = Boolean(activar);

    if (panel) {
        panel.hidden = !vistaInicioEnEdicion;
    }

    if (boton) {
        boton.setAttribute("aria-expanded", String(vistaInicioEnEdicion));
        boton.textContent = vistaInicioEnEdicion
            ? "Personalizando…"
            : "Personalizar vista";
    }

    pagina?.classList.toggle("modo-edicion-inicio", vistaInicioEnEdicion);
    document.querySelectorAll("[data-inicio-widget]").forEach((widget) => {
        widget.draggable = vistaInicioEnEdicion && !widget.hidden;
    });
    document.querySelectorAll(".asa-widget-inicio").forEach((asa) => {
        asa.hidden = !vistaInicioEnEdicion;
        asa.tabIndex = vistaInicioEnEdicion ? 0 : -1;
    });

    if (vistaInicioEnEdicion) {
        panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function aplicarPlantillaVistaInicio(plantillaId) {
    if (!PLANTILLAS_VISTA_INICIO[plantillaId]) {
        return;
    }

    preferenciaInicioActual = crearPreferenciaDesdePlantillaInicio(
        plantillaId,
        false
    );
    guardarPreferenciaInicio();
    aplicarPreferenciaInicio();
    actualizarDatosSegunVistaInicio();
    mostrarMensajePersonalizacionInicio(
        `Vista ${PLANTILLAS_VISTA_INICIO[plantillaId].nombre} aplicada.`
    );
}

function restaurarVistaRecomendadaInicio() {
    const recomendada = obtenerVistaRecomendadaInicio();
    preferenciaInicioActual = crearPreferenciaDesdePlantillaInicio(
        recomendada,
        false
    );
    guardarPreferenciaInicio();
    aplicarPreferenciaInicio();
    actualizarDatosSegunVistaInicio();
    mostrarMensajePersonalizacionInicio("Se restauró la vista recomendada para tu cuenta.");
}

function cambiarVisibilidadWidgetInicio(widgetId, mostrar) {
    if (!ORDEN_WIDGETS_INICIO.includes(widgetId)) {
        return;
    }

    const ocultos = new Set(preferenciaInicioActual.ocultos);

    if (mostrar) {
        ocultos.delete(widgetId);
    } else {
        ocultos.add(widgetId);
    }

    preferenciaInicioActual.ocultos = [...ocultos];
    preferenciaInicioActual.personalizada = true;
    guardarPreferenciaInicio();
    aplicarPreferenciaInicio();
    document.querySelectorAll("[data-inicio-widget]").forEach((widget) => {
        widget.draggable = vistaInicioEnEdicion && !widget.hidden;
    });
}

function moverWidgetInicio(widgetId, direccion) {
    const indice = preferenciaInicioActual.orden.indexOf(widgetId);
    const destino = indice + direccion;

    if (indice < 0 || destino < 0 || destino >= preferenciaInicioActual.orden.length) {
        return;
    }

    const orden = [...preferenciaInicioActual.orden];
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    preferenciaInicioActual.orden = orden;
    preferenciaInicioActual.personalizada = true;
    guardarPreferenciaInicio();
    aplicarPreferenciaInicio();
}

function renderizarListaPersonalizacionInicio() {
    const lista = document.getElementById("lista-personalizar-inicio");

    if (!lista || !preferenciaInicioActual) {
        return;
    }

    lista.innerHTML = "";

    preferenciaInicioActual.orden.forEach((id, indice) => {
        const datos = WIDGETS_INICIO.find((widget) => widget.id === id);

        if (!datos) {
            return;
        }

        const fila = document.createElement("div");
        const etiqueta = document.createElement("label");
        const control = document.createElement("input");
        const textos = document.createElement("span");
        const categoria = document.createElement("small");
        const titulo = document.createElement("strong");
        const acciones = document.createElement("div");
        const subir = crearBotonMoverWidgetInicio(id, -1, "↑", "Subir");
        const bajar = crearBotonMoverWidgetInicio(id, 1, "↓", "Bajar");

        fila.className = "fila-personalizar-inicio";
        control.type = "checkbox";
        control.checked = !preferenciaInicioActual.ocultos.includes(id);
        control.dataset.mostrarWidgetInicio = id;
        categoria.textContent = datos.categoria;
        titulo.textContent = datos.titulo;
        textos.append(categoria, titulo);
        etiqueta.append(control, textos);
        acciones.className = "acciones-orden-inicio";
        subir.disabled = indice === 0;
        bajar.disabled = indice === preferenciaInicioActual.orden.length - 1;
        acciones.append(subir, bajar);
        fila.append(etiqueta, acciones);
        lista.appendChild(fila);
    });
}

function crearBotonMoverWidgetInicio(widgetId, direccion, texto, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-orden-inicio";
    boton.textContent = texto;
    boton.title = `${accion} sección`;
    boton.setAttribute("aria-label", `${accion} sección`);
    boton.dataset.moverWidgetInicio = widgetId;
    boton.dataset.direccionWidgetInicio = String(direccion);
    return boton;
}

function configurarArrastreWidgetsInicio() {
    const tablero = document.getElementById("tablero-inicio-personalizable");

    tablero?.querySelectorAll("[data-inicio-widget]").forEach((widget) => {
        widget.addEventListener("dragstart", (evento) => {
            if (!vistaInicioEnEdicion) {
                evento.preventDefault();
                return;
            }

            widgetInicioArrastrado = widget.dataset.inicioWidget;
            widget.classList.add("widget-inicio-arrastrando");
            evento.dataTransfer.effectAllowed = "move";
            evento.dataTransfer.setData("text/plain", widgetInicioArrastrado);
        });

        widget.addEventListener("dragend", () => {
            widgetInicioArrastrado = "";
            widget.classList.remove("widget-inicio-arrastrando");
            guardarOrdenActualInicio();
        });
    });

    tablero?.addEventListener("dragover", (evento) => {
        if (!vistaInicioEnEdicion || !widgetInicioArrastrado) {
            return;
        }

        const destino = evento.target.closest("[data-inicio-widget]");
        const origen = tablero.querySelector(
            `[data-inicio-widget="${widgetInicioArrastrado}"]`
        );

        if (!destino || !origen || destino === origen || destino.hidden) {
            return;
        }

        evento.preventDefault();
        const limites = destino.getBoundingClientRect();
        const despues = evento.clientY > limites.top + limites.height / 2;
        tablero.insertBefore(origen, despues ? destino.nextSibling : destino);
    });

    tablero?.addEventListener("drop", (evento) => {
        if (!vistaInicioEnEdicion || !widgetInicioArrastrado) {
            return;
        }

        evento.preventDefault();
        guardarOrdenActualInicio();
    });
}

function guardarOrdenActualInicio() {
    const tablero = document.getElementById("tablero-inicio-personalizable");

    if (!tablero || !preferenciaInicioActual) {
        return;
    }

    preferenciaInicioActual.orden = [
        ...tablero.querySelectorAll("[data-inicio-widget]")
    ].map((widget) => widget.dataset.inicioWidget);
    preferenciaInicioActual.personalizada = true;
    guardarPreferenciaInicio();
    renderizarListaPersonalizacionInicio();
    actualizarDetalleVistaInicio();
}

function guardarPreferenciaInicio() {
    const usuario = obtenerUsuarioActual();

    if (!usuario || !preferenciaInicioActual || typeof guardarStorage !== "function") {
        return false;
    }

    const guardadas = leerStorage(CLAVE_VISTAS_INICIO, {});
    guardadas[usuario.id] = {
        ...preferenciaInicioActual,
        actualizada: new Date().toISOString()
    };
    return guardarStorage(CLAVE_VISTAS_INICIO, guardadas);
}

function actualizarDetalleVistaInicio() {
    const titulo = document.getElementById("titulo-vista-inicio");
    const detalle = document.getElementById("detalle-vista-inicio");
    const plantilla = PLANTILLAS_VISTA_INICIO[preferenciaInicioActual?.plantilla];

    if (!plantilla) {
        return;
    }

    if (titulo) {
        titulo.textContent = `Vista ${plantilla.nombre}` +
            (preferenciaInicioActual.personalizada ? " personalizada" : "");
    }

    if (detalle) {
        const visibles = ORDEN_WIDGETS_INICIO.length -
            preferenciaInicioActual.ocultos.length;
        const alcance = preferenciaInicioActual.plantilla === "operario"
            ? ` · Solo datos WIS de ${obtenerNombreUsuarioVistaInicio()}`
            : "";
        detalle.textContent = `${plantilla.descripcion} · ${visibles} secciones visibles${alcance}`;
    }
}

function actualizarBotonesPlantillaInicio() {
    document.querySelectorAll("[data-aplicar-vista-inicio]")
        .forEach((boton) => {
            const activo = boton.dataset.aplicarVistaInicio ===
                preferenciaInicioActual?.plantilla;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-pressed", String(activo));
        });
}

function mostrarMensajePersonalizacionInicio(texto) {
    const mensaje = document.getElementById("mensaje-personalizar-inicio");

    if (!mensaje) {
        return;
    }

    mensaje.textContent = texto;
    clearTimeout(mensaje._temporizadorVistaInicio);
    mensaje._temporizadorVistaInicio = setTimeout(() => {
        if (mensaje.isConnected) {
            mensaje.textContent = "";
        }
    }, 3500);
}

function aplicarAlcanceVistaInicio(filas) {
    if (
        preferenciaInicioActual?.plantilla !== "operario" ||
        !Array.isArray(filas)
    ) {
        return Array.isArray(filas) ? filas : [];
    }

    const identidades = obtenerIdentidadesUsuarioVistaInicio();

    if (!identidades.size) {
        return [];
    }

    return filas.filter((fila) => {
        return identidades.has(normalizarTextoVistaInicio(fila.usuario));
    });
}

function obtenerIdentidadesUsuarioVistaInicio() {
    const usuario = obtenerUsuarioActual();
    const operario = usuario?.operarioId
        ? obtenerOperarios().find((item) => item.id === usuario.operarioId)
        : null;
    const candidatos = [
        usuario?.nombreUsuario,
        usuario?.nombre,
        operario?.legajo,
        operario?.nombre
    ];

    return new Set(
        candidatos.map(normalizarTextoVistaInicio).filter(Boolean)
    );
}

function obtenerNombreUsuarioVistaInicio() {
    const usuario = obtenerUsuarioActual();
    return usuario?.nombreUsuario || usuario?.nombre || "tu cuenta";
}

function normalizarTextoVistaInicio(valor) {
    return String(valor || "")
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function actualizarDatosSegunVistaInicio() {
    if (typeof actualizarOpcionesAplicacionesInicio === "function") {
        actualizarOpcionesAplicacionesInicio();
    }

    if (typeof actualizarResumenInicio === "function") {
        actualizarResumenInicio();
    }

    if (typeof cargarResumenOperativoInicio === "function") {
        cargarResumenOperativoInicio(false).catch(console.error);
    }
}
