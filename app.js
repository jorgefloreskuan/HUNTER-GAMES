 // Configuración de Rutas (Relativas para Render)
const API_URL_JUEGOS = '/api/juegos';
const API_URL_DETALLES = '/api/juegos/detalles';
const API_URL_AUTH = '/api';

// Elementos del DOM
const contenedor = document.getElementById('contenedor-juegos');
const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const modalAuth = document.getElementById('modal-auth');
const btnCerrarModal = document.getElementById('cerrar-modal');
const formAuth = document.getElementById('form-auth');
const linkCambiarModo = document.getElementById('link-cambiar-modo');
const panelUsuario = document.getElementById('panel-usuario');
const modalIA = document.getElementById('modal-ia');
const btnCerrarModalIA = document.getElementById('cerrar-modal-ia');
const contenedorRecomendaciones = document.getElementById('contenedor-recomendaciones');
const mensajeIA = document.getElementById('mensaje-ia');
const modalDetalles = document.getElementById('modal-detalles');
const btnCerrarModalDetalles = document.getElementById('cerrar-modal-detalles');
const contenidoDetalles = document.getElementById('contenido-detalles');
const modalFavoritos = document.getElementById('modal-favoritos');
const btnCerrarModalFavoritos = document.getElementById('cerrar-modal-favoritos');
const contenedorFavoritos = document.getElementById('contenedor-favoritos');

let esModoRegistro = false;

// --- FUNCIONES DE RENDERIZADO ---

function crearTarjetaJuego(juego, contenedorDestino) {
    if (!juego) return;
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-juego';
    const nombreLimpio = juego.name.replace(/'/g, "\\'"); 
    const imagenLimpia = juego.background_image || 'https://via.placeholder.com/400x225?text=Sin+Imagen';
    
    tarjeta.innerHTML = `
        <img src="${imagenLimpia}" alt="${juego.name}" style="cursor:pointer;" onclick="abrirDetalles('${juego.id}')">
        <div class="info-juego">
            <h3>${juego.name}</h3>
            <p>📅 ${juego.released || 'N/A'}</p>
            <p>⭐ ${juego.rating} / 5</p>
            <button class="btn-detalles" onclick="abrirDetalles('${juego.id}')">🔍 Ficha Completa</button>
            <button class="btn-ia" onclick="pedirRecomendacionIA('${nombreLimpio}')">🌟 Similares (IA)</button>
            <button class="btn-favorito" onclick="toggleFavorito('${juego.id}', '${nombreLimpio}', '${imagenLimpia}')">⭐ Guardar Favorito</button>
        </div>`;
    contenedorDestino.appendChild(tarjeta);
}

// --- LÓGICA DE DETALLES Y LOGROS ---

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<div class="cargando">🛰️ Rastreando datos en la galaxia...</div>';
    
    try {
        const res = await fetch(`${API_URL_DETALLES}/${id}`);
        const data = await res.json();
        
        // Sección de Video
        let vidHtml = data.trailers[0] 
            ? `<video controls width="100%" class="video-trailer" src="${data.trailers[0].data.max}"></video>` 
            : '<p class="aviso-vacio">🎥 No se encontraron trailers registrados.</p>';

        // Lógica de Logros e Inteligencia de Colecciones
        let logrosHtml = '';
        const totalLogros = data.trofeos ? data.trofeos.length : 0;

        if (totalLogros > 0) {
            logrosHtml = `
                <div class="contador-logros">🏆 Se han detectado ${totalLogros} logros disponibles</div>
                <div class="grid-logros">
                    ${data.trofeos.map(t => `
                        <div class="tarjeta-logro">
                            <img src="${t.image || 'https://via.placeholder.com/50'}" alt="Trofeo">
                            <div>
                                <h4>${t.name}</h4>
                                <p>${t.description || 'Logro secreto o sin descripción disponible.'}</p>
                            </div>
                        </div>`).join('')}
                </div>`;
        } else {
            logrosHtml = `
                <div class="aviso-coleccion">
                    <h3>⚠️ Sin logros individuales</h3>
                    <p>Este título podría ser parte de una <strong>colección o bundle</strong> (Ej: Master Chief Collection).</p>
                    <p>Prueba buscando la colección principal para ver el listado unificado.</p>
                </div>`;
        }

        contenidoDetalles.innerHTML = `
            <div class="cabecera-juego">
                <img src="${data.info.background_image}" class="img-principal">
                <div class="info-texto">
                    <h2>${data.info.name}</h2>
                    <div class="descripcion-scroll">${data.info.description}</div>
                </div>
            </div>
            <hr class="separador">
            <h3>🎥 Gameplay & Trailers</h3>
            ${vidHtml}
            <hr class="separador">
            <h3>📸 Galería de Capturas</h3>
            <div class="galeria-capturas">
                ${data.capturas.map(c => `<img src="${c.image}" class="img-galeria">`).join('')}
            </div>
            <hr class="separador">
            <h3>🏆 Registro de Logros</h3>
            ${logrosHtml}
        `;
    } catch (error) {
        console.error("Error:", error);
        contenidoDetalles.innerHTML = '<p class="error">Error al conectar con la base de datos de cacería.</p>';
    }
}

// --- LÓGICA DE FAVORITOS ---

async function toggleFavorito(idJuego, nombre, imagen) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("¡Cazador! Debes iniciar sesión para guardar favoritos.");
        modalAuth.classList.remove('oculto');
        return;
    }

    try {
        const res = await fetch(`${API_URL_AUTH}/favoritos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ idJuego, nombre, imagen })
        });
        const data = await res.json();
        alert(data.mensaje || "Bóveda actualizada.");
    } catch (error) {
        alert("Error al conectar con la base de datos.");
    }
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto');
    contenedorFavoritos.innerHTML = '<p class="cargando">Abriendo tu bóveda personal...</p>';
    
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
    });
    const favoritos = await res.json();
    
    contenedorFavoritos.innerHTML = '';
    if (favoritos.length === 0) {
        contenedorFavoritos.innerHTML = '<p class="aviso-vacio">Tu colección está vacía. ¡Empieza la cacería!</p>';
        return;
    }

    favoritos.forEach(fav => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-juego';
        tarjeta.innerHTML = `
            <img src="${fav.imagen}" onclick="abrirDetalles('${fav.idJuego}')">
            <div class="info-juego">
                <h3>${fav.nombre}</h3>
                <button class="btn-favorito" onclick="toggleFavorito('${fav.idJuego}', '${fav.nombre.replace(/'/g, "\\'")}', '${fav.imagen}'); abrirFavoritos();">❌ Eliminar</button>
            </div>`;
        contenedorFavoritos.appendChild(tarjeta);
    });
}

// --- INTELIGENCIA ARTIFICIAL (GEMINI) ---

async function pedirRecomendacionIA(nombreJuego) {
    modalIA.classList.remove('oculto');
    mensajeIA.classList.remove('oculto');
    contenedorRecomendaciones.innerHTML = '';
    
    try {
        const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(nombreJuego)}`);
        const recomendaciones = await res.json();
        
        mensajeIA.classList.add('oculto');
        recomendaciones.forEach(juego => crearTarjetaJuego(juego, contenedorRecomendaciones));
    } catch (error) {
        mensajeIA.innerHTML = "La IA está descansando... intenta de nuevo en un momento.";
    }
}

// --- SISTEMA DE USUARIOS ---

function verificarSesion() {
    const username = localStorage.getItem('username');
    if (username) {
        panelUsuario.innerHTML = `
            <button id="btn-ver-favs" class="btn-auth">⭐ Mis Favoritos</button>
            <span class="user-badge">👤 ${username}</span>
            <button id="btn-salir" class="btn-auth">Salir</button>
        `;
        document.getElementById('btn-ver-favs').onclick = abrirFavoritos;
        document.getElementById('btn-salir').onclick = () => {
            localStorage.clear();
            location.reload();
        };
    }
}

formAuth.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    const endpoint = esModoRegistro ? '/registro' : '/login';
    const body = esModoRegistro ? { username, email, password } : { email, password };

    try {
        const res = await fetch(`${API_URL_AUTH}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            location.reload();
        } else {
            alert(data.mensaje || data.error);
            if (esModoRegistro) location.reload();
        }
    } catch (error) {
        alert("Error en la autenticación.");
    }
};

// --- BÚSQUEDA Y NAVEGACIÓN ---

async function obtenerJuegos(busqueda = '') {
    contenedor.innerHTML = '<div class="cargando">Buscando presas...</div>';
    const url = busqueda ? `${API_URL_JUEGOS}?search=${busqueda}` : API_URL_JUEGOS;
    const res = await fetch(url);
    const juegos = await res.json();
    
    contenedor.innerHTML = '';
    juegos.forEach(j => crearTarjetaJuego(j, contenedor));
}

// Eventos de botones y modales
linkCambiarModo.onclick = () => {
    esModoRegistro = !esModoRegistro;
    document.getElementById('auth-username').classList.toggle('oculto');
    document.getElementById('titulo-auth').innerText = esModoRegistro ? 'Registrarse' : 'Iniciar Sesión';
    linkCambiarModo.innerText = esModoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí';
};

btnCerrarModal.onclick = () => modalAuth.classList.add('oculto');
btnCerrarModalIA.onclick = () => modalIA.classList.add('oculto');
btnCerrarModalDetalles.onclick = () => modalDetalles.classList.add('oculto');
btnCerrarModalFavoritos.onclick = () => modalFavoritos.classList.add('oculto');

btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
inputBusqueda.onkeypress = (e) => { if (e.key === 'Enter') obtenerJuegos(inputBusqueda.value); };

// Inicialización
verificarSesion();
obtenerJuegos();