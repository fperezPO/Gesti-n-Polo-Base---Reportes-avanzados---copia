let eventosAplicacionConfigurados = false;

document.addEventListener("DOMContentLoaded", () => {
    inicializarAutenticacion();
});

function iniciarAplicacion() {
    aplicarPermisosNavegacion();

    if (!eventosAplicacionConfigurados) {
        const botones = document.querySelectorAll("[data-page]");

        botones.forEach((boton) => {
            boton.addEventListener("click", () => {
                cargarPagina(boton.dataset.page);
            });
        });

        eventosAplicacionConfigurados = true;
    }

    cargarPagina("inicio");
}

function aplicarPermisosNavegacion() {
    const usuario = obtenerUsuarioActual();

    document.querySelectorAll("[data-page]")
        .forEach((elemento) => {
            elemento.hidden = !puedeUsuarioAccederPagina(
                elemento.dataset.page,
                usuario
            );
        });

    // Un grupo del menú sin opciones permitidas tampoco se muestra.
    document.querySelectorAll(".grupo-menu").forEach((grupo) => {
        grupo.hidden = [...grupo.querySelectorAll("[data-page]")]
            .every((elemento) => elemento.hidden);
    });
}
