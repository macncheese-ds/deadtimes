// ============================================================================
// RUTAS: PRODUCCION (nueva tabla produccion)
// GET  /api/produccion/registros       - obtener registros por linea+fecha
// POST /api/produccion/registros       - crear/actualizar un registro
// DELETE /api/produccion/registros/:id  - eliminar un registro
// GET  /api/produccion/modelos         - obtener modelos por linea
// GET  /api/produccion/lineas          - obtener lineas
// CRUD equipos, lineas, modelos        - mantenimiento de catalogos
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const dotenv = require('dotenv');
dotenv.config();

// ============================================================================
// GET /api/produccion/registros
// Obtener todos los registros de produccion para una linea y fecha
// Query params: linea, fecha
// ============================================================================
router.get('/registros', async (req, res) => {
  try {
    const { linea, fecha } = req.query;

    if (!linea || !fecha) {
      return res.status(400).json({
        success: false,
        error: 'Parametros requeridos: linea, fecha'
      });
    }

    console.log('[GET /registros] linea=' + linea + ' fecha=' + fecha);

    const [rows] = await db.query(
      `SELECT id, modelo, inicio, final, fecha, capacidad, acumulado,
              produccion, acumulado1, delta, dt, linea, scrap
       FROM produccion
       WHERE linea = ? AND fecha = ?
       ORDER BY inicio ASC`,
      [linea, fecha]
    );

    console.log('[GET /registros] found ' + rows.length + ' rows');

    res.json({
      success: true,
      data: rows || []
    });
  } catch (error) {
    console.error('Error en GET /registros:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/produccion/registros
// Crear o actualizar un registro de produccion
// Body: { id?, linea, fecha, inicio, final, modelo, capacidad, produccion, scrap }
// Recalcula automaticamente acumulado, acumulado1, delta, dt para TODOS
// los registros de esa linea+fecha
// ============================================================================
router.post('/registros', async (req, res) => {
  try {
    const { id, linea, fecha, inicio, final: fin, modelo, capacidad, produccion, scrap } = req.body;

    if (!linea || !fecha || !inicio || !fin) {
      return res.status(400).json({
        success: false,
        error: 'Parametros requeridos: linea, fecha, inicio, final'
      });
    }

    const cap = parseInt(capacidad) || 0;
    const prod = parseInt(produccion) || 0;
    const sc = parseInt(scrap) || 0;

    // Calcular delta y dt para este registro
    const delta = cap - prod;
    const dt = cap > 0 ? parseFloat(((delta * 60) / cap).toFixed(2)) : 0;

    if (id) {
      // Actualizar registro existente
      await db.query(
        `UPDATE produccion
         SET modelo = ?, inicio = ?, final = ?, fecha = ?, capacidad = ?,
             produccion = ?, scrap = ?, delta = ?, dt = ?, linea = ?
         WHERE id = ?`,
        [modelo || null, inicio, fin, fecha, cap, prod, sc, delta, dt, linea, id]
      );
    } else {
      // Verificar si ya existe un registro para ese intervalo
      const [existing] = await db.query(
        `SELECT id FROM produccion WHERE linea = ? AND fecha = ? AND inicio = ? AND final = ?`,
        [linea, fecha, inicio, fin]
      );

      if (existing && existing.length > 0) {
        // Actualizar existente
        await db.query(
          `UPDATE produccion
           SET modelo = ?, capacidad = ?, produccion = ?, scrap = ?, delta = ?, dt = ?
           WHERE id = ?`,
          [modelo || null, cap, prod, sc, delta, dt, existing[0].id]
        );
      } else {
        // Insertar nuevo
        await db.query(
          `INSERT INTO produccion (modelo, inicio, final, fecha, capacidad, produccion, scrap, delta, dt, linea, acumulado, acumulado1)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [modelo || null, inicio, fin, fecha, cap, prod, sc, delta, dt, linea]
        );
      }
    }

    // Recalcular acumulados para TODOS los registros de esa linea+fecha
    await recalcularAcumulados(linea, fecha);

    // Devolver los registros actualizados
    const [rows] = await db.query(
      `SELECT id, modelo, inicio, final, fecha, capacidad, acumulado,
              produccion, acumulado1, delta, dt, linea, scrap
       FROM produccion
       WHERE linea = ? AND fecha = ?
       ORDER BY inicio ASC`,
      [linea, fecha]
    );

    res.json({
      success: true,
      message: 'Registro guardado correctamente',
      data: rows || []
    });
  } catch (error) {
    console.error('Error en POST /registros:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE /api/produccion/registros/:id
// Eliminar un registro y recalcular acumulados
// ============================================================================
router.delete('/registros/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del registro antes de eliminarlo
    const [rows] = await db.query('SELECT linea, fecha FROM produccion WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    const { linea, fecha } = rows[0];

    await db.query('DELETE FROM produccion WHERE id = ?', [id]);

    // Recalcular acumulados
    await recalcularAcumulados(linea, fecha);

    // Devolver registros actualizados
    const [updatedRows] = await db.query(
      `SELECT id, modelo, inicio, final, fecha, capacidad, acumulado,
              produccion, acumulado1, delta, dt, linea, scrap
       FROM produccion
       WHERE linea = ? AND fecha = ?
       ORDER BY inicio ASC`,
      [linea, fecha]
    );

    res.json({
      success: true,
      message: 'Registro eliminado',
      data: updatedRows || []
    });
  } catch (error) {
    console.error('Error en DELETE /registros/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Helper: Recalcular acumulados para todos los registros de linea+fecha
// acumulado  = suma acumulativa de capacidad
// acumulado1 = suma acumulativa de produccion
// delta      = capacidad - produccion
// dt         = (delta * 60) / capacidad
// ============================================================================
async function recalcularAcumulados(linea, fecha) {
  const [rows] = await db.query(
    `SELECT id, capacidad, produccion, scrap FROM produccion
     WHERE linea = ? AND fecha = ?
     ORDER BY inicio ASC`,
    [linea, fecha]
  );

  let acumCapacidad = 0;
  let acumProduccion = 0;

  for (const row of rows) {
    const cap = parseInt(row.capacidad) || 0;
    const prod = parseInt(row.produccion) || 0;

    acumCapacidad += cap;
    acumProduccion += prod;

    const delta = cap - prod;
    const dt = cap > 0 ? parseFloat(((delta * 60) / cap).toFixed(2)) : 0;

    await db.query(
      `UPDATE produccion SET acumulado = ?, acumulado1 = ?, delta = ?, dt = ? WHERE id = ?`,
      [acumCapacidad, acumProduccion, delta, dt, row.id]
    );
  }
}

// ============================================================================
// GET /api/produccion/downtime-analytics
// Returns ALL 24 hourly intervals for a line+date with DT values. For each
// interval, closed tickets that OVERLAP with that hour range are included,
// with their deadtime split proportionally across multiple intervals.
// E.g. a ticket from 13:00-14:30 contributes 60min to 13:00-14:00 and
// 30min to 14:00-15:00. Nothing is written back to the DB.
// Query params: linea, fecha
// ============================================================================
router.get('/downtime-analytics', async (req, res) => {
  try {
    const { linea, fecha } = req.query;

    if (!linea || !fecha) {
      return res.status(400).json({
        success: false,
        error: 'Parametros requeridos: linea, fecha'
      });
    }

    // 1. Get all production intervals for this line+date
    const [produccionRows] = await db.query(
      `SELECT id, modelo, inicio, final, fecha, capacidad, acumulado,
              produccion, acumulado1, delta, dt, linea, scrap
       FROM produccion
       WHERE linea = ? AND fecha = ?
       ORDER BY inicio ASC`,
      [linea, fecha]
    );

    // Build a lookup by hour for production data
    const prodByHour = {};
    for (const row of produccionRows) {
      const h = parseInt(row.inicio.split(':')[0], 10);
      prodByHour[h] = row;
    }

    // 2. Get all closed tickets for this line on this date
    const [ticketRows] = await db.query(
      `SELECT id, hr, ha, hc, descr, modelo, turno, linea, nombre,
              equipo, pf, pa, clasificacion, tecnico, solucion, rate,
              piezas, deadtime
       FROM deadtimes
       WHERE done = 1 AND linea = ? AND DATE(hr) = ?
       ORDER BY hr ASC`,
      [linea, fecha]
    );

    // 3. Generate all 24 hourly intervals, merging production data where it exists
    const intervals = [];
    for (let h = 0; h < 24; h++) {
      const hNext = (h + 1) % 24;
      const inicioStr = String(h).padStart(2, '0') + ':00:00';
      const finalStr = String(hNext).padStart(2, '0') + ':00:00';
      const prod = prodByHour[h];

      const intervalStartMin = h * 60;
      const intervalEndMin = (h + 1) * 60; // always h+1 even for hour 23 (=1440)

      // Find tickets that OVERLAP with this interval and compute proportional time
      const matchingTickets = [];
      let ticketDeadtimeMin = 0;

      for (const t of ticketRows) {
        if (!t.hr || !t.hc) continue;

        const openDate = new Date(t.hr);
        const closeDate = new Date(t.hc);

        // Get ticket start/end in minutes-of-day
        let ticketStartMin = openDate.getHours() * 60 + openDate.getMinutes();
        let ticketEndMin = closeDate.getHours() * 60 + closeDate.getMinutes();

        // Handle tickets that cross midnight or close on the next day
        if (ticketEndMin <= ticketStartMin) {
          ticketEndMin += 1440;
        }

        // Also handle case where close date is next day
        const openDay = openDate.toISOString().slice(0, 10);
        const closeDay = closeDate.toISOString().slice(0, 10);
        if (closeDay > openDay && ticketEndMin < ticketStartMin + 1440) {
          ticketEndMin = closeDate.getHours() * 60 + closeDate.getMinutes() + 1440;
        }

        // Check overlap between ticket [ticketStartMin, ticketEndMin] and interval [intervalStartMin, intervalEndMin]
        const overlapStart = Math.max(ticketStartMin, intervalStartMin);
        const overlapEnd = Math.min(ticketEndMin, intervalEndMin);
        const overlapMinutes = Math.max(0, overlapEnd - overlapStart);

        if (overlapMinutes > 0) {
          matchingTickets.push({
            id: t.id,
            hr: t.hr,
            hc: t.hc,
            equipo: t.equipo,
            descr: t.descr,
            clasificacion: t.clasificacion,
            tecnico: t.tecnico,
            solucion: t.solucion,
            deadtime: parseFloat(overlapMinutes.toFixed(2)), // proportional time for THIS interval
            fullDeadtime: t.deadtime, // original total deadtime
            piezas: t.piezas
          });
          ticketDeadtimeMin += overlapMinutes;
        }
      }

      const dtValue = prod ? (parseFloat(prod.dt) || 0) : 0;
      const adjustedDt = Math.max(0, parseFloat((dtValue - ticketDeadtimeMin).toFixed(2)));

      intervals.push({
        id: prod ? prod.id : null,
        modelo: prod ? prod.modelo : null,
        inicio: inicioStr,
        final: finalStr,
        fecha: fecha,
        capacidad: prod ? prod.capacidad : 0,
        produccion: prod ? prod.produccion : 0,
        delta: prod ? prod.delta : 0,
        dt: dtValue,
        scrap: prod ? prod.scrap : 0,
        ticketDeadtimeMin: parseFloat(ticketDeadtimeMin.toFixed(2)),
        adjustedDt,
        ticketCount: matchingTickets.length,
        tickets: matchingTickets
      });
    }

    // Summary totals
    const totalDt = intervals.reduce((s, i) => s + i.dt, 0);
    const totalTicketDt = intervals.reduce((s, i) => s + i.ticketDeadtimeMin, 0);
    const totalAdjustedDt = intervals.reduce((s, i) => s + i.adjustedDt, 0);
    // Count unique tickets (same ticket can appear in multiple intervals)
    const uniqueTicketIds = new Set();
    intervals.forEach(i => i.tickets.forEach(t => uniqueTicketIds.add(t.id)));
    const totalTickets = uniqueTicketIds.size;

    res.json({
      success: true,
      data: {
        intervals,
        summary: {
          totalDt: parseFloat(totalDt.toFixed(2)),
          totalTicketDt: parseFloat(totalTicketDt.toFixed(2)),
          totalAdjustedDt: parseFloat(totalAdjustedDt.toFixed(2)),
          totalTickets
        }
      }
    });
  } catch (error) {
    console.error('Error en GET /downtime-analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/produccion/modelos
// Obtener lista de modelos disponibles (opcionalmente filtrar por linea)
// ============================================================================
router.get('/modelos', async (req, res) => {
  try {
    const { linea } = req.query;
    let query = 'SELECT id, linea, modelo, producto, rate FROM modelos';
    let params = [];

    if (linea) {
      query += ' WHERE linea = ?';
      params.push(linea);
    }

    query += ' ORDER BY modelo ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('Error en GET /modelos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CRUD: Equipos
// ============================================================================
router.get('/equipos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM equipos ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

router.delete('/equipos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM equipos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Equipo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CRUD: Lineas
// ============================================================================
router.get('/lineas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lineas ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

router.delete('/lineas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM lineas WHERE id = ?', [id]);
    res.json({ success: true, message: 'Linea eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CRUD: Modelos
// ============================================================================
router.post('/modelos', async (req, res) => {
  const { modelo, producto, rate, linea } = req.body;
  if (!modelo || !rate) return res.status(400).json({ error: 'Modelo y rate requeridos' });
  try {
    const [result] = await db.query(
      'INSERT INTO modelos (modelo, producto, rate, linea) VALUES (?, ?, ?, ?)',
      [modelo, producto, rate, linea]
    );
    res.json({ success: true, data: { id: result.insertId, modelo, producto, rate, linea } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/modelos/:id', async (req, res) => {
  const { id } = req.params;
  const { modelo, producto, rate, linea } = req.body;
  if (!modelo || !rate) return res.status(400).json({ error: 'Modelo y rate requeridos' });
  try {
    await db.query(
      'UPDATE modelos SET modelo = ?, producto = ?, rate = ?, linea = ? WHERE id = ?',
      [modelo, producto, rate, linea, id]
    );
    res.json({ success: true, data: { id, modelo, producto, rate, linea } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/modelos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM modelos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Modelo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
