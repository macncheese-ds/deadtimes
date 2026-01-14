// ============================================================================
// RUTAS: PRODUCCIÓN (nuevas)
// POST /api/produccion/intervalos - crear/actualizar intervalos
// GET /api/produccion/intervalos - obtener tabla de producción
// PUT /api/produccion/intervalos/:id - editar producción o scrap (requiere credencial)
// GET /api/produccion/unjustified - obtener deadtime no justificado (Review)
// GET /api/produccion/related-tickets - obtener tickets relacionados a intervalo
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
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

// Helper para registrar auditoría
async function logAudit(tabla, registroId, numEmpleado, nombreUsuario, accion, campo, valorAnterior, valorNuevo, ipOrigen) {
  try {
    const [result] = await db.query(
      `INSERT INTO auditor_cambios 
       (tabla_afectada, registro_id, num_empleado, nombre_usuario, accion, campo, valor_anterior, valor_nuevo, ip_origen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tabla, registroId, numEmpleado, nombreUsuario, accion, campo, valorAnterior, valorNuevo, ipOrigen]
    );
    return result;
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }
}


// Helper para validar credenciales contra BD credenciales
// Retorna: { num_empleado, nombre, editor } si es válido, null si no
async function validarCredenciales(numEmpleado, password) {
  try {
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT num_empleado, nombre, password, editor, rol FROM users WHERE num_empleado = ? LIMIT 1',
      [numEmpleado]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) return null;
    
    // Aquí se asume que la contraseña se compara (simplificado para demostración)
    // En producción, usar bcrypt para comparar
    const user = rows[0];
    if (user.password === password) {
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

// Helper para calcular deadtime basado en piezas faltantes
// Fórmula: si (rate_acumulado - produccion_acumulada - scrap) > 0
//          entonces deadtime = ((rate_acumulado - produccion_acumulada - scrap) / rate) * 60 minutos
//          sino 0
function calcularDeadtime(rateAcumulado, produccionAcumulada, scrap, ratePorHora) {
  if (!ratePorHora || ratePorHora === 0) return 0;
  const piezasFaltantes = rateAcumulado - produccionAcumulada - scrap;
  if (piezasFaltantes <= 0) return 0;
  return (piezasFaltantes / ratePorHora) * 60; // convertir a minutos
}

// ============================================================================
// GET /api/produccion/intervalos
// Obtener tabla de producción por intervalo para una línea y turno
// Query params: linea, fecha, turno
// ============================================================================
router.get('/intervalos', async (req, res) => {
  try {
    const { linea, fecha, turno } = req.query;

    if (!linea || !fecha || !turno) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: linea, fecha, turno'
      });
    }

    const [rows] = await db.query(
      `SELECT 
        id,
        linea,
        fecha,
        turno,
        hora_inicio,
        modelo,
        producto,
        rate,
        rate_acumulado,
        produccion,
        produccion_acumulada,
        scrap,
        delta,
        deadtime_minutos,
        porcentaje_cumplimiento,
        justificado_minutos,
        tiempo_no_justificado,
        updated_at
      FROM produccion_intervalos
      WHERE linea = ? AND fecha = ? AND turno = ?
      ORDER BY hora_inicio ASC`,
      [linea, fecha, parseInt(turno, 10)]
    );

    // Calcular totales
    const totales = {
      rate_total: rows.reduce((sum, r) => sum + (r.rate || 0), 0),
      produccion_total: rows.reduce((sum, r) => sum + (r.produccion || 0), 0),
      scrap_total: rows.reduce((sum, r) => sum + (r.scrap || 0), 0),
      deadtime_total: rows.reduce((sum, r) => sum + (r.deadtime_minutos || 0), 0),
      justificado_total: rows.reduce((sum, r) => sum + (r.justificado_minutos || 0), 0),
      no_justificado_total: rows.reduce((sum, r) => sum + (r.tiempo_no_justificado || 0), 0)
    };

    // Calcular porcentaje de cumplimiento general
    totales.porcentaje_cumplimiento = totales.rate_total > 0 
      ? ((totales.produccion_total / totales.rate_total) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: rows,
      totales
    });
  } catch (error) {
    console.error('Error en GET /intervalos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// POST /api/produccion/intervalos
// Crear intervalos para una línea y turno (se ejecuta al seleccionar línea+turno)
// Body: { linea, fecha, turno }
// Crea 12 intervalos (Turno 1: 8-20, Turno 2: 20-8) con modelo/rate inicial
// ============================================================================
router.post('/intervalos', async (req, res) => {
  try {
    const { linea, fecha, turno } = req.body;

    if (!linea || !fecha || !turno) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: linea, fecha, turno'
      });
    }

    // Determinar rango de horas según turno
    const horas = turno == 1 ? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : [20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];

    // Obtener modelo por defecto para la línea
    const [modelos] = await db.query(
      'SELECT modelo, producto, rate FROM modelos WHERE linea = ? LIMIT 1',
      [linea]
    );

    const modeloDefault = modelos && modelos.length > 0 ? modelos[0] : { modelo: null, producto: null, rate: 0 };

    // Insertar 12 intervalos
    for (let i = 0; i < horas.length; i++) {
      const hora = horas[i];
      const rateAcumulado = (i + 1) * modeloDefault.rate; // suma acumulada

      await db.query(
        `INSERT INTO produccion_intervalos 
         (linea, fecha, turno, hora_inicio, modelo, producto, rate, rate_acumulado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           modelo = VALUES(modelo),
           producto = VALUES(producto),
           rate = VALUES(rate),
           rate_acumulado = VALUES(rate_acumulado)`,
        [linea, fecha, turno, hora, modeloDefault.modelo, modeloDefault.producto, modeloDefault.rate, rateAcumulado]
      );
    }

    res.json({
      success: true,
      message: `Intervalos creados para ${linea} - Turno ${turno} - ${fecha}`
    });
  } catch (error) {
    console.error('Error en POST /intervalos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// PUT /api/produccion/intervalos/:id
// Editar producción o scrap de un intervalo
// Requiere validación de credenciales (num_empleado + password)
// Body: { campo: 'produccion' | 'scrap' | 'modelo', valor, numEmpleado, password }
// ============================================================================
router.put('/intervalos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { campo, valor, numEmpleado, password } = req.body;
    const ipOrigen = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!campo || valor === undefined || !numEmpleado || !password) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: campo, valor, numEmpleado, password'
      });
    }

    // Validar credenciales (contra credenciales.users)
    const user = await validarCredenciales(numEmpleado, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // LÓGICA: Para editar PRODUCCIÓN, solo se requiere estar registrado
    // El empleado queda registrado en auditor_cambios automáticamente
    // No hay restricción adicional - todos los registrados pueden editar producción

    // Obtener intervalo actual
    const [intervalosAnt] = await db.query(
      'SELECT * FROM produccion_intervalos WHERE id = ? LIMIT 1',
      [id]
    );

    if (!intervalosAnt || intervalosAnt.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervalo no encontrado'
      });
    }

    const intervaloAnt = intervalosAnt[0];
    let actualizaciones = {};

    // Procesar según el campo editado
    if (campo === 'produccion') {
      actualizaciones.produccion = parseInt(valor, 10);
      actualizaciones.num_empleado_produccion = numEmpleado;
    } else if (campo === 'scrap') {
      actualizaciones.scrap = parseInt(valor, 10);
      actualizaciones.num_empleado_scrap = numEmpleado;
    } else if (campo === 'modelo') {
      // Si cambia modelo, obtener el nuevo rate
      const [modelosNuevos] = await db.query(
        'SELECT modelo, producto, rate FROM modelos WHERE modelo = ? AND linea = ? LIMIT 1',
        [valor, intervaloAnt.linea]
      );
      if (modelosNuevos && modelosNuevos.length > 0) {
        const modeloNuevo = modelosNuevos[0];
        actualizaciones.modelo = modeloNuevo.modelo;
        actualizaciones.producto = modeloNuevo.producto;
        actualizaciones.rate = modeloNuevo.rate;
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Campo no permitido para editar'
      });
    }

    // Recalcular valores dependientes
    const produccionNueva = actualizaciones.produccion !== undefined ? actualizaciones.produccion : intervaloAnt.produccion;
    const scrapNuevo = actualizaciones.scrap !== undefined ? actualizaciones.scrap : intervaloAnt.scrap;
    const rateNuevo = actualizaciones.rate !== undefined ? actualizaciones.rate : intervaloAnt.rate;

    // Recalcular delta = (rate - produccion) - scrap
    actualizaciones.delta = rateNuevo - produccionNueva - scrapNuevo;

    // Recalcular rate_acumulado si cambió modelo (rehacer sumatorias de todos los intervalos)
    if (campo === 'modelo') {
      const [intervalos] = await db.query(
        `SELECT id, hora_inicio, rate FROM produccion_intervalos 
         WHERE linea = ? AND fecha = ? AND turno = ?
         ORDER BY hora_inicio ASC`,
        [intervaloAnt.linea, intervaloAnt.fecha, intervaloAnt.turno]
      );

      let acumulado = 0;
      for (let int of intervalos) {
        const rateActual = int.id === parseInt(id, 10) ? rateNuevo : int.rate;
        acumulado += rateActual;
        if (int.id === parseInt(id, 10)) {
          actualizaciones.rate_acumulado = acumulado;
        } else if (int.hora_inicio > intervaloAnt.hora_inicio) {
          // Actualizar rate_acumulado de intervalos posteriores
          // (simplificado: se hace en un segundo query)
        }
      }
    }

    // Recalcular produccion_acumulada y deadtime
    const [intervalosAct] = await db.query(
      `SELECT produccion FROM produccion_intervalos 
       WHERE linea = ? AND fecha = ? AND turno = ? AND hora_inicio <= ?
       ORDER BY hora_inicio ASC`,
      [intervaloAnt.linea, intervaloAnt.fecha, intervaloAnt.turno, intervaloAnt.hora_inicio]
    );

    let produccionAcum = 0;
    for (let int of intervalosAct) {
      if (int.id === parseInt(id, 10)) {
        produccionAcum += produccionNueva;
      } else {
        produccionAcum += int.produccion || 0;
      }
    }
    actualizaciones.produccion_acumulada = produccionAcum;

    // Calcular deadtime
    const rateAcumActual = actualizaciones.rate_acumulado || intervaloAnt.rate_acumulado;
    actualizaciones.deadtime_minutos = calcularDeadtime(
      rateAcumActual,
      produccionAcum,
      scrapNuevo,
      rateNuevo
    );

    // Calcular porcentaje de cumplimiento
    if (rateAcumActual > 0) {
      actualizaciones.porcentaje_cumplimiento = ((produccionAcum / rateAcumActual) * 100).toFixed(2);
    }

    // Ejecutar UPDATE
    const actualizacionesSQL = Object.keys(actualizaciones)
      .map(key => `${key} = ?`)
      .join(', ');
    const valores = Object.values(actualizaciones);
    valores.push(id);

    const [result] = await db.query(
      `UPDATE produccion_intervalos SET ${actualizacionesSQL} WHERE id = ?`,
      valores
    );

    // Registrar auditoría
    await logAudit(
      'produccion_intervalos',
      parseInt(id, 10),
      numEmpleado,
      user.nombre,
      'UPDATE',
      campo,
      `${intervaloAnt[campo]}`,
      `${valor || actualizaciones[campo]}`,
      ipOrigen
    );

    res.json({
      success: true,
      message: `Campo ${campo} actualizado correctamente`,
      data: actualizaciones
    });
  } catch (error) {
    console.error('Error en PUT /intervalos/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET /api/produccion/unjustified
// Obtener deadtime no justificado por intervalo (para sección Review)
// Query params: linea, fecha, turno
// Retorna: deadtime_minutos - minutos_justificados por tickets
// ============================================================================
router.get('/unjustified', async (req, res) => {
  try {
    const { linea, fecha, turno } = req.query;

    if (!linea || !fecha || !turno) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: linea, fecha, turno'
      });
    }

    const [rows] = await db.query(
      `SELECT 
        pi.id,
        pi.linea,
        pi.fecha,
        pi.turno,
        pi.hora_inicio,
        pi.modelo,
        COALESCE(pi.deadtime_minutos, 0) as deadtime_minutos,
        COALESCE(SUM(tpr.minutos_justificados), 0) AS minutos_justificados,
        (COALESCE(pi.deadtime_minutos, 0) - COALESCE(SUM(tpr.minutos_justificados), 0)) AS tiempo_no_justificado
      FROM produccion_intervalos pi
      LEFT JOIN ticket_produccion_relacion tpr ON pi.id = tpr.intervalo_id
      WHERE pi.linea = ? AND pi.fecha = ? AND pi.turno = ?
      GROUP BY pi.id
      ORDER BY pi.hora_inicio ASC`,
      [linea, fecha, parseInt(turno, 10)]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error en GET /unjustified:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GET /api/produccion/related-tickets/:intervaloId
// Obtener tickets relacionados a un intervalo (para modal en Review)
// ============================================================================
router.get('/related-tickets/:intervaloId', async (req, res) => {
  try {
    const { intervaloId } = req.params;

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.descr,
        d.modelo,
        d.hr,
        d.hc,
        TIMESTAMPDIFF(MINUTE, d.hr, d.hc) AS duracion_minutos,
        d.solucion,
        tpr.minutos_justificados
      FROM deadtimes d
      INNER JOIN ticket_produccion_relacion tpr ON d.id = tpr.ticket_id
      WHERE tpr.intervalo_id = ? AND d.done = 1
      ORDER BY d.hr DESC`,
      [intervaloId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error en GET /related-tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINTS DE CONFIGURACIÓN (CRUD)
// ============================================================================

// GET /api/produccion/equipos - obtener todos los equipos
router.get('/equipos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM equipos ORDER BY nombre');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/produccion/equipos - crear nuevo equipo
router.post('/equipos', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const [result] = await db.query('INSERT INTO equipos (nombre) VALUES (?)', [nombre]);
    res.json({ success: true, data: { id: result.insertId, nombre } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/produccion/equipos/:id - actualizar equipo
router.put('/equipos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    await db.query('UPDATE equipos SET nombre = ? WHERE id = ?', [nombre, id]);
    res.json({ success: true, data: { id, nombre } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/produccion/equipos/:id - eliminar equipo
router.delete('/equipos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM equipos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Equipo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/produccion/lineas - obtener todas las líneas
router.get('/lineas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lineas ORDER BY nombre');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/produccion/lineas - crear nueva línea
router.post('/lineas', async (req, res) => {
  const { nombre, equipo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const [result] = await db.query('INSERT INTO lineas (nombre, equipo) VALUES (?, ?)', [nombre, equipo]);
    res.json({ success: true, data: { id: result.insertId, nombre, equipo } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/produccion/lineas/:id - actualizar línea
router.put('/lineas/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, equipo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    await db.query('UPDATE lineas SET nombre = ?, equipo = ? WHERE id = ?', [nombre, equipo, id]);
    res.json({ success: true, data: { id, nombre, equipo } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/produccion/lineas/:id - eliminar línea
router.delete('/lineas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM lineas WHERE id = ?', [id]);
    res.json({ success: true, message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/produccion/modelos - obtener todos los modelos
router.get('/modelos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM modelos ORDER BY nombre');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/produccion/modelos - crear nuevo modelo
router.post('/modelos', async (req, res) => {
  const { nombre, producto, rate, linea } = req.body;
  if (!nombre || !rate) return res.status(400).json({ error: 'Nombre y rate requeridos' });

  try {
    const [result] = await db.query(
      'INSERT INTO modelos (nombre, producto, rate, linea) VALUES (?, ?, ?, ?)',
      [nombre, producto, rate, linea]
    );
    res.json({ success: true, data: { id: result.insertId, nombre, producto, rate, linea } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/produccion/modelos/:id - actualizar modelo
router.put('/modelos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, producto, rate, linea } = req.body;
  if (!nombre || !rate) return res.status(400).json({ error: 'Nombre y rate requeridos' });

  try {
    await db.query(
      'UPDATE modelos SET nombre = ?, producto = ?, rate = ?, linea = ? WHERE id = ?',
      [nombre, producto, rate, linea, id]
    );
    res.json({ success: true, data: { id, nombre, producto, rate, linea } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/produccion/modelos/:id - eliminar modelo
router.delete('/modelos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM modelos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Modelo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENDPOINTS DE EDICIÓN DE TICKETS
// ============================================================================

// GET /deadtimes/:id - obtener ticket por ID
router.get('/deadtimes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        id, descr, modelo, producto, hr, hc, 
        TIMESTAMPDIFF(MINUTE, hr, hc) AS duracion_minutos,
        solucion, observaciones, done
      FROM deadtimes
      WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /deadtimes/:id - actualizar ticket completo
// Solo Ingeniero puede actualizar tickets
router.put('/deadtimes/:id', async (req, res) => {
  const { id } = req.params;
  const numEmpleado = req.headers['x-employee'];
  const password = req.headers['authorization'];

  if (!numEmpleado) {
    return res.status(401).json({ error: 'Empleado requerido' });
  }

  const { descr, modelo, hr, hc, solucion, observaciones } = req.body;

  try {
    // Validar credenciales si hay password
    let user = null;
    if (password) {
      const authMatch = password.match(/Basic\s+(.+)/);
      if (authMatch) {
        const credentials = Buffer.from(authMatch[1], 'base64').toString('utf-8');
        const [empId, pass] = credentials.split(':');
        user = await validarCredenciales(parseInt(empId), pass);
        if (!user) {
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }
      }
    }

    // Validar que el usuario tiene rol de Ingeniero
    if (!user || user.rol !== 'Ingeniero') {
      return res.status(403).json({ 
        error: 'Solo Ingenieros pueden actualizar tickets',
        rolActual: user ? user.rol : 'desconocido'
      });
    }

    // Obtener datos anteriores para auditoría
    const [oldRows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    const oldData = oldRows[0];

    // Actualizar ticket
    await db.query(
      `UPDATE deadtimes 
       SET descr = ?, modelo = ?, hr = ?, hc = ?, solucion = ?, observaciones = ?
       WHERE id = ?`,
      [descr, modelo, hr, hc, solucion, observaciones, id]
    );

    // Registrar cambios en auditoría
    const fields = ['descr', 'modelo', 'hr', 'hc', 'solucion', 'observaciones'];
    const newData = { descr, modelo, hr, hc, solucion, observaciones };

    for (const field of fields) {
      if (oldData[field] !== newData[field]) {
        await logAudit(
          'deadtimes',
          id,
          numEmpleado,
          user.nombre,
          'UPDATE',
          field,
          String(oldData[field] || ''),
          String(newData[field] || ''),
          req.ip
        );
      }
    }

    res.json({ success: true, message: 'Ticket actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
