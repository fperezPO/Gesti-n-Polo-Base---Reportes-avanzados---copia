// Operativas por cliente: salen del catálogo de empresas WIS (catalogo-empresas.js).
const OPERATIVAS = obtenerNombresOperativasCatalogo();

const TODAS_LAS_OPERATIVAS = "Todas";
const SIN_OPERATIVA = "Sin asignar";
const TODOS_LOS_MOTIVOS = "Todos";
const MOTIVO_CERTIFICACION = "Certificación médica";
const TAMANO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024;
const MOTIVOS_INASISTENCIA = [
    MOTIVO_CERTIFICACION,
    "Enfermedad sin certificado",
    "Accidente laboral",
    "Falta con aviso",
    "Falta sin aviso",
    "Trámite personal",
    "Licencia especial",
    "Otro"
];

function inicializarPagina(pagina) {
    switch (pagina) {
        case "inicio":
            inicializarInicio();
            break;

        case "operarios":
            inicializarOperarios();
            break;

        case "usuarios":
            inicializarUsuarios();
            break;

        case "embarques":
            inicializarEmbarques();
            break;

        case "inasistencias":
            inicializarInasistencias();
            break;

        case "reportes":
            inicializarReportes();
            break;

        case "horas":
            break;

        case "tareas-activas":
            if (typeof inicializarTareasActivas === "function") {
                inicializarTareasActivas();
            }
            break;

        case "actividades":
            if (typeof inicializarActividades === "function") {
                inicializarActividades();
            }
            break;
    }

    if (typeof inicializarExportacionPagina === "function") {
        inicializarExportacionPagina(pagina);
    }
}

function inicializarInicio() {
    actualizarResumenInicio();

    if (typeof inicializarResumenOperativoInicio === "function") {
        inicializarResumenOperativoInicio();
    }
}

function actualizarResumenInicio() {
    const operarios = obtenerOperarios();
    const filtroOperativa = document.getElementById(
        "filtro-operativa-grafico-inicio"
    );
    const operativaSeleccionada = filtroOperativa
        ? filtroOperativa.value
        : TODAS_LAS_OPERATIVAS;
    const inasistencias = typeof obtenerInasistenciasVisibles === "function"
        ? obtenerInasistenciasVisibles()
        : typeof obtenerInasistencias === "function"
            ? obtenerInasistencias()
            : [];
    const inasistenciasFiltradas = filtrarRegistrosInicioPorOperativa(
        inasistencias,
        operativaSeleccionada,
        operarios
    );
    const embarques = typeof obtenerEmbarques === "function"
        ? obtenerEmbarques()
        : [];
    const embarquesActivos = filtrarRegistrosInicioPorOperativa(
        embarques,
        operativaSeleccionada,
        operarios
    ).filter((embarque) => {
            return obtenerEstadoEmbarque(embarque) !==
                ESTADO_EMBARQUE_FINALIZADO;
        });

    actualizarTexto(
        "total-horas",
        obtenerTotalHoras(operativaSeleccionada, operarios)
    );
    actualizarTexto("total-inasistencias", inasistenciasFiltradas.length);
    actualizarTexto("total-embarques-activos", embarquesActivos.length);
    const alcance = operativaSeleccionada === TODAS_LAS_OPERATIVAS
        ? "Todas las operativas"
        : operativaSeleccionada;
    actualizarTexto(
        "detalle-horas-inicio",
        `${alcance} · Horas registradas`
    );
    actualizarTexto(
        "detalle-inasistencias-inicio",
        `${alcance} · Registros cargados`
    );
    actualizarTexto(
        "detalle-embarques-inicio",
        `${alcance} · Pendientes o en almacenaje`
    );
}

function actualizarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function obtenerTotalHoras(
    operativa = TODAS_LAS_OPERATIVAS,
    operarios = obtenerOperarios()
) {
    if (typeof leerStorage !== "function") {
        return 0;
    }

    const horasGuardadas = leerStorage("gestion_personal_horas", []);

    return filtrarRegistrosInicioPorOperativa(
        horasGuardadas,
        operativa,
        operarios
    ).reduce((total, registro) => {
        return total + (Number(registro.horas) || 0);
    }, 0);
}

function filtrarRegistrosInicioPorOperativa(
    registros,
    operativa,
    operarios = obtenerOperarios()
) {
    if (operativa === TODAS_LAS_OPERATIVAS) {
        return registros;
    }

    return registros.filter((registro) => {
        const operarioId = registro.operarioId || registro.idOperario || "";
        const operario = operarios.find((item) => item.id === operarioId);
        const operativaRegistro = registro.operativa ||
            (operario ? operario.operativa : "");

        return normalizarOperativa(operativaRegistro) === operativa;
    });
}

function inicializarOperarios() {
    const formulario = document.getElementById("form-operario");
    const tabla = document.getElementById("tabla-operarios");
    const selectOperativa = document.getElementById(
        "operativa-operario"
    );
    const filtroOperativa = document.getElementById(
        "filtro-operativa-operarios"
    );
    const administrador = esAdministrador();

    document.querySelectorAll("[data-requiere-admin]").forEach((elemento) => {
        elemento.hidden = !administrador;
    });

    const avisoLectura = document.getElementById("aviso-solo-lectura");

    if (avisoLectura) {
        avisoLectura.hidden = administrador;
    }

    cargarOpcionesOperativas(selectOperativa);
    cargarOpcionesFiltroOperativas(filtroOperativa);
    mostrarOperarios();

    if (formulario && administrador) {
        formulario.addEventListener("submit", guardarNuevoOperario);
    }

    if (filtroOperativa) {
        filtroOperativa.addEventListener("change", mostrarOperarios);
    }

    if (!tabla || !administrador) {
        return;
    }

    tabla.addEventListener("click", (evento) => {
        const botonEliminar = evento.target.closest(
            "[data-eliminar-operario]"
        );

        if (botonEliminar) {
            eliminarOperario(botonEliminar.dataset.eliminarOperario);
        }
    });

    tabla.addEventListener("change", (evento) => {
        const selectorOperativa = evento.target.closest(
            "[data-operativa-operario]"
        );

        if (selectorOperativa) {
            actualizarOperativaOperario(
                selectorOperativa.dataset.operativaOperario,
                selectorOperativa.value
            );
        }
    });
}

async function guardarNuevoOperario(evento) {
    evento.preventDefault();

    if (!esAdministrador()) {
        return;
    }

    const legajo = obtenerValor("legajo-operario");
    const nombre = obtenerValor("nombre-operario");
    const cargo = obtenerValor("cargo-operario");
    const operativa = obtenerValor("operativa-operario");
    const turno = obtenerValor("turno-operario");
    const estado = obtenerValor("estado-operario");
    const nombreUsuario = obtenerValor("usuario-operario");
    const contrasena = document.getElementById("clave-operario").value;
    const confirmarClave = document.getElementById(
        "confirmar-clave-operario"
    ).value;
    const rol = obtenerValor("rol-operario");
    const operarios = obtenerOperarios();
    const usuarios = obtenerUsuarios();

    const legajoExistente = operarios.some((operario) => {
        return operario.legajo.toLowerCase() === legajo.toLowerCase();
    });

    if (legajoExistente) {
        mostrarMensajeOperarios(
            "Ya existe un operario con ese legajo.",
            "error"
        );
        return;
    }

    if (contrasena !== confirmarClave) {
        mostrarMensajeOperarios(
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    const nuevoOperario = {
        id: generarId(),
        legajo,
        nombre,
        cargo,
        operativa,
        turno,
        estado,
        fechaRegistro: new Date().toISOString()
    };

    try {
        const nuevoUsuario = await crearRegistroUsuario({
            nombre,
            nombreUsuario,
            contrasena,
            rol,
            operarioId: nuevoOperario.id
        });

        if (!guardarOperarios([...operarios, nuevoOperario])) {
            throw new Error("No fue posible guardar el operario.");
        }

        if (!guardarUsuarios([...usuarios, nuevoUsuario])) {
            guardarOperarios(operarios);
            throw new Error("No fue posible guardar el usuario.");
        }

        evento.target.reset();
        mostrarMensajeOperarios(
            "Operario y usuario guardados correctamente.",
            "exito"
        );
        mostrarOperarios();
    } catch (error) {
        mostrarMensajeOperarios(error.message, "error");
    }
}

function obtenerValor(id) {
    return document.getElementById(id).value.trim();
}

function mostrarOperarios() {
    const tabla = document.getElementById("tabla-operarios");

    if (!tabla) {
        return;
    }

    const operarios = obtenerOperarios();
    const usuarios = obtenerUsuarios();
    const filtroOperativa = document.getElementById(
        "filtro-operativa-operarios"
    );
    const operativaSeleccionada = filtroOperativa
        ? filtroOperativa.value
        : TODAS_LAS_OPERATIVAS;
    const operariosFiltrados = filtrarPorOperativa(
        operarios,
        operativaSeleccionada
    );

    tabla.innerHTML = "";
    actualizarDetalleFiltroOperarios(
        operativaSeleccionada,
        operariosFiltrados.length
    );

    if (operariosFiltrados.length === 0) {
        agregarFilaVacia(
            tabla,
            8,
            operarios.length === 0
                ? "Todavía no hay personal registrado."
                : "No hay personal para la operativa seleccionada."
        );
        return;
    }

    operariosFiltrados.forEach((operario) => {
        const fila = document.createElement("tr");
        const usuario = usuarios.find((item) => {
            return item.operarioId === operario.id;
        });

        fila.appendChild(crearCelda(operario.legajo));
        fila.appendChild(crearCelda(operario.nombre));
        fila.appendChild(crearCelda(operario.cargo));
        fila.appendChild(crearCeldaOperativa(operario));
        fila.appendChild(crearCelda(operario.turno));
        fila.appendChild(crearCelda(operario.estado));
        fila.appendChild(crearCeldaEstadoUsuario(usuario));
        fila.appendChild(crearCeldaAccionesOperario(operario));
        tabla.appendChild(fila);
    });
}

function crearCeldaEstadoUsuario(usuario) {
    const celda = document.createElement("td");

    if (!usuario) {
        const insignia = document.createElement("span");
        insignia.className = "insignia advertencia";
        insignia.textContent = "Sin cuenta";
        celda.appendChild(insignia);
        return celda;
    }

    celda.textContent = usuario.nombreUsuario;

    if (!usuario.activo) {
        const estado = document.createElement("span");
        estado.className = "insignia inactivo";
        estado.textContent = "Inactivo";
        celda.append(" ", estado);
    }

    return celda;
}

function crearCeldaAccionesOperario(operario) {
    const celda = document.createElement("td");

    if (!esAdministrador()) {
        celda.textContent = "Solo lectura";
        return celda;
    }

    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.className = "boton-eliminar";
    botonEliminar.dataset.eliminarOperario = operario.id;
    celda.appendChild(botonEliminar);

    return celda;
}

function crearCeldaOperativa(operario) {
    const operativaActual = normalizarOperativa(operario.operativa);

    if (!esAdministrador()) {
        return crearCelda(operativaActual);
    }

    const celda = document.createElement("td");
    const selector = document.createElement("select");
    selector.className = "selector-operativa-tabla";
    selector.dataset.operativaOperario = operario.id;
    selector.setAttribute("aria-label", `Operativa de ${operario.nombre}`);

    agregarOpcion(selector, SIN_OPERATIVA, SIN_OPERATIVA);
    agregarOpcionesOperativasAgrupadas(selector);

    selector.value = operativaActual;
    celda.appendChild(selector);
    return celda;
}

function actualizarOperativaOperario(idOperario, nuevaOperativa) {
    if (!esAdministrador()) {
        return;
    }

    const operarios = obtenerOperarios();
    const operario = operarios.find((item) => item.id === idOperario);

    if (!operario) {
        mostrarMensajeOperarios("No se encontró el operario.", "error");
        return;
    }

    operario.operativa = nuevaOperativa;

    if (!guardarOperarios(operarios)) {
        mostrarMensajeOperarios(
            "No fue posible actualizar la operativa.",
            "error"
        );
        mostrarOperarios();
        return;
    }

    mostrarMensajeOperarios(
        "Operativa actualizada correctamente.",
        "exito"
    );
    mostrarOperarios();
}

function eliminarOperario(idOperario) {
    if (!esAdministrador()) {
        return;
    }

    const usuarioActual = obtenerUsuarioActual();

    if (usuarioActual && usuarioActual.operarioId === idOperario) {
        mostrarMensajeOperarios(
            "No podés eliminar el operario vinculado a tu propia sesión.",
            "error"
        );
        return;
    }

    const tieneInasistencias = obtenerInasistencias().some((registro) => {
        return registro.operarioId === idOperario;
    });

    if (tieneInasistencias) {
        mostrarMensajeOperarios(
            "No podés eliminar un operario con inasistencias registradas. " +
            "Eliminá primero esos registros desde Inasistencias.",
            "error"
        );
        return;
    }

    if (!confirm("¿Querés eliminar este operario y su usuario?")) {
        return;
    }

    const operarios = obtenerOperarios();
    const usuarios = obtenerUsuarios();
    const operariosActualizados = operarios.filter((operario) => {
        return operario.id !== idOperario;
    });
    const usuariosActualizados = usuarios.filter((usuario) => {
        return usuario.operarioId !== idOperario;
    });

    if (!guardarOperarios(operariosActualizados)) {
        mostrarMensajeOperarios("No fue posible eliminar el operario.", "error");
        return;
    }

    if (!guardarUsuarios(usuariosActualizados)) {
        guardarOperarios(operarios);
        mostrarMensajeOperarios("No fue posible eliminar el usuario.", "error");
        return;
    }

    mostrarOperarios();
    mostrarMensajeOperarios(
        "Operario y usuario eliminados correctamente.",
        "exito"
    );
}

function inicializarUsuarios() {
    if (!esAdministrador()) {
        cargarPagina("inicio");
        return;
    }

    const formulario = document.getElementById("form-usuario");
    const tabla = document.getElementById("tabla-usuarios");

    actualizarSelectorOperariosSinUsuario();
    mostrarUsuarios();
    formulario.addEventListener("submit", guardarNuevoUsuario);

    if (typeof inicializarImportacionUsuarios === "function") {
        inicializarImportacionUsuarios();
    }

    tabla.addEventListener("click", (evento) => {
        const botonEstado = evento.target.closest("[data-cambiar-estado-usuario]");

        if (botonEstado) {
            cambiarEstadoUsuario(botonEstado.dataset.cambiarEstadoUsuario);
        }
    });

    tabla.addEventListener("change", (evento) => {
        const selectorRol = evento.target.closest("[data-rol-usuario]");

        if (selectorRol) {
            cambiarRolUsuario(
                selectorRol.dataset.rolUsuario,
                selectorRol.value
            );
        }
    });
}

function actualizarSelectorOperariosSinUsuario() {
    const selector = document.getElementById("operario-usuario");
    const formulario = document.getElementById("form-usuario");
    const aviso = document.getElementById("sin-operarios-disponibles");

    if (!selector || !formulario) {
        return;
    }

    const idsConUsuario = new Set(
        obtenerUsuarios()
            .filter((usuario) => usuario.operarioId)
            .map((usuario) => usuario.operarioId)
    );
    const disponibles = obtenerOperarios().filter((operario) => {
        return !idsConUsuario.has(operario.id);
    });

    selector.innerHTML = "";
    agregarOpcion(selector, "", "Seleccionar operario");

    disponibles.forEach((operario) => {
        agregarOpcion(
            selector,
            operario.id,
            `${operario.legajo} - ${operario.nombre}`
        );
    });

    const sinDisponibles = disponibles.length === 0;
    formulario.querySelectorAll("input, select, button").forEach((control) => {
        control.disabled = sinDisponibles;
    });
    aviso.hidden = !sinDisponibles;
}

async function guardarNuevoUsuario(evento) {
    evento.preventDefault();

    const operarioId = obtenerValor("operario-usuario");
    const nombreUsuario = obtenerValor("nombre-nuevo-usuario");
    const contrasena = document.getElementById(
        "clave-nuevo-usuario"
    ).value;
    const confirmarClave = document.getElementById(
        "confirmar-clave-nuevo-usuario"
    ).value;
    const rol = obtenerValor("rol-nuevo-usuario");
    const operario = obtenerOperarios().find((item) => {
        return item.id === operarioId;
    });

    if (!operario) {
        mostrarMensajeUsuarios("Seleccioná un operario válido.", "error");
        return;
    }

    if (contrasena !== confirmarClave) {
        mostrarMensajeUsuarios("Las contraseñas no coinciden.", "error");
        return;
    }

    try {
        const usuario = await crearRegistroUsuario({
            nombre: operario.nombre,
            nombreUsuario,
            contrasena,
            rol,
            operarioId
        });
        const usuarios = obtenerUsuarios();

        if (!guardarUsuarios([...usuarios, usuario])) {
            throw new Error("No fue posible guardar el usuario.");
        }

        evento.target.reset();
        actualizarSelectorOperariosSinUsuario();
        mostrarUsuarios();
        mostrarMensajeUsuarios("Usuario creado correctamente.", "exito");
    } catch (error) {
        mostrarMensajeUsuarios(error.message, "error");
    }
}

function mostrarUsuarios() {
    const tabla = document.getElementById("tabla-usuarios");

    if (!tabla) {
        return;
    }

    const usuarios = obtenerUsuarios();
    const operarios = obtenerOperarios();
    const usuarioActual = obtenerUsuarioActual();
    tabla.innerHTML = "";

    if (usuarios.length === 0) {
        agregarFilaVacia(tabla, 6, "No hay usuarios registrados.");
        return;
    }

    usuarios.forEach((usuario) => {
        const fila = document.createElement("tr");
        const operario = operarios.find((item) => {
            return item.id === usuario.operarioId;
        });

        fila.appendChild(crearCelda(usuario.nombre));
        fila.appendChild(crearCelda(usuario.nombreUsuario));
        fila.appendChild(crearCelda(
            operario
                ? `${operario.legajo} - ${operario.nombre}`
                : "Administrador inicial"
        ));
        fila.appendChild(crearCeldaRolUsuario(usuario, usuarioActual));
        fila.appendChild(crearCeldaEstadoAccesoUsuario(usuario));
        fila.appendChild(crearCeldaAccionUsuario(usuario, usuarioActual));
        tabla.appendChild(fila);
    });
}

function crearCeldaEstadoAccesoUsuario(usuario) {
    const celda = document.createElement("td");
    celda.append(usuario.activo ? "Activo" : "Inactivo");

    if (usuario.debeCambiarClave) {
        const insignia = document.createElement("span");
        insignia.className = "insignia advertencia insignia-clave-pendiente";
        insignia.textContent = "Cambio pendiente";
        celda.append(" ", insignia);
    }

    return celda;
}

function crearCeldaRolUsuario(usuario, usuarioActual) {
    const celda = document.createElement("td");
    const selector = document.createElement("select");
    agregarOpcion(selector, ROL_NORMAL, "Usuario normal");
    agregarOpcion(selector, ROL_ADMINISTRADOR, "Administrador");
    selector.value = usuario.rol;
    selector.dataset.rolUsuario = usuario.id;
    selector.setAttribute("aria-label", `Rol de ${usuario.nombreUsuario}`);
    selector.disabled = usuario.id === usuarioActual.id;
    celda.appendChild(selector);
    return celda;
}

function crearCeldaAccionUsuario(usuario, usuarioActual) {
    const celda = document.createElement("td");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = usuario.activo ? "boton-eliminar" : "boton-secundario";
    boton.textContent = usuario.activo ? "Desactivar" : "Activar";
    boton.dataset.cambiarEstadoUsuario = usuario.id;
    boton.disabled = usuario.id === usuarioActual.id;

    if (boton.disabled) {
        boton.title = "No podés desactivar tu propia cuenta.";
    }

    celda.appendChild(boton);
    return celda;
}

function cambiarEstadoUsuario(usuarioId) {
    const usuarios = obtenerUsuarios();
    const usuario = usuarios.find((item) => item.id === usuarioId);
    const usuarioActual = obtenerUsuarioActual();

    if (!usuario || usuario.id === usuarioActual.id) {
        mostrarMensajeUsuarios(
            "No podés modificar el estado de tu propia cuenta.",
            "error"
        );
        return;
    }

    if (
        usuario.activo &&
        usuario.rol === ROL_ADMINISTRADOR &&
        contarAdministradoresActivos(usuarios) === 1
    ) {
        mostrarMensajeUsuarios(
            "Debe quedar al menos un administrador activo.",
            "error"
        );
        return;
    }

    usuario.activo = !usuario.activo;
    guardarUsuarios(usuarios);
    mostrarUsuarios();
    mostrarMensajeUsuarios("Estado del usuario actualizado.", "exito");
}

function cambiarRolUsuario(usuarioId, nuevoRol) {
    const usuarios = obtenerUsuarios();
    const usuario = usuarios.find((item) => item.id === usuarioId);
    const usuarioActual = obtenerUsuarioActual();

    if (!usuario || usuario.id === usuarioActual.id) {
        mostrarUsuarios();
        return;
    }

    if (
        usuario.rol === ROL_ADMINISTRADOR &&
        nuevoRol === ROL_NORMAL &&
        usuario.activo &&
        contarAdministradoresActivos(usuarios) === 1
    ) {
        mostrarMensajeUsuarios(
            "Debe quedar al menos un administrador activo.",
            "error"
        );
        mostrarUsuarios();
        return;
    }

    usuario.rol = nuevoRol;
    guardarUsuarios(usuarios);
    mostrarUsuarios();
    mostrarMensajeUsuarios("Rol actualizado correctamente.", "exito");
}

function contarAdministradoresActivos(usuarios) {
    return usuarios.filter((usuario) => {
        return usuario.activo && usuario.rol === ROL_ADMINISTRADOR;
    }).length;
}

function inicializarInasistencias() {
    const administrador = esAdministrador();
    const formulario = document.getElementById("form-inasistencia");
    const tabla = document.getElementById("tabla-inasistencias");
    const duracion = document.getElementById("duracion-inasistencia");
    const fechaDesde = document.getElementById(
        "fecha-desde-inasistencia"
    );

    document.querySelectorAll("[data-requiere-admin-inasistencias]")
        .forEach((elemento) => {
            elemento.hidden = !administrador;
        });

    document.querySelectorAll("[data-filtro-admin-inasistencias]")
        .forEach((elemento) => {
            elemento.hidden = !administrador;
        });

    const avisoLectura = document.getElementById(
        "aviso-inasistencias-lectura"
    );

    if (avisoLectura) {
        avisoLectura.hidden = administrador;
    }

    cargarOperariosInasistencias();
    cargarOpcionesMotivos(
        document.getElementById("motivo-inasistencia"),
        false
    );
    cargarOpcionesMotivos(
        document.getElementById("filtro-motivo-inasistencias"),
        true
    );
    cargarOpcionesFiltroOperativas(
        document.getElementById("filtro-operativa-inasistencias")
    );
    actualizarVisibilidadHorarioInasistencia();
    mostrarInasistencias();

    if (formulario && administrador) {
        formulario.addEventListener(
            "submit",
            guardarNuevaInasistencia
        );
    }

    if (duracion) {
        duracion.addEventListener(
            "change",
            actualizarVisibilidadHorarioInasistencia
        );
    }

    if (fechaDesde) {
        fechaDesde.addEventListener("change", () => {
            const fechaHasta = document.getElementById(
                "fecha-hasta-inasistencia"
            );

            if (fechaHasta && !fechaHasta.value) {
                fechaHasta.value = fechaDesde.value;
            }
        });
    }

    [
        "filtro-operario-inasistencias",
        "filtro-operativa-inasistencias",
        "filtro-motivo-inasistencias",
        "filtro-desde-inasistencias",
        "filtro-hasta-inasistencias"
    ].forEach((id) => {
        const control = document.getElementById(id);

        if (control) {
            control.addEventListener("change", mostrarInasistencias);
        }
    });

    if (tabla) {
        tabla.addEventListener("click", async (evento) => {
            const botonDocumento = evento.target.closest(
                "[data-descargar-documento]"
            );
            const botonEliminar = evento.target.closest(
                "[data-eliminar-inasistencia]"
            );

            if (botonDocumento) {
                await descargarDocumentoInasistencia(
                    botonDocumento.dataset.descargarDocumento
                );
            }

            if (botonEliminar && administrador) {
                await eliminarInasistencia(
                    botonEliminar.dataset.eliminarInasistencia
                );
            }
        });
    }
}

function cargarOperariosInasistencias() {
    const operarios = obtenerOperarios();
    const selectorFormulario = document.getElementById(
        "operario-inasistencia"
    );
    const selectorFiltro = document.getElementById(
        "filtro-operario-inasistencias"
    );
    const formulario = document.getElementById("form-inasistencia");
    const aviso = document.getElementById("sin-operarios-inasistencias");

    if (selectorFormulario) {
        agregarOpcion(selectorFormulario, "", "Seleccionar operario");
    }

    if (selectorFiltro) {
        agregarOpcion(selectorFiltro, "", "Todos los operarios");
    }

    operarios.forEach((operario) => {
        const texto = `${operario.legajo} - ${operario.nombre}`;

        if (selectorFormulario) {
            agregarOpcion(selectorFormulario, operario.id, texto);
        }

        if (selectorFiltro) {
            agregarOpcion(selectorFiltro, operario.id, texto);
        }
    });

    const sinOperarios = operarios.length === 0;

    if (formulario) {
        formulario.querySelectorAll("input, select, textarea, button")
            .forEach((control) => {
                control.disabled = sinOperarios;
            });
    }

    if (aviso) {
        aviso.hidden = !sinOperarios;
    }
}

function cargarOpcionesMotivos(selector, incluirTodos) {
    if (!selector) {
        return;
    }

    if (incluirTodos) {
        agregarOpcion(selector, TODOS_LOS_MOTIVOS, "Todos los motivos");
    } else {
        agregarOpcion(selector, "", "Seleccionar motivo");
    }

    MOTIVOS_INASISTENCIA.forEach((motivo) => {
        agregarOpcion(selector, motivo, motivo);
    });
}

function actualizarVisibilidadHorarioInasistencia() {
    const duracion = document.getElementById("duracion-inasistencia");
    const horario = document.getElementById("horario-inasistencia");
    const horaDesde = document.getElementById("hora-desde-inasistencia");
    const horaHasta = document.getElementById("hora-hasta-inasistencia");

    if (!duracion || !horario || !horaDesde || !horaHasta) {
        return;
    }

    const parcial = duracion.value === "parcial";
    horario.hidden = !parcial;
    horaDesde.required = parcial;
    horaHasta.required = parcial;

    if (!parcial) {
        horaDesde.value = "";
        horaHasta.value = "";
    }
}

async function guardarNuevaInasistencia(evento) {
    evento.preventDefault();

    if (!esAdministrador()) {
        return;
    }

    const operarioId = obtenerValor("operario-inasistencia");
    const motivo = obtenerValor("motivo-inasistencia");
    const fechaDesde = obtenerValor("fecha-desde-inasistencia");
    const fechaHasta = obtenerValor("fecha-hasta-inasistencia");
    const duracion = obtenerValor("duracion-inasistencia");
    const horaDesde = obtenerValor("hora-desde-inasistencia");
    const horaHasta = obtenerValor("hora-hasta-inasistencia");
    const detalle = obtenerValor("detalle-inasistencia");
    const archivo = document.getElementById(
        "certificado-inasistencia"
    ).files[0] || null;
    const operario = obtenerOperarios().find((item) => {
        return item.id === operarioId;
    });

    if (!operario) {
        mostrarMensajeInasistencias(
            "Seleccioná un operario válido.",
            "error"
        );
        return;
    }

    if (fechaHasta < fechaDesde) {
        mostrarMensajeInasistencias(
            "La fecha hasta no puede ser anterior a la fecha desde.",
            "error"
        );
        return;
    }

    if (duracion === "parcial") {
        if (fechaDesde !== fechaHasta) {
            mostrarMensajeInasistencias(
                "Una ausencia parcial debe comenzar y finalizar el mismo día.",
                "error"
            );
            return;
        }

        if (!horaDesde || !horaHasta || horaHasta <= horaDesde) {
            mostrarMensajeInasistencias(
                "Ingresá un horario parcial válido.",
                "error"
            );
            return;
        }
    }

    if (archivo && !validarDocumentoInasistencia(archivo)) {
        return;
    }

    const nuevaInasistencia = {
        id: generarId(),
        operarioId,
        fechaDesde,
        fechaHasta,
        duracion,
        horaDesde: duracion === "parcial" ? horaDesde : "",
        horaHasta: duracion === "parcial" ? horaHasta : "",
        motivo,
        detalle,
        documento: null,
        registradoPor: obtenerUsuarioActual().id,
        fechaRegistro: new Date().toISOString()
    };
    const inasistencias = obtenerInasistencias();

    if (existeInasistenciaSolapada(nuevaInasistencia, inasistencias)) {
        mostrarMensajeInasistencias(
            "Ya existe una inasistencia que coincide con ese período.",
            "error"
        );
        return;
    }

    let documentoGuardado = null;

    try {
        if (archivo) {
            documentoGuardado = await guardarDocumento(archivo);
            nuevaInasistencia.documento = documentoGuardado;
        }

        if (!guardarInasistencias([...inasistencias, nuevaInasistencia])) {
            if (documentoGuardado) {
                await eliminarDocumento(documentoGuardado.id);
            }

            throw new Error("No fue posible guardar la inasistencia.");
        }

        evento.target.reset();
        actualizarVisibilidadHorarioInasistencia();
        mostrarInasistencias();
        mostrarMensajeInasistencias(
            "Inasistencia guardada correctamente.",
            "exito"
        );
    } catch (error) {
        console.error(error);
        mostrarMensajeInasistencias(error.message, "error");
    }
}

function validarDocumentoInasistencia(archivo) {
    const tiposPermitidos = [
        "application/pdf",
        "image/png",
        "image/jpeg"
    ];
    const extensionValida = /\.(pdf|png|jpe?g)$/i.test(archivo.name);

    if (
        !tiposPermitidos.includes(archivo.type) &&
        !extensionValida
    ) {
        mostrarMensajeInasistencias(
            "El documento debe ser PDF, JPG o PNG.",
            "error"
        );
        return false;
    }

    if (archivo.size > TAMANO_MAXIMO_DOCUMENTO) {
        mostrarMensajeInasistencias(
            "El documento no puede superar los 5 MB.",
            "error"
        );
        return false;
    }

    return true;
}

function existeInasistenciaSolapada(nueva, existentes) {
    return existentes.some((registro) => {
        if (registro.operarioId !== nueva.operarioId) {
            return false;
        }

        const fechasSeCruzan =
            nueva.fechaDesde <= registro.fechaHasta &&
            nueva.fechaHasta >= registro.fechaDesde;

        if (!fechasSeCruzan) {
            return false;
        }

        if (
            nueva.duracion === "parcial" &&
            registro.duracion === "parcial" &&
            nueva.fechaDesde === registro.fechaDesde
        ) {
            return nueva.horaDesde < registro.horaHasta &&
                nueva.horaHasta > registro.horaDesde;
        }

        return true;
    });
}

function obtenerInasistenciasVisibles() {
    const inasistencias = obtenerInasistencias();

    if (esAdministrador()) {
        return inasistencias;
    }

    const usuario = obtenerUsuarioActual();

    if (!usuario || !usuario.operarioId) {
        return [];
    }

    return inasistencias.filter((registro) => {
        return registro.operarioId === usuario.operarioId;
    });
}

function mostrarInasistencias() {
    const tabla = document.getElementById("tabla-inasistencias");

    if (!tabla) {
        return;
    }

    const operarios = obtenerOperarios();
    const filtroOperario = valorControl("filtro-operario-inasistencias");
    const filtroOperativa = valorControl(
        "filtro-operativa-inasistencias",
        TODAS_LAS_OPERATIVAS
    );
    const filtroMotivo = valorControl(
        "filtro-motivo-inasistencias",
        TODOS_LOS_MOTIVOS
    );
    const filtroDesde = valorControl("filtro-desde-inasistencias");
    const filtroHasta = valorControl("filtro-hasta-inasistencias");
    const filtradas = obtenerInasistenciasVisibles()
        .filter((registro) => {
            const operario = operarios.find((item) => {
                return item.id === registro.operarioId;
            });

            if (filtroOperario && registro.operarioId !== filtroOperario) {
                return false;
            }

            if (
                filtroOperativa !== TODAS_LAS_OPERATIVAS &&
                normalizarOperativa(operario?.operativa) !== filtroOperativa
            ) {
                return false;
            }

            if (
                filtroMotivo !== TODOS_LOS_MOTIVOS &&
                registro.motivo !== filtroMotivo
            ) {
                return false;
            }

            if (filtroDesde && registro.fechaHasta < filtroDesde) {
                return false;
            }

            if (filtroHasta && registro.fechaDesde > filtroHasta) {
                return false;
            }

            return true;
        })
        .sort((a, b) => {
            return `${b.fechaDesde}${b.fechaRegistro || ""}`
                .localeCompare(`${a.fechaDesde}${a.fechaRegistro || ""}`);
        });

    tabla.innerHTML = "";
    actualizarResumenInasistencias(filtradas);

    const detalle = document.getElementById(
        "resultado-filtro-inasistencias"
    );

    if (detalle) {
        const palabra = filtradas.length === 1 ? "registro" : "registros";
        detalle.textContent = `${filtradas.length} ${palabra}`;
    }

    if (filtradas.length === 0) {
        agregarFilaVacia(tabla, 8, "No hay inasistencias para mostrar.");
        return;
    }

    filtradas.forEach((registro) => {
        const operario = operarios.find((item) => {
            return item.id === registro.operarioId;
        });
        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(
            operario
                ? `${operario.legajo} - ${operario.nombre}`
                : "Operario no disponible"
        ));
        fila.appendChild(crearCelda(
            normalizarOperativa(operario?.operativa)
        ));
        fila.appendChild(crearCelda(formatearPeriodoInasistencia(registro)));
        fila.appendChild(crearCelda(formatearDuracionInasistencia(registro)));
        fila.appendChild(crearCelda(registro.motivo || "Sin motivo"));
        fila.appendChild(crearCelda(registro.detalle || "—"));
        fila.appendChild(crearCeldaDocumentoInasistencia(registro));
        fila.appendChild(crearCeldaAccionesInasistencia(registro));
        tabla.appendChild(fila);
    });
}

function valorControl(id, valorPredeterminado = "") {
    const control = document.getElementById(id);
    return control ? control.value : valorPredeterminado;
}

function actualizarResumenInasistencias(registros) {
    const certificaciones = registros.filter((registro) => {
        return registro.motivo === MOTIVO_CERTIFICACION;
    });
    const pendientes = certificaciones.filter((registro) => {
        return !registro.documento;
    });

    actualizarTexto("total-registros-inasistencias", registros.length);
    actualizarTexto("total-certificaciones", certificaciones.length);
    actualizarTexto("total-documentos-pendientes", pendientes.length);
}

function formatearPeriodoInasistencia(registro) {
    const desde = formatearFechaLocal(registro.fechaDesde);
    const hasta = formatearFechaLocal(registro.fechaHasta);
    return registro.fechaDesde === registro.fechaHasta
        ? desde
        : `${desde} al ${hasta}`;
}

function formatearFechaLocal(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-UY");
}

function formatearDuracionInasistencia(registro) {
    if (registro.duracion === "parcial") {
        return `${registro.horaDesde} a ${registro.horaHasta}`;
    }

    const dias = calcularDiasCalendario(
        registro.fechaDesde,
        registro.fechaHasta
    );
    return dias === 1 ? "Jornada completa" : `${dias} días`;
}

function calcularDiasCalendario(desde, hasta) {
    const fechaDesde = new Date(`${desde}T00:00:00`);
    const fechaHasta = new Date(`${hasta}T00:00:00`);
    return Math.round((fechaHasta - fechaDesde) / 86400000) + 1;
}

function crearCeldaDocumentoInasistencia(registro) {
    const celda = document.createElement("td");

    if (registro.documento) {
        const insignia = document.createElement("span");
        const boton = document.createElement("button");
        insignia.className = "insignia documento-adjunto";
        insignia.textContent = "Adjunto";
        boton.type = "button";
        boton.className = "boton-enlace";
        boton.textContent = "Descargar";
        boton.dataset.descargarDocumento = registro.documento.id;
        celda.append(insignia, " ", boton);
        return celda;
    }

    if (registro.motivo === MOTIVO_CERTIFICACION) {
        const insignia = document.createElement("span");
        insignia.className = "insignia advertencia";
        insignia.textContent = "Pendiente";
        celda.appendChild(insignia);
        return celda;
    }

    celda.textContent = "No aplica";
    return celda;
}

function crearCeldaAccionesInasistencia(registro) {
    const celda = document.createElement("td");

    if (!esAdministrador()) {
        celda.textContent = "Solo lectura";
        return celda;
    }

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-eliminar";
    boton.textContent = "Eliminar";
    boton.dataset.eliminarInasistencia = registro.id;
    celda.appendChild(boton);
    return celda;
}

async function descargarDocumentoInasistencia(documentoId) {
    try {
        const documento = await obtenerDocumento(documentoId);

        if (!documento) {
            throw new Error("El documento ya no está disponible.");
        }

        const url = URL.createObjectURL(documento.archivo);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = documento.nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function eliminarInasistencia(inasistenciaId) {
    if (!esAdministrador()) {
        return;
    }

    if (!confirm("¿Querés eliminar esta inasistencia y su documento?")) {
        return;
    }

    const inasistencias = obtenerInasistencias();
    const registro = inasistencias.find((item) => {
        return item.id === inasistenciaId;
    });

    if (!registro) {
        return;
    }

    const actualizadas = inasistencias.filter((item) => {
        return item.id !== inasistenciaId;
    });

    if (!guardarInasistencias(actualizadas)) {
        mostrarMensajeInasistencias(
            "No fue posible eliminar la inasistencia.",
            "error"
        );
        return;
    }

    try {
        if (registro.documento) {
            await eliminarDocumento(registro.documento.id);
        }
    } catch (error) {
        console.error("No fue posible eliminar el documento:", error);
    }

    mostrarInasistencias();
    mostrarMensajeInasistencias(
        "Inasistencia eliminada correctamente.",
        "exito"
    );
}

function cargarOpcionesOperativas(selector) {
    if (!selector) {
        return;
    }

    agregarOpcionesOperativasAgrupadas(selector);
}

function cargarOpcionesFiltroOperativas(selector) {
    if (!selector) {
        return;
    }

    agregarOpcion(selector, TODAS_LAS_OPERATIVAS, "Todas las operativas");
    agregarOpcion(selector, SIN_OPERATIVA, SIN_OPERATIVA);
    agregarOpcionesOperativasAgrupadas(selector);
}

function agregarOpcion(selector, valor, texto) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = texto;
    selector.appendChild(opcion);
}

function normalizarOperativa(operativa) {
    return OPERATIVAS.includes(operativa)
        ? operativa
        : SIN_OPERATIVA;
}

function filtrarPorOperativa(operarios, operativaSeleccionada) {
    if (
        !operativaSeleccionada ||
        operativaSeleccionada === TODAS_LAS_OPERATIVAS
    ) {
        return operarios;
    }

    return operarios.filter((operario) => {
        return normalizarOperativa(operario.operativa) ===
            operativaSeleccionada;
    });
}

function actualizarDetalleFiltroOperarios(operativa, cantidad) {
    const detalle = document.getElementById(
        "resultado-filtro-operarios"
    );

    if (detalle) {
        detalle.textContent = obtenerTextoFiltro(operativa, cantidad);
    }
}

function obtenerTextoFiltro(operativa, cantidad) {
    const descripcion = operativa === TODAS_LAS_OPERATIVAS
        ? "Todas las operativas"
        : operativa;
    const palabra = cantidad === 1 ? "operario" : "operarios";
    return `${descripcion}: ${cantidad} ${palabra}`;
}

function crearCelda(contenido) {
    const celda = document.createElement("td");
    celda.textContent = contenido;
    return celda;
}

function agregarFilaVacia(tabla, columnas, texto) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = columnas;
    celda.textContent = texto;
    fila.appendChild(celda);
    tabla.appendChild(fila);
}

function generarId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mostrarMensajeOperarios(texto, tipo) {
    mostrarMensajeTemporal("mensaje-operarios", texto, tipo);
}

function mostrarMensajeUsuarios(texto, tipo) {
    mostrarMensajeTemporal("mensaje-usuarios", texto, tipo);
}

function mostrarMensajeInasistencias(texto, tipo) {
    mostrarMensajeTemporal("mensaje-inasistencias", texto, tipo);
}

function mostrarMensajeTemporal(id, texto, tipo) {
    const mensaje = document.getElementById(id);

    if (!mensaje) {
        return;
    }

    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;

    setTimeout(() => {
        if (mensaje.isConnected) {
            mensaje.textContent = "";
            mensaje.className = "mensaje";
        }
    }, 4000);
}
