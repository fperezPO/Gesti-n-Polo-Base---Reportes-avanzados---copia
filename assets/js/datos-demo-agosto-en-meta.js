/* Datos sintéticos: 10 embarques de agosto de 2026 que cumplen todas las metas. */
(() => {
    const MARCA = "demo-agosto-2026-en-meta-v1";

    function crear(id, operativa, llegada, control, crossdocking, almacenamiento, bultos) {
        const ahora = new Date().toISOString();
        return {
            id: `demo-agosto-meta-${id}`,
            referencia: `DEMO-AGO-META-${String(id).padStart(2, "0")}`,
            operativa,
            origen: id % 2 === 0 ? "Proveedor regional" : "Puerto de Montevideo",
            tipoCarga: id % 3 === 0 ? "Contenedor 20 pies" : "Contenedor 40 pies",
            bultos,
            fechaEstimadaArribo: llegada,
            fechaLlegada: llegada,
            fechaControlIngreso: control,
            fechaCrossdocking: crossdocking,
            fechaAlmacenamiento: almacenamiento,
            fechaConfirmada: llegada,
            fechaIngreso: control,
            fechaFinalizacion: almacenamiento,
            motivoRetraso: "",
            responsableResolucion: "",
            fechaPrevistaResolucion: "",
            observaciones: "Registro sintético de prueba. Cumple todas las metas operativas.",
            creadoPor: "demo",
            fechaRegistro: ahora,
            fechaActualizacion: ahora,
            esDatoDemo: true,
            marcaDemo: MARCA
        };
    }

    const REGISTROS = [
        crear(1, "Forum",     "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", 240),
        crear(2, "Decathlon", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", 315),
        crear(3, "Forum",     "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", 198),
        crear(4, "Decathlon", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", 420),
        crear(5, "Forum",     "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", 276),
        crear(6, "Decathlon", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", 352),
        crear(7, "Forum",     "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", 225),
        crear(8, "Decathlon", "2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26", 390),
        crear(9, "Forum",     "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", 304),
        crear(10,"Decathlon", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", 448)
    ];

    function cargar() {
        if (typeof obtenerEmbarques !== "function" || typeof guardarEmbarques !== "function") {
            setTimeout(cargar, 250);
            return;
        }
        const actuales = obtenerEmbarques();
        if (actuales.some((item) => item && item.marcaDemo === MARCA)) return;
        const referencias = new Set(actuales.map((item) => item && item.referencia));
        const nuevos = REGISTROS.filter((item) => !referencias.has(item.referencia));
        if (nuevos.length && guardarEmbarques([...actuales, ...nuevos])) {
            console.info(`${nuevos.length} embarques sintéticos de agosto agregados.`);
            if (typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        }
    }

    window.eliminarEmbarquesDemoAgosto = () => {
        if (typeof obtenerEmbarques !== "function" || typeof guardarEmbarques !== "function") return false;
        const restantes = obtenerEmbarques().filter((item) => item && item.marcaDemo !== MARCA);
        const resultado = guardarEmbarques(restantes);
        if (resultado && typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        return resultado;
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cargar, { once: true });
    } else {
        cargar();
    }
})();
