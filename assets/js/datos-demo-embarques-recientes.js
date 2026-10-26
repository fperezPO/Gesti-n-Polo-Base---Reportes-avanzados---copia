/*
 * Embarques sintéticos desde agosto de 2026 para las operativas de Mezzanine,
 * con el mismo ritmo que datos-demo-embarques-historico.js (unos 3 por
 * semana, con la misma estacionalidad): así agosto a octubre de 2026 se
 * comparan con los mismos meses de 2025 y hay embarques en curso y por
 * llegar. Decathlon y Forum ya tienen sus embarques de agosto a octubre en
 * datos-demo-agosto-en-meta.js y datos-demo-embarques.js, así que acá solo
 * se suman desde noviembre.
 * NO son embarques reales: referencias DEMO-R-2026-NNN e ids demo-r-2026-*.
 *
 * - Llegadas estimadas del 1/8/2026 hasta 4 semanas después de la carga
 *   (como máximo el 31/12/2026). Las etapas posteriores al día de la carga
 *   quedan sin fecha: unos embarques siguen en curso y otros, pendientes de
 *   llegada.
 * - Uno de cada 33 embarques se demora en una etapa y queda fuera de meta,
 *   como en 2026 del histórico (SLA ≈ 97 %).
 */
(() => {
    const MARCA = "demo-embarques-recientes-2026-v1";
    const DESDE = "2026-08-01";
    const HASTA_MAXIMO = "2026-12-31";
    const DIAS_POR_LLEGAR = 28;
    // Hasta esta fecha, Decathlon y Forum ya los cargan las otras demos.
    const HASTA_OTRAS_DEMOS = "2026-10-31";
    const SEMILLA = 20260801;
    const FUERA_DE_META_CADA = 33;

    const FERIADOS_NO_LABORABLES = new Set(["2026-08-25", "2026-12-25"]);
    // Igual que la demo del Trace: enero bajo, picos en marzo, julio y diciembre.
    const FACTOR_MES = [0.75, 0.9, 1.15, 0.95, 1.05, 1, 1.15, 1, 1, 1.05, 1.05, 1.15];
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
    const OPERATIVAS_CON_OTRA_DEMO = new Set(["Decathlon", "Forum"]);

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
        const hoy = fechaTexto(new Date());
        const limite = sumarDias(hoy, DIAS_POR_LLEGAR);
        const hasta = limite < HASTA_MAXIMO ? limite : HASTA_MAXIMO;
        // Una etapa con fecha posterior a hoy todavía no ocurrió.
        const ocurrida = (fecha) => (fecha && fecha <= hoy ? fecha : "");
        const embarques = [];
        const fecha = new Date(`${DESDE}T12:00:00`);
        const fin = new Date(`${hasta}T12:00:00`);

        while (fecha <= fin) {
            const eta = fechaTexto(fecha);
            const diaSemana = fecha.getDay();
            fecha.setDate(fecha.getDate() + 1);

            if (diaSemana === 0 || diaSemana === 6 || FERIADOS_NO_LABORABLES.has(eta)) {
                continue;
            }

            // Unos 3 embarques por semana: 0,6 por día hábil con estacionalidad.
            const esperados = 0.6 * FACTOR_MES[Number(eta.slice(5, 7)) - 1];
            const cantidad = Math.floor(esperados) + (aleatorio() < esperados % 1 ? 1 : 0);

            for (let i = 0; i < cantidad; i += 1) {
                const datos = elegirOperativa();
                const conCrossdocking = aleatorio() < 0.33;
                const sorteoEtapa = aleatorio();
                const sorteoLlegada = aleatorio();
                if (OPERATIVAS_CON_OTRA_DEMO.has(datos.operativa) && eta <= HASTA_OTRAS_DEMOS) continue;

                const numero = embarques.length + 1;
                const fueraDeMeta = numero % FUERA_DE_META_CADA === 0;
                // La etapa que se demora: control, crossdocking (si lo hay) o almacenamiento.
                const etapaTarde = !fueraDeMeta
                    ? ""
                    : sorteoEtapa < 0.45 ? "control"
                        : conCrossdocking && sorteoEtapa < 0.6 ? "crossdocking" : "almacenamiento";
                const llegada = sumarDias(eta, sorteoLlegada < 0.75 ? 0 : sorteoLlegada < 0.9 ? 1 : entero(2, 3));
                // 5 o 6 días: queda fuera aunque varios contenedores lleguen el mismo día.
                const control = sumarDias(llegada, etapaTarde === "control" ? entero(5, 6) : aleatorio() < 0.88 ? 1 : 2);
                const crossdocking = conCrossdocking
                    ? sumarDias(control, etapaTarde === "crossdocking" ? entero(3, 4) : entero(1, 2))
                    : "";
                const almacenamiento = sumarDias(control, etapaTarde === "almacenamiento" ? entero(4, 6) : entero(1, 3));
                const contenedor = aleatorio() < datos.contenedor;
                const tipoCarga = contenedor
                    ? (aleatorio() < 0.65 ? "Contenedor 40 pies" : "Contenedor 20 pies")
                    : (datos.operativa === "Unilog" && aleatorio() < 0.4 ? "Carga aérea" : "Camión");
                const motivo = fueraDeMeta && ocurrida(llegada) ? elegir(MOTIVOS) : "";
                const referencia = String(numero).padStart(3, "0");
                const diaRegistro = sumarDias(eta, -entero(7, 20));
                const registro = `${diaRegistro < hoy ? diaRegistro : hoy}T12:00:00.000Z`;
                const fechaLlegada = ocurrida(llegada);
                const fechaControl = fechaLlegada ? ocurrida(control) : "";
                const fechaCrossdocking = fechaControl ? ocurrida(crossdocking) : "";
                const fechaAlmacenamiento = fechaControl ? ocurrida(almacenamiento) : "";

                embarques.push({
                    id: `demo-r-2026-${referencia}`,
                    referencia: `DEMO-R-2026-${referencia}`,
                    operativa: datos.operativa,
                    origen: elegir(datos.origenes),
                    tipoCarga,
                    bultos: entero(datos.bultos[0], datos.bultos[1]),
                    fechaEstimadaArribo: eta,
                    fechaLlegada,
                    fechaControlIngreso: fechaControl,
                    fechaCrossdocking,
                    fechaAlmacenamiento,
                    fechaConfirmada: fechaLlegada,
                    fechaIngreso: fechaControl,
                    fechaFinalizacion: fechaAlmacenamiento,
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
            console.info(`${nuevos.length} embarques sintéticos agregados desde el 01/08/2026.`);
            if (typeof actualizarVistaEmbarques === "function") actualizarVistaEmbarques();
        }
    }

    window.eliminarEmbarquesDemoRecientes = () => {
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
