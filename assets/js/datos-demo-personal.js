/*
 * Personal e inasistencias sintéticos de 2026, para que Personal,
 * Inasistencias e Inicio tengan datos de ejemplo. NO son personas ni
 * registros reales: legajos DEMO-NNN, ids demo-op-* y demo-in-*.
 *
 * - Plantel: 76 personas de las operativas de Mezzanine, Integra, Vehículos
 *   y Paraguay, más mantenimiento y administración (sin operativa). Cada una
 *   con cargo, área y turno fijos; en 2026 hay 4 altas y 3 bajas (quedan
 *   inactivas). No se crean cuentas de usuario: se enviarían al servidor
 *   local y servirían para entrar a la app Android.
 * - Inasistencias: del 2/1/2026 hasta ayer (como máximo el 31/12/2026), más
 *   las licencias, los trámites y las faltas con aviso ya cargados para las
 *   próximas 3 semanas. Cada persona tiene su propensión, los certificados y
 *   las enfermedades sin certificado suben en invierno, y unas pocas
 *   personas faltan sin aviso más seguido. Los supervisores y
 *   administrativos faltan menos, y solo el personal de depósito tiene
 *   accidentes laborales.
 * - Las certificaciones médicas y los accidentes laborales traen un PDF
 *   sintético guardado en IndexedDB (attachments.js), salvo parte de las
 *   certificaciones de la última semana, que quedan con documentación
 *   pendiente.
 *
 * Se crean una sola vez por navegador (clave gestion_personal_demo_personal).
 * eliminarPersonalDemo() los borra y no se vuelven a crear;
 * regenerarPersonalDemo() los arma de nuevo.
 */
(() => {
    const MARCA = "demo-personal-2026-v1";
    const CLAVE_ESTADO = "gestion_personal_demo_personal";
    const DESDE = "2026-01-02";
    const HASTA_MAXIMO = "2026-12-31";
    const DIAS_PLANIFICADOS = 21;
    const DIAS_HABILES_ANO = 215;
    const SEMILLA = 20261026;

    const FERIADOS_NO_LABORABLES = new Set([
        "2026-01-01", "2026-05-01", "2026-07-18", "2026-08-25", "2026-12-25"
    ]);
    // Certificados y enfermedades: más en invierno (gripe), menos en verano.
    const FACTOR_INVIERNO = [0.8, 0.8, 0.9, 1, 1.2, 1.5, 1.7, 1.5, 1.1, 1, 0.9, 0.9];
    const HORAS_TURNO = { "Mañana": [6, 14], "Tarde": [14, 22], "Noche": [22, 30] };
    const LETRAS_TURNO = { M: "Mañana", T: "Tarde", N: "Noche" };

    /*
     * Operativa · cargo · turnos (M mañana, T tarde, N noche), una letra por
     * persona. Mantenimiento y el analista no tienen operativa.
     */
    const PLANTEL = [
        ["Decathlon", "Operario", "MMMMMMMMTTTTTT"],
        ["Decathlon", "Supervisor operativo", "MT"],
        ["Decathlon", "Administrativo operativo", "M"],
        ["Teleshopping", "Operario", "MMMTTT"],
        ["Teleshopping", "Supervisor operativo", "M"],
        ["Teleshopping", "Administrativo operativo", "T"],
        ["Kiabi", "Operario", "MMTT"],
        ["Forum", "Operario", "MMTT"],
        ["Forum", "Supervisor operativo", "T"],
        ["Unilog", "Operario", "MT"],
        ["Polakof", "Operario", "MM"],
        ["Dacrimar", "Operario", "M"],
        ["Diego Díaz", "Operario", "T"],
        ["Conaprole", "Operario", "MMTN"],
        ["Conaprole", "Supervisor operativo", "M"],
        ["Danone", "Operario", "MT"],
        ["Sodimac", "Operario", "MMT"],
        ["Sodimac", "Administrativo operativo", "M"],
        ["JYSK", "Operario", "MT"],
        ["Porcelanosa", "Operario", "M"],
        ["Frigorífico Modelo", "Operario", "NN"],
        ["Iveco", "Operario", "MM"],
        ["Iveco", "Supervisor operativo", "M"],
        ["Nordex", "Operario", "MT"],
        ["Sevel", "Operario", "MT"],
        ["Santa Rosa", "Operario", "M"],
        ["Decathlon Nicosia S.A.", "Operario", "MMT"],
        ["Decathlon Nicosia S.A.", "Supervisor operativo", "M"],
        ["Electropar S.A.", "Operario", "MT"],
        ["Gloria SACEI", "Operario", "M"],
        ["Gloria SACEI", "Administrativo operativo", "M"],
        ["Farmanova", "Operario", "M"],
        ["Sin asignar", "Técnico de mantenimiento", "MT"],
        ["Sin asignar", "Analista administrativo", "M"]
    ];
    const AREA_POR_CARGO = {
        "Técnico de mantenimiento": "Mantenimiento",
        "Analista administrativo": "Administración"
    };
    const CARGOS_DEPOSITO = new Set(["Operario", "Técnico de mantenimiento"]);
    // Altas y bajas de 2026 por número de legajo (todas de operarios).
    const ALTAS = { 12: "2026-03-02", 22: "2026-05-04", 49: "2026-07-01", 66: "2026-09-01" };
    const BAJAS = { 5: "2026-04-30", 31: "2026-06-30", 61: "2026-08-31" };

    const NOMBRES = [
        "Lucía", "Martín", "Sofía", "Federico", "Valentina", "Nicolás", "Camila",
        "Matías", "Florencia", "Santiago", "Agustina", "Gonzalo", "Micaela",
        "Diego", "Carolina", "Rodrigo", "Natalia", "Sebastián", "Paula",
        "Facundo", "Andrea", "Joaquín", "Lorena", "Emiliano", "Victoria",
        "Bruno", "Romina", "Maximiliano", "Daniela", "Pablo", "Cecilia",
        "Leandro", "Jimena", "Marcelo", "Verónica", "Alejandro", "Gabriela",
        "Ignacio", "Silvana", "Mauricio", "Leticia", "Fernando", "Mariana",
        "Gastón", "Claudia", "Hernán", "Noelia", "Andrés", "Rocío", "Javier"
    ];
    const APELLIDOS = [
        "Rodríguez", "González", "Fernández", "García", "López", "Martínez",
        "Pérez", "Sosa", "Silva", "Pereira", "Suárez", "Díaz", "Ramírez",
        "Acosta", "Méndez", "Núñez", "Cabrera", "Castro", "Olivera", "Romero",
        "Ferreira", "Viera", "Correa", "Gómez", "Álvarez", "Techera", "Machado",
        "De León", "Píriz", "Bentancor", "Cardozo", "Morales", "Medina",
        "Rocha", "Vázquez", "Sánchez", "Barrios", "Quintana", "Alonso",
        "Cabral", "Figueredo", "Moreira", "Bonilla", "Trinidad", "Larrosa"
    ];
    const APELLIDOS_PARAGUAY = [
        "Benítez", "Giménez", "Ortiz", "Villalba", "Cáceres", "Ayala", "Báez",
        "Insfrán", "Duarte", "Riveros", "Amarilla", "Ledesma", "Espínola"
    ];
    const OPERATIVAS_PARAGUAY = new Set([
        "Decathlon Nicosia S.A.", "Electropar S.A.", "Gloria SACEI", "Farmanova"
    ]);

    /*
     * Episodios por persona y año (unos 215 días hábiles). `invierno` sigue
     * FACTOR_INVIERNO, `ausentista` se triplica en las personas que faltan
     * más, `planificable` también se carga para las próximas semanas y
     * `deposito` es solo para el personal de depósito.
     */
    const TIPOS = [
        { motivo: "Certificación médica", porAno: 2.1, invierno: true },
        { motivo: "Enfermedad sin certificado", porAno: 0.6, invierno: true, ausentista: true },
        { motivo: "Falta con aviso", porAno: 0.7, planificable: true },
        { motivo: "Falta sin aviso", porAno: 0.3, ausentista: true },
        { motivo: "Trámite personal", porAno: 0.9, planificable: true },
        { motivo: "Licencia especial", porAno: 0.35, planificable: true },
        { motivo: "Accidente laboral", porAno: 0.06, deposito: true },
        { motivo: "Otro", porAno: 0.12 }
    ];
    const DETALLES = {
        "Certificación médica": [
            "Cuadro gripal", "Gastroenteritis", "Lumbalgia", "Cuadro respiratorio",
            "Consulta y estudios médicos", "Control odontológico",
            "Esguince fuera del trabajo", "Migraña"
        ],
        "Enfermedad sin certificado": [
            "Avisó por fiebre", "Avisó por malestar estomacal",
            "Dolor de cabeza; no presentó certificado"
        ],
        "Falta con aviso": [
            "Problema familiar", "Avisó el día anterior", "Hijo enfermo",
            "Problema de transporte", "Mudanza"
        ],
        "Falta sin aviso": ["No se presentó ni avisó", "Avisó después del inicio del turno"],
        "Trámite personal": [
            "Trámite en el BPS", "Trámite bancario", "Renovación de cédula",
            "Renovación de libreta de conducir", "Reunión en el centro educativo",
            "Trámite en la Intendencia"
        ],
        "Accidente laboral": [
            "Golpe en la mano al mover un pallet", "Torcedura de tobillo en la escalera",
            "Corte con cúter al abrir cajas", "Esguince de muñeca al cargar un camión",
            "Golpe en la espalda con una zorra"
        ],
        "Otro": ["Paro de transporte", "Citación judicial", "Temporal: sin transporte"]
    };
    const LICENCIAS = [
        { detalle: "Licencia por estudio (examen)", dias: [1, 2], peso: 4 },
        { detalle: "Donación de sangre", dias: [1, 1], peso: 2 },
        { detalle: "Duelo por familiar directo", dias: [3, 3], peso: 2 },
        { detalle: "Matrimonio", dias: [3, 3], peso: 0.6 },
        { detalle: "Paternidad", dias: [10, 10], peso: 0.8 }
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
            elegirPonderado(lista) {
                let objetivo = aleatorio() * lista.reduce((total, item) => total + item.peso, 0);
                return lista.find((item) => (objetivo -= item.peso) < 0) || lista[0];
            }
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

    function formatearDia(texto) {
        const [ano, mes, dia] = texto.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    /* Lunes a viernes, sin feriados no laborables. */
    function listarDiasHabiles(desde, hasta) {
        const dias = [];
        for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
            const diaSemana = new Date(`${dia}T12:00:00`).getDay();
            if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_NO_LABORABLES.has(dia)) {
                dias.push(dia);
            }
        }
        return dias;
    }

    function crearPlantel(hoy, azar) {
        const nombresUsados = new Set();
        const personas = [];

        PLANTEL.forEach(([operativa, cargo, turnos]) => {
            [...turnos].forEach((letra) => {
                const numero = personas.length + 1;
                const apellidos = OPERATIVAS_PARAGUAY.has(operativa) ? APELLIDOS_PARAGUAY : APELLIDOS;
                let nombre = "";
                do {
                    nombre = `${azar.elegir(NOMBRES)} ${azar.elegir(apellidos)}`;
                } while (nombresUsados.has(nombre));
                nombresUsados.add(nombre);

                const alta = ALTAS[numero] || "";
                const baja = BAJAS[numero] || "";
                const operativaFisica = typeof obtenerOperativaFisicaDeOperativa === "function"
                    ? obtenerOperativaFisicaDeOperativa(operativa)
                    : "";
                const deposito = CARGOS_DEPOSITO.has(cargo);
                const persona = {
                    operario: {
                        id: `demo-op-${String(numero).padStart(3, "0")}`,
                        legajo: `DEMO-${String(numero).padStart(3, "0")}`,
                        nombre,
                        cargo,
                        operativa,
                        turno: LETRAS_TURNO[letra],
                        estado: baja && baja < hoy ? "Inactivo" : "Activo",
                        area: AREA_POR_CARGO[cargo] || "Operaciones",
                        operativaFisica,
                        empresaWis: operativaFisica ? operativa : "",
                        fechaRegistro: `${alta || "2025-12-15"}T12:00:00.000Z`,
                        esDatoDemo: true,
                        marcaDemo: MARCA
                    },
                    alta: alta || DESDE,
                    baja,
                    deposito,
                    propension: (0.45 + azar.aleatorio() * 1.1) * (deposito ? 1 : 0.6),
                    ausentista: azar.aleatorio() < 0.08
                };

                // Quien todavía no entró a trabajar no aparece en Personal.
                if (!alta || alta <= hoy) personas.push(persona);
            });
        });

        return personas;
    }

    /* Media jornada al inicio o al final del turno (el nocturno solo se retira antes). */
    function crearHorarioParcial(turno, azar) {
        const [inicio, fin] = HORAS_TURNO[turno] || HORAS_TURNO["Mañana"];
        const horas = azar.entero(2, 4) + (azar.aleatorio() < 0.3 ? 0.5 : 0);
        const llegaTarde = fin <= 24 && azar.aleatorio() < 0.5;
        const texto = (hora) => `${String(Math.floor(hora) % 24).padStart(2, "0")}:${hora % 1 ? "30" : "00"}`;
        return llegaTarde
            ? [texto(inicio), texto(inicio + horas)]
            : [texto(fin - horas), texto(fin)];
    }

    function calcularDiasCertificado(azar) {
        const sorteo = azar.aleatorio();
        if (sorteo < 0.35) return 1;
        if (sorteo < 0.6) return 2;
        if (sorteo < 0.8) return 3;
        if (sorteo < 0.95) return azar.entero(4, 7);
        return azar.entero(8, 15);
    }

    function instanteLocal(dia, azar) {
        const hora = String(azar.entero(8, 17)).padStart(2, "0");
        const minuto = String(azar.entero(0, 59)).padStart(2, "0");
        return new Date(`${dia}T${hora}:${minuto}:00`).toISOString();
    }

    /* PDF mínimo de una página (Helvetica, WinAnsi) con las líneas indicadas. */
    function crearPdfDemo(lineas) {
        const escapar = (texto) => texto.replace(/[\\()]/g, "\\$&");
        const contenido = [
            "BT", "/F1 15 Tf", "56 780 Td", `(${escapar(lineas[0])}) Tj`, "/F1 11 Tf",
            ...lineas.slice(1).flatMap((linea) => ["0 -22 Td", `(${escapar(linea)}) Tj`]),
            "ET"
        ].join("\n");
        const objetos = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
                "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`
        ];
        let pdf = "%PDF-1.4\n";
        const posiciones = objetos.map((objeto, indice) => {
            const posicion = pdf.length;
            pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
            return posicion;
        });
        const inicioXref = pdf.length;
        pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
        pdf += posiciones.map((posicion) => `${String(posicion).padStart(10, "0")} 00000 n \n`).join("");
        pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
        // Un byte por carácter (Latin-1), así las posiciones del xref coinciden.
        const bytes = Uint8Array.from(pdf, (caracter) => {
            const codigo = caracter.charCodeAt(0);
            return codigo < 256 ? codigo : 63;
        });
        return new Blob([bytes], { type: "application/pdf" });
    }

    function crearDocumentoDemo(registro, operario) {
        const dias = Math.round(
            (new Date(`${registro.fechaHasta}T12:00:00`) - new Date(`${registro.fechaDesde}T12:00:00`)) / 86400000
        ) + 1;
        const periodo = `del ${formatearDia(registro.fechaDesde)} al ${formatearDia(registro.fechaHasta)} ` +
            `(${dias} ${dias === 1 ? "día" : "días"})`;
        const accidente = registro.motivo === "Accidente laboral";
        const archivo = crearPdfDemo([
            `${accidente ? "Constancia de accidente laboral" : "Certificado médico"} · DATO DE DEMOSTRACIÓN`,
            "Documento sintético de Gestión Polo Oeste: no es un documento real.",
            "",
            `Funcionario: ${operario.nombre} (legajo ${operario.legajo})`,
            `Operativa: ${operario.operativa}`,
            `${accidente ? "Días de baja" : "Reposo indicado"}: ${periodo}`,
            `${accidente ? "Descripción" : "Motivo informado"}: ${registro.detalle}`
        ]);
        const prefijo = accidente ? "constancia-accidente" : "certificado";
        return {
            id: `demo-doc-${registro.id}`,
            nombre: `${prefijo}-${operario.legajo}-${registro.fechaDesde}.pdf`,
            tipo: "application/pdf",
            tamano: archivo.size,
            archivo,
            fechaRegistro: registro.fechaRegistro,
            esDatoDemo: true,
            marcaDemo: MARCA
        };
    }

    function generarInasistencias(personas, hoy, azar) {
        const ayer = sumarDias(hoy, -1);
        const hastaHistorico = ayer < HASTA_MAXIMO ? ayer : HASTA_MAXIMO;
        const limitePlanificado = sumarDias(hoy, DIAS_PLANIFICADOS);
        const hastaPlanificado = limitePlanificado < HASTA_MAXIMO ? limitePlanificado : HASTA_MAXIMO;
        const ultimaSemana = sumarDias(hastaHistorico, -7);
        const libreDesde = new Map();
        const inasistencias = [];
        const documentos = [];

        listarDiasHabiles(DESDE, hastaPlanificado).forEach((dia) => {
            const planificado = dia > hastaHistorico;
            const factorInvierno = FACTOR_INVIERNO[Number(dia.slice(5, 7)) - 1];

            personas.forEach((persona) => {
                // Un sorteo por persona y día: la probabilidad de cada motivo es porAno / 215.
                let objetivo = azar.aleatorio() * DIAS_HABILES_ANO;
                if (dia < persona.alta || (persona.baja && dia > persona.baja)) return;
                if (dia < (libreDesde.get(persona.operario.id) || "")) return;

                const tipo = TIPOS.find((item) => {
                    if (planificado && !item.planificable) return false;
                    if (item.deposito && !persona.deposito) return false;
                    let tasa = item.porAno * persona.propension;
                    if (item.invierno) tasa *= factorInvierno;
                    if (item.ausentista && persona.ausentista) tasa *= 3;
                    objetivo -= tasa;
                    return objetivo < 0;
                });
                if (!tipo) return;

                let dias = 1;
                let detalle = "";
                let horario = null;
                if (tipo.motivo === "Certificación médica") {
                    dias = calcularDiasCertificado(azar);
                } else if (tipo.motivo === "Accidente laboral") {
                    dias = azar.entero(5, 21);
                } else if (tipo.motivo === "Licencia especial") {
                    const licencia = azar.elegirPonderado(LICENCIAS);
                    dias = azar.entero(licencia.dias[0], licencia.dias[1]);
                    detalle = licencia.detalle;
                } else if (tipo.motivo === "Trámite personal" && azar.aleatorio() < 0.65) {
                    horario = crearHorarioParcial(persona.operario.turno, azar);
                }
                detalle = detalle || azar.elegir(DETALLES[tipo.motivo]);

                let fechaHasta = sumarDias(dia, dias - 1);
                if (persona.baja && fechaHasta > persona.baja) fechaHasta = persona.baja;
                // Lo planificado se cargó unos días antes; lo demás, el día o hasta 2 días después.
                const diaRegistro = planificado
                    ? sumarDias(hoy, -azar.entero(1, 6))
                    : sumarDias(dia, azar.entero(0, 2));
                const registro = {
                    id: `demo-in-${String(inasistencias.length + 1).padStart(4, "0")}`,
                    operarioId: persona.operario.id,
                    fechaDesde: dia,
                    fechaHasta,
                    duracion: horario ? "parcial" : "completa",
                    horaDesde: horario ? horario[0] : "",
                    horaHasta: horario ? horario[1] : "",
                    motivo: tipo.motivo,
                    detalle,
                    documento: null,
                    registradoPor: "demo",
                    fechaRegistro: instanteLocal(diaRegistro < hoy ? diaRegistro : hoy, azar),
                    esDatoDemo: true,
                    marcaDemo: MARCA
                };

                const conDocumento = !planificado && (
                    tipo.motivo === "Accidente laboral" ||
                    (tipo.motivo === "Certificación médica" &&
                        azar.aleatorio() < (dia <= ultimaSemana ? 0.93 : 0.4))
                );
                if (conDocumento) {
                    const documento = crearDocumentoDemo(registro, persona.operario);
                    registro.documento = {
                        id: documento.id,
                        nombre: documento.nombre,
                        tipo: documento.tipo,
                        tamano: documento.tamano
                    };
                    documentos.push(documento);
                }

                inasistencias.push(registro);
                // Sin ausencias pegadas: la próxima puede empezar dos días después.
                libreDesde.set(persona.operario.id, sumarDias(fechaHasta, 2));
            });
        });

        return { inasistencias, documentos };
    }

    async function ejecutarEnDocumentos(operacion) {
        const base = await abrirBaseDocumentos();
        return new Promise((resolve, reject) => {
            const transaccion = base.transaction(ALMACEN_DOCUMENTOS, "readwrite");
            operacion(transaccion.objectStore(ALMACEN_DOCUMENTOS));
            transaccion.oncomplete = () => {
                base.close();
                resolve(true);
            };
            transaccion.onerror = () => {
                base.close();
                reject(transaccion.error);
            };
        });
    }

    function guardarDocumentosDemo(documentos) {
        if (!documentos.length) return Promise.resolve(true);
        return ejecutarEnDocumentos((almacen) => documentos.forEach((documento) => almacen.put(documento)));
    }

    function eliminarDocumentosDemo(ids) {
        if (!ids.length) return Promise.resolve(true);
        return ejecutarEnDocumentos((almacen) => ids.forEach((id) => almacen.delete(id)));
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

    function refrescarVistas() {
        if (document.getElementById("tabla-operarios") && typeof mostrarOperarios === "function") {
            mostrarOperarios();
        }
        if (document.getElementById("tabla-inasistencias") && typeof mostrarInasistencias === "function") {
            mostrarInasistencias();
        }
        if (document.getElementById("total-inasistencias") && typeof actualizarResumenInicio === "function") {
            actualizarResumenInicio();
        }
    }

    let siembraEnCurso = null;

    async function sembrar() {
        if (leerEstado() === MARCA) return false;

        const dependencias = [
            "obtenerOperarios", "guardarOperarios", "obtenerInasistencias",
            "guardarInasistencias", "abrirBaseDocumentos"
        ];
        if (dependencias.some((nombre) => typeof window[nombre] !== "function")) return false;

        const hoy = fechaTexto(new Date());
        const azar = crearAzar(SEMILLA);
        const legajos = new Set(obtenerOperarios().map((operario) => String(operario.legajo).toLowerCase()));
        const personas = crearPlantel(hoy, azar).filter((persona) => {
            return !legajos.has(persona.operario.legajo.toLowerCase());
        });
        const { inasistencias, documentos } = generarInasistencias(personas, hoy, azar);

        try {
            await guardarDocumentosDemo(documentos);
        } catch (error) {
            console.warn("Demo de personal: no se pudieron guardar los certificados.", error);
            inasistencias.forEach((registro) => {
                registro.documento = null;
            });
        }

        const operarios = obtenerOperarios();
        const guardado = guardarOperarios([...operarios, ...personas.map((persona) => persona.operario)]) &&
            guardarInasistencias([...obtenerInasistencias(), ...inasistencias]);
        if (!guardado) {
            guardarOperarios(operarios);
            await eliminarDocumentosDemo(documentos.map((documento) => documento.id)).catch(() => {});
            return false;
        }

        guardarEstado(MARCA);
        console.info(
            `${personas.length} personas y ${inasistencias.length} inasistencias sintéticas de 2026 agregadas ` +
            `(${documentos.length} con certificado).`
        );
        refrescarVistas();
        return true;
    }

    function intentarSembrar() {
        if (siembraEnCurso || leerEstado() === MARCA) return;
        siembraEnCurso = sembrar()
            .catch((error) => console.warn("Demo de personal:", error.message || error))
            .finally(() => {
                siembraEnCurso = null;
            });
    }

    /*
     * Conserva a las personas de la demo que tienen una cuenta vinculada o
     * inasistencias cargadas a mano, para no dejar registros huérfanos.
     */
    window.eliminarPersonalDemo = async () => {
        if (siembraEnCurso) await siembraEnCurso;
        const inasistencias = obtenerInasistencias();
        const demos = inasistencias.filter((registro) => registro.marcaDemo === MARCA);
        const conCuenta = new Set(obtenerUsuarios().map((usuario) => usuario.operarioId).filter(Boolean));
        const conRegistrosPropios = new Set(
            inasistencias.filter((registro) => registro.marcaDemo !== MARCA).map((registro) => registro.operarioId)
        );
        const operarios = obtenerOperarios();
        const quedan = operarios.filter((operario) => {
            return operario.marcaDemo !== MARCA || conCuenta.has(operario.id) || conRegistrosPropios.has(operario.id);
        });

        guardarInasistencias(inasistencias.filter((registro) => registro.marcaDemo !== MARCA));
        guardarOperarios(quedan);
        try {
            await eliminarDocumentosDemo(demos.map((registro) => registro.documento?.id).filter(Boolean));
        } catch (error) {
            console.warn("Demo de personal: no se pudieron borrar los certificados.", error);
        }
        refrescarVistas();
        return { operarios: operarios.length - quedan.length, inasistencias: demos.length };
    };

    window.regenerarPersonalDemo = async () => {
        await window.eliminarPersonalDemo();
        guardarEstado("");
        siembraEnCurso = sembrar().finally(() => {
            siembraEnCurso = null;
        });
        return siembraEnCurso;
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", intentarSembrar, { once: true });
    } else {
        intentarSembrar();
    }
})();
