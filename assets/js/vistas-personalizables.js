/*
 * «Personalizar vista» en los apartados, con la misma barra y el mismo panel
 * que Inicio (inicio-personalizacion.js): cada usuario elige qué bloques ver
 * y en qué orden, y la elección se guarda por apartado.
 *
 * Cada fragmento marca sus bloques con data-vista-bloque (id),
 * data-vista-titulo y data-vista-categoria. Tienen que ser hijos directos de
 * la .pagina; lo que no está marcado (cabecera, filtros, avisos) queda fijo en
 * su lugar. No marques un bloque que otra parte de la página abre o muestra
 * (por ejemplo, el formulario de Embarques que abre «Nuevo embarque»): si el
 * usuario lo quitara, ese botón dejaría de responder.
 *
 * Los bloques quitados llevan la clase .bloque-oculto-vista y no el atributo
 * hidden, que algunas páginas usan por su cuenta (Reportes oculta sus
 * resultados hasta que se consulta).
 */

const CLAVE_VISTAS_APARTADOS = "gestion_personal_vistas_apartados";

let vistaApartadoActual = null;

function inicializarVistaPersonalizable(pagina) {
    vistaApartadoActual = null;

    const contenedor = document.querySelector("#contenido > .pagina");
    const usuario = obtenerUsuarioActual();
    const bloques = contenedor
        ? [...contenedor.querySelectorAll(":scope > [data-vista-bloque]")]
        : [];

    if (!usuario || bloques.length < 2) {
        return;
    }

    const ids = bloques.map((bloque) => bloque.dataset.vistaBloque);
    const guardada = leerStorage(CLAVE_VISTAS_APARTADOS, {})?.[usuario.id]?.[pagina];

    vistaApartadoActual = {
        pagina,
        contenedor,
        ids,
        bloques: new Map(bloques.map((bloque) => {
            return [bloque.dataset.vistaBloque, bloque];
        })),
        // Una marca invisible en el lugar de cada bloque: los bloques se
        // reparten entre esas marcas, así lo que queda fijo no se mueve.
        lugares: bloques.map((bloque) => {
            const lugar = document.createComment(" bloque personalizable ");
            bloque.before(lugar);
            return lugar;
        }),
        orden: normalizarOrdenVistaApartado(guardada?.orden, ids),
        ocultos: Array.isArray(guardada?.ocultos)
            ? ids.filter((id) => guardada.ocultos.includes(id))
            : [],
        enEdicion: false,
        arrastrado: ""
    };

    crearControlesVistaApartado();
    bloques.forEach(agregarControlesBloqueVista);
    configurarArrastreVistaApartado();
    aplicarVistaApartado();
}

/*
 * Conserva el orden guardado y ubica cada bloque nuevo después del que lo
 * precede en el orden original de la página.
 */
function normalizarOrdenVistaApartado(orden, ids) {
    const validos = Array.isArray(orden)
        ? orden.filter((id, indice) => {
            return ids.includes(id) && orden.indexOf(id) === indice;
        })
        : [];

    ids.forEach((id, indice) => {
        if (validos.includes(id)) {
            return;
        }

        const anterior = ids.slice(0, indice)
            .reverse()
            .find((otro) => validos.includes(otro));
        validos.splice(anterior ? validos.indexOf(anterior) + 1 : 0, 0, id);
    });

    return validos;
}

function crearControlesVistaApartado() {
    const { contenedor } = vistaApartadoActual;
    const plantilla = document.createElement("template");

    plantilla.innerHTML = `
        <section class="barra-vista-inicio" aria-labelledby="titulo-vista-apartado">
            <div>
                <span class="etiqueta-estado-reporte">Vista personal</span>
                <h3 id="titulo-vista-apartado">Vista completa</h3>
                <p class="texto-secundario" data-detalle-vista></p>
            </div>
            <button
                type="button"
                class="boton-secundario"
                aria-expanded="false"
                aria-controls="panel-personalizar-vista"
                data-abrir-vista
            >Personalizar vista</button>
        </section>

        <section
            id="panel-personalizar-vista"
            class="panel-personalizar-inicio"
            aria-labelledby="titulo-personalizar-vista"
            hidden
        >
            <div class="cabecera-personalizar-inicio">
                <div>
                    <span class="etiqueta-estado-reporte">Configuración</span>
                    <h3 id="titulo-personalizar-vista">Elegí qué ver y en qué orden</h3>
                    <p>
                        Mostrá, ocultá o mové cada sección de este apartado.
                        También podés arrastrar las secciones en la página.
                    </p>
                </div>
                <div class="acciones-guardar-vista-inicio">
                    <button type="button" class="boton-primario" data-guardar-vista>
                        Guardar mi vista
                    </button>
                    <button type="button" class="boton-secundario" data-cerrar-vista>
                        Listo
                    </button>
                </div>
            </div>

            <div class="lista-personalizar-inicio" data-lista-vista></div>

            <div class="pie-personalizar-inicio">
                <p aria-live="polite" data-mensaje-vista></p>
                <button type="button" class="boton-secundario" data-restaurar-vista>
                    Restaurar la vista original
                </button>
            </div>
        </section>
    `;

    const encabezado = contenedor.querySelector(":scope > .encabezado-pagina");

    if (encabezado) {
        encabezado.after(plantilla.content);
    } else {
        contenedor.prepend(plantilla.content);
    }

    const lista = contenedor.querySelector("[data-lista-vista]");

    contenedor.querySelector("[data-abrir-vista]")
        .addEventListener("click", () => alternarEdicionVistaApartado(true));
    contenedor.querySelector("[data-cerrar-vista]")
        .addEventListener("click", () => alternarEdicionVistaApartado(false));
    contenedor.querySelector("[data-guardar-vista]")
        .addEventListener("click", guardarVistaApartadoManualmente);
    contenedor.querySelector("[data-restaurar-vista]")
        .addEventListener("click", restaurarVistaApartado);

    lista.addEventListener("change", (evento) => {
        const control = evento.target.closest("[data-mostrar-bloque]");

        if (control) {
            cambiarVisibilidadBloqueVista(
                control.dataset.mostrarBloque,
                control.checked
            );
        }
    });

    lista.addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-mover-bloque]");

        if (boton) {
            moverBloqueVista(
                boton.dataset.moverBloque,
                Number(boton.dataset.direccionBloque)
            );
        }
    });
}

function agregarControlesBloqueVista(bloque) {
    const titulo = bloque.dataset.vistaTitulo || "esta sección";
    const controles = document.createElement("div");
    const asa = document.createElement("span");
    const nombre = document.createElement("span");
    const quitar = document.createElement("button");

    controles.className = "controles-bloque-vista";
    controles.title = "Arrastrá para mover";
    asa.textContent = "↕";
    asa.setAttribute("aria-hidden", "true");
    nombre.className = "titulo-bloque-vista";
    nombre.textContent = titulo;
    quitar.type = "button";
    quitar.className = "quitar-widget-inicio";
    quitar.textContent = "×";
    quitar.title = "Quitar de mi vista";
    quitar.setAttribute("aria-label", `Quitar ${titulo} de mi vista`);
    controles.append(asa, nombre, quitar);

    controles.addEventListener("click", (evento) => {
        // Dentro de un <summary>, el clic no tiene que abrir ni cerrar el bloque.
        evento.preventDefault();
        evento.stopPropagation();

        if (evento.target.closest(".quitar-widget-inicio")) {
            cambiarVisibilidadBloqueVista(bloque.dataset.vistaBloque, false);
            mostrarMensajeVistaApartado(
                "Se quitó la sección. Podés recuperarla desde esta lista."
            );
        }
    });

    // Un <details> cerrado no muestra su contenido: los controles van en el <summary>.
    const destino = bloque.matches("details")
        ? bloque.querySelector(":scope > summary") || bloque
        : bloque;
    destino.append(controles);
}

function configurarArrastreVistaApartado() {
    const vista = vistaApartadoActual;

    vista.bloques.forEach((bloque, id) => {
        bloque.addEventListener("dragstart", (evento) => {
            // Fuera del modo edición se arrastra lo de adentro (texto, enlaces).
            if (!vista.enEdicion || evento.target !== bloque) {
                return;
            }

            vista.arrastrado = id;
            bloque.classList.add("bloque-vista-arrastrando");
            evento.dataTransfer.effectAllowed = "move";
            evento.dataTransfer.setData("text/plain", id);
        });

        bloque.addEventListener("dragend", () => {
            bloque.classList.remove("bloque-vista-arrastrando");

            if (vista.arrastrado) {
                vista.arrastrado = "";
                guardarOrdenArrastreVista();
            }
        });
    });

    vista.contenedor.addEventListener("dragover", (evento) => {
        if (!vista.enEdicion || !vista.arrastrado) {
            return;
        }

        const destino = evento.target.closest("[data-vista-bloque]");
        const origen = vista.bloques.get(vista.arrastrado);

        if (
            !destino ||
            destino === origen ||
            vista.bloques.get(destino.dataset.vistaBloque) !== destino
        ) {
            return;
        }

        evento.preventDefault();
        const limites = destino.getBoundingClientRect();
        const despues = evento.clientY > limites.top + limites.height / 2;

        if (despues) {
            destino.after(origen);
        } else {
            destino.before(origen);
        }
    });

    vista.contenedor.addEventListener("drop", (evento) => {
        if (vista.enEdicion && vista.arrastrado) {
            evento.preventDefault();
        }
    });
}

function guardarOrdenArrastreVista() {
    const vista = vistaApartadoActual;

    vista.orden = [
        ...vista.contenedor.querySelectorAll(":scope > [data-vista-bloque]")
    ]
        .map((bloque) => bloque.dataset.vistaBloque)
        .filter((id) => vista.ids.includes(id));
    guardarVistaApartado();
    aplicarVistaApartado();
}

function aplicarVistaApartado() {
    const vista = vistaApartadoActual;

    if (!vista) {
        return;
    }

    vista.orden.forEach((id, indice) => {
        const bloque = vista.bloques.get(id);
        const oculto = vista.ocultos.includes(id);

        vista.lugares[indice].after(bloque);
        bloque.classList.toggle("bloque-oculto-vista", oculto);
        bloque.draggable = vista.enEdicion && !oculto;
    });

    actualizarDetalleVistaApartado();
    renderizarListaVistaApartado();
}

function alternarEdicionVistaApartado(activar) {
    const vista = vistaApartadoActual;
    const panel = vista.contenedor.querySelector("#panel-personalizar-vista");
    const boton = vista.contenedor.querySelector("[data-abrir-vista]");

    vista.enEdicion = Boolean(activar);
    panel.hidden = !vista.enEdicion;
    boton.setAttribute("aria-expanded", String(vista.enEdicion));
    boton.textContent = vista.enEdicion
        ? "Personalizando…"
        : "Personalizar vista";
    vista.contenedor.classList.toggle("modo-edicion-vista", vista.enEdicion);
    aplicarVistaApartado();

    if (vista.enEdicion) {
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function cambiarVisibilidadBloqueVista(id, mostrar) {
    const vista = vistaApartadoActual;
    const ocultos = new Set(vista.ocultos);

    if (mostrar) {
        ocultos.delete(id);
    } else {
        ocultos.add(id);
    }

    vista.ocultos = vista.ids.filter((otro) => ocultos.has(otro));
    guardarVistaApartado();
    aplicarVistaApartado();
}

function moverBloqueVista(id, direccion) {
    const vista = vistaApartadoActual;
    const indice = vista.orden.indexOf(id);
    const destino = indice + direccion;

    if (indice < 0 || destino < 0 || destino >= vista.orden.length) {
        return;
    }

    const orden = [...vista.orden];
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    vista.orden = orden;
    guardarVistaApartado();
    aplicarVistaApartado();

    // La lista se vuelve a dibujar: el foco sigue en el botón que se usó.
    const lista = vista.contenedor.querySelector("[data-lista-vista]");
    const botones = [
        ...lista.querySelectorAll(`[data-mover-bloque="${id}"]`)
    ];
    const mismo = botones.find((boton) => {
        return Number(boton.dataset.direccionBloque) === direccion;
    });
    (mismo && !mismo.disabled ? mismo : botones.find((boton) => !boton.disabled))
        ?.focus();
}

function renderizarListaVistaApartado() {
    const { contenedor, orden, ocultos, bloques } = vistaApartadoActual;
    const lista = contenedor.querySelector("[data-lista-vista]");

    lista.innerHTML = "";

    orden.forEach((id, indice) => {
        const bloque = bloques.get(id);
        const fila = document.createElement("div");
        const etiqueta = document.createElement("label");
        const control = document.createElement("input");
        const textos = document.createElement("span");
        const categoria = document.createElement("small");
        const titulo = document.createElement("strong");
        const acciones = document.createElement("div");
        const subir = crearBotonMoverBloqueVista(id, -1, "↑", "Subir");
        const bajar = crearBotonMoverBloqueVista(id, 1, "↓", "Bajar");

        fila.className = "fila-personalizar-inicio";
        control.type = "checkbox";
        control.checked = !ocultos.includes(id);
        control.dataset.mostrarBloque = id;
        categoria.textContent = bloque.dataset.vistaCategoria || "Sección";
        titulo.textContent = bloque.dataset.vistaTitulo || id;
        textos.append(categoria, titulo);
        etiqueta.append(control, textos);
        acciones.className = "acciones-orden-inicio";
        subir.disabled = indice === 0;
        bajar.disabled = indice === orden.length - 1;
        acciones.append(subir, bajar);
        fila.append(etiqueta, acciones);
        lista.appendChild(fila);
    });
}

function crearBotonMoverBloqueVista(id, direccion, texto, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-orden-inicio";
    boton.textContent = texto;
    boton.title = `${accion} sección`;
    boton.setAttribute("aria-label", `${accion} sección`);
    boton.dataset.moverBloque = id;
    boton.dataset.direccionBloque = String(direccion);
    return boton;
}

function actualizarDetalleVistaApartado() {
    const { contenedor, ids, orden, ocultos } = vistaApartadoActual;
    const titulo = contenedor.querySelector("#titulo-vista-apartado");
    const detalle = contenedor.querySelector("[data-detalle-vista]");
    const personalizada = ocultos.length > 0 ||
        orden.some((id, indice) => id !== ids[indice]);

    titulo.textContent = personalizada
        ? "Vista personalizada"
        : "Vista completa";
    detalle.textContent = personalizada
        ? `Tu selección para este apartado · ${ids.length - ocultos.length} de ${ids.length} secciones visibles`
        : `Todas las secciones, en el orden original · ${ids.length} secciones visibles`;
}

function guardarVistaApartado() {
    const vista = vistaApartadoActual;
    const usuario = obtenerUsuarioActual();

    if (!vista || !usuario) {
        return false;
    }

    const guardadas = leerStorage(CLAVE_VISTAS_APARTADOS, {}) || {};
    guardadas[usuario.id] = {
        ...guardadas[usuario.id],
        [vista.pagina]: {
            orden: vista.orden,
            ocultos: vista.ocultos,
            actualizada: new Date().toISOString()
        }
    };
    return guardarStorage(CLAVE_VISTAS_APARTADOS, guardadas);
}

function guardarVistaApartadoManualmente() {
    mostrarMensajeVistaApartado(
        guardarVistaApartado()
            ? "Tu vista quedó guardada para este usuario."
            : "No fue posible guardar la vista."
    );
}

function restaurarVistaApartado() {
    const vista = vistaApartadoActual;

    vista.orden = [...vista.ids];
    vista.ocultos = [];
    guardarVistaApartado();
    aplicarVistaApartado();
    mostrarMensajeVistaApartado("Se restauró la vista original de este apartado.");
}

function mostrarMensajeVistaApartado(texto) {
    const mensaje = vistaApartadoActual?.contenedor.querySelector(
        "[data-mensaje-vista]"
    );

    if (!mensaje) {
        return;
    }

    mensaje.textContent = texto;
    clearTimeout(mensaje._temporizadorVista);
    mensaje._temporizadorVista = setTimeout(() => {
        if (mensaje.isConnected) {
            mensaje.textContent = "";
        }
    }, 3500);
}
