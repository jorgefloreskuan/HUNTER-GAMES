const API_URL_JUEGOS = '/api/juegos';
const API_URL_DETALLES = '/api/juegos/detalles';
const API_URL_AUTH = '/api';

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

function crearTarjetaJuego(juego, contenedorDestino) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-juego';
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
        </div>`;
    contenedorDestino.appendChild(tarjeta);
}

async function toggleFavorito(idJuego, nombre, imagen) {
    const token = localStorage.getItem('token');
    if (!token) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/favoritos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idJuego, nombre, imagen })
    });
    const data = await res.json();
    alert(data.mensaje);
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto');
    contenedorFavoritos.innerHTML = '<p class="cargando">Abriendo bóveda...</p>';
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const favoritos = await res.json();
    contenedorFavoritos.innerHTML = '';
    if (favoritos.length === 0) return contenedorFavoritos.innerHTML = '<p>Vacio.</p>';
    favoritos.forEach(fav => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-juego';
        tarjeta.innerHTML = `
            <img src="${fav.imagen}" onclick="abrirDetalles('${fav.idJuego}')">
            <div class="info-juego"><h3>${fav.nombre}</h3>
            <button class="btn-favorito" onclick="toggleFavorito('${fav.idJuego}', '${fav.nombre.replace(/'/g, "\\'")}', '${fav.imagen}'); abrirFavoritos();">❌ Quitar</button></div>`;
        contenedorFavoritos.appendChild(tarjeta);
    });
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<p class="cargando">Cargando...</p>';
    const res = await fetch(`${API_URL_DETALLES}/${id}`);
    const data = await res.json();
    let vidHtml = data.trailers[0] ? `<video controls width="100%" src="${data.trailers[0].data.max}"></video>` : '<p>Sin video registrados.</p>';
    contenidoDetalles.innerHTML = `
        <div class="cabecera-juego"><img src="${data.info.background_image}"><div><h2>${data.info.name}</h2><div>${data.info.description}</div></div></div>
        ${vidHtml}<h3>📸 Galería</h3><div class="galeria-capturas">${data.capturas.map(c => `<img src="${c.image}">`).join('')}</div>
        <h3>🏆 Logros</h3><div class="grid-logros" style="max-height:300px; overflow-y:auto;">${data.trofeos.map(t => `<div class="tarjeta-logro"><img src="${t.image}"><div><h4>${t.name}</h4><p>${t.description || ''}</p></div></div>`).join('')}</div>`;
}

async function obtenerJuegos(b = '') {
    const res = await fetch(b ? `${API_URL_JUEGOS}?search=${b}` : API_URL_JUEGOS);
    const juegos = await res.json();
    contenedor.innerHTML = '';
    juegos.forEach(j => crearTarjetaJuego(j, contenedor));
}

async function pedirRecomendacionIA(n) {
    modalIA.classList.remove('oculto');
    mensajeIA.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
    const sims = await res.json();
    mensajeIA.classList.add('oculto');
    contenedorRecomendaciones.innerHTML = '';
    sims.forEach(s => crearTarjetaJuego(s, contenedorRecomendaciones));
}

function verificarSesion() {
    const user = localStorage.getItem('username');
    if (user) {
        panelUsuario.innerHTML = `<button id="btn-favs" class="btn-auth">⭐ Favoritos</button><span>${user}</span><button onclick="localStorage.clear(); location.reload();" class="btn-auth">Salir</button>`;
        document.getElementById('btn-favs').onclick = abrirFavoritos;
    }
}

formAuth.onsubmit = async (e) => {
    e.preventDefault();
    const body = { email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value };
    if (esModoRegistro) body.username = document.getElementById('auth-username').value;
    const res = await fetch(`${API_URL_AUTH}/${esModoRegistro ? 'registro' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.token) { localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); location.reload(); }
    else if (esModoRegistro) { alert("¡Registrado! Ahora inicia sesión."); location.reload(); }
};

linkCambiarModo.onclick = () => { esModoRegistro = !esModoRegistro; document.getElementById('auth-username').classList.toggle('oculto'); };
btnCerrarModal.onclick = () => modalAuth.classList.add('oculto');
btnCerrarModalIA.onclick = () => modalIA.classList.add('oculto');
btnCerrarModalDetalles.onclick = () => modalDetalles.classList.add('oculto');
btnCerrarModalFavoritos.onclick = () => modalFavoritos.classList.add('oculto');
btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
inputBusqueda.onkeypress = (e) => { if(e.key === 'Enter') obtenerJuegos(inputBusqueda.value); };

verificarSesion();
obtenerJuegos();