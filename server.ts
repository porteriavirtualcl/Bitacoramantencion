import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import db, { initDb } from "./server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "porteria-virtual-secret-123";

// Web Push Configuration
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contacto@porteriavirtual.cl",
    vapidPublicKey,
    vapidPrivateKey
  );
}

const sendPushNotification = async (userId: number, payload: any) => {
  try {
    const [subscriptions]: any = await db.execute(
      "SELECT subscription FROM push_subscriptions WHERE user_id = ?",
      [userId]
    );

    const notificationPayload = JSON.stringify(payload);

    const promises = subscriptions.map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, notificationPayload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or no longer valid
          await db.execute(
            "DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?",
            [userId, JSON.stringify(row.subscription)]
          );
        } else {
          console.error("Error sending push notification:", err);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Error in sendPushNotification:", err);
  }
};

const generateIncidentPDF = (incident: any): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Reporte de Incidencia - ${incident.condo_name}`,
        Author: 'Portería Virtual',
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // --- Header ---
    const logoX = 50;
    const logoY = 45;
    const logoSize = 50;
    const cyan = "#00AEEF";
    const gray = "#808285";

    doc.lineWidth(3).strokeColor(cyan);
    doc.moveTo(logoX, logoY + 12).lineTo(logoX, logoY).lineTo(logoX + 12, logoY).stroke();
    doc.moveTo(logoX + logoSize - 12, logoY).lineTo(logoX + logoSize, logoY).lineTo(logoX + logoSize, logoY + 12).stroke();
    doc.moveTo(logoX + logoSize, logoY + logoSize - 12).lineTo(logoX + logoSize, logoY + logoSize).lineTo(logoX + logoSize - 12, logoY + logoSize).stroke();
    doc.moveTo(logoX + 12, logoY + logoSize).lineTo(logoX, logoY + logoSize).lineTo(logoX, logoY + logoSize - 12).stroke();

    doc.fillColor(gray).fontSize(18).text("portería ", 110, 55, { continued: true, bold: true } as any)
       .fillColor(cyan).text("virtual");
    doc.fillColor("#666666").fontSize(10).text("Control de Acceso", 110, 75);
    doc.fillColor("#666666").fontSize(10).text("contacto@porteriavirtual.cl | www.porteriavirtual.cl", 110, 88);

    doc.moveDown(2);
    doc.rect(50, 110, 495, 30).fill("#FEF2F2");
    doc.fillColor("#991B1B").fontSize(14).text("REPORTE DE INCIDENCIA DETECTADA", 50, 118, { align: "center", bold: true } as any);

    doc.moveDown(3);
    const startY = 160;
    
    doc.fillColor("#374151").fontSize(10).text("DATOS DEL CONDOMINIO", 50, startY, { underline: true, bold: true } as any);
    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(11).text(`Condominio:`, { continued: true, bold: true } as any).font('Helvetica').text(` ${incident.condo_name}`);
    doc.text(`Ubicación:`, { continued: true, bold: true } as any).text(` Región Metropolitana, Chile`);
    
    doc.fillColor("#374151").fontSize(10).text("DATOS DEL REPORTE", 320, startY, { underline: true, bold: true } as any);
    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(11).text(`Operador:`, 320, doc.y, { continued: true, bold: true } as any).font('Helvetica').text(` ${incident.operator_name}`);
    doc.text(`Fecha:`, { continued: true, bold: true } as any).text(` ${new Date(incident.created_at).toLocaleDateString('es-CL')}`);
    doc.text(`Hora:`, { continued: true, bold: true } as any).text(` ${new Date(incident.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
    doc.text(`ID Incidencia:`, { continued: true, bold: true } as any).text(` #INC-${incident.id.toString().padStart(5, '0')}`);
    if (incident.status === 'resolved' && incident.resolved_at) {
      doc.text(`Fecha Cierre:`, { continued: true, bold: true } as any).text(` ${new Date(incident.resolved_at).toLocaleDateString('es-CL')} ${new Date(incident.resolved_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
    }

    doc.moveDown(2);
    doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fillColor("#991B1B").fontSize(12).text("DETALLE DEL PROBLEMA", { bold: true } as any);
    doc.moveDown();

    doc.fillColor("#374151").fontSize(10).text("EQUIPO AFECTADO:", { bold: true } as any);
    doc.fillColor("#111827").fontSize(11).text(incident.equipment_name);
    doc.moveDown();

    doc.fillColor("#374151").fontSize(10).text("DESCRIPCIÓN DE LA INCIDENCIA:", { bold: true } as any);
    doc.rect(50, doc.y + 5, 495, 100).fill("#F9FAFB");
    doc.fillColor("#111827").fontSize(11).text(incident.description, 60, doc.y + 15, { width: 475 });

    doc.moveDown(8);
    doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();
    doc.fillColor("#6B7280").fontSize(9).text("Este reporte ha sido generado automáticamente por el sistema de Portería Virtual tras la detección de una anomalía por parte del personal de operación.", { align: "center" });

    doc.end();
  });
};

// Reusable PDF Generation Function
const generateLogPDF = (log: any, details: any[]): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Reporte de Mantención - ${log.condo_name}`,
        Author: 'Portería Virtual',
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // --- Header ---
    const logoX = 50;
    const logoY = 45;
    const logoSize = 50;
    const cornerSize = 12;
    const cyan = "#00AEEF";
    const gray = "#808285";

    doc.lineWidth(3).strokeColor(cyan);
    doc.moveTo(logoX, logoY + cornerSize).lineTo(logoX, logoY).lineTo(logoX + cornerSize, logoY).stroke();
    doc.moveTo(logoX + logoSize - cornerSize, logoY).lineTo(logoX + logoSize, logoY).lineTo(logoX + logoSize, logoY + cornerSize).stroke();
    doc.moveTo(logoX + logoSize, logoY + logoSize - cornerSize).lineTo(logoX + logoSize, logoY + logoSize).lineTo(logoX + logoSize - cornerSize, logoY + logoSize).stroke();
    doc.moveTo(logoX + cornerSize, logoY + logoSize).lineTo(logoX, logoY + logoSize).lineTo(logoX, logoY + logoSize - cornerSize).stroke();

    doc.lineWidth(2).strokeColor(gray);
    doc.moveTo(logoX + 13, logoY + 28)
       .bezierCurveTo(logoX + 13, logoY + 15, logoX + 37, logoY + 15, logoX + 37, logoY + 28)
       .stroke();
    doc.rect(logoX + 10, logoY + 25, 4, 8).fill(gray);
    doc.rect(logoX + 36, logoY + 25, 4, 8).fill(gray);
    doc.lineWidth(1).strokeColor(gray).moveTo(logoX + 14, logoY + 33).quadraticCurveTo(logoX + 18, logoY + 38, logoX + 25, logoY + 38).stroke();
    
    doc.fillColor(gray).fontSize(18).text("portería ", 110, 55, { continued: true, bold: true } as any)
       .fillColor(cyan).text("virtual");
    doc.fillColor("#666666").fontSize(10).text("Control de Acceso", 110, 75);
    doc.fillColor("#666666").fontSize(10).text("contacto@porteriavirtual.cl | www.porteriavirtual.cl", 110, 88);

    doc.moveDown(2);
    doc.rect(50, 110, 495, 30).fill("#F3F4F6");
    const title = log.log_type === 'mantenimiento' 
      ? "REPORTE TÉCNICO DE MANTENCIÓN PREVENTIVA" 
      : "REPORTE TÉCNICO DE MANTENCIÓN CORRECTIVA";
    doc.fillColor("#111827").fontSize(14).text(title, 50, 118, { align: "center", bold: true } as any);

    doc.moveDown(3);
    const startY = 160;
    
    doc.fillColor("#374151").fontSize(10).text("DATOS DEL CLIENTE", 50, startY, { underline: true, bold: true } as any);
    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(11).text(`Condominio:`, { continued: true, bold: true } as any).font('Helvetica').text(` ${log.condo_name}`);
    doc.text(`Ubicación:`, { continued: true, bold: true } as any).text(` Región Metropolitana, Chile`);
    
    doc.fillColor("#374151").fontSize(10).text("DATOS DEL SERVICIO", 320, startY, { underline: true, bold: true } as any);
    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(11).text(`Técnico:`, 320, doc.y, { continued: true, bold: true } as any).font('Helvetica').text(` ${log.tech_name}`);
    doc.text(`Tipo:`, { continued: true, bold: true } as any).text(` ${log.log_type.toUpperCase()}`);
    doc.text(`Fecha:`, { continued: true, bold: true } as any).text(` ${new Date(log.start_time).toLocaleDateString('es-CL')}`);
    doc.text(`ID Reporte:`, { continued: true, bold: true } as any).text(` #LOG-${log.id.toString().padStart(5, '0')}`);

    doc.moveDown(2);
    doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    if (log.log_type === 'mantenimiento') {
      doc.fillColor(cyan).fontSize(12).text("DETALLE DE REVISIÓN POR EQUIPO", { bold: true } as any);
      doc.moveDown();

      const tableTop = doc.y;
      doc.rect(50, tableTop, 495, 20).fill(cyan);
      doc.fillColor("#FFFFFF").fontSize(10).text("EQUIPO / COMPONENTE", 60, tableTop + 5, { bold: true } as any);
      doc.text("ESTADO", 350, tableTop + 5, { bold: true } as any);
      doc.text("OBSERVACIONES", 430, tableTop + 5, { bold: true } as any);
      doc.moveDown(0.8);

      details.forEach((d, i) => {
        const y = doc.y;
        if (i % 2 === 0) {
          doc.rect(50, y - 2, 495, 24).fill("#F9FAFB");
        }
        
        doc.fillColor("#111827").fontSize(10).text(d.equipment_name, 60, y + 5);
        
        const statusText = d.status.toUpperCase();
        const statusColor = d.status === "fail" ? "#DC2626" : (d.status === "ok" ? "#059669" : "#4B5563");
        doc.fillColor(statusColor).text(statusText, 350, y + 5, { bold: true } as any);
        
        doc.fillColor("#4B5563").fontSize(9).text(d.observations || "Sin observaciones", 430, y + 5, { width: 110 });
        
        doc.moveDown(1.2);
        if (doc.y > 700) {
          doc.addPage();
        }
      });
    } else {
      doc.fillColor(cyan).fontSize(12).text("DESCRIPCIÓN DEL PROBLEMA", { bold: true } as any);
      doc.moveDown(0.5);
      doc.fillColor("#111827").fontSize(10).text(log.problem_description || "No especificado", { width: 495 });
      
      doc.moveDown(2);
      doc.fillColor(cyan).fontSize(12).text("ACCIONES REALIZADAS", { bold: true } as any);
      doc.moveDown(0.5);
      doc.fillColor("#111827").fontSize(10).text(log.actions_taken || "No especificado", { width: 495 });
    }

    const footerY = 750;
    doc.strokeColor("#0047AB").lineWidth(2).moveTo(50, footerY).lineTo(545, footerY).stroke();
    doc.fillColor("#666666").fontSize(8).text("Este documento es un comprobante oficial de la mantención realizada por Portería Virtual.", 50, footerY + 10, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleString('es-CL')} | Página 1 de 1`, 50, footerY + 22, { align: "center" });

    doc.end();
  });
};

async function seedAdmin() {
  try {
    const email = 'contacto@porteriavirtual.cl';
    const [users]: any = await db.execute('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      console.log("Seeding default admin user...");
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await db.execute(`
        INSERT INTO users (email, password, name, role, must_change_password)
        VALUES (?, ?, ?, ?, ?)
      `, [email, hashedPassword, 'Administrador', 'admin', 1]);
      console.log("Default admin user seeded successfully.");
    } else {
      console.log("Updating admin password to admin123...");
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    }
  } catch (err) {
    console.error("Unexpected error during seeding:", err);
  }
}

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  app.use(express.json());

  console.log("Initializing PostgreSQL/Supabase...");
  try {
    await initDb();
    console.log("Seeding admin user...");
    await seedAdmin();
    console.log("Admin seeding check complete.");
  } catch (dbErr) {
    console.error("Database initialization failed. Check your Supabase (PostgreSQL) credentials.", dbErr);
  }

  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const [users]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      const user = users[0];

      if (!user) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          role: user.role, 
          name: user.name, 
          email: user.email,
          mustChangePassword: user.must_change_password === true || user.must_change_password === 1
        } 
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/condos", authenticate, async (req, res) => {
    const user = (req as any).user;
    try {
      if (user.role === 'admin') {
        const [condos]: any = await db.execute(`
          SELECT c.*, u.name as tech_name, u.id as tech_id,
          (SELECT COUNT(*) FROM condo_equipment WHERE condo_id = c.id) as equipment_count
          FROM condos c
          LEFT JOIN tech_condos tc ON c.id = tc.condo_id
          LEFT JOIN users u ON tc.user_id = u.id
        `);
        res.json(condos);
      } else {
        const [condos]: any = await db.execute(`
          SELECT c.* FROM condos c
          JOIN tech_condos tc ON c.id = tc.condo_id
          WHERE tc.user_id = ?
        `, [user.id]);
        res.json(condos);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/condos", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, address, equipmentIds, techId } = req.body;
    try {
      const [result]: any = await db.execute('INSERT INTO condos (name, address) VALUES (?, ?) RETURNING id', [name, address]);
      const condoId = result[0].id;

      if (equipmentIds && Array.isArray(equipmentIds)) {
        for (const id of equipmentIds) {
          await db.execute('INSERT INTO condo_equipment (condo_id, equipment_type_id) VALUES (?, ?)', [condoId, id]);
        }
      }

      if (techId) {
        await db.execute('INSERT INTO tech_condos (user_id, condo_id) VALUES (?, ?)', [Number(techId), condoId]);
        // Notify technician
        sendPushNotification(Number(techId), {
          title: "Nuevo Condominio Asignado",
          body: `Se te ha asignado el condominio: ${name}`,
          url: "/condos"
        });
      }

      res.json({ id: condoId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/condos/:id", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, address, equipmentIds, techId } = req.body;
    const condoId = req.params.id;
    try {
      await db.execute('UPDATE condos SET name = ?, address = ? WHERE id = ?', [name, address, condoId]);
      await db.execute('DELETE FROM condo_equipment WHERE condo_id = ?', [condoId]);
      if (equipmentIds && Array.isArray(equipmentIds)) {
        for (const id of equipmentIds) {
          await db.execute('INSERT INTO condo_equipment (condo_id, equipment_type_id) VALUES (?, ?)', [condoId, id]);
        }
      }
      await db.execute('DELETE FROM tech_condos WHERE condo_id = ?', [condoId]);
      if (techId) {
        await db.execute('INSERT INTO tech_condos (user_id, condo_id) VALUES (?, ?)', [Number(techId), condoId]);
        // Notify technician
        sendPushNotification(Number(techId), {
          title: "Condominio Reasignado",
          body: `Se te ha asignado el condominio: ${name}`,
          url: "/condos"
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/condos/:id", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const condoId = req.params.id;
    try {
      await db.execute('DELETE FROM condo_equipment WHERE condo_id = ?', [condoId]);
      await db.execute('DELETE FROM tech_condos WHERE condo_id = ?', [condoId]);
      await db.execute('DELETE FROM condos WHERE id = ?', [condoId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/equipment-types", authenticate, async (req, res) => {
    const [types]: any = await db.execute('SELECT * FROM equipment_types');
    res.json(types);
  });

  app.post("/api/equipment-types", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name } = req.body;
    try {
      const [result]: any = await db.execute('INSERT INTO equipment_types (name) VALUES (?) RETURNING id', [name]);
      res.json({ id: result[0].id, name });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/equipment-types/:id", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const typeId = req.params.id;
    try {
      await db.execute('DELETE FROM condo_equipment WHERE equipment_type_id = ?', [typeId]);
      await db.execute('DELETE FROM equipment_types WHERE id = ?', [typeId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/condos/:id/equipment", authenticate, async (req, res) => {
    const [equipment]: any = await db.execute(`
      SELECT et.* FROM equipment_types et
      JOIN condo_equipment ce ON et.id = ce.equipment_type_id
      WHERE ce.condo_id = ?
    `, [req.params.id]);
    res.json(equipment);
  });

  app.post("/api/logs/start", authenticate, async (req, res) => {
    const { condoId, logType } = req.body;
    const user = (req as any).user;
    try {
      const [result]: any = await db.execute('INSERT INTO maintenance_logs (condo_id, tech_id, log_type) VALUES (?, ?, ?) RETURNING id', [condoId, user.id, logType || 'mantenimiento']);
      const logId = result[0].id;

      if (logType === 'correctiva') {
        const [condos]: any = await db.execute('SELECT name FROM condos WHERE id = ?', [condoId]);
        const condoName = condos[0]?.name || "Condominio";
        
        // Notify all admins about critical incident
        const [admins]: any = await db.execute("SELECT id FROM users WHERE role = 'admin'");
        admins.forEach((admin: any) => {
          sendPushNotification(admin.id, {
            title: "INCIDENCIA CRÍTICA",
            body: `Se ha iniciado una mantención correctiva en ${condoName}`,
            url: "/history"
          });
        });
      }

      res.json({ id: logId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/logs/:id/finish", authenticate, async (req, res) => {
    const { details, problemDescription, actionsTaken } = req.body;
    const logId = req.params.id;
    try {
      await db.execute(`
        UPDATE maintenance_logs 
        SET end_time = CURRENT_TIMESTAMP, status = 'completed', 
            problem_description = ?, actions_taken = ?
        WHERE id = ?
      `, [problemDescription || null, actionsTaken || null, logId]);

      if (details && Array.isArray(details)) {
        for (const d of details) {
          await db.execute('INSERT INTO log_details (log_id, equipment_type_id, status, observations) VALUES (?, ?, ?, ?)', [logId, d.equipment_type_id, d.status, d.observations]);
        }
      }

      const [logs]: any = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name, u.email as tech_email
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [logId]);
      const log = logs[0];

      const [logDetails]: any = await db.execute(`
        SELECT ld.*, et.name as equipment_name
        FROM log_details ld
        JOIN equipment_types et ON ld.equipment_type_id = et.id
        WHERE ld.log_id = ?
      `, [logId]);

      try {
        if (process.env.SMTP_USER && process.env.SMTP_USER !== "mock@example.com") {
          const pdfBuffer = await generateLogPDF(log, logDetails);
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          const isMaintenance = log.log_type === 'mantenimiento';
          await transporter.sendMail({
            from: '"Bitácora Portería Virtual" <no-reply@porteriavirtual.cl>',
            to: "contacto@porteriavirtual.cl",
            subject: `${isMaintenance ? 'Mantención' : 'Incidencia'} Finalizada - ${log.condo_name}`,
            html: `<p>Se ha completado una mantención en <b>${log.condo_name}</b>.</p>`,
            attachments: [{ filename: `Reporte_${log.condo_name}.pdf`, content: pdfBuffer }],
          });
        }
      } catch (e) { console.error("Email error:", e); }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/logs/history", authenticate, async (req, res) => {
    const user = (req as any).user;
    try {
      let logs;
      if (user.role === 'tech') {
        const [rows]: any = await db.execute(`
          SELECT l.*, c.name as condo_name, u.name as tech_name
          FROM maintenance_logs l
          JOIN condos c ON l.condo_id = c.id
          JOIN users u ON l.tech_id = u.id
          WHERE l.tech_id = ?
          ORDER BY l.start_time DESC
        `, [user.id]);
        logs = rows;
      } else {
        const [rows]: any = await db.execute(`
          SELECT l.*, c.name as condo_name, u.name as tech_name
          FROM maintenance_logs l
          JOIN condos c ON l.condo_id = c.id
          JOIN users u ON l.tech_id = u.id
          ORDER BY l.start_time DESC
        `);
        logs = rows;
      }
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/logs/:id", authenticate, async (req, res) => {
    try {
      const [logs]: any = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [req.params.id]);
      const log = logs[0];
      if (!log) return res.status(404).json({ error: "Log not found" });
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/logs/:id/pdf", authenticate, async (req, res) => {
    try {
      const [logs]: any = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [req.params.id]);
      const log = logs[0];

      const [logDetails]: any = await db.execute(`
        SELECT ld.*, et.name as equipment_name
        FROM log_details ld
        JOIN equipment_types et ON ld.equipment_type_id = et.id
        WHERE ld.log_id = ?
      `, [req.params.id]);

      const pdfBuffer = await generateLogPDF(log, logDetails);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Reporte_${log.condo_name}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Error generating PDF" });
    }
  });

  app.get("/api/users/techs", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const [techs]: any = await db.execute("SELECT id, email, name, role FROM users WHERE role IN ('tech', 'operator')");
    res.json(techs);
  });

  app.post("/api/users", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { email, password, name, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const [result]: any = await db.execute('INSERT INTO users (email, password, name, role, must_change_password) VALUES (?, ?, ?, ?, TRUE) RETURNING id', [email, hashedPassword, name, role]);
      res.json({ id: result[0].id });
    } catch (error: any) {
      res.status(400).json({ error: "El correo electrónico ya está registrado" });
    }
  });

  app.put("/api/users/:id", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { email, name, password } = req.body;
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        await db.execute('UPDATE users SET email = ?, name = ?, password = ? WHERE id = ?', [email, name, hashedPassword, req.params.id]);
      } else {
        await db.execute('UPDATE users SET email = ?, name = ? WHERE id = ?', [email, name, req.params.id]);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "Error al actualizar usuario" });
    }
  });

  app.post("/api/users/change-password", authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;
    try {
      const [users]: any = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
      const user = users[0];
      if (currentPassword && !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      await db.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hashedPassword, userId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/condos", authenticate, async (req, res) => {
    const [condos]: any = await db.execute(`
      SELECT c.* FROM condos c
      JOIN tech_condos tc ON c.id = tc.condo_id
      WHERE tc.user_id = ?
    `, [req.params.id]);
    res.json(condos);
  });

  app.post("/api/users/:id/condos", authenticate, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { condoIds } = req.body;
    const userId = req.params.id;
    try {
      await db.execute('DELETE FROM tech_condos WHERE user_id = ?', [userId]);
      if (condoIds && Array.isArray(condoIds)) {
        for (const cid of condoIds) {
          await db.execute('INSERT INTO tech_condos (user_id, condo_id) VALUES (?, ?)', [userId, cid]);
        }
        // Notify technician about new assignments
        sendPushNotification(Number(userId), {
          title: "Nuevas Asignaciones",
          body: `Se han actualizado tus condominios asignados.`,
          url: "/condos"
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/incidents", authenticate, async (req, res) => {
    const user = (req as any).user;
    try {
      let query = `
        SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name
        FROM incidents i
        JOIN condos c ON i.condo_id = c.id
        JOIN equipment_types et ON i.equipment_type_id = et.id
        JOIN users u ON i.operator_id = u.id
      `;
      let params: any[] = [];

      if (user.role === 'tech') {
        query += ` JOIN tech_condos tc ON i.condo_id = tc.condo_id WHERE tc.user_id = ? `;
        params.push(user.id);
      } else if (user.role === 'operator') {
        query += ` WHERE i.operator_id = ? `;
        params.push(user.id);
      }

      query += " ORDER BY i.created_at DESC";
      const [incidents]: any = await db.execute(query, params);
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/incidents", authenticate, async (req, res) => {
    const { condoId, equipmentTypeId, description } = req.body;
    const user = (req as any).user;
    if (user.role !== 'operator' && user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });

    try {
      const [result]: any = await db.execute(
        'INSERT INTO incidents (condo_id, equipment_type_id, operator_id, description) VALUES (?, ?, ?, ?) RETURNING id',
        [condoId, equipmentTypeId, user.id, description]
      );
      const incidentId = result[0].id;

      // Notify the technician assigned to this condo
      const [techs]: any = await db.execute(
        'SELECT user_id FROM tech_condos WHERE condo_id = ?',
        [condoId]
      );

      const [condos]: any = await db.execute('SELECT name FROM condos WHERE id = ?', [condoId]);
      const condoName = condos[0]?.name || "Condominio";

      techs.forEach((t: any) => {
        sendPushNotification(t.user_id, {
          title: "Nueva Incidencia Reportada",
          body: `Se ha reportado un problema en ${condoName}`,
          url: "/tech/incidents"
        });
      });

      // Send email with PDF
      try {
        if (process.env.SMTP_USER && process.env.SMTP_USER !== "mock@example.com") {
          const [incidentData]: any = await db.execute(`
            SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name
            FROM incidents i
            JOIN condos c ON i.condo_id = c.id
            JOIN equipment_types et ON i.equipment_type_id = et.id
            JOIN users u ON i.operator_id = u.id
            WHERE i.id = ?
          `, [result.insertId]);
          
          if (incidentData[0]) {
            const pdfBuffer = await generateIncidentPDF(incidentData[0]);
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT),
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
              from: '"Incidencias Portería Virtual" <no-reply@porteriavirtual.cl>',
              to: "contacto@porteriavirtual.cl",
              subject: `NUEVA INCIDENCIA - ${condoName}`,
              html: `<p>Se ha reportado una nueva incidencia en <b>${condoName}</b> por el operador <b>${incidentData[0].operator_name}</b>.</p>`,
              attachments: [{ filename: `Incidencia_${condoName}.pdf`, content: pdfBuffer }],
            });
          }
        }
      } catch (e) { console.error("Incident Email error:", e); }

      res.json({ id: result.insertId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/incidents/:id/status", authenticate, async (req, res) => {
    const { status } = req.body;
    const incidentId = req.params.id;
    try {
      if (status === 'resolved') {
        await db.execute('UPDATE incidents SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [status, incidentId]);
        
        // Notify operator that incident is resolved
        const [incidents]: any = await db.execute(`
          SELECT i.*, et.name as equipment_name 
          FROM incidents i 
          JOIN equipment_types et ON i.equipment_type_id = et.id 
          WHERE i.id = ?
        `, [incidentId]);
        
        if (incidents[0]) {
          sendPushNotification(incidents[0].operator_id, {
            title: "Incidencia Resuelta",
            body: `El problema con ${incidents[0].equipment_name} ha sido solucionado.`,
            url: "/operator/history"
          });
        }
      } else {
        await db.execute('UPDATE incidents SET status = ? WHERE id = ?', [status, incidentId]);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/incidents/:id/pdf", authenticate, async (req, res) => {
    try {
      const [incidents]: any = await db.execute(`
        SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name
        FROM incidents i
        JOIN condos c ON i.condo_id = c.id
        JOIN equipment_types et ON i.equipment_type_id = et.id
        JOIN users u ON i.operator_id = u.id
        WHERE i.id = ?
      `, [req.params.id]);
      
      const incident = incidents[0];
      if (!incident) return res.status(404).json({ error: "Incident not found" });

      const pdfBuffer = await generateIncidentPDF(incident);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Incidencia_${incident.condo_name}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Error generating PDF" });
    }
  });

  app.get("/api/notifications/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post("/api/notifications/subscribe", authenticate, async (req, res) => {
    const { subscription } = req.body;
    const user = (req as any).user;
    try {
      // Check if subscription already exists for this user
      const [existing]: any = await db.execute(
        "SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription = ?",
        [user.id, JSON.stringify(subscription)]
      );

      if (existing.length === 0) {
        await db.execute(
          "INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)",
          [user.id, JSON.stringify(subscription)]
        );
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error handler:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:3000`);
  });
}

startServer();
