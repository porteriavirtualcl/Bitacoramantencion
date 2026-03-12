# Guía de Despliegue en Hostinger - bitacora.porteriavirtual.cl

Esta guía detalla los pasos necesarios para desplegar la aplicación de Bitácora y Gestión de Incidencias en Hostinger.

## 1. Requisitos Previos en Hostinger

1.  **Dominio**: Asegúrate de que `bitacora.porteriavirtual.cl` esté apuntando a tu servidor de Hostinger.
2.  **SSL**: Activa el certificado SSL gratuito de Let's Encrypt. Las notificaciones push **requieren HTTPS**.
3.  **Node.js**: En el panel de Hostinger, asegúrate de tener instalada una versión de Node.js (recomendado v18 o superior).

## 2. Configuración de Base de Datos (MySQL)

1.  Crea una nueva base de datos MySQL desde el panel de Hostinger.
2.  Anota el nombre de la base de datos, el usuario y la contraseña.
3.  **Acceso Remoto**: Si vas a conectar desde fuera de Hostinger (opcional), ve a "Remote MySQL" y añade la IP de tu servidor o usa `%`.

## 3. Variables de Entorno (.env)

Configura las siguientes variables en el panel de Hostinger (Sección Avanzado -> Configuración de Node.js -> Variables de Entorno):

```env
# Base de Datos
MYSQL_HOST=localhost (o la IP que provea Hostinger)
MYSQL_USER=u123456789_bitacora
MYSQL_PASSWORD=tu_password_seguro
MYSQL_DATABASE=u123456789_bitacora
MYSQL_PORT=3306

# Correo (SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=notificaciones@porteriavirtual.cl
SMTP_PASS=tu_password_correo

# Seguridad
JWT_SECRET=una_clave_muy_larga_y_aleatoria
NODE_ENV=production

# Notificaciones Push (VAPID)
VAPID_PUBLIC_KEY=BNVLqtpAee6bCPc9FKAN6yVezLAQnQK8GPmJvk7P4az4bfwPDEQ9k3YQnaNVThvBx3H8MsO3dIMSgEVm_Zo4now
VAPID_PRIVATE_KEY=xAPtFhsCHPXzsKWN_qfHvOyOagDM-0AKdMMn-S_iicc
VAPID_SUBJECT=mailto:contacto@porteriavirtual.cl

# URL de la App
APP_URL=https://bitacora.porteriavirtual.cl
```

## 4. Pasos para el Despliegue

1.  **Subir Archivos**:
    *   Sube todo el contenido del proyecto a la carpeta raíz de tu sitio (usualmente `public_html` o la carpeta asignada a Node.js).
2.  **Instalar Dependencias**:
    *   Usa el terminal de Hostinger o el panel de Node.js para ejecutar:
        ```bash
        npm install --production
        ```
3.  **Compilar Frontend**:
    *   Si el panel de Hostinger no lo hace automáticamente, ejecuta:
        ```bash
        npm run build
        ```
4.  **Iniciar Servidor**:
    *   Configura el archivo de inicio como `server.ts` (o el archivo compilado si usas un proceso de build diferente).
    *   El comando de inicio debe ser:
        ```bash
        npm start
        ```

## 5. Notas Importantes

*   **Notificaciones Push**: El navegador pedirá permiso al usuario para recibir notificaciones. Asegúrate de que el sitio cargue siempre por HTTPS.
*   **Logs**: Si algo no funciona, revisa el archivo `error_log` o la consola de Node.js en el panel de Hostinger.
*   **PDFs**: La carpeta para generar PDFs temporales debe tener permisos de escritura.

---
*Desarrollado para Portería Virtual - 2024*
