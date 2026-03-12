import pg from 'pg';
const { Pool } = pg;
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Error: Falta la variable de entorno DATABASE_URL para Supabase.");
    return;
  }

  if (dbUrl.includes("[YOUR-PASSWORD]") || dbUrl.includes("[TU-PASSWORD]")) {
    console.error("❌ Error: La DATABASE_URL todavía contiene un marcador de posición ([YOUR-PASSWORD]). Debes reemplazarlo con tu contraseña real en Settings -> Secrets.");
    return;
  }

  try {
    const client = await pool.connect();
    console.log("📡 Conexión exitosa con Supabase (PostgreSQL).");
    client.release();
  } catch (err: any) {
    console.error("Error conectando a Supabase:", err.message);
    throw err;
  }
}

export default {
  execute: async (sql: string, params: any[] = []) => {
    // Convert MySQL style "?" to PostgreSQL style "$1, $2..."
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`);
    const result = await pool.query(pgSql, params);
    return [result.rows, result];
  }
};

