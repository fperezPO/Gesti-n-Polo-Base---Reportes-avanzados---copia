(() => {
    "use strict";

    const MINUTOS_ALARMA_ANTIPERDIDA = 30;
    const MINUTOS_TOLERANCIA_TRACE = 10;
    let intervaloPanel = null;
    let intervaloSincronizacion = null;
    let sincronizacionEnCurso = false;
    let dispositivosServidor = [];
    let registrosFiltradosActuales = [];

    function elemento(id) {
        return document.getElementById(id);
    }

    function normalizarTexto(valor) {
        return String(valor ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function obtenerRegistros() {
        const registros = typeof obtenerTareasActivas === "function"
            ? obtenerTareasActivas()
            : [];
        return Array.isArray(registros) ? registros : [];
    }

    function guardarRegistros(registros) {
        const guardado = typeof guardarTareasActivas === "function" &&
            guardarTareasActivas(registros);
        if (guardado) enviarRegistrosServidor(registros);
        return guardado;
    }

    /*
     * Los registros de demostración (esDatoDemo, datos-demo-tareas-activas.js)
     * quedan solo en este navegador: no se envían al servidor, así no llegan a
     * los handhelds Android, y la sincronización los conserva.
     */
    function esRegistroDemo(registro) {
        return Boolean(registro?.esDatoDemo);
    }

    async function enviarRegistrosServidor(registros) {
        if (typeof location === "undefined") return false;
        const reales = registros.filter((registro) => !esRegistroDemo(registro));
        try {
            const respuesta = await fetch("api/tareas-activas", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: typeof jsonAscii === "function"
                    ? jsonAscii(reales)
                    : JSON.stringify(reales)
            });
            return respuesta.ok;
        } catch (error) {
            console.warn("No fue posible sincronizar la actividad.", error);
            return false;
        }
    }

    async function sincronizarRegistrosServidor() {
        if (typeof location === "undefined") return;
        if (sincronizacionEnCurso) return;
        sincronizacionEnCurso = true;
        try {
            const [respuesta, respuestaDispositivos] = await Promise.all([
                fetch("api/tareas-activas", { cache: "no-store" }),
                fetch("api/dispositivos", { cache: "no-store" })
            ]);
            if (!respuesta.ok) return;
            const remotos = await respuesta.json();
            if (!Array.isArray(remotos)) return;
            if (respuestaDispositivos.ok) {
                const dispositivos = await respuestaDispositivos.json();
                dispositivosServidor = Array.isArray(dispositivos)
                    ? dispositivos
                    : [];
            }
            const locales = obtenerRegistros();
            const localesReales = locales.filter((registro) => !esRegistroDemo(registro));
            if (remotos.length === 0 && localesReales.length > 0) {
                await enviarRegistrosServidor(localesReales);
                return;
            }
            if (JSON.stringify(remotos) !== JSON.stringify(localesReales)) {
                guardarTareasActivas([...remotos, ...locales.filter(esRegistroDemo)]);
                if (elemento("tabla-tareas-activas")) renderizarPanel();
            }
        } catch (error) {
            console.warn("El servicio de actividad no está disponible.", error);
        } finally {
            sincronizacionEnCurso = false;
        }
    }

    function datosUsuario(usuario) {
        const operario = usuario?.operarioId && typeof obtenerOperarios === "function"
            ? obtenerOperarios().find((item) => item.id === usuario.operarioId)
            : null;

        return {
            nombre: operario?.nombre || usuario?.nombre || "Usuario",
            usuario: usuario?.nombreUsuario || "sin-usuario",
            operarioId: operario?.id || usuario?.operarioId || null,
            operativa: operario?.operativa || "Sin asignar"
        };
    }

    function obtenerRegistroAbierto(usuarioId, registros = obtenerRegistros()) {
        return registros
            .filter((registro) => {
                return registro.usuarioId === usuarioId &&
                    registro.estado !== "finalizada";
            })
            .sort((a, b) => {
                return new Date(b.inicio).getTime() -
                    new Date(a.inicio).getTime();
            })[0] || null;
    }

    function segundosEntre(inicio, fin = new Date()) {
        const comienzo = new Date(inicio).getTime();
        const cierre = fin instanceof Date ? fin.getTime() : new Date(fin).getTime();

        if (!Number.isFinite(comienzo) || !Number.isFinite(cierre)) {
            return 0;
        }

        return Math.max(0, Math.floor((cierre - comienzo) / 1000));
    }

    function obtenerTiempoRegistro(registro, ahora = new Date()) {
        const acumulado = Number(registro?.tiempoAcumulado) || 0;

        if (!registro || registro.estado !== "activa" || !registro.ultimoInicio) {
            return acumulado;
        }

        return acumulado + segundosEntre(registro.ultimoInicio, ahora);
    }

    function obtenerCantidadPausas(registro) {
        if (Number.isFinite(Number(registro?.cantidadPausas))) {
            return Math.max(0, Number(registro.cantidadPausas));
        }

        const periodos = Array.isArray(registro?.periodos)
            ? registro.periodos.length
            : 0;
        return Math.max(0, periodos - 1);
    }

    function normalizarBateria(valor) {
        const bateria = Number(valor);
        return Number.isFinite(bateria)
            ? Math.min(100, Math.max(0, Math.round(bateria)))
            : 100;
    }

    function estadoAlarma(registro, ahora = new Date()) {
        if (registro?.alarmaAntiperdida === false) {
            return "desactivada";
        }

        const ultimoMovimiento = registro?.ultimoMovimiento ||
            registro?.actualizadoEn || registro?.inicio;
        return segundosEntre(ultimoMovimiento, ahora) >=
            MINUTOS_ALARMA_ANTIPERDIDA * 60
            ? "alerta"
            : "protegido";
    }

    function cerrarPeriodoActual(registro, ahora) {
        const periodos = Array.isArray(registro.periodos)
            ? registro.periodos.map((periodo) => ({ ...periodo }))
            : [];
        const periodoAbierto = [...periodos]
            .reverse()
            .find((periodo) => !periodo.fin);

        if (periodoAbierto) {
            periodoAbierto.fin = ahora;
        }

        return periodos;
    }

    function crearRegistro(usuario, configuracion) {
        const ahora = new Date().toISOString();
        const datos = datosUsuario(usuario);

        return {
            id: typeof generarId === "function"
                ? generarId()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            usuarioId: usuario.id,
            operarioId: datos.operarioId,
            funcionario: datos.nombre,
            nombreUsuario: datos.usuario,
            operativa: datos.operativa,
            colector: configuracion.colector,
            actividadCodigo: configuracion.actividadCodigo,
            actividad: configuracion.actividad,
            estado: "activa",
            inicio: ahora,
            ultimoInicio: ahora,
            tiempoAcumulado: 0,
            cantidadPausas: 0,
            periodos: [{ inicio: ahora, fin: null }],
            bateria: normalizarBateria(configuracion.bateria),
            alarmaAntiperdida: true,
            ultimoMovimiento: ahora,
            actualizadoEn: ahora,
            final: null
        };
    }

    function alternarRegistro(usuario, configuracion = {}) {
        if (!usuario) {
            return null;
        }

        const registros = obtenerRegistros();
        const existente = obtenerRegistroAbierto(usuario.id, registros);
        const ahora = new Date().toISOString();
        let actualizado;

        if (!existente) {
            const colector = String(configuracion.colector || "").trim();
            const actividadCodigo = String(
                configuracion.actividadCodigo || ""
            ).trim().toUpperCase();
            const actividad = String(configuracion.actividad || "").trim();

            if (!colector) {
                throw new Error("Indicá el colector para comenzar.");
            }

            if (!actividadCodigo || !actividad) {
                throw new Error("Seleccioná la actividad que vas a realizar.");
            }

            actualizado = crearRegistro(usuario, {
                colector,
                actividadCodigo,
                actividad,
                bateria: configuracion.bateria
            });
            registros.push(actualizado);
        } else {
            const indice = registros.findIndex((item) => item.id === existente.id);
            actualizado = { ...existente };

            if (existente.estado === "activa") {
                actualizado.tiempoAcumulado = obtenerTiempoRegistro(existente);
                actualizado.estado = "pausada";
                actualizado.cantidadPausas = obtenerCantidadPausas(existente) + 1;
                actualizado.periodos = cerrarPeriodoActual(existente, ahora);
                actualizado.ultimoInicio = null;
            } else {
                actualizado.estado = "activa";
                actualizado.ultimoInicio = ahora;
                actualizado.periodos = [
                    ...(Array.isArray(existente.periodos) ? existente.periodos : []),
                    { inicio: ahora, fin: null }
                ];
            }

            actualizado.bateria = normalizarBateria(
                configuracion.bateria ?? existente.bateria
            );
            actualizado.ultimoMovimiento = configuracion.ultimoMovimiento ||
                existente.ultimoMovimiento || ahora;
            actualizado.actualizadoEn = ahora;
            registros[indice] = actualizado;
        }

        if (!guardarRegistros(registros)) {
            throw new Error("No fue posible guardar la actividad.");
        }

        return actualizado;
    }

    function finalizarRegistro(usuarioId) {
        const registros = obtenerRegistros();
        const registro = obtenerRegistroAbierto(usuarioId, registros);

        if (!registro) {
            return null;
        }

        const ahora = new Date().toISOString();
        const indice = registros.findIndex((item) => item.id === registro.id);
        const actualizado = {
            ...registro,
            estado: "finalizada",
            tiempoAcumulado: obtenerTiempoRegistro(registro),
            cantidadPausas: obtenerCantidadPausas(registro),
            ultimoInicio: null,
            periodos: cerrarPeriodoActual(registro, ahora),
            actualizadoEn: ahora,
            final: ahora
        };
        registros[indice] = actualizado;

        if (!guardarRegistros(registros)) {
            throw new Error("No fue posible finalizar la actividad.");
        }

        return actualizado;
    }

    function actualizarDispositivo(usuarioId, cambios = {}) {
        const registros = obtenerRegistros();
        const registro = obtenerRegistroAbierto(usuarioId, registros);

        if (!registro) {
            return null;
        }

        const indice = registros.findIndex((item) => item.id === registro.id);
        const actualizado = {
            ...registro,
            bateria: normalizarBateria(cambios.bateria ?? registro.bateria),
            ultimoMovimiento: cambios.ultimoMovimiento ||
                registro.ultimoMovimiento || registro.inicio,
            alarmaAntiperdida: cambios.alarmaAntiperdida !== false,
            actualizadoEn: new Date().toISOString()
        };
        registros[indice] = actualizado;
        guardarRegistros(registros);
        return actualizado;
    }

    function formatearTiempo(segundos) {
        const total = Math.max(0, Math.floor(Number(segundos) || 0));
        const horas = Math.floor(total / 3600);
        const minutos = Math.floor((total % 3600) / 60);
        const segundosRestantes = total % 60;

        return [horas, minutos, segundosRestantes]
            .map((valor) => String(valor).padStart(2, "0"))
            .join(":");
    }

    function normalizarIdentificador(valor) {
        return normalizarTexto(valor).replace(/[^a-z0-9]+/g, "");
    }

    function obtenerPeriodosRegistro(registro, ahora = new Date()) {
        const periodos = Array.isArray(registro?.periodos)
            ? registro.periodos
            : [{ inicio: registro?.inicio, fin: registro?.final }];

        return periodos.map((periodo, indice) => {
            const inicio = new Date(periodo?.inicio).getTime();
            const finTexto = periodo?.fin || registro?.final ||
                (registro?.estado === "activa" ? ahora.toISOString() : null);
            const fin = new Date(finTexto).getTime();
            return {
                id: `${registro.id || "registro"}-${indice}`,
                registro,
                inicio,
                fin
            };
        }).filter((periodo) => {
            return Number.isFinite(periodo.inicio) &&
                Number.isFinite(periodo.fin) && periodo.fin >= periodo.inicio;
        });
    }

    function coincideActividadTrace(registro, fila) {
        const codigoRegistro = normalizarIdentificador(
            registro.actividadCodigo || registro.aplicacion
        );
        const codigoTrace = normalizarIdentificador(fila.aplicacion);

        if (codigoRegistro && codigoRegistro === codigoTrace) {
            return true;
        }

        const actividadRegistro = normalizarIdentificador(registro.actividad);
        const actividadTrace = normalizarIdentificador(
            fila.actividadLogistica || fila.actividad
        );
        return Boolean(
            actividadRegistro && actividadTrace &&
            actividadRegistro === actividadTrace
        );
    }

    function calcularProductividadTrace(filas = [], opciones = {}) {
        const ahora = opciones.ahora instanceof Date
            ? opciones.ahora
            : new Date();
        const toleranciaMs = MINUTOS_TOLERANCIA_TRACE * 60 * 1000;
        const desdeMs = opciones.desde
            ? new Date(`${opciones.desde}T00:00:00`).getTime()
            : Number.NEGATIVE_INFINITY;
        const hastaMs = opciones.hasta
            ? new Date(`${opciones.hasta}T23:59:59.999`).getTime()
            : Number.POSITIVE_INFINITY;
        const movimientos = filas.map((fila, indice) => ({
            fila,
            indice,
            instante: new Date(fila.fechaHora).getTime(),
            usuario: normalizarTexto(fila.usuario),
            unidades: Math.abs(Number(
                fila.cantidadUnidades ?? fila.cantidad ?? fila.movimiento ?? 0
            ) || 0)
        })).filter((movimiento) => {
            return movimiento.usuario && Number.isFinite(movimiento.instante);
        });
        // Movimientos de cada usuario en orden de hora: cada período solo
        // revisa los de su usuario.
        const movimientosPorUsuario = new Map();
        movimientos.forEach((movimiento) => {
            if (!movimientosPorUsuario.has(movimiento.usuario)) {
                movimientosPorUsuario.set(movimiento.usuario, []);
            }
            movimientosPorUsuario.get(movimiento.usuario).push(movimiento);
        });
        movimientosPorUsuario.forEach((lista) => {
            lista.sort((a, b) => a.instante - b.instante);
        });
        const periodos = obtenerRegistros().flatMap((registro) => {
            const usuario = normalizarTexto(registro.nombreUsuario);
            if (!usuario || !registro.actividadCodigo && !registro.actividad) {
                return [];
            }
            return obtenerPeriodosRegistro(registro, ahora).map((periodo) => ({
                ...periodo,
                usuario,
                inicioRecortado: Math.max(periodo.inicio, desdeMs),
                finRecortado: Math.min(periodo.fin, hastaMs)
            })).filter((periodo) => periodo.finRecortado >= periodo.inicioRecortado);
        });
        const vinculos = new Map();
        const vinculosPorFila = new WeakMap();
        const porUsuario = new Map();
        let segundosProductivos = 0;
        let unidadesVinculadas = 0;

        periodos.forEach((periodo) => {
            const candidatos = (movimientosPorUsuario.get(periodo.usuario) || [])
                .filter((movimiento) => {
                    return !vinculos.has(movimiento.indice) &&
                        movimiento.instante >= periodo.inicioRecortado &&
                        movimiento.instante <= periodo.finRecortado &&
                        coincideActividadTrace(periodo.registro, movimiento.fila);
                });

            if (!candidatos.length) return;

            const primero = candidatos[0];
            const inicioProductivo = primero.instante - periodo.inicio <= toleranciaMs
                ? periodo.inicioRecortado
                : Math.max(primero.instante, periodo.inicioRecortado);
            const segundos = Math.max(
                0,
                Math.floor((periodo.finRecortado - inicioProductivo) / 1000)
            );
            segundosProductivos += segundos;

            const resumenUsuario = porUsuario.get(periodo.usuario) || {
                usuario: periodo.usuario,
                segundosProductivos: 0,
                unidadesVinculadas: 0,
                filasVinculadas: 0
            };
            resumenUsuario.segundosProductivos += segundos;

            candidatos.forEach((movimiento) => {
                const vinculo = {
                    registroId: periodo.registro.id,
                    actividadCodigo: periodo.registro.actividadCodigo || "",
                    actividad: periodo.registro.actividad || "",
                    inicioRegistrado: new Date(periodo.inicio).toISOString(),
                    inicioProductivo: new Date(inicioProductivo).toISOString(),
                    minutosHastaPrimerMovimiento: Math.max(
                        0,
                        Math.round((primero.instante - periodo.inicio) / 60000)
                    )
                };
                vinculos.set(movimiento.indice, vinculo);
                if (movimiento.fila && typeof movimiento.fila === "object") {
                    vinculosPorFila.set(movimiento.fila, vinculo);
                }
                unidadesVinculadas += movimiento.unidades;
                resumenUsuario.unidadesVinculadas += movimiento.unidades;
                resumenUsuario.filasVinculadas += 1;
            });
            porUsuario.set(periodo.usuario, resumenUsuario);
        });

        porUsuario.forEach((resumen) => {
            const horas = resumen.segundosProductivos / 3600;
            resumen.productividad = horas > 0
                ? resumen.unidadesVinculadas / horas
                : null;
        });

        return {
            toleranciaMinutos: MINUTOS_TOLERANCIA_TRACE,
            segundosProductivos,
            horasProductivas: segundosProductivos / 3600,
            unidadesVinculadas,
            filasVinculadas: vinculos.size,
            productividad: segundosProductivos > 0
                ? unidadesVinculadas / (segundosProductivos / 3600)
                : null,
            vinculos,
            vinculosPorFila,
            porUsuario
        };
    }

    function fechaInputLocal(valor) {
        const fecha = valor instanceof Date ? valor : new Date(valor);
        if (Number.isNaN(fecha.getTime())) return "";
        const ano = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const dia = String(fecha.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    }

    function formatearFecha(valor) {
        const fecha = new Date(valor);
        return Number.isNaN(fecha.getTime())
            ? "—"
            : new Intl.DateTimeFormat("es-UY", { dateStyle: "short" })
                .format(fecha);
    }

    function formatearFechaHora(valor) {
        const fecha = new Date(valor);
        return Number.isNaN(fecha.getTime())
            ? "—"
            : new Intl.DateTimeFormat("es-UY", {
                dateStyle: "short",
                timeStyle: "medium"
            }).format(fecha);
    }

    function estadoLegible(estado) {
        return {
            activa: "En operación",
            pausada: "Pausada",
            finalizada: "Finalizada"
        }[estado] || "Sin actividad";
    }

    function registrosVisibles() {
        const usuario = obtenerUsuarioActual();
        const registros = obtenerRegistros();
        if (!usuario) return [];
        return esAdministrador()
            ? registros
            : registros.filter((registro) => registro.usuarioId === usuario.id);
    }

    function filtrarRegistros(registros) {
        const desde = elemento("filtro-desde-tareas")?.value || "";
        const hasta = elemento("filtro-hasta-tareas")?.value || "";
        const funcionario = normalizarTexto(
            elemento("filtro-funcionario-tareas")?.value
        );
        const consulta = normalizarTexto(
            elemento("filtro-consulta-tareas")?.value
        );

        return registros.filter((registro) => {
            const dia = fechaInputLocal(registro.inicio);
            const textoFuncionario = normalizarTexto(
                `${registro.funcionario} ${registro.nombreUsuario}`
            );
            const textoConsulta = normalizarTexto([
                estadoLegible(registro.estado),
                registro.colector,
                registro.operativa,
                registro.actividad,
                registro.actividadCodigo
            ].join(" "));

            return (!desde || dia >= desde) &&
                (!hasta || dia <= hasta) &&
                (!funcionario || textoFuncionario.includes(funcionario)) &&
                (!consulta || textoConsulta.includes(consulta));
        });
    }

    function crearCelda(texto, clase = "") {
        const celda = document.createElement("td");
        celda.textContent = texto;
        if (clase) celda.className = clase;
        return celda;
    }

    function crearInsignia(texto, clase) {
        const insignia = document.createElement("span");
        insignia.className = clase;
        insignia.textContent = texto;
        return insignia;
    }

    function crearCeldaEstado(registro) {
        const celda = document.createElement("td");
        celda.appendChild(crearInsignia(
            estadoLegible(registro.estado),
            `estado-registro-tarea estado-${registro.estado}`
        ));
        return celda;
    }

    function mostrarMensajePanel(texto, tipo = "") {
        const mensaje = elemento("mensaje-panel-tareas");
        if (!mensaje) return;
        mensaje.textContent = texto;
        mensaje.className = tipo ? `mensaje ${tipo}` : "mensaje";
    }

    function eliminarRegistro(id) {
        if (!esAdministrador()) return;
        if (!window.confirm("¿Querés eliminar este registro?")) return;

        if (guardarRegistros(
            obtenerRegistros().filter((registro) => registro.id !== id)
        )) {
            mostrarMensajePanel("Registro eliminado.", "exito");
            renderizarPanel();
        }
    }

    function crearCeldaAcciones(registro) {
        const celda = document.createElement("td");
        if (!esAdministrador()) {
            celda.textContent = "Consulta";
            return celda;
        }

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton-eliminar boton-compacto-tareas";
        boton.textContent = "Eliminar";
        boton.addEventListener("click", () => eliminarRegistro(registro.id));
        celda.appendChild(boton);
        return celda;
    }

    function renderizarResumen(visibles) {
        const abiertos = visibles.filter((item) => item.estado !== "finalizada");
        const activos = abiertos.filter((item) => item.estado === "activa").length;
        const pausados = abiertos.filter((item) => item.estado === "pausada").length;
        const usuariosActivos = typeof obtenerUsuarios === "function"
            ? obtenerUsuarios().filter((usuario) => usuario.activo).length
            : 0;
        const usuariosOcupados = new Set(abiertos.map((item) => item.usuarioId)).size;
        const disponibles = Math.max(0, usuariosActivos - usuariosOcupados);
        const limiteConexion = Date.now() - 2 * 60 * 1000;
        const dispositivosConectados = dispositivosServidor.filter((item) => {
            const actualizado = new Date(item.actualizadoEn).getTime();
            return item.conectado !== false && Number.isFinite(actualizado) &&
                actualizado >= limiteConexion;
        });
        const alarmas = dispositivosConectados.length
            ? dispositivosConectados.filter((item) => item.alarmaActiva === true)
            : abiertos.filter((item) => estadoAlarma(item) === "alerta");
        const bateriasBajas = dispositivosConectados.length
            ? dispositivosConectados.filter((item) => normalizarBateria(item.bateria) <= 20)
            : abiertos.filter((item) => normalizarBateria(item.bateria) <= 20);

        elemento("handhelds-activos").textContent = activos;
        elemento("handhelds-pausados").textContent = pausados;
        elemento("handhelds-disponibles").textContent = disponibles;
        const indicadorAlarma = elemento("estado-alarma-general");
        const tarjetaAlarma = elemento("tarjeta-alarma-general");
        indicadorAlarma.textContent = alarmas.length ? "Alarma activa" : "Sin incidencias";
        tarjetaAlarma.classList.toggle("con-incidencia", alarmas.length > 0);
        const indicadorBateria = elemento("estado-bateria-general");
        const tarjetaBateria = elemento("tarjeta-bateria-general");
        indicadorBateria.textContent = bateriasBajas.length
            ? "Batería baja"
            : "Sin incidencias";
        tarjetaBateria.classList.toggle("con-incidencia", bateriasBajas.length > 0);
        elemento("actualizacion-tareas-activas").textContent =
            `Actualizado ${new Date().toLocaleTimeString("es-UY", {
                hour: "2-digit",
                minute: "2-digit"
            })}`;
    }

    function renderizarTabla() {
        const cuerpo = elemento("tabla-tareas-activas");
        if (!cuerpo) return;

        const visibles = registrosVisibles();
        const filtrados = filtrarRegistros(visibles).sort((a, b) => {
            return new Date(b.inicio).getTime() - new Date(a.inicio).getTime();
        });
        registrosFiltradosActuales = filtrados;
        cuerpo.innerHTML = "";

        filtrados.forEach((registro) => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(formatearFecha(registro.inicio)),
                crearCelda(
                    `${registro.funcionario}\n@${registro.nombreUsuario}`,
                    "funcionario-registro-tarea"
                ),
                crearCelda(
                    `${registro.actividad || "Sin actividad"}` +
                    (registro.actividadCodigo
                        ? `\n${registro.actividadCodigo}`
                        : "")
                ),
                crearCeldaEstado(registro),
                crearCelda(
                    formatearTiempo(obtenerTiempoRegistro(registro)),
                    "tiempo-registro-tarea"
                ),
                crearCelda(obtenerCantidadPausas(registro)),
                crearCelda(registro.colector),
                crearCeldaAcciones(registro)
            );
            cuerpo.appendChild(fila);
        });

        elemento("resumen-listado-tareas").textContent =
            `${filtrados.length} de ${visibles.length} registros`;
        elemento("sin-tareas-activas").hidden = filtrados.length > 0;
        renderizarResumen(visibles);
    }

    function renderizarPanel() {
        renderizarTabla();
    }

    function quitarFiltros() {
        [
            "filtro-desde-tareas",
            "filtro-hasta-tareas",
            "filtro-funcionario-tareas",
            "filtro-consulta-tareas"
        ].forEach((id) => {
            const control = elemento(id);
            if (control) control.value = "";
        });
        renderizarTabla();
    }

    function filasExportacionResumen(registros) {
        return [[
            "Fecha", "Funcionario", "Usuario", "Operativa", "Actividad",
            "Código de actividad",
            "Estado", "Tiempo total", "Segundos activos", "Pausas",
            "Colector"
        ], ...registros.map((registro) => [
            fechaInputLocal(registro.inicio),
            registro.funcionario,
            registro.nombreUsuario,
            registro.operativa,
            registro.actividad || "",
            registro.actividadCodigo || "",
            estadoLegible(registro.estado),
            formatearTiempo(obtenerTiempoRegistro(registro)),
            obtenerTiempoRegistro(registro),
            obtenerCantidadPausas(registro),
            registro.colector
        ])];
    }

    function filasExportacionPeriodos(registros) {
        const filas = [[
            "ID de registro", "Fecha", "Funcionario", "Usuario",
            "Colector", "Actividad", "Código de actividad", "Período",
            "Inicio", "Fin", "Duración",
            "Segundos activos"
        ]];
        const ahora = new Date();

        registros.forEach((registro) => {
            const periodos = Array.isArray(registro.periodos) ? registro.periodos : [];
            periodos.forEach((periodo, indice) => {
                const fin = periodo.fin ||
                    (registro.estado === "activa" ? ahora.toISOString() : registro.final);
                const segundos = fin ? segundosEntre(periodo.inicio, fin) : 0;
                filas.push([
                    registro.id,
                    fechaInputLocal(registro.inicio),
                    registro.funcionario,
                    registro.nombreUsuario,
                    registro.colector,
                    registro.actividad || "",
                    registro.actividadCodigo || "",
                    indice + 1,
                    formatearFechaHora(periodo.inicio),
                    fin ? formatearFechaHora(fin) : "Abierto",
                    formatearTiempo(segundos),
                    segundos
                ]);
            });
        });
        return filas;
    }

    window.PoloOesteTareas = {
        obtenerRegistros,
        obtenerRegistroAbierto,
        obtenerTiempoRegistro,
        obtenerCantidadPausas,
        normalizarBateria,
        estadoAlarma,
        formatearTiempo,
        datosUsuario,
        alternarRegistro,
        finalizarRegistro,
        actualizarDispositivo,
        sincronizarRegistrosServidor,
        calcularProductividadTrace,
        renderizarPanel: () => {
            if (elemento("tabla-tareas-activas")) renderizarPanel();
        },
        minutosToleranciaTrace: MINUTOS_TOLERANCIA_TRACE
    };

    window.obtenerHojasExportacionTareasActivas = function () {
        const registros = elemento("tabla-tareas-activas")
            ? registrosFiltradosActuales
            : registrosVisibles();
        return [
            { nombre: "Tareas filtradas", filas: filasExportacionResumen(registros) },
            { nombre: "Periodos activos", filas: filasExportacionPeriodos(registros) }
        ];
    };

    window.inicializarTareasActivas = function () {
        if (!obtenerUsuarioActual() || !elemento("tabla-tareas-activas")) return;

        clearInterval(intervaloPanel);
        clearInterval(intervaloSincronizacion);
        elemento("quitar-filtros-tareas").onclick = quitarFiltros;
        ["filtro-desde-tareas", "filtro-hasta-tareas"]
            .forEach((id) => elemento(id).addEventListener("change", renderizarTabla));
        ["filtro-funcionario-tareas", "filtro-consulta-tareas"]
            .forEach((id) => elemento(id).addEventListener("input", renderizarTabla));
        elemento("alcance-listado-tareas").textContent = esAdministrador()
            ? "Vista de todos los usuarios registrados en este navegador."
            : "Vista de tus propios registros de actividad.";
        renderizarPanel();
        sincronizarRegistrosServidor();
        intervaloSincronizacion = window.setInterval(() => {
            if (!elemento("tabla-tareas-activas")) {
                clearInterval(intervaloSincronizacion);
                return;
            }
            sincronizarRegistrosServidor();
        }, 2000);
        intervaloPanel = window.setInterval(() => {
            if (!elemento("tabla-tareas-activas")) {
                clearInterval(intervaloPanel);
                return;
            }
            // Sin registros abiertos no hay tiempos que avancen: alcanza con
            // el resumen, sin volver a dibujar toda la tabla.
            if (obtenerRegistros().some((registro) => registro.estado !== "finalizada")) {
                renderizarPanel();
            } else {
                renderizarResumen(registrosVisibles());
            }
        }, 1000);
    };

    window.finalizarTareaActivaUsuarioActual = function () {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return false;
        try {
            return Boolean(finalizarRegistro(usuario.id));
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    window.addEventListener("storage", (evento) => {
        if (
            evento.key === "gestion_personal_tareas_activas" &&
            elemento("tabla-tareas-activas")
        ) {
            renderizarPanel();
        }
    });
})();
