(() => {
    "use strict";
    const PREFIJO = "gestion_personal_mi_perfil_v1_";
    const MAX_ARCHIVO = 5 * 1024 * 1024;
    let fotoPendiente = "";

    function usuarioActual() {
        return typeof obtenerUsuarioActual === "function" ? obtenerUsuarioActual() : null;
    }
    function clave() {
        const usuario = usuarioActual();
        return `${PREFIJO}${usuario?.id || usuario?.nombreUsuario || "anonimo"}`;
    }
    function perfilBase() {
        const usuario = usuarioActual();
        return { nombre: usuario?.nombre || "", email: "", telefono: "", interno: "", ubicacion: "", preferenciaContacto: "email", descripcion: "", foto: "" };
    }
    function leer() {
        try { return { ...perfilBase(), ...JSON.parse(localStorage.getItem(clave()) || "{}") }; }
        catch { return perfilBase(); }
    }
    function guardar(datos) {
        localStorage.setItem(clave(), JSON.stringify(datos));
    }
    function valor(id) { return document.getElementById(id)?.value.trim() || ""; }
    function asignar(id, valor) { const c=document.getElementById(id); if(c) c.value=valor || ""; }
    function iniciales(nombre) {
        return String(nombre || "?").trim().split(/\s+/).slice(0,2).map((p)=>p[0] || "").join("").toUpperCase() || "?";
    }
    function mostrarFoto(datos) {
        const img=document.getElementById("foto-mi-perfil");
        const inicial=document.getElementById("iniciales-mi-perfil");
        const quitar=document.getElementById("quitar-foto-mi-perfil");
        const nombre=datos.nombre || usuarioActual()?.nombre || "Mi perfil";
        document.getElementById("nombre-visible-mi-perfil").textContent=nombre;
        document.getElementById("usuario-visible-mi-perfil").textContent=usuarioActual()?.nombreUsuario ? `@${usuarioActual().nombreUsuario}` : "";
        inicial.textContent=iniciales(nombre);
        if(datos.foto){img.src=datos.foto;img.hidden=false;inicial.hidden=true;quitar.hidden=false;}
        else{img.removeAttribute("src");img.hidden=true;inicial.hidden=false;quitar.hidden=true;}
    }
    function cargar() {
        const datos=leer(); fotoPendiente=datos.foto || "";
        asignar("nombre-mi-perfil",datos.nombre); asignar("email-mi-perfil",datos.email);
        asignar("telefono-mi-perfil",datos.telefono); asignar("interno-mi-perfil",datos.interno);
        asignar("ubicacion-mi-perfil",datos.ubicacion); asignar("preferencia-contacto-mi-perfil",datos.preferenciaContacto);
        asignar("descripcion-mi-perfil",datos.descripcion); actualizarContador(); mostrarFoto(datos);
    }
    function actualizarContador() {
        const texto=document.getElementById("descripcion-mi-perfil")?.value || "";
        const contador=document.getElementById("contador-descripcion-mi-perfil"); if(contador) contador.textContent=texto.length;
    }
    async function procesarFoto(archivo) {
        if(!archivo) return;
        if(!["image/jpeg","image/png","image/webp"].includes(archivo.type)){mensaje("Usá una imagen JPG, PNG o WebP.","error");return;}
        if(archivo.size>MAX_ARCHIVO){mensaje("La imagen no puede superar 5 MB.","error");return;}
        const bitmap=await createImageBitmap(archivo);
        const max=512, escala=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement("canvas"); canvas.width=Math.round(bitmap.width*escala); canvas.height=Math.round(bitmap.height*escala);
        canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close?.();
        fotoPendiente=canvas.toDataURL("image/jpeg",0.82); mostrarFoto({...leer(),nombre:valor("nombre-mi-perfil"),foto:fotoPendiente}); mensaje("Foto preparada. Guardá el perfil para confirmar.","");
    }
    function enviar(evento) {
        evento.preventDefault();
        const descripcion=valor("descripcion-mi-perfil");
        if(descripcion.length>200){mensaje("La descripción no puede superar 200 caracteres.","error");return;}
        const datos={nombre:valor("nombre-mi-perfil"),email:valor("email-mi-perfil"),telefono:valor("telefono-mi-perfil"),interno:valor("interno-mi-perfil"),ubicacion:valor("ubicacion-mi-perfil"),preferenciaContacto:valor("preferencia-contacto-mi-perfil"),descripcion,foto:fotoPendiente,actualizadoEn:new Date().toISOString()};
        guardar(datos); mostrarFoto(datos); mensaje("Perfil guardado correctamente.","exito");
    }
    function mensaje(texto,tipo){const m=document.getElementById("mensaje-mi-perfil");if(m){m.textContent=texto;m.className=`mensaje ${tipo||""}`.trim();}}
    function agregarAcceso() {
        if(document.querySelector('[data-page="mi-perfil"]')) return;
        const referencia=document.querySelector('[data-page="inicio"]');
        const contenedor=referencia?.parentElement;
        if(!contenedor) return;
        const boton=document.createElement(referencia.tagName.toLowerCase());
        if(referencia.className) boton.className=referencia.className;
        boton.type="button"; boton.dataset.page="mi-perfil"; boton.textContent="Mi perfil";
        contenedor.appendChild(boton);
    }
    function inicializar() {
        agregarAcceso();
        const pagina=document.querySelector(".pagina-mi-perfil");
        if(!pagina || pagina.dataset.inicializada) return;
        pagina.dataset.inicializada="true"; cargar();
        document.getElementById("form-mi-perfil")?.addEventListener("submit",enviar);
        document.getElementById("descripcion-mi-perfil")?.addEventListener("input",actualizarContador);
        document.getElementById("nombre-mi-perfil")?.addEventListener("input",()=>mostrarFoto({...leer(),nombre:valor("nombre-mi-perfil"),foto:fotoPendiente}));
        document.getElementById("archivo-foto-mi-perfil")?.addEventListener("change",(e)=>procesarFoto(e.target.files?.[0]).catch(()=>mensaje("No se pudo procesar la imagen.","error")));
        document.getElementById("quitar-foto-mi-perfil")?.addEventListener("click",()=>{fotoPendiente="";mostrarFoto({...leer(),nombre:valor("nombre-mi-perfil"),foto:""});mensaje("Foto quitada. Guardá el perfil para confirmar.","");});
        document.getElementById("restablecer-mi-perfil")?.addEventListener("click",cargar);
    }
    const observer=new MutationObserver(()=>queueMicrotask(inicializar)); observer.observe(document.documentElement,{childList:true,subtree:true});
    inicializar();
})();
