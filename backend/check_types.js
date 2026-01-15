const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function checkDataTypes() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deadtimes',
    };

    const connection = await mysql.createConnection(config);
    
    console.log('🔍 Checking data types from produccion_intervalos');
    console.log('==================================================\n');

    const [rows] = await connection.execute(
      `SELECT 
        id,
        deadtime_minutos,
        justificado_minutos,
        tiempo_no_justificado
      FROM produccion_intervalos 
      LIMIT 1`
    );

    if (rows.length > 0) {
      const row = rows[0];
      console.log('Row from database:');
      console.log(JSON.stringify(row, null, 2));
      console.log('');
      console.log('Type analysis:');
      console.log('  deadtime_minutos:', typeof row.deadtime_minutos, row.deadtime_minutos);
      console.log('  justificado_minutos:', typeof row.justificado_minutos, row.justificado_minutos);
      console.log('  tiempo_no_justificado:', typeof row.tiempo_no_justificado, row.tiempo_no_justificado);
    }

    // Test the reduce function
    const [testRows] = await connection.execute(
      `SELECT 
        deadtime_minutos,
        justificado_minutos,
        tiempo_no_justificado
      FROM produccion_intervalos 
      LIMIT 5`
    );

    console.log('\nTesting reduce with 5 rows:');
    const deadtime_sum_concat = testRows.reduce((sum, r) => sum + (r.deadtime_minutos || 0), 0);
    const deadtime_sum_float = testRows.reduce((sum, r) => sum + (parseFloat(r.deadtime_minutos) || 0), 0);
    
    console.log('String concatenation result:', deadtime_sum_concat);
    console.log('Float addition result:', deadtime_sum_float);

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDataTypes();
