/*
 * Selector de período en un único calendario.
 *
 * Convierte cada contenedor [data-rango-fechas] en un botón que abre un
 * calendario: el primer clic marca el inicio y el segundo el fin (el mismo
 * día dos veces filtra solo esa fecha). Los dos <input type="date"> originales
 * se conservan ocultos con sus IDs, así cada página sigue leyendo y asignando
 * `desde` y `hasta` como antes (ciclo 21–20, mes completo, quitar filtros).
 *
 * Marcado esperado:
 *   <div class="campo" data-rango-fechas>
 *       <label class="etiqueta-rango-fechas">Período</label>
 *       <input id="..." type="date" data-rango-desde hidden>
 *       <input id="..." type="date" data-rango-hasta hidden>
 *   </div>
 */
(function () {
    const MESES = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
        "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
    const ANCHO_DOS_MESES = 640;
    const descriptorValor = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
    );

    let selectorAbierto = null;
    let contadorSelectores = 0;

    function leerValor(input) {
        return descriptorValor.get.call(input) || "";
    }

    function escribirValor(input, valor) {
        descriptorValor.set.call(input, valor || "");
    }

    function fechaATexto(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    function textoAFecha(texto) {
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || "");
        return partes
            ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
            : null;
    }

    function formatearCorta(texto) {
        const [ano, mes, dia] = String(texto).split("-");
        return `${dia}/${mes}/${ano}`;
    }

    function sumarDias(texto, dias) {
        const fecha = textoAFecha(texto);
        fecha.setDate(fecha.getDate() + dias);
        return fechaATexto(fecha);
    }

    function hoyTexto() {
        return fechaATexto(new Date());
    }

    function describirRango(desde, hasta) {
        if (!desde && !hasta) return "Todas las fechas";
        if (desde && hasta && desde === hasta) return formatearCorta(desde);
        /* Mismo año: se omite en el inicio para que entre en columnas angostas. */
        if (desde && hasta && desde.slice(0, 4) === hasta.slice(0, 4)) {
            return `${formatearCorta(desde).slice(0, 5)} – ${formatearCorta(hasta)}`;
        }
        if (desde && hasta) return `${formatearCorta(desde)} – ${formatearCorta(hasta)}`;
        return desde ? `Desde ${formatearCorta(desde)}` : `Hasta ${formatearCorta(hasta)}`;
    }

    function contarDias(desde, hasta) {
        const inicio = textoAFecha(desde);
        const fin = textoAFecha(hasta);
        return Math.round((fin - inicio) / 86400000) + 1;
    }

    const ICONO_CALENDARIO = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect>
            <path d="M3.5 10h17M8 3v4M16 3v4"></path>
        </svg>`;

    function crearSelector(contenedor) {
        const desde = contenedor.querySelector("[data-rango-desde]");
        const hasta = contenedor.querySelector("[data-rango-hasta]");
        const etiqueta = contenedor.querySelector(".etiqueta-rango-fechas");

        if (!desde || !hasta) return;

        contadorSelectores += 1;
        const idBase = `selector-rango-${contadorSelectores}`;
        const disparador = document.createElement("button");
        disparador.type = "button";
        disparador.className = "disparador-rango-fechas";
        disparador.setAttribute("aria-haspopup", "dialog");
        disparador.setAttribute("aria-expanded", "false");
        disparador.innerHTML = `${ICONO_CALENDARIO}<span class="texto-rango-fechas"></span>`;

        disparador.id = `${idBase}-boton`;

        if (etiqueta) {
            etiqueta.id = etiqueta.id || `${idBase}-etiqueta`;
            if (etiqueta.tagName === "LABEL") etiqueta.htmlFor = disparador.id;
            disparador.setAttribute("aria-labelledby", `${etiqueta.id} ${idBase}-valor`);
        }

        const texto = disparador.querySelector(".texto-rango-fechas");
        texto.id = `${idBase}-valor`;
        contenedor.appendChild(disparador);
        contenedor.dataset.rangoListo = "true";

        const estado = {
            contenedor,
            desde,
            hasta,
            disparador,
            panel: null,
            pendiente: "",
            sobre: "",
            mesVisible: null
        };

        const refrescar = () => {
            const valorDesde = leerValor(desde);
            const valorHasta = leerValor(hasta);
            texto.textContent = describirRango(valorDesde, valorHasta);
            disparador.classList.toggle("sin-rango", !valorDesde && !valorHasta);

            if (estado.panel) dibujarPanel(estado);
        };

        /* Los botones de ciclo 21–20 y mes completo asignan .value sin eventos. */
        [desde, hasta].forEach((input) => {
            Object.defineProperty(input, "value", {
                configurable: true,
                get() {
                    return leerValor(this);
                },
                set(valor) {
                    escribirValor(this, valor);
                    refrescar();
                }
            });
            input.form?.addEventListener("reset", () => setTimeout(refrescar));
        });

        estado.refrescar = refrescar;
        disparador.addEventListener("click", () => {
            if (selectorAbierto === estado) {
                cerrarPanel(true);
            } else {
                abrirPanel(estado);
            }
        });

        refrescar();
    }

    function confirmarRango(estado, valorDesde, valorHasta) {
        escribirValor(estado.desde, valorDesde);
        escribirValor(estado.hasta, valorHasta);
        estado.refrescar();
        /* Un único evento: los filtros leen los dos valores juntos. */
        estado.hasta.dispatchEvent(new Event("change", { bubbles: true }));
        cerrarPanel(true);
    }

    function abrirPanel(estado) {
        cerrarPanel(false);

        const referencia = textoAFecha(leerValor(estado.desde)) ||
            textoAFecha(leerValor(estado.hasta)) ||
            new Date();
        estado.mesVisible = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
        estado.pendiente = "";
        estado.sobre = "";

        const panel = document.createElement("div");
        panel.className = "calendario-rango";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Elegir período");
        estado.panel = panel;
        selectorAbierto = estado;
        estado.disparador.setAttribute("aria-expanded", "true");
        document.body.appendChild(panel);

        panel.addEventListener("click", (evento) => manejarClicPanel(estado, evento));
        panel.addEventListener("pointerover", (evento) => {
            const dia = evento.target.closest("[data-fecha]");
            if (estado.pendiente && dia && dia.dataset.fecha !== estado.sobre) {
                estado.sobre = dia.dataset.fecha;
                marcarRangoVisual(estado);
            }
        });
        panel.addEventListener("keydown", (evento) => manejarTeclado(estado, evento));

        dibujarPanel(estado);
        posicionarPanel();

        const enfocar = panel.querySelector(".dia-rango.es-inicio, .dia-rango.es-hoy, .dia-rango");
        enfocar?.focus({ preventScroll: true });
    }

    function cerrarPanel(devolverFoco) {
        const estado = selectorAbierto;
        if (!estado) return;

        estado.panel?.remove();
        estado.panel = null;
        estado.pendiente = "";
        estado.disparador.setAttribute("aria-expanded", "false");
        selectorAbierto = null;

        if (devolverFoco && estado.disparador.isConnected) {
            estado.disparador.focus({ preventScroll: true });
        }
    }

    function cantidadMeses() {
        return window.innerWidth >= ANCHO_DOS_MESES ? 2 : 1;
    }

    function dibujarPanel(estado) {
        const panel = estado.panel;
        const meses = [];

        for (let indice = 0; indice < cantidadMeses(); indice += 1) {
            meses.push(new Date(
                estado.mesVisible.getFullYear(),
                estado.mesVisible.getMonth() + indice,
                1
            ));
        }

        panel.innerHTML = `
            <div class="calendario-rango-meses">
                ${meses.map((mes, indice) => dibujarMes(mes, indice, meses.length)).join("")}
            </div>
            <p class="calendario-rango-ayuda" aria-live="polite"></p>
            <div class="calendario-rango-pie">
                <button type="button" class="boton-enlace" data-accion="hoy">Hoy</button>
                <button type="button" class="boton-enlace" data-accion="limpiar">Todas las fechas</button>
                <button type="button" class="boton-secundario" data-accion="cerrar">Cerrar</button>
            </div>
        `;
        marcarRangoVisual(estado);
    }

    function dibujarMes(primerDia, indice, total) {
        const ano = primerDia.getFullYear();
        const mes = primerDia.getMonth();
        const diasEnMes = new Date(ano, mes + 1, 0).getDate();
        const desplazamiento = (primerDia.getDay() + 6) % 7;
        const hoy = hoyTexto();
        const celdas = [];

        for (let vacio = 0; vacio < desplazamiento; vacio += 1) {
            celdas.push('<span class="dia-rango-vacio"></span>');
        }

        for (let dia = 1; dia <= diasEnMes; dia += 1) {
            const fecha = fechaATexto(new Date(ano, mes, dia));
            celdas.push(`
                <button type="button" class="dia-rango${fecha === hoy ? " es-hoy" : ""}"
                    data-fecha="${fecha}" tabindex="-1"
                    aria-label="${dia} de ${MESES[mes]} de ${ano}">${dia}</button>
            `);
        }

        const anterior = indice === 0
            ? '<button type="button" class="calendario-rango-nav" data-nav="-1" aria-label="Mes anterior">‹</button>'
            : '<span class="calendario-rango-nav-vacio"></span>';
        const siguiente = indice === total - 1
            ? '<button type="button" class="calendario-rango-nav" data-nav="1" aria-label="Mes siguiente">›</button>'
            : '<span class="calendario-rango-nav-vacio"></span>';

        return `
            <section class="calendario-rango-mes">
                <header>
                    ${anterior}
                    <strong>${MESES[mes]} ${ano}</strong>
                    ${siguiente}
                </header>
                <div class="calendario-rango-semana" aria-hidden="true">
                    ${DIAS_SEMANA.map((dia) => `<span>${dia}</span>`).join("")}
                </div>
                <div class="calendario-rango-dias">${celdas.join("")}</div>
            </section>
        `;
    }

    /* Pinta inicio, fin y tramo intermedio sin redibujar el calendario. */
    function marcarRangoVisual(estado) {
        const panel = estado.panel;
        if (!panel) return;

        let inicio = leerValor(estado.desde);
        let fin = leerValor(estado.hasta);

        if (estado.pendiente) {
            const otro = estado.sobre || estado.pendiente;
            [inicio, fin] = [estado.pendiente, otro].sort();
        }

        panel.querySelectorAll("[data-fecha]").forEach((boton) => {
            const fecha = boton.dataset.fecha;
            const dentro = (!inicio || fecha >= inicio) && (!fin || fecha <= fin) &&
                Boolean(inicio || fin);

            boton.classList.toggle("es-inicio", Boolean(inicio) && fecha === inicio);
            boton.classList.toggle("es-fin", Boolean(fin) && fecha === fin);
            boton.classList.toggle("en-rango", dentro && Boolean(inicio && fin));
            boton.classList.toggle("es-provisorio", Boolean(estado.pendiente) && dentro);
            boton.setAttribute("aria-pressed", String(fecha === inicio || fecha === fin));
        });

        const enfocable = panel.querySelector(".dia-rango.es-inicio") ||
            panel.querySelector(".dia-rango.es-hoy") ||
            panel.querySelector(".dia-rango");
        panel.querySelectorAll(".dia-rango").forEach((boton) => {
            boton.tabIndex = boton === enfocable ? 0 : -1;
        });

        const ayuda = panel.querySelector(".calendario-rango-ayuda");
        if (estado.pendiente) {
            const dias = contarDias(inicio, fin);
            ayuda.innerHTML = `Inicio: <strong>${formatearCorta(estado.pendiente)}</strong>. ` +
                `Ahora marcá la fecha de fin, o el mismo día para filtrar solo esa fecha` +
                (dias > 1 ? ` · ${dias} días` : "") + ".";
        } else if (inicio && fin) {
            const dias = contarDias(inicio, fin);
            ayuda.innerHTML = `Período actual: <strong>${describirRango(inicio, fin)}</strong>` +
                ` · ${dias} ${dias === 1 ? "día" : "días"}. Marcá una fecha para empezar otro.`;
        } else {
            ayuda.textContent = "Marcá la fecha de inicio y después la de fin.";
        }
    }

    function manejarClicPanel(estado, evento) {
        const nav = evento.target.closest("[data-nav]");
        const accion = evento.target.closest("[data-accion]");
        const dia = evento.target.closest("[data-fecha]");

        if (nav) {
            moverMes(estado, Number(nav.dataset.nav));
            return;
        }

        if (accion) {
            if (accion.dataset.accion === "hoy") {
                confirmarRango(estado, hoyTexto(), hoyTexto());
            } else if (accion.dataset.accion === "limpiar") {
                confirmarRango(estado, "", "");
            } else {
                cerrarPanel(true);
            }
            return;
        }

        if (dia) {
            elegirDia(estado, dia.dataset.fecha);
        }
    }

    function elegirDia(estado, fecha) {
        if (!estado.pendiente) {
            estado.pendiente = fecha;
            estado.sobre = fecha;
            marcarRangoVisual(estado);
            estado.panel.querySelector(`[data-fecha="${fecha}"]`)?.focus({ preventScroll: true });
            return;
        }

        const [inicio, fin] = [estado.pendiente, fecha].sort();
        confirmarRango(estado, inicio, fin);
    }

    function moverMes(estado, cantidad, fechaAEnfocar) {
        estado.mesVisible = new Date(
            estado.mesVisible.getFullYear(),
            estado.mesVisible.getMonth() + cantidad,
            1
        );
        dibujarPanel(estado);

        if (fechaAEnfocar) {
            estado.panel.querySelector(`[data-fecha="${fechaAEnfocar}"]`)?.focus({ preventScroll: true });
        }
    }

    function manejarTeclado(estado, evento) {
        if (evento.key === "Escape") {
            evento.preventDefault();
            cerrarPanel(true);
            return;
        }

        const dia = evento.target.closest("[data-fecha]");
        const pasos = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7
        };

        if (!dia || !(evento.key in pasos)) return;

        evento.preventDefault();
        const destino = sumarDias(dia.dataset.fecha, pasos[evento.key]);
        const boton = estado.panel.querySelector(`[data-fecha="${destino}"]`);

        if (boton) {
            boton.focus({ preventScroll: true });
        } else {
            moverMes(estado, pasos[evento.key] > 0 ? 1 : -1, destino);
        }

        if (estado.pendiente) {
            estado.sobre = destino;
            marcarRangoVisual(estado);
        }
    }

    /* Fijo al viewport: ninguna tarjeta con overflow lo recorta. */
    function posicionarPanel() {
        const estado = selectorAbierto;
        if (!estado?.panel) return;

        if (!estado.disparador.isConnected) {
            cerrarPanel(false);
            return;
        }

        const margen = 12;
        const rect = estado.disparador.getBoundingClientRect();
        const panel = estado.panel;
        const ancho = panel.offsetWidth;
        const alto = panel.offsetHeight;
        const izquierda = Math.min(
            Math.max(margen, rect.left),
            window.innerWidth - ancho - margen
        );
        const entraAbajo = rect.bottom + 8 + alto <= window.innerHeight - margen;
        const arriba = entraAbajo || rect.top - 8 - alto < margen
            ? Math.min(rect.bottom + 8, Math.max(margen, window.innerHeight - alto - margen))
            : rect.top - 8 - alto;

        panel.style.left = `${Math.max(margen, izquierda)}px`;
        panel.style.top = `${arriba}px`;
    }

    function mejorarSelectoresRangoFechas(raiz = document) {
        raiz.querySelectorAll?.("[data-rango-fechas]:not([data-rango-listo])")
            .forEach(crearSelector);
    }

    document.addEventListener("pointerdown", (evento) => {
        if (
            selectorAbierto &&
            !selectorAbierto.panel?.contains(evento.target) &&
            !selectorAbierto.disparador.contains(evento.target)
        ) {
            cerrarPanel(false);
        }
    }, true);

    window.addEventListener("resize", () => {
        if (selectorAbierto) {
            dibujarPanel(selectorAbierto);
            posicionarPanel();
        }
    });
    window.addEventListener("scroll", posicionarPanel, true);

    /* Las páginas llegan como fragmentos (router.js): se mejoran al insertarse. */
    new MutationObserver(() => mejorarSelectoresRangoFechas()).observe(
        document.documentElement,
        { childList: true, subtree: true }
    );
    document.addEventListener("DOMContentLoaded", () => mejorarSelectoresRangoFechas());

    window.mejorarSelectoresRangoFechas = mejorarSelectoresRangoFechas;
})();
