/*
 * Intro animada del logo al iniciar sesión.
 *
 * El logo se redibuja en SVG con las mismas coordenadas que
 * assets/img/polo-oeste-marca.png (1254 × 1254), así al terminar puede
 * "volar" hasta el logo de la cabecera y encajar exacto sobre él.
 * Solo se reproduce en un inicio de sesión interactivo, no al recargar
 * con la sesión abierta. Un clic o cualquier tecla la adelantan.
 */

const INTRO_LOGO_INICIO_SALIDA = 2300;
const INTRO_LOGO_DURACION_VUELO = 680;
const INTRO_LOGO_INICIO_SALIDA_REDUCIDA = 1300;
const INTRO_LOGO_CANTIDAD_CHISPAS = 12;

/* Vértices de los tres triángulos, en píxeles del PNG original. */
const INTRO_LOGO_TRIANGULOS = [
    { clase: "intro-tri-superior intro-tri-gris", puntos: "320,175 320,580 720,580" },
    { clase: "intro-tri-derecho intro-tri-gris", puntos: "724,584 724,997 1131,997" },
    { clase: "intro-tri-verde", puntos: "320,584 320,997 722,997" }
];

let introLogoEnCurso = null;

function obtenerSaludoIntroLogo(usuario) {
    const hora = new Date().getHours();
    const saludo = hora >= 5 && hora < 12
        ? "Buen día"
        : hora >= 12 && hora < 20
            ? "Buenas tardes"
            : "Buenas noches";
    const primerNombre = String(usuario?.nombre || "").trim().split(/\s+/)[0];

    return primerNombre ? `${saludo}, ${primerNombre}` : saludo;
}

function crearMarcaIntroLogo() {
    const poligonos = INTRO_LOGO_TRIANGULOS.map(({ clase, puntos }) => {
        return `<polygon class="intro-tri ${clase}" points="${puntos}"></polygon>`;
    }).join("");
    const recortes = INTRO_LOGO_TRIANGULOS.map(({ puntos }) => {
        return `<polygon points="${puntos}"></polygon>`;
    }).join("");

    return `
        <svg viewBox="0 0 1254 1254" focusable="false">
            <defs>
                <clipPath id="intro-logo-recorte">${recortes}</clipPath>
                <linearGradient id="intro-logo-brillo" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stop-color="#fff" stop-opacity="0"></stop>
                    <stop offset="0.5" stop-color="#fff" stop-opacity="0.7"></stop>
                    <stop offset="1" stop-color="#fff" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            <circle class="intro-logo-onda" cx="722" cy="582" r="90"></circle>
            <circle class="intro-logo-onda intro-logo-onda-segunda" cx="722" cy="582" r="90"></circle>
            ${poligonos}
            <g clip-path="url(#intro-logo-recorte)">
                <rect class="intro-logo-destello" x="-520" y="0" width="340" height="1254"
                    fill="url(#intro-logo-brillo)"></rect>
            </g>
        </svg>
    `;
}

function crearChispasIntroLogo() {
    const contenedor = document.createElement("span");
    contenedor.className = "intro-logo-chispas";

    for (let indice = 0; indice < INTRO_LOGO_CANTIDAD_CHISPAS; indice += 1) {
        const angulo = (indice / INTRO_LOGO_CANTIDAD_CHISPAS) * Math.PI * 2
            + (Math.random() - 0.5) * 0.35;
        const distancia = 95 + Math.random() * 85;
        const chispa = document.createElement("i");

        chispa.className = indice % 3 === 0 ? "chispa-gris" : "chispa-verde";
        chispa.style.setProperty("--dx", `${Math.cos(angulo) * distancia}px`);
        chispa.style.setProperty("--dy", `${Math.sin(angulo) * distancia}px`);
        chispa.style.setProperty("--giro", `${Math.round(Math.random() * 540 - 270)}deg`);
        chispa.style.setProperty("--tam", `${7 + Math.round(Math.random() * 9)}px`);
        contenedor.appendChild(chispa);
    }

    return contenedor;
}

function crearNombreIntroLogo(texto) {
    const nombre = document.createElement("p");
    nombre.className = "intro-logo-nombre";

    Array.from(texto).forEach((caracter, indice) => {
        const letra = document.createElement("span");
        letra.textContent = caracter === " " ? " " : caracter;
        letra.style.setProperty("--i", indice);
        nombre.appendChild(letra);
    });

    return nombre;
}

function crearIntroLogo(usuario) {
    const intro = document.createElement("div");
    intro.className = "intro-logo";
    intro.setAttribute("aria-hidden", "true");
    intro.innerHTML = `
        <div class="intro-logo-fondo"></div>
        <div class="intro-logo-escena">
            <div class="intro-logo-marca">${crearMarcaIntroLogo()}</div>
            <div class="intro-logo-textos">
                <p class="intro-logo-modulo">Gestión de Información</p>
                <p class="intro-logo-saludo"></p>
                <div class="intro-logo-progreso"><span></span></div>
            </div>
        </div>
    `;

    const textos = intro.querySelector(".intro-logo-textos");
    textos.prepend(crearNombreIntroLogo("Polo Oeste"));
    intro.querySelector(".intro-logo-saludo").textContent =
        obtenerSaludoIntroLogo(usuario);
    intro.querySelector(".intro-logo-marca").appendChild(crearChispasIntroLogo());

    return intro;
}

function volarMarcaIntroLogo(marca, destino) {
    const rectDestino = destino?.getBoundingClientRect();

    if (!rectDestino || rectDestino.width === 0 || typeof marca.animate !== "function") {
        return Promise.resolve();
    }

    /* La marca escala desde su centro: se lleva centro sobre centro. */
    const rectOrigen = marca.getBoundingClientRect();
    const escala = rectDestino.width / rectOrigen.width;
    const dx = (rectDestino.left + rectDestino.width / 2)
        - (rectOrigen.left + rectOrigen.width / 2);
    const dy = (rectDestino.top + rectDestino.height / 2)
        - (rectOrigen.top + rectOrigen.height / 2);

    const vuelo = marca.animate(
        [
            { transform: "translate(0, 0) scale(1)" },
            {
                transform: `translate(${dx * 0.55}px, ${dy * 0.45}px) scale(${0.35 + escala * 0.65}) rotate(-6deg)`,
                offset: 0.55
            },
            { transform: `translate(${dx}px, ${dy}px) scale(${escala})` }
        ],
        {
            duration: INTRO_LOGO_DURACION_VUELO,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            fill: "forwards"
        }
    );

    return vuelo.finished.catch(() => {});
}

function reproducirIntroLogo(usuario) {
    if (introLogoEnCurso) {
        return introLogoEnCurso;
    }

    const movimientoReducido = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    const intro = crearIntroLogo(usuario);
    const marca = intro.querySelector(".intro-logo-marca");
    const destino = document.querySelector("#aplicacion .marca-aplicacion .marca-logo");

    destino?.classList.add("intro-logo-destino");
    document.body.appendChild(intro);

    introLogoEnCurso = new Promise((resolver) => {
        let saliendo = false;
        let temporizador = null;

        const terminar = () => {
            intro.remove();
            destino?.classList.remove("intro-logo-destino");
            destino?.classList.add("intro-logo-aterrizaje");
            setTimeout(() => destino?.classList.remove("intro-logo-aterrizaje"), 700);
            introLogoEnCurso = null;
            resolver();
        };

        const salir = async () => {
            if (saliendo) return;
            saliendo = true;
            clearTimeout(temporizador);
            document.removeEventListener("keydown", salir, true);
            intro.classList.add("saliendo");

            if (movimientoReducido) {
                terminar();
                return;
            }

            await volarMarcaIntroLogo(marca, destino);
            terminar();
        };

        intro.addEventListener("click", salir);
        document.addEventListener("keydown", salir, true);
        temporizador = setTimeout(
            salir,
            movimientoReducido
                ? INTRO_LOGO_INICIO_SALIDA_REDUCIDA
                : INTRO_LOGO_INICIO_SALIDA
        );
    });

    return introLogoEnCurso;
}
