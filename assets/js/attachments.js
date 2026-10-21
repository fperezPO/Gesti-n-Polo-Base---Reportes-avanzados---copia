const BASE_DOCUMENTOS = "gestion_personal_documentos";
const VERSION_BASE_DOCUMENTOS = 1;
const ALMACEN_DOCUMENTOS = "adjuntos";

function abrirBaseDocumentos() {
    return new Promise((resolve, reject) => {
        const solicitud = indexedDB.open(
            BASE_DOCUMENTOS,
            VERSION_BASE_DOCUMENTOS
        );

        solicitud.onupgradeneeded = () => {
            const base = solicitud.result;

            if (!base.objectStoreNames.contains(ALMACEN_DOCUMENTOS)) {
                base.createObjectStore(ALMACEN_DOCUMENTOS, {
                    keyPath: "id"
                });
            }
        };

        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
    });
}

async function guardarDocumento(archivo) {
    const base = await abrirBaseDocumentos();
    const documento = {
        id: generarId(),
        nombre: archivo.name,
        tipo: archivo.type,
        tamano: archivo.size,
        archivo,
        fechaRegistro: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(
            ALMACEN_DOCUMENTOS,
            "readwrite"
        );
        const almacen = transaccion.objectStore(ALMACEN_DOCUMENTOS);
        almacen.add(documento);

        transaccion.oncomplete = () => {
            base.close();
            resolve({
                id: documento.id,
                nombre: documento.nombre,
                tipo: documento.tipo,
                tamano: documento.tamano
            });
        };
        transaccion.onerror = () => {
            base.close();
            reject(transaccion.error);
        };
    });
}

async function obtenerDocumento(documentoId) {
    const base = await abrirBaseDocumentos();

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(
            ALMACEN_DOCUMENTOS,
            "readonly"
        );
        const solicitud = transaccion
            .objectStore(ALMACEN_DOCUMENTOS)
            .get(documentoId);

        solicitud.onsuccess = () => {
            base.close();
            resolve(solicitud.result || null);
        };
        solicitud.onerror = () => {
            base.close();
            reject(solicitud.error);
        };
    });
}

async function eliminarDocumento(documentoId) {
    if (!documentoId) {
        return;
    }

    const base = await abrirBaseDocumentos();

    return new Promise((resolve, reject) => {
        const transaccion = base.transaction(
            ALMACEN_DOCUMENTOS,
            "readwrite"
        );
        transaccion.objectStore(ALMACEN_DOCUMENTOS).delete(documentoId);

        transaccion.oncomplete = () => {
            base.close();
            resolve();
        };
        transaccion.onerror = () => {
            base.close();
            reject(transaccion.error);
        };
    });
}
