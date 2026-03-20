 const API_URL = window.location.origin + '/api';

const contenedor = document.getElementById('contenedor-juegos');
const modalAuth = document.getElementById('modal-auth');
const modalDetalles = document.getElementById('modal-detalles');
const modalIA = document.getElementById('modal-ia');

function cerrarModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }

function verificarSesion() {
    const u = localStorage.getItem('username');
    const panel = document.getElementById('panel-usuario');
    if (u) {
        panel.innerHTML = `<span class="user-badge">👤 ${u}</span><button onclick="localStorage.clear();location.reload()" class="btn-auth">Salir</button>`;
    } else {
        panel.innerHTML = `<button onclick="document.getElementById('modal-auth').classList.remove('oculto')" class="btn-auth">Entrar / Registrarse</button>`;
    }
}

function crearTarjeta(j, destino) {
    if(!j) return;
    const d = document.createElement('div');
    d.className = 'tarjeta-juego';
    const n = j.name.replace(/'/g, "\\'");
    d.innerHTML = `
        <img src="${j.background_image || 'https://via.placeholder.com/400x225'}" onclick="abrirDetalles('${j.id}')">
        <div class="info-juego">
            <h3>${j.name}</h3>
            <div class="botones-grid">
                <button class="btn-ia" onclick="pedirIA('${n}')">🌟 IA</button>
                <button class="btn-favorito">⭐</button>
            </div>
        </div>`;
    destino.appendChild(d);
}

async function obtenerJuegos(s = '') {
    contenedor.innerHTML = 'Cazando...';
    const res = await fetch(`${API_URL}/juegos${s ? '?search='+s : ''}`);
    const data = await res.json();
    contenedor.innerHTML = '';
    data.forEach(j => crearTarjeta(j, contenedor));
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    const cont = document.getElementById('contenido-detalles');
    cont.innerHTML = 'Cargando...';
    const res = await fetch(`${API_URL}/juegos/detalles/${id}`);
    const d = await res.json();
    cont.innerHTML = `
        <div class="cabecera-juego"><img src="${d.info.background_image}" class="img-principal">
        <div><h2>${d.info.name}</h2><p>${d.info.description.substring(0,200)}...</p></div></div>
        <div class="progreso-contenedor"><div class="progreso-texto" id="txt-p">0%</div><div class="progreso-barra" id="bar-p"></div></div>
        <div class="grid-logros">
            ${d.trofeos.map(t => `<div class="tarjeta-logro" onclick="this.classList.toggle('completado');actBarra()"><img src="${t.image || 'https://via.placeholder.com/50'}"><h4>${t.name}</h4></div>`).join('')}
        </div>`;
}

function actBarra() {
    const t = document.querySelectorAll('.tarjeta-logro').length;
    const h = document.querySelectorAll('.tarjeta-logro.completado').length;
    const p = Math.round((h/t)*100);
    document.getElementById('bar-p').style.width = p+'%';
    document.getElementById('txt-p').innerText = p+'%';
}

async function pedirIA(n) {
    modalIA.classList.remove('oculto');
    const msg = document.getElementById('mensaje-ia');
    const list = document.getElementById('contenedor-recomendaciones');
    list.innerHTML = '';
    msg.innerHTML = `<div class="rastreo-ia-contenedor"><div class="rastreo-ia-icono">🛰️</div><h3>Buscando...</h3><div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div></div>`;
    const res = await fetch(`${API_URL}/recomendaciones/${encodeURIComponent(n)}`);
    const juegos = await res.json();
    msg.innerHTML = '';
    juegos.forEach(j => crearTarjeta(j, list));
}

document.getElementById('btn-buscar').onclick = () => obtenerJuegos(document.getElementById('input-busqueda').value);
document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({email:document.getElementById('auth-email').value, password:document.getElementById('auth-password').value})
    });
    const data = await res.json();
    if(data.token) { localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); location.reload(); }
};

verificarSesion(); obtenerJuegos();