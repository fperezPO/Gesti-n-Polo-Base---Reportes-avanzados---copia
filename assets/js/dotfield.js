const CONFIGURACION_DOTFIELD = {
    radioPunto: 1.5,
    separacion: 18,
    radioCursor: 500,
    fuerzaCursor: 0.1,
    fuerzaAbultamiento: 42,
    radioResplandor: 160,
    colorPunto: "66, 108, 37",
    colorResplandor: "41, 45, 43"
};

document.addEventListener("DOMContentLoaded", inicializarDotFieldAcceso);

function inicializarDotFieldAcceso() {
    const pantalla = document.getElementById("pantalla-autenticacion");
    const lienzo = document.getElementById("dotfield-acceso");

    if (!pantalla || !lienzo) {
        return;
    }

    const contexto = lienzo.getContext("2d");
    const movimientoReducido = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );
    const cursor = {
        activo: false,
        actualX: 0,
        actualY: 0,
        objetivoX: 0,
        objetivoY: 0
    };
    let ancho = 0;
    let alto = 0;
    let puntos = [];
    let animacionId = null;
    let observadorTamano = null;

    function actualizarTamano() {
        const rectangulo = pantalla.getBoundingClientRect();
        const escala = Math.min(window.devicePixelRatio || 1, 2);

        ancho = Math.max(1, Math.round(rectangulo.width));
        alto = Math.max(1, Math.round(rectangulo.height));
        lienzo.width = Math.round(ancho * escala);
        lienzo.height = Math.round(alto * escala);
        lienzo.style.width = `${ancho}px`;
        lienzo.style.height = `${alto}px`;
        contexto.setTransform(escala, 0, 0, escala, 0, 0);
        puntos = crearMallaPuntos(ancho, alto);

        if (movimientoReducido.matches) {
            dibujarEscena(false);
        }
    }

    function crearMallaPuntos(anchoLienzo, altoLienzo) {
        const separacion = anchoLienzo < 600
            ? CONFIGURACION_DOTFIELD.separacion + 4
            : CONFIGURACION_DOTFIELD.separacion;
        const margen = separacion / 2;
        const malla = [];

        for (let y = margen; y < altoLienzo; y += separacion) {
            for (let x = margen; x < anchoLienzo; x += separacion) {
                malla.push({ x, y });
            }
        }

        return malla;
    }

    function obtenerRadioCursor() {
        return Math.min(
            CONFIGURACION_DOTFIELD.radioCursor,
            Math.max(230, ancho * 0.4)
        );
    }

    function dibujarResplandor() {
        if (!cursor.activo) {
            return;
        }

        const radio = CONFIGURACION_DOTFIELD.radioResplandor;
        const gradiente = contexto.createRadialGradient(
            cursor.actualX,
            cursor.actualY,
            0,
            cursor.actualX,
            cursor.actualY,
            radio
        );
        gradiente.addColorStop(
            0,
            `rgba(${CONFIGURACION_DOTFIELD.colorResplandor}, 0.16)`
        );
        gradiente.addColorStop(
            0.5,
            `rgba(${CONFIGURACION_DOTFIELD.colorResplandor}, 0.07)`
        );
        gradiente.addColorStop(
            1,
            `rgba(${CONFIGURACION_DOTFIELD.colorResplandor}, 0)`
        );
        contexto.fillStyle = gradiente;
        contexto.fillRect(
            cursor.actualX - radio,
            cursor.actualY - radio,
            radio * 2,
            radio * 2
        );
    }

    function dibujarEscena(interactiva = true) {
        contexto.clearRect(0, 0, ancho, alto);

        if (interactiva && cursor.activo) {
            cursor.actualX += (
                cursor.objetivoX - cursor.actualX
            ) * CONFIGURACION_DOTFIELD.fuerzaCursor;
            cursor.actualY += (
                cursor.objetivoY - cursor.actualY
            ) * CONFIGURACION_DOTFIELD.fuerzaCursor;
        }

        dibujarResplandor();

        const radioCursor = obtenerRadioCursor();

        puntos.forEach((punto) => {
            let x = punto.x;
            let y = punto.y;
            let radio = CONFIGURACION_DOTFIELD.radioPunto;
            let opacidad = 0.25;

            if (interactiva && cursor.activo) {
                const diferenciaX = punto.x - cursor.actualX;
                const diferenciaY = punto.y - cursor.actualY;
                const distancia = Math.hypot(diferenciaX, diferenciaY);

                if (distancia < radioCursor && distancia > 0) {
                    const influencia = Math.pow(
                        1 - distancia / radioCursor,
                        2
                    );
                    const desplazamiento =
                        CONFIGURACION_DOTFIELD.fuerzaAbultamiento *
                        influencia;
                    x += diferenciaX / distancia * desplazamiento;
                    y += diferenciaY / distancia * desplazamiento;
                    radio += influencia * 1.1;
                    opacidad += influencia * 0.48;
                }
            }

            contexto.beginPath();
            contexto.arc(x, y, radio, 0, Math.PI * 2);
            contexto.fillStyle =
                `rgba(${CONFIGURACION_DOTFIELD.colorPunto}, ${opacidad})`;
            contexto.fill();
        });
    }

    function animar() {
        if (pantalla.hidden || document.hidden || movimientoReducido.matches) {
            animacionId = null;
            dibujarEscena(false);
            return;
        }

        dibujarEscena(true);
        animacionId = requestAnimationFrame(animar);
    }

    function iniciarAnimacion() {
        if (!animacionId && !movimientoReducido.matches && !pantalla.hidden) {
            animacionId = requestAnimationFrame(animar);
        }
    }

    function detenerAnimacion() {
        if (animacionId) {
            cancelAnimationFrame(animacionId);
            animacionId = null;
        }
    }

    function actualizarCursor(evento) {
        if (pantalla.hidden || movimientoReducido.matches) {
            return;
        }

        const rectangulo = pantalla.getBoundingClientRect();
        const x = evento.clientX - rectangulo.left;
        const y = evento.clientY - rectangulo.top;
        const dentro = x >= 0 && x <= ancho && y >= 0 && y <= alto;

        cursor.activo = dentro;

        if (!dentro) {
            return;
        }

        cursor.objetivoX = x;
        cursor.objetivoY = y;

        if (!cursor.actualX && !cursor.actualY) {
            cursor.actualX = x;
            cursor.actualY = y;
        }
    }

    function actualizarEstado() {
        if (pantalla.hidden || document.hidden) {
            detenerAnimacion();
            return;
        }

        actualizarTamano();
        iniciarAnimacion();
    }

    actualizarTamano();
    iniciarAnimacion();

    window.addEventListener("pointermove", actualizarCursor, {
        passive: true
    });
    window.addEventListener("pointerout", () => {
        cursor.activo = false;
    });
    document.addEventListener("visibilitychange", actualizarEstado);
    movimientoReducido.addEventListener("change", actualizarEstado);

    if (typeof ResizeObserver === "function") {
        observadorTamano = new ResizeObserver(actualizarTamano);
        observadorTamano.observe(pantalla);
    } else {
        window.addEventListener("resize", actualizarTamano);
    }

    new MutationObserver(actualizarEstado).observe(pantalla, {
        attributes: true,
        attributeFilter: ["hidden"]
    });
}
