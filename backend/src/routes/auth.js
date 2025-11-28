const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// Helper para conectar a credenciales DB
async function createCredConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.CRED_DB_NAME || 'credenciales'
  };
  return await mysql.createConnection(config);
}

// Normalizar entrada de empleado
function normalizeEmployeeInput(input) {
  let normalized = String(input).trim();
  const match = normalized.match(/^0*(\d+)([A-Za-z])?$/);
  if (match) {
    const number = match[1];
    const letter = match[2] || 'A';
    normalized = `${number}${letter}`;
  } else {
    normalized = normalized.replace(/^0+/, '') + 'A';
  }
  return normalized;
}

// POST /api/auth/login - authenticate with credenciales database
router.post('/login', async (req, res) => {
  const { employee_input, password } = req.body;
  if (!employee_input || !password) {
    return res.status(400).json({ message: 'employee_input y password requeridos' });
  }

  try {
    const normalized = normalizeEmployeeInput(employee_input);
    const conn = await createCredConnection();
    
    const [rows] = await conn.execute(
      'SELECT id, nombre, usuario, num_empleado, pass_hash, rol FROM users WHERE num_empleado = ? OR usuario = ? LIMIT 1',
      [normalized, normalized]
    );
    await conn.end();

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const hash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString() : user.pass_hash;
    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta' });

    // Mapear rol de credenciales a sistema de deadtimes
    // Roles que pueden ATENDER tickets: The Goat, Ingeniero, Administrador, Calidad, Soporte, Lider
    // Todos los demás solo pueden CREAR tickets
    const rolesQueAtienden = ['The Goat', 'Ingeniero', 'Administrador', 'Calidad', 'Soporte', 'Lider'];
    let deadtimesRol = rolesQueAtienden.includes(user.rol) ? 'tecnico' : 'empleado';
    
    // The Goat y Administrador son admin (tienen todos los permisos)
    if (user.rol === 'The Goat' || user.rol === 'Administrador') {
      deadtimesRol = 'admin';
    }

    const token = jwt.sign(
      { 
        id: user.id,
        num_empleado: user.num_empleado,
        nombre: user.nombre, 
        rol: deadtimesRol,
        rolOriginal: user.rol
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id,
        num_empleado: user.num_empleado,
        nombre: user.nombre, 
        rol: deadtimesRol,
        rolOriginal: user.rol
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// GET /api/auth/lookup/:employee_input - lookup user without password (for scanning)
router.get('/lookup/:employee_input', async (req, res) => {
  try {
    const { employee_input } = req.params;
    if (!employee_input) return res.status(400).json({ error: 'employee_input es requerido' });

    const normalized = normalizeEmployeeInput(employee_input);
    const conn = await createCredConnection();
    
    const [rows] = await conn.execute(
      'SELECT id, nombre, usuario, num_empleado, rol FROM users WHERE num_empleado = ? OR usuario = ? LIMIT 1',
      [normalized, normalized]
    );
    await conn.end();

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    res.json({ 
      success: true, 
      nombre: user.nombre, 
      usuario: user.usuario, 
      num_empleado: user.num_empleado,
      rol: user.rol
    });
  } catch (err) {
    console.error('Error buscando usuario:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;