const express = require('express');
const router = express.Router();
const db = require('../db');

// Get lineas list
router.get('/lineas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lineas ORDER BY linea');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get descripciones list
router.get('/descripciones', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM descripciones ORDER BY descripcion');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get estadísticas para dashboard
router.get('/stats/atencion', async (req, res) => {
  try {
    // Tiempos de atención promedio por día (últimos 30 días)
    // Solo tickets cerrados (done=1) desde hr (apertura) hasta hc (cierre)
    const [rows] = await db.query(`
      SELECT 
        DATE(hr) as fecha,
        AVG(TIMESTAMPDIFF(MINUTE, hr, hc)) as promedio_minutos,
        COUNT(*) as total_tickets
      FROM deadtimes 
      WHERE done = 1
        AND hc IS NOT NULL 
        AND hr IS NOT NULL
        AND hr >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(hr)
      ORDER BY fecha DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/equipos', async (req, res) => {
  try {
    // Equipos que más fallan (últimos 30 días) - sin tiempo promedio
    const [rows] = await db.query(`
      SELECT 
        equipo,
        COUNT(*) as total_fallas
      FROM deadtimes 
      WHERE hr >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY equipo
      ORDER BY total_fallas DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get equipos list
router.get('/equipos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM equipos ORDER BY equipo');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get modelos list
router.get('/modelos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM modelos ORDER BY modelo');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List tickets. Query ?status=open|closed
router.get('/', async (req, res) => {
  const status = req.query.status || 'open';
  try {
    if (status === 'closed') {
      // Tickets cerrados: done=1
      const [rows] = await db.query('SELECT * FROM deadtimes WHERE done = 1 ORDER BY hc DESC LIMIT 100');
      return res.json(rows);
    } else {
      // Tickets abiertos: done=0 (ya no verificamos NULL porque ahora siempre se asigna 0 al crear)
      const [rows] = await db.query('SELECT * FROM deadtimes WHERE done = 0 ORDER BY hr DESC');
      return res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    const row = rows[0];
    // compute minutos if hc present
    let minutos = null;
    if (row.hr && row.hc) {
      const diffMs = new Date(row.hc).getTime() - new Date(row.hr).getTime();
      minutos = Math.max(0, Math.round(diffMs / 60000));
    }
    // normalize numeric fields
    row.rate = row.rate !== null ? Number(row.rate) : null;
    row.piezas = row.piezas !== null ? Number(row.piezas) : null;
    row.deadtime = row.deadtime !== null ? Number(row.deadtime) : null;
    if (minutos !== null) row.minutos = minutos;
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create new ticket (first screen)
router.post('/', async (req, res) => {
  const body = req.body;
  const {
    descr,
    modelo,
    turno,
    linea,
    nombre,
    num_empleado,
    equipo,
    mods = {},
    pf,
    pa,
    clasificacion,
    clas_others,
    priority
  } = body;

  // Build mods array mod1..mod12
  const modValues = [];
  for (let i = 1; i <= 12; i++) {
    modValues.push(mods[`mod${i}`] ? 1 : 0);
  }

  try {
    const hr = new Date();
    // Normalize modelo + lado into single modelo field if lado provided
    // frontend now may send 'lado' separately (TOP/BOT)
    const lado = body.lado || '';
    const storedModelo = modelo ? (lado ? `${modelo} ${lado}` : modelo) : '';

    // The frontend swapped meanings (pf = sección afectada (Equipo/Linea), pa = condición de paro (Intermitente/Total)).
    // DB schema expects pf ENUM('Total','Intermitente') and pa ENUM('Equipo','Linea').
    // So map accordingly: dbPf <- pa, dbPa <- pf
  const dbPf = pa && pa.length ? pa : null; // DB expects 'Total'|'Intermitente' for pf
  const dbPa = pf && pf.length ? pf : null; // DB expects 'Equipo'|'Linea' for pa

  // Store priority directly (frontend now only selects the option, no extra free text for 'ceda prioridad')
  const storedPriority = priority || null;
    const [result] = await db.query(
      `INSERT INTO deadtimes (hr, descr, modelo, turno, linea, nombre, num_empleado, equipo, mod1, mod2, mod3, mod4, mod5, mod6, mod7, mod8, mod9, mod10, mod11, mod12, pf, pa, clasificacion, clas_others, priority, done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hr, descr, storedModelo, turno, linea, nombre, num_empleado, equipo, ...modValues, dbPf, dbPa, clasificacion, clas_others, storedPriority, 0]
    );

    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start/assign ticket: record ha, tecnico and num_empleado1 (second screen entry step)
router.post('/:id/start', async (req, res) => {
  const id = req.params.id;
  const { tecnico, num_empleado1 } = req.body;
  try {
    const ha = new Date();
    await db.query('UPDATE deadtimes SET ha = ?, tecnico = ?, num_empleado1 = ? WHERE id = ?', [ha, tecnico, num_empleado1 || null, id]);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update (edit) ticket partially
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  // For simplicity allow updating a set of known fields
  const fields = [];
  const values = [];
  const allowed = ['descr','modelo','turno','linea','nombre','num_empleado','equipo','pf','pa','clasificacion','clas_others','priority','tecnico','num_empleado1','causa','solucion','rate','deadtime','piezas','e_ser'];
  allowed.forEach(k => {
    if (k in body) {
      fields.push(`${k} = ?`);
      values.push(body[k]);
    }
  });

  // mods
  for (let i = 1; i <= 12; i++) {
    const key = `mod${i}`;
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key] ? 1 : 0);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'no fields' });

  values.push(id);
  try {
    await db.query(`UPDATE deadtimes SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Finish ticket: record hc, compute piezas (from minutos) and deadtime server-side to avoid client-side truncation issues
router.post('/:id/finish', async (req, res) => {
  const id = req.params.id;
  // accept either 'piezas' (legacy) or 'minutos' (new) from client
  const { causa, solucion, rate, piezas, minutos, e_ser } = req.body;
  try {
    const hc = new Date();

    // fetch the original hr to compute elapsed minutes
    const [origRows] = await db.query('SELECT hr FROM deadtimes WHERE id = ?', [id]);
    const hr = origRows && origRows[0] ? origRows[0].hr : null;

    const rateNum = Number(rate) || 0;
    let piezasCalc = 0;
    let minutosCalc = 0;

    if (hr) {
      const diffMs = new Date(hc).getTime() - new Date(hr).getTime();
      minutosCalc = Math.max(0, Math.round(diffMs / 60000)); // minutes
      // piezas = (rate / 60) * minutos
      piezasCalc = Math.round((rateNum / 60) * minutosCalc);
    } else {
      // fallback: use provided piezas or minutos if client sent them (legacy)
      if (typeof minutos !== 'undefined' && minutos !== null && minutos !== '') {
        const minutosNum = Number(minutos) || 0;
        minutosCalc = minutosNum;
        piezasCalc = Math.round((rateNum / 60) * minutosNum);
      } else {
        piezasCalc = Number(piezas) || 0;
      }
    }

    // deadtime = rate / piezas  (store as integer, 0 if piezasCalc === 0)
    const deadtimeCalc = piezasCalc > 0 ? Math.round(rateNum / piezasCalc) : 0;

    await db.query('UPDATE deadtimes SET hc = ?, causa = ?, solucion = ?, rate = ?, piezas = ?, deadtime = ?, e_ser = ?, done = 1 WHERE id = ?', [hc, causa, solucion, rateNum, piezasCalc, deadtimeCalc, e_ser || null, id]);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
