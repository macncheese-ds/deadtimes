// ============================================================================
// RUTAS: CONFIGURACIÓN
// GET /api/config/equipos - obtener lista de equipos
// POST /api/config/equipos - crear nuevo equipo
// PUT /api/config/equipos/:id - editar equipo
// DELETE /api/config/equipos/:id - eliminar equipo
// GET /api/config/lineas - obtener lista de líneas
// POST /api/config/lineas - crear nueva línea
// PUT /api/config/lineas/:id - editar línea
// DELETE /api/config/lineas/:id - eliminar línea
// GET /api/config/modelos - obtener lista de modelos
// POST /api/config/modelos - crear nuevo modelo
// PUT /api/config/modelos/:id - editar modelo
// DELETE /api/config/modelos/:id - eliminar modelo
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

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

// Helper para validar credenciales contra BD credenciales
async function validarCredenciales(numEmpleado, password) {
  try {
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT num_empleado, nombre, pass_hash, editor, rol FROM users WHERE num_empleado = ? LIMIT 1',
      [numEmpleado]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) return null;
    
    const user = rows[0];
    const hash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString() : user.pass_hash;
    const ok = await bcrypt.compare(password, hash);
    if (ok) {
      return { 
        num_empleado: user.num_empleado, 
        nombre: user.nombre,
        editor: user.editor,
        rol: user.rol
      };
    }
    return null;
  } catch (err) {
    console.error('Error validando credenciales:', err);
    return null;
  }
}

// ============================================================================
// EQUIPOS
// ============================================================================

// GET /api/config/equipos - obtener lista de equipos
router.get('/equipos', async (req, res) => {
  try {
    const [equipos] = await db.query('SELECT id, equipo FROM equipos ORDER BY equipo ASC');
    res.json({
      success: true,
      data: equipos
    });
  } catch (err) {
    console.error('Error obteniendo equipos:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/config/equipos - crear nuevo equipo
router.post('/equipos', async (req, res) => {
  try {
    const { equipo, numEmpleado, password } = req.body;
    
    if (!equipo) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del equipo es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO equipos (equipo) VALUES (?)',
      [equipo]
    );
    
    res.json({
      success: true,
      message: 'Equipo creado exitosamente',
      data: {
        id: result.insertId,
        equipo
      }
    });
  } catch (err) {
    console.error('Error creando equipo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// PUT /api/config/equipos/:id - editar equipo
router.put('/equipos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipo, numEmpleado, password } = req.body;
    
    if (!equipo) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del equipo es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'UPDATE equipos SET equipo = ? WHERE id = ?',
      [equipo, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: {
        id,
        equipo
      }
    });
  } catch (err) {
    console.error('Error actualizando equipo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// DELETE /api/config/equipos/:id - eliminar equipo
router.delete('/equipos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numEmpleado, password } = req.body;
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'DELETE FROM equipos WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Equipo eliminado exitosamente'
    });
  } catch (err) {
    console.error('Error eliminando equipo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================================
// LÍNEAS
// ============================================================================

// GET /api/config/lineas - obtener lista de líneas
router.get('/lineas', async (req, res) => {
  try {
    const [lineas] = await db.query('SELECT id, linea FROM lineas ORDER BY linea ASC');
    res.json({
      success: true,
      data: lineas
    });
  } catch (err) {
    console.error('Error obteniendo líneas:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/config/lineas - crear nueva línea
router.post('/lineas', async (req, res) => {
  try {
    const { linea, numEmpleado, password } = req.body;
    
    if (!linea) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la línea es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO lineas (linea) VALUES (?)',
      [linea]
    );
    
    res.json({
      success: true,
      message: 'Línea creada exitosamente',
      data: {
        id: result.insertId,
        linea
      }
    });
  } catch (err) {
    console.error('Error creando línea:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// PUT /api/config/lineas/:id - editar línea
router.put('/lineas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { linea, numEmpleado, password } = req.body;
    
    if (!linea) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la línea es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'UPDATE lineas SET linea = ? WHERE id = ?',
      [linea, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Línea actualizada exitosamente',
      data: {
        id,
        linea
      }
    });
  } catch (err) {
    console.error('Error actualizando línea:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// DELETE /api/config/lineas/:id - eliminar línea
router.delete('/lineas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numEmpleado, password } = req.body;
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'DELETE FROM lineas WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Línea eliminada exitosamente'
    });
  } catch (err) {
    console.error('Error eliminando línea:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================================
// MODELOS
// ============================================================================

// GET /api/config/modelos - obtener lista de modelos
router.get('/modelos', async (req, res) => {
  try {
    const [modelos] = await db.query('SELECT id, modelo, producto, linea, rate FROM modelos ORDER BY modelo ASC');
    res.json({
      success: true,
      data: modelos
    });
  } catch (err) {
    console.error('Error obteniendo modelos:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/config/modelos - crear nuevo modelo
router.post('/modelos', async (req, res) => {
  try {
    const { modelo, producto, linea, rate, numEmpleado, password } = req.body;
    
    if (!modelo) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del modelo es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO modelos (modelo, producto, linea, rate) VALUES (?, ?, ?, ?)',
      [modelo, producto || null, linea || null, rate ? parseInt(rate, 10) : null]
    );
    
    res.json({
      success: true,
      message: 'Modelo creado exitosamente',
      data: {
        id: result.insertId,
        modelo,
        producto: producto || null,
        linea: linea || null,
        rate: rate ? parseInt(rate, 10) : null
      }
    });
  } catch (err) {
    console.error('Error creando modelo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// PUT /api/config/modelos/:id - editar modelo
router.put('/modelos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modelo, producto, linea, rate, numEmpleado, password } = req.body;
    
    if (!modelo) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del modelo es requerido'
      });
    }
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'UPDATE modelos SET modelo = ?, producto = ?, linea = ?, rate = ? WHERE id = ?',
      [modelo, producto || null, linea || null, rate ? parseInt(rate, 10) : null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Modelo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Modelo actualizado exitosamente',
      data: {
        id,
        modelo,
        producto: producto || null,
        linea: linea || null,
        rate: rate ? parseInt(rate, 10) : null
      }
    });
  } catch (err) {
    console.error('Error actualizando modelo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// DELETE /api/config/modelos/:id - eliminar modelo
router.delete('/modelos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numEmpleado, password } = req.body;
    
    // Validar credenciales si se proporcionan
    if (numEmpleado && password) {
      const user = await validarCredenciales(numEmpleado, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
    }
    
    const [result] = await db.query(
      'DELETE FROM modelos WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Modelo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Modelo eliminado exitosamente'
    });
  } catch (err) {
    console.error('Error eliminando modelo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;

