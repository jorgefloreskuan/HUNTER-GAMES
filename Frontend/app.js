const API_URL_JUEGOS = 'http://localhost:3000/api/juegos';
const API_URL_DETALLES = 'http://localhost:3000/api/juegos/detalles';
const API_URL_AUTH = 'http://localhost:3000/api';

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

// --- FUNCIÓN PARA CREAR TARJETAS ---
function crearTarjetaJuego(juego, contenedorDestino) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-juego';
    let plataformas = juego.parent_platforms ? juego.parent_platforms.map(p => p.platform.name).join(', ') : "Desconocido";
    
    // Limpiamos comillas simples del nombre para que no rompa el código JavaScript
    const nombreLimpio = juego.name.replace(/'/g, "\\'"); 
    const imagenLimpia = juego.background_image || 'https://via.placeholder.com/300x200';

    tarjeta.innerHTML = `
        <img src="${imagenLimpia}" alt="${juego.name}" style="cursor:pointer;" onclick="abrirDetalles('${juego.id}')">
        <div class="info-juego">
            <h3>${juego.name}</h3>
            <p>📅 ${juego.released || 'N/A'}</p>
            <p>⭐ ${juego.rating} / 5</p>
            <button class="btn-detalles" onclick="abrirDetalles('${juego.id}')">🔍 Ficha Completa</button>
            <button class="btn-ia" onclick="pedirRecomendacionIA('${nombreLimpio}')">🌟 Similares (IA)</button>
            <button class="btn-favorito" onclick="toggleFavorito('${juego.id}', '${nombreLimpio}', '${imagenLimpia}')">⭐ Guardar Favorito</button>
        </div>
    `;
    contenedorDestino.appendChild(tarjeta);
}

// --- LÓGICA DE FAVORITOS ---
async function toggleFavorito(idJuego, nombre, imagen) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("¡Alto ahí, cazador! Necesitas iniciar sesión para guardar trofeos.");
        modalAuth.classList.remove('oculto');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL_AUTH}/favoritos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ idJuego, nombre, imagen })
        });
        const data = await respuesta.json();
        alert(data.mensaje);
    } catch (error) { console.error("Error al guardar:", error); }
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto');
    contenedorFavoritos.innerHTML = '<p class="cargando">Abriendo tu bóveda de trofeos...</p>';
    const token = localStorage.getItem('token');

    try {
        const respuesta = await fetch(`${API_URL_AUTH}/favoritos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const favoritos = await respuesta.json();
        
        contenedorFavoritos.innerHTML = '';
        if (favoritos.length === 0) return contenedorFavoritos.innerHTML = '<p>Tu colección está vacía. ¡Ve a cazar algunos juegos!</p>';

        // Reciclamos la estructura de tarjeta para mostrar los favoritos guardados
        favoritos.forEach(fav => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-juego';
            tarjeta.innerHTML = `
                <img src="${fav.imagen}" alt="${fav.nombre}" style="cursor:pointer;" onclick="abrirDetalles('${fav.idJuego}')">
                <div class="info-juego">
                    <h3>${fav.nombre}</h3>
                    <button class="btn-detalles" onclick="abrirDetalles('${fav.idJuego}')">🔍 Ver Ficha</button>
                    <button class="btn-favorito" onclick="toggleFavorito('${fav.idJuego}', '${fav.nombre.replace(/'/g, "\\'")}', '${fav.imagen}'); abrirFavoritos();">❌ Quitar</button>
                </div>
            `;
            contenedorFavoritos.appendChild(tarjeta);
        });
    } catch (error) { contenedorFavoritos.innerHTML = '<p>Error al cargar tu colección.</p>'; }
}

btnCerrarModalFavoritos.addEventListener('click', () => modalFavoritos.classList.add('oculto'));

// --- DETALLES DE JUEGO ---
async function abrirDetalles(idJuego) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<p class="cargando">Descargando información clasificada, videos y logros...</p>';
    try {
        const respuesta = await fetch(`${API_URL_DETALLES}/${idJuego}`);
        const data = await respuesta.json();
        let htmlVideo = `<hr><h3>🎥 Trailer / Gameplay</h3>`;
        if (data.trailers && data.trailers.length > 0) {
            htmlVideo += `<video controls width="100%" style="border-radius: 12px; margin-bottom: 20px;" poster="${data.trailers[0].preview}"><source src="${data.trailers[0].data.max}" type="video/mp4"></video>`;
        } else {
            htmlVideo += `<div style="background-color: #2b2b2b; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: #aaaaaa; border: 1px dashed #555;"><p>🚫 RAWG no tiene ningún video público registrado para esta presa.</p></div>`;
        }
        let htmlDetalles = `
            <div class="cabecera-juego">
                <img src="${data.info.background_image}" alt="Portada">
                <div class="info-texto-juego"><h2>${data.info.name}</h2><p><strong>Desarrolladora:</strong> ${data.info.developers && data.info.developers[0] ? data.info.developers[0].name : 'Desconocido'}</p><div class="descripcion-juego">${data.info.description}</div></div>
            </div>
            ${htmlVideo}
            <hr><h3>📸 Galería</h3><div class="galeria-capturas">${data.capturas.map(cap => `<img src="${cap.image}" alt="Captura">`).join('')}</div>
            <hr><h3>🏆 Logros (${data.trofeos.length})</h3><div class="grid-logros" style="max-height: 400px; overflow-y: auto;">
                ${data.trofeos.length > 0 ? data.trofeos.map(trofeo => `<div class="tarjeta-logro"><img src="${trofeo.image || 'https://via.placeholder.com/50'}"><div><h4>${trofeo.name}</h4><p>${trofeo.description || 'Oculto'}</p></div></div>`).join('') : '<p>No hay logros.</p>'}
            </div>`;
        contenidoDetalles.innerHTML = htmlDetalles;
    } catch (error) { contenidoDetalles.innerHTML = '<p class="mensaje-error">Error al cargar detalles.</p>'; }
}
btnCerrarModalDetalles.addEventListener('click', () => { modalDetalles.classList.add('oculto'); contenidoDetalles.innerHTML = ''; });

// --- LÓGICA DE JUEGOS PRINCIPAL ---
async function obtenerJuegos(busqueda = '') {
    try {
        contenedor.innerHTML = '<p class="cargando">Rastreando juegos...</p>';
        const urlFinal = busqueda ? `${API_URL_JUEGOS}?search=${busqueda}` : API_URL_JUEGOS;
        const respuesta = await fetch(urlFinal);
        const juegos = await respuesta.json();
        contenedor.innerHTML = '';
        if (juegos.length === 0) return contenedor.innerHTML = '<p>No encontramos ninguna presa.</p>';
        juegos.forEach(juego => crearTarjetaJuego(juego, contenedor));
    } catch (error) { contenedor.innerHTML = '<p>Error al cazar los juegos. Verifica tu servidor.</p>'; }
}

// --- LÓGICA DE IA ---
async function pedirRecomendacionIA(nombreJuego) {
    modalIA.classList.remove('oculto');
    contenedorRecomendaciones.innerHTML = '';
    mensajeIA.classList.remove('oculto');
    mensajeIA.textContent = `🤖 Analizando juegos similares a ${nombreJuego}...`;
    try {
        const respuesta = await fetch(`http://localhost:3000/api/recomendaciones/${encodeURIComponent(nombreJuego)}`);
        const juegosSimilares = await respuesta.json();
        mensajeIA.classList.add('oculto');
        if(juegosSimilares.error) return contenedorRecomendaciones.innerHTML = `<p>${juegosSimilares.error}</p>`;
        juegosSimilares.forEach(juego => crearTarjetaJuego(juego, contenedorRecomendaciones));
    } catch (error) { mensajeIA.textContent = '❌ Error de conexión con IA.'; }
}
btnCerrarModalIA.addEventListener('click', () => modalIA.classList.add('oculto'));

// --- LÓGICA DE USUARIOS ---
function verificarSesion() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
        panelUsuario.innerHTML = `
            <button id="btn-abrir-favoritos" class="btn-auth">⭐ Mis Favoritos</button>
            <span><strong>${username}</strong> </span>
            <button id="btn-cerrar-sesion" class="btn-auth" style="background-color: #e50914;">Salir</button>
        `;
        document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
        document.getElementById('btn-abrir-favoritos').addEventListener('click', abrirFavoritos);
    } else {
        panelUsuario.innerHTML = `<button id="btn-abrir-login" class="btn-auth">Entrar / Registrarse</button>`;
        document.getElementById('btn-abrir-login').addEventListener('click', () => modalAuth.classList.remove('oculto'));
    }
}

function cerrarSesion() { localStorage.removeItem('token'); localStorage.removeItem('username'); verificarSesion(); }

linkCambiarModo.addEventListener('click', (e) => {
    e.preventDefault();
    esModoRegistro = !esModoRegistro;
    document.getElementById('titulo-auth').textContent = esModoRegistro ? 'Nuevo Cazador' : 'Iniciar Sesión';
    document.getElementById('btn-submit-auth').textContent = esModoRegistro ? 'Registrarse' : 'Entrar';
    document.getElementById('auth-username').classList.toggle('oculto', !esModoRegistro);
});

formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bodyData = { email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value };
    if (esModoRegistro) bodyData.username = document.getElementById('auth-username').value;
    try {
        const respuesta = await fetch(API_URL_AUTH + (esModoRegistro ? '/registro' : '/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
        const data = await respuesta.json();
        if (!esModoRegistro && data.token) { localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); modalAuth.classList.add('oculto'); verificarSesion(); }
        else if (esModoRegistro && !data.error) { linkCambiarModo.click(); }
    } catch (error) { console.error("Error", error); }
});

btnCerrarModal.addEventListener('click', () => modalAuth.classList.add('oculto'));
btnBuscar.addEventListener('click', () => obtenerJuegos(inputBusqueda.value));
inputBusqueda.addEventListener('keypress', (e) => { if (e.key === 'Enter') obtenerJuegos(inputBusqueda.value); });

verificarSesion();
obtenerJuegos();
