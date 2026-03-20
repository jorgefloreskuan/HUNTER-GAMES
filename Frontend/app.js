 const API_URL = window.location.origin + '/api';

const contenedor = document.getElementById('contenedor-juegos');
const modalAuth = document.getElementById('modal-auth');
const modalDetalles = document.getElementById('modal-detalles');
const modalIA = document.getElementById('modal-ia');

let esModoRegistro = false;

function cerrarModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }

// --- MENSAJE DE BIENVENIDA Y SESIÓN ---
function verificarSesion() {
    const u = localStorage.getItem('username');
    const panel = document.getElementById('panel-usuario');
    if (u) {
        panel.innerHTML = `
            <span class="user-badge">Bienvenido, ${u} 🏆</span>
            <button onclick="localStorage.clear();location.reload()" class="btn-auth">Salir</button>
        `;
    } else {
        panel.innerHTML = `<button onclick="document.getElementById('modal-auth').classList.remove('oculto')" class="btn-auth">Iniciar Sesión</button>`;
    }
}

function crearTarjeta(j, destino) {
    if(!j) return;
    const d = document.createElement('div');
    d.className = 'tarjeta-juego';
    const n = j.name.replace(/'/g, "\\'");
    const img = j.background_image || 'https://via.placeholder.com/400x225';
    d.innerHTML = `
        <img src="${img}" onclick="abrirDetalles('${j.id}')">
        <div class="info-juego">
            <h3>${j.name}</h3>
            <div class="botones-grid">
                <button class="btn-ia" onclick="pedirIA('${n}')">🌟 Similares</button>
                <button class="btn-favorito">⭐</button>
            </div>
        </div>`;
    destino.appendChild(d);
}

// --- FICHA TÉCNICA COMPLETA (VIDEO, FOTOS, LOGROS) ---
async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    const cont = document.getElementById('contenido-detalles');
    cont.innerHTML = '<p>🛰️ Extrayendo datos de la colección...</p>';
    
    const token = localStorage.getItem('token');
    let completados = [];
    if (token) {
        const rLogros = await fetch(`${API_URL}/logros/completados`, { headers: {'Authorization': `Bearer ${token}`} });
        completados = await rLogros.json();
    }

    const res = await fetch(`${API_URL}/juegos/detalles/${id}`);
    const d = await res.json();

    // Galería y Video
    const video = d.trailers && d.trailers[0] ? `<video controls src="${d.trailers[0].data.max}" style="width:100%; border-radius:10px; margin:20px 0;"></video>` : '';
    const capturas = d.capturas ? `<div class="galeria-grid">${d.capturas.map(c => `<img src="${c.image}">`).join('')}</div>` : '';

    cont.innerHTML = `
        <div class="header-detalles">
            <img src="${d.info.background_image}" class="img-header">
            <div class="texto-header">
                <h2>${d.info.name}</h2>
                <p>${d.info.description.substring(0, 350)}...</p>
            </div>
        </div>
        
        ${video}
        <h3>📸 Capturas de Pantalla</h3>
        ${capturas}

        <hr>
        <h3>🏆 Colección de Logros</h3>
        <div class="progreso-contenedor">
            <div class="progreso-texto" id="txt-p">0% COMPLETADO</div>
            <div class="progreso-barra" id="bar-p"></div>
        </div>

        <div class="grid-logros">
            ${d.trofeos.map(t => `
                <div class="tarjeta-logro ${completados.includes(t.id.toString()) ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                    <img src="${t.image || 'https://via.placeholder.com/50'}">
                    <div>
                        <h4>${t.name}</h4>
                        <p style="font-size:0.7rem; color:#666;">${t.description || 'Logro secreto'}</p>
                    </div>
                </div>`).join('')}
        </div>`;
    
    setTimeout(actBarra, 100);
}

function actBarra() {
    const t = document.querySelectorAll('.tarjeta-logro').length;
    const h = document.querySelectorAll('.tarjeta-logro.completado').length;
    if(t === 0) return;
    const p = Math.round((h/t)*100);
    document.getElementById('bar-p').style.width = p+'%';
    document.getElementById('txt-p').innerText = `${p}% COMPLETADO (${h}/${t})`;
}

async function marcarLogro(id) {
    const token = localStorage.getItem('token');
    if(!token) return modalAuth.classList.remove('oculto');
    const res = await fetch(`${API_URL}/logros/completar`, {
        method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({idLogro: id.toString()})
    });
    const data = await res.json();
    document.getElementById(`logro-${id}`).classList.toggle('completado', data.completado);
    actBarra();
}

async function pedirIA(n) {
    modalIA.classList.remove('oculto');
    const list = document.getElementById('contenedor-recomendaciones');
    const msg = document.getElementById('mensaje-ia');
    list.innerHTML = '';
    msg.innerHTML = `<div style="text-align:center;"><p>Géminis analizando patrones para: <strong>${n}</strong></p><div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div></div>`;
    const res = await fetch(`${API_URL}/recomendaciones/${encodeURIComponent(n)}`);
    const juegos = await res.json();
    msg.innerHTML = '';
    juegos.forEach(j => crearTarjeta(j, list));
}

// BUSCADOR Y LOGIN LÓGICA
document.getElementById('btn-buscar').onclick = () => obtenerJuegos(document.getElementById('input-busqueda').value);

async function obtenerJuegos(s = '') {
    contenedor.innerHTML = '<p>Buscando en la base de datos...</p>';
    const res = await fetch(`${API_URL}/juegos${s ? '?search='+s : ''}`);
    const data = await res.json();
    contenedor.innerHTML = '';
    data.forEach(j => crearTarjeta(j, contenedor));
}

document.getElementById('link-cambiar-modo').onclick = () => {
    esModoRegistro = !esModoRegistro;
    document.getElementById('auth-username').classList.toggle('oculto');
    document.getElementById('titulo-auth').innerText = esModoRegistro ? 'Registro de Cazador' : 'Acceso al Sistema';
};

document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const endpoint = esModoRegistro ? '/registro' : '/login';
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            username: document.getElementById('auth-username').value,
            email: document.getElementById('auth-email').value,
            password: document.getElementById('auth-password').value
        })
    });
    const data = await res.json();
    if(data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        location.reload();
    } else if(esModoRegistro) {
        alert("¡Registro completado! Ahora inicia sesión.");
        location.reload();
    }
};

verificarSesion(); obtenerJuegos();