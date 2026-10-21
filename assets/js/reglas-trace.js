(() => {
    "use strict";

    const CLAVE_CATALOGO = "gestion_personal_reglas_trace_wis_v2";
    const CLAVE_HISTORIAL = "gestion_personal_historial_reglas_trace_wis_v2";
    const CLAVE_CATALOGO_V1 = "gestion_personal_reglas_trace_wis_v1";
    const CLAVE_HISTORIAL_V1 = "gestion_personal_historial_reglas_trace_wis_v1";
    const VERSION_ESQUEMA = 2;
    const MAXIMO_EVENTOS_HISTORIAL = 500;
    const COMODIN = "*";
    const ESTADO_INCLUIDO = "incluido";
    const ESTADO_EXCLUIDO = "excluido";
    const ESTADO_PENDIENTE = "pendiente";
    const ESTADOS_VALIDOS = new Set([
        ESTADO_INCLUIDO,
        ESTADO_EXCLUIDO,
        ESTADO_PENDIENTE
    ]);
    const SIGNOS_VALIDOS = new Set(["positivo", "negativo", "cero"]);
    const CATEGORIA_FACTURABLE = "facturable";
    const CATEGORIA_PICKING = "picking";
    const CATEGORIA_OPERATIVO = "operativo";
    const CATEGORIA_NINGUNO = "ninguno";
    const APLICACION_EXPEDICION = "EXP040";
    const PREFIJO_UBICACION_EXPEDICION = "1MPUE";
    const CATEGORIAS_VOLUMEN_VALIDAS = new Set([
        CATEGORIA_FACTURABLE,
        CATEGORIA_PICKING,
        CATEGORIA_OPERATIVO,
        CATEGORIA_NINGUNO
    ]);
    const APLICACIONES_AJUSTE_EN_ESPERA = new Set([
        "INV414",
        "INV540",
        "AJUSTE_MANUAL"
    ]);

    let catalogoCache = null;
    let historialCache = null;
    let indiceCache = null;
    let revisionIndiceCache = null;
    let evaluacionesCache = new WeakMap();
    let memoriaCatalogo = null;
    let memoriaHistorial = [];

    function normalizarTextoClave(valor) {
        return String(valor ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .toLowerCase();
    }

    function normalizarComodin(valor, transformador = normalizarTextoClave) {
        const texto = String(valor ?? "").trim();
        return !texto || texto === COMODIN
            ? COMODIN
            : transformador(texto);
    }

    function normalizarAplicacion(valor) {
        const texto = String(valor ?? "").trim();
        return !texto || texto === COMODIN ? COMODIN : texto.toUpperCase();
    }

    function normalizarSigno(valor) {
        return normalizarTextoClave(valor);
    }

    function clonar(valor) {
        return JSON.parse(JSON.stringify(valor));
    }

    function crearIdRegla() {
        if (typeof generarId === "function") {
            return generarId();
        }

        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
            return globalThis.crypto.randomUUID();
        }

        return `regla-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function obtenerActorActual() {
        const usuario = typeof obtenerUsuarioActual === "function"
            ? obtenerUsuarioActual()
            : null;

        return {
            id: usuario ? usuario.id : "sistema",
            nombre: usuario
                ? (usuario.nombre || usuario.nombreUsuario || "Usuario")
                : "Sistema"
        };
    }

    function exigirAdministrador() {
        if (typeof esAdministrador !== "function" || !esAdministrador()) {
            throw new Error(
                "Solo un administrador puede modificar las reglas WIS."
            );
        }
    }

    function obtenerStorage() {
        try {
            return globalThis.localStorage || null;
        } catch (error) {
            console.warn("No fue posible acceder al almacenamiento local.", error);
            return null;
        }
    }

    function leerJson(clave, predeterminado) {
        const storage = obtenerStorage();

        if (!storage) {
            return predeterminado;
        }

        try {
            const texto = storage.getItem(clave);
            return texto ? JSON.parse(texto) : predeterminado;
        } catch (error) {
            console.warn(`No fue posible leer ${clave}.`, error);
            return predeterminado;
        }
    }

    function reglaPredeterminada(
        aplicacion,
        signo,
        actividad,
        estado,
        opciones = {}
    ) {
        const incluido = estado === ESTADO_INCLUIDO;
        const categoriaVolumen = incluido
            ? opciones.categoriaVolumen || CATEGORIA_NINGUNO
            : CATEGORIA_NINGUNO;

        return {
            id: `predeterminada-${aplicacion}-${signo}`.toLowerCase(),
            operativa: COMODIN,
            aplicacion,
            descripcionAplicacion: COMODIN,
            signo,
            actividad,
            estado,
            categoriaVolumen,
            facturable: categoriaVolumen === CATEGORIA_FACTURABLE,
            cuentaOperacion: incluido && opciones.cuentaOperacion !== false,
            participaMapa: incluido && opciones.participaMapa !== false,
            visibleInicio: incluido && opciones.visibleInicio === true,
            vigenciaDesde: "",
            vigenciaHasta: "",
            version: 1,
            fechaCreacion: "",
            fechaActualizacion: "",
            actualizadoPor: { id: "sistema", nombre: "Sistema" }
        };
    }

    function crearReglasPredeterminadas(fechaActualizacion = new Date().toISOString()) {
        const reglas = [
            reglaPredeterminada(
                "INV414", "positivo", "Inventario", ESTADO_INCLUIDO,
                { categoriaVolumen: CATEGORIA_OPERATIVO }
            ),
            reglaPredeterminada(
                "INV414", "negativo", "Inventario", ESTADO_PENDIENTE
            ),
            reglaPredeterminada(
                "INV540", "positivo", "Inventario", ESTADO_INCLUIDO,
                { categoriaVolumen: CATEGORIA_OPERATIVO }
            ),
            reglaPredeterminada(
                "INV540", "negativo", "Inventario", ESTADO_PENDIENTE
            ),
            reglaPredeterminada(
                "REC510",
                "positivo",
                "Almacenamiento agrupado",
                ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_FACTURABLE,
                    visibleInicio: true
                }
            ),
            reglaPredeterminada(
                "REC510", "negativo", "Almacenamiento agrupado", ESTADO_EXCLUIDO
            ),
            reglaPredeterminada(
                "REC522",
                "positivo",
                "Almacenamiento fraccionado",
                ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_FACTURABLE,
                    visibleInicio: true
                }
            ),
            reglaPredeterminada(
                "REC522", "negativo", "Almacenamiento fraccionado", ESTADO_EXCLUIDO
            ),
            reglaPredeterminada(
                "PRD500",
                "positivo",
                "Devolución de picking",
                ESTADO_INCLUIDO,
                { categoriaVolumen: CATEGORIA_OPERATIVO }
            ),
            reglaPredeterminada(
                "PRD500", "negativo", "Devolución de picking", ESTADO_EXCLUIDO
            ),
            reglaPredeterminada(
                "EXP040", "positivo", "Expedición", ESTADO_EXCLUIDO
            ),
            reglaPredeterminada(
                "EXP040", "negativo", "Expedición", ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_FACTURABLE,
                    visibleInicio: true
                }
            ),
            reglaPredeterminada(
                "PRD095",
                "positivo",
                "Preparación de picking",
                ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_NINGUNO,
                    cuentaOperacion: false,
                    participaMapa: false,
                    visibleInicio: false
                }
            ),
            reglaPredeterminada(
                "PRD095",
                "negativo",
                "Preparación de picking",
                ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_PICKING,
                    visibleInicio: true
                }
            ),
            reglaPredeterminada(
                "REC501",
                "positivo",
                "Recepción",
                ESTADO_INCLUIDO,
                {
                    categoriaVolumen: CATEGORIA_FACTURABLE,
                    visibleInicio: true
                }
            ),
            reglaPredeterminada(
                "AJUSTE_MANUAL",
                "negativo",
                "Ajuste de inventario",
                ESTADO_PENDIENTE
            )
        ];

        return reglas.map((regla) => ({
            ...regla,
            fechaCreacion: fechaActualizacion,
            fechaActualizacion
        }));
    }

    function crearCatalogoPredeterminado() {
        const ahora = new Date().toISOString();

        return {
            versionEsquema: VERSION_ESQUEMA,
            revision: 1,
            fechaActualizacion: ahora,
            reglas: crearReglasPredeterminadas(ahora)
        };
    }

    function catalogoValido(catalogo) {
        return Boolean(
            catalogo &&
            catalogo.versionEsquema === VERSION_ESQUEMA &&
            Number.isFinite(Number(catalogo.revision)) &&
            Array.isArray(catalogo.reglas)
        );
    }

    function catalogoV1Valido(catalogo) {
        return Boolean(
            catalogo &&
            catalogo.versionEsquema === 1 &&
            Number.isFinite(Number(catalogo.revision)) &&
            Array.isArray(catalogo.reglas)
        );
    }

    function inferirCategoriaVolumenV1(regla) {
        if (regla.estado !== ESTADO_INCLUIDO) {
            return CATEGORIA_NINGUNO;
        }

        if (
            normalizarAplicacion(regla.aplicacion) === "PRD095" &&
            normalizarSigno(regla.signo) === "negativo"
        ) {
            return CATEGORIA_PICKING;
        }

        if (!regla.facturable) {
            return CATEGORIA_NINGUNO;
        }

        const aplicacion = normalizarAplicacion(regla.aplicacion);
        const signo = normalizarSigno(regla.signo);
        const esFacturablePredeterminado = (
            ["REC501", "REC510", "REC522"].includes(aplicacion) &&
            signo === "positivo"
        ) || (aplicacion === "EXP040" && signo === "negativo");

        return esFacturablePredeterminado
            ? CATEGORIA_FACTURABLE
            : CATEGORIA_OPERATIVO;
    }

    function migrarCatalogoV1(catalogoV1, historialV1) {
        const ahora = new Date().toISOString();
        const predeterminadas = new Map(
            crearReglasPredeterminadas(ahora).map((regla) => {
                return [regla.id, regla];
            })
        );
        let predeterminadasActualizadas = 0;
        let personalizadasPreservadas = 0;
        const reglas = catalogoV1.reglas.map((reglaV1) => {
            const predeterminada = predeterminadas.get(reglaV1.id);

            if (predeterminada) {
                predeterminadasActualizadas += 1;
                return {
                    ...predeterminada,
                    fechaCreacion: reglaV1.fechaCreacion || ahora,
                    fechaActualizacion: ahora,
                    version: Number(reglaV1.version || 1) + 1,
                    actualizadoPor: {
                        id: "sistema",
                        nombre: "Migración de catálogo"
                    }
                };
            }

            personalizadasPreservadas += 1;
            const categoriaVolumen = inferirCategoriaVolumenV1(reglaV1);
            const incluida = reglaV1.estado === ESTADO_INCLUIDO;
            return {
                ...reglaV1,
                categoriaVolumen,
                facturable: categoriaVolumen === CATEGORIA_FACTURABLE,
                cuentaOperacion:
                    incluida && Boolean(reglaV1.cuentaOperacion),
                participaMapa:
                    incluida && Boolean(reglaV1.participaMapa),
                visibleInicio:
                    incluida && Boolean(reglaV1.visibleInicio),
                version: Number(reglaV1.version || 1) + 1,
                fechaCreacion: reglaV1.fechaCreacion || ahora,
                fechaActualizacion: ahora,
                actualizadoPor: {
                    id: "sistema",
                    nombre: "Migración de catálogo"
                }
            };
        });
        const catalogo = {
            versionEsquema: VERSION_ESQUEMA,
            revision: Number(catalogoV1.revision || 0) + 1,
            fechaActualizacion: ahora,
            reglas
        };
        const eventoMigracion = {
            id: crearIdRegla(),
            accion: "migracion_v2",
            fecha: ahora,
            actor: { id: "sistema", nombre: "Sistema" },
            reglaId: null,
            aplicacion: "",
            version: null,
            anterior: null,
            actual: null,
            detalle:
                `Catálogo migrado al esquema 2: ${predeterminadasActualizadas} ` +
                "reglas predeterminadas actualizadas y " +
                `${personalizadasPreservadas} personalizadas preservadas.`
        };
        const historialAnterior = Array.isArray(historialV1) ? historialV1 : [];
        const historial = [eventoMigracion, ...historialAnterior]
            .slice(0, MAXIMO_EVENTOS_HISTORIAL);

        return { catalogo, historial };
    }

    function persistirEstado(catalogo, historial) {
        const storage = obtenerStorage();

        if (!storage) {
            memoriaCatalogo = clonar(catalogo);
            memoriaHistorial = clonar(historial);
            return;
        }

        const catalogoAnterior = storage.getItem(CLAVE_CATALOGO);
        const historialAnterior = storage.getItem(CLAVE_HISTORIAL);

        try {
            storage.setItem(CLAVE_CATALOGO, JSON.stringify(catalogo));
            storage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
        } catch (error) {
            try {
                if (catalogoAnterior === null) {
                    storage.removeItem(CLAVE_CATALOGO);
                } else {
                    storage.setItem(CLAVE_CATALOGO, catalogoAnterior);
                }

                if (historialAnterior === null) {
                    storage.removeItem(CLAVE_HISTORIAL);
                } else {
                    storage.setItem(CLAVE_HISTORIAL, historialAnterior);
                }
            } catch (errorRestauracion) {
                console.error("No fue posible restaurar las reglas WIS.", errorRestauracion);
            }

            throw new Error(
                "No fue posible guardar las reglas. Revisá el espacio disponible del navegador."
            );
        }
    }

    function obtenerCatalogoInterno() {
        if (catalogoCache) {
            return catalogoCache;
        }

        const storage = obtenerStorage();
        const guardado = storage
            ? leerJson(CLAVE_CATALOGO, null)
            : memoriaCatalogo;

        if (catalogoValido(guardado)) {
            catalogoCache = guardado;
        } else {
            const catalogoV1 = storage
                ? leerJson(CLAVE_CATALOGO_V1, null)
                : null;

            if (catalogoV1Valido(catalogoV1)) {
                const migracion = migrarCatalogoV1(
                    catalogoV1,
                    leerJson(CLAVE_HISTORIAL_V1, [])
                );
                catalogoCache = migracion.catalogo;
                historialCache = migracion.historial;
            } else {
                catalogoCache = crearCatalogoPredeterminado();
            }

            try {
                persistirEstado(
                    catalogoCache,
                    historialCache || obtenerHistorialInterno()
                );
            } catch (error) {
                console.warn(error.message);
            }
        }

        return catalogoCache;
    }

    function obtenerHistorialInterno() {
        if (historialCache) {
            return historialCache;
        }

        const storage = obtenerStorage();
        const guardado = storage
            ? leerJson(CLAVE_HISTORIAL, [])
            : memoriaHistorial;
        historialCache = Array.isArray(guardado) ? guardado : [];
        return historialCache;
    }

    function invalidarIndices() {
        indiceCache = null;
        revisionIndiceCache = null;
        evaluacionesCache = new WeakMap();
    }

    function emitirActualizacion() {
        if (
            typeof globalThis.dispatchEvent === "function" &&
            typeof globalThis.CustomEvent === "function"
        ) {
            globalThis.dispatchEvent(new CustomEvent("catalogoreglaswisactualizado"));
            globalThis.dispatchEvent(new CustomEvent("reglas-trace-actualizadas"));
        }
    }

    function guardarCatalogoYEvento(catalogo, evento) {
        const historial = [evento, ...obtenerHistorialInterno()]
            .slice(0, MAXIMO_EVENTOS_HISTORIAL);

        persistirEstado(catalogo, historial);
        catalogoCache = catalogo;
        historialCache = historial;
        invalidarIndices();
        emitirActualizacion();
    }

    function obtenerSignoMovimiento(fila) {
        const movimiento = Number(fila && (fila.movimiento ?? fila.cantidad ?? 0));

        if (movimiento > 0) {
            return "positivo";
        }

        if (movimiento < 0) {
            return "negativo";
        }

        return "cero";
    }

    function obtenerFechaFila(fila) {
        const valor = String(
            fila && (fila.fechaDia || fila.fechaHora || fila.fecha || "")
        ).trim();
        let coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (coincidencia) {
            return `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`;
        }

        coincidencia = valor.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);

        if (!coincidencia) {
            return "";
        }

        return `${coincidencia[3]}-${coincidencia[2].padStart(2, "0")}-` +
            coincidencia[1].padStart(2, "0");
    }

    function crearIndice() {
        const catalogo = obtenerCatalogoInterno();

        if (indiceCache && revisionIndiceCache === catalogo.revision) {
            return indiceCache;
        }

        const indice = new Map();

        catalogo.reglas.forEach((regla) => {
            const aplicacion = normalizarAplicacion(regla.aplicacion);
            const signo = normalizarSigno(regla.signo);
            const clave = `${aplicacion}|${signo}`;

            if (!indice.has(clave)) {
                indice.set(clave, []);
            }

            indice.get(clave).push({
                regla,
                operativaClave: normalizarComodin(regla.operativa),
                descripcionClave: normalizarComodin(regla.descripcionAplicacion)
            });
        });

        indiceCache = indice;
        revisionIndiceCache = catalogo.revision;
        return indiceCache;
    }

    function coincideVigencia(regla, fecha) {
        const desde = regla.vigenciaDesde || "";
        const hasta = regla.vigenciaHasta || "";

        if (!fecha) {
            return !desde && !hasta;
        }

        return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    }

    function puntuarCandidato(candidato, contexto) {
        const regla = candidato.regla;

        if (
            candidato.operativaClave !== COMODIN &&
            candidato.operativaClave !== contexto.operativa
        ) {
            return -1;
        }

        if (
            candidato.descripcionClave !== COMODIN &&
            candidato.descripcionClave !== contexto.descripcion
        ) {
            return -1;
        }

        if (!coincideVigencia(regla, contexto.fecha)) {
            return -1;
        }

        let puntaje = 0;
        puntaje += candidato.descripcionClave === COMODIN ? 0 : 8;
        puntaje += candidato.operativaClave === COMODIN ? 0 : 4;
        puntaje += normalizarAplicacion(regla.aplicacion) === COMODIN ? 0 : 2;
        return puntaje;
    }

    function compararDesempate(candidato, mejor) {
        if (!mejor) {
            return 1;
        }

        const regla = candidato.regla;
        const reglaMejor = mejor.regla;
        const desde = regla.vigenciaDesde || "0000-00-00";
        const desdeMejor = reglaMejor.vigenciaDesde || "0000-00-00";

        if (desde !== desdeMejor) {
            return desde.localeCompare(desdeMejor);
        }

        if (Number(regla.version || 0) !== Number(reglaMejor.version || 0)) {
            return Number(regla.version || 0) - Number(reglaMejor.version || 0);
        }

        return String(regla.fechaActualizacion || "")
            .localeCompare(String(reglaMejor.fechaActualizacion || ""));
    }

    function buscarRegla(fila, signo) {
        const aplicacion = normalizarAplicacion(fila && fila.aplicacion);
        const contexto = {
            operativa: normalizarTextoClave(fila && fila.operativa),
            descripcion: normalizarTextoClave(
                fila && fila.descripcionAplicacion
            ),
            fecha: obtenerFechaFila(fila)
        };
        const indice = crearIndice();
        const candidatos = [
            ...(indice.get(`${aplicacion}|${signo}`) || []),
            ...(indice.get(`${COMODIN}|${signo}`) || [])
        ];
        let mejor = null;
        let mejorPuntaje = -1;

        candidatos.forEach((candidato) => {
            const puntaje = puntuarCandidato(candidato, contexto);

            if (
                puntaje > mejorPuntaje ||
                (puntaje === mejorPuntaje && compararDesempate(candidato, mejor) > 0)
            ) {
                mejor = candidato;
                mejorPuntaje = puntaje;
            }
        });

        return mejorPuntaje >= 0 && mejor ? mejor.regla : null;
    }

    function crearEvaluacionPredeterminada(fila, signo) {
        const aplicacion = normalizarAplicacion(fila && fila.aplicacion);
        const pendienteAjuste = signo === "negativo" &&
            APLICACIONES_AJUSTE_EN_ESPERA.has(aplicacion);
        const estado = signo === "negativo" && !pendienteAjuste
            ? ESTADO_EXCLUIDO
            : ESTADO_PENDIENTE;

        return {
            signo,
            estado,
            actividad: "Sin clasificar",
            categoriaVolumen: CATEGORIA_NINGUNO,
            facturable: false,
            cuentaOperacion: false,
            participaMapa: false,
            visibleInicio: false,
            unidadesFacturables: 0,
            unidadesPicking: 0,
            unidadesOperativas: 0,
            unidades: 0,
            reglaId: null,
            reglaVersion: null,
            version: null,
            reglaEncontrada: false
        };
    }

    function crearEvaluacionExpedicionFueraDeUbicacion(signo) {
        return {
            signo,
            estado: ESTADO_EXCLUIDO,
            actividad: "Expedición",
            categoriaVolumen: CATEGORIA_NINGUNO,
            facturable: false,
            cuentaOperacion: false,
            participaMapa: false,
            visibleInicio: false,
            unidadesFacturables: 0,
            unidadesPicking: 0,
            unidadesOperativas: 0,
            unidades: 0,
            reglaId: "filtro-exp040-ubicacion-1mpue",
            reglaVersion: 1,
            version: 1,
            reglaEncontrada: true
        };
    }

    function evaluarMovimiento(fila) {
        if (fila && typeof fila === "object" && evaluacionesCache.has(fila)) {
            return evaluacionesCache.get(fila);
        }

        const signo = obtenerSignoMovimiento(fila);
        const aplicacion = normalizarAplicacion(fila && fila.aplicacion);
        const ubicacion = String(fila && fila.ubicacion || "")
            .trim()
            .toUpperCase();
        const expedicionFueraDeUbicacion =
            aplicacion === APLICACION_EXPEDICION &&
            signo === "negativo" &&
            !ubicacion.startsWith(PREFIJO_UBICACION_EXPEDICION);
        const regla = expedicionFueraDeUbicacion
            ? null
            : buscarRegla(fila || {}, signo);
        const movimiento = Math.abs(Number(
            fila && (fila.movimiento ?? fila.cantidad ?? 0)
        ) || 0);
        const categoriaVolumen = regla && regla.estado === ESTADO_INCLUIDO &&
            CATEGORIAS_VOLUMEN_VALIDAS.has(regla.categoriaVolumen)
            ? regla.categoriaVolumen
            : CATEGORIA_NINGUNO;
        const evaluacion = expedicionFueraDeUbicacion
            ? crearEvaluacionExpedicionFueraDeUbicacion(signo)
            : regla
            ? {
                signo,
                estado: regla.estado,
                actividad: regla.actividad || "Sin clasificar",
                categoriaVolumen,
                facturable: categoriaVolumen === CATEGORIA_FACTURABLE,
                cuentaOperacion: Boolean(regla.cuentaOperacion),
                participaMapa: Boolean(regla.participaMapa),
                visibleInicio: Boolean(regla.visibleInicio),
                unidadesFacturables:
                    categoriaVolumen === CATEGORIA_FACTURABLE ? movimiento : 0,
                unidadesPicking:
                    categoriaVolumen === CATEGORIA_PICKING ? movimiento : 0,
                unidadesOperativas:
                    categoriaVolumen === CATEGORIA_OPERATIVO ? movimiento : 0,
                unidades:
                    categoriaVolumen !== CATEGORIA_NINGUNO ? movimiento : 0,
                reglaId: regla.id,
                reglaVersion: Number(regla.version || 1),
                version: Number(regla.version || 1),
                reglaEncontrada: true
            }
            : crearEvaluacionPredeterminada(fila || {}, signo);

        if (fila && typeof fila === "object") {
            evaluacionesCache.set(fila, evaluacion);
        }

        return evaluacion;
    }

    function fechaIsoValida(valor) {
        if (!valor) {
            return true;
        }

        const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (!coincidencia) {
            return false;
        }

        const fecha = new Date(Date.UTC(
            Number(coincidencia[1]),
            Number(coincidencia[2]) - 1,
            Number(coincidencia[3])
        ));

        return fecha.getUTCFullYear() === Number(coincidencia[1]) &&
            fecha.getUTCMonth() === Number(coincidencia[2]) - 1 &&
            fecha.getUTCDate() === Number(coincidencia[3]);
    }

    function normalizarDatosRegla(datos, existente = null) {
        const ahora = new Date().toISOString();
        const operativaOriginal = String(datos.operativa ?? COMODIN).trim();
        const aplicacion = normalizarAplicacion(datos.aplicacion);
        const descripcionOriginal = String(
            datos.descripcionAplicacion ?? COMODIN
        ).trim();
        const signo = normalizarSigno(datos.signo);
        const estado = normalizarTextoClave(datos.estado);
        const actividad = String(datos.actividad || "").trim();
        const vigenciaDesde = String(datos.vigenciaDesde || "").trim();
        const vigenciaHasta = String(datos.vigenciaHasta || "").trim();
        const categoriaSolicitada = normalizarTextoClave(
            datos.categoriaVolumen || ""
        );

        if (!aplicacion) {
            throw new Error("Indicá una aplicación o utilizá * como comodín.");
        }

        if (!SIGNOS_VALIDOS.has(signo)) {
            throw new Error("El signo de movimiento no es válido.");
        }

        if (!ESTADOS_VALIDOS.has(estado)) {
            throw new Error("El estado de la regla no es válido.");
        }

        let categoriaVolumen = categoriaSolicitada;

        if (!categoriaVolumen) {
            categoriaVolumen = aplicacion === "PRD095" && signo === "negativo"
                ? CATEGORIA_PICKING
                : datos.facturable
                    ? CATEGORIA_FACTURABLE
                    : CATEGORIA_NINGUNO;
        }

        if (!CATEGORIAS_VOLUMEN_VALIDAS.has(categoriaVolumen)) {
            throw new Error("La categoría de volumen no es válida.");
        }

        if (!actividad) {
            throw new Error("Indicá la actividad logística.");
        }

        if (!fechaIsoValida(vigenciaDesde) || !fechaIsoValida(vigenciaHasta)) {
            throw new Error("Las vigencias deben ser fechas válidas.");
        }

        if (vigenciaDesde && vigenciaHasta && vigenciaDesde > vigenciaHasta) {
            throw new Error("La vigencia desde no puede ser posterior a la vigencia hasta.");
        }

        const incluido = estado === ESTADO_INCLUIDO;
        categoriaVolumen = incluido
            ? categoriaVolumen
            : CATEGORIA_NINGUNO;

        return {
            id: existente ? existente.id : crearIdRegla(),
            operativa: normalizarComodin(operativaOriginal) === COMODIN
                ? COMODIN
                : operativaOriginal,
            aplicacion,
            descripcionAplicacion: normalizarComodin(descripcionOriginal) === COMODIN
                ? COMODIN
                : descripcionOriginal,
            signo,
            actividad,
            estado,
            categoriaVolumen,
            facturable: categoriaVolumen === CATEGORIA_FACTURABLE,
            cuentaOperacion: incluido && Boolean(datos.cuentaOperacion),
            participaMapa: incluido && Boolean(datos.participaMapa),
            visibleInicio: incluido && Boolean(datos.visibleInicio),
            vigenciaDesde,
            vigenciaHasta,
            version: existente ? Number(existente.version || 1) + 1 : 1,
            fechaCreacion: existente ? existente.fechaCreacion : ahora,
            fechaActualizacion: ahora,
            actualizadoPor: obtenerActorActual()
        };
    }

    function claveRegla(regla) {
        return [
            normalizarComodin(regla.operativa),
            normalizarAplicacion(regla.aplicacion),
            normalizarComodin(regla.descripcionAplicacion),
            normalizarSigno(regla.signo)
        ].join("|");
    }

    function intervalosSolapados(a, b) {
        const inicioA = a.vigenciaDesde || "0000-01-01";
        const finA = a.vigenciaHasta || "9999-12-31";
        const inicioB = b.vigenciaDesde || "0000-01-01";
        const finB = b.vigenciaHasta || "9999-12-31";
        return inicioA <= finB && inicioB <= finA;
    }

    function validarSinSolapamientos(regla, reglas, idIgnorado = null) {
        const clave = claveRegla(regla);
        const solapada = reglas.find((otra) => {
            return otra.id !== idIgnorado &&
                claveRegla(otra) === clave &&
                intervalosSolapados(regla, otra);
        });

        if (!solapada) {
            return;
        }

        const vigencia = [
            solapada.vigenciaDesde || "sin inicio",
            solapada.vigenciaHasta || "sin fin"
        ].join(" a ");
        throw new Error(
            `La regla se superpone con otra de la misma clave (${vigencia}).`
        );
    }

    function construirEvento(accion, anterior, actual, detalle = "") {
        const regla = actual || anterior;
        return {
            id: crearIdRegla(),
            accion,
            fecha: new Date().toISOString(),
            actor: obtenerActorActual(),
            reglaId: regla ? regla.id : null,
            aplicacion: regla ? regla.aplicacion : "",
            version: regla ? Number(regla.version || 1) : null,
            anterior: anterior ? clonar(anterior) : null,
            actual: actual ? clonar(actual) : null,
            detalle
        };
    }

    function guardarRegla(datos, idRegla = null) {
        exigirAdministrador();
        const catalogoActual = obtenerCatalogoInterno();
        const reglas = catalogoActual.reglas.slice();
        const indiceExistente = idRegla
            ? reglas.findIndex((regla) => regla.id === idRegla)
            : -1;

        if (idRegla && indiceExistente < 0) {
            throw new Error("La regla que intentás editar ya no existe.");
        }

        const anterior = indiceExistente >= 0 ? reglas[indiceExistente] : null;
        const regla = normalizarDatosRegla(datos, anterior);
        validarSinSolapamientos(regla, reglas, anterior ? anterior.id : null);

        if (indiceExistente >= 0) {
            reglas[indiceExistente] = regla;
        } else {
            reglas.push(regla);
        }

        const catalogo = {
            ...catalogoActual,
            revision: Number(catalogoActual.revision || 0) + 1,
            fechaActualizacion: regla.fechaActualizacion,
            reglas
        };
        const evento = construirEvento(
            anterior ? "actualizada" : "creada",
            anterior,
            regla
        );
        guardarCatalogoYEvento(catalogo, evento);
        return clonar(regla);
    }

    function eliminarRegla(idRegla) {
        exigirAdministrador();
        const catalogoActual = obtenerCatalogoInterno();
        const anterior = catalogoActual.reglas.find(
            (regla) => regla.id === idRegla
        );

        if (!anterior) {
            throw new Error("La regla que intentás eliminar ya no existe.");
        }

        const ahora = new Date().toISOString();
        const catalogo = {
            ...catalogoActual,
            revision: Number(catalogoActual.revision || 0) + 1,
            fechaActualizacion: ahora,
            reglas: catalogoActual.reglas.filter(
                (regla) => regla.id !== idRegla
            )
        };
        guardarCatalogoYEvento(
            catalogo,
            construirEvento("eliminada", anterior, null)
        );
        return true;
    }

    function restaurarPredeterminadas() {
        exigirAdministrador();
        const catalogoActual = obtenerCatalogoInterno();
        const ahora = new Date().toISOString();
        const reglas = crearReglasPredeterminadas(ahora);
        const catalogo = {
            versionEsquema: VERSION_ESQUEMA,
            revision: Number(catalogoActual.revision || 0) + 1,
            fechaActualizacion: ahora,
            reglas
        };
        const evento = construirEvento(
            "restauradas",
            null,
            null,
            `Se reemplazaron ${catalogoActual.reglas.length} reglas por ` +
                `${reglas.length} reglas predeterminadas.`
        );
        guardarCatalogoYEvento(catalogo, evento);
        return clonar(reglas);
    }

    function describirEstado(fila) {
        const evaluacion = evaluarMovimiento(fila);

        if (evaluacion.estado === ESTADO_INCLUIDO) {
            const participaEnAlgunaMetrica =
                evaluacion.categoriaVolumen !== CATEGORIA_NINGUNO ||
                evaluacion.cuentaOperacion ||
                evaluacion.participaMapa ||
                evaluacion.visibleInicio;
            return participaEnAlgunaMetrica
                ? "Incluido según catálogo"
                : "Incluido como referencia";
        }

        if (evaluacion.estado === ESTADO_EXCLUIDO) {
            return "Excluido según catálogo";
        }

        return evaluacion.reglaEncontrada
            ? "Pendiente según catálogo"
            : "Pendiente de clasificación";
    }

    function obtenerResumen() {
        const reglas = obtenerCatalogoInterno().reglas;
        const hoy = new Date().toISOString().slice(0, 10);

        return {
            total: reglas.length,
            incluidas: reglas.filter((regla) => regla.estado === ESTADO_INCLUIDO).length,
            pendientes: reglas.filter((regla) => regla.estado === ESTADO_PENDIENTE).length,
            visiblesInicio: reglas.filter((regla) => regla.visibleInicio).length,
            facturables: reglas.filter((regla) => {
                return regla.categoriaVolumen === CATEGORIA_FACTURABLE;
            }).length,
            picking: reglas.filter((regla) => {
                return regla.categoriaVolumen === CATEGORIA_PICKING;
            }).length,
            operativas: reglas.filter((regla) => {
                return regla.categoriaVolumen === CATEGORIA_OPERATIVO;
            }).length,
            sinVolumen: reglas.filter((regla) => {
                return regla.categoriaVolumen === CATEGORIA_NINGUNO;
            }).length,
            vigentes: reglas.filter((regla) => {
                return coincideVigencia(regla, hoy);
            }).length
        };
    }

    globalThis.obtenerCatalogoReglasTraceWis = () => {
        return clonar(obtenerCatalogoInterno().reglas);
    };
    globalThis.obtenerReglasTraceWis = globalThis.obtenerCatalogoReglasTraceWis;
    globalThis.obtenerHistorialReglasTraceWis = () => {
        return clonar(obtenerHistorialInterno());
    };
    globalThis.obtenerResumenCatalogoTraceWis = obtenerResumen;
    globalThis.guardarReglaTraceWis = guardarRegla;
    globalThis.eliminarReglaTraceWis = eliminarRegla;
    globalThis.restaurarReglasPredeterminadasTraceWis = restaurarPredeterminadas;
    globalThis.evaluarMovimientoTraceWis = evaluarMovimiento;
    globalThis.obtenerSignoMovimientoTraceWis = obtenerSignoMovimiento;
    globalThis.obtenerEstadoProductivoTraceWis = (fila) => {
        return evaluarMovimiento(fila).estado;
    };
    globalThis.esMovimientoFacturableTraceWis = (fila) => {
        return evaluarMovimiento(fila).facturable;
    };
    globalThis.esMovimientoPickingTraceWis = (fila) => {
        return evaluarMovimiento(fila).categoriaVolumen === CATEGORIA_PICKING;
    };
    globalThis.esMovimientoOperativoTraceWis = (fila) => {
        return evaluarMovimiento(fila).categoriaVolumen === CATEGORIA_OPERATIVO;
    };
    globalThis.esMovimientoOperacionTraceWis = (fila) => {
        return evaluarMovimiento(fila).cuentaOperacion;
    };
    globalThis.esMovimientoUbicacionMapaTraceWis = (fila) => {
        return evaluarMovimiento(fila).participaMapa;
    };
    globalThis.esMovimientoVisibleInicioTraceWis = (fila) => {
        return evaluarMovimiento(fila).visibleInicio;
    };
    globalThis.obtenerActividadLogisticaTraceWis = (fila) => {
        return evaluarMovimiento(fila).actividad;
    };
    globalThis.obtenerCategoriaVolumenTraceWis = (fila) => {
        return evaluarMovimiento(fila).categoriaVolumen;
    };
    globalThis.describirEstadoProductivoTraceWis = describirEstado;

    if (typeof globalThis.addEventListener === "function") {
        globalThis.addEventListener("storage", (evento) => {
            if (
                evento.key !== CLAVE_CATALOGO &&
                evento.key !== CLAVE_HISTORIAL
            ) {
                return;
            }

            catalogoCache = null;
            historialCache = null;
            invalidarIndices();
            emitirActualizacion();
        });
    }
})();
