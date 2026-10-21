const ROL_ADMINISTRADOR = "administrador";
const ROL_NORMAL = "normal";
const ITERACIONES_CLAVE = 120000;
const CONTRASENA_INICIAL_IMPORTADA = "initialpass";
const CLASIFICACION_OPERARIO = "operario";
const CLASIFICACION_ADMINISTRATIVO = "administrativo";
const CLASIFICACION_SUPERVISOR = "supervisor";
const PAGINAS_RESTRINGIDAS_POR_CLASIFICACION = {
    operario: new Set(["horas", "actividades", "inasistencias", "reportes"]),
    administrativo: new Set(),
    supervisor: new Set()
};

let usuarioCambioClavePendiente = null;

function normalizarNombreUsuario(nombreUsuario) {
    return nombreUsuario.trim().toLowerCase();
}

function validarNombreUsuario(nombreUsuario) {
    return /^[a-z0-9._-]{3,30}$/i.test(nombreUsuario);
}

function nombreUsuarioDisponible(nombreUsuario, usuarioIdIgnorado = null) {
    const nombreNormalizado = normalizarNombreUsuario(nombreUsuario);

    return !obtenerUsuarios().some((usuario) => {
        return usuario.id !== usuarioIdIgnorado &&
            usuario.nombreUsuario === nombreNormalizado;
    });
}

function bytesABase64(bytes) {
    let textoBinario = "";

    bytes.forEach((byte) => {
        textoBinario += String.fromCharCode(byte);
    });

    return btoa(textoBinario);
}

function base64ABytes(textoBase64) {
    const textoBinario = atob(textoBase64);
    return Uint8Array.from(textoBinario, (caracter) => {
        return caracter.charCodeAt(0);
    });
}

async function derivarClave(contrasena, saltBase64) {
    const codificador = new TextEncoder();
    const materialClave = await crypto.subtle.importKey(
        "raw",
        codificador.encode(contrasena),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: base64ABytes(saltBase64),
            iterations: ITERACIONES_CLAVE,
            hash: "SHA-256"
        },
        materialClave,
        256
    );

    return bytesABase64(new Uint8Array(bits));
}

async function crearRegistroUsuario({
    nombre,
    nombreUsuario,
    contrasena,
    rol = ROL_NORMAL,
    operarioId = null,
    activo = true,
    debeCambiarClave = false
}) {
    const usuarioNormalizado = normalizarNombreUsuario(nombreUsuario);

    if (!validarNombreUsuario(usuarioNormalizado)) {
        throw new Error(
            "El usuario debe tener entre 3 y 30 caracteres y usar solo letras, números, punto, guion o guion bajo."
        );
    }

    if (!nombreUsuarioDisponible(usuarioNormalizado)) {
        throw new Error("Ese nombre de usuario ya está registrado.");
    }

    if (contrasena.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    if (![ROL_ADMINISTRADOR, ROL_NORMAL].includes(rol)) {
        throw new Error("El rol seleccionado no es válido.");
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = bytesABase64(salt);
    const hashClave = await derivarClave(contrasena, saltBase64);

    return {
        id: generarId(),
        nombre,
        nombreUsuario: usuarioNormalizado,
        hashClave,
        salt: saltBase64,
        rol,
        operarioId,
        activo: Boolean(activo),
        debeCambiarClave: Boolean(debeCambiarClave),
        fechaRegistro: new Date().toISOString()
    };
}

async function autenticarUsuario(nombreUsuario, contrasena) {
    const usuarioNormalizado = normalizarNombreUsuario(nombreUsuario);
    const usuario = obtenerUsuarios().find((item) => {
        return item.nombreUsuario === usuarioNormalizado;
    });

    if (!usuario || !usuario.activo) {
        return null;
    }

    const hashIngresado = await derivarClave(
        contrasena,
        usuario.salt
    );

    return hashIngresado === usuario.hashClave ? usuario : null;
}

function obtenerUsuarioActual() {
    const sesion = obtenerSesionGuardada();

    if (!sesion) {
        return null;
    }

    const usuario = obtenerUsuarios().find((item) => {
        return item.id === sesion.usuarioId && item.activo;
    });

    if (!usuario) {
        borrarSesion();
        return null;
    }

    return usuario;
}

function esAdministrador() {
    const usuario = obtenerUsuarioActual();
    return Boolean(usuario && usuario.rol === ROL_ADMINISTRADOR);
}

function obtenerClasificacionUsuario(usuario = obtenerUsuarioActual()) {
    if (!usuario) {
        return "";
    }

    const operario = usuario.operarioId &&
        typeof obtenerOperarios === "function"
        ? obtenerOperarios().find((item) => item.id === usuario.operarioId)
        : null;
    const cargo = String(operario?.cargo || "")
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (cargo.includes(CLASIFICACION_OPERARIO)) {
        return CLASIFICACION_OPERARIO;
    }

    if (cargo.includes(CLASIFICACION_ADMINISTRATIVO)) {
        return CLASIFICACION_ADMINISTRATIVO;
    }

    if (cargo.includes(CLASIFICACION_SUPERVISOR)) {
        return CLASIFICACION_SUPERVISOR;
    }

    return usuario.rol === ROL_ADMINISTRADOR
        ? CLASIFICACION_SUPERVISOR
        : CLASIFICACION_ADMINISTRATIVO;
}

function puedeUsuarioAccederPagina(pagina, usuario = obtenerUsuarioActual()) {
    if (!usuario) {
        return false;
    }

    if (pagina === "usuarios" && usuario.rol !== ROL_ADMINISTRADOR) {
        return false;
    }

    const clasificacion = obtenerClasificacionUsuario(usuario);
    const restringidas = PAGINAS_RESTRINGIDAS_POR_CLASIFICACION[
        clasificacion
    ] || PAGINAS_RESTRINGIDAS_POR_CLASIFICACION.administrativo;
    return !restringidas.has(pagina);
}

function obtenerEtiquetaClasificacionUsuario(usuario) {
    const etiquetas = {
        operario: "Operario",
        administrativo: "Administrativo",
        supervisor: "Supervisor"
    };
    return etiquetas[obtenerClasificacionUsuario(usuario)] || "Usuario";
}

async function inicializarAutenticacion() {
    const formularioInicial = document.getElementById(
        "form-configuracion-inicial"
    );
    const formularioLogin = document.getElementById("form-login");
    const formularioCambioClave = document.getElementById(
        "form-cambio-clave-inicial"
    );
    const botonCerrarSesion = document.getElementById("cerrar-sesion");

    formularioInicial.addEventListener(
        "submit",
        registrarAdministradorInicial
    );
    formularioLogin.addEventListener("submit", iniciarSesion);
    formularioCambioClave.addEventListener(
        "submit",
        cambiarClaveEnPrimerIngreso
    );
    botonCerrarSesion.addEventListener("click", cerrarSesion);

    sincronizarUsuariosServidor();

    const usuarioActual = obtenerUsuarioActual();

    if (usuarioActual) {
        mostrarAplicacion(usuarioActual);
        return;
    }

    mostrarPantallaAutenticacion();
}

function mostrarPantallaAutenticacion() {
    const hayUsuarios = obtenerUsuarios().length > 0;
    const pantalla = document.getElementById("pantalla-autenticacion");
    const aplicacion = document.getElementById("aplicacion");
    const configuracion = document.getElementById(
        "configuracion-inicial"
    );
    const login = document.getElementById("inicio-sesion");
    const cambioClave = document.getElementById("cambio-clave-inicial");

    aplicacion.hidden = true;
    pantalla.hidden = false;
    configuracion.hidden = hayUsuarios;
    login.hidden = !hayUsuarios;
    cambioClave.hidden = true;
    usuarioCambioClavePendiente = null;

    if (typeof aplicarTemaUsuario === "function") {
        aplicarTemaUsuario(null);
    }

    document.getElementById("mensaje-login").textContent = "";
}

function mostrarAplicacion(usuario, opciones = {}) {
    document.getElementById("pantalla-autenticacion").hidden = true;
    document.getElementById("aplicacion").hidden = false;
    document.getElementById("usuario-sesion").textContent = usuario.nombre;
    const clasificacion = obtenerEtiquetaClasificacionUsuario(usuario);
    document.getElementById("rol-sesion").textContent =
        usuario.rol === ROL_ADMINISTRADOR
            ? `${clasificacion} · Administrador`
            : clasificacion;

    /* Al iniciar sesión, manda el tema elegido en la pantalla de acceso. */
    if (opciones.inicioSesion && typeof conservarTemaElegidoEnAcceso === "function") {
        conservarTemaElegidoEnAcceso(usuario);
    }

    if (typeof aplicarTemaUsuario === "function") {
        aplicarTemaUsuario(usuario);
    }

    iniciarAplicacion();

    /* La intro va encima: la app ya queda armada debajo mientras se reproduce. */
    if (opciones.inicioSesion && typeof reproducirIntroLogo === "function") {
        reproducirIntroLogo(usuario);
    }
}

async function registrarAdministradorInicial(evento) {
    evento.preventDefault();

    const nombre = document.getElementById("nombre-admin").value.trim();
    const nombreUsuario = document
        .getElementById("usuario-admin")
        .value
        .trim();
    const contrasena = document.getElementById("clave-admin").value;
    const confirmacion = document.getElementById(
        "confirmar-clave-admin"
    ).value;

    if (obtenerUsuarios().length > 0) {
        mostrarPantallaAutenticacion();
        return;
    }

    if (contrasena !== confirmacion) {
        mostrarMensajeAutenticacion(
            "mensaje-configuracion",
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    try {
        const administrador = await crearRegistroUsuario({
            nombre,
            nombreUsuario,
            contrasena,
            rol: ROL_ADMINISTRADOR
        });

        if (!guardarUsuarios([administrador])) {
            throw new Error("No fue posible guardar el administrador.");
        }

        guardarSesion(administrador.id);
        evento.target.reset();
        mostrarAplicacion(administrador, { inicioSesion: true });
    } catch (error) {
        mostrarMensajeAutenticacion(
            "mensaje-configuracion",
            error.message,
            "error"
        );
    }
}

async function iniciarSesion(evento) {
    evento.preventDefault();

    const boton = evento.target.querySelector("button[type='submit']");
    const nombreUsuario = document
        .getElementById("usuario-login")
        .value;
    const contrasena = document.getElementById("clave-login").value;

    boton.disabled = true;

    try {
        const usuario = await autenticarUsuario(
            nombreUsuario,
            contrasena
        );

        if (!usuario) {
            mostrarMensajeAutenticacion(
                "mensaje-login",
                "Usuario o contraseña incorrectos.",
                "error"
            );
            return;
        }

        evento.target.reset();

        if (usuario.debeCambiarClave) {
            mostrarCambioClaveInicial(usuario);
            return;
        }

        guardarSesion(usuario.id);
        mostrarAplicacion(usuario, { inicioSesion: true });
    } catch (error) {
        console.error(error);
        mostrarMensajeAutenticacion(
            "mensaje-login",
            "No fue posible iniciar sesión.",
            "error"
        );
    } finally {
        boton.disabled = false;
    }
}

function cerrarSesion() {
    if (typeof finalizarTareaActivaUsuarioActual === "function") {
        finalizarTareaActivaUsuarioActual();
    }

    borrarSesion();
    document.getElementById("form-login").reset();
    document.getElementById("contenido").innerHTML = "";
    mostrarPantallaAutenticacion();
}

function mostrarCambioClaveInicial(usuario) {
    usuarioCambioClavePendiente = usuario;
    document.getElementById("configuracion-inicial").hidden = true;
    document.getElementById("inicio-sesion").hidden = true;
    document.getElementById("cambio-clave-inicial").hidden = false;
    document.getElementById("usuario-cambio-clave").textContent =
        usuario.nombreUsuario;
    document.getElementById("form-cambio-clave-inicial").reset();
    mostrarMensajeAutenticacion("mensaje-cambio-clave", "", "");
}

async function cambiarClaveEnPrimerIngreso(evento) {
    evento.preventDefault();

    if (!usuarioCambioClavePendiente) {
        mostrarPantallaAutenticacion();
        return;
    }

    const nueva = document.getElementById("nueva-clave-inicial").value;
    const confirmacion = document.getElementById(
        "confirmar-nueva-clave-inicial"
    ).value;
    const boton = evento.target.querySelector("button[type='submit']");

    if (nueva.length < 8) {
        mostrarMensajeAutenticacion(
            "mensaje-cambio-clave",
            "La nueva contraseña debe tener al menos 8 caracteres.",
            "error"
        );
        return;
    }

    if (nueva === CONTRASENA_INICIAL_IMPORTADA) {
        mostrarMensajeAutenticacion(
            "mensaje-cambio-clave",
            "Elegí una contraseña diferente de initialpass.",
            "error"
        );
        return;
    }

    if (nueva !== confirmacion) {
        mostrarMensajeAutenticacion(
            "mensaje-cambio-clave",
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    boton.disabled = true;

    try {
        const usuarios = obtenerUsuarios();
        const usuario = usuarios.find((item) => {
            return item.id === usuarioCambioClavePendiente.id;
        });

        if (!usuario || !usuario.activo) {
            throw new Error("La cuenta ya no está disponible.");
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltBase64 = bytesABase64(salt);
        usuario.salt = saltBase64;
        usuario.hashClave = await derivarClave(nueva, saltBase64);
        usuario.debeCambiarClave = false;
        usuario.fechaCambioClave = new Date().toISOString();

        if (!guardarUsuarios(usuarios)) {
            throw new Error("No fue posible guardar la nueva contraseña.");
        }

        guardarSesion(usuario.id);
        usuarioCambioClavePendiente = null;
        document.getElementById("cambio-clave-inicial").hidden = true;
        mostrarAplicacion(usuario, { inicioSesion: true });
    } catch (error) {
        mostrarMensajeAutenticacion(
            "mensaje-cambio-clave",
            error.message || "No fue posible cambiar la contraseña.",
            "error"
        );
    } finally {
        boton.disabled = false;
    }
}

function mostrarMensajeAutenticacion(id, texto, tipo) {
    const mensaje = document.getElementById(id);
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
}
