 const API_URL = '/api';

// Elementos Globales
const contenedor = document.getElementById('contenedor-juegos');
const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const panelUsuario = document.getElementById('panel-usuario');
const modalAuth = document.getElementById('modal-auth');
const modalDetalles = document.getElementById('modal-detalles');
const modalIA = document.getElementById('modal-ia');

let esModoRegistro = false;
let listaCompletados = [];

// --- SISTEMA DE SESIÓN ---
function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `
            <span class="user-badge">👤 ${u}</span>
            <button onclick="cerrarSesion()" class="btn-auth">Salir</button>
        `;
    } else {
        panelUsuario.innerHTML = `<button onclick="abrirLogin()" class="btn-auth">Entrar / Registrarse</button>`;
    }
}

function abrirLogin() { modalAuth.classList.remove('oculto'); }
function cerrarSesion() { localStorage.clear(); location.reload(); }
function cerrarModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }

// --- TARJETAS Y JUEGOS ---
function crearTarjeta(j, destino) {
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
                <button class="btn-ia" onclick="pedirIA('${n}')">🌟 IA</button>
                <button class="btn-favorito" onclick="toggleFav('${j.id}','${n}','${img}')">⭐</button>
            </div>
        </div>`;
    destino.appendChild(d);
}

async function obtenerJuegos(query = '') {
    contenedor.innerHTML = '<p class="cargando">Cazando juegos...</p>';
    const res = await fetch(`${API_URL}/juegos${query ? '?search='+query : ''}`);
    const datos = await res.json();
    contenedor.innerHTML = '';
    datos.forEach(j => crearTarjeta(j, contenedor));
}

// --- DETALLES Y PROGRESO ---
async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    const cont = document.getElementById('contenido-detalles');
    cont.innerHTML = 'Cargando...';

    const token = localStorage.getItem('token');
    if (token) {
        const r = await fetch(`${API_URL}/logros/completados`, { headers: {'Authorization': `Bearer ${token}`} });
        listaCompletados = await r.json();
    }

    const res = await fetch(`${API_URL}/juegos/detalles/${id}`);
    const data = await res.json();

    cont.innerHTML = `
        <div class="cabecera-juego"><img src="${data.info.background_image}" class="img-principal">
        <div><h2>${data.info.name}</h2><p>${data.info.description.substring(0,300)}...</p></div></div>
        <div class="progreso-contenedor"><div class="progreso-texto" id="porc">0%</div><div class="progreso-barra" id="barra"></div></div>
        <div class="grid-logros">
            ${data.trofeos.map(t => `
                <div class="tarjeta-logro ${listaCompletados.includes(t.id.toString()) ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                    <img src="${t.image || 'https://via.placeholder.com/50'}"><h4>${t.name}</h4>
                </div>`).join('')}
        </div>`;
    actualizarBarra();
}

function actualizarBarra() {
    const t = document.querySelectorAll('.tarjeta-logro').length;
    const h = document.querySelectorAll('.tarjeta-logro.completado').length;
    if(t>0) {
        const p = Math.round((h/t)*100);
        document.getElementById('barra').style.width = p+'%';
        document.getElementById('porc').innerText = p+'% COMPLETADO';
    }
}

async function marcarLogro(id) {
    const token = localStorage.getItem('token');
    if(!token) return abrirLogin();
    const res = await fetch(`${API_URL}/logros/completar`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({idLogro: id.toString()})
    });
    const data = await res.json();
    document.getElementById(`logro-${id}`).classList.toggle('completado', data.completado);
    actualizarBarra();
}

// --- IA ---
async function pedirIA(n) {
    modalIA.classList.remove('oculto');
    const msg = document.getElementById('mensaje-ia');
    const list = document.getElementById('contenedor-recomendaciones');
    list.innerHTML = '';
    msg.innerHTML = `<div class="rastreo-ia-contenedor"><div class="rastreo-ia-icono">🛰️</div><h3>Escaneando...</h3><div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div></div>`;
    
    try {
        const res = await fetch(`${API_URL}/recomendaciones/${encodeURIComponent(n)}`);
        const juegos = await res.json();
        msg.innerHTML = '';
        juegos.forEach(j => crearTarjeta(j, list));
    } catch(e) { msg.innerHTML = "Error de IA"; }
}

// --- INICIALIZACIÓN ---
btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
document.getElementById('link-cambiar-modo').onclick = () => {
    esModoRegistro = !esModoRegistro;
    document.getElementById('auth-username').classList.toggle('oculto');
};

document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
        username: document.getElementById('auth-username').value,
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-password').value
    };
    const res = await fetch(`${API_URL}${esModoRegistro ? '/registro' : '/login'}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
    });
    const data = await res.json();
    if(data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        location.reload();
    } else alert("Error");
};

verificarSesion();
obtenerJuegos();