/* Datos sintéticos para validar indicadores de Embarques. */
(() => {
    const MARCA = "demo-sep-oct-2026-v1";
    const PREFIJO = "DEMO-2026-";

    function iso(fecha) {
        return fecha ? `${fecha}T12:00:00.000Z` : "";
    }

    function crear(id, operativa, eta, llegada, control, cross, almacenamiento, causa = "") {
        const ahora = new Date().toISOString();
        return {
            id: `demo-${id}`,
            referencia: `${PREFIJO}${id}`,
            operativa,
            origen: id % 2 ? "Puerto de Montevideo" : "Proveedor regional",
            tipoCarga: id % 3 ? "Contenedor 40 pies" : "Contenedor 20 pies",
            bultos: 180 + id * 37,
            fechaEstimadaArribo: eta,
            fechaLlegada: llegada,
            fechaControlIngreso: control,
            fechaCrossdocking: cross,
            fechaAlmacenamiento: almacenamiento,
            fechaConfirmada: llegada,
            fechaIngreso: control,
            fechaFinalizacion: almacenamiento,
            motivoRetraso: causa,
            responsableResolucion: causa ? (operativa === "Forum" ? "Equipo Forum" : "Equipo Decathlon") : "",
            fechaPrevistaResolucion: causa ? (eta.startsWith("2026-09") ? "2026-09-30" : "2026-10-31") : "",
            observaciones: `Registro sintético ${MARCA}. No corresponde a un embarque real.`,
            creadoPor: "demo",
            fechaRegistro: ahora,
            fechaActualizacion: ahora,
            esDatoDemo: true,
            marcaDemo: MARCA
        };
    }

    const DEMO = [
        crear(1,"Forum","2026-09-08","2026-09-08","2026-09-09","2026-09-10","2026-09-11"),
        crear(2,"Decathlon","2026-09-10","2026-09-11","2026-09-14","2026-09-16","2026-09-18","Documentación pendiente"),
        crear(3,"Forum","2026-09-14","2026-09-14","2026-09-15","2026-09-15","2026-09-16"),
        crear(4,"Decathlon","2026-09-18","2026-09-20","2026-09-23","2026-09-25","2026-09-28","Espera de proveedor"),
        crear(5,"Forum","2026-10-05","2026-10-05","2026-10-06","2026-10-06","2026-10-07"),
        crear(6,"Decathlon","2026-10-09","2026-10-10","2026-10-13","2026-10-15","2026-10-18","Falta de espacio"),
        crear(7,"Forum","2026-10-14","2026-10-14","2026-10-15","2026-10-16","2026-10-17"),
        crear(8,"Decathlon","2026-10-20","2026-10-22","2026-10-26","2026-10-28","2026-10-31","Bloqueo del sistema"),
        crear(9,"Forum","2026-09-22","","","",""),
        crear(10,"Decathlon","2026-09-25","","","",""),
        crear(11,"Forum","2026-09-29","","","",""),
        crear(12,"Decathlon","2026-10-03","","","",""),
        crear(13,"Forum","2026-10-08","","","",""),
        crear(14,"Decathlon","2026-10-16","","","",""),
        crear(15,"Forum","2026-10-24","","","",""),
        crear(16,"Decathlon","2026-10-29","","","","")
    ];

    function cargar() {
        if (typeof obtenerEmbarques !== "function" || typeof guardarEmbarques !== "function") {
            setTimeout(cargar, 250);
            return;
        }
        const actuales = obtenerEmbarques();
        if (actuales.some((item) => item && item.marcaDemo === MARCA)) return;
        const referencias = new Set(actuales.map((item) => item.referencia));
        const nuevos = DEMO.filter((item) => !referencias.has(item.referencia));
        if (nuevos.length && guardarEmbarques([...actuales, ...nuevos])) {
            console.info(`${nuevos.length} embarques sintéticos agregados para septiembre y octubre de 2026.`);
            if (typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        }
    }

    window.eliminarEmbarquesDemo = () => {
        if (typeof obtenerEmbarques !== "function" || typeof guardarEmbarques !== "function") return false;
        const reales = obtenerEmbarques().filter((item) => item && item.marcaDemo !== MARCA);
        const resultado = guardarEmbarques(reales);
        if (resultado && typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        return resultado;
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cargar, { once: true });
    } else {
        cargar();
    }
})();
