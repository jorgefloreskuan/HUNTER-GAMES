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

// 1. Servir archivos estáticos (CSS, JS, Imágenes)
app.use(express.static(__dirname));

// 2. CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Base de datos conectada'))
    .catch(err => console.error('🔴 Error DB:', err));

const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoritos: [{ idJuego: String, nombre: String, imagen: String }]
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Denegado' });
    try {
        const verificado = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (error) { res.status(400).json({ error: 'Token inválido' }); }
};

// --- RUTAS DE API ---
app.post('/api/registro', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);
        const nuevoUsuario = new Usuario({ username, email, password: passwordEncriptada });
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: 'Registrado' });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario || !await bcrypt.compare(password, usuario.password)) return res.status(400).json({ error: 'Inválido' });
        const token = jwt.sign({ id: usuario._id, username: usuario.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, username: usuario.username });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/favoritos', verificarToken, async (req, res) => {
    try {
        const { idJuego, nombre, imagen } = req.body;
        const usuario = await Usuario.findById(req.usuario.id);
        const index = usuario.favoritos.findIndex(f => f.idJuego === idJuego.toString());
        if (index === -1) {
            usuario.favoritos.push({ idJuego: idJuego.toString(), nombre, imagen });
            await usuario.save();
            res.json({ mensaje: '⭐ Agregado' });
        } else {
            usuario.favoritos.splice(index, 1);
            await usuario.save();
            res.json({ mensaje: '❌ Eliminado' });
        }
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/favoritos', verificarToken, async (req, res) => {
    const usuario = await Usuario.findById(req.usuario.id);
    res.json(usuario.favoritos);
});

app.get('/api/juegos', async (req, res) => {
    const b = req.query.search; 
    let url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=24`;
    if (b) url += `&search=${b}`;
    const r = await axios.get(url);
    res.json(r.data.results);
});

app.get('/api/juegos/detalles/:id', async (req, res) => {
    const id = req.params.id;
    const key = process.env.RAWG_API_KEY;
    const [det, img, log, vid] = await Promise.all([
        axios.get(`https://api.rawg.io/api/games/${id}?key=${key}`),
        axios.get(`https://api.rawg.io/api/games/${id}/screenshots?key=${key}`),
        axios.get(`https://api.rawg.io/api/games/${id}/achievements?key=${key}&page_size=100`),
        axios.get(`https://api.rawg.io/api/games/${id}/movies?key=${key}`)
    ]);
    res.json({ info: det.data, capturas: img.data.results.slice(0,6), trofeos: log.data.results, trailers: vid.data.results });
});

app.get('/api/recomendaciones/:juego', async (req, res) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`Recomienda 3 juegos similares a "${req.params.juego}". Responde solo un JSON: ["A","B","C"]`);
    const nombres = JSON.parse(result.response.text().trim().replace(/```json/g, '').replace(/```/g, ''));
    const promesas = nombres.map(n => axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${n}&page_size=1`));
    const respuestas = await Promise.all(promesas);
    res.json(respuestas.map(r => r.data.results[0]).filter(j => j !== undefined));
});

// --- RUTA PARA EL HOME (SIN ASTERISCOS) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Arrancar servidor
app.listen(PORT, () => { console.log(`🚀 Puerto ${PORT}`); });