const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function diagnose() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deadtimes',
    };

    console.log('🔍 Diagnostic Report for Deadtimes Production Tab');
    console.log('================================================\n');

    // Connect
    const connection = await mysql.createConnection(config);
    console.log('✅ Database connection successful\n');

    // Check produccion_intervalos table
    console.log('1️⃣  Checking produccion_intervalos table...');
    try {
      const [tables] = await connection.execute(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'produccion_intervalos'",
        [process.env.DB_NAME]
      );
      if (tables.length > 0) {
        console.log('   ✅ Table exists\n');
        
        // Count records
        const [records] = await connection.execute('SELECT COUNT(*) as count FROM produccion_intervalos');
        console.log(`   📊 Total records: ${records[0].count}`);
        
        if (records[0].count > 0) {
          const [sample] = await connection.execute('SELECT * FROM produccion_intervalos LIMIT 1');
          console.log(`   Sample record:\n`, JSON.stringify(sample[0], null, 2));
        } else {
          console.log('   ⚠️  No records found - Table is empty');
        }
      } else {
        console.log('   ❌ Table does NOT exist');
      }
    } catch (err) {
      console.log('   ❌ Error checking table:', err.message);
    }
    console.log('');

    // Check modelos table
    console.log('2️⃣  Checking modelos table...');
    try {
      const [tables] = await connection.execute(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'modelos'",
        [process.env.DB_NAME]
      );
      if (tables.length > 0) {
        console.log('   ✅ Table exists\n');
        
        // Check if linea column exists
        const [columns] = await connection.execute(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'modelos' AND COLUMN_NAME = 'linea'",
          [process.env.DB_NAME]
        );
        
        if (columns.length > 0) {
          console.log('   ✅ linea column exists');
        } else {
          console.log('   ❌ linea column does NOT exist');
        }

        // Count records
        const [records] = await connection.execute('SELECT COUNT(*) as count FROM modelos');
        console.log(`   📊 Total models: ${records[0].count}`);
        
        if (records[0].count > 0) {
          const [sample] = await connection.execute('SELECT * FROM modelos LIMIT 3');
          console.log(`   Sample models:\n`, JSON.stringify(sample, null, 2));
        } else {
          console.log('   ⚠️  No models found');
        }
      } else {
        console.log('   ❌ Table does NOT exist');
      }
    } catch (err) {
      console.log('   ❌ Error checking modelos:', err.message);
    }
    console.log('');

    // Check lineas table
    console.log('3️⃣  Checking lineas table...');
    try {
      const [tables] = await connection.execute(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lineas'",
        [process.env.DB_NAME]
      );
      if (tables.length > 0) {
        console.log('   ✅ Table exists\n');
        
        const [records] = await connection.execute('SELECT COUNT(*) as count FROM lineas');
        console.log(`   📊 Total lines: ${records[0].count}`);
        
        if (records[0].count > 0) {
          const [sample] = await connection.execute('SELECT * FROM lineas LIMIT 3');
          console.log(`   Sample lines:\n`, JSON.stringify(sample, null, 2));
        } else {
          console.log('   ⚠️  No lines found');
        }
      } else {
        console.log('   ❌ Table does NOT exist');
      }
    } catch (err) {
      console.log('   ❌ Error checking lineas:', err.message);
    }
    console.log('');

    // Check if auditor_cambios table exists
    console.log('4️⃣  Checking auditor_cambios table...');
    try {
      const [tables] = await connection.execute(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'auditor_cambios'",
        [process.env.DB_NAME]
      );
      if (tables.length > 0) {
        console.log('   ✅ Table exists\n');
        
        const [records] = await connection.execute('SELECT COUNT(*) as count FROM auditor_cambios');
        console.log(`   📊 Total audit records: ${records[0].count}`);
      } else {
        console.log('   ❌ Table does NOT exist - Create with: schema_extensions.sql');
      }
    } catch (err) {
      console.log('   ❌ Error checking auditor_cambios:', err.message);
    }
    console.log('');

    // Test INSERT produccion_intervalos
    console.log('5️⃣  Testing INSERT into produccion_intervalos...');
    try {
      const testLinea = 'TEST_LINE_01';
      const testFecha = new Date().toISOString().split('T')[0];
      const testTurno = 1;
      const testHora = 8;

      // First try to delete test record if it exists
      await connection.execute(
        'DELETE FROM produccion_intervalos WHERE linea = ? AND fecha = ? AND turno = ? AND hora_inicio = ?',
        [testLinea, testFecha, testTurno, testHora]
      );

      // Now insert
      const [result] = await connection.execute(
        `INSERT INTO produccion_intervalos 
         (linea, fecha, turno, hora_inicio, modelo, producto, rate, rate_acumulado, produccion, produccion_acumulada, scrap, delta, deadtime_minutos, porcentaje_cumplimiento)
         VALUES (?, ?, ?, ?, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0)`,
        [testLinea, testFecha, testTurno, testHora]
      );

      console.log('   ✅ INSERT successful');
      console.log(`   Inserted ID: ${result.insertId}`);

      // Verify by reading back
      const [verifyResult] = await connection.execute(
        'SELECT * FROM produccion_intervalos WHERE linea = ? AND fecha = ? AND turno = ? AND hora_inicio = ?',
        [testLinea, testFecha, testTurno, testHora]
      );

      if (verifyResult.length > 0) {
        console.log('   ✅ Data verified in database\n');
        console.log('   Record:\n', JSON.stringify(verifyResult[0], null, 2));
      } else {
        console.log('   ❌ Record not found after insert!');
      }

      // Clean up
      await connection.execute(
        'DELETE FROM produccion_intervalos WHERE linea = ? AND fecha = ? AND turno = ? AND hora_inicio = ?',
        [testLinea, testFecha, testTurno, testHora]
      );
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }
    console.log('');

    console.log('🏁 Diagnostic complete');
    await connection.end();

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

diagnose();
