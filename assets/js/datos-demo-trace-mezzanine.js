/*
 * Datos sintéticos del Trace de stock WIS para la operativa física Mezzanine
 * (versión de prueba pesada). Sirven para ver cómo se comportan Reportes y
 * dashboards y el mapa de calor con mucho volumen; NO son movimientos reales.
 *
 * - Período: 2024-12-21 (inicio del ciclo 21–20 de enero de 2025) hasta ayer
 *   (como máximo 2026-10-31), así cada ciclo de 2026 se puede comparar con
 *   el ciclo completo del año anterior. Lunes a viernes en dos
 *   turnos y sábados de mañana. Sin domingos ni feriados no laborables; los
 *   feriados laborables (Reyes, Carnaval, Turismo…) tienen media dotación.
 *   Cada mes tiene un factor de estacionalidad y 2025 tiene un 10 % menos de
 *   dotación que 2026 (crecimiento interanual).
 * - Operarios: usuarios MZ de la exportación SEG030 (Login Name), sin las
 *   cuentas RF duplicadas. Cada uno con rol y turno fijos.
 * - Empresas: las de Mezzanine del catálogo (catalogo-empresas.js), cada una
 *   en su zona del maestro assets/data/ubicaciones-mezzanine.json.
 * - Aplicaciones que mueven el mapa: almacenamiento (REC510/REC522), picking
 *   (PRD095), transferencias (TRA110: reabastecimiento y reubicación, con
 *   fila − en el origen y + en el destino) e inventario (INV414/INV540).
 *   Además recepción (REC501) y expedición (EXP040). Todo lo pickeado se
 *   expide el mismo día, en oleadas, por un único operario: picking =
 *   expedición en cualquier rango de días.
 *
 * Se guarda como una importación del Trace por mes (con esDatoDemo), así se
 * puede eliminar mes a mes desde el historial de Reportes; lo eliminado no se
 * vuelve a crear. Para regenerar todo: regenerarTraceDemoMezzanine().
 *
 * TRA110 es un código provisorio: si el WIS usa otro para las transferencias,
 * cambiá APLICACION_TRANSFERENCIA y la regla en Consulta de tareas.
 */
(() => {
    const MARCA = "demo-trace-mezzanine-2025-2026-v4";
    const MARCAS_ANTERIORES = [
        "demo-trace-mezzanine-2026-v1",
        "demo-trace-mezzanine-2026-v2",
        "demo-trace-mezzanine-2025-2026-v3"
    ];
    const CLAVE_ESTADO = "gestion_personal_demo_trace_mezzanine";
    const RUTA_MAESTRO = "assets/data/ubicaciones-mezzanine.json";
    const DESDE = "2024-12-21";
    const HASTA_MAXIMO = "2026-10-31";
    const SEMILLA = 20261004;

    // Feriados de Uruguay 2024 a 2026: sin actividad o con media dotación.
    const FERIADOS_NO_LABORABLES = new Set([
        "2024-12-25",
        "2025-01-01", "2025-05-01", "2025-07-18", "2025-08-25", "2025-12-25",
        "2026-01-01", "2026-05-01", "2026-07-18", "2026-08-25"
    ]);
    const FERIADOS_LABORABLES = new Set([
        "2025-01-06", "2025-03-03", "2025-03-04",
        "2025-04-14", "2025-04-15", "2025-04-16", "2025-04-17", "2025-04-18",
        "2025-06-19",
        "2026-01-06", "2026-02-16", "2026-02-17",
        "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-03",
        "2026-05-18", "2026-06-19", "2026-10-12"
    ]);
    // Estacionalidad: enero bajo (vacaciones), picos en marzo (inicio de clases),
    // julio y diciembre (fiestas).
    const FACTOR_MES = [0.75, 0.9, 1.15, 0.95, 1.05, 1, 1.15, 1, 1, 1.05, 1.05, 1.15];
    // Crecimiento interanual: hasta 2025 se trabaja con un 10 % menos de dotación.
    const FACTOR_ANO = { 2024: 0.9, 2025: 0.9, 2026: 1 };

    const APLICACION_TRANSFERENCIA = "TRA110";
    const OPERARIO_EXPEDICION = "dacosta";
    // SEG030 · usuarios (MZ), sin cuentas RF ni duplicados.
    const OPERARIOS = [
        "dfabras", "ncasafus", "ctettoni", "darodriguez", "pduarte",
        "oguedes", "fmacedo", "rballe", "mquatrocchi", "apintos",
        "tgonzalez", "emachado", "lfernandez", "golivera", "sdasilva",
        "sfinamore", "scastro", "naguilera", "jcustodio", "mtarragona",
        "valmeida", "bvillanova", "eescobar", "nchagas", "kgimenez",
        "pgalvan", "ftorresn", "jvega", "lcoitiñio", "virigaray",
        "anlopez", "agarrido", "pfernandez", "emolina", "fbertolini",
        "gguo", "jbusnelli", "ofonseca", "jnievas", "bfleitas", "blescano"
    ];

    const APLICACIONES = {
        REC501: "Recepción",
        REC510: "Almacenamiento Agrupado",
        REC522: "Almacenamiento Fraccionado",
        PRD095: "Preparación de Picking",
        EXP040: "Expedición",
        INV414: "Inventario por Ubicación",
        INV540: "Ajuste de Inventario",
        [APLICACION_TRANSFERENCIA]: "Transferencia entre Ubicaciones"
    };

    /*
     * Reglas de la transferencia: el destino (+) suma unidades operativas y el
     * origen (−) solo marca la visita en el mapa, para no contar dos veces.
     */
    const REGLAS_TRANSFERENCIA = [
        { signo: "positivo", categoriaVolumen: "operativo" },
        { signo: "negativo", categoriaVolumen: "ninguno" }
    ].map((regla) => ({
        operativa: "*",
        aplicacion: APLICACION_TRANSFERENCIA,
        descripcionAplicacion: "*",
        actividad: "Transferencia",
        estado: "incluido",
        cuentaOperacion: true,
        participaMapa: true,
        visibleInicio: false,
        ...regla
    }));

    const VARIANTES_TALLE = ["XS", "S", "M", "L", "XL"];
    const VARIANTES_COLOR = ["negro", "azul", "gris", "rojo", "verde", "blanco"];

    const PRODUCTOS_DECATHLON = {
        Agua: ["Gafas de natación", "Malla de natación", "Gorra de silicona", "Tabla de natación", "Aletas cortas", "Traje de neopreno"],
        Ciclismo: ["Cámara 700x25", "Casco de ciclismo", "Luz LED trasera", "Inflador de pie", "Guantes de ciclismo", "Candado en U"],
        Colectivos: ["Pelota de fútbol N°5", "Canilleras", "Pelota de básquet N°7", "Red de vóley", "Botines de fútbol", "Conos de entrenamiento"],
        Ecomm: ["Pack e-commerce", "Bolsa de envío", "Kit de pedido web"],
        Fitness: ["Mancuerna 5 kg", "Colchoneta de yoga", "Banda elástica", "Rueda abdominal", "Soga de saltar", "Kettlebell 8 kg"],
        Individuales: ["Paleta de pádel", "Raqueta de tenis", "Pelotas de pádel x3", "Grip de raqueta", "Muñequera"],
        Insumos: ["Cinta de embalaje", "Etiqueta térmica", "Film stretch", "Caja de cartón M"],
        "Montaña": ["Mochila de trekking 30 L", "Bastón de trekking", "Carpa 2 personas", "Linterna frontal", "Bolsa de dormir", "Campera impermeable"]
    };

    /*
     * Empresas de Mezzanine. `peso` es su parte de la actividad; `zona`
     * indica qué ubicaciones del maestro usa; los rangos son unidades por
     * línea de picking y por tarea de almacenamiento.
     */
    const EMPRESAS = [
        { codigo: 6000, prefijo: "DT", digitos: 7, peso: 48, zona: "decathlon", picking: [1, 3], almacen: [4, 24] },
        { codigo: 6001, prefijo: "TS", digitos: 6, peso: 20, zona: "teleshopping", picking: [1, 2], almacen: [2, 20], productos: ["Freidora de aire 4 L", "Aspiradora ciclónica", "Batidora de mano", "Plancha a vapor", "Set de sartenes", "Masajeador cervical", "Organizador de placard", "Licuadora portátil"], variantes: VARIANTES_COLOR },
        { codigo: 6002, prefijo: "KB", digitos: 6, peso: 9, zona: "general", picking: [1, 6], almacen: [10, 60], productos: ["Remera de algodón", "Jean slim", "Buzo con capucha", "Vestido estampado", "Pijama infantil", "Medias pack x3"], variantes: VARIANTES_TALLE },
        { codigo: 6005, prefijo: "FR", digitos: 6, peso: 8, zona: "general", picking: [1, 4], almacen: [6, 40], productos: ["Camisa oxford", "Pantalón chino", "Campera de jean", "Sweater de lana", "Cinturón de cuero", "Remera básica"], variantes: VARIANTES_TALLE },
        { codigo: 6003, prefijo: "UL", digitos: 6, peso: 5, zona: "general", picking: [1, 10], almacen: [10, 80], productos: ["Bulto paquetería", "Caja de repuestos", "Bulto e-commerce", "Sobre documentación"] },
        { codigo: 6009, prefijo: "PK", digitos: 6, peso: 4, zona: "general", picking: [2, 24], almacen: [24, 120], productos: ["Arroz 1 kg", "Fideos 500 g", "Aceite de girasol 900 ml", "Harina 000 1 kg", "Yerba 1 kg", "Azúcar 1 kg"] },
        { codigo: 6008, prefijo: "DC", digitos: 6, peso: 2.5, zona: "general", picking: [1, 8], almacen: [6, 48], productos: ["Repuesto náutico", "Cabo de amarre", "Chaleco salvavidas", "Kit de pintura náutica"] },
        { codigo: 6030, prefijo: "DD", digitos: 6, peso: 2, zona: "general", picking: [1, 5], almacen: [5, 30], productos: ["Caja de mercadería general", "Bulto consolidado", "Caja de herramientas"] },
        { codigo: 6010, prefijo: "PP", digitos: 6, peso: 1.5, zona: "general", picking: [1, 4], almacen: [4, 20], productos: ["Pallet mixto almacén", "Pallet bebidas", "Pallet secos"] }
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

    function crearAzar(semilla) {
        const aleatorio = crearAleatorio(semilla);
        const entero = (minimo, maximo) => minimo + Math.floor(aleatorio() * (maximo - minimo + 1));
        return {
            aleatorio,
            entero,
            elegir: (lista) => lista[Math.floor(aleatorio() * lista.length)],
            barajar(lista) {
                const copia = [...lista];
                for (let i = copia.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(aleatorio() * (i + 1));
                    [copia[i], copia[j]] = [copia[j], copia[i]];
                }
                return copia;
            }
        };
    }

    /* Elección ponderada con suma acumulada y búsqueda binaria. */
    function crearSelectorPonderado(elementos, pesos, azar) {
        const acumulado = new Float64Array(pesos.length);
        let total = 0;
        pesos.forEach((peso, indice) => {
            total += peso;
            acumulado[indice] = total;
        });

        return () => {
            const objetivo = azar.aleatorio() * total;
            let bajo = 0;
            let alto = acumulado.length - 1;
            while (bajo < alto) {
                const medio = (bajo + alto) >> 1;
                if (acumulado[medio] < objetivo) bajo = medio + 1;
                else alto = medio;
            }
            return elementos[bajo];
        };
    }

    // Altura según el patrón WIS de Mezzanine: piso · calle(2) · módulo(3) · altura(2) · control(2).
    function obtenerAltura(codigo) {
        return /^[XYZ]\d{5}(\d{2}|5A)\d{2}$/.test(codigo) ? codigo.slice(6, 8) : "";
    }

    function factorPicking(altura) {
        return altura === "10" || altura === "20" ? 3 : altura === "30" ? 1 : 0.35;
    }

    function factorAlmacen(altura) {
        return altura === "30" || altura === "40" || altura === "5A" ? 1.6 : 1;
    }

    function ordenarPorAltura(codigos, factor) {
        return codigos.slice().sort((a, b) => factor(obtenerAltura(b)) - factor(obtenerAltura(a)));
    }

    function formatearCodigoProducto(empresa, indice) {
        const base = empresa.digitos === 7 ? 5000000 : 100000;
        const rango = empresa.digitos === 7 ? 4999999 : 899999;
        return `${empresa.prefijo}${base + ((indice * 7919 + empresa.codigo) % rango)}`;
    }

    // Decathlon: productos y variante (talle o color) según el tipo de ubicación.
    function obtenerCatalogoProductos(empresa, nombreTipo) {
        if (empresa.zona !== "decathlon") {
            return { productos: empresa.productos, variantes: empresa.variantes };
        }
        const categoria = Object.keys(PRODUCTOS_DECATHLON).find((clave) => {
            return nombreTipo.includes(clave);
        }) || "Colectivos";
        const variantes = ["Insumos", "Ecomm"].includes(categoria)
            ? null
            : ["Ciclismo", "Fitness"].includes(categoria) ? VARIANTES_COLOR : VARIANTES_TALLE;
        return { productos: PRODUCTOS_DECATHLON[categoria], variantes };
    }

    /*
     * Cada empresa recibe sus ubicaciones del maestro, agrupadas de a tres
     * contiguas (un módulo, un producto por grupo). La popularidad sigue una
     * curva tipo Zipf con lógica física: los módulos cercanos al inicio del
     * pasillo y las calles centrales se mueven más, con ruido.
     */
    function armarZonas(maestro, azar) {
        const porTipo = new Map();
        Object.entries(maestro.ubicaciones || {}).forEach(([codigo, tipo]) => {
            if (!porTipo.has(tipo)) porTipo.set(tipo, []);
            porTipo.get(tipo).push(codigo);
        });
        const tipos = maestro.tipos || [];
        const codigosDeTipos = (filtro) => tipos
            .map((nombre, indice) => ({ nombre, indice }))
            .filter(({ nombre }) => filtro(nombre))
            .flatMap(({ nombre, indice }) => (porTipo.get(indice) || []).map((codigo) => ({ codigo, nombreTipo: nombre })))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));

        const decathlon = codigosDeTipos((nombre) => nombre.startsWith("MZ Decathlon"));
        const teleshopping = codigosDeTipos((nombre) => nombre === "MZ Teleshopping");
        const general = codigosDeTipos((nombre) => nombre === "Mezanine");
        const empresasGenerales = EMPRESAS.filter((empresa) => empresa.zona === "general");
        const tramo = Math.floor(general.length / empresasGenerales.length);

        return new Map(EMPRESAS.map((empresa) => {
            const posicionGeneral = empresasGenerales.indexOf(empresa);
            const ubicaciones = empresa.zona === "decathlon"
                ? decathlon
                : empresa.zona === "teleshopping"
                    ? teleshopping
                    : general.slice(posicionGeneral * tramo, (posicionGeneral + 1) * tramo);
            const grupos = [];
            for (let i = 0; i < ubicaciones.length; i += 3) {
                const parte = ubicaciones.slice(i, i + 3);
                const indice = grupos.length;
                const { productos, variantes } = obtenerCatalogoProductos(empresa, parte[0].nombreTipo);
                const variante = variantes ? ` · ${variantes[indice % variantes.length]}` : "";
                grupos.push({
                    codigos: parte.map((item) => item.codigo),
                    producto: {
                        codigo: formatearCodigoProducto(empresa, indice),
                        descripcion: `${productos[(indice * 7) % productos.length]}${variante}`
                    }
                });
            }

            const posicion = (codigo) => {
                const partes = /^[XYZ](\d{2})(\d{3})/.exec(codigo);
                return partes ? { calle: Number(partes[1]), modulo: Number(partes[2]) } : { calle: 0, modulo: 0 };
            };
            const posiciones = grupos.map((grupo) => posicion(grupo.codigos[0]));
            const maximoModulo = Math.max(1, ...posiciones.map((item) => item.modulo));
            const calles = posiciones.map((item) => item.calle);
            const calleCentral = (Math.min(...calles) + Math.max(...calles)) / 2;
            const amplitudCalles = Math.max(1, Math.max(...calles) - Math.min(...calles));
            const puntajes = posiciones.map((item) => {
                return (item.modulo / maximoModulo) * 0.55 +
                    (Math.abs(item.calle - calleCentral) / amplitudCalles) * 0.35 +
                    azar.aleatorio() * 0.4;
            });
            const orden = grupos.map((_, indice) => indice).sort((a, b) => puntajes[a] - puntajes[b]);
            const rangos = new Array(grupos.length);
            orden.forEach((indiceGrupo, rango) => {
                rangos[indiceGrupo] = rango;
            });
            const popularidad = grupos.map((_, indice) => 1 / Math.pow(rangos[indice] + 6, 1.05));
            const alturaMedia = (grupo, factor) => grupo.codigos
                .reduce((suma, codigo) => suma + factor(obtenerAltura(codigo)), 0) / grupo.codigos.length;

            return [empresa.codigo, {
                elegirPicking: crearSelectorPonderado(grupos, grupos.map((grupo, i) => popularidad[i] * alturaMedia(grupo, factorPicking)), azar),
                elegirAlmacen: crearSelectorPonderado(grupos, grupos.map((grupo, i) => Math.sqrt(popularidad[i]) * alturaMedia(grupo, factorAlmacen)), azar)
            }];
        }));
    }

    function fechaTexto(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    // Hasta ayer: la demo llega hasta "la actualidad" sin inventar el día en curso.
    function obtenerHasta() {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const texto = fechaTexto(ayer);
        return texto < HASTA_MAXIMO ? texto : HASTA_MAXIMO;
    }

    function listarDias(desde, hasta) {
        const dias = [];
        const fecha = new Date(`${desde}T12:00:00`);
        const fin = new Date(`${hasta}T12:00:00`);
        while (fecha <= fin) {
            const texto = fechaTexto(fecha);
            const diaSemana = fecha.getDay();
            if (diaSemana !== 0 && !FERIADOS_NO_LABORABLES.has(texto)) {
                dias.push({
                    fecha: texto,
                    sabado: diaSemana === 6,
                    factor: FACTOR_MES[fecha.getMonth()] *
                        (FACTOR_ANO[fecha.getFullYear()] || 1) *
                        (FERIADOS_LABORABLES.has(texto) ? 0.5 : 1)
                });
            }
            fecha.setDate(fecha.getDate() + 1);
        }
        return dias;
    }

    function horaTexto(segundosDelDia) {
        const total = Math.max(0, Math.round(segundosDelDia));
        return [
            Math.floor(total / 3600),
            Math.floor((total % 3600) / 60),
            total % 60
        ].map((parte) => String(parte).padStart(2, "0")).join(":");
    }

    /*
     * Generador determinista: los días se generan en orden con un único
     * azar, así cada mes sale siempre igual aunque la demo se corte en otra
     * fecha.
     */
    function crearGeneradorDemoMezzanine(maestro) {
        if (typeof obtenerEmpresaWisPorCodigo !== "function") {
            throw new Error("Falta catalogo-empresas.js.");
        }

        const azar = crearAzar(SEMILLA);
        const zonas = armarZonas(maestro, azar);
        const datosEmpresa = new Map(EMPRESAS.map((empresa) => [empresa.codigo, obtenerEmpresaWisPorCodigo(empresa.codigo)]));
        const elegirEmpresa = crearSelectorPonderado(EMPRESAS, EMPRESAS.map((empresa) => empresa.peso), azar);
        const muelleExpedicion = new Map(EMPRESAS.map((empresa, indice) => [empresa.codigo, `1MPUE${String(indice + 1).padStart(2, "0")}`]));

        // Roles y turnos fijos por operario.
        const plantel = azar.barajar(OPERARIOS.filter((usuario) => usuario !== OPERARIO_EXPEDICION))
            .map((usuario, indice) => ({
                usuario,
                rol: indice < 2 ? "recepcion"
                    : indice < 3 ? "inventario"
                    : indice < 7 ? "transferencia"
                    : indice % 5 < 2 ? "almacenamiento" : "picking",
                turno: indice % 2 ? "tarde" : "manana"
            }));
        // Equipos por rol y turno, para decidir la dotación de cada día.
        const equipos = new Map();
        plantel.forEach((operario) => {
            const clave = `${operario.rol}|${operario.turno}`;
            if (!equipos.has(clave)) equipos.set(clave, []);
            equipos.get(clave).push(operario);
        });

        const crearFila = (dia, segundos, usuario, aplicacion, ubicacion, producto, movimiento, codigoEmpresa) => {
            const empresa = datosEmpresa.get(codigoEmpresa);
            return {
                fechaHora: `${dia}T${horaTexto(segundos)}`,
                fechaDia: dia,
                usuario,
                aplicacion,
                descripcionAplicacion: APLICACIONES[aplicacion],
                producto: producto.codigo,
                descripcion: producto.descripcion,
                ubicacion,
                movimiento,
                cantidad: movimiento,
                codigoEmpresa,
                empresa: empresa.nombre,
                operativa: empresa.operativa,
                operativaFisica: empresa.operativaFisica
            };
        };

        function generarDia({ fecha, sabado, factor }) {
            const filas = [];
            const turnos = sabado
                ? { manana: [6 * 3600, 12 * 3600] }
                : { manana: [6 * 3600, 14 * 3600], tarde: [14 * 3600, 22 * 3600] };
            /*
             * Dotación del día por rol y turno: la parte esperada del equipo
             * con redondeo al azar (2,4 personas → 2 o 3, en promedio 2,4).
             * Así el volumen sigue a la estacionalidad y al año sin el ruido
             * de sortear a cada operario por separado.
             */
            const elegidos = new Set();
            equipos.forEach((miembros, clave) => {
                const [rol, turno] = clave.split("|");
                if (!turnos[turno]) return;
                const base = rol === "recepcion" ? 0.85
                    : rol === "inventario" ? 0.6
                    : rol === "transferencia" ? 0.7
                    : sabado ? 0.25 : 0.32;
                const esperado = miembros.length * Math.min(0.95, base * factor);
                const cantidad = Math.min(miembros.length, Math.floor(esperado + azar.aleatorio()));
                azar.barajar(miembros).slice(0, cantidad).forEach((operario) => elegidos.add(operario));
            });
            const presentes = plantel.filter((operario) => elegidos.has(operario));
            const receptores = presentes.filter((operario) => operario.rol === "recepcion");
            const colaPicking = [];

            presentes.forEach((operario) => {
                const [inicio, fin] = turnos[operario.turno];
                const descanso = inicio + (fin - inicio) / 2 + azar.entero(-1800, 1800);
                let t = inicio + azar.entero(300, 1200);
                let descansoTomado = false;
                const avanzar = (minimo, maximo) => {
                    t += azar.entero(minimo, maximo);
                    if (!descansoTomado && t > descanso) {
                        t += 1800;
                        descansoTomado = true;
                    }
                };

                if (operario.rol === "picking") {
                    while (t < fin - 900) {
                        const empresa = elegirEmpresa();
                        const zona = zonas.get(empresa.codigo);
                        const lineas = azar.entero(2, 10);
                        for (let i = 0; i < lineas && t < fin - 600; i += 1) {
                            const grupo = zona.elegirPicking();
                            const ubicacion = ordenarPorAltura(grupo.codigos, factorPicking)[0];
                            const unidades = azar.entero(empresa.picking[0], empresa.picking[1]);
                            filas.push(crearFila(fecha, t, operario.usuario, "PRD095", ubicacion, grupo.producto, -unidades, empresa.codigo));
                            colaPicking.push({ t, empresa, producto: grupo.producto, unidades });
                            avanzar(150, 480);
                        }
                        avanzar(120, 420);
                    }
                } else if (operario.rol === "almacenamiento") {
                    while (t < fin - 900) {
                        const empresa = elegirEmpresa();
                        const grupo = zonas.get(empresa.codigo).elegirAlmacen();
                        const total = azar.entero(empresa.almacen[0], empresa.almacen[1]);
                        const receptor = receptores.length ? azar.elegir(receptores).usuario : operario.usuario;
                        const recepcion = Math.max(inicio - 900, t - azar.entero(900, 5400));
                        filas.push(crearFila(fecha, recepcion, receptor, "REC501", `1MREC0${azar.entero(1, 3)}`, grupo.producto, total, empresa.codigo));

                        const puestos = Math.min(grupo.codigos.length, azar.entero(1, 3));
                        let restante = total;
                        for (let i = 0; i < puestos; i += 1) {
                            const unidades = i === puestos - 1 ? restante : Math.max(1, Math.round(total / puestos));
                            restante -= unidades;
                            if (unidades <= 0) break;
                            const aplicacion = unidades >= 24 ? "REC510" : "REC522";
                            filas.push(crearFila(fecha, t, operario.usuario, aplicacion, grupo.codigos[i], grupo.producto, unidades, empresa.codigo));
                            avanzar(300, 780);
                        }
                        avanzar(120, 360);
                    }
                } else if (operario.rol === "transferencia") {
                    /*
                     * 70 %: reabastecimiento dentro del módulo (de altura alta a la
                     * posición de picking). 30 %: reubicación hacia otra zona de
                     * la misma empresa. Fila − en el origen y + en el destino.
                     */
                    while (t < fin - 900) {
                        const empresa = elegirEmpresa();
                        const zona = zonas.get(empresa.codigo);
                        const reabastecimiento = azar.aleatorio() < 0.7;
                        const grupoOrigen = reabastecimiento ? zona.elegirPicking() : zona.elegirAlmacen();
                        const origen = ordenarPorAltura(grupoOrigen.codigos, factorAlmacen)[0];
                        const destino = reabastecimiento
                            ? ordenarPorAltura(grupoOrigen.codigos, factorPicking)[0]
                            : ordenarPorAltura(zona.elegirPicking().codigos, factorPicking)[0];
                        if (origen === destino) {
                            avanzar(60, 120);
                            continue;
                        }
                        const unidades = Math.max(1, Math.round(azar.entero(empresa.almacen[0], empresa.almacen[1]) / 2));
                        filas.push(crearFila(fecha, t, operario.usuario, APLICACION_TRANSFERENCIA, origen, grupoOrigen.producto, -unidades, empresa.codigo));
                        avanzar(60, 240);
                        filas.push(crearFila(fecha, t, operario.usuario, APLICACION_TRANSFERENCIA, destino, grupoOrigen.producto, unidades, empresa.codigo));
                        avanzar(240, 600);
                    }
                } else if (operario.rol === "inventario") {
                    while (t < fin - 1800) {
                        const empresa = elegirEmpresa();
                        const grupo = zonas.get(empresa.codigo).elegirAlmacen();
                        const sorteo = azar.aleatorio();
                        const aplicacion = sorteo < 0.85 ? "INV414" : "INV540";
                        const unidades = sorteo < 0.7 || sorteo >= 0.85 ? azar.entero(1, 4) : -azar.entero(1, 3);
                        filas.push(crearFila(fecha, t, operario.usuario, aplicacion, azar.elegir(grupo.codigos), grupo.producto, unidades, empresa.codigo));
                        avanzar(600, 1500);
                    }
                }
                // Los receptores solo registran REC501 (asociados a cada almacenamiento).
            });

            /*
             * Expedición: un único operario despacha en oleadas todo lo
             * pickeado antes de cada una. La última es posterior al cierre del
             * turno, así lo pickeado en el día se expide el mismo día.
             */
            const oleadas = (sabado ? [9, 12.25] : [10, 13, 16, 19, 22.25]).map((hora) => hora * 3600);
            const pendientes = colaPicking.sort((a, b) => a.t - b.t);
            let indicePendiente = 0;
            oleadas.forEach((oleada) => {
                const agrupado = new Map();
                while (indicePendiente < pendientes.length && pendientes[indicePendiente].t < oleada) {
                    const item = pendientes[indicePendiente];
                    const clave = `${item.empresa.codigo}|${item.producto.codigo}`;
                    if (!agrupado.has(clave)) agrupado.set(clave, { ...item, unidades: 0 });
                    agrupado.get(clave).unidades += item.unidades;
                    indicePendiente += 1;
                }
                let t = oleada + azar.entero(60, 300);
                agrupado.forEach((item) => {
                    filas.push(crearFila(fecha, t, OPERARIO_EXPEDICION, "EXP040", muelleExpedicion.get(item.empresa.codigo), item.producto, -item.unidades, item.empresa.codigo));
                    t += azar.entero(20, 75);
                });
            });

            return filas;
        }

        return { generarDia };
    }

    /*
     * Recorre los meses (AAAA-MM) del más antiguo al más reciente y entrega
     * los movimientos de cada uno. Se genera un mes por vez para no tener
     * toda la demo en memoria mientras se guarda.
     */
    function* generarMesesDemoMezzanine(maestro, hasta = obtenerHasta()) {
        const generador = crearGeneradorDemoMezzanine(maestro);
        let mes = "";
        let filas = [];

        for (const dia of listarDias(DESDE, hasta)) {
            const mesDia = dia.fecha.slice(0, 7);
            if (mes && mesDia !== mes) {
                yield [mes, filas];
                filas = [];
            }
            mes = mesDia;
            filas.push(...generador.generarDia(dia));
        }

        if (mes) yield [mes, filas];
    }

    /* Movimientos agrupados por mes (AAAA-MM), del más antiguo al más reciente. */
    function generarMovimientosDemoMezzanine(maestro, hasta = obtenerHasta()) {
        return new Map(generarMesesDemoMezzanine(maestro, hasta));
    }

    function contarMesesDemo(hasta = obtenerHasta()) {
        return new Set(listarDias(DESDE, hasta).map((dia) => dia.fecha.slice(0, 7))).size;
    }

    function leerEstado() {
        try {
            return localStorage.getItem(CLAVE_ESTADO);
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

    function avisar(texto, tipo = "") {
        if (document.getElementById("mensaje-reportes") && typeof mostrarMensajeReportes === "function") {
            mostrarMensajeReportes(texto, tipo);
        }
    }

    let reglasTransferenciaConfirmadas = false;

    /* Crea las reglas de TRA110 si faltan (solo un administrador puede). */
    function asegurarReglasTransferencia() {
        if (reglasTransferenciaConfirmadas) return false;

        if (
            typeof obtenerCatalogoReglasTraceWis !== "function" ||
            typeof guardarReglaTraceWis !== "function" ||
            typeof esAdministrador !== "function" ||
            !esAdministrador()
        ) {
            return false;
        }

        const catalogo = obtenerCatalogoReglasTraceWis();
        const reglas = Array.isArray(catalogo) ? catalogo : (catalogo && catalogo.reglas) || [];
        const existentes = reglas.filter((regla) => {
            return String(regla.aplicacion).toUpperCase() === APLICACION_TRANSFERENCIA;
        });
        let creadas = 0;
        REGLAS_TRANSFERENCIA.forEach((regla) => {
            if (!existentes.some((existente) => existente.signo === regla.signo)) {
                guardarReglaTraceWis(regla);
                creadas += 1;
            }
        });
        reglasTransferenciaConfirmadas = true;
        return creadas > 0;
    }

    async function refrescarVistas() {
        if (document.getElementById("bloque-mapa-reportes") && typeof actualizarDatosReportes === "function") {
            if (typeof filasTraceWisCargadas !== "undefined") filasTraceWisCargadas = false;
            await actualizarDatosReportes();
            if (typeof actualizarMapaCalorDesdeReportes === "function") await actualizarMapaCalorDesdeReportes();
        }
    }

    let siembraEnCurso = null;

    async function sembrar() {
        if (leerEstado() === MARCA) return false;

        const dependencias = [
            "obtenerUsuarioActual", "crearImportacionReporte", "guardarImportacionReporte",
            "obtenerDatosAlmacenReportes", "crearFirmaArchivoReporte", "obtenerEmpresaWisPorCodigo",
            "eliminarImportacionDeBase"
        ];
        if (dependencias.some((nombre) => typeof window[nombre] !== "function") || !obtenerUsuarioActual()) {
            return false;
        }

        const existentes = await obtenerDatosAlmacenReportes(ALMACEN_IMPORTACIONES, "", "");
        // La versión de prueba anterior se reemplaza por esta.
        for (const importacion of existentes.filter((item) => MARCAS_ANTERIORES.includes(item.marcaDemo))) {
            await eliminarImportacionDeBase(importacion.id);
        }
        const firmasExistentes = new Set(existentes.map((importacion) => importacion.firmaArchivo));

        const respuesta = await fetch(RUTA_MAESTRO);
        if (!respuesta.ok) throw new Error("No se pudo leer el maestro de Mezzanine.");
        const maestro = await respuesta.json();
        const hasta = obtenerHasta();
        const totalMeses = contarMesesDemo(hasta);
        const configuracion = CONFIGURACIONES_REPORTES[TIPO_REPORTE_TRACE_WIS];
        let total = 0;
        let numero = 0;

        for (const [mes, filas] of generarMesesDemoMezzanine(maestro, hasta)) {
            numero += 1;
            const archivo = {
                name: `DEMO · Movimientos WIS Mezzanine ${mes} (sintético).xlsx`,
                size: filas.length,
                lastModified: 0
            };
            const firma = crearFirmaArchivoReporte(archivo);
            if (firmasExistentes.has(firma)) continue;

            avisar(`Cargando datos de demostración de Mezzanine: ${mes} (${numero} de ${totalMeses})…`);
            const importacion = {
                ...crearImportacionReporte(archivo, firma, filas, "", configuracion),
                esDatoDemo: true,
                marcaDemo: MARCA
            };
            await guardarImportacionReporte(importacion, filas);
            total += filas.length;
        }

        guardarEstado(MARCA);
        if (total) {
            const texto = `${total.toLocaleString("es-UY")} movimientos sintéticos de Mezzanine agregados al Trace WIS (${totalMeses} meses).`;
            console.info(texto);
            avisar(texto, "exito");
        }
        await refrescarVistas();
        return true;
    }

    function intentarSembrar() {
        if (siembraEnCurso) return;
        try {
            // Antes de sembrar, así los totales de cada importación ya cuentan TRA110.
            asegurarReglasTransferencia();
        } catch (error) {
            console.warn("Reglas de transferencia de la demo:", error.message || error);
        }
        if (leerEstado() === MARCA) return;
        siembraEnCurso = sembrar()
            .catch((error) => console.warn("Demo del Trace de Mezzanine:", error.message || error))
            .finally(() => {
                siembraEnCurso = null;
            });
    }

    // Espera a que haya una sesión iniciada (la importación registra quién la hizo).
    // Sigue revisando para crear las reglas de transferencia cuando entre un administrador.
    setInterval(() => {
        if (typeof obtenerUsuarioActual === "function" && obtenerUsuarioActual()) {
            intentarSembrar();
        }
    }, 2000);

    window.generarMovimientosDemoMezzanine = generarMovimientosDemoMezzanine;

    window.eliminarTraceDemoMezzanine = async () => {
        if (siembraEnCurso) await siembraEnCurso;
        const importaciones = await obtenerDatosAlmacenReportes(ALMACEN_IMPORTACIONES, "", "");
        const demos = importaciones.filter((importacion) => {
            return importacion.marcaDemo === MARCA || MARCAS_ANTERIORES.includes(importacion.marcaDemo);
        });
        for (const importacion of demos) {
            await eliminarImportacionDeBase(importacion.id);
        }
        await refrescarVistas();
        return demos.length;
    };

    /*
     * La siembra se registra en siembraEnCurso: si no, al borrar el estado el
     * intervalo arrancaría otra en paralelo y cada mes se cargaría dos veces.
     */
    window.regenerarTraceDemoMezzanine = async () => {
        await window.eliminarTraceDemoMezzanine();
        guardarEstado("");
        siembraEnCurso = sembrar().finally(() => {
            siembraEnCurso = null;
        });
        return siembraEnCurso;
    };
})();
