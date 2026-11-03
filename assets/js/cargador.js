/*
 * Animación de espera con los colores del logo de Polo Oeste (estilos en
 * cargador.css): tres pelotitas que rebotan, gris · verde · gris. Se mueve con
 * transform, así sigue animada aunque un cálculo largo ocupe la pantalla
 * (por ejemplo, «Calculando indicadores…» en Reportes).
 */

/* enLinea: la chica, para mensajes y botones; si no, la grande de las áreas que cargan. */
function crearCargadorPolo(enLinea = true) {
    const cargador = document.createElement("span");

    cargador.className = enLinea
        ? "cargador-polo cargador-polo-linea"
        : "cargador-polo";
    cargador.setAttribute("aria-hidden", "true");
    cargador.append(
        document.createElement("span"),
        document.createElement("span"),
        document.createElement("span")
    );
    return cargador;
}

/*
 * Escribe un mensaje de espera con la animación adelante. Si el elemento ya la
 * tiene, solo cambia el texto, para que no vuelva a empezar en cada avance
 * («Leyendo 2 de 5…»). El próximo textContent del elemento la quita.
 */
function mostrarEsperaPolo(elemento, texto, enLinea = true) {
    if (!elemento) {
        return;
    }

    let mensaje = elemento.querySelector(":scope > .texto-espera-polo");

    if (!mensaje || !elemento.querySelector(":scope > .cargador-polo")) {
        mensaje = document.createElement("span");
        mensaje.className = "texto-espera-polo";
        elemento.replaceChildren(crearCargadorPolo(enLinea), mensaje);
    }

    mensaje.textContent = texto;
}

/*
 * Deshabilita el botón y le muestra la animación con un texto de espera.
 * Devuelve la función que lo deja como estaba.
 */
function esperarEnBotonPolo(boton, texto) {
    const contenido = [...boton.childNodes];

    boton.disabled = true;
    mostrarEsperaPolo(boton, texto);

    return () => {
        boton.replaceChildren(...contenido);
        boton.disabled = false;
    };
}
