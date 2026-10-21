(() => {
    "use strict";

    const CLAVE = "gestion_personal_perfiles_organizacionales_v1";
    const EVENTO = "perfiles-organizacionales-actualizados";
    const PREDETERMINADOS = [
        ["Operario", "Operaciones", "colaborador", "automatico_wis"],
        ["Administrativo operativo", "Operaciones", "colaborador", "manual_asignado"],
        ["Supervisor operativo", "Operaciones", "jefe", "manual_asignado"],
        ["Técnico de mantenimiento", "Mantenimiento", "colaborador", "manual_asignado"],
        ["Jefe de mantenimiento", "Mantenimiento", "jefe", "manual_asignado"],
        ["Gerente de mantenimiento", "Mantenimiento", "gerente", "manual_asignado"],
        ["Soporte IT", "IT", "colaborador", "manual_asignado"],
        ["Analista IT", "IT", "colaborador", "manual_asignado"],
        ["Jefe de IT", "IT", "jefe", "manual_asignado"],
        ["Gerente de IT", "IT", "gerente", "manual_asignado"],
        ["Administrativo", "Administración", "colaborador", "manual_asignado"],
        ["Analista administrativo", "Administración", "colaborador", "manual_asignado"],
        ["Jefe de administración", "Administración", "jefe", "manual_asignado"],
        ["Gerente de administración", "Administración", "gerente", "manual_asignado"],
        ["Analista de RRHH", "Recursos Humanos", "colaborador", "manual_asignado"],
        ["Jefe de RRHH", "Recursos Humanos", "jefe", "manual_asignado"],
        ["Gerente de RRHH", "Recursos Humanos", "gerente", "manual_asignado"],
        ["Analista de datos", "Analítica", "colaborador", "manual_asignado"],
        ["Jefe de analítica", "Analítica", "jefe", "manual_asignado"],
        ["Gerente multiarea", "Gerencia", "gerente", "manual_asignado"],
        ["Gerente general", "Gerencia", "gerente_general", "manual_asignado"],
        ["Cliente", "Externo", "externo", "solo_consulta"],
        ["Invitado", "Externo", "externo", "solo_consulta"]
    ];

    const crearId = () => globalThis.crypto?.randomUUID?.() || `perfil-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const normalizar = (v) => String(v || "").trim().replace(/\s+/g, " ");
    const claveTexto = (v) => normalizar(v).toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    function crearPredeterminados() {
        return PREDETERMINADOS.map(([nombre, area, nivel, registro]) => ({ id: crearId(), nombre, area, nivel, metodoRegistro: registro, activo: true, sistema: nombre === "Operario", creadoEn: new Date().toISOString() }));
    }
    function obtener() {
        try {
            const guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
            if (Array.isArray(guardado) && guardado.length) return guardado;
        } catch (e) { console.warn("No fue posible leer perfiles.", e); }
        const iniciales = crearPredeterminados();
        guardar(iniciales);
        return iniciales;
    }
    function guardar(perfiles) {
        localStorage.setItem(CLAVE, JSON.stringify(perfiles));
        globalThis.dispatchEvent(new CustomEvent(EVENTO, { detail: perfiles }));
        return true;
    }
    function estaAsignado(perfil) {
        return typeof obtenerOperarios === "function" && obtenerOperarios().some((persona) => claveTexto(persona.cargo) === claveTexto(perfil.nombre));
    }
    function opcionesActivas() {
        return obtener().filter((p) => p.activo).sort((a,b) => a.area.localeCompare(b.area,"es") || a.nombre.localeCompare(b.nombre,"es"));
    }
    function actualizarSelectorCargo() {
        const selector = document.getElementById("cargo-operario");
        if (!selector) return;
        const actual = selector.value;
        selector.innerHTML = '<option value="">Seleccionar perfil</option>';
        const grupos = new Map();
        opcionesActivas().forEach((perfil) => {
            if (!grupos.has(perfil.area)) grupos.set(perfil.area, []);
            grupos.get(perfil.area).push(perfil);
        });
        grupos.forEach((perfiles, area) => {
            const grupo = document.createElement("optgroup"); grupo.label = area;
            perfiles.forEach((perfil) => { const o=document.createElement("option"); o.value=perfil.nombre; o.textContent=perfil.nombre; grupo.appendChild(o); });
            selector.appendChild(grupo);
        });
        if ([...selector.options].some((o) => o.value === actual)) selector.value = actual;
    }
    function renderizar() {
        const cuerpo = document.getElementById("tabla-perfiles-organizacionales");
        if (!cuerpo) return;
        cuerpo.innerHTML = "";
        obtener().sort((a,b) => a.area.localeCompare(b.area,"es") || a.nombre.localeCompare(b.nombre,"es")).forEach((perfil) => {
            const fila=document.createElement("tr");
            [perfil.nombre, perfil.area, etiquetaNivel(perfil.nivel), etiquetaMetodo(perfil.metodoRegistro), perfil.activo ? "Activo" : "Inactivo"].forEach((texto) => { const td=document.createElement("td"); td.textContent=texto; fila.appendChild(td); });
            const acciones=document.createElement("td");
            const boton=document.createElement("button"); boton.type="button"; boton.className="boton-secundario"; boton.textContent=perfil.activo ? "Quitar" : "Agregar"; boton.disabled=perfil.sistema || (!esAdministradorSeguro());
            boton.addEventListener("click", () => cambiarEstado(perfil.id)); acciones.appendChild(boton); fila.appendChild(acciones); cuerpo.appendChild(fila);
        });
        actualizarSelectorCargo();
    }
    function etiquetaNivel(v) { return ({colaborador:"Colaborador",referente:"Referente",jefe:"Jefe de área",gerente:"Gerente de área",gerente_general:"Gerente general",externo:"Externo"})[v] || v; }
    function etiquetaMetodo(v) { return ({automatico_wis:"Automático WIS",manual:"Manual",manual_asignado:"Manual y asignado",solo_consulta:"Solo consulta"})[v] || v; }
    function esAdministradorSeguro(){ return typeof esAdministrador === "function" && esAdministrador(); }
    function cambiarEstado(id) {
        const perfiles=obtener(); const perfil=perfiles.find((p)=>p.id===id); if(!perfil || !esAdministradorSeguro()) return;
        if(perfil.activo && estaAsignado(perfil)){ mostrar(`No se puede quitar “${perfil.nombre}” porque está asignado a Personal. Reasigná esas personas primero.`,"error"); return; }
        perfil.activo=!perfil.activo; guardar(perfiles); renderizar(); mostrar(perfil.activo ? "Perfil agregado nuevamente." : "Perfil quitado de las opciones.","exito");
    }
    function agregar(evento) {
        evento.preventDefault(); if(!esAdministradorSeguro()) return;
        const nombre=normalizar(document.getElementById("nombre-perfil-organizacional")?.value);
        const area=normalizar(document.getElementById("area-perfil-organizacional")?.value);
        const nivel=document.getElementById("nivel-perfil-organizacional")?.value;
        const metodo=document.getElementById("metodo-perfil-organizacional")?.value;
        if(nombre.length<3 || area.length<2){mostrar("Indicá un nombre de perfil y un área válidos.","error");return;}
        const perfiles=obtener(); const existente=perfiles.find((p)=>claveTexto(p.nombre)===claveTexto(nombre));
        if(existente){ if(!existente.activo){existente.activo=true; guardar(perfiles); renderizar(); mostrar("El perfil existente volvió a estar activo.","exito");} else mostrar("Ese perfil ya existe.","error"); return; }
        perfiles.push({id:crearId(),nombre,area,nivel,metodoRegistro:metodo,activo:true,sistema:false,creadoEn:new Date().toISOString()}); guardar(perfiles); evento.target.reset(); renderizar(); mostrar("Perfil agregado correctamente.","exito");
    }
    function mostrar(texto,tipo){const m=document.getElementById("mensaje-perfiles-organizacionales");if(m){m.textContent=texto;m.className=`mensaje ${tipo||""}`.trim();}}
    function inicializar(){
        const panel=document.getElementById("gestor-perfiles-organizacionales");
        if(!panel || panel.dataset.perfilesInicializados === "true") return;
        panel.dataset.perfilesInicializados = "true";
        const form=document.getElementById("form-perfil-organizacional");
        if(form && !form.dataset.inicializado){form.dataset.inicializado="true";form.addEventListener("submit",agregar);}
        document.querySelectorAll("#gestor-perfiles-organizacionales input,#gestor-perfiles-organizacionales select,#gestor-perfiles-organizacionales button").forEach((c)=>{if(!esAdministradorSeguro())c.disabled=true;});
        renderizar();
    }
    let inicializacionProgramada = false;
    const observador = new MutationObserver((mutaciones) => {
        const panel = document.getElementById("gestor-perfiles-organizacionales");
        if (!panel || panel.dataset.perfilesInicializados === "true") return;
        const agregado = mutaciones.some((mutacion) => {
            return Array.from(mutacion.addedNodes || []).some((nodo) => {
                return nodo.nodeType === Node.ELEMENT_NODE &&
                    (nodo.id === "gestor-perfiles-organizacionales" ||
                     nodo.querySelector?.("#gestor-perfiles-organizacionales"));
            });
        });
        if (!agregado || inicializacionProgramada) return;
        inicializacionProgramada = true;
        queueMicrotask(() => {
            inicializacionProgramada = false;
            inicializar();
        });
    });
    observador.observe(document.documentElement,{childList:true,subtree:true});
    globalThis.addEventListener(EVENTO,renderizar);
    globalThis.PoloOestePerfiles={obtener,guardar,opcionesActivas,actualizarSelectorCargo};
    inicializar();
})();
