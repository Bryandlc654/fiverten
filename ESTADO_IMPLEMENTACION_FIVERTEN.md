# FIVERTEN — ¿Cómo va la aplicación?

Este documento explica, en palabras sencillas, **qué es FIVERTEN, qué ya está funcionando y qué falta por hacer**. Está pensado para que cualquier persona (no solo programadores) entienda el estado del proyecto.

Última actualización: **octubre de 2026**.

---

## 1. ¿Qué es FIVERTEN?

FIVERTEN es una aplicación web donde las **empresas** pueden registrarse, tener su **perfil propio** y gestionar a su equipo de trabajo.

Piensa en ella como una plataforma donde cada empresa tiene "su propia oficina" dentro del sistema: sus datos, sus usuarios y su información están **separados** de los de las demás empresas. Nadie puede ver ni tocar los datos de otra empresa.

La idea final del producto es convertirse en una plataforma de **confianza y reseñas verificadas**: cada empresa podrá demostrar que es real y legítima (lo que llamamos el camino "reclamo → verificación").

---

## 2. Cómo está construida

La aplicación tiene dos grandes partes, como casi cualquier servicio web moderno:

- **El "motor" interno** (lo que no se ve): guarda la información, valida quién entra y hace funcionar las reglas. Está alojado en internet, en un servicio llamado **Render**.
- **La "cara" visible** (lo que usan las personas): las pantallas que ves en el navegador. También vive en **Render**.
- **La "bodega" de datos**: donde se guarda toda la información de forma segura, en un servicio llamado **Neon** (una base de datos en la nube).

Todo esto está **en línea y funcionando** en internet (no solo en tu computador).

---

## 3. Qué ya funciona hoy

### Cuentas y acceso
- **Registro**: una empresa puede crear su cuenta y queda como su dueña.
- **Inicio de sesión** y **cierre de sesión**.
- **La sesión se mantiene**: si cierras el navegador y vuelves, sigues conectado (sin tener que escribir tu clave otra vez).
- **Recuperar contraseña** si la olvidaste (llega un enlace al correo).
- **Verificar tu correo** para confirmar que es real (opcional, se puede activar o desactivar).
- **Ver tus sesiones activas** y cerrarlas (por ejemplo, si entraste desde otro dispositivo).
- **Protección contra intentos de hackeo de contraseña**: tras varios intentos fallidos, la cuenta se bloquea temporalmente.

### La empresa (el "tenant")
- **Ver y editar los datos de la empresa** (nombre, información, etc.).
- **Subir una imagen de portada** para la empresa. Si la foto es muy pesada, el sistema la reduce automáticamente antes de subirla.
- **Gestionar el equipo** (los usuarios de la empresa):
  - Añadir personas (se abre una ventana emergente limpia para hacerlo).
  - Cambiar el rol de cada persona.
  - Activar o desactivar a alguien.
  - Eliminar a alguien del equipo.

### Niveles de permiso (quién puede hacer qué)
Cada persona del equipo tiene un **nivel de permiso**, de mayor a menor:
1. **Dueño** — control total.
2. **Administrador** — puede casi todo.
3. **Gerente** — gestiona el día a día y añade personas.
4. **Editor** — trabaja con contenido.
5. **Observador** — solo puede mirar.

El sistema respeta automáticamente estos niveles: por ejemplo, alguien con nivel bajo no puede borrar miembros.

### Panel de administración general (para el equipo de FIVERTEN)
- Ver **métricas** (cuántas empresas y usuarios hay).
- Ver la **lista de todas las empresas** (con búsqueda y páginas).
- **Crear** una empresa nueva.
- **Editar** una empresa (su estado, su verificación, etc.).
- Ver y administrar **todos los usuarios** de la plataforma.

### Seguridad y tranquilidad
- **Cada empresa está aislada**: es imposible que una vea los datos de otra. Esto lo garantiza el propio sistema de datos (una "capa de seguridad" en la base de datos).
- **Las contraseñas nunca se guardan tal cual**: se guardan encriptadas de forma irreversible.
- **Límite de peticiones**: evita abusos y ataques automáticos.
- **Registros de intentos de acceso**: queda constancia de los intentos (buenos y malos).
- **Limpieza automática** de datos viejos que ya no se necesitan.

### Calidad (pruebas)
- Existen **pruebas automáticas** que comprueban que lo principal funciona, tanto en el motor como en las pantallas.

---

## 4. Estado, de un vistazo

| Área | ¿Cómo va? |
|---|---|
| Registro, login y sesión | ✅ Funcionando |
| Recuperar contraseña y verificar correo | ✅ Funcionando |
| Datos de la empresa + imagen de portada | ✅ Funcionando (falta activar la nube de imágenes, ver abajo) |
| Gestión del equipo y permisos | ✅ Funcionando |
| Panel de administración general | ✅ Funcionando |
| Aislamiento de datos entre empresas | ✅ Funcionando |
| Pantalla de resumen del panel | 🟡 De momento con datos de ejemplo |
| Página de inicio pública | 🟡 Sencilla, se puede mejorar |
| Verificación de empresas ("reclamo → verificación") | ⏳ Aún no empezado |

Leyenda: ✅ listo · 🟡 a medias · ⏳ pendiente.

---
