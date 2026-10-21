(() => {
    "use strict";

    let intervalo = null;
    function elemento(id) {
        return document.getElementById(id);
    }

    function mostrarMensaje(id, texto, tipo = "") {
        const mensaje = elemento(id);
        mensaje.textContent = texto;
        mensaje.className = tipo ? `mensaje-handheld ${tipo}` : "mensaje-handheld";
    }

    function mostrarAcceso() {
        clearInterval(intervalo);
        elemento("acceso-handheld-web").hidden = false;
        elemento("aplicacion-handheld-web").hidden = true;
    }

    function mostrarAplicacion() {
        const usuario = obtenerUsuarioActual();
        if (!usuario) {
            mostrarAcceso();
            return;
        }

        elemento("acceso-handheld-web").hidden = true;
        elemento("aplicacion-handheld-web").hidden = false;
        const datos = PoloOesteTareas.datosUsuario(usuario);
        elemento("usuario-sesion-handheld").textContent =
            `${datos.nombre} · ${datos.operativa}`;
        cargarActividades(datos.operativa);
        renderizar();
        clearInterval(intervalo);
        intervalo = window.setInterval(renderizar, 1000);
    }

    function cargarActividades(operativa) {
        const selector = elemento("actividad-handheld-web");
        if (!selector) return;
        const valorAnterior = selector.value;
        const actividades = typeof obtenerCatalogoActividades === "function"
            ? obtenerCatalogoActividades({ incluirWis: true })
                .filter((actividad) => {
                    return actividad.activa !== false &&
                        (actividad.operativa === "*" ||
                            actividad.operativa === operativa);
                })
            : [];
        selector.innerHTML = '<option value="">Seleccionar actividad</option>';
        actividades.forEach((actividad) => {
            const opcion = document.createElement("option");
            opcion.value = actividad.codigo;
            opcion.textContent = `${actividad.codigo} · ${actividad.nombre}`;
            opcion.dataset.nombre = actividad.nombre;
            selector.appendChild(opcion);
        });
        selector.value = actividades.some((item) => item.codigo === valorAnterior)
            ? valorAnterior
            : "";

        if (typeof sincronizarCatalogoActividadesServidor === "function") {
            sincronizarCatalogoActividadesServidor();
        }
    }

    function renderizar() {
        const usuario = obtenerUsuarioActual();
        if (!usuario || !window.PoloOesteTareas) return;

        const registro = PoloOesteTareas.obtenerRegistroAbierto(usuario.id);
        const colector = elemento("colector-handheld-web");
        const actividad = elemento("actividad-handheld-web");
        const estado = elemento("estado-actividad-handheld");
        const detalle = elemento("detalle-actividad-handheld");
        const tiempo = elemento("tiempo-actividad-handheld");
        const boton = elemento("alternar-actividad-handheld");
        const botonFinalizar = elemento("finalizar-actividad-handheld");
        const icono = elemento("icono-actividad-handheld");
        const texto = elemento("texto-actividad-handheld");
        colector.disabled = Boolean(registro);
        actividad.disabled = Boolean(registro);
        botonFinalizar.disabled = !registro;

        if (!registro) {
            estado.textContent = "Sin actividad";
            estado.className = "";
            detalle.textContent = "Presioná Iniciar para registrar una nueva actividad.";
            tiempo.textContent = "00:00:00";
            elemento("pausas-actividad-handheld").textContent = "0";
            elemento("colector-actividad-visible").textContent = colector.value || "—";
            elemento("actividad-visible-handheld").textContent =
                actividad.options[actividad.selectedIndex]?.textContent || "—";
            icono.textContent = "▶";
            texto.textContent = "Iniciar actividad";
            boton.classList.remove("pausar");
            return;
        }

        colector.value = registro.colector;
        actividad.value = registro.actividadCodigo || "";
        tiempo.textContent = PoloOesteTareas.formatearTiempo(
            PoloOesteTareas.obtenerTiempoRegistro(registro)
        );
        elemento("pausas-actividad-handheld").textContent =
            PoloOesteTareas.obtenerCantidadPausas(registro);
        elemento("colector-actividad-visible").textContent = registro.colector;
        elemento("actividad-visible-handheld").textContent =
            registro.actividad || registro.actividadCodigo || "—";
        estado.className = registro.estado;

        if (registro.estado === "activa") {
            estado.textContent = "En operación";
            detalle.textContent = "El tiempo activo se está registrando.";
            icono.textContent = "Ⅱ";
            texto.textContent = "Pausar actividad";
            boton.classList.add("pausar");
        } else {
            estado.textContent = "Actividad pausada";
            detalle.textContent = "El contador está detenido.";
            icono.textContent = "▶";
            texto.textContent = "Reanudar actividad";
            boton.classList.remove("pausar");
        }
    }

    async function alternarActividad() {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return;
        try {
            const previo = PoloOesteTareas.obtenerRegistroAbierto(usuario.id);
            const selectorActividad = elemento("actividad-handheld-web");
            const opcionActividad = selectorActividad.options[
                selectorActividad.selectedIndex
            ];
            PoloOesteTareas.alternarRegistro(usuario, {
                colector: elemento("colector-handheld-web").value,
                actividadCodigo: selectorActividad.value,
                actividad: opcionActividad?.dataset.nombre || ""
            });
            mostrarMensaje(
                "mensaje-actividad-handheld",
                !previo
                    ? "Actividad iniciada."
                    : previo.estado === "activa"
                        ? "Actividad pausada."
                        : "Actividad reanudada.",
                "exito"
            );
            renderizar();
        } catch (error) {
            mostrarMensaje("mensaje-actividad-handheld", error.message, "error");
        }
    }

    function finalizarActividad() {
        const usuario = obtenerUsuarioActual();
        if (!usuario || !window.confirm("¿Querés finalizar la actividad activa?")) return;

        try {
            PoloOesteTareas.finalizarRegistro(usuario.id);
            mostrarMensaje(
                "mensaje-actividad-handheld",
                "Actividad finalizada correctamente.",
                "exito"
            );
            renderizar();
        } catch (error) {
            mostrarMensaje("mensaje-actividad-handheld", error.message, "error");
        }
    }

    async function iniciarSesion(evento) {
        evento.preventDefault();
        const usuario = await autenticarUsuario(
            elemento("usuario-login-handheld").value,
            elemento("clave-login-handheld").value
        );

        if (!usuario) {
            mostrarMensaje(
                "mensaje-login-handheld",
                "Usuario o contraseña incorrectos.",
                "error"
            );
            return;
        }

        guardarSesion(usuario.id);
        evento.target.reset();
        mostrarAplicacion();
    }

    function cerrarSesionHandheld() {
        const usuario = obtenerUsuarioActual();
        if (usuario) {
            try {
                PoloOesteTareas.finalizarRegistro(usuario.id);
            } catch (error) {
                console.error(error);
            }
        }
        borrarSesion();
        mostrarAcceso();
    }

    document.addEventListener("DOMContentLoaded", () => {
        elemento("form-login-handheld").addEventListener("submit", iniciarSesion);
        elemento("alternar-actividad-handheld").onclick = alternarActividad;
        elemento("finalizar-actividad-handheld").onclick = finalizarActividad;
        elemento("cerrar-sesion-handheld").onclick = cerrarSesionHandheld;
        window.addEventListener("storage", (evento) => {
            if (evento.key === "gestion_personal_tareas_activas") renderizar();
        });
        obtenerUsuarioActual() ? mostrarAplicacion() : mostrarAcceso();
    });
})();
