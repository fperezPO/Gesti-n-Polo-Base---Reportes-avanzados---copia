(() => {
    "use strict";

    const CLAVE_CATALOGO = "gestion_personal_catalogo_actividades_v1";
    const CLAVE_HISTORIAL = "gestion_personal_historial_actividades_v1";
    const VERSION_ESQUEMA = 1;
    const MAXIMO_EVENTOS_HISTORIAL = 300;
    const ORIGEN_MANUAL = "manual";
    const ORIGEN_WIS = "wis";
    const TODAS_OPERATIVAS = "*";

    let catalogoMemoria = null;
    let historialMemoria = [];

    function clonar(valor) {
        return JSON.parse(JSON.stringify(valor));
    }

    function obtenerStorage() {
        try {
            return globalThis.localStorage || null;
        } catch (error) {
            console.warn("No fue posible acceder al catálogo de actividades.", error);
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

    function guardarJson(clave, valor) {
        const storage = obtenerStorage();

        if (!storage) {
            return false;
        }

        try {
            storage.setItem(clave, JSON.stringify(valor));
            return true;
        } catch (error) {
            console.warn(`No fue posible guardar ${clave}.`, error);
            return false;
        }
    }

    function crearCatalogoVacio() {
        return {
            versionEsquema: VERSION_ESQUEMA,
            revision: 0,
            fechaActualizacion: "",
            actividades: []
        };
    }

    function obtenerCatalogoInterno() {
        if (catalogoMemoria) {
            return catalogoMemoria;
        }

        const guardado = leerJson(CLAVE_CATALOGO, crearCatalogoVacio());
        catalogoMemoria = guardado && Array.isArray(guardado.actividades)
            ? guardado
            : crearCatalogoVacio();
        return catalogoMemoria;
    }

    function obtenerHistorialInterno() {
        if (historialMemoria.length) {
            return historialMemoria;
        }

        const guardado = leerJson(CLAVE_HISTORIAL, []);
        historialMemoria = Array.isArray(guardado) ? guardado : [];
        return historialMemoria;
    }

    function crearId() {
        if (typeof generarId === "function") {
            return generarId();
        }

        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
            return globalThis.crypto.randomUUID();
        }

        return `actividad-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
                "Solo un administrador puede modificar el catálogo de actividades."
            );
        }
    }

    function normalizarCodigo(valor) {
        return String(valor ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/\s+/g, "_");
    }

    function normalizarTexto(valor, maximo) {
        return String(valor ?? "").trim().replace(/\s+/g, " ").slice(0, maximo);
    }

    function obtenerOperativasValidas() {
        const disponibles = Array.isArray(globalThis.OPERATIVAS)
            ? globalThis.OPERATIVAS
            : typeof OPERATIVAS !== "undefined" && Array.isArray(OPERATIVAS)
                ? OPERATIVAS
                : typeof obtenerNombresOperativasCatalogo === "function"
                    ? obtenerNombresOperativasCatalogo()
                    : [];
        return new Set([TODAS_OPERATIVAS, ...disponibles]);
    }

    function obtenerReglasWis() {
        return typeof globalThis.obtenerCatalogoReglasTraceWis === "function"
            ? globalThis.obtenerCatalogoReglasTraceWis()
            : [];
    }

    function obtenerCodigosWis() {
        return new Set(obtenerReglasWis().map((regla) => {
            return normalizarCodigo(regla.aplicacion);
        }).filter((codigo) => codigo && codigo !== TODAS_OPERATIVAS));
    }

    function normalizarActividad(datos, anterior = null) {
        const codigo = normalizarCodigo(datos.codigo);
        const nombre = normalizarTexto(datos.nombre, 100);
        const descripcion = normalizarTexto(datos.descripcion, 240);
        const operativa = String(datos.operativa || TODAS_OPERATIVAS).trim();

        if (!codigo) {
            throw new Error("Ingresá un código para identificar la actividad.");
        }

        if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(codigo)) {
            throw new Error(
                "El código admite hasta 40 caracteres: letras, números, guion y guion bajo."
            );
        }

        if (nombre.length < 2) {
            throw new Error("Ingresá el nombre de la actividad.");
        }

        if (!obtenerOperativasValidas().has(operativa)) {
            throw new Error("La operativa seleccionada no es válida.");
        }

        if (obtenerCodigosWis().has(codigo)) {
            throw new Error(
                `${codigo} pertenece a WIS, está protegido y no puede administrarse manualmente.`
            );
        }

        const ahora = new Date().toISOString();
        return {
            id: anterior ? anterior.id : crearId(),
            codigo,
            nombre,
            descripcion,
            operativa,
            activa: datos.activa !== false,
            origen: ORIGEN_MANUAL,
            bloqueada: false,
            version: anterior ? Number(anterior.version || 1) + 1 : 1,
            fechaCreacion: anterior ? anterior.fechaCreacion : ahora,
            fechaActualizacion: ahora,
            actualizadoPor: obtenerActorActual()
        };
    }

    function construirEvento(accion, anterior, actual) {
        const actividad = actual || anterior;
        return {
            id: crearId(),
            accion,
            fecha: new Date().toISOString(),
            actor: obtenerActorActual(),
            actividadId: actividad ? actividad.id : null,
            codigo: actividad ? actividad.codigo : "",
            version: actividad ? Number(actividad.version || 1) : null,
            anterior: anterior ? clonar(anterior) : null,
            actual: actual ? clonar(actual) : null
        };
    }

    function emitirActualizacion() {
        if (
            typeof globalThis.dispatchEvent === "function" &&
            typeof globalThis.CustomEvent === "function"
        ) {
            globalThis.dispatchEvent(
                new CustomEvent("catalogoactividadesactualizado")
            );
        }
    }

    function persistir(catalogo, evento) {
        const historial = [
            evento,
            ...obtenerHistorialInterno()
        ].slice(0, MAXIMO_EVENTOS_HISTORIAL);

        if (obtenerStorage()) {
            if (!guardarJson(CLAVE_CATALOGO, catalogo)) {
                throw new Error("No fue posible guardar el catálogo de actividades.");
            }

            if (!guardarJson(CLAVE_HISTORIAL, historial)) {
                guardarJson(CLAVE_CATALOGO, obtenerCatalogoInterno());
                throw new Error("No fue posible guardar el historial de actividades.");
            }
        }

        catalogoMemoria = catalogo;
        historialMemoria = historial;
        emitirActualizacion();
        sincronizarCatalogoServidor();
    }

    function guardarActividad(datos, idActividad = null) {
        exigirAdministrador();
        const catalogoActual = obtenerCatalogoInterno();
        const actividades = catalogoActual.actividades.slice();
        const indice = idActividad
            ? actividades.findIndex((item) => item.id === idActividad)
            : -1;

        if (idActividad && indice < 0) {
            throw new Error("La actividad que intentás editar ya no existe.");
        }

        const anterior = indice >= 0 ? actividades[indice] : null;
        const actividad = normalizarActividad(datos, anterior);
        const duplicada = actividades.find((item) => {
            return item.id !== actividad.id &&
                normalizarCodigo(item.codigo) === actividad.codigo;
        });

        if (duplicada) {
            throw new Error(`Ya existe una actividad con el código ${actividad.codigo}.`);
        }

        if (indice >= 0) {
            actividades[indice] = actividad;
        } else {
            actividades.push(actividad);
        }

        const catalogo = {
            ...catalogoActual,
            versionEsquema: VERSION_ESQUEMA,
            revision: Number(catalogoActual.revision || 0) + 1,
            fechaActualizacion: actividad.fechaActualizacion,
            actividades
        };
        persistir(
            catalogo,
            construirEvento(anterior ? "actualizada" : "creada", anterior, actividad)
        );
        return clonar(actividad);
    }

    function eliminarActividad(idActividad) {
        exigirAdministrador();
        const catalogoActual = obtenerCatalogoInterno();
        const anterior = catalogoActual.actividades.find(
            (actividad) => actividad.id === idActividad
        );

        if (!anterior) {
            throw new Error(
                "La actividad no existe o pertenece a WIS y está protegida."
            );
        }

        const ahora = new Date().toISOString();
        const catalogo = {
            ...catalogoActual,
            revision: Number(catalogoActual.revision || 0) + 1,
            fechaActualizacion: ahora,
            actividades: catalogoActual.actividades.filter(
                (actividad) => actividad.id !== idActividad
            )
        };
        persistir(catalogo, construirEvento("eliminada", anterior, null));
        return true;
    }

    function obtenerAplicacionesWisProtegidas() {
        const agrupadas = new Map();

        obtenerReglasWis().forEach((regla) => {
            const codigo = normalizarCodigo(regla.aplicacion);

            if (!codigo || codigo === TODAS_OPERATIVAS) {
                return;
            }

            if (!agrupadas.has(codigo)) {
                agrupadas.set(codigo, {
                    actividades: new Set(),
                    operativas: new Set(),
                    versiones: []
                });
            }

            const grupo = agrupadas.get(codigo);
            const actividad = normalizarTexto(regla.actividad, 100);
            const operativa = String(regla.operativa || TODAS_OPERATIVAS).trim();

            if (actividad) {
                grupo.actividades.add(actividad);
            }

            grupo.operativas.add(operativa);
            grupo.versiones.push(Number(regla.version || 1));
        });

        return [...agrupadas.entries()].map(([codigo, grupo]) => {
            const nombres = [...grupo.actividades].sort((a, b) => {
                return a.localeCompare(b, "es", { numeric: true });
            });
            const operativas = [...grupo.operativas].filter(Boolean);
            return {
                id: `wis-${codigo.toLowerCase()}`,
                codigo,
                nombre: nombres.length === 1
                    ? nombres[0]
                    : nombres.length
                        ? nombres.join(" / ")
                        : `Aplicación ${codigo}`,
                descripcion: "Aplicación WIS vinculada automáticamente desde sus reglas.",
                operativa: operativas.length === 1 ? operativas[0] : TODAS_OPERATIVAS,
                activa: true,
                origen: ORIGEN_WIS,
                bloqueada: true,
                version: Math.max(1, ...grupo.versiones),
                fechaCreacion: "",
                fechaActualizacion: "",
                actualizadoPor: { id: "wis", nombre: "WIS" }
            };
        }).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    }

    function obtenerActividadesManuales(incluirInactivas = true) {
        return obtenerCatalogoInterno().actividades
            .filter((actividad) => incluirInactivas || actividad.activa)
            .map((actividad) => ({
                ...actividad,
                origen: ORIGEN_MANUAL,
                bloqueada: false
            }));
    }

    function obtenerCatalogoUnificado(opciones = {}) {
        const incluirInactivas = opciones.incluirInactivas === true;
        const incluirWis = opciones.incluirWis !== false;
        const manuales = obtenerActividadesManuales(incluirInactivas);
        const wis = incluirWis ? obtenerAplicacionesWisProtegidas() : [];
        return [...manuales, ...wis].sort((a, b) => {
            return String(a.nombre).localeCompare(String(b.nombre), "es", {
                numeric: true
            }) || a.codigo.localeCompare(b.codigo, "es", { numeric: true });
        });
    }

    async function sincronizarCatalogoServidor() {
        if (typeof fetch !== "function") return false;
        try {
            const actividades = obtenerCatalogoUnificado({ incluirWis: true })
                .filter((actividad) => actividad.activa !== false)
                .map((actividad) => ({
                    codigo: actividad.codigo,
                    nombre: actividad.nombre,
                    operativa: actividad.operativa || TODAS_OPERATIVAS,
                    origen: actividad.origen
                }));
            const respuesta = await fetch("api/actividades", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(actividades).replace(
                    /[\u007f-\uffff]/g,
                    (caracter) => {
                        return `\\u${caracter.charCodeAt(0)
                            .toString(16).padStart(4, "0")}`;
                    }
                )
            });
            return respuesta.ok;
        } catch (error) {
            console.warn("El catálogo móvil aún no está disponible.", error);
            return false;
        }
    }

    function obtenerResumen() {
        const manuales = obtenerActividadesManuales(true);
        const wis = obtenerAplicacionesWisProtegidas();
        return {
            manuales: manuales.length,
            activas: manuales.filter((actividad) => actividad.activa).length,
            inactivas: manuales.filter((actividad) => !actividad.activa).length,
            wis: wis.length,
            disponiblesCatalogo:
                manuales.filter((actividad) => actividad.activa).length + wis.length
        };
    }

    globalThis.obtenerActividadesManuales = (incluirInactivas = true) => {
        return clonar(obtenerActividadesManuales(incluirInactivas));
    };
    globalThis.obtenerAplicacionesWisProtegidas = () => {
        return clonar(obtenerAplicacionesWisProtegidas());
    };
    globalThis.obtenerCatalogoActividades = (opciones = {}) => {
        return clonar(obtenerCatalogoUnificado(opciones));
    };
    globalThis.obtenerHistorialActividades = () => {
        return clonar(obtenerHistorialInterno());
    };
    globalThis.obtenerResumenActividades = obtenerResumen;
    globalThis.guardarActividadCatalogo = guardarActividad;
    globalThis.eliminarActividadCatalogo = eliminarActividad;
    globalThis.sincronizarCatalogoActividadesServidor = sincronizarCatalogoServidor;

    if (typeof globalThis.addEventListener === "function") {
        globalThis.addEventListener("storage", (evento) => {
            if (evento.key === CLAVE_CATALOGO) {
                catalogoMemoria = null;
                emitirActualizacion();
            }

            if (evento.key === CLAVE_HISTORIAL) {
                historialMemoria = [];
                emitirActualizacion();
            }
        });
    }

    if (typeof globalThis.setTimeout === "function") {
        globalThis.setTimeout(sincronizarCatalogoServidor, 0);
    }
})();
