 const API_URL_AUTH = '/api';

const contenedor = document.getElementById('contenedor-juegos');
const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const modalAuth = document.getElementById('modal-auth');
const formAuth = document.getElementById('form-auth');
const panelUsuario = document.getElementById('panel-usuario');
const modalDetalles = document.getElementById('modal-detalles');
const contenidoDetalles = document.getElementById('contenido-detalles');
const modalIA = document.getElementById('modal-ia');
const mensajeIA = document.getElementById('mensaje-ia');
const contenedorRecomendaciones = document.getElementById('contenedor-recomendaciones');

let esModoRegistro = false;
let urlSiguientePagina = null;
let listaCompletados = [];

// --- SESIÓN Y PANEL ---
function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `
            <button id="btn-abrir-favs" class="btn-auth">⭐ Mis Favoritos</button>
            <span class="user-badge">👤 ${u}</span>
            <button onclick="localStorage.clear(); location.reload();" class="btn-auth">Salir</button>
        `;
        document.getElementById('btn-abrir-favs').onclick = abrirFavoritos;
    } else {
        panelUsuario.innerHTML = `<button id="btn-abrir-auth" class="btn-auth">Entrar / Registrarse</button>`;
        const btn = document.getElementById('btn-abrir-auth');
        if(btn) btn.onclick = () => modalAuth.classList.remove('oculto');
    }
}

// --- BARRA DE PROGRESO ---
function actualizarBarra() {
    const todos = document.querySelectorAll('.tarjeta-logro').length;
    const hechos = document.querySelectorAll('.tarjeta-logro.completado').length;
    if (todos === 0) return;
    const porc = Math.round((hechos / todos) * 100);
    const barra = document.getElementById('barra-llenado');
    const texto = document.getElementById('porcentaje-numero');
    if (barra && texto) {
        barra.style.width = porc + '%';
        texto.innerText = `${porc}% COMPLETADO (${hechos}/${todos})`;
    }
}

// --- FUNCIÓN PARA CREAR TARJETAS (CON FAVORITOS RECUPERADOS) ---
function crearTarjetaJuego(j, destino) {
    if (!j) return;
    const d = document.createElement('div');
    d.className = 'tarjeta-juego';
    const n = j.name.replace(/'/g, "\\'");
    const img = j.background_image || 'https://via.placeholder.com/400x225';
    
    d.innerHTML = `
        <img src="${img}" onclick="abrirDetalles('${j.id}')">
        <div class="info-juego">
            <h3>${j.name}</h3>
            <div class="botones-grid">
                <button class="btn-ia" onclick="pedirRecomendacionIA('${n}')">🌟 IA</button>
                <button class="btn-favorito" onclick="toggleFavorito('${j.id}', '${n}', '${img}')">⭐ Guardar</button>
            </div>
        </div>`;
    destino.appendChild(d);
}

// --- IA CON REPARACIÓN DE CARGA ---
async function pedirRecomendacionIA(n) {
    modalIA.classList.remove('oculto');
    contenedorRecomendaciones.innerHTML = ''; 
    mensajeIA.classList.remove('oculto');
    mensajeIA.innerHTML = `
        <div class="rastreo-ia-contenedor">
            <div class="rastreo-ia-icono">🛰️</div>
            <h3>Rastreador Géminis</h3>
            <p>Escaneando ADN de: <strong>${n}</strong></p>
            <div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div>
        </div>`;

    try {
        const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
        const sims = await res.json();
        
        mensajeIA.classList.add('oculto'); // Ocultar barra de carga
        mensajeIA.innerHTML = ''; // Limpiar mensaje
        
        if(sims.length > 0) {
            sims.forEach(juego => crearTarjetaJuego(juego, contenedorRecomendaciones));
        } else {
            mensajeIA.classList.remove('oculto');
            mensajeIA.innerHTML = "🌌 No hay juegos similares en este sector.";
        }
    } catch (e) {
        mensajeIA.innerHTML = "🛑 Error de conexión con la IA.";
    }
}

// --- FAVORITOS ---
async function toggleFavorito(id, n, img) {
    const t = localStorage.getItem('token');
    if (!t) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }, 
        body: JSON.stringify({ idJuego: id, nombre: n, imagen: img }) 
    });
    const data = await res.json();
    alert(data.mensaje || "Bóveda actualizada");
}

async function abrirFavoritos() {
    const modalFavs = document.getElementById('modal-favoritos');
    const contFavs = document.getElementById('contenedor-favoritos');
    modalFavs.classList.remove('oculto');
    contFavs.innerHTML = 'Cargando favoritos...';
    
    const res = await fetch(`${API_URL_AUTH}/favoritos`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
    });
    const f = await res.json();
    contFavs.innerHTML = '';
    if(f.length === 0) contFavs.innerHTML = "Tu colección está vacía.";
    f.forEach(fav => crearTarjetaJuego(fav, contFavs));
}

// --- DETALLES ---
async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = 'Cargando...';
    const token = localStorage.getItem('token');
    if (token) {
        const rComp = await fetch(`${API_URL_AUTH}/logros/completados`, { headers: { 'Authorization': `Bearer ${token}` } });
        listaCompletados = await rComp.json();
    }
    const res = await fetch(`${API_URL_AUTH}/juegos/detalles/${id}`);
    const data = await res.json();
    
    contenidoDetalles.innerHTML = `
        <div class="cabecera-juego"><img src="${data.info.background_image}" class="img-principal">
        <div class="info-texto"><h2>${data.info.name}</h2><p>${data.info.description}</p></div></div>
        <hr>
        <div class="progreso-contenedor"><div class="progreso-texto" id="porcentaje-numero">0%</div><div class="progreso-barra" id="barra-llenado"></div></div>
        <div id="contenedor-logros-lista" class="grid-logros">
            ${data.trofeos.map(t => `<div class="tarjeta-logro ${listaCompletados.includes(t.id.toString()) ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                <img src="${t.image || 'https://via.placeholder.com/50'}"><h4>${t.name}</h4></div>`).join('')}
        </div>`;
    setTimeout(actualizarBarra, 100);
}

async function marcarLogro(id) {
    const t = localStorage.getItem('token');
    if(!t) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/logros/completar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({ idLogro: id.toString() })
    });
    const data = await res.json();
    document.getElementById(`logro-${id}`).classList.toggle('completado', data.completado);
    actualizarBarra();
}

// --- INICIO ---
btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
async function obtenerJuegos(b = '') {
    const res = await fetch(b ? `/api/juegos?search=${b}` : '/api/juegos');
    const js = await res.json();
    contenedor.innerHTML = '';
    js.forEach(j => crearTarjetaJuego(j, contenedor));
}

document.querySelectorAll('.cerrar').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto'));
});

verificarSesion();
obtenerJuegos();