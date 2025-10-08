const express = require('express');
const router = express.Router();
const db = require('../db');

// List tickets. Query ?status=open|closed
router.get('/', async (req, res) => {
  const status = req.query.status || 'open';
  try {
    if (status === 'closed') {
      const [rows] = await db.query('SELECT * FROM deadtimes WHERE hc IS NOT NULL ORDER BY hc DESC');
      return res.json(rows);
    } else {
      const [rows] = await db.query('SELECT * FROM deadtimes WHERE hc IS NULL ORDER BY hr DESC');
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
    res.json(rows[0]);
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
    const [result] = await db.query(
      `INSERT INTO deadtimes (hr, descr, modelo, turno, linea, nombre, num_empleado, equipo, mod1, mod2, mod3, mod4, mod5, mod6, mod7, mod8, mod9, mod10, mod11, mod12, pf, pa, clasificacion, clas_others, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hr, descr, modelo, turno, linea, nombre, num_empleado, equipo, ...modValues, pf, pa, clasificacion, clas_others, priority]
    );

    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start/assign ticket: record ha and tecnico (second screen entry step)
router.post('/:id/start', async (req, res) => {
  const id = req.params.id;
  const { tecnico } = req.body;
  try {
    const ha = new Date();
    await db.query('UPDATE deadtimes SET ha = ?, tecnico = ? WHERE id = ?', [ha, tecnico, id]);
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
  const allowed = ['descr','modelo','turno','linea','nombre','num_empleado','equipo','pf','pa','clasificacion','clas_others','priority','tecnico','causa','solucion','rate','deadtime','piezas','e_ser'];
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

// Finish ticket: record hc, compute rate/piezas logic can be provided by client
router.post('/:id/finish', async (req, res) => {
  const id = req.params.id;
  const { causa, solucion, rate, piezas, e_ser } = req.body;
  try {
    const hc = new Date();
    await db.query('UPDATE deadtimes SET hc = ?, causa = ?, solucion = ?, rate = ?, piezas = ?, e_ser = ? WHERE id = ?', [hc, causa, solucion, rate, piezas, e_ser, id]);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
