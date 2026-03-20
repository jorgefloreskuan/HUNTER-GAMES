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

// MODELO ACTUALIZADO CON LOGROS COMPLETADOS
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoritos: [{ idJuego: String, nombre: String, imagen: String }],
    logrosCompletados: [String] // Guardaremos los IDs de los logros
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Denegado' });
    try {
        const verificado = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (error) { res.status(400).json({ error: 'Inválido' }); }
};

// --- RUTAS DE LOGROS ---

app.post('/api/logros/completar', verificarToken, async (req, res) => {
    try {
        const { idLogro } = req.body;
        const usuario = await Usuario.findById(req.usuario.id);
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
    const usuario = await Usuario.findById(req.usuario.id);
    res.json(usuario.logrosCompletados);
});

// --- RESTO DE RUTAS (COPIAR IGUAL) ---
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
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/juegos/logros-mas', async (req, res) => {
    const r = await axios.get(req.query.url);
    res.json({ trofeos: r.data.results, siguientePagina: r.data.next });
});

app.post('/api/registro', async (req, res) => {
    const { username, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = new Usuario({ username, email, password: hash });
    await user.save();
    res.json({ mensaje: 'Registrado' });
});

app.post('/api/login', async (req, res) => {
    const user = await Usuario.findOne({ email: req.body.email });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(400).json({ error: 'Error' });
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token, username: user.username });
});

app.post('/api/favoritos', verificarToken, async (req, res) => {
    const { idJuego, nombre, imagen } = req.body;
    const user = await Usuario.findById(req.usuario.id);
    const idx = user.favoritos.findIndex(f => f.idJuego === idJuego);
    if (idx === -1) user.favoritos.push({ idJuego, nombre, imagen });
    else user.favoritos.splice(idx, 1);
    await user.save();
    res.json({ mensaje: 'Bóveda actualizada' });
});

app.get('/api/favoritos', verificarToken, async (req, res) => {
    const user = await Usuario.findById(req.usuario.id);
    res.json(user.favoritos);
});

app.get('/api/juegos', async (req, res) => {
    const b = req.query.search;
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=24${b ? '&search='+b : ''}`;
    const r = await axios.get(url);
    res.json(r.data.results);
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

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Puerto ${PORT}`); });