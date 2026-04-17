const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 DB Conectada'))
    .catch(err => console.error('🔴 Error DB:', err));

const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoritos: [{ idJuego: String, nombre: String, imagen: String }],
    logrosCompletados: [String] 
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Acceso denegado. Inicia sesión.' });
    try {
        const verificado = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (error) { 
        res.status(401).json({ error: 'Sesión expirada o inválida' }); 
    }
};

app.post('/api/logros/completar', verificarToken, async (req, res) => {
    try {
        const { idLogro } = req.body;
        const usuario = await Usuario.findById(req.usuario.id);
        
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });

        const index = usuario.logrosCompletados.indexOf(idLogro.toString());
        
        if (index === -1) {
            usuario.logrosCompletados.push(idLogro.toString());
            await usuario.save();
            res.json({ mensaje: '🏆 ¡Logro desbloqueado!', completado: true });
        } else {
            usuario.logrosCompletados.splice(index, 1);
            await usuario.save();
            res.json({ mensaje: '🔄 Logro marcado como pendiente.', completado: false });
        }
    } catch (error) { res.status(500).json({ error: 'Error al actualizar logro.' }); }
});

app.get('/api/logros/completados', verificarToken, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) return res.json([]);
        res.json(usuario.logrosCompletados);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar progreso.' });
    }
});

app.get('/api/juegos/detalles/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const key = process.env.RAWG_API_KEY;
        const [det, img, vid, log] = await Promise.all([
            axios.get(`https://api.rawg.io/api/games/${id}?key=${key}`),
            axios.get(`https://api.rawg.io/api/games/${id}/screenshots?key=${key}`),
            axios.get(`https://api.rawg.io/api/games/${id}/movies?key=${key}`),
            axios.get(`https://api.rawg.io/api/games/${id}/achievements?key=${key}&page_size=40`)
        ]);
        res.json({ info: det.data, capturas: img.data.results.slice(0, 6), trailers: vid.data.results, trofeos: log.data.results, siguientePagina: log.data.next });
    } catch (e) { 
        res.status(500).json({ error: 'Error al conectar con la API de juegos' }); 
    }
});

app.get('/api/juegos/logros-mas', async (req, res) => {
    try {
        const r = await axios.get(req.query.url);
        res.json({ trofeos: r.data.results, siguientePagina: r.data.next });
    } catch (e) {
        res.status(500).json({ error: 'Error al cargar más logros' });
    }
});

app.post('/api/registro', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const user = new Usuario({ username, email, password: hash });
        await user.save();
        
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
        res.json({ token, username: user.username, mensaje: 'Registrado' });
    } catch (e) {
        res.status(400).json({ error: 'El usuario o el correo ya están en uso' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const user = await Usuario.findOne({ email: req.body.email });
        if (!user || !await bcrypt.compare(req.body.password, user.password)) {
            return res.status(400).json({ error: 'Credenciales incorrectas' });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
        res.json({ token, username: user.username });
    } catch (e) {
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
});

app.post('/api/favoritos', verificarToken, async (req, res) => {
    try {
        const { idJuego, nombre, imagen } = req.body;
        const user = await Usuario.findById(req.usuario.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Tu usuario ya no existe en la base de datos. Inicia sesión de nuevo.' });
        }

        const idx = user.favoritos.findIndex(f => f.idJuego === idJuego);
        if (idx === -1) user.favoritos.push({ idJuego, nombre, imagen });
        else user.favoritos.splice(idx, 1);
        
        await user.save();
        res.json({ mensaje: '⭐ Bóveda actualizada' });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar el favorito' });
    }
});

app.get('/api/favoritos', verificarToken, async (req, res) => {
    try {
        const user = await Usuario.findById(req.usuario.id);
        if (!user) return res.json([]);
        res.json(user.favoritos);
    } catch (e) {
        res.status(500).json({ error: 'Error al cargar favoritos' });
    }
});

app.get('/api/juegos', async (req, res) => {
    try {
        const b = req.query.search;
        const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=24${b ? '&search='+b : ''}`;
        const r = await axios.get(url);
        res.json(r.data.results);
    } catch (e) {
        res.status(500).json({ error: 'Error obteniendo catálogo de RAWG' });
    }
});

// RUTA DE IA CON EL MODELO ORIGINAL GEMINI 2.5 FLASH RESTAURADO
app.get('/api/recomendaciones/:juego', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Falta la API Key de Gemini en el servidor.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // SOLUCIÓN: Usamos gemini-2.5-flash que es el que tu librería reconoce
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
        
        console.log(`Pidiendo recomendación para: ${req.params.juego}...`);
        
        const result = await model.generateContent(`Recomienda 3 juegos similares a "${req.params.juego}". El formato debe ser un arreglo estricto de strings, por ejemplo: ["Juego 1", "Juego 2", "Juego 3"]`);
        
        const textoRespuesta = result.response.text();
        console.log("Respuesta cruda de Gemini:", textoRespuesta);
        
        const nombres = JSON.parse(textoRespuesta);
        
        const promesas = nombres.map(n => axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${n}&page_size=1`));
        const respuestas = await Promise.all(promesas);
        
        const juegosValidos = respuestas.map(r => r.data.results[0]).filter(j => j !== undefined);
        res.json(juegosValidos);

    } catch (e) {
        console.error("Error crítico en ruta IA:", e);
        res.status(500).json({ error: 'Fallo interno al consultar la Inteligencia Artificial.' });
    }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Puerto ${PORT}`); });