const CLAVES_STORAGE = {
    operarios: "gestion_personal_operarios",
    usuarios: "gestion_personal_usuarios",
    inasistencias: "gestion_personal_inasistencias",
    embarques: "gestion_personal_embarques",
    tareasActivas: "gestion_personal_tareas_activas"
};

const CLAVE_SESION = "gestion_personal_sesion";

function leerStorage(clave, valorInicial = []) {
    try {
        const datosGuardados = localStorage.getItem(clave);

        if (!datosGuardados) {
            return valorInicial;
        }

        return JSON.parse(datosGuardados);
    } catch (error) {
        console.error(`Error al leer ${clave}:`, error);
        return valorInicial;
    }
}

function guardarStorage(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
        return true;
    } catch (error) {
        console.error(`Error al guardar ${clave}:`, error);
        return false;
    }
}

function jsonAscii(datos) {
    return JSON.stringify(datos).replace(/[\u007f-\uffff]/g, (caracter) => {
        return `\\u${caracter.charCodeAt(0).toString(16).padStart(4, "0")}`;
    });
}

async function sincronizarUsuariosServidor(usuarios = obtenerUsuarios()) {
    if (typeof location === "undefined") return false;
    try {
        const operarios = obtenerOperarios();
        const usuariosCompartidos = usuarios.map((usuario) => {
            const operario = operarios.find((item) => item.id === usuario.operarioId);
            return {
                ...usuario,
                nombre: operario?.nombre || usuario.nombre,
                operativa: operario?.operativa || "Sin asignar"
            };
        });
        const respuesta = await fetch("api/usuarios", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: jsonAscii(usuariosCompartidos)
        });
        return respuesta.ok;
    } catch (error) {
        console.warn("El servicio móvil aún no está disponible.", error);
        return false;
    }
}

function obtenerOperarios() {
    return leerStorage(CLAVES_STORAGE.operarios, []);
}

function guardarOperarios(operarios) {
    return guardarStorage(CLAVES_STORAGE.operarios, operarios);
}

function obtenerUsuarios() {
    return leerStorage(CLAVES_STORAGE.usuarios, []);
}

function guardarUsuarios(usuarios) {
    const guardado = guardarStorage(CLAVES_STORAGE.usuarios, usuarios);
    if (guardado) sincronizarUsuariosServidor(usuarios);
    return guardado;
}

function obtenerInasistencias() {
    return leerStorage(CLAVES_STORAGE.inasistencias, []);
}

function guardarInasistencias(inasistencias) {
    return guardarStorage(CLAVES_STORAGE.inasistencias, inasistencias);
}

function obtenerEmbarques() {
    return leerStorage(CLAVES_STORAGE.embarques, []);
}

function guardarEmbarques(embarques) {
    return guardarStorage(CLAVES_STORAGE.embarques, embarques);
}

function obtenerTareasActivas() {
    return leerStorage(CLAVES_STORAGE.tareasActivas, []);
}

function guardarTareasActivas(tareas) {
    return guardarStorage(CLAVES_STORAGE.tareasActivas, tareas);
}

function obtenerSesionGuardada() {
    try {
        const sesion = sessionStorage.getItem(CLAVE_SESION);
        return sesion ? JSON.parse(sesion) : null;
    } catch (error) {
        console.error("Error al leer la sesión:", error);
        return null;
    }
}

function guardarSesion(usuarioId) {
    try {
        sessionStorage.setItem(
            CLAVE_SESION,
            JSON.stringify({ usuarioId })
        );
        return true;
    } catch (error) {
        console.error("Error al guardar la sesión:", error);
        return false;
    }
}

function borrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
}
