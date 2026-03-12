import mysql from 'mysql2/promise';
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function initDb() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    console.error("❌ Error: Faltan variables de entorno para MySQL (MYSQL_HOST, MYSQL_USER o MYSQL_DATABASE).");
    console.warn("La base de datos no se inicializará.");
    return;
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log("📡 Conexión exitosa con MySQL. Inicializando esquema...");
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        must_change_password TINYINT(1) DEFAULT 0
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS condos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipment_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS condo_equipment (
        condo_id INT,
        equipment_type_id INT,
        PRIMARY KEY (condo_id, equipment_type_id),
        FOREIGN KEY (condo_id) REFERENCES condos(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tech_condos (
        user_id INT,
        condo_id INT,
        PRIMARY KEY (user_id, condo_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (condo_id) REFERENCES condos(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        condo_id INT,
        tech_id INT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status VARCHAR(50) DEFAULT 'pending',
        log_type VARCHAR(50) DEFAULT 'mantenimiento',
        problem_description TEXT,
        actions_taken TEXT,
        FOREIGN KEY (condo_id) REFERENCES condos(id),
        FOREIGN KEY (tech_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS log_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        log_id INT,
        equipment_type_id INT,
        status VARCHAR(50),
        observations TEXT,
        FOREIGN KEY (log_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        condo_id INT NOT NULL,
        equipment_type_id INT NOT NULL,
        operator_id INT NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (condo_id) REFERENCES condos(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await connection.query("ALTER TABLE incidents ADD COLUMN resolved_at DATETIME");
    } catch (e) {
      // Column might already exist
    }

    console.log("MySQL Database Schema initialized successfully.");
  } catch (err: any) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("\n❌ ERROR DE ACCESO A MYSQL (HOSTINGER):");
      console.error("1. Verifica que el usuario y la contraseña sean correctos.");
      console.error("2. IMPORTANTE: En Hostinger, debes ir a 'Remote MySQL' y permitir el acceso para la IP: 34.34.225.43 (o usa '%' para permitir todas las IPs).");
      console.error("3. Asegúrate de que el nombre de la base de datos sea el correcto.\n");
    } else {
      console.error("Error initializing MySQL database:", err);
    }
    throw err; // Re-throw to be caught by startServer
  } finally {
    if (connection) connection.release();
  }
}

export default pool;
