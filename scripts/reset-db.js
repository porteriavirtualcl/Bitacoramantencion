import fs from "fs";
import path from "path";
import pg from "pg";
const { Pool } = pg;
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log("🔗 Conectado a Supabase...");

    console.log("🧨 Borrando el esquema público (Eliminando todas las tablas)...");
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log("✅ Esquema limpiado correctamente.");

    console.log("📜 Ejecutando script de creación de tablas limpias...");
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Ejecutar sentencias SQL
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      await client.query(statement);
    }
    
    console.log("✅ Todas las tablas se han vuelto a crear de manera limpia.");
    
  } catch (err) {
    console.error("❌ Error reiniciando base de datos:", err);
  } finally {
    client.release();
    pool.end();
  }
}

resetDatabase();
