import pg from 'pg';
const { Pool } = pg;
import "dotenv/config";
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? {
    rejectUnauthorized: false
  } : false
});

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Error: Falta la variable de entorno DATABASE_URL.");
    console.error("👉 TIP: Asegúrate de configurar DATABASE_URL en el panel de control de tu hosting (Hostinger, etc.)");
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
    
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error("❌ Error: No se encontró el archivo supabase_schema.sql en " + schemaPath);
    } else {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      console.log("📜 Ejecutando script de esquema (asegurando tablas)...");
      
      // 1. Renombrar tablas antiguas si existen
      const migrations = [
        "ALTER TABLE IF EXISTS equipment_types RENAME TO equipment",
        "ALTER TABLE IF EXISTS log_details RENAME COLUMN equipment_type_id TO equipment_id",
        "ALTER TABLE IF EXISTS incidents RENAME COLUMN equipment_type_id TO equipment_id",
        "ALTER TABLE IF EXISTS condo_equipment RENAME COLUMN equipment_type_id TO equipment_id",
        "ALTER TABLE IF EXISTS incidents ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id)",
        "ALTER TABLE IF EXISTS incidents ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Media'",
        "UPDATE incidents SET status = 'in_process' WHERE status = 'open' OR status = 'pending'",
        "ALTER TABLE IF EXISTS incidents ALTER COLUMN status SET DEFAULT 'in_process'"
      ];

      for (const migration of migrations) {
        try {
          await client.query(migration);
          console.log(`✅ Migración exitosa: ${migration}`);
        } catch (e) {
          // Ignorar si falla (ej: la tabla/columna ya tiene el nombre nuevo o no existe)
        }
      }

      // 2. Ejecutar el esquema completo
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (stmtErr: any) {
          // Solo loguear si no es un error de "ya existe"
          if (!stmtErr.message.includes("already exists") && !stmtErr.message.includes("already a primary key")) {
            console.error(`❌ Error ejecutando sentencia: ${statement.substring(0, 50)}...`);
            console.error(`Mensaje: ${stmtErr.message}`);
          }
        }
      }
      
      // 3. Verificación final de tablas críticas
      const criticalTables = ['users', 'condos', 'equipment', 'maintenance_logs', 'log_details', 'incidents'];
      for (const table of criticalTables) {
        try {
          await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
          console.log(`✅ Tabla verificada: ${table}`);
        } catch (e: any) {
          console.error(`⚠️ Advertencia: La tabla '${table}' no parece estar lista: ${e.message}`);
        }
      }

      console.log("✅ Proceso de inicialización de base de datos completado.");
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

