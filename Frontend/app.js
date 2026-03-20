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

// --- SESIÓN ---
function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `<span class="user-badge">👤 ${u}</span><button onclick="localStorage.clear(); location.reload();" class="btn-auth">Salir</button>`;
    } else {
        panelUsuario.innerHTML = `<button id="btn-abrir-auth" class="btn-auth">Entrar / Registrarse</button>`;
        document.getElementById('btn-abrir-auth').onclick = () => modalAuth.classList.remove('oculto');
    }
}

// --- LOGROS Y PROGRESO ---
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

async function marcarLogro(id) {
    const token = localStorage.getItem('token');
    if (!token) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL_AUTH}/logros/completar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idLogro: id.toString() })
    });
    const data = await res.json();
    document.getElementById(`logro-${id}`).classList.toggle('completado', data.completado);
    actualizarBarra();
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    contenidoDetalles.innerHTML = '<div class="cargando">🛰️ Escaneando base de datos...</div>';
    
    const token = localStorage.getItem('token');
    if (token) {
        const rComp = await fetch(`${API_URL_AUTH}/logros/completados`, { headers: { 'Authorization': `Bearer ${token}` } });
        listaCompletados = await rComp.json();
    }

    try {
        const res = await fetch(`${API_URL_AUTH}/juegos/detalles/${id}`);
        const data = await res.json();
        urlSiguientePagina = data.siguientePagina;

        let logrosHtml = `
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
            </div>`;

        contenidoDetalles.innerHTML = `
            <div class="cabecera-juego"><img src="${data.info.background_image}" class="img-principal">
            <div class="info-texto"><h2>${data.info.name}</h2><div class="descripcion-scroll">${data.info.description}</div></div></div>
            <hr class="separador"><h3>🏆 Checklist de Cacería</h3>${logrosHtml}`;
        
        setTimeout(actualizarBarra, 100);
    } catch (e) { contenidoDetalles.innerHTML = "Error al cargar."; }
}

// --- IA ---
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
        </div>`;
    try {
        const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
        const sims = await res.json();
        mensajeIA.classList.add('oculto');
        sims.forEach(j => crearTarjetaJuego(j, contenedorRecomendaciones));
    } catch (e) { mensajeIA.innerHTML = "🛑 Error de conexión con la IA."; }
}

function crearTarjetaJuego(j, destino) {
    if (!j) return;
    const d = document.createElement('div');
    d.className = 'tarjeta-juego';
    const img = j.background_image || 'https://via.placeholder.com/400x225';
    d.innerHTML = `
        <img src="${img}" onclick="abrirDetalles('${j.id}')">
        <div class="info-juego">
            <h3>${j.name}</h3>
            <button class="btn-ia" onclick="pedirRecomendacionIA('${j.name.replace(/'/g, "\\'")}')">🌟 IA</button>
        </div>`;
    destino.appendChild(d);
}

// EVENTOS
formAuth.onsubmit = async (e) => {
    e.preventDefault();
    const em = document.getElementById('auth-email').value;
    const pa = document.getElementById('auth-password').value;
    const us = document.getElementById('auth-username').value;
    const res = await fetch(`${API_URL_AUTH}${esModoRegistro ? '/registro' : '/login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: us, email: em, password: pa })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        location.reload();
    } else alert("Error de acceso");
};

document.getElementById('link-cambiar-modo').onclick = () => {
    esModoRegistro = !esModoRegistro;
    document.getElementById('auth-username').classList.toggle('oculto');
};

btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
document.querySelectorAll('.cerrar').forEach(btn => btn.onclick = () => {
    modalAuth.classList.add('oculto'); modalIA.classList.add('oculto'); modalDetalles.classList.add('oculto');
});

async function obtenerJuegos(b = '') {
    const res = await fetch(b ? `/api/juegos?search=${b}` : '/api/juegos');
    const js = await res.json();
    contenedor.innerHTML = '';
    js.forEach(j => crearTarjetaJuego(j, contenedor));
}

verificarSesion();
obtenerJuegos();