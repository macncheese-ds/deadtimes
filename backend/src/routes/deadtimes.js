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

// Función para normalizar entrada de empleado
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

// Función para validar credenciales (Basic Auth)
async function validateCredentials(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { valid: false, error: 'No authorization header' };
  }

  try {
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
    const [employee_input, password] = credentials.split(':');

    if (!employee_input || !password) {
      return { valid: false, error: 'Invalid credentials format' };
    }

    const normalized = normalizeEmployeeInput(employee_input);
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT num_empleado, pass_hash FROM users WHERE num_empleado = ? LIMIT 1',
      [normalized]
    );
    await conn.end();

    if (!rows || rows.length === 0) {
      return { valid: false, error: 'User not found' };
    }

    const passwordMatch = await bcrypt.compare(password, rows[0].pass_hash.toString());
    if (!passwordMatch) {
      return { valid: false, error: 'Invalid password' };
    }

    return { valid: true, num_empleado: rows[0].num_empleado };
  } catch (err) {
    console.error('Error validating credentials:', err);
    return { valid: false, error: err.message };
  }
}

// Lista base de roles para operaciones de tickets
// Base: ['Ingeniero', 'Técnico', 'AOI', 'Supervisor', 'Líder', 'Soporte', 'Mantenimiento']

// Roles permitidos para crear tickets (toda la lista base incluyendo Líder)
const ROLES_CREAR_TICKETS = ['Ingeniero', 'Tecnico', 'Técnico', 'AOI', 'Supervisor', 'Lider', 'Líder', 'Soporte', 'Mantenimiento', 'The Goat'];

// Roles permitidos para cerrar/atender tickets (lista base EXCEPTO Líder)
const ROLES_ATENDER_TICKETS = ['Ingeniero', 'Tecnico', 'Técnico', 'AOI', 'Supervisor', 'Soporte', 'Mantenimiento', 'The Goat'];

// Función para validar si un usuario puede crear tickets
async function validarRolParaCrear(num_empleado) {
  try {
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT rol FROM users WHERE num_empleado = ? LIMIT 1',
      [num_empleado]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) return false;
    return ROLES_CREAR_TICKETS.includes(rows[0].rol);
  } catch (err) {
    console.error('Error validando rol para crear:', err);
    return false;
  }
}

// Función para validar si un usuario puede atender tickets
async function validarRolParaAtender(num_empleado) {
  try {
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT rol FROM users WHERE num_empleado = ? LIMIT 1',
      [num_empleado]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) return false;
    return ROLES_ATENDER_TICKETS.includes(rows[0].rol);
  } catch (err) {
    console.error('Error validando rol para atender:', err);
    return false;
  }
}

// Función para validar si un usuario puede actualizar tickets
async function validarRolParaActualizar(num_empleado) {
  try {
    const conn = await createCredConnection();
    const [rows] = await conn.execute(
      'SELECT rol FROM users WHERE num_empleado = ? LIMIT 1',
      [num_empleado]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) return false;
    // Solo Ingeniero puede actualizar tickets
    const rolesParaActualizar = ['Ingeniero', 'The Goat'];
    return rolesParaActualizar.includes(rows[0].rol);
  } catch (err) {
    console.error('Error validando rol para actualizar:', err);
    return false;
  }
}

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

// Handler to get descripciones list (optionally filtered by equipo)
const getDescripcionHandler = async (req, res) => {
  try {
    const { equipo } = req.query;
    if (equipo) {
      const [rows] = await db.query('SELECT * FROM descripcion WHERE equipo = ? ORDER BY descripcion', [equipo]);
      return res.json(rows);
    }
    const [rows] = await db.query('SELECT * FROM descripcion ORDER BY descripcion');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get descripciones (singular) and alias `descripciones` for backwards compatibility
router.get('/descripcion', getDescripcionHandler);
router.get('/descripciones', getDescripcionHandler);

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
    // Agrupamos por TRIM(equipo) para evitar duplicados por espacios
    const [rows] = await db.query(`
      SELECT 
        TRIM(equipo) as equipo,
        SUM(cnt) as total_fallas
      FROM (
        SELECT equipo, COUNT(*) as cnt
        FROM deadtimes 
        WHERE hr >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY equipo
      ) sub
      GROUP BY TRIM(equipo)
      ORDER BY total_fallas DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas por línea con filtros de fecha
router.get('/stats/linea', async (req, res) => {
  try {
    const { linea, startDate, endDate, days = 30 } = req.query;
    
    // Si days es 'custom', usar valor por defecto de 30
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    // Tickets totales, abiertos, cerrados por línea
    const query = `
      SELECT 
        linea,
        COUNT(*) as total_tickets,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as cerrados,
        SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) as abiertos,
        AVG(CASE WHEN done = 1 AND hc IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, hr, hc) END) as promedio_minutos,
        SUM(CASE WHEN done = 1 THEN piezas ELSE 0 END) as total_piezas_perdidas
      FROM deadtimes 
      WHERE ${dateCondition} ${lineaCondition}
      GROUP BY linea
      ORDER BY linea
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas por equipo con filtros
router.get('/stats/equipos-detalle', async (req, res) => {
  try {
    const { linea, startDate, endDate, days = 30 } = req.query;
    
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    const query = `
      SELECT 
        equipo,
        linea,
        COUNT(*) as total_fallas,
        AVG(CASE WHEN done = 1 AND hc IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, hr, hc) END) as promedio_minutos,
        SUM(CASE WHEN done = 1 THEN piezas ELSE 0 END) as total_piezas_perdidas
      FROM deadtimes 
      WHERE ${dateCondition} ${lineaCondition}
      GROUP BY equipo, linea
      ORDER BY total_fallas DESC
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas de tickets por día para gráfica de tendencia
router.get('/stats/tendencia', async (req, res) => {
  try {
    const { linea, startDate, endDate, days = 30 } = req.query;
    
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    const query = `
      SELECT 
        DATE(hr) as fecha,
        linea,
        COUNT(*) as total_tickets,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as cerrados,
        AVG(CASE WHEN done = 1 AND hc IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, hr, hc) END) as promedio_minutos,
        SUM(CASE WHEN done = 1 THEN piezas ELSE 0 END) as piezas_perdidas
      FROM deadtimes 
      WHERE ${dateCondition} ${lineaCondition}
      GROUP BY DATE(hr), linea
      ORDER BY fecha DESC, linea
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas por clasificación
router.get('/stats/clasificacion', async (req, res) => {
  try {
    const { linea, startDate, endDate, days = 30 } = req.query;
    
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    const query = `
      SELECT 
        COALESCE(clasificacion, 'No especificado') as clasificacion,
        linea,
        COUNT(*) as total_tickets,
        AVG(CASE WHEN done = 1 AND hc IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, hr, hc) END) as promedio_minutos
      FROM deadtimes 
      WHERE ${dateCondition} ${lineaCondition}
      GROUP BY clasificacion, linea
      ORDER BY total_tickets DESC
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Totales generales
router.get('/stats/totales', async (req, res) => {
  try {
    const { linea, startDate, endDate, days = 30 } = req.query;
    
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as cerrados,
        SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) as abiertos,
        AVG(CASE WHEN done = 1 AND hc IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, hr, hc) END) as promedio_minutos_global,
        SUM(CASE WHEN done = 1 THEN piezas ELSE 0 END) as total_piezas_perdidas,
        SUM(CASE WHEN done = 1 THEN deadtime ELSE 0 END) as total_deadtime
      FROM deadtimes 
      WHERE ${dateCondition} ${lineaCondition}
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows[0] || {});
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

// Get detailed tickets by equipment name (for drill-down in analytics)
router.get('/stats/tickets-by-equipment', async (req, res) => {
  try {
    const { equipo, linea, startDate, endDate, days = 30, limit } = req.query;
    
    const daysNum = (days === 'custom' || isNaN(days)) ? 30 : parseInt(days, 10);
    let dateCondition = `hr >= DATE_SUB(CURDATE(), INTERVAL ${daysNum} DAY)`;
    const params = [];
    
    // Condición de equipo (opcional - si no se especifica, muestra todos)
    let equipoCondition = '';
    if (equipo && equipo !== 'all' && equipo !== 'sin_otros') {
      equipoCondition = 'AND equipo = ?';
    } else if (equipo === 'sin_otros') {
      equipoCondition = 'AND LOWER(equipo) NOT LIKE ?';
    }
    
    if (startDate && endDate) {
      dateCondition = 'hr >= ? AND hr <= ?';
      params.push(startDate, endDate);
    }
    
    // Agregar equipo a params si está especificado
    if (equipo && equipo !== 'all' && equipo !== 'sin_otros') {
      params.push(equipo);
    } else if (equipo === 'sin_otros') {
      params.push('%otro%');
    }
    
    let lineaCondition = '';
    if (linea) {
      lineaCondition = 'AND linea = ?';
      params.push(linea);
    }
    
    // Add LIMIT clause if specified (for top N tickets)
    const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';
    
    const query = `
      SELECT 
        id,
        descr,
        modelo,
        linea,
        equipo,
        clasificacion,
        hr,
        hc,
        tecnico,
        nombre,
        TIMESTAMPDIFF(MINUTE, hr, hc) as duracion_minutos,
        piezas,
        deadtime,
        solucion
      FROM deadtimes 
      WHERE done = 1 AND ${dateCondition} ${equipoCondition} ${lineaCondition}
      ORDER BY TIMESTAMPDIFF(MINUTE, hr, hc) DESC
      ${limitClause}
    `;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get modelos list - filtrar por línea si se especifica
// Retorna: id, modelo, producto, linea, rate (campo 'lado' eliminado - está en el nombre del modelo)
router.get('/modelos', async (req, res) => {
  try {
    const { linea } = req.query;
    if (linea) {
      // Filtrar modelos por línea específica
      const [rows] = await db.query(
        'SELECT id, modelo, producto, linea, rate FROM modelos WHERE linea = ? ORDER BY modelo',
        [linea]
      );
      return res.json(rows);
    }
    // Sin filtro, retornar todos los modelos
    const [rows] = await db.query('SELECT id, modelo, producto, linea, rate FROM modelos ORDER BY modelo');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get modelo específico por nombre - retorna todos sus datos
router.get('/modelos/:nombre', async (req, res) => {
  try {
    const nombre = req.params.nombre;
    const [rows] = await db.query(
      'SELECT id, modelo, producto, linea, rate FROM modelos WHERE modelo = ? LIMIT 1',
      [nombre]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }
    res.json(rows[0]);
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
      const [rows] = await db.query('SELECT * FROM deadtimes WHERE done = 1 ORDER BY hc DESC');
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
// El campo 'lado' ya no se usa - está incluido en el nombre del modelo
router.post('/', async (req, res) => {
  const body = req.body;
  console.log('CREATE TICKET - Received body:', JSON.stringify(body, null, 2));
  
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
    rate       // Viene de la tabla modelos (auto-rellenado en frontend)
  } = body;

  // REGLA DE NEGOCIO: Validar que el usuario tenga rol permitido para crear tickets
  if (num_empleado) {
    const puedeCrear = await validarRolParaCrear(num_empleado);
    if (!puedeCrear) {
      return res.status(403).json({ 
        error: 'No tienes permisos para crear tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Líder, Soporte, Mantenimiento.' 
      });
    }
  }

  // Build mods array mod1..mod12
  // Frontend sends keys like 'Montadora1', 'Montadora2', etc.
  const modValues = [];
  for (let i = 1; i <= 12; i++) {
    modValues.push(mods[`Montadora${i}`] || mods[`mod${i}`] ? 1 : 0);
  }

  try {
    const hr = new Date();
    // El modelo viene completo con BOT/TOP ya incluido en el nombre
    const storedModelo = modelo || '';
    
    // Rate viene de la tabla modelos (se guarda al crear el ticket)
    const rateValue = rate ? Number(rate) : null;

    // The frontend swapped meanings (pf = sección afectada (Equipo/Linea), pa = condición de paro (Intermitente/Total)).
    // DB schema expects pf ENUM('Total','Intermitente') and pa ENUM('Equipo','Linea').
    // So map accordingly: dbPf <- pa, dbPa <- pf
    const dbPf = pa && pa.length ? pa : null; // DB expects 'Total'|'Intermitente' for pf
    const dbPa = pf && pf.length ? pf : null; // DB expects 'Equipo'|'Linea' for pa

    console.log('CREATE TICKET - Values to insert:', {
      hr, descr, storedModelo, turno, linea, nombre, num_empleado, equipo,
      modValues, dbPf, dbPa, clasificacion, clas_others, rateValue
    });

    // Incluir rate en el INSERT (viene de la tabla modelos)
    const [result] = await db.query(
      `INSERT INTO deadtimes (hr, descr, modelo, turno, linea, nombre, num_empleado, equipo, mod1, mod2, mod3, mod4, mod5, mod6, mod7, mod8, mod9, mod10, mod11, mod12, pf, pa, clasificacion, clas_others, rate, done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hr, descr, storedModelo, turno, linea, nombre, num_empleado, equipo, ...modValues, dbPf, dbPa, clasificacion, clas_others, rateValue, 0]
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
  
  // REGLA DE NEGOCIO: Validar que el usuario tenga rol permitido para atender tickets
  if (num_empleado1) {
    const puedeAtender = await validarRolParaAtender(num_empleado1);
    if (!puedeAtender) {
      return res.status(403).json({ 
        error: 'No tienes permisos para cerrar tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Soporte, Mantenimiento.' 
      });
    }
  }
  
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

  // Validar autenticación
  const authResult = await validateCredentials(req.headers.authorization);
  if (!authResult.valid) {
    return res.status(401).json({ error: authResult.error || 'Unauthorized' });
  }

  // Validar que el usuario tenga permiso para actualizar tickets
  const canUpdate = await validarRolParaActualizar(authResult.num_empleado);
  if (!canUpdate) {
    return res.status(403).json({ error: 'No tienes permiso para actualizar tickets. Solo Ingenieros pueden hacerlo.' });
  }

  try {
    // Fetch the current ticket to get rate and other info
    const [currentRows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    if (!currentRows || currentRows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const currentTicket = currentRows[0];

    // For simplicity allow updating a set of known fields
    const fields = [];
    const values = [];
    const allowed = ['descr','modelo','turno','linea','nombre','num_empleado','equipo','pf','pa','clasificacion','clas_others','tecnico','num_empleado1','solucion','rate','hr','hc'];
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

    // Si se actualiza hr o hc, calcular automáticamente piezas y deadtime
    const hrValue = body.hr !== undefined ? body.hr : currentTicket.hr;
    const hcValue = body.hc !== undefined ? body.hc : currentTicket.hc;
    const rateValue = body.rate !== undefined ? Number(body.rate) : (currentTicket.rate || 0);

    if (hrValue && hcValue && (body.hr !== undefined || body.hc !== undefined)) {
      // Calcular minutos entre hr y hc
      const hrDate = new Date(hrValue);
      const hcDate = new Date(hcValue);
      const minutosCalc = Math.max(0, Math.round((hcDate.getTime() - hrDate.getTime()) / 60000));
      
      // Calcular piezas = (rate / 60) * minutos
      const piezasCalc = Math.round((rateValue / 60) * minutosCalc);
      
      // deadtime = minutos
      const deadtimeCalc = minutosCalc;
      
      // Agregar estos campos al update
      fields.push('piezas = ?');
      values.push(piezasCalc);
      fields.push('deadtime = ?');
      values.push(deadtimeCalc);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'no fields' });

    values.push(id);
    await db.query(`UPDATE deadtimes SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Finish ticket: record hc, compute piezas (from minutos) and deadtime server-side
// Rate ahora viene de la tabla modelos (guardado en el ticket al crearlo o consultado)
router.post('/:id/finish', async (req, res) => {
  const id = req.params.id;
  // accept either 'piezas' (legacy) or 'minutos' (new) from client
  // rate puede venir del cliente (desde tabla modelos) o ya estar guardado en el ticket
  const { solucion, rate, piezas, minutos } = req.body;
  try {
    const hc = new Date();

    // Fetch the original hr and rate from the ticket
    const [origRows] = await db.query('SELECT hr, rate as ticket_rate FROM deadtimes WHERE id = ?', [id]);
    const hr = origRows && origRows[0] ? origRows[0].hr : null;
    
    // Usar rate del request, o el rate ya guardado en el ticket, o 0
    const rateNum = Number(rate) || Number(origRows[0]?.ticket_rate) || 0;
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

    // deadtime (tiempo perdido) = minutos desde apertura (hr) hasta cierre (hc)
    const deadtimeCalc = minutosCalc;

    await db.query('UPDATE deadtimes SET hc = ?, solucion = ?, rate = ?, piezas = ?, deadtime = ?, done = 1 WHERE id = ?', [hc, solucion, rateNum, piezasCalc, deadtimeCalc, id]);
    const [rows] = await db.query('SELECT * FROM deadtimes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el TOP de tiempos perdidos agrupados por máquina y causa
router.get('/analisis/top-tiempos', async (req, res) => {
  const { maquina } = req.query;
  try {
    // Usar la tabla deadtimes con los campos correctos
    // equipo = máquina, clasificacion o descr = causa, calcular duración
    let query = `
      SELECT 
        equipo AS maquina, 
        COALESCE(clasificacion, descr) AS causa, 
        SUM(COALESCE(deadtime, TIMESTAMPDIFF(MINUTE, hr, COALESCE(hc, NOW())))) AS tiempo_total,
        COUNT(*) AS total_tickets
      FROM deadtimes
      WHERE done = 1
    `;
    
    const params = [];
    if (maquina) {
      query += ' AND equipo = ?';
      params.push(maquina);
    }
    
    query += `
      GROUP BY equipo, COALESCE(clasificacion, descr)
      ORDER BY tiempo_total DESC
      LIMIT 20
    `;

    const [rows] = await db.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener el TOP de tiempos perdidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
