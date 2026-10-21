/*
 * Vista 3D del mapa de calor de Mezzanine.
 *
 * Reutiliza las filas ya filtradas por mapa-calor.js y agrega la dimensión
 * que el plano 2D consolida: la altura de cada ubicación. El código WIS se
 * interpreta con PATRON_UBICACION_MEZZANINE (piso · calle · módulo · altura)
 * y obtenerAlturaMezzanine (5A del piso X = altura 40).
 *
 * Three.js se carga desde assets/vendor solo cuando se abre la vista 3D.
 */

const RUTAS_LIBRERIA_MAPA_3D = [
    "assets/vendor/three.min.js",
    "assets/vendor/three-OrbitControls.js"
];
const CLAVE_PREFERENCIAS_MAPA_3D = "gestion_personal_mapa_calor_3d_v2";
const ALTURAS_MAPA_3D = ["10", "20", "30", "40"];
const NOMBRES_PISOS_MAPA_3D = {
    X: "Piso cero",
    Y: "Segundo piso",
    Z: "Tercer piso"
};
const MEDIDAS_MAPA_3D = {
    anchoModulo: 1,
    profundidadModulo: 1.1,
    altoNivel: 1,
    anchoPasillo: 1.8,
    // Con una sola calle se ensancha el pasillo para ver ambos frentes.
    anchoPasilloCalleAislada: 7,
    separacionEspaldas: 0.25,
    losa: 0.22,
    hueco: 0.14,
    alturaMaximaBarra: 7,
    alturaMinimaBarra: 0.08,
    separacionComparacion: 14,
    margenPiso: 3
};
const COLORES_RESPALDO_MAPA_3D = [
    "#e2e7e3",
    "#d7e8b7",
    "#a8cf57",
    "#e9c04f",
    "#dc8538",
    "#bd4c3e"
];
const COLOR_INACTIVIDAD_MAPA_3D = "#6460c4";
// Nunca tuvo movimientos en el historial: violeta más oscuro que la inactividad.
const COLOR_NUNCA_MAPA_3D = "#2c2170";
const UMBRAL_CLIC_MAPA_3D = 5;

let estadoMapa3D = {
    dimension: "2d",
    representacion: "racks",
    disposicion: "enfrentada",
    alturas: new Set(ALTURAS_MAPA_3D),
    calle: "Todas",
    separacionPisos: 12,
    ocultarSinActividad: false,
    mostrarEstructura: false
};
let preferenciasMapa3DCargadas = false;
let escenaMapa3D = null;
let promesaLibreriaMapa3D = null;
let promesaConstruccionMapa3D = null;
let ultimoContextoMapa3D = null;
let elementosMapa3D = [];
let claveSeleccionMapa3D = "";
let indiceHoverMapa3D = -1;
let camaraActualMapa3D = "isometrica";
let firmaEncuadreMapa3D = "";
let limitesContenidoMapa3D = null;
let eventosGlobalesMapa3DConfigurados = false;
let reconstruccionProgramadaMapa3D = false;
let agrupacionMapa3DCache = { filas: null, resultado: null };

function inicializarMapaCalor3D() {
    cargarPreferenciasMapa3D();

    if (escenaMapa3D && !escenaMapa3D.contenedor.isConnected) {
        destruirEscenaMapa3D();
    }

    firmaEncuadreMapa3D = "";
    claveSeleccionMapa3D = "";
    estadoMapa3D.calle = "Todas";
    cargarCallesMapa3D();

    document.querySelectorAll("[data-dimension-mapa]").forEach((boton) => {
        boton.addEventListener("click", () => {
            establecerDimensionMapa3D(boton.dataset.dimensionMapa);
        });
    });

    document.querySelectorAll("[data-representacion-mapa-3d]")
        .forEach((boton) => {
            boton.addEventListener("click", () => {
                estadoMapa3D.representacion =
                    obtenerRepresentacionBotonMapa3D(boton);
                guardarPreferenciasMapa3D();
                sincronizarControlesMapa3D();
                reconstruirMapa3D();
            });
        });

    document.querySelectorAll("[data-camara-mapa-3d]").forEach((boton) => {
        boton.addEventListener("click", () => {
            aplicarCamaraMapa3D(obtenerCamaraBotonMapa3D(boton));
        });
    });

    document.querySelectorAll('input[name="altura-mapa-3d"]')
        .forEach((casilla) => {
            casilla.addEventListener("change", () => {
                const seleccionadas = [...document.querySelectorAll(
                    'input[name="altura-mapa-3d"]:checked'
                )].map((item) => item.value);

                if (!seleccionadas.length) {
                    casilla.checked = true;
                    return;
                }

                estadoMapa3D.alturas = new Set(seleccionadas);
                guardarPreferenciasMapa3D();
                reconstruirMapa3D();
            });
        });

    document.getElementById("calle-mapa-3d")?.addEventListener(
        "change",
        (evento) => {
            estadoMapa3D.calle = evento.target.value || "Todas";
            limpiarSeleccionMapa3D();
            reconstruirMapa3D();
        }
    );

    document.getElementById("disposicion-mapa-3d")?.addEventListener(
        "change",
        (evento) => {
            estadoMapa3D.disposicion = evento.target.value === "plano"
                ? "plano"
                : "enfrentada";
            guardarPreferenciasMapa3D();
            reconstruirMapa3D();
        }
    );

    document.getElementById("separacion-pisos-mapa-3d")?.addEventListener(
        "input",
        (evento) => {
            estadoMapa3D.separacionPisos = Number(evento.target.value) || 0;
            guardarPreferenciasMapa3D();
            programarReconstruccionMapa3D();
        }
    );

    document.getElementById("ocultar-sin-actividad-mapa-3d")
        ?.addEventListener("change", (evento) => {
            estadoMapa3D.ocultarSinActividad = evento.target.checked;
            guardarPreferenciasMapa3D();
            reconstruirMapa3D();
        });

    document.getElementById("mostrar-estructura-mapa-3d")
        ?.addEventListener("change", (evento) => {
            estadoMapa3D.mostrarEstructura = evento.target.checked;
            guardarPreferenciasMapa3D();
            reconstruirMapa3D();
        });

    if (!eventosGlobalesMapa3DConfigurados) {
        document.addEventListener("keydown", (evento) => {
            if (
                evento.key === "Escape" &&
                claveSeleccionMapa3D &&
                mapaCalor3DActivo()
            ) {
                limpiarSeleccionMapa3D();
            }
        });

        let temaOscuroAnterior = document.body.classList.contains(
            "modo-oscuro"
        );
        new MutationObserver(() => {
            const temaOscuro = document.body.classList.contains("modo-oscuro");

            if (temaOscuro === temaOscuroAnterior) {
                return;
            }

            temaOscuroAnterior = temaOscuro;

            if (mapaCalor3DActivo()) {
                reconstruirMapa3D();
            }
        }).observe(document.body, {
            attributes: true,
            attributeFilter: ["class"]
        });
        eventosGlobalesMapa3DConfigurados = true;
    }

    sincronizarControlesMapa3D();
}

/*
 * En dataset, "data-camara-mapa-3d" queda como "camaraMapa-3d": el guion
 * seguido de un número no pasa a mayúscula, así que dataset.camaraMapa3d no
 * existe. Por eso estos atributos se leen con getAttribute.
 */
function obtenerCamaraBotonMapa3D(boton) {
    return boton.getAttribute("data-camara-mapa-3d") || "";
}

function obtenerRepresentacionBotonMapa3D(boton) {
    return boton.getAttribute("data-representacion-mapa-3d") === "barras"
        ? "barras"
        : "racks";
}

function cargarPreferenciasMapa3D() {
    if (preferenciasMapa3DCargadas) {
        return;
    }

    preferenciasMapa3DCargadas = true;

    try {
        const guardadas = JSON.parse(
            localStorage.getItem(CLAVE_PREFERENCIAS_MAPA_3D) || "null"
        );

        if (!guardadas || typeof guardadas !== "object") {
            return;
        }

        const alturas = Array.isArray(guardadas.alturas)
            ? guardadas.alturas.filter((altura) => {
                return ALTURAS_MAPA_3D.includes(altura);
            })
            : [];

        estadoMapa3D = {
            ...estadoMapa3D,
            dimension: guardadas.dimension === "3d" ? "3d" : "2d",
            representacion: guardadas.representacion === "barras"
                ? "barras"
                : "racks",
            disposicion: guardadas.disposicion === "plano"
                ? "plano"
                : "enfrentada",
            alturas: alturas.length
                ? new Set(alturas)
                : new Set(ALTURAS_MAPA_3D),
            separacionPisos: Number.isFinite(guardadas.separacionPisos)
                ? Math.min(30, Math.max(0, guardadas.separacionPisos))
                : estadoMapa3D.separacionPisos,
            ocultarSinActividad: Boolean(guardadas.ocultarSinActividad),
            mostrarEstructura: Boolean(guardadas.mostrarEstructura)
        };
    } catch (error) {
        console.warn("No se pudieron leer las preferencias del mapa 3D.", error);
    }
}

function guardarPreferenciasMapa3D() {
    try {
        localStorage.setItem(CLAVE_PREFERENCIAS_MAPA_3D, JSON.stringify({
            dimension: estadoMapa3D.dimension,
            representacion: estadoMapa3D.representacion,
            disposicion: estadoMapa3D.disposicion,
            alturas: [...estadoMapa3D.alturas],
            separacionPisos: estadoMapa3D.separacionPisos,
            ocultarSinActividad: estadoMapa3D.ocultarSinActividad,
            mostrarEstructura: estadoMapa3D.mostrarEstructura
        }));
    } catch (error) {
        console.warn("No se pudieron guardar las preferencias del mapa 3D.", error);
    }
}

function sincronizarControlesMapa3D() {
    document.querySelectorAll("[data-dimension-mapa]").forEach((boton) => {
        const activo = boton.dataset.dimensionMapa === estadoMapa3D.dimension;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });

    document.querySelectorAll("[data-representacion-mapa-3d]")
        .forEach((boton) => {
            const activo = obtenerRepresentacionBotonMapa3D(boton) ===
                estadoMapa3D.representacion;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-pressed", String(activo));
        });

    document.querySelectorAll("[data-camara-mapa-3d]").forEach((boton) => {
        const activo = obtenerCamaraBotonMapa3D(boton) === camaraActualMapa3D;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });

    document.querySelectorAll('input[name="altura-mapa-3d"]')
        .forEach((casilla) => {
            casilla.checked = estadoMapa3D.alturas.has(casilla.value);
        });

    const calle = document.getElementById("calle-mapa-3d");
    const disposicion = document.getElementById("disposicion-mapa-3d");
    const separacion = document.getElementById("separacion-pisos-mapa-3d");
    const grupoSeparacion = document.getElementById(
        "grupo-separacion-pisos-mapa-3d"
    );
    const ocultar = document.getElementById("ocultar-sin-actividad-mapa-3d");
    const estructura = document.getElementById("mostrar-estructura-mapa-3d");

    if (calle) {
        calle.value = [...calle.options].some((opcion) => {
            return opcion.value === estadoMapa3D.calle;
        }) ? estadoMapa3D.calle : "Todas";
    }

    if (disposicion) {
        disposicion.value = estadoMapa3D.disposicion;
    }

    if (separacion) {
        separacion.value = String(estadoMapa3D.separacionPisos);
    }

    if (grupoSeparacion) {
        grupoSeparacion.hidden = typeof modoVistaPisosMapa === "undefined" ||
            modoVistaPisosMapa !== "todos";
    }

    if (ocultar) {
        ocultar.checked = estadoMapa3D.ocultarSinActividad;
    }

    if (estructura) {
        estructura.checked = estadoMapa3D.mostrarEstructura;
    }
}

function establecerDimensionMapa3D(dimension) {
    if (!["2d", "3d"].includes(dimension)) {
        return;
    }

    estadoMapa3D.dimension = dimension;
    claveSeleccionMapa3D = "";
    guardarPreferenciasMapa3D();
    sincronizarControlesMapa3D();

    // La selección de un plano no se arrastra al otro.
    if (typeof limpiarSeleccionMapa === "function") {
        limpiarSeleccionMapa();
    }

    if (typeof mostrarMapaCalor === "function") {
        mostrarMapaCalor();
    }
}

function mapaCalor3DActivo() {
    return estadoMapa3D.dimension === "3d" &&
        typeof obtenerMapaCalorSeleccionado === "function" &&
        obtenerMapaCalorSeleccionado() === MAPA_MEZZANINE;
}

/*
 * Punto de entrada desde mostrarMapaCalor(). Recibe las filas ya filtradas
 * por período, usuario, operativa, operación, pisos, tipo y texto.
 */
function actualizarMapaCalor3D(contexto) {
    ultimoContextoMapa3D = contexto;
    const activo = estadoMapa3D.dimension === "3d" &&
        contexto.mapa === MAPA_MEZZANINE &&
        contexto.configuracion?.tipoMapa === "mezzanine";

    aplicarVisibilidadMapa3D(activo);

    if (!activo) {
        return;
    }

    sincronizarControlesMapa3D();
    mostrarEstadoCargaMapa3D("Preparando la vista 3D…");

    promesaConstruccionMapa3D = cargarLibreriaMapa3D()
        .then(() => {
            if (contexto !== ultimoContextoMapa3D || !mapaCalor3DActivo()) {
                return;
            }

            asegurarEscenaMapa3D();
            construirContenidoMapa3D(contexto);
            mostrarEstadoCargaMapa3D("");
        })
        .catch((error) => {
            console.error(error);
            mostrarEstadoCargaMapa3D(
                error.message || "No fue posible abrir la vista 3D.",
                true
            );
        });
}

function reconstruirMapa3D() {
    if (!ultimoContextoMapa3D || !mapaCalor3DActivo() || !escenaMapa3D) {
        return;
    }

    sincronizarControlesMapa3D();
    construirContenidoMapa3D(ultimoContextoMapa3D);
}

// Agrupa los cambios continuos (control de separación) en uno por cuadro.
function programarReconstruccionMapa3D() {
    if (reconstruccionProgramadaMapa3D) {
        return;
    }

    reconstruccionProgramadaMapa3D = true;
    requestAnimationFrame(() => {
        reconstruccionProgramadaMapa3D = false;
        reconstruirMapa3D();
    });
}

function aplicarVisibilidadMapa3D(activo) {
    const panel = document.getElementById("mapa-calor-3d");
    const herramientas = document.getElementById("herramientas-3d-mapa");
    const scroll = document.getElementById("mapa-calor-scroll");
    const zoom = document.getElementById("grupo-zoom-mapa");

    if (panel) {
        panel.hidden = !activo;
    }

    if (herramientas) {
        herramientas.hidden = !activo;
    }

    if (zoom) {
        zoom.hidden = activo;
    }

    // Solo se oculta el plano 2D; mostrarMapaCalor() lo vuelve a mostrar.
    if (scroll && activo) {
        scroll.hidden = true;
    }

    if (!activo) {
        ocultarTooltipMapa3D();
    }
}

function mostrarEstadoCargaMapa3D(texto, esError = false) {
    const estado = document.getElementById("estado-mapa-3d");

    if (!estado) {
        return;
    }

    estado.hidden = !texto;
    estado.textContent = texto;
    estado.classList.toggle("error", esError);
}

function cargarLibreriaMapa3D() {
    if (window.THREE && window.THREE.OrbitControls) {
        return Promise.resolve();
    }

    if (promesaLibreriaMapa3D) {
        return promesaLibreriaMapa3D;
    }

    promesaLibreriaMapa3D = RUTAS_LIBRERIA_MAPA_3D.reduce((cadena, ruta) => {
        return cadena.then(() => cargarScriptMapa3D(ruta));
    }, Promise.resolve())
        .then(() => {
            if (!window.THREE || !window.THREE.OrbitControls) {
                throw new Error("No se pudo inicializar la librería 3D.");
            }
        })
        .catch((error) => {
            promesaLibreriaMapa3D = null;
            throw error;
        });

    return promesaLibreriaMapa3D;
}

function cargarScriptMapa3D(ruta) {
    return new Promise((resolver, rechazar) => {
        const script = document.createElement("script");
        script.src = ruta;
        script.onload = () => resolver();
        script.onerror = () => {
            script.remove();
            rechazar(new Error(`No se pudo cargar ${ruta}.`));
        };
        document.head.appendChild(script);
    });
}

function asegurarEscenaMapa3D() {
    const contenedor = document.getElementById("lienzo-mapa-3d");

    if (!contenedor) {
        throw new Error("No se encontró el contenedor de la vista 3D.");
    }

    if (
        escenaMapa3D &&
        escenaMapa3D.contenedor === contenedor &&
        contenedor.isConnected
    ) {
        return escenaMapa3D;
    }

    destruirEscenaMapa3D();

    let renderer;

    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
        throw new Error(
            "Este navegador o equipo no admite WebGL, necesario para la vista 3D."
        );
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "canvas-mapa-3d";
    renderer.domElement.setAttribute(
        "aria-label",
        "Mapa de calor tridimensional por piso, calle, módulo y altura"
    );
    contenedor.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 6000);
    // La cara superior recibe 0,62 + 0,5 × 0,76 ≈ 1: muestra el color exacto
    // de la leyenda en la vista aérea. Las caras laterales quedan más oscuras.
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8f9a92, 0.62));
    const luz = new THREE.DirectionalLight(0xffffff, 0.5);
    luz.position.set(80, 160, 110);
    escena.add(luz);

    const controles = new THREE.OrbitControls(camara, renderer.domElement);
    controles.enableDamping = false;
    controles.screenSpacePanning = true;
    controles.maxPolarAngle = Math.PI / 2 - 0.02;
    controles.minDistance = 2;
    controles.maxDistance = 1500;
    controles.addEventListener("change", () => {
        ocultarTooltipMapa3D();
        solicitarRenderMapa3D();
    });

    const grupo = new THREE.Group();
    escena.add(grupo);

    const resaltado = crearContornoMapa3D(0x1f2620);
    const seleccion = crearContornoMapa3D(0x2f7d1f);
    escena.add(resaltado, seleccion);

    const observador = new ResizeObserver(() => ajustarTamanoMapa3D());
    observador.observe(contenedor);

    escenaMapa3D = {
        contenedor,
        renderer,
        escena,
        camara,
        controles,
        grupo,
        resaltado,
        seleccion,
        observador,
        raycaster: new THREE.Raycaster(),
        puntero: new THREE.Vector2(),
        mallaInteractiva: null,
        inicioPuntero: null,
        renderPendiente: false,
        hoverPendiente: null
    };

    renderer.domElement.addEventListener("pointermove", moverPunteroMapa3D);
    renderer.domElement.addEventListener("pointerdown", (evento) => {
        escenaMapa3D.inicioPuntero = { x: evento.clientX, y: evento.clientY };
    });
    renderer.domElement.addEventListener("pointerup", soltarPunteroMapa3D);
    renderer.domElement.addEventListener("pointerleave", () => {
        indiceHoverMapa3D = -1;
        escenaMapa3D.resaltado.visible = false;
        ocultarTooltipMapa3D();
        solicitarRenderMapa3D();
    });
    renderer.domElement.addEventListener("contextmenu", (evento) => {
        evento.preventDefault();
    });

    ajustarTamanoMapa3D();
    return escenaMapa3D;
}

function crearContornoMapa3D(color) {
    const geometria = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const contorno = new THREE.LineSegments(
        geometria,
        new THREE.LineBasicMaterial({
            color,
            depthTest: false,
            transparent: true
        })
    );
    contorno.renderOrder = 10;
    contorno.visible = false;
    return contorno;
}

function destruirEscenaMapa3D() {
    if (!escenaMapa3D) {
        return;
    }

    limpiarGrupoMapa3D();
    [escenaMapa3D.resaltado, escenaMapa3D.seleccion].forEach((contorno) => {
        contorno.geometry.dispose();
        contorno.material.dispose();
    });
    escenaMapa3D.observador.disconnect();
    escenaMapa3D.controles.dispose();
    // dispose() no libera el contexto WebGL en r128; sin esto se acumulan.
    escenaMapa3D.renderer.forceContextLoss();
    escenaMapa3D.renderer.dispose();
    escenaMapa3D.renderer.domElement.remove();
    escenaMapa3D = null;
    elementosMapa3D = [];
    indiceHoverMapa3D = -1;
    ultimoContextoMapa3D = null;
    limitesContenidoMapa3D = null;
    agrupacionMapa3DCache = { filas: null, resultado: null };
}

function ajustarTamanoMapa3D() {
    if (!escenaMapa3D) {
        return;
    }

    const { contenedor, renderer, camara } = escenaMapa3D;
    const ancho = Math.max(1, contenedor.clientWidth);
    const alto = Math.max(1, contenedor.clientHeight);
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    solicitarRenderMapa3D();
}

function solicitarRenderMapa3D() {
    if (!escenaMapa3D || escenaMapa3D.renderPendiente) {
        return;
    }

    escenaMapa3D.renderPendiente = true;
    requestAnimationFrame(() => {
        if (!escenaMapa3D) {
            return;
        }

        escenaMapa3D.renderPendiente = false;
        escenaMapa3D.renderer.render(escenaMapa3D.escena, escenaMapa3D.camara);
    });
}

function limpiarGrupoMapa3D() {
    if (!escenaMapa3D) {
        return;
    }

    const { grupo } = escenaMapa3D;

    while (grupo.children.length) {
        const objeto = grupo.children.pop();
        objeto.geometry?.dispose();

        if (objeto.material) {
            objeto.material.map?.dispose();
            objeto.material.dispose();
        }

        // Libera los buffers de instanceMatrix e instanceColor en la GPU.
        if (objeto.isInstancedMesh) {
            objeto.dispose();
        }
    }

    escenaMapa3D.mallaInteractiva = null;
}

/* ---------- Datos ---------- */

function interpretarUbicacionMapa3D(valor) {
    const coincidencia = normalizarUbicacionMezzanine(valor)
        .match(PATRON_UBICACION_MEZZANINE);

    if (!coincidencia) {
        return null;
    }

    return {
        piso: coincidencia[1],
        calle: coincidencia[2],
        modulo: coincidencia[3],
        altura: obtenerAlturaMezzanine(coincidencia[4]),
        frente: `${coincidencia[1]}.${coincidencia[2]}.${coincidencia[3]}`
    };
}

/*
 * Hueco vertical de una altura: 10 → 0, 20 → 1, 30 → 2, 40 → 3. Una altura
 * irregular (19, o 5B si llegara en los datos) cae en el hueco más cercano.
 */
function obtenerIndiceAlturaMapa3D(altura) {
    const numero = Number.parseInt(altura, 10);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.min(
        ALTURAS_MAPA_3D.length - 1,
        Math.max(0, Math.round(numero / 10) - 1)
    );
}

function obtenerClaveHuecoMapa3D(altura) {
    return ALTURAS_MAPA_3D[obtenerIndiceAlturaMapa3D(altura)];
}

function compararAlturasMapa3D(a, b) {
    return Number.parseInt(a, 10) - Number.parseInt(b, 10) ||
        String(a).localeCompare(String(b));
}

// Se cachea por arreglo de filas: los controles 3D no cambian los datos.
function agruparFilasMapa3D(filas) {
    if (agrupacionMapa3DCache.filas === filas) {
        return agrupacionMapa3DCache.resultado;
    }

    const porNivel = new Map();
    const alturasPorFrente = new Map();
    const fueraDelPlano = { valor: 0, visitas: 0, codigos: new Set() };

    filas.forEach((fila) => {
        const valor = typeof obtenerValorFilaMapa === "function"
            ? obtenerValorFilaMapa(fila)
            : 1;
        const ubicacion = interpretarUbicacionMapa3D(
            fila.ubicacionNormalizada || fila.ubicacion
        );

        if (!ubicacion) {
            fueraDelPlano.valor += valor;
            fueraDelPlano.visitas += 1;
            fueraDelPlano.codigos.add(fila.codigoUbicacion || fila.ubicacion);
            return;
        }

        const clave = `${ubicacion.frente}.${ubicacion.altura}`;
        const actual = porNivel.get(clave) || { valor: 0, visitas: 0 };
        actual.valor += valor;
        actual.visitas += 1;
        porNivel.set(clave, actual);

        if (!alturasPorFrente.has(ubicacion.frente)) {
            alturasPorFrente.set(ubicacion.frente, new Set());
        }
        alturasPorFrente.get(ubicacion.frente).add(ubicacion.altura);
    });

    const resultado = { porNivel, alturasPorFrente, fueraDelPlano };
    agrupacionMapa3DCache = { filas, resultado };
    return resultado;
}

function alturaVisibleMapa3D(altura) {
    const indice = obtenerIndiceAlturaMapa3D(altura);
    return estadoMapa3D.alturas.has(ALTURAS_MAPA_3D[indice]);
}

function nivelCoincideTipoMapa3D(detalle, altura, tipo) {
    if (tipo === "Todos") {
        return true;
    }

    const tiposNivel = referenciaMezzanineCache?.tiposPorNivel.get(
        `${detalle.piso}${detalle.calle}${detalle.modulo}${altura}`
    );

    return tiposNivel ? tiposNivel.has(Number(tipo)) : true;
}

function obtenerTiposNivelMapa3D(detalle, altura) {
    const tiposNivel = altura
        ? referenciaMezzanineCache?.tiposPorNivel.get(
            `${detalle.piso}${detalle.calle}${detalle.modulo}${altura}`
        )
        : null;
    const indices = tiposNivel ? [...tiposNivel] : [...(detalle.tipos || [])];

    return indices
        .map((indice) => referenciaMezzanineCache?.tipos[indice])
        .filter(Boolean)
        .map(obtenerEtiquetaTipoUbicacionMapa);
}

function construirElementosMapa3D(contexto) {
    const { configuracion, filas } = contexto;
    const datos = agruparFilasMapa3D(filas);
    const metrica = obtenerValorMapa("metrica-visual-mapa") || "actividad";
    const tipo = obtenerValorMapa("filtro-tipo-ubicacion-mapa") || "Todos";
    const pisos = obtenerPisosVisiblesMapaMezzanine();
    const codigosVisibles = new Set(obtenerCodigosVisiblesMapa(configuracion));
    const inactividad = typeof estadoInactividadMapaActual !== "undefined"
        ? estadoInactividadMapaActual
        : { habilitado: false, codigos: new Set(), nunca: new Set(), ultimasFechas: new Map() };
    const elementos = [];
    const estructura = [];
    const frentesDelPlano = new Set();
    const fueraDelPlano = {
        valor: datos.fueraDelPlano.valor,
        visitas: datos.fueraDelPlano.visitas
    };

    pisos.forEach((piso) => {
        obtenerFrentesVisualesMapaMezzanine(piso, codigosVisibles)
            .forEach((detalle) => {
                frentesDelPlano.add(detalle.codigo);

                if (
                    estadoMapa3D.calle !== "Todas" &&
                    detalle.calle !== estadoMapa3D.calle
                ) {
                    return;
                }

                const alturasDatos = datos.alturasPorFrente.get(
                    detalle.codigo
                );

                // Igual que en el 2D, una posición sin referencia maestra
                // con movimientos se dibuja con sus alturas registradas.
                if (detalle.estructural && !alturasDatos) {
                    if (estadoMapa3D.mostrarEstructura) {
                        estructura.push(detalle);
                    }
                    return;
                }

                const alturasVisibles = [...new Set([
                    ...detalle.alturas,
                    ...(alturasDatos || [])
                ])]
                    .filter((altura) => alturaVisibleMapa3D(altura))
                    .filter((altura) => {
                        return nivelCoincideTipoMapa3D(detalle, altura, tipo);
                    })
                    .sort(compararAlturasMapa3D);
                const inactiva = Boolean(
                    !detalle.estructural &&
                    inactividad.habilitado &&
                    inactividad.codigos.has(detalle.codigo)
                );
                const nunca = Boolean(
                    !detalle.estructural &&
                    inactividad.nunca?.has(detalle.codigo)
                );
                const sumarAlturas = (alturas) => alturas.reduce(
                    (suma, altura) => {
                        const nivel = datos.porNivel.get(
                            `${detalle.codigo}.${altura}`
                        );
                        suma.valor += nivel?.valor || 0;
                        suma.visitas += nivel?.visitas || 0;
                        return suma;
                    },
                    { valor: 0, visitas: 0 }
                );

                if (!alturasVisibles.length) {
                    return;
                }

                if (estadoMapa3D.representacion === "barras") {
                    const total = sumarAlturas(alturasVisibles);
                    elementos.push({
                        clave: detalle.codigo,
                        detalle,
                        altura: "",
                        alturas: alturasVisibles,
                        valor: total.valor,
                        visitas: total.visitas,
                        inactiva,
                        nunca
                    });
                    return;
                }

                // Un bloque por hueco: alturas irregulares como 19 se suman
                // a la 20 en lugar de superponerse.
                const huecos = new Map();
                alturasVisibles.forEach((altura) => {
                    const hueco = obtenerClaveHuecoMapa3D(altura);

                    if (!huecos.has(hueco)) {
                        huecos.set(hueco, []);
                    }
                    huecos.get(hueco).push(altura);
                });

                huecos.forEach((alturasHueco, hueco) => {
                    const total = sumarAlturas(alturasHueco);
                    /*
                     * Cada bloque usa la inactividad de sus propias alturas:
                     * una altura que nunca se movió es "nunca" aunque otra
                     * del mismo módulo tenga movimientos.
                     */
                    const estadoHueco = !detalle.estructural &&
                        typeof obtenerInactividadNivelesMapa === "function"
                        ? obtenerInactividadNivelesMapa(alturasHueco.map((altura) => {
                            return `${detalle.piso}${detalle.calle}${detalle.modulo}${altura}`;
                        }))
                        : null;
                    elementos.push({
                        clave: `${detalle.codigo}.${hueco}`,
                        detalle,
                        altura: hueco,
                        alturas: alturasHueco,
                        valor: total.valor,
                        visitas: total.visitas,
                        inactiva: estadoHueco ? estadoHueco.estado === "inactiva" : inactiva,
                        nunca: estadoHueco ? estadoHueco.estado === "nunca" : nunca,
                        ultimaActividad: estadoHueco ? estadoHueco.ultima : undefined
                    });
                });
            });
    });

    // Códigos con formato válido pero sin lugar en la grilla (módulos
    // 081–090 o calles fuera de 01–20): se informan como fuera del plano.
    datos.porNivel.forEach((nivel, clave) => {
        if (!frentesDelPlano.has(clave.slice(0, 8))) {
            fueraDelPlano.valor += nivel.valor;
            fueraDelPlano.visitas += nivel.visitas;
        }
    });

    elementos.forEach((elemento) => {
        elemento.metrica = metrica === "visitas"
            ? elemento.visitas
            : elemento.valor;
    });

    const visibles = estadoMapa3D.ocultarSinActividad
        ? elementos.filter((elemento) => {
            return elemento.metrica > 0 || elemento.inactiva || elemento.nunca;
        })
        : elementos;
    const referencia = calcularReferenciaEscalaMapa3D(visibles);

    visibles.forEach((elemento) => {
        elemento.nivel = calcularNivelMapa(elemento.metrica, referencia);
        // Los bloques de altura ya traen la suya; las barras usan la del módulo.
        elemento.ultimaActividad = elemento.ultimaActividad ??
            (inactividad.ultimasFechas?.get(elemento.detalle.codigo) || "");
    });

    return {
        elementos: visibles,
        estructura,
        referencia,
        metrica,
        fueraDelPlano
    };
}

function calcularReferenciaEscalaMapa3D(elementos) {
    const valores = elementos
        .map((elemento) => elemento.metrica)
        .filter((valor) => valor > 0)
        .sort((a, b) => a - b);

    if (!valores.length) {
        return 1;
    }

    const indice = Math.min(
        valores.length - 1,
        Math.floor(valores.length * 0.95)
    );
    return Math.max(1, valores[indice]);
}

/* ---------- Geometría ---------- */

function obtenerColumnasPisoMapa3D() {
    const maximo = Math.max(...MODULOS_PLANO_COMPLETO_MEZZANINE);
    return estadoMapa3D.disposicion === "enfrentada"
        ? Math.ceil(maximo / 2)
        : maximo;
}

function obtenerAnchoPasilloMapa3D() {
    return estadoMapa3D.calle === "Todas"
        ? MEDIDAS_MAPA_3D.anchoPasillo
        : MEDIDAS_MAPA_3D.anchoPasilloCalleAislada;
}

function obtenerProfundidadCalleMapa3D() {
    const m = MEDIDAS_MAPA_3D;
    return estadoMapa3D.disposicion === "enfrentada"
        ? (m.profundidadModulo * 2) + obtenerAnchoPasilloMapa3D() +
            m.separacionEspaldas
        : m.profundidadModulo + obtenerAnchoPasilloMapa3D();
}

/*
 * Extensión del piso en planta. Con una calle aislada, la losa y el
 * encuadre se limitan a esa calle.
 */
function obtenerDimensionesPisoMapa3D() {
    const profundidadCalle = obtenerProfundidadCalleMapa3D();
    const calleAislada = estadoMapa3D.calle !== "Todas";
    const indiceInicial = calleAislada
        ? Number(estadoMapa3D.calle) - 1
        : 0;
    const calles = calleAislada
        ? 1
        : CALLES_PLANO_COMPLETO_MEZZANINE.length;
    return {
        ancho: obtenerColumnasPisoMapa3D() * MEDIDAS_MAPA_3D.anchoModulo,
        profundidad: calles * profundidadCalle,
        inicioZ: indiceInicial * profundidadCalle
    };
}

function obtenerAltoPisoMapa3D() {
    return MEDIDAS_MAPA_3D.losa + obtenerAltoContenidoMapa3D() + 1 +
        estadoMapa3D.separacionPisos;
}

function obtenerOrigenPisoMapa3D(piso, pisosVisibles) {
    const indice = pisosVisibles.indexOf(piso);
    const { ancho } = obtenerDimensionesPisoMapa3D();

    if (modoVistaPisosMapa === "comparar") {
        return {
            x: indice * (ancho + MEDIDAS_MAPA_3D.separacionComparacion),
            y: 0
        };
    }

    if (modoVistaPisosMapa === "todos") {
        const orden = PISOS_MAPA_MEZZANINE.filter((item) => {
            return pisosVisibles.includes(item);
        });
        return { x: 0, y: orden.indexOf(piso) * obtenerAltoPisoMapa3D() };
    }

    return { x: 0, y: 0 };
}

/*
 * Disposición "enfrentada": módulos impares y pares son los dos frentes de
 * la misma calle, separados por el pasillo. Disposición "plano": cada módulo
 * ocupa su propia columna, igual que el plano 2D.
 */
function obtenerPosicionFrenteMapa3D(detalle, origen) {
    const m = MEDIDAS_MAPA_3D;
    const numeroModulo = Number(detalle.modulo);
    const indiceCalle = Number(detalle.calle) - 1;
    const profundidadCalle = obtenerProfundidadCalleMapa3D();
    let columna;
    let desplazamientoZ = 0;

    if (estadoMapa3D.disposicion === "enfrentada") {
        columna = Math.ceil(numeroModulo / 2);
        desplazamientoZ = numeroModulo % 2 === 1
            ? 0
            : m.profundidadModulo + obtenerAnchoPasilloMapa3D();
    } else {
        columna = numeroModulo;
    }

    return {
        x: origen.x + (columna - 0.5) * m.anchoModulo,
        z: indiceCalle * profundidadCalle + desplazamientoZ +
            m.profundidadModulo / 2,
        y: origen.y + m.losa
    };
}

function obtenerCajaElementoMapa3D(elemento, origen, referencia) {
    const m = MEDIDAS_MAPA_3D;
    const posicion = obtenerPosicionFrenteMapa3D(elemento.detalle, origen);
    const ancho = m.anchoModulo - m.hueco;
    const profundidad = m.profundidadModulo - m.hueco;

    if (estadoMapa3D.representacion === "barras") {
        const proporcion = Math.min(
            1,
            elemento.metrica / Math.max(1, referencia)
        );
        const alto = elemento.metrica > 0
            ? m.alturaMinimaBarra + 0.15 +
                Math.sqrt(proporcion) * (m.alturaMaximaBarra - 0.15)
            : m.alturaMinimaBarra;
        return {
            x: posicion.x,
            y: posicion.y + alto / 2,
            z: posicion.z,
            ancho,
            alto,
            profundidad
        };
    }

    const indiceAltura = obtenerIndiceAlturaMapa3D(elemento.altura);
    const alto = m.altoNivel - m.hueco;
    return {
        x: posicion.x,
        y: posicion.y + indiceAltura * m.altoNivel + m.altoNivel / 2,
        z: posicion.z,
        ancho,
        alto,
        profundidad
    };
}

function expandirLimitesCajaMapa3D(limites, caja) {
    limites.expandByPoint(new THREE.Vector3(
        caja.x - caja.ancho / 2,
        caja.y - caja.alto / 2,
        caja.z - caja.profundidad / 2
    ));
    limites.expandByPoint(new THREE.Vector3(
        caja.x + caja.ancho / 2,
        caja.y + caja.alto / 2,
        caja.z + caja.profundidad / 2
    ));
}

/* ---------- Construcción de la escena ---------- */

function construirContenidoMapa3D(contexto) {
    if (!escenaMapa3D) {
        return;
    }

    // El panel pudo cambiar de tamaño mientras estaba oculto.
    ajustarTamanoMapa3D();
    limpiarGrupoMapa3D();
    const resultado = construirElementosMapa3D(contexto);
    const pisos = obtenerPisosVisiblesMapaMezzanine();
    const colores = obtenerColoresMapa3D();
    const { grupo } = escenaMapa3D;
    const objeto = new THREE.Object3D();
    const color = new THREE.Color();
    // Box3.setFromObject ignora las matrices de instancia en r128, así que
    // los límites se arman con las losas, etiquetas y cada caja dibujada.
    const limites = new THREE.Box3();

    elementosMapa3D = resultado.elementos;
    indiceHoverMapa3D = -1;

    pisos.forEach((piso) => {
        const losa = crearLosaPisoMapa3D(piso, pisos, colores);
        grupo.add(losa);
        limites.expandByObject(losa);
        crearEtiquetasPisoMapa3D(piso, pisos, colores)
            .forEach((etiqueta) => {
                grupo.add(etiqueta);
                limites.expandByPoint(etiqueta.position);
            });
    });

    if (elementosMapa3D.length) {
        const malla = new THREE.InstancedMesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial({ color: 0xffffff }),
            elementosMapa3D.length
        );

        elementosMapa3D.forEach((elemento, indice) => {
            const origen = obtenerOrigenPisoMapa3D(
                elemento.detalle.piso,
                pisos
            );
            const caja = obtenerCajaElementoMapa3D(
                elemento,
                origen,
                resultado.referencia
            );
            elemento.caja = caja;
            expandirLimitesCajaMapa3D(limites, caja);
            objeto.position.set(caja.x, caja.y, caja.z);
            objeto.scale.set(caja.ancho, caja.alto, caja.profundidad);
            objeto.updateMatrix();
            malla.setMatrixAt(indice, objeto.matrix);
            color.set(elemento.nunca
                ? colores.nunca
                : elemento.inactiva
                    ? colores.inactividad
                    : colores.niveles[elemento.nivel] || colores.niveles[0]);
            malla.setColorAt(indice, color);
        });

        malla.instanceMatrix.needsUpdate = true;
        malla.instanceColor.needsUpdate = true;
        grupo.add(malla);
        escenaMapa3D.mallaInteractiva = malla;
    }

    if (resultado.estructura.length) {
        const fantasma = new THREE.InstancedMesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({
                color: colores.estructura,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            }),
            resultado.estructura.length
        );

        resultado.estructura.forEach((detalle, indice) => {
            const origen = obtenerOrigenPisoMapa3D(detalle.piso, pisos);
            const posicion = obtenerPosicionFrenteMapa3D(detalle, origen);
            objeto.position.set(posicion.x, posicion.y + 0.03, posicion.z);
            objeto.scale.set(
                MEDIDAS_MAPA_3D.anchoModulo - MEDIDAS_MAPA_3D.hueco,
                0.06,
                MEDIDAS_MAPA_3D.profundidadModulo - MEDIDAS_MAPA_3D.hueco
            );
            objeto.updateMatrix();
            fantasma.setMatrixAt(indice, objeto.matrix);
        });

        fantasma.instanceMatrix.needsUpdate = true;
        grupo.add(fantasma);
    }

    limitesContenidoMapa3D = limites;
    actualizarResumenMapa3D(resultado);
    restaurarSeleccionMapa3D();

    const firma = [
        pisos.join(","),
        modoVistaPisosMapa,
        estadoMapa3D.disposicion,
        estadoMapa3D.representacion,
        estadoMapa3D.calle,
        modoVistaPisosMapa === "todos" ? estadoMapa3D.separacionPisos : ""
    ].join("|");

    if (firma !== firmaEncuadreMapa3D) {
        firmaEncuadreMapa3D = firma;
        aplicarCamaraMapa3D(camaraActualMapa3D);
    } else {
        solicitarRenderMapa3D();
    }
}

function crearLosaPisoMapa3D(piso, pisos, colores) {
    const m = MEDIDAS_MAPA_3D;
    const origen = obtenerOrigenPisoMapa3D(piso, pisos);
    const { ancho, profundidad, inicioZ } = obtenerDimensionesPisoMapa3D();
    const losa = new THREE.Mesh(
        new THREE.BoxGeometry(
            ancho + m.margenPiso * 2,
            m.losa,
            profundidad + m.margenPiso * 2
        ),
        new THREE.MeshLambertMaterial({
            color: colores.losa,
            transparent: modoVistaPisosMapa === "todos",
            opacity: modoVistaPisosMapa === "todos" ? 0.55 : 1,
            depthWrite: modoVistaPisosMapa !== "todos"
        })
    );
    losa.position.set(
        origen.x + ancho / 2,
        origen.y + m.losa / 2,
        inicioZ + profundidad / 2
    );
    return losa;
}

function obtenerAltoContenidoMapa3D() {
    return estadoMapa3D.representacion === "barras"
        ? MEDIDAS_MAPA_3D.alturaMaximaBarra
        : ALTURAS_MAPA_3D.length * MEDIDAS_MAPA_3D.altoNivel;
}

function crearEtiquetasPisoMapa3D(piso, pisos, colores) {
    const m = MEDIDAS_MAPA_3D;
    const origen = obtenerOrigenPisoMapa3D(piso, pisos);
    const { ancho, inicioZ } = obtenerDimensionesPisoMapa3D();
    const profundidadCalle = obtenerProfundidadCalleMapa3D();
    const etiquetas = [];
    const titulo = crearEtiquetaMapa3D(
        `Piso ${piso} · ${NOMBRES_PISOS_MAPA_3D[piso] || ""}`,
        colores,
        { escala: 4.2, negrita: true, siempreVisible: true }
    );
    titulo.position.set(
        origen.x + ancho / 2,
        origen.y + m.losa + obtenerAltoContenidoMapa3D() + 2.2,
        inicioZ - m.margenPiso
    );
    etiquetas.push(titulo);

    CALLES_PLANO_COMPLETO_MEZZANINE.forEach((calle, indice) => {
        if (estadoMapa3D.calle !== "Todas" && calle !== estadoMapa3D.calle) {
            return;
        }

        const etiqueta = crearEtiquetaMapa3D(`C${calle}`, colores, {
            escala: 1.7
        });
        etiqueta.position.set(
            origen.x - 1.8,
            origen.y + m.losa + 0.6,
            indice * profundidadCalle + profundidadCalle / 2 -
                (estadoMapa3D.disposicion === "enfrentada"
                    ? m.separacionEspaldas / 2
                    : 0)
        );
        etiquetas.push(etiqueta);
    });

    [1, 41, 80, 91, 121, 156].forEach((numeroModulo) => {
        const posicion = obtenerPosicionFrenteMapa3D(
            {
                modulo: String(numeroModulo),
                calle: "01"
            },
            origen
        );
        const etiqueta = crearEtiquetaMapa3D(
            `Mód. ${String(numeroModulo).padStart(3, "0")}`,
            colores,
            { escala: 1.6 }
        );
        etiqueta.position.set(
            posicion.x,
            origen.y + m.losa + 0.5,
            inicioZ - m.margenPiso + 0.6
        );
        etiquetas.push(etiqueta);
    });

    return etiquetas;
}

function crearEtiquetaMapa3D(texto, colores, opciones = {}) {
    const escalaPixel = 4;
    const tamanoFuente = 15 * escalaPixel;
    const lienzo = document.createElement("canvas");
    const contexto = lienzo.getContext("2d");
    const fuente = `${opciones.negrita ? "800" : "700"} ${tamanoFuente}px ` +
        "system-ui, -apple-system, Segoe UI, sans-serif";
    contexto.font = fuente;
    const anchoTexto = Math.ceil(contexto.measureText(texto).width);
    lienzo.width = anchoTexto + 28 * escalaPixel / 2;
    lienzo.height = tamanoFuente + 14 * escalaPixel / 2;
    contexto.font = fuente;
    contexto.fillStyle = colores.fondoEtiqueta;
    const radio = 8 * escalaPixel / 2;
    contexto.beginPath();
    contexto.moveTo(radio, 0);
    contexto.arcTo(lienzo.width, 0, lienzo.width, lienzo.height, radio);
    contexto.arcTo(lienzo.width, lienzo.height, 0, lienzo.height, radio);
    contexto.arcTo(0, lienzo.height, 0, 0, radio);
    contexto.arcTo(0, 0, lienzo.width, 0, radio);
    contexto.closePath();
    contexto.fill();
    contexto.fillStyle = colores.texto;
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.fillText(texto, lienzo.width / 2, lienzo.height / 2 + 2);

    const textura = new THREE.CanvasTexture(lienzo);
    textura.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textura,
        depthWrite: false,
        depthTest: !opciones.siempreVisible,
        transparent: true
    }));

    if (opciones.siempreVisible) {
        sprite.renderOrder = 5;
    }
    const escala = opciones.escala || 2;
    sprite.scale.set(escala * (lienzo.width / lienzo.height), escala, 1);
    return sprite;
}

function obtenerColoresMapa3D() {
    const panel = document.getElementById("mapa-calor-3d") || document.body;
    const sonda = document.createElement("span");
    sonda.className = "celda-calor";
    sonda.style.position = "absolute";
    sonda.style.visibility = "hidden";
    panel.appendChild(sonda);

    const niveles = COLORES_RESPALDO_MAPA_3D.map((respaldo, nivel) => {
        sonda.dataset.nivel = String(nivel);
        const color = getComputedStyle(sonda).backgroundColor;
        return color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent"
            ? color
            : respaldo;
    });
    sonda.remove();

    const oscuro = document.body.classList.contains("modo-oscuro");
    const estilos = getComputedStyle(document.documentElement);
    const verde = estilos.getPropertyValue("--verde-marca").trim() || "#82bd3a";

    // El nivel 0 se oscurece levemente: iluminado en 3D se confunde con blanco.
    niveles[0] = oscuro ? "#435048" : "#cfd6d1";

    return {
        niveles: niveles.map((valor) => normalizarColorMapa3D(valor)),
        inactividad: COLOR_INACTIVIDAD_MAPA_3D,
        nunca: COLOR_NUNCA_MAPA_3D,
        losa: oscuro ? "#26302a" : "#dfe4e0",
        estructura: oscuro ? "#7c887f" : "#9aa59d",
        texto: oscuro ? "#e7ece8" : "#343836",
        fondoEtiqueta: oscuro
            ? "rgba(23, 30, 25, 0.82)"
            : "rgba(255, 255, 255, 0.86)",
        acento: normalizarColorMapa3D(verde)
    };
}

function normalizarColorMapa3D(valor) {
    const rgb = String(valor).match(
        /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i
    );

    if (!rgb) {
        return valor;
    }

    return `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;
}

function actualizarResumenMapa3D(resultado) {
    const resumen = document.getElementById("resumen-mapa-3d");
    const fuera = document.getElementById("fuera-plano-mapa-3d");
    const esTraceWis = typeof TIPO_REPORTE_TRACE_WIS !== "undefined" &&
        obtenerTipoReporteMapaCalor() === TIPO_REPORTE_TRACE_WIS;
    const unidad = resultado.metrica === "visitas"
        ? "visitas"
        : esTraceWis ? "unidades" : "movimientos";

    if (resumen) {
        const conActividad = resultado.elementos.filter((elemento) => {
            return elemento.metrica > 0;
        }).length;
        const tipoElemento = estadoMapa3D.representacion === "barras"
            ? "módulos"
            : "ubicaciones por altura";
        const alturas = [...estadoMapa3D.alturas]
            .sort(compararAlturasMapa3D)
            .join(", ");
        resumen.textContent =
            `${resultado.elementos.length.toLocaleString("es-UY")} ` +
            `${tipoElemento} · ` +
            `${conActividad.toLocaleString("es-UY")} con actividad · ` +
            `Alturas ${alturas} · ` +
            `Escala hasta ${resultado.referencia.toLocaleString("es-UY")} ` +
            `${unidad} (percentil 95)`;
    }

    if (fuera) {
        const { valor, visitas } = resultado.fueraDelPlano;
        fuera.hidden = !valor && !visitas;
        fuera.textContent = fuera.hidden
            ? ""
            : "Fuera del plano (averías, pisos, tubos, jaulas DT y códigos " +
                "sin posición): " +
                (typeof describirValorCeldaMapa === "function"
                    ? describirValorCeldaMapa(valor, visitas)
                    : `${valor.toLocaleString("es-UY")} · ${visitas} visitas`) +
                ". Su detalle está en el plano 2D.";
    }
}

/* ---------- Cámara ---------- */

function aplicarCamaraMapa3D(vista) {
    if (!escenaMapa3D || !limitesContenidoMapa3D) {
        camaraActualMapa3D = vista || camaraActualMapa3D;
        sincronizarControlesMapa3D();
        return;
    }

    const { controles } = escenaMapa3D;
    const centro = new THREE.Vector3();
    limitesContenidoMapa3D.getCenter(centro);

    camaraActualMapa3D = ["aerea", "isometrica", "lateral"].includes(vista)
        ? vista
        : "isometrica";

    const elevacionLateral = THREE.MathUtils.degToRad(30);
    const direcciones = {
        aerea: new THREE.Vector3(0, 1, 0.0001),
        lateral: new THREE.Vector3(
            0,
            Math.sin(elevacionLateral),
            Math.cos(elevacionLateral)
        ),
        isometrica: new THREE.Vector3(-0.45, 0.62, 0.64)
    };

    encuadrarCamaraMapa3D(
        direcciones[camaraActualMapa3D].normalize(),
        centro
    );
    controles.target.copy(centro);
    controles.update();
    sincronizarControlesMapa3D();
    solicitarRenderMapa3D();
}

/*
 * Ubica la cámara en la dirección indicada a la menor distancia en que las
 * ocho esquinas del contenido quedan dentro de la pantalla. Con perspectiva,
 * una fórmula cerrada recorta las partes cercanas en vistas diagonales.
 */
function encuadrarCamaraMapa3D(direccion, centro) {
    const { camara } = escenaMapa3D;
    const { min, max } = limitesContenidoMapa3D;
    const esquinas = [];

    [min.x, max.x].forEach((x) => {
        [min.y, max.y].forEach((y) => {
            [min.z, max.z].forEach((z) => {
                esquinas.push(new THREE.Vector3(x, y, z));
            });
        });
    });

    const proyectada = new THREE.Vector3();
    const margen = 0.94;
    const entra = (distancia) => {
        camara.position.copy(centro).addScaledVector(direccion, distancia);
        camara.lookAt(centro);
        camara.updateMatrixWorld();
        return esquinas.every((esquina) => {
            proyectada.copy(esquina).project(camara);
            return proyectada.z < 1 &&
                Math.abs(proyectada.x) <= margen &&
                Math.abs(proyectada.y) <= margen;
        });
    };

    let cerca = 1;
    let lejos = Math.max(50, limitesContenidoMapa3D.getSize(proyectada).length() * 4);

    while (!entra(lejos) && lejos < camara.far / 2) {
        lejos *= 2;
    }

    for (let paso = 0; paso < 24; paso += 1) {
        const medio = (cerca + lejos) / 2;

        if (entra(medio)) {
            lejos = medio;
        } else {
            cerca = medio;
        }
    }

    camara.position.copy(centro).addScaledVector(direccion, lejos);
}

/* ---------- Interacción ---------- */

function obtenerIndiceBajoPunteroMapa3D(evento) {
    if (!escenaMapa3D?.mallaInteractiva) {
        return -1;
    }

    const { renderer, raycaster, puntero, camara } = escenaMapa3D;
    const rect = renderer.domElement.getBoundingClientRect();
    puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camara);
    const interseccion = raycaster.intersectObject(
        escenaMapa3D.mallaInteractiva
    )[0];

    return interseccion && Number.isInteger(interseccion.instanceId)
        ? interseccion.instanceId
        : -1;
}

function moverPunteroMapa3D(evento) {
    if (!escenaMapa3D || evento.buttons) {
        return;
    }

    escenaMapa3D.hoverPendiente = {
        clientX: evento.clientX,
        clientY: evento.clientY
    };

    if (escenaMapa3D.hoverProgramado) {
        return;
    }

    escenaMapa3D.hoverProgramado = true;
    requestAnimationFrame(() => {
        if (!escenaMapa3D) {
            return;
        }

        escenaMapa3D.hoverProgramado = false;
        const posicion = escenaMapa3D.hoverPendiente;
        const indice = obtenerIndiceBajoPunteroMapa3D(posicion);

        if (indice !== indiceHoverMapa3D) {
            indiceHoverMapa3D = indice;
            colocarContornoMapa3D(
                escenaMapa3D.resaltado,
                elementosMapa3D[indice]
            );
            solicitarRenderMapa3D();
        }

        if (indice < 0) {
            ocultarTooltipMapa3D();
            return;
        }

        const elemento = elementosMapa3D[indice];
        mostrarTooltipMapa3D(elemento, posicion);

        if (!claveSeleccionMapa3D) {
            mostrarDetalleElementoMapa3D(elemento, false);
        }
    });
}

function soltarPunteroMapa3D(evento) {
    const inicio = escenaMapa3D?.inicioPuntero;

    if (!inicio || evento.button !== 0) {
        return;
    }

    const desplazamiento = Math.hypot(
        evento.clientX - inicio.x,
        evento.clientY - inicio.y
    );
    escenaMapa3D.inicioPuntero = null;

    if (desplazamiento > UMBRAL_CLIC_MAPA_3D) {
        return;
    }

    const indice = obtenerIndiceBajoPunteroMapa3D(evento);

    if (indice < 0) {
        limpiarSeleccionMapa3D();
        return;
    }

    const elemento = elementosMapa3D[indice];

    if (elemento.clave === claveSeleccionMapa3D) {
        limpiarSeleccionMapa3D();
        return;
    }

    seleccionarElementoMapa3D(elemento);
}

function seleccionarElementoMapa3D(elemento) {
    claveSeleccionMapa3D = elemento.clave;
    colocarContornoMapa3D(escenaMapa3D.seleccion, elemento);
    mostrarDetalleElementoMapa3D(elemento, true);
    solicitarRenderMapa3D();
}

function limpiarSeleccionMapa3D() {
    claveSeleccionMapa3D = "";

    if (escenaMapa3D) {
        escenaMapa3D.seleccion.visible = false;
        solicitarRenderMapa3D();
    }

    const detalle = document.getElementById("detalle-ubicacion-mapa");

    if (detalle) {
        detalle.textContent =
            "Pasá el cursor o seleccioná una ubicación para consultar el detalle.";
    }
}

function restaurarSeleccionMapa3D() {
    if (!escenaMapa3D) {
        return;
    }

    escenaMapa3D.resaltado.visible = false;
    const elemento = claveSeleccionMapa3D
        ? elementosMapa3D.find((item) => item.clave === claveSeleccionMapa3D)
        : null;

    if (!elemento) {
        // La ubicación fijada dejó de estar visible: se libera también el detalle.
        if (claveSeleccionMapa3D) {
            limpiarSeleccionMapa3D();
        }

        escenaMapa3D.seleccion.visible = false;
        return;
    }

    colocarContornoMapa3D(escenaMapa3D.seleccion, elemento);
    mostrarDetalleElementoMapa3D(elemento, true);
}

function colocarContornoMapa3D(contorno, elemento) {
    if (!elemento?.caja) {
        contorno.visible = false;
        return;
    }

    const { caja } = elemento;
    contorno.position.set(caja.x, caja.y, caja.z);
    contorno.scale.set(
        caja.ancho + 0.08,
        caja.alto + 0.08,
        caja.profundidad + 0.08
    );
    contorno.visible = true;
}

/* Ubicaciones WIS reales del bloque: las de su altura o, en barras, todas. */
function obtenerUbicacionesWisElementoMapa3D(elemento) {
    if (typeof obtenerUbicacionesWisFrenteMapa !== "function") {
        return [];
    }

    return obtenerUbicacionesWisFrenteMapa(
        elemento.detalle.codigo,
        elemento.altura ? elemento.alturas : null
    );
}

function describirElementoMapa3D(elemento) {
    const { detalle } = elemento;
    const codigosWis = obtenerUbicacionesWisElementoMapa3D(elemento)
        .map((ubicacion) => ubicacion.codigo);
    // Un bloque de altura suele ser una sola ubicación: su código va primero.
    const partes = [
        ...(elemento.altura && codigosWis.length && codigosWis.length <= 3
            ? [codigosWis.join(" · ")]
            : []),
        `Piso ${detalle.piso}`,
        `Calle ${detalle.calle}`,
        `Módulo ${detalle.modulo}`
    ];

    if (!elemento.altura) {
        partes.push(`Alturas ${elemento.alturas.join(", ")}`);
    } else if (elemento.alturas.length > 1) {
        partes.push(
            `Altura ${elemento.altura} (incluye ${elemento.alturas.join(", ")})`
        );
    } else {
        partes.push(`Altura ${elemento.altura}`);
    }

    return partes.join(" · ");
}

function describirMetricaElementoMapa3D(elemento) {
    if (typeof describirValorCeldaMapa === "function") {
        return describirValorCeldaMapa(elemento.valor, elemento.visitas);
    }

    return `${elemento.valor.toLocaleString("es-UY")} · ` +
        `${elemento.visitas.toLocaleString("es-UY")} visitas`;
}

function mostrarDetalleElementoMapa3D(elemento, seleccionada) {
    const detalle = document.getElementById("detalle-ubicacion-mapa");

    if (!detalle || !elemento) {
        return;
    }

    const ubicacionesWis = obtenerUbicacionesWisElementoMapa3D(elemento);

    const tipos = obtenerTiposNivelMapa3D(
        elemento.detalle,
        elemento.altura ? elemento.alturas[0] : ""
    );
    let texto = (seleccionada ? "Ubicación seleccionada · " : "") +
        `${describirElementoMapa3D(elemento)} · ` +
        describirMetricaElementoMapa3D(elemento);

    if (tipos.length) {
        texto += ` · ${tipos.join(", ")}`;
    }

    if (elemento.nunca) {
        texto += " · Nunca tuvo movimientos en el historial importado · " +
            "Candidata a reubicación";
    } else if (elemento.inactiva) {
        texto += " · Sin movimientos en los últimos 3 meses · " +
            (elemento.ultimaActividad && typeof formatearFechaMapa === "function"
                ? `Último movimiento: ${formatearFechaMapa(elemento.ultimaActividad)}`
                : typeof describirSinMovimientosHistorialMapa === "function"
                    ? describirSinMovimientosHistorialMapa()
                    : "Sin movimientos registrados en el historial") +
            " · Candidata a reubicación";
    } else if (
        !elemento.valor &&
        !elemento.visitas &&
        elemento.ultimaActividad &&
        typeof formatearFechaMapa === "function"
    ) {
        // Gris: se movió hace menos de 3 meses, pero no en el período.
        texto += " · Sin movimientos en el período · Último movimiento: " +
            `${formatearFechaMapa(elemento.ultimaActividad)} (todavía activa)`;
    }

    if (typeof escribirDetalleUbicacionMapa === "function") {
        escribirDetalleUbicacionMapa(texto, ubicacionesWis);
    } else {
        detalle.textContent = texto;
    }
}

function mostrarTooltipMapa3D(elemento, posicion) {
    const tooltip = document.getElementById("tooltip-mapa-3d");
    const contenedor = escenaMapa3D?.contenedor;

    if (!tooltip || !contenedor) {
        return;
    }

    const rect = contenedor.getBoundingClientRect();
    tooltip.innerHTML = "";
    const titulo = document.createElement("strong");
    titulo.textContent = describirElementoMapa3D(elemento);
    const metrica = document.createElement("span");
    metrica.textContent = describirMetricaElementoMapa3D(elemento);
    tooltip.append(titulo, metrica);

    if (elemento.nunca || elemento.inactiva) {
        const aviso = document.createElement("em");
        aviso.textContent = elemento.nunca
            ? "Nunca tuvo movimientos · candidata a reubicación"
            : "Inactiva 3 meses · candidata a reubicación";
        tooltip.appendChild(aviso);
    }

    tooltip.hidden = false;
    const x = posicion.clientX - rect.left + 14;
    const y = posicion.clientY - rect.top + 14;
    const maximoX = rect.width - tooltip.offsetWidth - 8;
    const maximoY = rect.height - tooltip.offsetHeight - 8;
    tooltip.style.left = `${Math.max(8, Math.min(x, maximoX))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y, maximoY))}px`;
}

function ocultarTooltipMapa3D() {
    const tooltip = document.getElementById("tooltip-mapa-3d");

    if (tooltip) {
        tooltip.hidden = true;
    }
}

function cargarCallesMapa3D() {
    const selector = document.getElementById("calle-mapa-3d");

    if (!selector || selector.options.length > 1) {
        return;
    }

    CALLES_PLANO_COMPLETO_MEZZANINE.forEach((calle) => {
        selector.add(new Option(`Calle ${calle}`, calle));
    });
}
