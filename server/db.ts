import pg from 'pg';
const { Pool } = pg;
import "dotenv/config";
import fs from 'fs';
import path from 'path';

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
    console.log("🔗 Intentando conectar a la base de datos...");
    const client = await pool.connect();
    console.log("📡 Conexión exitosa con Supabase (PostgreSQL).");
    
    // Check if tables exist by checking for 'users' table in public schema
    console.log("🔍 Verificando existencia de tablas...");
    const res = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
    
    console.log(`📊 Resultado de búsqueda de tabla 'users': ${res.rows.length} filas encontradas.`);
    
    if (res.rows.length === 0) {
      console.log("🏗️ No se encontró la tabla 'users'. Inicializando esquema de base de datos...");
      const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error("❌ Error: No se encontró el archivo supabase_schema.sql en " + schemaPath);
      } else {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log("📜 Ejecutando script de esquema...");
        
        // Split schema into individual statements
        // This is a simple split, might not handle complex cases but should work for this schema
        const statements = schema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          try {
            await client.query(statement);
          } catch (stmtErr: any) {
            console.error(`❌ Error ejecutando sentencia: ${statement.substring(0, 50)}...`);
            console.error(`Mensaje: ${stmtErr.message}`);
          }
        }
        
        console.log("✅ Esquema procesado.");
      }
    } else {
      console.log("✅ Las tablas ya existen. Saltando inicialización.");
    }

    client.release();
  } catch (err: any) {
    console.error("❌ Error conectando a Supabase:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("👉 TIP: Revisa que la contraseña en DATABASE_URL sea correcta y no contenga caracteres especiales sin codificar.");
    }
    throw err;
  }
}

export default {
  execute: async (sql: string, params: any[] = []) => {
    try {
      // Convert MySQL style "?" to PostgreSQL style "$1, $2..."
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const result = await pool.query(pgSql, params);
      return [result.rows, result];
    } catch (err: any) {
      console.error("❌ Database Query Error:", err.message);
      console.error("SQL:", sql);
      console.error("Params:", params);
      throw err;
    }
  }
};

