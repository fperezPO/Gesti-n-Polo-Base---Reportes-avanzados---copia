async function cargarPagina(pagina) {
    const contenedor = document.getElementById("contenido");
    const usuario = obtenerUsuarioActual();

    if (!usuario) {
        mostrarPantallaAutenticacion();
        return;
    }

    if (!puedeUsuarioAccederPagina(pagina, usuario)) {
        pagina = "inicio";
    }

    if (window.location.protocol === "file:") {
        contenedor.innerHTML = `
            <section class="pagina">
                <h2>Inicio local requerido</h2>
                <p>
                    Para utilizar Polo Oeste desde esta computadora, cerrá
                    esta ventana y ejecutá el archivo
                    <strong>Iniciar Polo Oeste.bat</strong> ubicado en la
                    carpeta principal del proyecto.
                </p>
            </section>
        `;
        return;
    }

    try {
        const respuesta = await fetch(
            `pages/${pagina}.html?v=20261030-2`,
            { cache: "no-store" }
        );

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar pages/${pagina}.html`);
        }

        // La página anterior se descarta: se libera el contexto WebGL del 3D.
        if (typeof destruirEscenaMapa3D === "function") {
            destruirEscenaMapa3D();
        }

        contenedor.innerHTML = await respuesta.text();
        marcarEntradaPagina(contenedor.querySelector(":scope > .pagina"));

        document.querySelectorAll("[data-page]").forEach((boton) => {
            boton.classList.toggle(
                "activo",
                boton.dataset.page === pagina
            );
        });

        if (typeof inicializarPagina === "function") {
            inicializarPagina(pagina);
        }
    } catch (error) {
        contenedor.innerHTML = `
            <section class="pagina">
                <h2>Error</h2>
                <p>No fue posible cargar la página.</p>
            </section>
        `;

        console.error(error);
    }
}

/*
 * La animación de entrada (refinamiento-visual.css) solo corre al navegar:
 * si la página vuelve a dibujar sus bloques más tarde, no parpadea.
 */
function marcarEntradaPagina(pagina) {
    if (!pagina) {
        return;
    }

    pagina.classList.add("pagina-entrando");
    setTimeout(() => pagina.classList.remove("pagina-entrando"), 700);
}
