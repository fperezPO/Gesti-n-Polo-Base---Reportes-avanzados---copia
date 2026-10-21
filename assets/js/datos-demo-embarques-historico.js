/*
 * Embarques sintéticos del 21/12/2024 al 31/07/2026 para las operativas de
 * Mezzanine. Con ellos, Reportes y dashboards compara embarques, SLA y dock
 * to stock de cada ciclo 21–20 con el del año anterior (el ciclo de enero de
 * 2025 empieza el 21/12/2024). Agosto a octubre de 2026 ya los cargan
 * datos-demo-agosto-en-meta.js y datos-demo-embarques.js.
 * NO son embarques reales: referencias DEMO-H-AAAA-NNN e ids demo-h-*.
 *
 * - De lunes a viernes, sin feriados no laborables. Cada semana llegan unos
 *   3 embarques, con la misma estacionalidad mensual que la demo del Trace;
 *   2025 tiene un 10 % menos de volumen.
 * - Tiempos: llegada el día estimado o hasta 3 días después; control al día
 *   siguiente; crossdocking en un tercio de los embarques y almacenamiento
 *   en 1 a 3 días. Uno de cada 11 embarques de 2025 y uno de cada 33 de 2026
 *   se demora en una etapa y queda fuera de meta, con su motivo (SLA cerca
 *   del 91 % y del 97 %), así se ve la mejora de un año al otro.
 * - Las fechas son de día (sin hora), igual que el formulario de embarques.
 */
(() => {
    const MARCA = "demo-embarques-historico-2025-2026-v1";
    const DESDE = "2024-12-21";
    const HASTA = "2026-07-31";
    const SEMILLA = 20250102;

    const FERIADOS_NO_LABORABLES = new Set([
        "2024-12-25",
        "2025-01-01", "2025-05-01", "2025-07-18", "2025-08-25", "2025-12-25",
        "2026-01-01", "2026-05-01", "2026-07-18"
    ]);
    // Igual que la demo del Trace: enero bajo, picos en marzo, julio y diciembre.
    const FACTOR_MES = [0.75, 0.9, 1.15, 0.95, 1.05, 1, 1.15, 1, 1, 1.05, 1.05, 1.15];
    const FACTOR_ANO = { 2024: 0.9, 2025: 0.9, 2026: 1 };
    // Cada cuántos embarques del año uno queda fuera de meta (SLA ≈ 91 % y ≈ 97 %).
    const FUERA_DE_META_CADA = { 2024: 11, 2025: 11, 2026: 33 };
    const MOTIVOS = [
        "Documentación pendiente", "Diferencia de cantidades", "Falta de espacio",
        "Falta de personal", "Equipo no disponible", "Espera de proveedor",
        "Prioridad operativa"
    ];

    // Operativas de Mezzanine: peso en la llegada de embarques, bultos y cargas.
    const OPERATIVAS = [
        { operativa: "Decathlon", peso: 40, bultos: [260, 680], contenedor: 0.9, origenes: ["Puerto de Montevideo"] },
        { operativa: "Teleshopping", peso: 18, bultos: [120, 420], contenedor: 0.6, origenes: ["Puerto de Montevideo", "Proveedor regional"] },
        { operativa: "Kiabi", peso: 12, bultos: [150, 520], contenedor: 0.8, origenes: ["Puerto de Montevideo"] },
        { operativa: "Forum", peso: 10, bultos: [90, 360], contenedor: 0.5, origenes: ["Puerto de Montevideo", "Proveedor regional"] },
        { operativa: "Unilog", peso: 7, bultos: [40, 220], contenedor: 0.2, origenes: ["Proveedor regional", "Aeropuerto de Carrasco"] },
        { operativa: "Polakof", peso: 7, bultos: [80, 300], contenedor: 0.3, origenes: ["Proveedor regional"] },
        { operativa: "Dacrimar", peso: 3, bultos: [30, 140], contenedor: 0.4, origenes: ["Puerto de Montevideo"] },
        { operativa: "Diego Díaz", peso: 3, bultos: [30, 160], contenedor: 0.3, origenes: ["Proveedor regional"] }
    ];

    function crearAleatorio(semilla) {
        let estado = semilla >>> 0;
        return () => {
            estado = (estado + 0x6D2B79F5) | 0;
            let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function fechaTexto(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    function sumarDias(texto, dias) {
        const fecha = new Date(`${texto}T12:00:00`);
        fecha.setDate(fecha.getDate() + dias);
        return fechaTexto(fecha);
    }

    function generar() {
        const aleatorio = crearAleatorio(SEMILLA);
        const entero = (minimo, maximo) => minimo + Math.floor(aleatorio() * (maximo - minimo + 1));
        const elegir = (lista) => lista[Math.floor(aleatorio() * lista.length)];
        const pesoTotal = OPERATIVAS.reduce((total, item) => total + item.peso, 0);
        const elegirOperativa = () => {
            let objetivo = aleatorio() * pesoTotal;
            return OPERATIVAS.find((item) => (objetivo -= item.peso) < 0) || OPERATIVAS[0];
        };
        const embarques = [];
        const contadorPorAno = {};
        const fecha = new Date(`${DESDE}T12:00:00`);
        const fin = new Date(`${HASTA}T12:00:00`);

        while (fecha <= fin) {
            const eta = fechaTexto(fecha);
            const diaSemana = fecha.getDay();
            const ano = fecha.getFullYear();
            fecha.setDate(fecha.getDate() + 1);

            if (diaSemana === 0 || diaSemana === 6 || FERIADOS_NO_LABORABLES.has(eta)) {
                continue;
            }

            // Unos 3 embarques por semana: 0,6 por día hábil con estacionalidad.
            const esperados = 0.6 * FACTOR_MES[Number(eta.slice(5, 7)) - 1] * (FACTOR_ANO[ano] || 1);
            const cantidad = Math.floor(esperados) + (aleatorio() < esperados % 1 ? 1 : 0);

            for (let i = 0; i < cantidad; i += 1) {
                const datos = elegirOperativa();
                contadorPorAno[ano] = (contadorPorAno[ano] || 0) + 1;
                const cada = FUERA_DE_META_CADA[ano] || FUERA_DE_META_CADA[2026];
                const fueraDeMeta = contadorPorAno[ano] % cada === 0;
                const conCrossdocking = aleatorio() < 0.33;
                // La etapa que se demora: control, crossdocking (si lo hay) o almacenamiento.
                const sorteoEtapa = aleatorio();
                const etapaTarde = !fueraDeMeta
                    ? ""
                    : sorteoEtapa < 0.45 ? "control"
                        : conCrossdocking && sorteoEtapa < 0.6 ? "crossdocking" : "almacenamiento";
                const sorteoLlegada = aleatorio();
                const llegada = sumarDias(eta, sorteoLlegada < 0.75 ? 0 : sorteoLlegada < 0.9 ? 1 : entero(2, 3));
                const controlTarde = etapaTarde === "control";
                // 5 o 6 días: queda fuera aunque varios contenedores lleguen el mismo día.
                const control = sumarDias(llegada, controlTarde ? entero(5, 6) : aleatorio() < 0.88 ? 1 : 2);
                const crossTarde = etapaTarde === "crossdocking";
                const crossdocking = conCrossdocking
                    ? sumarDias(control, crossTarde ? entero(3, 4) : entero(1, 2))
                    : "";
                const almacenTarde = etapaTarde === "almacenamiento";
                const almacenamiento = sumarDias(control, almacenTarde ? entero(4, 6) : entero(1, 3));
                const contenedor = aleatorio() < datos.contenedor;
                const tipoCarga = contenedor
                    ? (aleatorio() < 0.65 ? "Contenedor 40 pies" : "Contenedor 20 pies")
                    : (datos.operativa === "Unilog" && aleatorio() < 0.4 ? "Carga aérea" : "Camión");
                const motivo = fueraDeMeta ? elegir(MOTIVOS) : "";
                const numero = String(contadorPorAno[ano]).padStart(3, "0");
                const registro = `${sumarDias(eta, -entero(7, 20))}T12:00:00.000Z`;

                embarques.push({
                    id: `demo-h-${ano}-${numero}`,
                    referencia: `DEMO-H-${ano}-${numero}`,
                    operativa: datos.operativa,
                    origen: elegir(datos.origenes),
                    tipoCarga,
                    bultos: entero(datos.bultos[0], datos.bultos[1]),
                    fechaEstimadaArribo: eta,
                    fechaLlegada: llegada,
                    fechaControlIngreso: control,
                    fechaCrossdocking: crossdocking,
                    fechaAlmacenamiento: almacenamiento,
                    fechaConfirmada: llegada,
                    fechaIngreso: control,
                    fechaFinalizacion: almacenamiento,
                    motivoRetraso: motivo,
                    responsableResolucion: motivo ? `Equipo ${datos.operativa}` : "",
                    fechaPrevistaResolucion: motivo ? almacenamiento : "",
                    observaciones: `Registro sintético ${MARCA}. No corresponde a un embarque real.`,
                    creadoPor: "demo",
                    fechaRegistro: registro,
                    fechaActualizacion: registro,
                    esDatoDemo: true,
                    marcaDemo: MARCA
                });
            }
        }

        return embarques;
    }

    function cargar() {
        if (typeof obtenerEmbarques !== "function" || typeof guardarEmbarques !== "function") {
            setTimeout(cargar, 250);
            return;
        }
        const actuales = obtenerEmbarques();
        if (actuales.some((item) => item && item.marcaDemo === MARCA)) return;
        const referencias = new Set(actuales.map((item) => item && item.referencia));
        const nuevos = generar().filter((item) => !referencias.has(item.referencia));
        if (nuevos.length && guardarEmbarques([...actuales, ...nuevos])) {
            console.info(`${nuevos.length} embarques sintéticos agregados del 21/12/2024 al 31/07/2026.`);
            if (typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        }
    }

    window.eliminarEmbarquesDemoHistorico = () => {
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
