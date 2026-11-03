const PLANTILLA_IMPORTACION_USUARIOS =
    "assets/templates/plantilla-importacion-usuarios-wis.xlsx";
const NOMBRE_PLANTILLA_IMPORTACION_USUARIOS =
    "plantilla-importacion-usuarios-wis.xlsx";
const TAMANO_MAXIMO_IMPORTACION_USUARIOS = 5 * 1024 * 1024;
const MAXIMO_USUARIOS_POR_IMPORTACION = 500;
const ENCABEZADOS_IMPORTACION_USUARIOS = [
    "Legajo",
    "Nombre completo",
    "Usuario WIS y web",
    "Cargo",
    "Operativa",
    "Turno",
    "Rol web",
    "Estado"
];

const CARGOS_IMPORTACION_USUARIOS = {
    operario: "Operario",
    administrativo: "Administrativo",
    supervisor: "Supervisor"
};
const TURNOS_IMPORTACION_USUARIOS = {
    manana: "Mañana",
    tarde: "Tarde",
    noche: "Noche"
};
const ROLES_IMPORTACION_USUARIOS = {
    normal: ROL_NORMAL,
    administrador: ROL_ADMINISTRADOR
};
const ESTADOS_IMPORTACION_USUARIOS = {
    activo: "Activo",
    inactivo: "Inactivo"
};

function inicializarImportacionUsuarios() {
    const descargar = document.getElementById(
        "descargar-plantilla-usuarios"
    );
    const importar = document.getElementById("importar-usuarios-excel");
    const archivo = document.getElementById("archivo-importacion-usuarios");

    descargar?.addEventListener("click", descargarPlantillaUsuarios);
    importar?.addEventListener("click", () => {
        archivo.value = "";
        archivo.click();
    });
    archivo?.addEventListener("change", manejarImportacionUsuarios);
}

function descargarPlantillaUsuarios() {
    const enlace = document.createElement("a");
    enlace.href = PLANTILLA_IMPORTACION_USUARIOS;
    enlace.download = NOMBRE_PLANTILLA_IMPORTACION_USUARIOS;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    mostrarMensajeImportacionUsuarios(
        "Plantilla de usuarios descargada.",
        "exito"
    );
}

async function manejarImportacionUsuarios(evento) {
    const archivo = evento.target.files[0] || null;

    if (!archivo || !esAdministrador()) {
        return;
    }

    bloquearImportacionUsuarios(true);
    mostrarMensajeImportacionUsuarios(
        `Validando ${archivo.name}…`,
        "cargando"
    );

    try {
        validarArchivoImportacionUsuarios(archivo);
        const filas = await leerFilasImportacionUsuarios(archivo);
        const registros = validarFilasImportacionUsuarios(filas);
        const credenciales = await crearUsuariosImportados(registros);
        actualizarSelectorOperariosSinUsuario();
        mostrarUsuarios();
        mostrarMensajeImportacionUsuarios(
            `${registros.length.toLocaleString("es-UY")} usuarios y registros ` +
                "de Personal importados. Anotá las contraseñas temporales: se " +
                "muestran una sola vez.",
            "exito"
        );
        mostrarCredencialesTemporalesImportacion(credenciales);
    } catch (error) {
        console.warn(error.message || error);
        mostrarMensajeImportacionUsuarios(
            error.message || "No fue posible importar los usuarios.",
            "error"
        );
    } finally {
        evento.target.value = "";
        bloquearImportacionUsuarios(false);
    }
}

function validarArchivoImportacionUsuarios(archivo) {
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("El archivo debe estar en formato .xlsx.");
    }

    if (archivo.size > TAMANO_MAXIMO_IMPORTACION_USUARIOS) {
        throw new Error("El archivo supera el máximo permitido de 5 MB.");
    }
}

async function leerFilasImportacionUsuarios(archivo) {
    if (
        typeof JSZip !== "function" ||
        typeof leerTextosCompartidosXlsx !== "function" ||
        typeof obtenerRutaPrimeraHojaXlsx !== "function" ||
        typeof convertirHojaXlsxEnFilas !== "function"
    ) {
        throw new Error("No se encontró el lector de archivos Excel.");
    }

    const zip = await JSZip.loadAsync(archivo);
    const compartidos = await leerTextosCompartidosXlsx(zip);
    const rutaHoja = await obtenerRutaPrimeraHojaXlsx(zip);
    const hoja = zip.file(rutaHoja);

    if (!hoja) {
        throw new Error("El Excel no contiene la hoja Usuarios WIS.");
    }

    const filas = convertirHojaXlsxEnFilas(
        await hoja.async("string"),
        compartidos
    );

    if (filas.length < 2) {
        throw new Error(
            "La plantilla no contiene usuarios. Completá al menos una fila."
        );
    }

    return filas;
}

function validarFilasImportacionUsuarios(filas) {
    const encabezados = filas[0].valores.map((valor) => {
        return String(valor ?? "").trim();
    });
    const esperados = ENCABEZADOS_IMPORTACION_USUARIOS.map(
        normalizarTextoImportacionUsuarios
    );
    const recibidos = encabezados
        .slice(0, esperados.length)
        .map(normalizarTextoImportacionUsuarios);
    const extras = encabezados.slice(esperados.length).some((valor) => {
        return String(valor ?? "").trim() !== "";
    });

    if (
        extras ||
        recibidos.length !== esperados.length ||
        esperados.some((valor, indice) => recibidos[indice] !== valor)
    ) {
        throw new Error(
            "Los encabezados no coinciden con la plantilla oficial. " +
            "Descargala nuevamente y no cambies el orden de las columnas."
        );
    }

    const operariosExistentes = obtenerOperarios();
    const usuariosExistentes = obtenerUsuarios();
    const legajosUsados = new Set(
        operariosExistentes.map((item) => {
            return normalizarTextoImportacionUsuarios(item.legajo);
        })
    );
    const usuariosUsados = new Set(
        usuariosExistentes.map((item) => {
            return normalizarNombreUsuario(item.nombreUsuario);
        })
    );
    const errores = [];
    const registros = [];

    filas.slice(1).forEach((fila) => {
        const valores = Array.from({ length: esperados.length }, (_, indice) => {
            return String(fila.valores[indice] ?? "").trim();
        });

        if (valores.every((valor) => !valor)) {
            return;
        }

        const [
            legajo,
            nombre,
            usuarioCrudo,
            cargoCrudo,
            operativaCruda,
            turnoCrudo,
            rolCrudo,
            estadoCrudo
        ] = valores;
        const numeroFila = fila.numero || registros.length + 2;
        const usuario = normalizarNombreUsuario(usuarioCrudo);
        const cargo = CARGOS_IMPORTACION_USUARIOS[
            normalizarTextoImportacionUsuarios(cargoCrudo)
        ];
        const operativa = OPERATIVAS.find((item) => {
            return normalizarTextoImportacionUsuarios(item) ===
                normalizarTextoImportacionUsuarios(operativaCruda);
        });
        const turno = TURNOS_IMPORTACION_USUARIOS[
            normalizarTextoImportacionUsuarios(turnoCrudo)
        ];
        const rol = ROLES_IMPORTACION_USUARIOS[
            normalizarTextoImportacionUsuarios(rolCrudo)
        ];
        const estado = ESTADOS_IMPORTACION_USUARIOS[
            normalizarTextoImportacionUsuarios(estadoCrudo)
        ];
        const legajoNormalizado = normalizarTextoImportacionUsuarios(legajo);
        const problemas = [];

        if (!legajo || !nombre || !usuarioCrudo) {
            problemas.push("faltan legajo, nombre o usuario");
        }

        if (!validarNombreUsuario(usuario)) {
            problemas.push("el usuario WIS no es válido para el acceso web");
        }

        if (!cargo) {
            problemas.push("cargo inválido");
        }

        if (!operativa) {
            problemas.push("operativa inválida");
        }

        if (!turno) {
            problemas.push("turno inválido");
        }

        if (!rol) {
            problemas.push("rol web inválido");
        }

        if (!estado) {
            problemas.push("estado inválido");
        }

        if (legajosUsados.has(legajoNormalizado)) {
            problemas.push("legajo duplicado");
        }

        if (usuariosUsados.has(usuario)) {
            problemas.push("usuario WIS/web duplicado");
        }

        if (problemas.length) {
            errores.push(`Fila ${numeroFila}: ${problemas.join(", ")}`);
            return;
        }

        legajosUsados.add(legajoNormalizado);
        usuariosUsados.add(usuario);
        registros.push({
            legajo,
            nombre,
            usuario,
            cargo,
            operativa,
            turno,
            rol,
            estado
        });
    });

    if (errores.length) {
        const muestra = errores.slice(0, 6).join(" · ");
        const adicionales = errores.length > 6
            ? ` · y ${errores.length - 6} filas más`
            : "";
        throw new Error(`${muestra}${adicionales}.`);
    }

    if (!registros.length) {
        throw new Error("El archivo no contiene usuarios válidos.");
    }

    if (registros.length > MAXIMO_USUARIOS_POR_IMPORTACION) {
        throw new Error(
            `El archivo supera el máximo de ${MAXIMO_USUARIOS_POR_IMPORTACION} usuarios.`
        );
    }

    return registros;
}

/*
 * Contraseña temporal al azar para cada cuenta importada. Reemplaza a la clave
 * fija que antes estaba escrita en el código. Se le muestra al administrador
 * una sola vez, después de importar, y cada usuario la cambia en su primer
 * ingreso a la web (lo exige `debeCambiarClave`). Sin caracteres ambiguos
 * (0/O, 1/l/I) para que sea fácil de dictar.
 */
function generarContrasenaTemporalImportacion() {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const largo = 12;
    const valores = new Uint32Array(largo);
    crypto.getRandomValues(valores);
    let clave = "";

    for (let indice = 0; indice < largo; indice += 1) {
        clave += alfabeto[valores[indice] % alfabeto.length];
    }

    return clave;
}

/*
 * Crea operarios y cuentas. Devuelve la lista de credenciales temporales
 * { usuario, nombre, contrasena } para mostrarla una vez al administrador.
 */
async function crearUsuariosImportados(registros) {
    const operariosAnteriores = obtenerOperarios();
    const usuariosAnteriores = obtenerUsuarios();
    const fechaImportacion = new Date().toISOString();
    const nuevosOperarios = [];
    const nuevosUsuarios = [];
    const credencialesTemporales = [];

    for (let indice = 0; indice < registros.length; indice += 1) {
        const registro = registros[indice];
        const operario = {
            id: generarId(),
            legajo: registro.legajo,
            nombre: registro.nombre,
            cargo: registro.cargo,
            operativa: registro.operativa,
            turno: registro.turno,
            estado: registro.estado,
            origen: "Importación WIS",
            fechaRegistro: fechaImportacion
        };
        const contrasenaTemporal = generarContrasenaTemporalImportacion();
        const usuario = await crearRegistroUsuario({
            nombre: registro.nombre,
            nombreUsuario: registro.usuario,
            contrasena: contrasenaTemporal,
            rol: registro.rol,
            operarioId: operario.id,
            activo: registro.estado === "Activo",
            debeCambiarClave: true
        });
        usuario.origen = "Importación WIS";
        usuario.fechaImportacion = fechaImportacion;
        nuevosOperarios.push(operario);
        nuevosUsuarios.push(usuario);
        credencialesTemporales.push({
            usuario: registro.usuario,
            nombre: registro.nombre,
            contrasena: contrasenaTemporal
        });

        if ((indice + 1) % 10 === 0) {
            mostrarMensajeImportacionUsuarios(
                `Preparando cuentas: ${indice + 1} de ${registros.length}…`,
                "cargando"
            );
        }
    }

    if (!guardarOperarios([...operariosAnteriores, ...nuevosOperarios])) {
        throw new Error("No fue posible guardar el Personal importado.");
    }

    if (!guardarUsuarios([...usuariosAnteriores, ...nuevosUsuarios])) {
        guardarOperarios(operariosAnteriores);
        throw new Error("No fue posible guardar las cuentas importadas.");
    }

    return credencialesTemporales;
}

function bloquearImportacionUsuarios(bloquear) {
    [
        "descargar-plantilla-usuarios",
        "importar-usuarios-excel"
    ].forEach((id) => {
        const boton = document.getElementById(id);

        if (boton) {
            boton.disabled = bloquear;
        }
    });
}

/*
 * Muestra una sola vez las contraseñas temporales recién generadas, con un
 * botón para copiarlas. Se arma con nodos de texto (no innerHTML con datos) y
 * no se guarda en ningún lado: al recargar la página desaparece.
 */
function mostrarCredencialesTemporalesImportacion(credenciales) {
    const contenedor = document.getElementById("credenciales-temporales-usuarios");

    if (!contenedor) {
        return;
    }

    contenedor.replaceChildren();

    if (!Array.isArray(credenciales) || !credenciales.length) {
        contenedor.hidden = true;
        return;
    }

    const titulo = document.createElement("h4");
    titulo.textContent = "Contraseñas temporales (se muestran una sola vez)";

    const aviso = document.createElement("p");
    aviso.className = "texto-secundario";
    aviso.textContent = "Entregáselas a cada persona por un medio seguro. " +
        "Cada una deberá cambiarla en su primer ingreso a la web; hasta " +
        "entonces no puede entrar desde el handheld.";

    const copiar = document.createElement("button");
    copiar.type = "button";
    copiar.className = "boton-secundario";
    copiar.textContent = "Copiar lista";
    copiar.addEventListener("click", () => {
        const texto = credenciales
            .map((fila) => `${fila.usuario}\t${fila.contrasena}`)
            .join("\n");
        navigator.clipboard?.writeText(texto).then(
            () => { copiar.textContent = "Copiado"; },
            () => { copiar.textContent = "No se pudo copiar"; }
        );
    });

    const tabla = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML =
        "<tr><th>Usuario</th><th>Nombre</th><th>Contraseña temporal</th></tr>";
    const tbody = document.createElement("tbody");

    credenciales.forEach((fila) => {
        const tr = document.createElement("tr");
        [fila.usuario, fila.nombre, fila.contrasena].forEach((valor, columna) => {
            const td = document.createElement("td");
            td.textContent = valor;

            if (columna === 2) {
                td.className = "contrasena-temporal-usuarios";
            }

            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    tabla.append(thead, tbody);

    const envoltorio = document.createElement("div");
    envoltorio.className = "contenedor-tabla";
    envoltorio.appendChild(tabla);

    contenedor.append(titulo, aviso, copiar, envoltorio);
    contenedor.hidden = false;
}

function mostrarMensajeImportacionUsuarios(texto, tipo) {
    const mensaje = document.getElementById(
        "mensaje-importacion-usuarios"
    );

    if (!mensaje) {
        return;
    }

    if (tipo === "cargando") {
        mostrarEsperaPolo(mensaje, texto);
    } else {
        mensaje.textContent = texto;
    }

    mensaje.className = `mensaje ${tipo || ""}`.trim();
}

function normalizarTextoImportacionUsuarios(valor) {
    return String(valor ?? "")
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}
