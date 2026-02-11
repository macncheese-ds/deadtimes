const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const deadtimes = require('./routes/deadtimes');
const auth = require('./routes/auth');
const produccion = require('./routes/produccion');
const configuracion = require('./routes/configuracion');
const estados = require('./routes/estados');
const helmet = require('helmet');
const path = require('path');

dotenv.config();
const app = express();

// Configuración de CORS más específica para trabajar con Nginx
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Add security headers
app.use(helmet({
  xssFilter: false, // Remove x-xss-protection header
  hidePoweredBy: true, // Remove x-powered-by header
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: false // Configure separately if needed
}));

// Add custom headers for security and performance
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Only cache static content, never cache API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

// Serve static assets with immutable cache-control
app.use('/assets', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}, express.static(path.join(__dirname, '../frontend/dist/assets')));

app.use('/api/auth', auth);
app.use('/api/deadtimes', deadtimes);
app.use('/api/produccion', produccion);
app.use('/api/config', configuracion);
app.use('/api/estados', estados);

const PORT = process.env.PORT || 3107;
app.listen(PORT, '0.0.0.0', () => console.log(`Deadtimes API on ${PORT}`));
