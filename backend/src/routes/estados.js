const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Obtener estado de una línea
router.get('/:linea', async (req, res) => {
  try {
    const { linea } = req.params;
    
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, linea, cambio_modelo, mantenimiento, auditoria FROM estados WHERE linea = ?',
      [linea]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }

    res.json({
      success: true,
      estado: rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT: Activar/Desactivar mantenimiento para una línea
router.put('/:linea/mantenimiento', async (req, res) => {
  try {
    const { linea } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo "activo" debe ser booleano'
      });
    }

    const connection = await db.getConnection();
    const [result] = await connection.execute(
      'UPDATE estados SET mantenimiento = ? WHERE linea = ?',
      [activo ? 1 : 0, linea]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Mantenimiento ${activo ? 'activado' : 'desactivado'} para línea ${linea}`
    });
  } catch (error) {
    console.error('Error actualizando mantenimiento:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT: Activar/Desactivar cambio de modelo para una línea
router.put('/:linea/cambio-modelo', async (req, res) => {
  try {
    const { linea } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo "activo" debe ser booleano'
      });
    }

    const connection = await db.getConnection();
    const [result] = await connection.execute(
      'UPDATE estados SET cambio_modelo = ? WHERE linea = ?',
      [activo ? 1 : 0, linea]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Cambio de modelo ${activo ? 'activado' : 'desactivado'} para línea ${linea}`
    });
  } catch (error) {
    console.error('Error actualizando cambio de modelo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT: Activar/Desactivar auditoría para una línea
router.put('/:linea/auditoria', async (req, res) => {
  try {
    const { linea } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo "activo" debe ser booleano'
      });
    }

    const connection = await db.getConnection();
    const [result] = await connection.execute(
      'UPDATE estados SET auditoria = ? WHERE linea = ?',
      [activo ? 1 : 0, linea]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Auditoría ${activo ? 'activada' : 'desactivada'} para línea ${linea}`
    });
  } catch (error) {
    console.error('Error actualizando auditoría:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT: Desactivar todos los modos para una línea
router.put('/:linea/reset', async (req, res) => {
  try {
    const { linea } = req.params;

    const connection = await db.getConnection();
    const [result] = await connection.execute(
      'UPDATE estados SET mantenimiento = 0, cambio_modelo = 0, auditoria = 0 WHERE linea = ?',
      [linea]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Línea no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Estados resetados para línea ${linea}`
    });
  } catch (error) {
    console.error('Error reseteando estados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
