const TIPO_ARCHIVO_EXCEL =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function inicializarExportacionPagina() {
    const boton = document.querySelector("[data-exportar-excel]");

    if (!boton) {
        return;
    }

    boton.addEventListener("click", async () => {
        const textoOriginal = boton.textContent.trim();
        boton.disabled = true;
        boton.textContent = "Generando Excel...";

        try {
            await exportarExcel(boton.dataset.exportarExcel);
            boton.textContent = "Excel descargado";
        } catch (error) {
            console.error(error);
            boton.textContent = "No fue posible exportar";
        } finally {
            setTimeout(() => {
                if (boton.isConnected) {
                    boton.disabled = false;
                    boton.textContent = textoOriginal;
                }
            }, 2200);
        }
    });
}

async function exportarExcel(tipoExportacion) {
    if (typeof JSZip !== "function") {
        throw new Error("No se encontró el generador de archivos Excel.");
    }

    const hojas = obtenerHojasExportacion(tipoExportacion);
    const archivo = await crearArchivoExcel(hojas);
    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = tipoExportacion === "todo"
        ? `gestion-personal-completa-${fecha}.xlsx`
        : `${tipoExportacion}-${fecha}.xlsx`;

    descargarArchivoExcel(archivo, nombre);
}

function obtenerHojasExportacion(tipo) {
    switch (tipo) {
        case "personal":
            return [crearHojaPersonal()];

        case "usuarios":
            if (!esAdministrador()) {
                throw new Error("La exportación de usuarios requiere permisos.");
            }

            return [crearHojaUsuarios()];

        case "inasistencias":
            return [crearHojaInasistencias()];

        case "embarques":
            return [crearHojaEmbarques()];

        case "tareas-activas":
            if (typeof obtenerHojasExportacionTareasActivas !== "function") {
                throw new Error(
                    "No se encontró la información filtrada de tareas activas."
                );
            }

            return obtenerHojasExportacionTareasActivas();

        case "dashboards":
            if (typeof obtenerHojasExportacionDashboards !== "function") {
                throw new Error("No se encontraron los indicadores del dashboard.");
            }

            return obtenerHojasExportacionDashboards();

        case "todo": {
            // Las secciones inhabilitadas (auth.js) no se exportan.
            const hojas = [crearHojaResumen()];

            if (!paginaInhabilitada("operarios")) {
                hojas.push(crearHojaPersonal());
            }

            if (esAdministrador()) {
                hojas.push(crearHojaUsuarios());
            }

            hojas.push(crearHojaEmbarques());

            if (!paginaInhabilitada("inasistencias")) {
                hojas.push(crearHojaInasistencias());
            }

            return hojas;
        }

        default:
            throw new Error("La sección no tiene una exportación configurada.");
    }
}

function crearHojaResumen() {
    const operarios = obtenerOperarios();
    const activos = operarios.filter((operario) => {
        return operario.estado === "Activo";
    });
    const inasistencias = esAdministrador()
        ? obtenerInasistencias()
        : obtenerInasistenciasVisibles();
    const embarquesActivos = obtenerEmbarques().filter((embarque) => {
        return obtenerEstadoEmbarque(embarque) !==
            ESTADO_EMBARQUE_FINALIZADO;
    });

    const filas = [
        ["Indicador", "Valor"],
        ["Fecha de exportación", formatearFechaHoraExcel(new Date())]
    ];

    if (!paginaInhabilitada("operarios")) {
        filas.push(
            ["Operarios registrados", operarios.length],
            ["Operarios activos", activos.length]
        );
    }

    if (!paginaInhabilitada("horas")) {
        filas.push(["Horas acumuladas", obtenerTotalHoras()]);
    }

    filas.push(["Embarques activos", embarquesActivos.length]);

    if (!paginaInhabilitada("inasistencias")) {
        filas.push(["Inasistencias visibles", inasistencias.length]);
    }

    return {
        nombre: "Resumen",
        filas
    };
}

function crearHojaPersonal() {
    const usuarios = obtenerUsuarios();
    const filas = obtenerOperarios().map((operario) => {
        const usuario = usuarios.find((item) => {
            return item.operarioId === operario.id;
        });

        return [
            operario.legajo,
            operario.nombre,
            operario.cargo,
            normalizarOperativa(operario.operativa),
            operario.turno,
            operario.estado,
            usuario ? usuario.nombreUsuario : "Sin cuenta",
            usuario ? (usuario.activo ? "Activo" : "Inactivo") : "No aplica",
            formatearFechaHoraExcel(operario.fechaRegistro)
        ];
    });

    return {
        nombre: "Personal",
        filas: [
            [
                "Legajo",
                "Nombre completo",
                "Cargo",
                "Operativa",
                "Turno",
                "Estado",
                "Usuario",
                "Estado de acceso",
                "Fecha de registro"
            ],
            ...filas
        ]
    };
}

function crearHojaUsuarios() {
    const operarios = obtenerOperarios();
    const filas = obtenerUsuarios().map((usuario) => {
        const operario = operarios.find((item) => {
            return item.id === usuario.operarioId;
        });

        return [
            usuario.nombre,
            usuario.nombreUsuario,
            operario ? operario.nombre : "Administrador inicial",
            operario ? operario.legajo : "No aplica",
            formatearRolExcel(usuario.rol),
            usuario.activo ? "Activo" : "Inactivo",
            formatearFechaHoraExcel(usuario.fechaRegistro)
        ];
    });

    return {
        nombre: "Usuarios",
        filas: [
            [
                "Nombre",
                "Usuario",
                "Operario vinculado",
                "Legajo",
                "Rol",
                "Estado",
                "Fecha de registro"
            ],
            ...filas
        ]
    };
}

function crearHojaInasistencias() {
    const operarios = obtenerOperarios();
    const usuarios = obtenerUsuarios();
    const registros = obtenerInasistenciasVisibles();
    const filas = registros.map((registro) => {
        const operario = operarios.find((item) => {
            return item.id === registro.operarioId;
        });
        const responsable = usuarios.find((usuario) => {
            return usuario.id === registro.registradoPor;
        });

        return [
            operario ? operario.legajo : "No disponible",
            operario ? operario.nombre : "Operario no disponible",
            normalizarOperativa(operario ? operario.operativa : ""),
            formatearFechaExcel(registro.fechaDesde),
            formatearFechaExcel(registro.fechaHasta),
            registro.duracion === "parcial"
                ? "Ausencia parcial"
                : "Jornada completa",
            registro.horaDesde || "No aplica",
            registro.horaHasta || "No aplica",
            diasCalendarioExcel(registro.fechaDesde, registro.fechaHasta),
            registro.motivo || "Sin motivo",
            registro.detalle || "",
            responsable ? responsable.nombreUsuario : "No disponible",
            formatearFechaHoraExcel(registro.fechaRegistro)
        ];
    });

    return {
        nombre: "Inasistencias",
        filas: [
            [
                "Legajo",
                "Operario",
                "Operativa",
                "Fecha desde",
                "Fecha hasta",
                "Duración",
                "Hora desde",
                "Hora hasta",
                "Días calendario",
                "Motivo",
                "Observaciones",
                "Registrado por",
                "Fecha de registro"
            ],
            ...filas
        ]
    };
}

function crearHojaEmbarques() {
    const usuarios = obtenerUsuarios();
    const filas = obtenerEmbarques()
        .slice()
        .sort(compararEmbarques)
        .map((embarque) => {
            const responsable = usuarios.find((usuario) => {
                return usuario.id === embarque.creadoPor;
            });
            const metas = obtenerMetasEmbarque(embarque);

            return [
                embarque.referencia,
                normalizarOperativa(embarque.operativa),
                embarque.origen,
                embarque.tipoCarga,
                embarque.bultos || 0,
                embarque.pallets || 0,
                formatearFechaDiaHitoExcel(obtenerLlegadaEmbarque(embarque)),
                formatearFechaDiaHitoExcel(
                    obtenerControlIngresoEmbarque(embarque)
                ),
                formatearFechaDiaHitoExcel(metas.control.limite),
                metas.control.etiqueta,
                formatearFechaDiaHitoExcel(
                    obtenerCrossdockingEmbarque(embarque)
                ),
                formatearFechaDiaHitoExcel(metas.crossdocking.limite),
                metas.crossdocking.etiqueta,
                formatearFechaDiaHitoExcel(
                    obtenerAlmacenamientoEmbarque(embarque)
                ),
                formatearFechaDiaHitoExcel(metas.almacenamiento.limite),
                metas.almacenamiento.etiqueta,
                obtenerEstadoEmbarque(embarque),
                embarque.observaciones || "",
                responsable ? responsable.nombreUsuario : "No disponible",
                formatearFechaHoraExcel(embarque.fechaRegistro),
                formatearFechaHoraExcel(embarque.fechaActualizacion)
            ];
        });

    return {
        nombre: "Embarques",
        filas: [
            [
                "Referencia",
                "Operativa",
                "Proveedor u origen",
                "Tipo de carga",
                "Bultos",
                "Pallets estimados",
                "Confirmación de llegada",
                "Confirmación de control / ingreso",
                "Límite control / ingreso (48 h)",
                "Cumplimiento control / ingreso",
                "Confirmación de crossdocking",
                "Límite crossdocking (48 h)",
                "Cumplimiento crossdocking",
                "Confirmación de almacenamiento",
                "Límite almacenamiento (72 h)",
                "Cumplimiento almacenamiento",
                "Estado",
                "Observaciones",
                "Registrado por",
                "Fecha de registro",
                "Última actualización"
            ],
            ...filas
        ]
    };
}

function formatearRolExcel(rol) {
    return rol === ROL_ADMINISTRADOR ? "Administrador" : "Usuario normal";
}

function formatearFechaDiaHitoExcel(fecha) {
    return fecha ? formatearFechaDiaEmbarque(fecha) : "";
}

function formatearFechaExcel(fecha) {
    if (!fecha) {
        return "";
    }

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-UY");
}

function formatearFechaHoraExcel(fecha) {
    if (!fecha) {
        return "";
    }

    const valor = fecha instanceof Date ? fecha : new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "";
    }

    return valor.toLocaleString("es-UY", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function diasCalendarioExcel(desde, hasta) {
    if (!desde || !hasta) {
        return "";
    }

    const inicio = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    return Math.round((fin - inicio) / 86400000) + 1;
}

async function crearArchivoExcel(hojas) {
    const zip = new JSZip();
    const nombres = obtenerNombresHojas(hojas);

    zip.file("[Content_Types].xml", crearTiposContenido(hojas.length));
    zip.folder("_rels").file(".rels", crearRelacionesRaiz());
    zip.folder("xl").file("workbook.xml", crearLibroXml(nombres));
    zip.folder("xl").file("styles.xml", crearEstilosExcel());
    zip.folder("xl").folder("_rels").file(
        "workbook.xml.rels",
        crearRelacionesLibro(hojas.length)
    );

    const carpetaHojas = zip.folder("xl").folder("worksheets");

    hojas.forEach((hoja, indice) => {
        carpetaHojas.file(
            `sheet${indice + 1}.xml`,
            crearHojaXml(hoja.filas)
        );
    });

    return zip.generateAsync({
        type: "blob",
        mimeType: TIPO_ARCHIVO_EXCEL,
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });
}

function obtenerNombresHojas(hojas) {
    const usados = new Set();

    return hojas.map((hoja, indice) => {
        let nombre = String(hoja.nombre || `Hoja ${indice + 1}`)
            .replace(/[\\/?*\[\]:]/g, " ")
            .trim()
            .slice(0, 31) || `Hoja ${indice + 1}`;
        let candidato = nombre;
        let numero = 2;

        while (usados.has(candidato.toLowerCase())) {
            const sufijo = ` ${numero}`;
            candidato = `${nombre.slice(0, 31 - sufijo.length)}${sufijo}`;
            numero += 1;
        }

        usados.add(candidato.toLowerCase());
        return candidato;
    });
}

function crearTiposContenido(cantidadHojas) {
    const hojas = Array.from({ length: cantidadHojas }, (_, indice) => {
        return `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas}
</Types>`;
}

function crearRelacionesRaiz() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function crearLibroXml(nombres) {
    const hojas = nombres.map((nombre, indice) => {
        return `<sheet name="${escaparXml(nombre)}" sheetId="${indice + 1}" r:id="rId${indice + 1}"/>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>${hojas}</sheets>
</workbook>`;
}

function crearRelacionesLibro(cantidadHojas) {
    const hojas = Array.from({ length: cantidadHojas }, (_, indice) => {
        return `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`;
    }).join("");
    const idEstilos = cantidadHojas + 1;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas}
<Relationship Id="rId${idEstilos}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function crearEstilosExcel() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF426C25"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD9DED9"/></left><right style="thin"><color rgb="FFD9DED9"/></right><top style="thin"><color rgb="FFD9DED9"/></top><bottom style="thin"><color rgb="FFD9DED9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function crearHojaXml(filas) {
    const cantidadFilas = Math.max(1, filas.length);
    const cantidadColumnas = Math.max(
        1,
        ...filas.map((fila) => fila.length)
    );
    const referenciaFinal = `${letraColumna(cantidadColumnas)}${cantidadFilas}`;
    const columnas = crearColumnasXml(filas, cantidadColumnas);
    const contenido = filas.map((fila, indiceFila) => {
        const numeroFila = indiceFila + 1;
        const celdas = Array.from({ length: cantidadColumnas }, (_, indice) => {
            return crearCeldaXml(
                fila[indice],
                `${letraColumna(indice + 1)}${numeroFila}`,
                indiceFila === 0 ? 1 : 0
            );
        }).join("");

        return `<row r="${numeroFila}"${indiceFila === 0 ? ' ht="24" customHeight="1"' : ""}>${celdas}</row>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${referenciaFinal}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
${columnas}
<sheetData>${contenido}</sheetData>
<autoFilter ref="A1:${referenciaFinal}"/>
</worksheet>`;
}

function crearColumnasXml(filas, cantidadColumnas) {
    const columnas = Array.from({ length: cantidadColumnas }, (_, indice) => {
        const longitud = filas.reduce((maximo, fila) => {
            return Math.max(maximo, String(fila[indice] ?? "").length);
        }, 0);
        const ancho = Math.min(42, Math.max(12, longitud + 2));
        const numero = indice + 1;
        return `<col min="${numero}" max="${numero}" width="${ancho}" customWidth="1"/>`;
    }).join("");

    return `<cols>${columnas}</cols>`;
}

function crearCeldaXml(valor, referencia, estilo) {
    if (typeof valor === "number" && Number.isFinite(valor)) {
        return `<c r="${referencia}" s="${estilo}" t="n"><v>${valor}</v></c>`;
    }

    const texto = valor === null || valor === undefined ? "" : String(valor);
    return `<c r="${referencia}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
}

function letraColumna(numero) {
    let resultado = "";
    let valor = numero;

    while (valor > 0) {
        const resto = (valor - 1) % 26;
        resultado = String.fromCharCode(65 + resto) + resultado;
        valor = Math.floor((valor - 1) / 26);
    }

    return resultado;
}

function escaparXml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function descargarArchivoExcel(archivo, nombre) {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
