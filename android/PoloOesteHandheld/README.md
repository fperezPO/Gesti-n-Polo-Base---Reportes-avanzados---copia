# Polo Oeste Handheld para Android

Aplicación de prueba conectada al servidor local de la web Polo Oeste.

## Funciones incluidas

- acceso con las mismas cuentas de funcionario creadas en la web;
- identificación del colector;
- inicio, pausa, reanudación y finalización de actividad;
- envío automático de batería y último movimiento cada 30 segundos;
- alarma antipérdida tras 30 minutos sin movimiento;
- volumen de alarma al máximo, sonido repetido y vibración;
- actualización del panel web mediante la red local.

## Preparación

1. Abrir primero la web con `Iniciar Polo Oeste.bat`.
2. Iniciar sesión una vez en la web para sincronizar las cuentas.
3. Mantener la computadora y el Android conectados a la misma red Wi-Fi.
4. Anotar la línea `Dirección para Android` mostrada por el servidor.
5. Abrir esta carpeta en Android Studio, esperar la sincronización y ejecutar la aplicación.
6. En la pantalla de acceso Android, escribir la dirección completa del servidor, por ejemplo `http://192.168.1.25:8765`.

Windows puede solicitar autorización para permitir el acceso del servidor a la red privada. Debe aceptarse para que el handheld pueda comunicarse con la computadora.

## Compilación sin instalar programas

El proyecto utiliza Android Gradle Plugin 8.7.3, Java 17, `minSdk 26` y
`targetSdk 35`. GitHub Actions compila automáticamente un APK de prueba cada
vez que se suben cambios de esta aplicación a la rama `main`.

Para descargarlo:

1. Abrir el repositorio en GitHub y entrar en **Actions**.
2. Seleccionar **Compilar APK Android**.
3. Abrir la ejecución más reciente y esperar la marca verde.
4. En **Artifacts**, descargar **PoloOeste-Handheld-APK**.
5. Descomprimir el ZIP; dentro se encuentra `PoloOeste-Handheld.apk`.

También puede iniciarse manualmente desde **Run workflow**. El archivo se
conserva durante 30 días y es una versión de prueba (`debug`), adecuada para la
instalación directa en los handhelds habilitando aplicaciones de origen
desconocido.
