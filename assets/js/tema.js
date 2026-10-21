const CLAVE_PREFERENCIAS_TEMA = "gestion_personal_preferencias_tema";
const TEMA_OSCURO = "oscuro";
const TEMA_CLARO = "claro";

/* Tema elegido con el botón de la pantalla de acceso, antes de iniciar sesión. */
let temaElegidoEnAcceso = null;

document.addEventListener("DOMContentLoaded", inicializarTema);

function inicializarTema() {
    document.querySelectorAll("[data-alternar-tema]").forEach((boton) => {
        boton.addEventListener("click", alternarTema);
    });

    const usuario = typeof obtenerUsuarioActual === "function"
        ? obtenerUsuarioActual()
        : null;
    aplicarTemaUsuario(usuario);
}

function aplicarTemaUsuario(usuario) {
    const preferencias = obtenerPreferenciasTema();
    const claveUsuario = usuario?.id || "general";
    const tema = preferencias[claveUsuario] ||
        preferencias.general ||
        TEMA_CLARO;
    aplicarTema(tema);
}

function alternarTema() {
    const nuevoTema = document.body.classList.contains("modo-oscuro")
        ? TEMA_CLARO
        : TEMA_OSCURO;
    const usuario = typeof obtenerUsuarioActual === "function"
        ? obtenerUsuarioActual()
        : null;
    const claveUsuario = usuario?.id || "general";
    const preferencias = obtenerPreferenciasTema();
    preferencias[claveUsuario] = nuevoTema;

    if (typeof guardarStorage === "function") {
        guardarStorage(CLAVE_PREFERENCIAS_TEMA, preferencias);
    }

    if (!usuario) {
        temaElegidoEnAcceso = nuevoTema;
    }

    aplicarTema(nuevoTema);
}

/*
 * Si se eligió el tema en la pantalla de acceso, el usuario entra con esa
 * elección y queda guardada como su preferencia.
 */
function conservarTemaElegidoEnAcceso(usuario) {
    if (!temaElegidoEnAcceso || !usuario?.id) {
        return;
    }

    const preferencias = obtenerPreferenciasTema();
    preferencias[usuario.id] = temaElegidoEnAcceso;

    if (typeof guardarStorage === "function") {
        guardarStorage(CLAVE_PREFERENCIAS_TEMA, preferencias);
    }

    temaElegidoEnAcceso = null;
}

function obtenerPreferenciasTema() {
    if (typeof leerStorage !== "function") {
        return {};
    }

    const preferencias = leerStorage(CLAVE_PREFERENCIAS_TEMA, {});
    return preferencias && typeof preferencias === "object"
        ? preferencias
        : {};
}

function aplicarTema(tema) {
    const oscuro = tema === TEMA_OSCURO;
    document.body.classList.toggle("modo-oscuro", oscuro);
    document.documentElement.style.colorScheme = oscuro ? "dark" : "light";

    document.querySelectorAll("[data-alternar-tema]").forEach((boton) => {
        boton.textContent = oscuro ? "☀ Modo claro" : "◐ Modo oscuro";
        boton.setAttribute(
            "aria-label",
            oscuro ? "Activar modo claro" : "Activar modo oscuro"
        );
        boton.setAttribute("aria-pressed", String(oscuro));
    });
}
