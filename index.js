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
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 DB Conectada'))
    .catch(err => console.error('🔴 Error DB:', err));

const usuarioSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    favoritos: [{ idJuego: String, nombre: String, imagen: String }],
    logrosCompletados: [String]
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).send('Denegado');
    try {
        const v = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.usuario = v;
        next();
    } catch (e) { res.status(400).send('Inválido'); }
};

// RUTAS
app.get('/api/juegos', async (req, res) => {
    const s = req.query.search;
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=24${s ? '&search='+s : ''}`;
    const r = await axios.get(url);
    res.json(r.data.results);
});

app.get('/api/juegos/detalles/:id', async (req, res) => {
    const key = process.env.RAWG_API_KEY;
    const id = req.params.id;
    const [d, i, v, l] = await Promise.all([
        axios.get(`https://api.rawg.io/api/games/${id}?key=${key}`),
        axios.get(`https://api.rawg.io/api/games/${id}/screenshots?key=${key}`),
        axios.get(`https://api.rawg.io/api/games/${id}/movies?key=${key}`),
        axios.get(`https://api.rawg.io/api/games/${id}/achievements?key=${key}&page_size=40`)
    ]);
    res.json({ info: d.data, capturas: i.data.results.slice(0,6), trailers: v.data.results, trofeos: l.data.results, siguiente: l.data.next });
});

app.get('/api/recomendaciones/:juego', async (req, res) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Recomienda 3 juegos similares a "${req.params.juego}". Responde solo JSON: ["A","B","C"]`);
    const nombres = JSON.parse(result.response.text().trim().replace(/```json/g, '').replace(/```/g, ''));
    const promesas = nombres.map(n => axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${n}&page_size=1`));
    const r = await Promise.all(promesas);
    res.json(r.map(x => x.data.results[0]).filter(j => j));
});

app.post('/api/registro', async (req, res) => {
    const h = await bcrypt.hash(req.body.password, 10);
    const u = new Usuario({ ...req.body, password: h });
    await u.save();
    res.json({ m: 'OK' });
});

app.post('/api/login', async (req, res) => {
    const u = await Usuario.findOne({ email: req.body.email });
    if (!u || !await bcrypt.compare(req.body.password, u.password)) return res.status(400).send('Error');
    const t = jwt.sign({ id: u._id, username: u.username }, process.env.JWT_SECRET);
    res.json({ token: t, username: u.username });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));