/*
 * Ícono "Cómo se calcula" para indicadores, gráficos y columnas calculadas.
 *
 * Cada elemento que muestra un dato calculado lleva data-calculo="clave"
 * en su HTML (o en la plantilla que lo dibuja). Este módulo agrega el botón
 * con el ícono y muestra un globo con la explicación de EXPLICACIONES_CALCULO.
 * - Por defecto, el ícono queda en la esquina superior derecha del elemento.
 * - Con data-calculo-en-linea se agrega al final del contenido (encabezados
 *   de tabla, leyendas y rótulos cortos).
 * - Una clave con prefijo ("kpi:<clave>") arma el texto al abrir, con los
 *   números del período: ver FUENTES_DINAMICAS.
 *
 * Los textos deben coincidir con el cálculo real: si cambia una fórmula,
 * actualizá su explicación acá.
 */
(() => {
    "use strict";

    const TOLERANCIA = "10 min";

    const EXPLICACIONES_CALCULO = {
        // Inicio · Gestión general
        "inicio-horas": {
            formula: "Horas = suma de las horas registradas en la sección Horas.",
            nota: "Filtra por la operativa elegida. No usa el período seleccionado."
        },
        "inicio-inasistencias": {
            formula: "Inasistencias = cantidad de registros de inasistencia.",
            nota: "Cuenta registros, no días. Filtra por operativa, sin usar el " +
                "período. Si no sos administrador, solo cuenta los tuyos."
        },
        "inicio-embarques-activos": {
            formula: "Embarques activos = embarques que todavía no están finalizados.",
            nota: "Finalizado: crossdocking y almacenamiento confirmados. Filtra " +
                "por operativa, sin usar el período."
        },

        // Inicio · Indicadores operativos y análisis
        "inicio-unidades": {
            formula: "Cantidad de unidades = suma de |Movimiento| de los " +
                "movimientos que suman unidades.",
            nota: "Qué movimientos suman lo definen las reglas de Actividades. " +
                "Respeta operativa, tarea y período."
        },
        "inicio-usuarios": {
            formula: "Usuarios activos = cantidad de usuarios WMS distintos con " +
                "al menos un movimiento.",
            nota: "Respeta operativa, tarea y período."
        },
        "inicio-visitas": {
            formula: "Visitas por ubicación = cantidad de movimientos del mapa " +
                "con una ubicación válida.",
            nota: "Cada movimiento suma 1 visita, aunque se repita la ubicación."
        },
        "inicio-productividad": {
            formula: "Productividad por hora = unidades vinculadas ÷ horas " +
                "productivas.",
            nota: "Se vinculan los movimientos con los períodos de Tareas " +
                "activas del mismo usuario y actividad. Si el primer movimiento " +
                `llega más de ${TOLERANCIA} después del inicio, las horas ` +
                "cuentan desde ese movimiento."
        },
        "inicio-tendencia": {
            formula: "Valor del día = suma de la Cantidad de unidades de ese día.",
            nota: "La línea gris es el período anterior: el ciclo o mes previo, " +
                "o la misma cantidad de días justo antes. Día pico: el día con " +
                "más unidades."
        },
        "inicio-distribucion": {
            formula: "Unidades por tarea = suma de |Movimiento| de los " +
                "movimientos que suman unidades, por descripción de aplicación.",
            nota: "Si hay más de 8 tareas, las menores se agrupan en «Otras»."
        },
        "inicio-embarques-recibidos": {
            formula: "Recibidos = embarques con llegada confirmada dentro del " +
                "período.",
            nota: "Respeta la operativa elegida."
        },
        "inicio-meta-control": {
            formula: "En meta = control / ingreso confirmado dentro de las 48 h " +
                "desde el inicio operativo.",
            nota: "Fuera: se confirmó después o venció sin confirmar. Pendiente: " +
                "todavía en plazo. Con 2 o más contenedores el mismo día, el " +
                "inicio se corre +24 h por orden de registro."
        },
        "inicio-meta-crossdocking": {
            formula: "En meta = crossdocking confirmado dentro de las 48 h desde " +
                "el control / ingreso.",
            nota: "Fuera: se confirmó después o venció sin confirmar. Pendiente: " +
                "todavía en plazo o sin control confirmado."
        },
        "inicio-meta-almacenamiento": {
            formula: "En meta = almacenamiento confirmado dentro de las 72 h " +
                "desde el control / ingreso.",
            nota: "Fuera: se confirmó después o venció sin confirmar. Pendiente: " +
                "todavía en plazo o sin control confirmado."
        },
        "inicio-top-operarios": {
            formula: "Top = hasta 10 usuarios con más unidades (o visitas, según " +
                "«Ordenar por»).",
            nota: "Usa la misma operativa, tarea y período del resumen. Si " +
                "empatan, primero el que tiene más unidades."
        },
        "inicio-top-unidades": {
            formula: "Cantidad de unidades = suma de las unidades de los " +
                "movimientos del usuario."
        },
        "inicio-top-visitas": {
            formula: "Visitas por ubicación = movimientos del usuario en el mapa " +
                "con una ubicación válida."
        },
        "inicio-top-horas": {
            formula: "Horas productivas = suma de los períodos de Tareas activas " +
                "del usuario con movimientos vinculados.",
            nota: `Si el primer movimiento llega más de ${TOLERANCIA} después ` +
                "del inicio, el período cuenta desde ese movimiento."
        },
        "inicio-top-productividad": {
            formula: "Productividad por hora = unidades vinculadas del usuario ÷ " +
                "sus horas productivas."
        },
        "inicio-cumplimiento-embarques": {
            formula: "% en meta = contenedores con sus 3 metas en meta ÷ " +
                "contenedores recibidos en el período × 100.",
            nota: "Fuera de meta: alguna meta se confirmó tarde o venció. " +
                "Pendiente: el resto."
        },
        "inicio-pendientes-llegada": {
            formula: "Pendientes por llegar = embarques sin llegada confirmada " +
                "con arribo estimado dentro del período."
        },

        // Reportes y dashboards · Comparación, tendencia y base facturable.
        // Las tarjetas de KPI usan claves "kpi:<clave>" con la cuenta del
        // período (obtenerContenidoCalculoKpiDashboards en dashboards.js).
        "dashboards-comparacion": {
            formula: "Valor del día = suma de las unidades de las tareas marcadas " +
                "para la comparación diaria.",
            nota: "Se marcan en Actividades (por defecto recepción, " +
                "almacenamiento, picking y expedición). La línea gris es el " +
                "período anterior, día por día. Si el período está en curso, el " +
                "total se compara con los mismos días del anterior."
        },
        "dashboards-tendencia": {
            formula: "Barra de cada mes = indicador elegido, calculado sobre ese " +
                "ciclo 21–20.",
            nota: "Detrás, en gris, el mismo ciclo del año anterior. Debajo, la " +
                "variación: en % para cantidades y en puntos (pp) para " +
                "porcentajes. El ciclo en curso no muestra variación. Necesita " +
                "unos dos años de movimientos: se ve al consultar con «Incluir " +
                "historial completo»."
        },
        "comercial-embarques": {
            formula: "Embarques = embarques de la operativa con llegada confirmada " +
                "en el período."
        },
        "comercial-contenedores": {
            formula: "Contenedores = embarques del período con tipo de carga " +
                "Contenedor."
        },
        "comercial-bultos": {
            formula: "Bultos = suma de los bultos cargados en los embarques del " +
                "período."
        },
        "comercial-recibidas": {
            formula: "Unid. recibidas = suma de las unidades de REC501 con " +
                "movimiento positivo."
        },
        "comercial-lineas-picking": {
            formula: "Líneas de picking = cantidad de filas clasificadas como " +
                "picking (PRD095 con movimiento negativo)."
        },
        "comercial-pickeadas": {
            formula: "Unid. pickeadas = suma de las unidades de las líneas de " +
                "picking."
        },
        "comercial-expedidas": {
            formula: "Unid. expedidas = suma de las unidades de EXP040 con " +
                "movimiento negativo hacia el muelle 1MPUE."
        },
        "comercial-posiciones": {
            formula: "Posiciones usadas = ubicaciones distintas con picking, " +
                "guardado, transferencia o inventario.",
            nota: "No cuentan los muelles 1MREC ni 1MPUE. En el total, una " +
                "ubicación de varias operativas cuenta una sola vez."
        },
        "comercial-fill-rate": {
            formula: "Fill rate = unidades expedidas ÷ unidades pickeadas × 100 " +
                "(tope 100 %).",
            nota: "Sin expediciones o sin picking en el período queda «—»."
        },

        // Reportes y dashboards · Mapa de calor
        "mapa-escala": {
            formula: "Color = unidades (o visitas) de la casilla ÷ percentil 95 " +
                "de las casillas con actividad.",
            nota: "Se reparte en 5 niveles. Lo que supera el percentil 95 queda " +
                "en el nivel más alto, así los extremos no apagan al resto."
        },
        "mapa-inactividad": {
            formula: "Sin movimiento en 3 meses = ubicaciones del plano sin " +
                "movimientos en los 3 meses previos a la fecha final.",
            nota: "No usa la fecha inicial del período. En la vista 3D se evalúa " +
                "cada altura por separado. Necesita historial que llegue a esa " +
                "fecha límite. Sin «Incluir historial completo» también cuenta " +
                "las que no se movieron en ningún momento de lo consultado."
        },
        "mapa-nunca": {
            formula: "Nunca movidas = ubicaciones del plano sin ningún movimiento " +
                "en todo el historial importado.",
            nota: "Necesita «Incluir historial completo»: sin todo el historial, " +
                "estas ubicaciones se cuentan como inactivas. Usa los filtros de " +
                "operativa, tarea, piso y tipo de ubicación."
        },
        "mapa-comparacion-piso": {
            formula: "Total del piso = suma de las unidades (o visitas) de sus " +
                "ubicaciones."
        },
        "mapa-comparacion-diferencia": {
            formula: "Diferencia = total del piso B − total del piso A.",
            nota: "El porcentaje es la diferencia ÷ total del piso A."
        },
        "mapa-comparacion-crecimiento": {
            formula: "Mayor crecimiento = módulo con la mayor diferencia B − A.",
            nota: "Compara la misma calle y módulo en los dos pisos."
        },
        "mapa-comparacion-caida": {
            formula: "Mayor caída = módulo con la diferencia B − A más negativa.",
            nota: "Compara la misma calle y módulo en los dos pisos."
        },
        "mapa-3d": {
            formula: "Escala hasta = percentil 95 de los bloques visibles.",
            nota: "En «Racks» cada bloque es una altura; en «Barras», un módulo " +
                "con la suma de sus alturas visibles. Con actividad: bloques " +
                "con valor mayor a 0."
        },

        // Reportes y dashboards · Historial de importaciones
        "reportes-historial-registros": {
            formula: "Registros = filas guardadas de ese archivo.",
            nota: "No incluye las filas con movimiento 0 ni las de empresas " +
                "excluidas."
        },
        "reportes-historial-unidades": {
            formula: "Unidades = Cantidad de unidades del archivo completo con " +
                "las reglas vigentes.",
            nota: "No aplica los filtros de la página. Si el archivo todavía no " +
                "se leyó en una consulta, muestra el total calculado al " +
                "importarlo."
        },

        // Gestión de embarques
        "embarques-activos": {
            formula: "Embarques activos = embarques que no están finalizados.",
            nota: "Incluye los pendientes de llegada y los que están en proceso."
        },
        "embarques-llegadas": {
            formula: "Llegadas confirmadas = embarques con fecha real de llegada."
        },
        "embarques-metas-vencidas": {
            formula: "Metas vencidas = embarques con al menos una meta fuera de " +
                "plazo.",
            nota: "Cuenta metas confirmadas tarde y vencidas sin confirmar " +
                "(control 48 h, crossdocking 48 h, almacenamiento 72 h)."
        },
        "embarques-finalizados": {
            formula: "Finalizados = embarques con crossdocking y almacenamiento " +
                "confirmados."
        },
        "embarques-retrasos": {
            formula: "Retrasos activos = embarques no finalizados con motivo de " +
                "retraso."
        },
        "embarques-resoluciones": {
            formula: "Resoluciones vencidas = retrasos activos con fecha prevista " +
                "de resolución anterior a hoy."
        },
        "embarques-causa": {
            formula: "Causa principal = el motivo más repetido entre los " +
                "retrasos activos.",
            nota: "Debajo figura la cantidad de casos. Si empatan, se toma el " +
                "primero en orden alfabético."
        },
        "embarques-cumplimiento": {
            formula: "% cumplidas = contenedores con sus 3 metas en meta ÷ " +
                "contenedores × 100.",
            nota: "No cumplida: alguna meta tarde o vencida. Pendiente: el " +
                "resto. Solo cuentan las cargas de tipo Contenedor."
        },
        "embarques-hito-control": {
            formula: "Meta = inicio operativo + 48 h.",
            nota: "En meta si el control se confirmó hasta esa fecha; Vencido si " +
                "pasó sin confirmar. Con varios contenedores el mismo día, el " +
                "inicio se corre +24 h por orden de registro."
        },
        "embarques-hito-crossdocking": {
            formula: "Meta = control / ingreso + 48 h.",
            nota: "En meta si se confirmó hasta esa fecha; Vencido si pasó sin " +
                "confirmar."
        },
        "embarques-hito-almacenamiento": {
            formula: "Meta = control / ingreso + 72 h.",
            nota: "En meta si se confirmó hasta esa fecha; Vencido si pasó sin " +
                "confirmar."
        },
        "embarques-estado": {
            formula: "Estado = último hito confirmado.",
            nota: "Pendiente de llegada → llegada → control / ingreso → " +
                "crossdocking o almacenamiento → finalizado (ambos confirmados)."
        },

        // Inasistencias
        "inasistencias-registros": {
            formula: "Registros = cantidad de inasistencias que cumplen los " +
                "filtros.",
            nota: "Cuenta registros, no días."
        },
        "inasistencias-certificaciones": {
            formula: "Certificaciones médicas = registros con motivo " +
                "«Certificación médica»."
        },
        "inasistencias-pendientes": {
            formula: "Documentación pendiente = certificaciones médicas sin " +
                "documento adjunto."
        },

        // Tareas activas
        "tareas-activos": {
            formula: "Activos = registros abiertos en operación.",
            nota: "Es el estado actual: no usa los filtros de la tabla."
        },
        "tareas-pausados": {
            formula: "Pausados = registros abiertos en pausa.",
            nota: "Es el estado actual: no usa los filtros de la tabla."
        },
        "tareas-disponibles": {
            formula: "Disponibles = usuarios activos − usuarios con un registro " +
                "abierto.",
            nota: "Registro abierto: en operación o en pausa."
        },
        "tareas-alarma": {
            formula: "Alarma activa = algún handheld conectado informa la alarma " +
                "antipérdida.",
            nota: "Conectado: reportó en los últimos 2 min. Si no hay ninguno, " +
                "se encienden los registros abiertos con 30 min o más sin " +
                "movimiento."
        },
        "tareas-bateria": {
            formula: "Batería baja = algún handheld informa 20% de batería o " +
                "menos.",
            nota: "Toma los handhelds conectados (últimos 2 min) o, si no hay " +
                "ninguno, los registros abiertos."
        },
        "tareas-tiempo": {
            formula: "Tiempo total = suma de los períodos en operación.",
            nota: "No cuenta las pausas. Si la tarea sigue activa, se actualiza " +
                "en vivo."
        },
        "tareas-pausas": {
            formula: "Pausas = veces que se pausó la tarea."
        },

        // Actividades
        "actividades-manuales": {
            formula: "Actividades manuales = actividades creadas desde la web, " +
                "activas o inactivas."
        },
        "actividades-activas": {
            formula: "Activas = actividades manuales en estado activa."
        },
        "actividades-wis": {
            formula: "Aplicaciones WIS = aplicaciones de las reglas WIS, " +
                "agregadas automáticamente."
        },
        "actividades-catalogo": {
            formula: "Catálogo disponible = actividades manuales activas + " +
                "aplicaciones WIS."
        },
        "reglas-total": {
            formula: "Reglas configuradas = total de reglas del catálogo.",
            nota: "Vigentes hoy: reglas cuya vigencia incluye la fecha de hoy."
        },
        "reglas-unidades": {
            formula: "Suman unidades = reglas incluidas que aportan a Cantidad " +
                "de unidades."
        },
        "reglas-visitas": {
            formula: "Visitas por ubicación = reglas incluidas que usan la " +
                "ubicación en el mapa."
        },
        "reglas-tolerancia": {
            formula: `Tolerancia = ${TOLERANCIA} (valor fijo).`,
            nota: "Si el primer movimiento llega dentro de ese margen, se " +
                "respeta la hora de inicio marcada; si no, las horas cuentan " +
                "desde ese movimiento."
        }
    };

    const SVG_ICONO =
        '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
        '<circle cx="10" cy="10" r="7.25"/>' +
        '<path d="M10 9.2v4.6"/>' +
        '<circle class="punto-icono-calculo" cx="10" cy="6.3" r="1.05"/>' +
        "</svg>";
    const SEPARACION_GLOBO = 8;

    let globo = null;
    let botonActivo = null;
    let globoFijado = false;
    let pasadaPendiente = false;
    let reubicacionPendiente = false;
    const clavesSinExplicacion = new Set();

    /*
     * Claves con prefijo ("kpi:pickeos"): el texto se arma al abrir el globo,
     * con los números del período elegido. Además de la fórmula y la nota
     * pueden traer `operacion` (la cuenta, una línea por paso) y `contexto`.
     */
    const FUENTES_DINAMICAS = {
        kpi: (id) => typeof obtenerContenidoCalculoKpiDashboards === "function"
            ? obtenerContenidoCalculoKpiDashboards(id)
            : null
    };
    const EXPLICACION_SIN_DATOS = {
        formula: "Todavía no hay datos para calcular este indicador.",
        nota: "Elegí una operativa y un período con movimientos."
    };

    function esClaveDinamica(clave) {
        return clave.includes(":") &&
            typeof FUENTES_DINAMICAS[clave.split(":")[0]] === "function";
    }

    function obtenerExplicacion(clave) {
        if (EXPLICACIONES_CALCULO[clave]) {
            return EXPLICACIONES_CALCULO[clave];
        }

        if (!esClaveDinamica(clave)) {
            return null;
        }

        const [fuente, id] = clave.split(":");
        return FUENTES_DINAMICAS[fuente](id) || EXPLICACION_SIN_DATOS;
    }

    function obtenerNombreIndicador(elemento, clave) {
        const explicacion = EXPLICACIONES_CALCULO[clave];

        if (!explicacion) {
            const titulo = elemento.querySelector("h1, h2, h3, h4");
            return titulo ? titulo.textContent.trim() : "";
        }

        const [nombre] = explicacion.formula.split(" = ");
        return nombre === explicacion.formula ? "" : nombre;
    }

    function crearBoton(clave, nombre) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton-calculo";
        boton.dataset.claveCalculo = clave;
        boton.setAttribute(
            "aria-label",
            nombre ? `Cómo se calcula: ${nombre}` : "Cómo se calcula este dato"
        );
        boton.setAttribute("aria-expanded", "false");
        // Un title vacío evita que aparezca también el title del contenedor.
        boton.title = "";
        boton.innerHTML = SVG_ICONO;
        return boton;
    }

    function prepararIndicadores() {
        pasadaPendiente = false;

        document.querySelectorAll("[data-calculo]").forEach((elemento) => {
            if (elemento.querySelector(":scope > .boton-calculo")) {
                return;
            }

            const clave = elemento.dataset.calculo;

            if (!EXPLICACIONES_CALCULO[clave] && !esClaveDinamica(clave)) {
                if (!clavesSinExplicacion.has(clave)) {
                    clavesSinExplicacion.add(clave);
                    console.warn(`Falta la explicación de cálculo "${clave}".`);
                }
                return;
            }

            elemento.appendChild(
                crearBoton(clave, obtenerNombreIndicador(elemento, clave))
            );
        });

        if (botonActivo && !botonActivo.isConnected) {
            cerrarGlobo();
        }
    }

    function programarPasada() {
        if (pasadaPendiente) {
            return;
        }

        pasadaPendiente = true;
        requestAnimationFrame(prepararIndicadores);
    }

    function obtenerGlobo() {
        if (globo) {
            return globo;
        }

        globo = document.createElement("div");
        globo.id = "globo-calculo";
        globo.className = "globo-calculo";
        globo.setAttribute("role", "tooltip");
        globo.hidden = true;
        document.body.appendChild(globo);
        return globo;
    }

    function completarGlobo(explicacion) {
        const contenedor = obtenerGlobo();
        const etiqueta = document.createElement("span");
        const formula = document.createElement("p");

        etiqueta.className = "etiqueta-globo-calculo";
        etiqueta.textContent = "Cómo se calcula";
        formula.className = "formula-globo-calculo";
        formula.textContent = explicacion.formula;
        contenedor.replaceChildren(etiqueta, formula);

        const pasos = (explicacion.operacion || []).filter(Boolean);

        if (pasos.length) {
            const operacion = document.createElement("ul");
            operacion.className = "operacion-globo-calculo";
            pasos.forEach((paso) => {
                const item = document.createElement("li");
                item.textContent = paso;
                operacion.appendChild(item);
            });
            contenedor.appendChild(operacion);
        }

        [
            ["nota", "nota-globo-calculo"],
            ["contexto", "contexto-globo-calculo"]
        ].forEach(([campo, clase]) => {
            if (!explicacion[campo]) {
                return;
            }

            const parrafo = document.createElement("p");
            parrafo.className = clase;
            parrafo.textContent = explicacion[campo];
            contenedor.appendChild(parrafo);
        });
    }

    function posicionarGlobo(boton) {
        const contenedor = obtenerGlobo();
        const ancla = boton.getBoundingClientRect();
        const ancho = contenedor.offsetWidth;
        const alto = contenedor.offsetHeight;
        const margen = SEPARACION_GLOBO;
        // Se alinea por la derecha con el ícono, que suele estar en una esquina.
        const izquierda = Math.min(
            Math.max(margen, ancla.right - ancho),
            window.innerWidth - ancho - margen
        );
        const caeDebajo = ancla.bottom + margen + alto <=
            window.innerHeight - margen;
        const arriba = caeDebajo
            ? ancla.bottom + margen
            : Math.max(margen, ancla.top - margen - alto);

        contenedor.style.left = `${Math.round(izquierda)}px`;
        contenedor.style.top = `${Math.round(arriba)}px`;
    }

    function abrirGlobo(boton, fijar = false) {
        const explicacion = obtenerExplicacion(boton.dataset.claveCalculo);

        if (!explicacion) {
            return;
        }

        if (botonActivo && botonActivo !== boton) {
            cerrarGlobo();
        }

        const contenedor = obtenerGlobo();
        completarGlobo(explicacion);
        contenedor.hidden = false;
        posicionarGlobo(boton);
        botonActivo = boton;
        globoFijado = globoFijado || fijar;
        boton.setAttribute("aria-expanded", "true");
        boton.setAttribute("aria-describedby", contenedor.id);
    }

    function cerrarGlobo() {
        if (globo) {
            globo.hidden = true;
        }

        if (botonActivo) {
            botonActivo.setAttribute("aria-expanded", "false");
            botonActivo.removeAttribute("aria-describedby");
        }

        botonActivo = null;
        globoFijado = false;
    }

    function obtenerBotonEvento(evento) {
        return evento.target instanceof Element
            ? evento.target.closest(".boton-calculo")
            : null;
    }

    function escucharEventos() {
        document.addEventListener("click", (evento) => {
            const boton = obtenerBotonEvento(evento);

            if (boton) {
                // Evita que el clic active la tarjeta, la fila o el plano.
                evento.preventDefault();
                evento.stopPropagation();

                if (botonActivo === boton && globoFijado) {
                    cerrarGlobo();
                } else {
                    abrirGlobo(boton, true);
                }
                return;
            }

            if (botonActivo && !globo?.contains(evento.target)) {
                cerrarGlobo();
            }
        }, true);

        document.addEventListener("pointerover", (evento) => {
            const boton = obtenerBotonEvento(evento);

            if (boton && evento.pointerType === "mouse" && !globoFijado) {
                abrirGlobo(boton);
            }
        });

        document.addEventListener("pointerout", (evento) => {
            const boton = obtenerBotonEvento(evento);

            if (
                boton &&
                boton === botonActivo &&
                !globoFijado &&
                !boton.contains(evento.relatedTarget)
            ) {
                cerrarGlobo();
            }
        });

        document.addEventListener("focusin", (evento) => {
            const boton = obtenerBotonEvento(evento);

            if (boton && !globoFijado && boton.matches(":focus-visible")) {
                abrirGlobo(boton);
            }
        });

        document.addEventListener("focusout", (evento) => {
            const boton = obtenerBotonEvento(evento);

            // Un globo fijado con clic sigue abierto si el foco no pasa a
            // otro control; el clic fuera del globo ya lo cierra.
            if (
                boton &&
                boton === botonActivo &&
                (!globoFijado || evento.relatedTarget)
            ) {
                cerrarGlobo();
            }
        });

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && botonActivo) {
                cerrarGlobo();
            }
        });

        // El globo es fijo: acompaña a su ícono al desplazar o cambiar el
        // tamaño, y se cierra si el ícono deja de verse.
        window.addEventListener("scroll", programarReubicacion, {
            capture: true,
            passive: true
        });
        window.addEventListener("resize", programarReubicacion);
    }

    function programarReubicacion() {
        if (!botonActivo || reubicacionPendiente) {
            return;
        }

        reubicacionPendiente = true;
        requestAnimationFrame(() => {
            reubicacionPendiente = false;

            if (!botonActivo) {
                return;
            }

            const ancla = botonActivo.getBoundingClientRect();
            const visible = ancla.width > 0 &&
                ancla.bottom > 0 &&
                ancla.top < window.innerHeight;

            if (visible) {
                posicionarGlobo(botonActivo);
            } else {
                cerrarGlobo();
            }
        });
    }

    function iniciar() {
        escucharEventos();
        prepararIndicadores();
        new MutationObserver(programarPasada).observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    globalThis.EXPLICACIONES_CALCULO = EXPLICACIONES_CALCULO;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
})();
