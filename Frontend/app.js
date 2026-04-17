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

const btnAbrirLogin = document.getElementById('btn-abrir-login');
if (btnAbrirLogin) {
    btnAbrirLogin.onclick = () => modalAuth.classList.remove('oculto');
}

let esModoRegistro = false;
let urlSiguientePagina = null;
let logrosCargadosActuales = 0;
let listaCompletados = [];

// --- FUNCIÓN PARA CALCULAR EL PROGRESO ---
function actualizarBarra() {
    const todosLosLogrosEnDOM = document.querySelectorAll('.tarjeta-logro');
    const completadosEnDOM = document.querySelectorAll('.tarjeta-logro.completado');
    
    const total = todosLosLogrosEnDOM.length;
    const realizados = completadosEnDOM.length;
    
    if (total === 0) return;

    const porcentaje = Math.round((realizados / total) * 100);
    const barra = document.getElementById('barra-llenado');
    const texto = document.getElementById('porcentaje-numero');

    if (barra && texto) {
        barra.style.width = porcentaje + '%';
        texto.innerText = `${porcentaje}% COMPLETADO (${realizados}/${total})`;
    }
}

async function cargarListaCompletados() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL_AUTH}/logros/completados`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            listaCompletados = await res.json();
        }
    } catch (e) { console.error(e); }
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
    contenidoDetalles.innerHTML = '<div class="cargando">Abriendo base de datos...</div>';
    await cargarListaCompletados();
    
    try {
        const res = await fetch(`${API_URL_DETALLES}/${id}`);
        const data = await res.json();
        urlSiguientePagina = data.siguientePagina;

        let vidHtml = data.trailers[0] ? `<video controls width="100%" class="video-trailer" src="${data.trailers[0].data.max}"></video>` : '<p class="aviso-vacio">🎥 Sin trailers.</p>';

        let logrosHtml = '';
        if (data.trofeos.length > 0) {
            logrosHtml = `
                <div class="progreso-contenedor">
                    <div class="progreso-texto" id="porcentaje-numero">0% COMPLETADO</div>
                    <div class="progreso-barra" id="barra-llenado"></div>
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
            <hr class="separador"><h3>🏆 Checklist de Cacería</h3>${logrosHtml}`;
        
        // Calculamos la barra apenas abra
        setTimeout(actualizarBarra, 100);

    } catch (e) { 
        console.error(e); 
        contenidoDetalles.innerHTML = '<div class="error">Ups, hubo un problema de conexión al buscar la ficha.</div>';
    }
}

async function marcarLogro(idLogro) {
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión para guardar tu progreso.");

    try {
        const res = await fetch(`${API_URL_AUTH}/logros/completar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ idLogro })
        });
        const data = await res.json();
        
        if (!res.ok) {
            return alert(data.error || "Error al actualizar logro");
        }

        const elemento = document.getElementById(`logro-${idLogro}`);
        if (data.completado) elemento.classList.add('completado');
        else elemento.classList.remove('completado');

        actualizarBarra(); // ¡Actualiza la barra al hacer clic!
    } catch (e) {
        alert("Error de red");
    }
}

async function cargarMasLogros() {
    const btn = document.getElementById('btn-ver-mas-logros');
    btn.innerText = "⏳...";
    try {
        const res = await fetch(`/api/juegos/logros-mas?url=${encodeURIComponent(urlSiguientePagina)}`);
        const data = await res.json();
        urlSiguientePagina = data.siguientePagina;
        
        const lista = document.getElementById('contenedor-logros-lista');
        const fragmento = document.createDocumentFragment(); // Optimización

        data.trofeos.forEach(t => {
            const estaCompletado = listaCompletados.includes(t.id.toString());
            const div = document.createElement('div');
            div.className = `tarjeta-logro ${estaCompletado ? 'completado' : ''}`;
            div.id = `logro-${t.id}`;
            div.onclick = () => marcarLogro(t.id);
            div.innerHTML = `<img src="${t.image || 'https://via.placeholder.com/50'}"><div><h4>${t.name}</h4><p>${t.description || ''}</p></div>`;
            fragmento.appendChild(div);
        });

        lista.appendChild(fragmento);

        if (!urlSiguientePagina) btn.remove(); else btn.innerText = "📥 Cargar más...";
        
        actualizarBarra(); // Recalcula al cargar nuevos logros
    } catch (e) {
        btn.innerText = "Error, intentar de nuevo";
    }
}

async function toggleFavorito(id, n, i) {
    const token = localStorage.getItem('token');
    if (!token) return modalAuth.classList.remove('oculto');
    
    try {
        const res = await fetch(`${API_URL_AUTH}/favoritos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ idJuego: id, nombre: n, imagen: i }) 
        });
        
        const data = await res.json(); 
        
        if (res.ok) {
            alert(data.mensaje); 
        } else {
            alert(data.error || "Ocurrió un error al guardar");
            if (res.status === 401 || res.status === 404) {
                localStorage.clear();
                location.reload();
            }
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión al servidor");
    }
}

async function abrirFavoritos() {
    modalFavoritos.classList.remove('oculto'); 
    contenedorFavoritos.innerHTML = '<p class="cargando">Cargando...</p>';
    
    try {
        const res = await fetch(`${API_URL_AUTH}/favoritos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const favs = await res.json(); 
        contenedorFavoritos.innerHTML = '';
        
        if (favs.length === 0) {
            contenedorFavoritos.innerHTML = '<p style="color: #ccc; grid-column: 1/-1;">Aún no tienes favoritos.</p>';
        }

        favs.forEach(f => {
            const d = document.createElement('div'); d.className = 'tarjeta-juego';
            d.innerHTML = `<img src="${f.imagen}" onclick="abrirDetalles('${f.idJuego}')"><h3>${f.nombre}</h3><button class="btn-favorito" onclick="toggleFavorito('${f.idJuego}', '${f.nombre}', '${f.imagen}'); abrirFavoritos();">❌ Quitar</button>`;
            contenedorFavoritos.appendChild(d);
        });
    } catch (e) {
        contenedorFavoritos.innerHTML = '<p class="error">Error al cargar favoritos.</p>';
    }
}

// NUEVA FUNCIÓN DE RECOMENDACIONES IA MÁS ROBUSTA
async function pedirRecomendacionIA(n) {
    modalIA.classList.remove('oculto'); 
    mensajeIA.classList.remove('oculto'); 
    mensajeIA.innerText = "Analizando base de datos..."; 
    if(contenedorRecomendaciones) contenedorRecomendaciones.innerHTML = '';
    
    try {
        const res = await fetch(`${API_URL_AUTH}/recomendaciones/${encodeURIComponent(n)}`);
        const data = await res.json(); 
        
        if (!res.ok) {
            throw new Error(data.error || "Error desconocido en el servidor");
        }

        mensajeIA.classList.add('oculto');
        if(contenedorRecomendaciones) {
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(j => crearTarjetaJuego(j, contenedorRecomendaciones));
            } else {
                mensajeIA.classList.remove('oculto');
                mensajeIA.innerText = "La IA no encontró juegos similares.";
            }
        }
    } catch (e) {
        console.error("Error en IA Frontend:", e);
        mensajeIA.innerText = `Hubo un error: ${e.message}`;
    }
}

function verificarSesion() {
    const u = localStorage.getItem('username');
    if (u) {
        panelUsuario.innerHTML = `<button id="btn-f" class="btn-auth">⭐ Favs</button><span class="user-badge">👤 ${u}</span><button onclick="localStorage.clear(); location.reload();" class="btn-auth" id="btn-cerrar-sesion">Salir</button>`;
        document.getElementById('btn-f').onclick = abrirFavoritos;
    }
}

formAuth.onsubmit = async (e) => {
    e.preventDefault();
    const em = document.getElementById('auth-email').value; 
    const pa = document.getElementById('auth-password').value; 
    const us = document.getElementById('auth-username').value;
    
    try {
        const res = await fetch(`${API_URL_AUTH}${esModoRegistro ? '/registro' : '/login'}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ username: us, email: em, password: pa }) 
        });
        const data = await res.json();
        
        if (res.ok && data.token) { 
            localStorage.setItem('token', data.token); 
            localStorage.setItem('username', data.username); 
            location.reload(); 
        } else {
            document.getElementById('mensaje-auth').innerText = data.error || "Error al autenticar";
        }
    } catch (e) {
        document.getElementById('mensaje-auth').innerText = "Error de red";
    }
};

async function obtenerJuegos(b = '') {
    contenedor.innerHTML = '<p class="cargando">Cazando...</p>';
    try {
        const res = await fetch(b ? `${API_URL_JUEGOS}?search=${b}` : API_URL_JUEGOS);
        const js = await res.json(); 
        contenedor.innerHTML = '';
        js.forEach(j => crearTarjetaJuego(j, contenedor));
    } catch (e) {
        contenedor.innerHTML = '<p class="error">No se pudieron cargar los juegos. Verifica la conexión.</p>';
    }
}

linkCambiarModo.onclick = () => { 
    esModoRegistro = !esModoRegistro; 
    document.getElementById('auth-username').classList.toggle('oculto'); 
    document.getElementById('titulo-auth').innerText = esModoRegistro ? 'Crear Cuenta' : 'Iniciar Sesión';
    document.getElementById('btn-submit-auth').innerText = esModoRegistro ? 'Registrarse' : 'Entrar';
    document.getElementById('texto-modo').innerText = esModoRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
    document.getElementById('link-cambiar-modo').innerText = esModoRegistro ? 'Inicia sesión' : 'Regístrate aquí';
};

btnCerrarModal.onclick = () => modalAuth.classList.add('oculto');
btnCerrarModalIA.onclick = () => modalIA.classList.add('oculto');
btnCerrarModalDetalles.onclick = () => modalDetalles.classList.add('oculto');
btnCerrarModalFavoritos.onclick = () => modalFavoritos.classList.add('oculto');
btnBuscar.onclick = () => obtenerJuegos(inputBusqueda.value);
inputBusqueda.onkeypress = (e) => { if (e.key === 'Enter') obtenerJuegos(inputBusqueda.value); };

verificarSesion(); 
obtenerJuegos();