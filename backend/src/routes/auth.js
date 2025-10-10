const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// POST /api/auth/login - simulate gaffet scan with num_empleado and password
router.post('/login', async (req, res) => {
  const { num_empleado, password } = req.body;
  if (!num_empleado || !password) return res.status(400).json({ message: 'num_empleado y password requeridos' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE num_empleado = ?', [num_empleado]);
    if (!rows.length) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, num_empleado: user.num_empleado, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, num_empleado: user.num_empleado, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST /api/auth/register - for seeding users (demo)
router.post('/register', async (req, res) => {
  const { num_empleado, nombre, password, rol = 'empleado' } = req.body;
  if (!num_empleado || !nombre || !password) return res.status(400).json({ message: 'Campos requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (num_empleado, nombre, password_hash, rol) VALUES (?, ?, ?, ?)', [num_empleado, nombre, hash, rol]);
    res.json({ message: 'Usuario registrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'num_empleado ya existe' });
    console.error(err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;