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
let urlSiguientePagina = null;
let logrosCargadosActuales = 0;
let listaCompletados = [];

// --- LÓGICA DE PROGRESO ---
function actualizarBarra() {
    const todos = document.querySelectorAll('.tarjeta-logro');
    const hechos = document.querySelectorAll('.tarjeta-logro.completado');
    if (todos.length === 0) return;
    const porc = Math.round((hechos.length / todos.length) * 100);
    const barra = document.getElementById('barra-llenado');
    const texto = document.getElementById('porcentaje-numero');
    if (barra && texto) {
        barra.style.width = porc + '%';
        texto.innerText = `${porc}% COMPLETADO (${hechos.length}/${todos.length})`;
    }
}

async function cargarListaCompletados() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_URL_AUTH}/logros/completados`, { headers: { 'Authorization': `Bearer ${token}` } });
    listaCompletados = await res.json();
}

function crearTarjetaJuego(juego, destino) {
    if (!juego) return;
    const d = document.createElement('div');
    d.className = 'tarjeta-juego';
    const n = juego.name.replace(/'/g, "\\'");
    const img = juego.background_image || 'https://via.placeholder.com/400x225?text=Sin+Imagen';
    d.innerHTML = `
        <img src="${img}" onclick="abrirDetalles('${juego.id}')">
        <div class="info-juego">
            <h3>${juego.name}</h3>
            <button class="btn-detalles" onclick="abrirDetalles('${juego.id}')">🔍 Ficha</button>
            <button class="btn-ia" onclick="pedirRecomendacionIA('${n}')">🌟 IA</button>
            <button class="btn-favorito" onclick="toggleFavorito('${juego.id}', '${n}', '${img}')">⭐ Favorito</button>
        </div>`;
    destino.appendChild(d);
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<div class="cargando">🛰️ Rastreando datos...</div>';
    await cargarListaCompletados();
    try {
        const res = await fetch(`${API_URL_DETALLES}/${id}`);
        const data = await res.json();
        urlSiguientePagina = data.siguientePagina;
        logrosCargadosActuales = data.trofeos.length;

        let vid = data.trailers[0] ? `<video controls width="100%" class="video-trailer" src="${data.trailers[0].data.max}"></video>` : '<p class="aviso-vacio">🎥 Sin trailers.</p>';
        let logrosHtml = '';

        if (data.trofeos.length > 0) {
            logrosHtml = `
                <div class="progreso-contenedor">
                    <div class="progreso-texto" id="porcentaje-numero">0%</div>
                    <div class="progreso-barra" id="barra-llenado"></div>
                </div>
                <div id="contenedor-logros-lista" class="grid-logros">
                    ${data.trofeos.map(t => {
                        const ok = listaCompletados.includes(t.id.toString());
                        return `<div class="tarjeta-logro ${ok ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                            <img src="${t.image || 'https://via.placeholder.com/50'}">
                            <div><h4>${t.name}</h4><p>${t.description || ''}</p></div>
                        </div>`;
                    }).join('')}
                </div>
                ${urlSiguientePagina ? '<button id="btn-ver-mas-logros" class="btn-ia" style="width:100%;" onclick="cargarMasLogros()">📥 Cargar más...</button>' : ''}`;
        } else {
            logrosHtml = '<div class="aviso-coleccion"><h3>⚠️ Sin logros</h3><p>Busca la colección principal.</p></div>';
        }

        contenidoDetalles.innerHTML = `
            <div class="cabecera-juego"><img src="${data.info.background_image}" class="img-principal">
            <div class="info-texto"><h2>${data.info.name}</h2><div class="descripcion-scroll">${data.info.description}</div></div></div>
            <hr class="separador"><h3>🎥 Gameplay</h3>${vid}
            <hr class="separador"><h3>📸 Galería</h3><div class="galeria-capturas">${data.capturas.map(c => `<img src="${c.image}" class="img-galeria">`).join('')}</div>
            <hr class="separador"><h3>🏆 Checklist</h3>${logrosHtml}`;
        setTimeout(actualizarBarra, 100);
    } catch (e) { console.error(e); }
}

async function marcarLogro(id) {
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión.");
    const res = await fetch(`${API_URL_AUTH}/logros/completar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idLogro: id })
    });
    const data = await res.json();
    document.getElementById(`logro-${id}`).classList.toggle('completado', data.completado);
    actualizarBarra();
}

async function cargarMasLogros() {
    const btn = document.getElementById('btn-ver-mas-logros');
    btn.innerText = "⏳...";
    const res = await fetch(`/api/juegos/logros-mas?url=${encodeURIComponent(urlSiguientePagina)}`);
    const data = await res.json();
    urlSiguientePagina = data.siguientePagina;
    const lista = document.getElementById('contenedor-logros-lista');
    data.trofeos.forEach(t => {
        const ok = listaCompletados.includes(t.id.toString());
        const div = document.createElement('div');
        div.className = `tarjeta-logro ${ok ? 'completado' : ''}`;
        div.id = `logro-${t.id}`;
        div.onclick = () => marcarLogro(t.id);
        div.innerHTML = `<img src="${t.image || 'https://via.placeholder.com/50'}"><div><h4>${t.name}</h4><p>${t.description || ''}</p></div>`;
        lista.appendChild(div);
    });
    if (!urlSiguientePagina) btn.remove(); else btn.innerText = "📥 Cargar más...";
    actualizarBarra();
}

// --- INTELIGENCIA ARTIFICIAL ANIMADA ---
async function pedirRecomendacionIA(n) {
    modalIA.classList.remove('oculto');
    contenedorRecomendaciones.innerHTML = '';
    mensajeIA.classList.remove('oculto');
    mensajeIA.innerHTML = `
        <div class="rastreo-ia-contenedor">
            <div class="rastreo-ia-icono">🛰️</div>
            <h3>Rastreador Géminis Activado</h3>
            <p>Escaneando el ADN de <span class="destacado">${n}</span>...</p>
            <div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div>
            <p class="aviso-ia">Gemini está "pensando". Podría tardar unos segundos.</p>
        </div>`;
    try {
        const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
        const sims = await res.json();
        mensajeIA.classList.add('oculto');
        sims.forEach(j => crearTarjetaJuego(j, contenedorRecomendaciones));
    } catch (e) {
        mensajeIA.innerHTML = "🛑 Error de conexión con la IA.";
    }
}

// --- SISTEMA BASE ---
async function toggleFavorito(id, n, img) {
    const t = localStorage.getItem('token');
    if (!t) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }, body: JSON.stringify({ idJuego: id, nombre: n, imagen: img }) });
    const data = await res.json(); alert(data.mensaje);
}

function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `<button id="btn-f" class="btn-auth">⭐ Favs</button><span class="user-badge">👤 ${u}</span><button onclick="localStorage.clear(); location.reload();" class="btn-auth">Salir</button>`;
        document.getElementById('btn-f').onclick = abrirFavoritos;
    }
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const f = await res.json();
    contenedorFavoritos.innerHTML = '';
    f.forEach(fav => crearTarjetaJuego(fav, contenedorFavoritos));
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