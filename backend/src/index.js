const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const deadtimes = require('./routes/deadtimes');
const auth = require('./routes/auth');
const produccion = require('./routes/produccion');

dotenv.config();
const app = express();

// Configuración de CORS más específica para trabajar con Nginx
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

app.use('/api/auth', auth);
app.use('/api/deadtimes', deadtimes);
app.use('/api/produccion', produccion);

const PORT = process.env.PORT || 3107;
app.listen(PORT, '0.0.0.0', () => console.log(`Deadtimes API on ${PORT}`));
