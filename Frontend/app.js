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
        panel.innerHTML = `<span style="font-size:0.9rem; margin-right:10px;">👤 ${u}</span><button onclick="localStorage.clear();location.reload()" class="btn-auth">Salir</button>`;
    } else {
        panel.innerHTML = `<button onclick="document.getElementById('modal-auth').classList.remove('oculto')" class="btn-auth">Entrar</button>`;
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
                <button class="btn-ia" onclick="pedirIA('${n}')">🌟 Similares</button>
                <button class="btn-favorito" onclick="toggleFav('${j.id}','${n}','${j.background_image}')">⭐</button>
            </div>
        </div>`;
    destino.appendChild(d);
}

async function obtenerJuegos(s = '') {
    contenedor.innerHTML = '<p>Buscando...</p>';
    const res = await fetch(`${API_URL}/juegos${s ? '?search='+s : ''}`);
    const data = await res.json();
    contenedor.innerHTML = '';
    data.forEach(j => crearTarjeta(j, contenedor));
}

async function abrirDetalles(id) {
    modalDetalles.classList.remove('oculto');
    const cont = document.getElementById('contenido-detalles');
    cont.innerHTML = 'Cargando...';
    
    const token = localStorage.getItem('token');
    let completados = [];
    if (token) {
        const r = await fetch(`${API_URL}/logros/completados`, { headers: {'Authorization': `Bearer ${token}`} });
        completados = await r.json();
    }

    const res = await fetch(`${API_URL}/juegos/detalles/${id}`);
    const d = await res.json();
    cont.innerHTML = `
        <div style="display:flex; gap:20px; margin-bottom:20px;">
            <img src="${d.info.background_image}" style="width:200px; border-radius:8px;">
            <div><h2 style="color:var(--primary); margin:0;">${d.info.name}</h2><p style="font-size:0.9rem; color:#888;">${d.info.description.substring(0,250)}...</p></div>
        </div>
        <div class="progreso-contenedor"><div class="progreso-texto" id="txt-p">0% COMPLETADO</div><div class="progreso-barra" id="bar-p"></div></div>
        <div class="grid-logros">
            ${d.trofeos.map(t => `<div class="tarjeta-logro ${completados.includes(t.id.toString()) ? 'completado' : ''}" id="logro-${t.id}" onclick="marcarLogro('${t.id}')">
                <img src="${t.image || 'https://via.placeholder.com/50'}"><h4>${t.name}</h4></div>`).join('')}
        </div>`;
    actBarra();
}

function actBarra() {
    const t = document.querySelectorAll('.tarjeta-logro').length;
    const h = document.querySelectorAll('.tarjeta-logro.completado').length;
    if(t === 0) return;
    const p = Math.round((h/t)*100);
    document.getElementById('bar-p').style.width = p+'%';
    document.getElementById('txt-p').innerText = p+'% COMPLETADO';
}

async function marcarLogro(id) {
    const token = localStorage.getItem('token');
    if(!token) return document.getElementById('modal-auth').classList.remove('oculto');
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
    msg.innerHTML = `<div style="text-align:center;"><p>Consultando IA...</p><div class="rastreo-ia-barra"><div class="rastreo-ia-llenado"></div></div></div>`;
    const res = await fetch(`${API_URL}/recomendaciones/${encodeURIComponent(n)}`);
    const juegos = await res.json();
    msg.innerHTML = '';
    juegos.forEach(j => crearTarjeta(j, list));
}

document.getElementById('btn-buscar').onclick = () => obtenerJuegos(document.getElementById('input-busqueda').value);

verificarSesion(); obtenerJuegos();