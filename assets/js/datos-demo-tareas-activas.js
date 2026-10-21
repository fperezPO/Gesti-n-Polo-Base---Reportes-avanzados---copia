/*
 * Registros sintéticos de Tareas activas vinculados a la demo del Trace de
 * Mezzanine (datos-demo-trace-mezzanine.js). Sirven para ver la gestión de
 * horas y la productividad por operario de Inicio (Productividad por hora y
 * top de operarios), que cruza los movimientos del Trace con los períodos
 * registrados en el handheld. NO son registros reales.
 *
 * - Período: los últimos tres ciclos 21–20 (el vigente y los dos anteriores)
 *   hasta ayer, para no llenar el almacenamiento del navegador.
 * - Se arman desde los movimientos de la demo guardados en Reportes. Cada
 *   operario registra como máximo 9 horas por día: la ventana con más
 *   movimientos (la demo reparte la recepción entre los dos turnos, y sin
 *   tope un receptor quedaría con 16 horas). Dentro de esa jornada, cada
 *   bloque de trabajo es un registro con la aplicación que más usó. El
 *   bloque se corta tras 90 minutos sin movimientos; una espera de más de 28
 *   minutos dentro del bloque (el descanso del turno) queda como pausa.
 * - Al azar: el inicio se marca entre 1 y 14 minutos antes del primer
 *   movimiento (a veces fuera de la tolerancia de 10 minutos), el cierre
 *   entre 2 y 12 minutos después del último, y un 4 % de los bloques no se
 *   registra (el operario se olvidó de iniciar la tarea).
 * - Quedan solo en este navegador (esDatoDemo): tareas-activas.js no los
 *   envía al servidor, así no llegan a los handhelds Android.
 *   eliminarTareasDemo() los borra y no se vuelven a crear;
 *   regenerarTareasDemo() los arma de nuevo.
 */
(() => {
    const MARCA = "demo-tareas-mezzanine-v1";
    const CLAVE_ESTADO = "gestion_personal_demo_tareas_activas";
    const CLAVE_ESTADO_TRACE = "gestion_personal_demo_trace_mezzanine";
    const PREFIJO_ID = "demo-ta-";
    const SEMILLA = 20261016;
    const CICLOS = [3, 2, 1];
    const SEGUNDOS_JORNADA = 9 * 3600;
    const SEGUNDOS_CORTE_BLOQUE = 90 * 60;
    const SEGUNDOS_PAUSA = 28 * 60;
    const PROBABILIDAD_SIN_REGISTRO = 0.04;
    const COLECTORES = 14;

    function crearAleatorio(semilla) {
        let estado = semilla >>> 0;
        return () => {
            estado = (estado + 0x6D2B79F5) | 0;
            let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function leerEstado(clave = CLAVE_ESTADO) {
        try {
            return localStorage.getItem(clave);
        } catch (error) {
            return null;
        }
    }

    function guardarEstado(valor) {
        try {
            if (valor) localStorage.setItem(CLAVE_ESTADO, valor);
            else localStorage.removeItem(CLAVE_ESTADO);
        } catch (error) {
            // Sin almacenamiento local la demo se volvería a ofrecer; no es grave.
        }
    }

    function fechaTexto(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    /* Desde el día 21 que abre el primero de los últimos `ciclos` ciclos 21–20. */
    function obtenerDesde(ciclos) {
        const hoy = new Date();
        const mesCierre = hoy.getMonth() + (hoy.getDate() >= 21 ? 1 : 0);
        return fechaTexto(new Date(hoy.getFullYear(), mesCierre - ciclos, 21));
    }

    function obtenerHasta() {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        return fechaTexto(ayer);
    }

    async function leerMovimientosDemo(desde, hasta) {
        const importaciones = await obtenerDatosAlmacenReportes(ALMACEN_IMPORTACIONES, "", "");
        const demos = importaciones.filter((importacion) => {
            return importacion.esDatoDemo &&
                importacion.tipo === TIPO_REPORTE_TRACE_WIS &&
                importacion.fechaHasta >= desde &&
                importacion.fechaDesde <= hasta;
        });
        const filas = [];

        for (const importacion of demos) {
            const delMes = await obtenerDatosAlmacenReportes(
                ALMACEN_FILAS_REPORTES,
                "importacionId",
                importacion.id
            );
            delMes.forEach((fila) => {
                if (fila.fechaDia >= desde && fila.fechaDia <= hasta && fila.usuario) {
                    filas.push(fila);
                }
            });
        }

        return filas;
    }

    function masFrecuente(valores) {
        const conteo = new Map();
        valores.forEach((valor) => conteo.set(valor, (conteo.get(valor) || 0) + 1));
        return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    /* La ventana de 9 horas con más movimientos del día (los movimientos vienen en orden). */
    function recortarJornada(movimientos) {
        let mejor = [0, 0];
        let fin = 0;

        movimientos.forEach((movimiento, inicio) => {
            while (
                fin < movimientos.length &&
                movimientos[fin].segundos - movimiento.segundos <= SEGUNDOS_JORNADA
            ) {
                fin += 1;
            }
            if (fin - inicio > mejor[1] - mejor[0]) mejor = [inicio, fin];
        });

        return movimientos.slice(mejor[0], mejor[1]);
    }

    /* Bloques de trabajo de un operario en un día: se cortan tras 90 min sin movimientos. */
    function separarBloques(movimientos) {
        const bloques = [];
        movimientos.forEach((movimiento) => {
            const actual = bloques[bloques.length - 1];
            const ultimo = actual?.[actual.length - 1];
            if (!actual || movimiento.segundos - ultimo.segundos > SEGUNDOS_CORTE_BLOQUE) {
                bloques.push([movimiento]);
            } else {
                actual.push(movimiento);
            }
        });
        return bloques;
    }

    /*
     * Períodos del registro: de unos minutos antes del primer movimiento a
     * unos minutos después del último, cortados en cada espera larga.
     */
    function armarPeriodos(bloque, entero) {
        const periodos = [];
        let inicio = bloque[0].segundos - entero(60, 840);

        for (let i = 1; i < bloque.length; i += 1) {
            const anterior = bloque[i - 1].segundos;
            const siguiente = bloque[i].segundos;
            if (siguiente - anterior <= SEGUNDOS_PAUSA) continue;

            const finPeriodo = anterior + entero(60, 240);
            const reanudacion = siguiente - entero(60, 240);
            if (reanudacion > finPeriodo) {
                periodos.push([inicio, finPeriodo]);
                inicio = reanudacion;
            }
        }

        periodos.push([inicio, bloque[bloque.length - 1].segundos + entero(120, 720)]);
        return periodos;
    }

    function crearRegistros(filas) {
        const aleatorio = crearAleatorio(SEMILLA);
        const entero = (minimo, maximo) => minimo + Math.floor(aleatorio() * (maximo - minimo + 1));
        const usuariosWeb = typeof obtenerUsuarios === "function" ? obtenerUsuarios() : [];
        const operarios = typeof obtenerOperarios === "function" ? obtenerOperarios() : [];
        const nombresWis = new Map(
            (typeof obtenerAplicacionesWisProtegidas === "function"
                ? obtenerAplicacionesWisProtegidas()
                : []).map((aplicacion) => [aplicacion.codigo, aplicacion.nombre])
        );
        const normalizar = (valor) => String(valor || "").trim().toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "");

        // Movimientos por operario y día, en orden de hora.
        const porOperarioDia = new Map();
        filas.forEach((fila) => {
            const hora = /T(\d{2}):(\d{2}):(\d{2})/.exec(fila.fechaHora || "");
            if (!hora) return;
            const clave = `${fila.fechaDia}|${fila.usuario}`;
            if (!porOperarioDia.has(clave)) porOperarioDia.set(clave, []);
            porOperarioDia.get(clave).push({
                segundos: Number(hora[1]) * 3600 + Number(hora[2]) * 60 + Number(hora[3]),
                aplicacion: String(fila.aplicacion || "").toUpperCase(),
                descripcion: fila.descripcionAplicacion || "",
                operativa: fila.operativa || "Sin asignar"
            });
        });

        const registros = [];
        [...porOperarioDia.keys()].sort().forEach((clave) => {
            const [dia, usuario] = clave.split("|");
            const movimientos = porOperarioDia.get(clave).sort((a, b) => a.segundos - b.segundos);
            const cuenta = usuariosWeb.find((item) => normalizar(item.nombreUsuario) === normalizar(usuario));
            const operario = cuenta?.operarioId
                ? operarios.find((item) => item.id === cuenta.operarioId)
                : null;
            const numeroColector = [...usuario].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) %
                COLECTORES + 1;

            separarBloques(recortarJornada(movimientos)).forEach((bloque, indice) => {
                if (aleatorio() < PROBABILIDAD_SIN_REGISTRO) return;

                const aplicacion = masFrecuente(bloque.map((movimiento) => movimiento.aplicacion));
                const descripcion = bloque.find((movimiento) => movimiento.aplicacion === aplicacion).descripcion;
                const instante = (segundos) => new Date(
                    new Date(`${dia}T00:00:00`).getTime() + segundos * 1000
                ).toISOString();
                const periodos = armarPeriodos(bloque, entero).map(([inicio, fin]) => ({
                    inicio: instante(inicio),
                    fin: instante(fin)
                }));
                const segundosActivos = periodos.reduce((total, periodo) => {
                    return total + Math.round((new Date(periodo.fin) - new Date(periodo.inicio)) / 1000);
                }, 0);
                const final = periodos[periodos.length - 1].fin;

                registros.push({
                    id: `${PREFIJO_ID}${dia}-${usuario}-${indice + 1}`,
                    usuarioId: cuenta?.id || `demo-usuario-${usuario}`,
                    operarioId: cuenta?.operarioId || null,
                    funcionario: operario?.nombre || cuenta?.nombre || usuario,
                    nombreUsuario: usuario,
                    operativa: masFrecuente(bloque.map((movimiento) => movimiento.operativa)),
                    colector: `HH-${String(numeroColector).padStart(2, "0")}`,
                    actividadCodigo: aplicacion,
                    actividad: nombresWis.get(aplicacion) || descripcion || aplicacion,
                    estado: "finalizada",
                    inicio: periodos[0].inicio,
                    ultimoInicio: null,
                    tiempoAcumulado: segundosActivos,
                    cantidadPausas: periodos.length - 1,
                    periodos,
                    bateria: entero(25, 100),
                    alarmaAntiperdida: true,
                    ultimoMovimiento: final,
                    actualizadoEn: final,
                    final,
                    esDatoDemo: true,
                    marcaDemo: MARCA
                });
            });
        });

        return registros;
    }

    async function refrescarVistas() {
        window.PoloOesteTareas?.renderizarPanel?.();
        if (
            document.getElementById("grafico-operativo-inicio") &&
            typeof cargarResumenOperativoInicio === "function"
        ) {
            await cargarResumenOperativoInicio(false);
        }
    }

    let siembraEnCurso = null;

    async function sembrar() {
        if (leerEstado() === MARCA || !leerEstado(CLAVE_ESTADO_TRACE)) return false;

        const dependencias = [
            "obtenerDatosAlmacenReportes", "obtenerTareasActivas", "guardarTareasActivas"
        ];
        if (dependencias.some((nombre) => typeof window[nombre] !== "function")) {
            return false;
        }

        const reales = obtenerTareasActivas().filter((registro) => !registro.esDatoDemo);
        const hasta = obtenerHasta();

        // Si el navegador no tiene lugar para tres ciclos, se prueba con menos.
        for (const ciclos of CICLOS) {
            const desde = obtenerDesde(ciclos);
            const registros = crearRegistros(await leerMovimientosDemo(desde, hasta));

            if (guardarTareasActivas([...reales, ...registros])) {
                guardarEstado(MARCA);
                const texto = `${registros.length.toLocaleString("es-UY")} registros sintéticos de ` +
                    `Tareas activas agregados (${desde} al ${hasta}).`;
                console.info(texto);
                await refrescarVistas();
                return true;
            }
        }

        console.warn("Demo de Tareas activas: no hay lugar en el almacenamiento del navegador.");
        guardarEstado(MARCA);
        return false;
    }

    function intentarSembrar() {
        if (siembraEnCurso || leerEstado() === MARCA) return;
        siembraEnCurso = sembrar()
            .catch((error) => console.warn("Demo de Tareas activas:", error.message || error))
            .finally(() => {
                siembraEnCurso = null;
            });
    }

    // Espera a que la demo del Trace termine de guardarse (deja su marca).
    setInterval(() => {
        if (typeof obtenerUsuarioActual === "function" && obtenerUsuarioActual()) {
            intentarSembrar();
        }
    }, 3000);

    window.eliminarTareasDemo = async () => {
        if (siembraEnCurso) await siembraEnCurso;
        const registros = obtenerTareasActivas();
        const reales = registros.filter((registro) => !registro.esDatoDemo);
        guardarTareasActivas(reales);
        guardarEstado(MARCA);
        await refrescarVistas();
        return registros.length - reales.length;
    };

    window.regenerarTareasDemo = async () => {
        await window.eliminarTareasDemo();
        guardarEstado("");
        siembraEnCurso = sembrar().finally(() => {
            siembraEnCurso = null;
        });
        return siembraEnCurso;
    };
})();
