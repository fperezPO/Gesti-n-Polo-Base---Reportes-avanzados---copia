/*
 * Menú de navegación contraído (estilos en navegacion-lateral.css).
 * En pantallas anchas muestra solo los íconos: tocarlo en cualquier lugar lo
 * despliega, sin navegar todavía. Se vuelve a contraer al elegir una página,
 * con el botón «, al tocar afuera o con Esc. Los grupos (Personal,
 * Actividades) se abren y cierran como siempre, con el menú desplegado.
 * En pantallas angostas el menú es la fila desplazable de siempre.
 */

(function inicializarNavegacionLateral() {
    const menu = document.querySelector(".layout .sidebar");
    const alternar = menu?.querySelector(".alternar-navegacion");
    if (!menu || !alternar) return;

    const pantallaAncha = window.matchMedia("(min-width: 821px)");
    const estaDesplegado = () => menu.classList.contains("desplegada");

    function desplegarNavegacion(desplegar) {
        menu.classList.toggle("desplegada", desplegar);
        alternar.setAttribute("aria-expanded", String(desplegar));
        alternar.setAttribute(
            "aria-label",
            desplegar ? "Contraer el menú de navegación" : "Desplegar el menú de navegación"
        );
    }

    /* En captura: contraído, el toque solo despliega y no llega al botón tocado. */
    menu.addEventListener("click", (evento) => {
        if (!pantallaAncha.matches) return;

        if (!estaDesplegado()) {
            evento.preventDefault();
            evento.stopPropagation();
            desplegarNavegacion(true);
            return;
        }

        if (evento.target.closest(".alternar-navegacion, [data-page]")) {
            desplegarNavegacion(false);
        }
    }, true);

    document.addEventListener("click", (evento) => {
        if (estaDesplegado() && !menu.contains(evento.target)) {
            desplegarNavegacion(false);
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && estaDesplegado()) {
            desplegarNavegacion(false);
            alternar.focus();
        }
    });

    pantallaAncha.addEventListener("change", () => desplegarNavegacion(false));
})();
