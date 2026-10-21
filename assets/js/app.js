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
}
