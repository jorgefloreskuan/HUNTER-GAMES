# 🏹 HUNTER GAMES | Bóveda de Logros & IA
<img width="1911" height="953" alt="image" src="https://github.com/user-attachments/assets/9e58ba10-73f3-48f6-9375-26d0b500dc32" />
**HUNTER GAMES** es una plataforma interactiva de alto rendimiento diseñada para coleccionistas de trofeos y entusiastas de los videojuegos. El sistema permite explorar una base de datos global, gestionar el progreso de logros de forma manual y obtener recomendaciones inteligentes mediante el modelo **Google Gemini**.



## 🚀 Características Principales

* **🔍 Rastreador Global (RAWG API):** Conexión en tiempo real con una de las bases de datos más grandes del mundo para obtener detalles técnicos de miles de juegos.
* **🏆 Checklist de Logros con Progreso:** Sistema de seguimiento individual por juego. Incluye una barra de progreso dinámica que calcula el porcentaje de completado en tiempo real.
* **🌟 Recomendaciones con IA (Google Gemini):** Un motor de sugerencias avanzado que analiza el "ADN" de tus juegos favoritos para ofrecerte nuevas experiencias similares.
* **🎥 Experiencia Multimedia Inmersiva:** Cada ficha técnica incluye:
    * Reproductor de **Gameplay Trailers**.
    * Galería de **Capturas de pantalla**.
    * Descripciones detalladas y fechas de lanzamiento.
* **👤 Sistema de Perfiles Seguro:** Registro e inicio de sesión protegido con **JWT (JSON Web Tokens)** y encriptación de contraseñas con **Bcrypt**.
* **📱 Diseño "Gamer-First":** Interfaz oscura minimalista, optimizada para sesiones largas de navegación y totalmente responsiva.

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
| :--- | :--- |
| **Node.js & Express** | Arquitectura del servidor y rutas de API. |
| **MongoDB Atlas** | Almacenamiento persistente de usuarios y logros. |
| **Google Gemini AI** | Motor de inteligencia artificial para recomendaciones. |
| **Vanilla JavaScript** | Lógica del Frontend y manipulación del DOM (ES6+). |
| **CSS3 Custom** | Estilos personalizados con variables y animaciones de carga. |
| **Render** | Despliegue continuo (CI/CD) y hosting del servicio. |

## ⚙️ Variables de Entorno

Para ejecutar este proyecto localmente, crea un archivo `.env` en la raíz con las siguientes claves:

```env
PORT=10000
MONGO_URI=tu_cadena_de_mongodb_atlas
JWT_SECRET=tu_clave_secreta_para_tokens
RAWG_API_KEY=tu_api_key_de_rawg
GEMINI_API_KEY=tu_api_key_de_google_gemini
```


## 👨‍💻 Autores

**Flores Kuan Jorge Alejandro**
* [GitHub](https://github.com/jorgefloreskuan)

**Pulido Moreno Hugo Nicolas**
* [GitHub](https://github.com/chacho416)






