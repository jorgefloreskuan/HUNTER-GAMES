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
const contenedorRecomendaciones = document.getElementById('contenedor-recommendaciones');
const mensajeIA = document.getElementById('mensaje-ia');
const modalDetalles = document.getElementById('modal-detalles');
const btnCerrarModalDetalles = document.getElementById('cerrar-modal-detalles');
const contenidoDetalles = document.getElementById('contenido-detalles');
const modalFavoritos = document.getElementById('modal-favoritos');
const btnCerrarModalFavoritos = document.getElementById('cerrar-modal-favoritos');
const contenedorFavoritos = document.getElementById('contenedor-favoritos');

let esModoRegistro = false;
let urlSiguientePagina = null;
let logrosCargadosActuales = 0;
let listaCompletados = []; // Aquí guardaremos lo que viene de la DB

async function cargarListaCompletados() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_URL_AUTH}/logros/completados`, { headers: { 'Authorization': `Bearer ${token}` } });
    listaCompletados = await res.json();
}

function crearTarjetaJuego(juego, contenedorDestino) {
    if (!juego) return;
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-juego';
    const nombreLimpio = juego.name.replace(/'/g, "\\'"); 
    const imagenLimpia = juego.background_image || 'https://via.placeholder.com/400x225?text=Sin+Imagen';
    tarjeta.innerHTML = `
        <img src="${imagenLimpia}" onclick="abrirDetalles('${juego.id}')">
        <div class="info-juego">
            <h3>${juego.name}</h3>
            <button class="btn-detalles" onclick="abrirDetalles('${juego.id}')">🔍 Ficha</button>
            <button class="btn-ia" onclick="pedirRecomendacionIA('${nombreLimpio}')">🌟 IA</button>
            <button class="btn-favorito" onclick="toggleFavorito('${juego.id}', '${nombreLimpio}', '${imagenLimpia}')">⭐ Favorito</button>
        </div>`;
    contenedorDestino.appendChild(tarjeta);
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<div class="cargando">Cargando...</div>';
    await cargarListaCompletados();
    
    try {
        const res = await fetch(`${API_URL_DETALLES}/${id}`);
        const data = await res.json();
        urlSiguientePagina = data.siguientePagina;
        logrosCargadosActuales = data.trofeos.length;

        let vidHtml = data.trailers[0] ? `<video controls width="100%" class="video-trailer" src="${data.trailers[0].data.max}"></video>` : '<p class="aviso-vacio">🎥 Sin trailers.</p>';

        let logrosHtml = '';
        if (data.trofeos.length > 0) {
            logrosHtml = `
                <div class="contador-logros-contenedor">
                    🏆 <span id="contador-texto">Cargados: ${logrosCargadosActuales}</span>
                </div>
                <div id="contenedor-logros-lista" class="grid-logros">
                    ${data.trofeos.map(t => {
                        const estaCompletado = listaCompletados.includes(t.id.toString());
                        return `
                        <div class="tarjeta-logro ${estaCompletado ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                            <img src="${t.image || 'https://via.placeholder.com/50'}">
                            <div><h4>${t.name}</h4><p>${t.description || ''}</p></div>
                        </div>`;
                    }).join('')}
                </div>
                ${urlSiguientePagina ? '<button id="btn-ver-mas-logros" class="btn-ia" style="width:100%;" onclick="cargarMasLogros()">📥 Cargar más...</button>' : ''}`;
        } else {
            logrosHtml = '<div class="aviso-coleccion"><h3>⚠️ Sin logros</h3><p>Prueba con la colección principal.</p></div>';
        }

        contenidoDetalles.innerHTML = `
            <div class="cabecera-juego"><img src="${data.info.background_image}" class="img-principal">
            <div class="info-texto"><h2>${data.info.name}</h2><div class="descripcion-scroll">${data.info.description}</div></div></div>
            <hr class="separador"><h3>🎥 Gameplay</h3>${vidHtml}
            <hr class="separador"><h3>📸 Galería</h3><div class="galeria-capturas">${data.capturas.map(c => `<img src="${c.image}" class="img-galeria">`).join('')}</div>
            <hr class="separador"><h3>🏆 Checklist de Logros</h3>${logrosHtml}`;
    } catch (e) { console.error(e); }
}

async function marcarLogro(idLogro) {
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión para marcar logros.");

    const res = await fetch(`${API_URL_AUTH}/logros/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idLogro })
    });
    const data = await res.json();
    const elemento = document.getElementById(`logro-${idLogro}`);
    if (data.completado) elemento.classList.add('completado');
    else elemento.classList.remove('completado');
}

async function cargarMasLogros() {
    const btn = document.getElementById('btn-ver-mas-logros');
    btn.innerText = "⏳...";
    const res = await fetch(`/api/juegos/logros-mas?url=${encodeURIComponent(urlSiguientePagina)}`);
    const data = await res.json();
    urlSiguientePagina = data.siguientePagina;
    logrosCargadosActuales += data.trofeos.length;
    document.getElementById('contador-texto').innerText = `Cargados: ${logrosCargadosActuales}`;
    
    const lista = document.getElementById('contenedor-logros-lista');
    data.trofeos.forEach(t => {
        const estaCompletado = listaCompletados.includes(t.id.toString());
        const div = document.createElement('div');
        div.className = `tarjeta-logro ${estaCompletado ? 'completado' : ''}`;
        div.id = `logro-${t.id}`;
        div.onclick = () => marcarLogro(t.id);
        div.innerHTML = `<img src="${t.image || 'https://via.placeholder.com/50'}"><div><h4>${t.name}</h4><p>${t.description || ''}</p></div>`;
        lista.appendChild(div);
    });
    if (!urlSiguientePagina) btn.remove(); else btn.innerText = "📥 Cargar más...";
}

async function toggleFavorito(id, n, i) {
    const token = localStorage.getItem('token');
    if (!token) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ idJuego: id, nombre: n, imagen: i }) });
    const data = await res.json(); alert(data.mensaje);
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto'); contenedorFavoritos.innerHTML = '...';
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const favs = await res.json(); contenedorFavoritos.innerHTML = '';
    favs.forEach(f => {
        const d = document.createElement('div'); d.className = 'tarjeta-juego';
        d.innerHTML = `<img src="${f.imagen}" onclick="abrirDetalles('${f.idJuego}')"><h3>${f.nombre}</h3><button onclick="toggleFavorito('${f.idJuego}', '${f.nombre}', '${f.imagen}'); abrirFavoritos();">❌</button>`;
        contenedorFavoritos.appendChild(d);
    });
}

async function pedirRecomendacionIA(n) {
    modalIA.classList.remove('oculto'); mensajeIA.classList.remove('oculto'); contenedorRecomendaciones.innerHTML = '';
    const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
    const sims = await res.json(); mensajeIA.classList.add('oculto');
    sims.forEach(j => crearTarjetaJuego(j, contenedorRecomendaciones));
}

function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `<button id="btn-f" class="btn-auth">⭐ Favs</button><span class="user-badge">👤 ${u}</span><button onclick="localStorage.clear(); location.reload();" class="btn-auth">Salir</button>`;
        document.getElementById('btn-f').onclick = abrirFavoritos;
    }
}

formAuth.onsubmit = async (e) => {
    e.preventDefault();
    const em = document.getElementById('auth-email').value; const pa = document.getElementById('auth-password').value; const us = document.getElementById('auth-username').value;
    const res = await fetch(`${API_URL_AUTH}${esModoRegistro ? '/registro' : '/login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: us, email: em, password: pa }) });
    const data = await res.json();
    if (data.token) { localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); location.reload(); } else alert("Error");
};

async function obtenerJuegos(b = '') {
    contenedor.innerHTML = 'Cazando...';
    const res = await fetch(b ? `${API_URL_JUEGOS}?search=${b}` : API_URL_JUEGOS);
    const js = await res.json(); contenedor.innerHTML = '';
    js.forEach(j => crearTarjetaJuego(j, contenedor));
}

linkCambiarModo.onclick = () => { esModoRegistro = !esModoRegistro; document.getElementById('auth-username').classList.toggle('oculto'); };
btnCerrarModal.onclick = () => modalAuth.classList.add('oculto');
btnCerrarModalIA.onclick = () => modalIA.classList.add('oculto');
btnCerrarModalDetalles.onclick = () => modalDetalles.classList.add('oculto');
btnCerrarModalFavoritos.onclick = () => modalFavoritos.classList.add('oculto');
btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
inputBusqueda.onkeypress = (e) => { if (e.key === 'Enter') obtenerJuegos(inputBusqueda.value); };

verificarSesion(); obtenerJuegos();