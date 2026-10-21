(() => {
    "use strict";

    let manejadorActualizacionCatalogo = null;
    let manejadorActualizacionActividades = null;
    let categoriaUnidadesEdicion = "operativo";

    function elemento(id) {
        return document.getElementById(id);
    }

    function normalizarTexto(valor) {
        return String(valor ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .toLowerCase();
    }

    function esAdminActual() {
        return typeof esAdministrador === "function" && esAdministrador();
    }

    function catalogoDisponible() {
        return typeof obtenerCatalogoReglasTraceWis === "function" &&
            typeof obtenerHistorialReglasTraceWis === "function";
    }

    function catalogoActividadesDisponible() {
        return typeof obtenerCatalogoActividades === "function" &&
            typeof obtenerActividadesManuales === "function" &&
            typeof obtenerHistorialActividades === "function";
    }

    function mostrarMensaje(texto, tipo = "") {
        const mensaje = elemento("mensaje-regla-wis");

        if (!mensaje) {
            return;
        }

        mensaje.textContent = texto;
        mensaje.className = tipo ? `mensaje ${tipo}` : "mensaje";
    }

    function mostrarMensajeActividad(texto, tipo = "") {
        const mensaje = elemento("mensaje-actividad-android");

        if (!mensaje) {
            return;
        }

        mensaje.textContent = texto;
        mensaje.className = tipo ? `mensaje ${tipo}` : "mensaje";
    }

    function actualizarPermisos() {
        const administrador = esAdminActual();
        const panel = elemento("panel-form-regla-wis");
        const aviso = elemento("aviso-lectura-reglas-wis");
        const panelActividades = elemento("panel-form-actividad-android");
        const avisoActividades = elemento("aviso-lectura-actividades-android");

        if (panel) {
            panel.hidden = !administrador;
        }

        if (aviso) {
            aviso.hidden = administrador;
        }

        if (panelActividades) {
            panelActividades.hidden = !administrador;
        }

        if (avisoActividades) {
            avisoActividades.hidden = administrador;
        }
    }

    function actualizarResumenActividades() {
        const resumen = typeof obtenerResumenActividades === "function"
            ? obtenerResumenActividades()
            : {
                manuales: 0,
                activas: 0,
                wis: 0,
                disponiblesCatalogo: 0
            };
        const valores = {
            "total-actividades-android": resumen.manuales,
            "total-actividades-android-activas": resumen.activas,
            "total-aplicaciones-wis-protegidas": resumen.wis,
            "total-catalogo-actividades": resumen.disponiblesCatalogo
        };

        Object.entries(valores).forEach(([id, valor]) => {
            const control = elemento(id);

            if (control) {
                control.textContent = Number(valor || 0).toLocaleString("es-UY");
            }
        });
    }

    function obtenerActividadesFiltradas(actividades) {
        const busqueda = normalizarTexto(
            elemento("buscar-actividad-android")?.value
        );
        const origen = elemento("filtro-origen-actividad-android")?.value ||
            "todos";
        const operativa = elemento("filtro-operativa-actividad-android")?.value ||
            "todas";
        const estado = elemento("filtro-estado-actividad-android")?.value ||
            "todos";

        return actividades.filter((actividad) => {
            const texto = normalizarTexto([
                actividad.codigo,
                actividad.nombre,
                actividad.descripcion,
                actividad.operativa,
                actividad.origen
            ].join(" "));
            const coincideBusqueda = !busqueda || texto.includes(busqueda);
            const coincideOrigen = origen === "todos" || actividad.origen === origen;
            const coincideOperativa = operativa === "todas" ||
                actividad.operativa === operativa;
            const estadoActividad = actividad.activa ? "activa" : "inactiva";
            const coincideEstado = estado === "todos" || estado === estadoActividad;
            return coincideBusqueda && coincideOrigen &&
                coincideOperativa && coincideEstado;
        });
    }

    function crearCeldaCodigoActividad(actividad) {
        const celda = document.createElement("td");
        const detalle = document.createElement("div");
        const codigo = document.createElement("code");
        const referencia = document.createElement("small");

        detalle.className = "codigo-actividad-catalogo";
        codigo.textContent = actividad.codigo;
        referencia.textContent = actividad.bloqueada
            ? "Código asignado por WIS"
            : "Código del catálogo web";
        detalle.append(codigo, referencia);
        celda.appendChild(detalle);
        return celda;
    }

    function crearCeldaDetalleActividad(actividad) {
        const celda = document.createElement("td");
        const detalle = document.createElement("div");
        const nombre = document.createElement("strong");
        const descripcion = document.createElement("small");

        detalle.className = "detalle-actividad-catalogo";
        nombre.textContent = actividad.nombre;
        descripcion.textContent = actividad.descripcion || "Sin descripción";
        detalle.append(nombre, descripcion);
        celda.appendChild(detalle);
        return celda;
    }

    function crearCeldaOrigenActividad(actividad) {
        const celda = document.createElement("td");
        const insignia = document.createElement("span");

        insignia.className = `insignia-fuente-catalogo ${actividad.origen}`;
        insignia.textContent = actividad.bloqueada ? "WIS · Protegida" : "Web · Manual";
        celda.appendChild(insignia);
        return celda;
    }

    function crearCeldaEstadoActividad(actividad) {
        const celda = document.createElement("td");
        const estado = actividad.activa ? "activa" : "inactiva";
        const insignia = document.createElement("span");

        insignia.className = `estado-actividad-catalogo ${estado}`;
        insignia.textContent = actividad.activa ? "Activa" : "Inactiva";
        celda.appendChild(insignia);
        return celda;
    }

    function crearCeldaAccionesActividad(actividad) {
        const celda = document.createElement("td");

        if (actividad.bloqueada) {
            celda.textContent = "Protegida";
            return celda;
        }

        if (!esAdminActual()) {
            celda.textContent = "Consulta";
            return celda;
        }

        const acciones = document.createElement("div");
        const editar = document.createElement("button");
        const eliminar = document.createElement("button");

        acciones.className = "acciones-actividad-catalogo";
        editar.type = "button";
        editar.className = "boton-secundario";
        editar.textContent = "Editar";
        editar.dataset.editarActividadAndroid = actividad.id;
        eliminar.type = "button";
        eliminar.className = "boton-eliminar";
        eliminar.textContent = "Quitar";
        eliminar.dataset.eliminarActividadAndroid = actividad.id;
        acciones.append(editar, eliminar);
        celda.appendChild(acciones);
        return celda;
    }

    function renderizarActividadesAndroid() {
        if (!catalogoActividadesDisponible()) {
            mostrarMensajeActividad(
                "El catálogo de actividades no está disponible.",
                "error"
            );
            return;
        }

        const actividades = obtenerCatalogoActividades({
            incluirInactivas: true,
            incluirWis: true
        });
        const filtradas = obtenerActividadesFiltradas(actividades);
        const cuerpo = elemento("tabla-actividades-android");

        if (!cuerpo) {
            return;
        }

        cuerpo.innerHTML = "";
        filtradas.forEach((actividad) => {
            const fila = document.createElement("tr");
            fila.classList.toggle("fila-actividad-wis", actividad.bloqueada);
            fila.append(
                crearCeldaCodigoActividad(actividad),
                crearCeldaDetalleActividad(actividad),
                crearCelda(actividad.operativa === "*" ? "Todas" : actividad.operativa),
                crearCeldaOrigenActividad(actividad),
                crearCeldaEstadoActividad(actividad),
                crearCelda(`v${actividad.version || 1}`),
                crearCeldaAccionesActividad(actividad)
            );
            cuerpo.appendChild(fila);
        });

        const resultado = elemento("resultado-filtros-actividades-android");

        if (resultado) {
            resultado.textContent = `${filtradas.length} de ${actividades.length} actividades`;
        }

        const vacio = elemento("sin-actividades-android");

        if (vacio) {
            vacio.hidden = filtradas.length > 0;
        }
    }

    function renderizarHistorialActividades() {
        const cuerpo = elemento("tabla-historial-actividades-android");

        if (!cuerpo || !catalogoActividadesDisponible()) {
            return;
        }

        const historial = obtenerHistorialActividades();
        const acciones = {
            creada: "Creada",
            actualizada: "Actualizada",
            eliminada: "Eliminada"
        };
        cuerpo.innerHTML = "";
        historial.forEach((evento) => {
            const fila = document.createElement("tr");
            const cambio = document.createElement("td");
            cambio.className = "detalle-cambio-actividad";
            cambio.textContent = describirCambioActividad(evento);
            fila.append(
                crearCelda(formatearFechaHora(evento.fecha)),
                crearCelda(evento.actor?.nombre || "Sistema"),
                crearCelda(acciones[evento.accion] || "Cambio"),
                crearCelda(evento.codigo || "—"),
                cambio,
                crearCelda(evento.version ? `v${evento.version}` : "—"),
            );
            cuerpo.appendChild(fila);
        });

        const vacio = elemento("sin-historial-actividades-android");

        if (vacio) {
            vacio.hidden = historial.length > 0;
        }
    }

    function describirCambioActividad(evento) {
        const anterior = evento.anterior || null;
        const actual = evento.actual || null;
        const actividad = actual || anterior || {};

        if (evento.accion === "creada") {
            return `Se creó “${actividad.nombre || evento.codigo || "actividad"}” ` +
                `con estado ${actividad.activa === false ? "inactiva" : "activa"}.`;
        }

        if (evento.accion === "eliminada") {
            return `Se quitó “${actividad.nombre || evento.codigo || "actividad"}” ` +
                "del catálogo manual.";
        }

        if (!anterior || !actual) {
            return "Se actualizó la actividad.";
        }

        const campos = [
            ["Código", "codigo", formatearValorCambioActividad],
            ["Nombre", "nombre", formatearValorCambioActividad],
            ["Descripción", "descripcion", formatearValorCambioActividad],
            ["Operativa", "operativa", formatearOperativaCambioActividad],
            ["Estado", "activa", formatearEstadoCambioActividad]
        ];
        const cambios = campos.filter(([, clave]) => {
            return anterior[clave] !== actual[clave];
        }).map(([etiqueta, clave, formateador]) => {
            const antes = formateador(anterior[clave]);
            const despues = formateador(actual[clave]);
            return `${etiqueta}: “${antes}” → “${despues}”`;
        });

        return cambios.length
            ? cambios.join("; ") + "."
            : "Actualización guardada sin cambios visibles.";
    }

    function formatearValorCambioActividad(valor) {
        const texto = String(valor ?? "").trim();
        return texto || "Sin completar";
    }

    function formatearOperativaCambioActividad(valor) {
        return valor === "*" ? "Todas" : formatearValorCambioActividad(valor);
    }

    function formatearEstadoCambioActividad(valor) {
        return valor === false ? "Inactiva" : "Activa";
    }

    function limpiarFormularioActividad() {
        const formulario = elemento("form-actividad-android");

        if (!formulario) {
            return;
        }

        formulario.reset();
        elemento("id-actividad-android").value = "";
        elemento("operativa-actividad-android").value = "*";
        elemento("estado-actividad-android").value = "activa";
        elemento("titulo-form-actividad-android").textContent = "Nueva actividad";
        elemento("cancelar-edicion-actividad-android").hidden = true;
    }

    function obtenerDatosFormularioActividad() {
        return {
            codigo: elemento("codigo-actividad-android").value,
            nombre: elemento("nombre-actividad-android").value,
            descripcion: elemento("descripcion-actividad-android").value,
            operativa: elemento("operativa-actividad-android").value,
            activa: elemento("estado-actividad-android").value === "activa"
        };
    }

    function cargarActividadEnFormulario(idActividad) {
        if (!esAdminActual() || !catalogoActividadesDisponible()) {
            return;
        }

        const actividad = obtenerActividadesManuales(true).find(
            (item) => item.id === idActividad
        );

        if (!actividad) {
            mostrarMensajeActividad(
                "La actividad ya no existe o está protegida por WIS.",
                "error"
            );
            renderizarActividadesAndroid();
            return;
        }

        elemento("id-actividad-android").value = actividad.id;
        elemento("codigo-actividad-android").value = actividad.codigo;
        elemento("nombre-actividad-android").value = actividad.nombre;
        elemento("descripcion-actividad-android").value = actividad.descripcion || "";
        elemento("operativa-actividad-android").value = actividad.operativa;
        elemento("estado-actividad-android").value = actividad.activa
            ? "activa"
            : "inactiva";
        elemento("titulo-form-actividad-android").textContent =
            `Editar ${actividad.nombre} · versión ${actividad.version || 1}`;
        elemento("cancelar-edicion-actividad-android").hidden = false;
        mostrarMensajeActividad("");
        elemento("panel-form-actividad-android").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function guardarActividadDesdeFormulario(evento) {
        evento.preventDefault();

        if (!esAdminActual()) {
            mostrarMensajeActividad(
                "Solo un administrador puede guardar actividades.",
                "error"
            );
            return;
        }

        const idActividad = elemento("id-actividad-android").value || null;

        try {
            const guardada = guardarActividadCatalogo(
                obtenerDatosFormularioActividad(),
                idActividad
            );
            limpiarFormularioActividad();
            renderizarCatalogoCompleto();
            mostrarMensajeActividad(
                `${guardada.nombre} se guardó con el código ${guardada.codigo}.`,
                "exito"
            );
        } catch (error) {
            mostrarMensajeActividad(
                error.message || "No fue posible guardar la actividad.",
                "error"
            );
        }
    }

    function eliminarActividadDesdeTabla(idActividad) {
        if (!esAdminActual()) {
            return;
        }

        const actividad = obtenerActividadesManuales(true).find(
            (item) => item.id === idActividad
        );

        if (!actividad) {
            mostrarMensajeActividad(
                "La actividad ya no existe o está protegida por WIS.",
                "error"
            );
            renderizarCatalogoCompleto();
            return;
        }

        const confirmado = globalThis.confirm(
            `¿Quitar la actividad ${actividad.nombre} (${actividad.codigo})? ` +
            "El cambio quedará registrado en el historial."
        );

        if (!confirmado) {
            return;
        }

        try {
            eliminarActividadCatalogo(idActividad);

            if (elemento("id-actividad-android").value === idActividad) {
                limpiarFormularioActividad();
            }

            renderizarCatalogoCompleto();
            mostrarMensajeActividad("La actividad se quitó correctamente.", "exito");
        } catch (error) {
            mostrarMensajeActividad(
                error.message || "No fue posible quitar la actividad.",
                "error"
            );
        }
    }

    function vincularEventosActividadesAndroid() {
        const formulario = elemento("form-actividad-android");
        const tabla = elemento("tabla-actividades-android");

        if (formulario) {
            formulario.addEventListener("submit", guardarActividadDesdeFormulario);
        }

        elemento("cancelar-edicion-actividad-android")?.addEventListener(
            "click",
            () => {
                limpiarFormularioActividad();
                mostrarMensajeActividad("");
            }
        );

        [
            "buscar-actividad-android",
            "filtro-origen-actividad-android",
            "filtro-operativa-actividad-android",
            "filtro-estado-actividad-android"
        ].forEach((id) => {
            const control = elemento(id);

            if (!control) {
                return;
            }

            control.addEventListener(
                control.type === "search" ? "input" : "change",
                renderizarActividadesAndroid
            );
        });

        if (tabla) {
            tabla.addEventListener("click", (evento) => {
                const editar = evento.target.closest(
                    "[data-editar-actividad-android]"
                );
                const eliminar = evento.target.closest(
                    "[data-eliminar-actividad-android]"
                );

                if (editar) {
                    cargarActividadEnFormulario(
                        editar.dataset.editarActividadAndroid
                    );
                } else if (eliminar) {
                    eliminarActividadDesdeTabla(
                        eliminar.dataset.eliminarActividadAndroid
                    );
                }
            });
        }
    }

    function actualizarResumen() {
        const reglas = typeof obtenerCatalogoReglasTraceWis === "function"
            ? obtenerCatalogoReglasTraceWis()
            : [];
        const resumen = typeof obtenerResumenCatalogoTraceWis === "function"
            ? obtenerResumenCatalogoTraceWis()
            : {
                total: 0,
                facturables: 0,
                picking: 0,
                operativas: 0,
                vigentes: 0
            };
        const valores = {
            "total-reglas-wis": resumen.total,
            "total-reglas-unidades-wis": reglas.filter((regla) => {
                return regla.estado === "incluido" &&
                    regla.categoriaVolumen !== "ninguno";
            }).length,
            "total-reglas-mapa-wis": reglas.filter((regla) => {
                return regla.estado === "incluido" && regla.participaMapa;
            }).length
        };

        Object.entries(valores).forEach(([id, valor]) => {
            const control = elemento(id);

            if (control) {
                control.textContent = Number(valor || 0).toLocaleString("es-UY");
            }
        });

        const vigentes = elemento("detalle-reglas-vigentes-wis");

        if (vigentes) {
            vigentes.textContent = `${resumen.vigentes || 0} vigentes hoy`;
        }
    }

    function actualizarOpcionesActividad(reglas) {
        const selector = elemento("filtro-actividad-regla-wis");

        if (!selector) {
            return;
        }

        const valorAnterior = selector.value || "todas";
        const actividades = [...new Set(reglas.map((regla) => {
            return String(regla.actividad || "Sin clasificar").trim();
        }))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
        selector.innerHTML = "";
        selector.appendChild(crearOpcion("todas", "Todas las actividades"));
        actividades.forEach((actividad) => {
            selector.appendChild(crearOpcion(actividad, actividad));
        });
        selector.value = actividades.includes(valorAnterior)
            ? valorAnterior
            : "todas";
    }

    function crearOpcion(valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        return opcion;
    }

    function estadoVigencia(regla, hoy) {
        const desde = regla.vigenciaDesde || "";
        const hasta = regla.vigenciaHasta || "";

        if (desde && desde > hoy) {
            return "futuras";
        }

        if (hasta && hasta < hoy) {
            return "vencidas";
        }

        return "vigentes";
    }

    function obtenerReglasFiltradas(reglas) {
        const busqueda = normalizarTexto(elemento("buscar-regla-wis")?.value);
        const operativa = elemento("filtro-operativa-regla-wis")?.value || "todas";
        const estado = elemento("filtro-estado-regla-wis")?.value || "todos";
        const vigencia = elemento("filtro-vigencia-regla-wis")?.value || "todas";
        const actividad = elemento("filtro-actividad-regla-wis")?.value || "todas";
        const hoy = new Date().toISOString().slice(0, 10);

        return reglas.filter((regla) => {
            const texto = normalizarTexto([
                regla.operativa,
                regla.aplicacion,
                regla.descripcionAplicacion,
                regla.actividad,
                regla.signo,
                regla.categoriaVolumen
            ].join(" "));
            const coincideBusqueda = !busqueda || texto.includes(busqueda);
            const coincideOperativa = operativa === "todas" ||
                regla.operativa === operativa;
            const coincideEstado = estado === "todos" || regla.estado === estado;
            const coincideVigencia = vigencia === "todas" ||
                estadoVigencia(regla, hoy) === vigencia;
            const coincideActividad = actividad === "todas" ||
                regla.actividad === actividad;

            return coincideBusqueda &&
                coincideOperativa &&
                coincideEstado &&
                coincideVigencia &&
                coincideActividad;
        }).sort((a, b) => {
            return String(a.aplicacion).localeCompare(
                String(b.aplicacion),
                "es",
                { numeric: true }
            ) || String(a.operativa).localeCompare(String(b.operativa), "es") ||
                String(a.descripcionAplicacion).localeCompare(
                    String(b.descripcionAplicacion),
                    "es"
                ) || String(a.signo).localeCompare(String(b.signo), "es") ||
                String(a.vigenciaDesde || "").localeCompare(
                    String(b.vigenciaDesde || "")
                );
        });
    }

    function crearCelda(texto = "") {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearCeldaClave(regla) {
        const celda = document.createElement("td");
        const detalle = document.createElement("div");
        const aplicacion = document.createElement("strong");
        const descripcion = document.createElement("small");

        detalle.className = "detalle-clave-regla";
        aplicacion.textContent = regla.aplicacion;
        descripcion.textContent = regla.descripcionAplicacion === "*"
            ? "Cualquier descripción"
            : regla.descripcionAplicacion;
        detalle.append(aplicacion, descripcion);
        celda.appendChild(detalle);
        return celda;
    }

    function crearCeldaVigencia(regla) {
        const celda = document.createElement("td");
        const detalle = document.createElement("div");
        const desde = document.createElement("span");
        const hasta = document.createElement("small");

        detalle.className = "detalle-vigencia-regla";
        desde.textContent = `Desde: ${formatearFecha(regla.vigenciaDesde)}`;
        hasta.textContent = `Hasta: ${formatearFecha(regla.vigenciaHasta)}`;
        detalle.append(desde, hasta);
        celda.appendChild(detalle);
        return celda;
    }

    function crearCeldaEstado(estado) {
        const celda = document.createElement("td");
        const insignia = document.createElement("span");
        insignia.className = `estado-regla ${estado}`;
        insignia.textContent = estado.charAt(0).toUpperCase() + estado.slice(1);
        celda.appendChild(insignia);
        return celda;
    }

    function crearCeldaIndicadores(regla) {
        const celda = document.createElement("td");
        const contenedor = document.createElement("div");
        const categoria = regla.categoriaVolumen || "ninguno";
        const indicadores = [
            ["Unidades", categoria !== "ninguno"],
            ["Mapa", regla.participaMapa],
            ["Inicio y comparación diaria", regla.visibleInicio]
        ];

        contenedor.className = "etiquetas-regla";
        indicadores.forEach(([nombre, activo]) => {
            const etiqueta = document.createElement("span");
            etiqueta.className = `etiqueta-regla${activo ? " activa" : ""}`;
            etiqueta.textContent = `${activo ? "Sí" : "No"} · ${nombre}`;
            contenedor.appendChild(etiqueta);
        });
        celda.appendChild(contenedor);
        return celda;
    }

    function crearCeldaAcciones(regla) {
        const celda = document.createElement("td");

        if (!esAdminActual()) {
            celda.textContent = "Consulta";
            return celda;
        }

        const acciones = document.createElement("div");
        const editar = document.createElement("button");
        const eliminar = document.createElement("button");

        acciones.className = "acciones-regla";
        editar.type = "button";
        editar.className = "boton-secundario";
        editar.textContent = "Editar";
        editar.dataset.editarReglaWis = regla.id;
        eliminar.type = "button";
        eliminar.className = "boton-eliminar";
        eliminar.textContent = "Eliminar";
        eliminar.dataset.eliminarReglaWis = regla.id;
        acciones.append(editar, eliminar);
        celda.appendChild(acciones);
        return celda;
    }

    function renderizarReglas() {
        if (!catalogoDisponible()) {
            mostrarMensaje(
                "El catálogo WIS no está disponible. Revisá la carga de reglas-trace.js.",
                "error"
            );
            return;
        }

        const reglas = obtenerCatalogoReglasTraceWis();
        actualizarOpcionesActividad(reglas);
        const filtradas = obtenerReglasFiltradas(reglas);
        const cuerpo = elemento("tabla-reglas-wis");

        if (!cuerpo) {
            return;
        }

        cuerpo.innerHTML = "";
        filtradas.forEach((regla) => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(regla.operativa === "*" ? "Todas" : regla.operativa),
                crearCeldaClave(regla),
                crearCelda(regla.signo),
                crearCelda(regla.actividad),
                crearCeldaVigencia(regla),
                crearCeldaEstado(regla.estado),
                crearCeldaIndicadores(regla),
                crearCelda(`v${regla.version || 1}`),
                crearCeldaAcciones(regla)
            );
            cuerpo.appendChild(fila);
        });

        const resultado = elemento("resultado-filtros-reglas-wis");

        if (resultado) {
            resultado.textContent = `${filtradas.length} de ${reglas.length} reglas`;
        }

        const vacio = elemento("sin-reglas-wis");

        if (vacio) {
            vacio.hidden = filtradas.length > 0;
        }
    }

    function formatearFecha(valor) {
        if (!valor) {
            return "Sin límite";
        }

        const [ano, mes, dia] = String(valor).split("-");
        return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(valor);
    }

    function formatearFechaHora(valor) {
        if (!valor) {
            return "—";
        }

        const fecha = new Date(valor);
        return Number.isNaN(fecha.getTime())
            ? String(valor)
            : fecha.toLocaleString("es-UY", {
                dateStyle: "short",
                timeStyle: "short"
            });
    }

    function resumirCambio(evento) {
        if (evento.detalle) {
            return evento.detalle;
        }

        if (evento.accion === "creada") {
            return "Alta de la regla.";
        }

        if (evento.accion === "eliminada") {
            return "Baja de la regla.";
        }

        const anterior = evento.anterior || {};
        const actual = evento.actual || {};
        const etiquetas = {
            operativa: "operativa",
            aplicacion: "aplicación",
            descripcionAplicacion: "descripción",
            signo: "signo",
            actividad: "actividad",
            estado: "estado",
            categoriaVolumen: "cantidad de unidades",
            participaMapa: "mapa",
            visibleInicio: "Inicio y comparación diaria",
            vigenciaDesde: "vigencia desde",
            vigenciaHasta: "vigencia hasta"
        };
        const cambios = Object.keys(etiquetas).filter((clave) => {
            return anterior[clave] !== actual[clave];
        }).map((clave) => etiquetas[clave]);

        if (!cambios.length) {
            return "Actualización sin cambios de criterio.";
        }

        const visibles = cambios.slice(0, 4).join(", ");
        const adicionales = cambios.length > 4 ? ` y ${cambios.length - 4} más` : "";
        return `Cambió: ${visibles}${adicionales}.`;
    }

    function renderizarHistorial() {
        const cuerpo = elemento("tabla-historial-reglas-wis");

        if (!cuerpo || !catalogoDisponible()) {
            return;
        }

        const historial = obtenerHistorialReglasTraceWis();
        const nombresAccion = {
            creada: "Creada",
            actualizada: "Actualizada",
            eliminada: "Eliminada",
            restauradas: "Restauración",
            migracion_v2: "Migración a esquema 2"
        };
        cuerpo.innerHTML = "";
        historial.forEach((evento) => {
            const fila = document.createElement("tr");
            const regla = evento.actual || evento.anterior;
            const nombreRegla = regla
                ? `${regla.aplicacion} · ${regla.signo}`
                : "Catálogo completo";
            fila.append(
                crearCelda(formatearFechaHora(evento.fecha)),
                crearCelda(nombresAccion[evento.accion] || "Cambio"),
                crearCelda(nombreRegla),
                crearCelda(evento.version ? `v${evento.version}` : "—"),
                crearCelda(evento.actor?.nombre || "Sistema"),
                crearCelda(resumirCambio(evento))
            );
            cuerpo.appendChild(fila);
        });

        const vacio = elemento("sin-historial-reglas-wis");

        if (vacio) {
            vacio.hidden = historial.length > 0;
        }
    }

    function renderizarCatalogoCompleto() {
        actualizarPermisos();
        actualizarResumenActividades();
        renderizarActividadesAndroid();
        renderizarHistorialActividades();
        actualizarResumen();
        renderizarReglas();
        renderizarHistorial();
    }

    function obtenerDatosFormulario() {
        return {
            operativa: elemento("operativa-regla-wis").value,
            aplicacion: elemento("aplicacion-regla-wis").value,
            descripcionAplicacion: elemento("descripcion-regla-wis").value,
            signo: elemento("signo-regla-wis").value,
            actividad: elemento("actividad-regla-wis").value,
            estado: elemento("estado-regla-wis").value,
            vigenciaDesde: elemento("vigencia-desde-regla-wis").value,
            vigenciaHasta: elemento("vigencia-hasta-regla-wis").value,
            categoriaVolumen: elemento("unidades-regla-wis").checked
                ? categoriaUnidadesEdicion
                : "ninguno",
            cuentaOperacion: elemento("unidades-regla-wis").checked,
            participaMapa: elemento("mapa-regla-wis").checked,
            visibleInicio: elemento("inicio-regla-wis").checked
        };
    }

    function limpiarFormulario() {
        const formulario = elemento("form-regla-wis");

        if (!formulario) {
            return;
        }

        formulario.reset();
        elemento("id-regla-wis").value = "";
        elemento("operativa-regla-wis").value = "*";
        elemento("descripcion-regla-wis").value = "*";
        elemento("estado-regla-wis").value = "incluido";
        ["mapa-regla-wis"].forEach((id) => {
            elemento(id).checked = true;
        });
        elemento("unidades-regla-wis").checked = false;
        elemento("inicio-regla-wis").checked = false;
        categoriaUnidadesEdicion = "operativo";
        elemento("titulo-form-regla-wis").textContent = "Nueva regla";
        elemento("cancelar-edicion-regla-wis").hidden = true;
        actualizarDisponibilidadIndicadores();
    }

    function cargarReglaEnFormulario(idRegla) {
        if (!esAdminActual()) {
            return;
        }

        const regla = obtenerCatalogoReglasTraceWis().find(
            (item) => item.id === idRegla
        );

        if (!regla) {
            mostrarMensaje("La regla seleccionada ya no existe.", "error");
            renderizarCatalogoCompleto();
            return;
        }

        elemento("id-regla-wis").value = regla.id;
        elemento("operativa-regla-wis").value = regla.operativa;
        elemento("aplicacion-regla-wis").value = regla.aplicacion;
        elemento("descripcion-regla-wis").value = regla.descripcionAplicacion;
        elemento("signo-regla-wis").value = regla.signo;
        elemento("actividad-regla-wis").value = regla.actividad;
        elemento("estado-regla-wis").value = regla.estado;
        elemento("vigencia-desde-regla-wis").value = regla.vigenciaDesde || "";
        elemento("vigencia-hasta-regla-wis").value = regla.vigenciaHasta || "";
        categoriaUnidadesEdicion = regla.categoriaVolumen &&
            regla.categoriaVolumen !== "ninguno"
            ? regla.categoriaVolumen
            : "operativo";
        elemento("unidades-regla-wis").checked =
            Boolean(
                regla.categoriaVolumen &&
                regla.categoriaVolumen !== "ninguno"
            );
        elemento("mapa-regla-wis").checked = Boolean(regla.participaMapa);
        elemento("inicio-regla-wis").checked = Boolean(regla.visibleInicio);
        elemento("titulo-form-regla-wis").textContent =
            `Editar ${regla.aplicacion} · versión ${regla.version || 1}`;
        elemento("cancelar-edicion-regla-wis").hidden = false;
        actualizarDisponibilidadIndicadores();
        mostrarMensaje("");
        elemento("panel-form-regla-wis").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function actualizarDisponibilidadIndicadores() {
        const incluido = elemento("estado-regla-wis")?.value === "incluido";

        [
            "unidades-regla-wis",
            "mapa-regla-wis",
            "inicio-regla-wis"
        ].forEach((id) => {
            const control = elemento(id);

            if (!control) {
                return;
            }

            if (!incluido) {
                control.checked = false;
            }

            control.disabled = !incluido;
        });
    }

    function guardarDesdeFormulario(evento) {
        evento.preventDefault();

        if (!esAdminActual()) {
            mostrarMensaje(
                "Solo un administrador puede guardar reglas.",
                "error"
            );
            return;
        }

        const idRegla = elemento("id-regla-wis").value || null;

        try {
            const guardada = guardarReglaTraceWis(
                obtenerDatosFormulario(),
                idRegla
            );
            limpiarFormulario();
            renderizarCatalogoCompleto();
            mostrarMensaje(
                `${guardada.aplicacion} se guardó como versión ${guardada.version}.`,
                "exito"
            );
        } catch (error) {
            mostrarMensaje(error.message || "No fue posible guardar la regla.", "error");
        }
    }

    function eliminarDesdeTabla(idRegla) {
        if (!esAdminActual()) {
            return;
        }

        const regla = obtenerCatalogoReglasTraceWis().find(
            (item) => item.id === idRegla
        );

        if (!regla) {
            renderizarCatalogoCompleto();
            return;
        }

        const confirmado = globalThis.confirm(
            `¿Eliminar la regla ${regla.aplicacion} · ${regla.signo}? ` +
            "El cambio quedará en el historial."
        );

        if (!confirmado) {
            return;
        }

        try {
            eliminarReglaTraceWis(idRegla);

            if (elemento("id-regla-wis").value === idRegla) {
                limpiarFormulario();
            }

            renderizarCatalogoCompleto();
            mostrarMensaje("La regla se eliminó correctamente.", "exito");
        } catch (error) {
            mostrarMensaje(error.message || "No fue posible eliminar la regla.", "error");
        }
    }

    function restaurarCatalogo() {
        if (!esAdminActual()) {
            return;
        }

        const confirmado = globalThis.confirm(
            "¿Restaurar las reglas predeterminadas? Las reglas personalizadas " +
            "serán reemplazadas y el evento quedará en el historial."
        );

        if (!confirmado) {
            return;
        }

        try {
            restaurarReglasPredeterminadasTraceWis();
            limpiarFormulario();
            renderizarCatalogoCompleto();
            mostrarMensaje("Se restauró el catálogo predeterminado.", "exito");
        } catch (error) {
            mostrarMensaje(
                error.message || "No fue posible restaurar el catálogo.",
                "error"
            );
        }
    }

    function vincularEventos() {
        const formulario = elemento("form-regla-wis");
        const tabla = elemento("tabla-reglas-wis");

        if (formulario) {
            formulario.addEventListener("submit", guardarDesdeFormulario);
        }

        elemento("estado-regla-wis")?.addEventListener(
            "change",
            actualizarDisponibilidadIndicadores
        );
        elemento("cancelar-edicion-regla-wis")?.addEventListener("click", () => {
            limpiarFormulario();
            mostrarMensaje("");
        });
        elemento("restaurar-reglas-wis")?.addEventListener(
            "click",
            restaurarCatalogo
        );

        [
            "buscar-regla-wis",
            "filtro-operativa-regla-wis",
            "filtro-estado-regla-wis",
            "filtro-vigencia-regla-wis",
            "filtro-actividad-regla-wis"
        ].forEach((id) => {
            const control = elemento(id);

            if (!control) {
                return;
            }

            control.addEventListener(
                control.type === "search" ? "input" : "change",
                renderizarReglas
            );
        });

        if (tabla) {
            tabla.addEventListener("click", (evento) => {
                const editar = evento.target.closest("[data-editar-regla-wis]");
                const eliminar = evento.target.closest("[data-eliminar-regla-wis]");

                if (editar) {
                    cargarReglaEnFormulario(editar.dataset.editarReglaWis);
                } else if (eliminar) {
                    eliminarDesdeTabla(eliminar.dataset.eliminarReglaWis);
                }
            });
        }
    }

    function inicializar() {
        const pagina = document.querySelector(".catalogo-reglas-wis");

        if (!pagina || pagina.dataset.inicializada === "true") {
            return;
        }

        pagina.dataset.inicializada = "true";
        // Las opciones fijas (comodín, "Todas") vienen en el HTML; las operativas, del catálogo.
        document.querySelectorAll("[data-operativas-catalogo]").forEach((selector) => {
            agregarOpcionesOperativasAgrupadas(selector);
        });
        actualizarPermisos();

        if (!catalogoDisponible()) {
            mostrarMensaje(
                "No se pudo iniciar el catálogo. Verificá que reglas-trace.js se cargue antes de actividades.js.",
                "error"
            );
            return;
        }

        if (!catalogoActividadesDisponible()) {
            mostrarMensajeActividad(
                "No se pudo iniciar el catálogo de actividades.",
                "error"
            );
            return;
        }

        limpiarFormularioActividad();
        limpiarFormulario();
        vincularEventosActividadesAndroid();
        vincularEventos();
        renderizarCatalogoCompleto();

        if (manejadorActualizacionCatalogo) {
            globalThis.removeEventListener(
                "catalogoreglaswisactualizado",
                manejadorActualizacionCatalogo
            );
        }

        manejadorActualizacionCatalogo = () => {
            if (document.querySelector(".catalogo-reglas-wis")) {
                renderizarCatalogoCompleto();
            }
        };
        globalThis.addEventListener(
            "catalogoreglaswisactualizado",
            manejadorActualizacionCatalogo
        );

        if (manejadorActualizacionActividades) {
            globalThis.removeEventListener(
                "catalogoactividadesactualizado",
                manejadorActualizacionActividades
            );
        }

        manejadorActualizacionActividades = () => {
            if (document.querySelector(".catalogo-reglas-wis")) {
                renderizarCatalogoCompleto();
            }
        };
        globalThis.addEventListener(
            "catalogoactividadesactualizado",
            manejadorActualizacionActividades
        );
    }

    globalThis.inicializarActividades = inicializar;
})();
