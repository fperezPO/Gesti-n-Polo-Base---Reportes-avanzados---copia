/*
 * Catálogo de empresas WIS: son las operativas por cliente de toda la web.
 * Cada empresa se opera en una operativa física (los planos del mapa de calor).
 *
 * Fuente: exportación REG100 del WIS (columnas Código y Nombre), descargada
 * el 2026-10-04. Si llega un REG100 nuevo, actualizar EMPRESAS_WIS con el
 * mismo esquema: `nombre` es el texto del WIS y `operativa` el nombre que se
 * muestra en la web (y que guardan los registros: operarios, inasistencias,
 * embarques, filas del Trace).
 *
 * Reglas de operativa física (definidas por el usuario el 2026-10-04):
 *   1            → predio Polo Oeste Uruguay
 *   2            → predio Paraguay
 *   3 a 99       → Paraguay (se operan dentro del predio 2)
 *   1000 y 7000  → Integra
 *   3000–3999    → Vehículos
 *   5000–5999    → Integra
 *   6000–6999    → Mezzanine
 * Se excluyen las empresas cuyo nombre contenga "Averias Decathlon",
 * "Pallet Forum" o "Forum Pallet", y por el momento los códigos 532, 1111 y
 * 4000, que no tienen regla. Las filas del Trace de empresas excluidas o que
 * no están en el catálogo no se importan.
 */

const PREDIO_URUGUAY = "Polo Oeste Uruguay";
const PREDIO_PARAGUAY = "Paraguay";

const OPERATIVA_FISICA_MEZZANINE = "Mezzanine";
const OPERATIVA_FISICA_INTEGRA = "Integra";
const OPERATIVA_FISICA_VEHICULOS = "Vehículos";
const OPERATIVA_FISICA_PARAGUAY = "Paraguay";
const GRUPO_OPERATIVAS_PREDIOS = "Predios";

/* Orden de los grupos en los selectores de operativa. */
const ORDEN_GRUPOS_OPERATIVAS = [
    OPERATIVA_FISICA_MEZZANINE,
    OPERATIVA_FISICA_INTEGRA,
    OPERATIVA_FISICA_VEHICULOS,
    OPERATIVA_FISICA_PARAGUAY,
    GRUPO_OPERATIVAS_PREDIOS
];

const NOMBRES_EMPRESA_EXCLUIDOS = [
    "Averias Decathlon",
    "Pallet Forum",
    "Forum Pallet"
];

/* Sin regla de operativa física: excluidos hasta que se definan. */
const CODIGOS_EMPRESA_EXCLUIDOS = [532, 1111, 4000];

const EMPRESAS_WIS = [
    { codigo: 1, nombre: "Polo Oeste", operativa: "Polo Oeste" },
    { codigo: 2, nombre: "PO - Paraguay", operativa: "PO - Paraguay" },
    { codigo: 13, nombre: "Itti", operativa: "Itti" },
    { codigo: 14, nombre: "Electropar S.A.", operativa: "Electropar S.A." },
    { codigo: 15, nombre: "Santa Rosa Paraguay SA", operativa: "Santa Rosa Paraguay S.A." },
    { codigo: 16, nombre: "Gloria SACEI", operativa: "Gloria SACEI" },
    { codigo: 17, nombre: "SALLUSTRO Y CIA. S.A.", operativa: "Sallustro y Cía. S.A." },
    { codigo: 18, nombre: "DECATHLON - Nicosia S.A.", operativa: "Decathlon Nicosia S.A." },
    { codigo: 19, nombre: "SARTIKA S.A", operativa: "Sartika S.A." },
    { codigo: 20, nombre: "ITTI S.A.E.C.A.", operativa: "ITTI S.A.E.C.A." },
    { codigo: 21, nombre: "IOIO S.A.", operativa: "IOIO S.A." },
    { codigo: 22, nombre: "DISAN PARAGUAY E.A.S.", operativa: "Disan Paraguay E.A.S." },
    { codigo: 23, nombre: "ADISER S.A. / BK", operativa: "Adiser S.A. / BK" },
    { codigo: 24, nombre: "GT S.A.", operativa: "GT S.A." },
    { codigo: 25, nombre: "UNION S.R.L", operativa: "Unión S.R.L." },
    { codigo: 26, nombre: "CAMILA BRIGNOLE SPA BEAUTY", operativa: "Camila Brignole Spa Beauty" },
    { codigo: 27, nombre: "VARSA SRL", operativa: "Varsa S.R.L." },
    { codigo: 28, nombre: "GREAT BAZAAR S.A", operativa: "Great Bazaar S.A." },
    { codigo: 29, nombre: "FARMANOVA", operativa: "Farmanova" },
    { codigo: 532, nombre: "MOBILIARIO BK", operativa: "Mobiliario BK" },
    { codigo: 1000, nombre: "SIKA URUGUAY", operativa: "Sika Uruguay" },
    { codigo: 1111, nombre: "Sika Uruguay", operativa: "Sika Uruguay" },
    { codigo: 3000, nombre: "CARPER", operativa: "Carper" },
    { codigo: 3001, nombre: "OVERSIL", operativa: "Oversil" },
    { codigo: 3002, nombre: "IVECO", operativa: "Iveco" },
    { codigo: 3003, nombre: "NORDEX", operativa: "Nordex" },
    { codigo: 3004, nombre: "RALITOR", operativa: "Ralitor" },
    { codigo: 3005, nombre: "SANTA ROSA", operativa: "Santa Rosa" },
    { codigo: 3006, nombre: "NODERAL SA", operativa: "Noderal S.A." },
    { codigo: 3007, nombre: "SEVEL", operativa: "Sevel" },
    { codigo: 3008, nombre: "DARLAX", operativa: "Darlax" },
    { codigo: 3009, nombre: "FABEMIX SA", operativa: "Fabemix S.A." },
    { codigo: 3010, nombre: "FACAL Y CIA", operativa: "Facal y Cía." },
    { codigo: 3420, nombre: "SEVEL", operativa: "Sevel" },
    { codigo: 4000, nombre: "DLONER", operativa: "Dloner" },
    { codigo: 5000, nombre: "CONAPROLE", operativa: "Conaprole" },
    { codigo: 5001, nombre: "BURGER KING", operativa: "Burger King" },
    { codigo: 5002, nombre: "ALIMENTOS FRAY BENTOS", operativa: "Alimentos Fray Bentos" },
    { codigo: 5003, nombre: "AMCOR PACKAGING", operativa: "Amcor Packaging" },
    { codigo: 5004, nombre: "BUKIT SRL", operativa: "Bukit S.R.L." },
    { codigo: 5005, nombre: "CASARTA", operativa: "Casarta" },
    { codigo: 5007, nombre: "CEREALIN", operativa: "Cerealin" },
    { codigo: 5008, nombre: "DANONE", operativa: "Danone" },
    { codigo: 5009, nombre: "DSM NUTRITIONAL PRODUCTS", operativa: "DSM Nutritional Products" },
    { codigo: 5010, nombre: "DYSA ALIMENTOS", operativa: "Dysa Alimentos" },
    { codigo: 5011, nombre: "FESHYN", operativa: "Feshyn" },
    { codigo: 5012, nombre: "FRIGORIFICO MODELO", operativa: "Frigorífico Modelo" },
    { codigo: 5013, nombre: "GRIDO", operativa: "Grido" },
    { codigo: 5014, nombre: "GRUTACAR S.A", operativa: "Grutacar S.A." },
    { codigo: 5015, nombre: "INDULACSA", operativa: "Indulacsa" },
    { codigo: 5016, nombre: "INGREDION URUGUAY S.A", operativa: "Ingredion Uruguay S.A." },
    { codigo: 5017, nombre: "INURUGUAY S.A", operativa: "Inuruguay S.A." },
    { codigo: 5018, nombre: "KERTIN", operativa: "Kertin" },
    { codigo: 5019, nombre: "LACTOSAN", operativa: "Lactosan" },
    { codigo: 5020, nombre: "MAR AUSTRAL", operativa: "Mar Austral" },
    { codigo: 5021, nombre: "MULTILOA", operativa: "Multiloa" },
    { codigo: 5022, nombre: "NOVA CORE S.A", operativa: "Nova Core S.A." },
    { codigo: 5023, nombre: "PORCELANOSA", operativa: "Porcelanosa" },
    { codigo: 5024, nombre: "RALESUR", operativa: "Ralesur" },
    { codigo: 5026, nombre: "SADETIR S.A", operativa: "Sadetir S.A." },
    { codigo: 5029, nombre: "WINDIES", operativa: "Windies" },
    { codigo: 5030, nombre: "COLET", operativa: "Colet" },
    { codigo: 5031, nombre: "SODIMAC", operativa: "Sodimac" },
    { codigo: 5032, nombre: "MOBILIARIO BK", operativa: "Mobiliario BK" },
    { codigo: 6000, nombre: "DECATHLON", operativa: "Decathlon" },
    { codigo: 6001, nombre: "TELESHOPPING", operativa: "Teleshopping" },
    { codigo: 6002, nombre: "KIABI", operativa: "Kiabi" },
    { codigo: 6003, nombre: "UNILOG", operativa: "Unilog" },
    { codigo: 6004, nombre: "AVERIAS DECATHLON", operativa: "Averías Decathlon" },
    { codigo: 6005, nombre: "FORUM", operativa: "Forum" },
    { codigo: 6006, nombre: "FORUM PALLET", operativa: "Forum Pallet" },
    { codigo: 6007, nombre: "AVERIAS DECATHLON", operativa: "Averías Decathlon" },
    { codigo: 6008, nombre: "DACRIMAR", operativa: "Dacrimar" },
    { codigo: 6009, nombre: "POLAKOF", operativa: "Polakof" },
    { codigo: 6010, nombre: "PALLET POLAKOF", operativa: "Pallet Polakof" },
    { codigo: 6030, nombre: "DIEGO DIAZ", operativa: "Diego Díaz" },
    { codigo: 7000, nombre: "JYSK", operativa: "JYSK" },
    { codigo: 9000, nombre: "PALLET FORUM", operativa: "Pallet Forum" }
];

function normalizarNombreEmpresaWis(nombre) {
    return String(nombre || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function obtenerMotivoExclusionEmpresaWis(codigo, nombre) {
    if (CODIGOS_EMPRESA_EXCLUIDOS.includes(Number(codigo))) {
        return "sin operativa física definida";
    }

    const normalizado = normalizarNombreEmpresaWis(nombre);
    const excluido = NOMBRES_EMPRESA_EXCLUIDOS.find((texto) => {
        return normalizado.includes(normalizarNombreEmpresaWis(texto));
    });

    return excluido ? `excluida por nombre (${excluido})` : "";
}

/* Predio y operativa física según el número de empresa. */
function obtenerUbicacionFisicaEmpresaWis(codigo) {
    const numero = Number(codigo);

    if (!Number.isInteger(numero) || numero <= 0) {
        return { predio: "", operativaFisica: "" };
    }

    if (numero === 1) {
        return { predio: PREDIO_URUGUAY, operativaFisica: "" };
    }

    if (numero === 2) {
        return { predio: PREDIO_PARAGUAY, operativaFisica: "" };
    }

    if (numero < 100) {
        return { predio: PREDIO_PARAGUAY, operativaFisica: OPERATIVA_FISICA_PARAGUAY };
    }

    if (numero === 1000 || numero === 7000 || (numero >= 5000 && numero <= 5999)) {
        return { predio: PREDIO_URUGUAY, operativaFisica: OPERATIVA_FISICA_INTEGRA };
    }

    if (numero >= 3000 && numero <= 3999) {
        return { predio: PREDIO_URUGUAY, operativaFisica: OPERATIVA_FISICA_VEHICULOS };
    }

    if (numero >= 6000 && numero <= 6999) {
        return { predio: PREDIO_URUGUAY, operativaFisica: OPERATIVA_FISICA_MEZZANINE };
    }

    return { predio: "", operativaFisica: "" };
}

function clasificarEmpresaWis(empresa) {
    const ubicacion = obtenerUbicacionFisicaEmpresaWis(empresa.codigo);
    const motivoExclusion = obtenerMotivoExclusionEmpresaWis(
        empresa.codigo,
        empresa.nombre
    );

    return {
        ...empresa,
        ...ubicacion,
        grupo: ubicacion.operativaFisica || (ubicacion.predio ? GRUPO_OPERATIVAS_PREDIOS : ""),
        excluida: Boolean(motivoExclusion),
        motivoExclusion
    };
}

const CATALOGO_EMPRESAS_WIS = EMPRESAS_WIS.map(clasificarEmpresaWis);

function obtenerCatalogoEmpresasWis({ incluirExcluidas = false } = {}) {
    return CATALOGO_EMPRESAS_WIS.filter((empresa) => {
        return incluirExcluidas || !empresa.excluida;
    });
}

/*
 * Clasifica el "Cod. Empresa" de una fila del Trace. Devuelve null si la
 * empresa no está en el catálogo; si está excluida, `excluida` es true.
 */
function obtenerEmpresaWisPorCodigo(codigo) {
    const numero = Number(String(codigo ?? "").trim());

    if (!Number.isInteger(numero)) {
        return null;
    }

    return CATALOGO_EMPRESAS_WIS.find((empresa) => empresa.codigo === numero) || null;
}

/* Grupos de operativas para los selectores, sin empresas excluidas. */
function obtenerGruposOperativasCatalogo() {
    return ORDEN_GRUPOS_OPERATIVAS.map((grupo) => {
        const nombres = new Set(
            obtenerCatalogoEmpresasWis()
                .filter((empresa) => empresa.grupo === grupo)
                .map((empresa) => empresa.operativa)
        );

        return {
            grupo,
            operativas: [...nombres].sort((a, b) => a.localeCompare(b, "es"))
        };
    }).filter((grupo) => grupo.operativas.length);
}

function obtenerNombresOperativasCatalogo() {
    return obtenerGruposOperativasCatalogo().flatMap((grupo) => grupo.operativas);
}

/* Mapa de calor (operativa física) donde se opera una operativa por cliente. */
function obtenerOperativaFisicaDeOperativa(operativa) {
    const empresa = obtenerCatalogoEmpresasWis().find((item) => {
        return item.operativa === operativa;
    });
    return empresa ? empresa.operativaFisica : "";
}

/* Agrega las operativas al <select>, agrupadas por operativa física. */
function agregarOpcionesOperativasAgrupadas(selector) {
    if (!selector) {
        return;
    }

    obtenerGruposOperativasCatalogo().forEach(({ grupo, operativas }) => {
        const grupoOpciones = document.createElement("optgroup");
        grupoOpciones.label = grupo;

        operativas.forEach((operativa) => {
            const opcion = document.createElement("option");
            opcion.value = operativa;
            opcion.textContent = operativa;
            grupoOpciones.appendChild(opcion);
        });

        selector.appendChild(grupoOpciones);
    });
}
