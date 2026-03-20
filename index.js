const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 ¡Base de datos conectada con éxito!'))
    .catch(err => console.error('🔴 Error conectando a MongoDB:', err));

// --- 2. EL MOLDE DEL USUARIO (Con Favoritos) ---
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoritos: [{
        idJuego: { type: String },
        nombre: { type: String },
        imagen: { type: String }
    }]
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// --- CANDADO DE SEGURIDAD (Middleware) ---
const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Acceso denegado. Necesitas iniciar sesión.' });
    try {
        const verificado = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token no válido o expirado.' });
    }
};

// --- 3. RUTAS DE USUARIOS ---
app.post('/api/registro', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) return res.status(400).json({ error: 'Este correo ya pertenece a otro cazador.' });
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);
        const nuevoUsuario = new Usuario({ username, email, password: passwordEncriptada });
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: '¡Cazador registrado con éxito!' });
    } catch (error) { res.status(500).json({ error: 'Error al registrar.' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) return res.status(400).json({ error: 'Credenciales inválidas.' });
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return res.status(400).json({ error: 'Credenciales inválidas.' });
        const token = jwt.sign({ id: usuario._id, username: usuario.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ mensaje: '¡Bienvenido!', token, username: usuario.username });
    } catch (error) { res.status(500).json({ error: 'Error al iniciar sesión.' }); }
});

// --- NUEVO: RUTAS DE FAVORITOS ---
app.post('/api/favoritos', verificarToken, async (req, res) => {
    try {
        const { idJuego, nombre, imagen } = req.body;
        const usuario = await Usuario.findById(req.usuario.id);
        
        const index = usuario.favoritos.findIndex(f => f.idJuego === idJuego.toString());
        
        if (index === -1) {
            usuario.favoritos.push({ idJuego: idJuego.toString(), nombre, imagen });
            await usuario.save();
            res.json({ mensaje: '⭐ Agregado a tu colección.', agregado: true });
        } else {
            usuario.favoritos.splice(index, 1);
            await usuario.save();
            res.json({ mensaje: '❌ Eliminado de tu colección.', agregado: false });
        }
    } catch (error) { res.status(500).json({ error: 'Error al actualizar favoritos.' }); }
});

app.get('/api/favoritos', verificarToken, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id);
        res.json(usuario.favoritos);
    } catch (error) { res.status(500).json({ error: 'Error al cargar tu colección.' }); }
});

// --- 4. RUTA DE VIDEOJUEGOS PRINCIPAL ---
app.get('/api/juegos', async (req, res) => {
    try {
        const busqueda = req.query.search; 
        let url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=24`;
        if (busqueda) url += `&search=${busqueda}`;
        const respuesta = await axios.get(url);
        res.json(respuesta.data.results);
    } catch (error) { res.status(500).json({ error: 'Error con RAWG' }); }
});

// --- 5. RUTA PARA DETALLES ---
app.get('/api/juegos/detalles/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const apiKey = process.env.RAWG_API_KEY;
        const [detalles, imagenes, logros, videos] = await Promise.all([
            axios.get(`https://api.rawg.io/api/games/${id}?key=${apiKey}`),
            axios.get(`https://api.rawg.io/api/games/${id}/screenshots?key=${apiKey}`),
            axios.get(`https://api.rawg.io/api/games/${id}/achievements?key=${apiKey}&page_size=100`),
            axios.get(`https://api.rawg.io/api/games/${id}/movies?key=${apiKey}`)
        ]);
        res.json({ info: detalles.data, capturas: imagenes.data.results.slice(0, 6), trofeos: logros.data.results, trailers: videos.data.results });
    } catch (error) { res.status(500).json({ error: 'Error al obtener la información.' }); }
});

// --- 6. RUTA DE LA IA ---
app.get('/api/recomendaciones/:juego', async (req, res) => {
    try {
        const nombreJuego = req.params.juego;
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Actúa como un experto en videojuegos. Recomienda exactamente 3 videojuegos que sean muy similares a "${nombreJuego}" en mecánicas, historia o ambientación. Tu respuesta debe ser ÚNICAMENTE un arreglo en formato JSON con los nombres exactos de los juegos, sin nada de texto adicional ni formato markdown. Ejemplo de tu respuesta: ["Juego A", "Juego B", "Juego C"]`;
        const result = await model.generateContent(prompt);
        const textoLimpio = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const nombresJuegosRecomendados = JSON.parse(textoLimpio);
        const promesasRAWG = nombresJuegosRecomendados.map(nombre => axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${nombre}&page_size=1`));
        const resultadosRAWG = await Promise.all(promesasRAWG);
        const juegosFinales = resultadosRAWG.map(r => r.data.results[0]).filter(j => j !== undefined);
        res.json(juegosFinales);
    } catch (error) { res.status(500).json({ error: 'La IA está fallando.' }); }
});

// ESTA ES LA LÍNEA QUE FALTABA
app.listen(PORT, () => { console.log(`🚀 Servidor de HUNTER GAMES corriendo en http://localhost:${PORT}`); });