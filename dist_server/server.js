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
import { createClient } from "@supabase/supabase-js";
import db, { initDb } from "./server/db.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const JWT_SECRET = process.env.JWT_SECRET || "porteria-virtual-secret-123";
// Web Push Configuration
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contacto@porteriavirtual.cl", vapidPublicKey, vapidPrivateKey);
}
const sendPushNotification = async (userId, payload) => {
    try {
        const [subscriptions] = await db.execute("SELECT subscription FROM push_subscriptions WHERE user_id = ?", [userId]);
        const notificationPayload = JSON.stringify(payload);
        const promises = subscriptions.map(async (row) => {
            try {
                await webpush.sendNotification(row.subscription, notificationPayload);
            }
            catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Subscription expired or no longer valid
                    await db.execute("DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?", [userId, JSON.stringify(row.subscription)]);
                }
                else {
                    console.error("Error sending push notification:", err);
                }
            }
        });
        await Promise.all(promises);
    }
    catch (err) {
        console.error("Error in sendPushNotification:", err);
    }
};
const generateIncidentPDF = (incident) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                info: {
                    Title: `Reporte de Incidencia - ${incident.condo_name}`,
                    Author: 'Portería Virtual',
                }
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));
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
            doc.fillColor(gray).fontSize(18).font('Helvetica-Bold').text("portería ", 110, 55, { continued: true })
                .fillColor(cyan).text("virtual");
            doc.font('Helvetica').fillColor("#666666").fontSize(10).text("Control de Acceso", 110, 75);
            doc.fillColor("#666666").fontSize(10).text("contacto@porteriavirtual.cl | www.porteriavirtual.cl", 110, 88);
            doc.moveDown(2);
            doc.rect(50, 110, 495, 30).fill("#FEF2F2");
            doc.fillColor("#991B1B").fontSize(14).font('Helvetica-Bold').text("REPORTE DE INCIDENCIA DETECTADA", 50, 118, { align: "center" });
            doc.moveDown(3);
            const startY = 160;
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("DATOS DEL CONDOMINIO", 50, startY, { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fillColor("#111827").fontSize(11).text(`Condominio:`, { continued: true }).font('Helvetica').text(` ${incident.condo_name || 'N/A'}`);
            doc.font('Helvetica-Bold').text(`Ubicación:`, { continued: true }).font('Helvetica').text(` Región Metropolitana, Chile`);
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("DATOS DEL REPORTE", 320, startY, { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fillColor("#111827").fontSize(11).text(`Operador:`, 320, doc.y, { continued: true }).font('Helvetica').text(` ${incident.operator_name || 'N/A'}`);
            doc.font('Helvetica-Bold').text(`Fecha:`, { continued: true }).font('Helvetica').text(` ${new Date(incident.created_at).toLocaleDateString('es-CL')}`);
            doc.font('Helvetica-Bold').text(`Hora:`, { continued: true }).font('Helvetica').text(` ${new Date(incident.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
            doc.font('Helvetica-Bold').text(`ID Incidencia:`, { continued: true }).font('Helvetica').text(` #INC-${incident.id.toString().padStart(5, '0')}`);
            doc.font('Helvetica-Bold').text(`Prioridad:`, { continued: true }).font('Helvetica').text(` ${incident.priority || 'Media'}`);
            if (incident.status === 'resolved' && incident.resolved_at) {
                doc.font('Helvetica-Bold').text(`Fecha Cierre:`, { continued: true }).font('Helvetica').text(` ${new Date(incident.resolved_at).toLocaleDateString('es-CL')} ${new Date(incident.resolved_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
                if (incident.tech_name) {
                    doc.font('Helvetica-Bold').text(`Cerrado por:`, { continued: true }).font('Helvetica').text(` ${incident.tech_name}`);
                }
            }
            doc.moveDown(2);
            doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(1.5);
            doc.font('Helvetica-Bold').fillColor("#991B1B").fontSize(12).text("DETALLE DEL PROBLEMA");
            doc.moveDown();
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("EQUIPO AFECTADO:");
            doc.font('Helvetica').fillColor("#111827").fontSize(11).text(incident.equipment_name || 'N/A');
            doc.moveDown();
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("DESCRIPCIÓN DE LA INCIDENCIA:");
            doc.rect(50, doc.y + 5, 495, 100).fill("#F9FAFB");
            doc.font('Helvetica').fillColor("#111827").fontSize(11).text(incident.description || 'Sin descripción', 60, doc.y + 15, { width: 475 });
            doc.moveDown(8);
            doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown();
            doc.font('Helvetica').fillColor("#6B7280").fontSize(9).text("Este reporte ha sido generado automáticamente por el sistema de Portería Virtual tras la detección de una anomalía por parte del personal de operación.", { align: "center" });
            doc.end();
        }
        catch (err) {
            reject(err);
        }
    });
};
// Reusable PDF Generation Function
const generateLogPDF = (log, details) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                info: {
                    Title: `Reporte de Mantención - ${log.condo_name}`,
                    Author: 'Portería Virtual',
                }
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));
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
            doc.fillColor(gray).fontSize(18).font('Helvetica-Bold').text("portería ", 110, 55, { continued: true })
                .fillColor(cyan).text("virtual");
            doc.font('Helvetica').fillColor("#666666").fontSize(10).text("Control de Acceso", 110, 75);
            doc.fillColor("#666666").fontSize(10).text("contacto@porteriavirtual.cl | www.porteriavirtual.cl", 110, 88);
            doc.moveDown(2);
            doc.rect(50, 110, 495, 30).fill("#F3F4F6");
            const title = log.log_type === 'mantenimiento'
                ? "REPORTE TÉCNICO DE MANTENCIÓN PREVENTIVA"
                : "REPORTE TÉCNICO DE MANTENCIÓN CORRECTIVA";
            doc.fillColor("#111827").fontSize(14).font('Helvetica-Bold').text(title, 50, 118, { align: "center" });
            doc.moveDown(3);
            const startY = 160;
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("DATOS DEL CLIENTE", 50, startY, { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fillColor("#111827").fontSize(11).text(`Condominio:`, { continued: true }).font('Helvetica').text(` ${log.condo_name || 'N/A'}`);
            doc.font('Helvetica-Bold').text(`Ubicación:`, { continued: true }).font('Helvetica').text(` Región Metropolitana, Chile`);
            doc.font('Helvetica-Bold').fillColor("#374151").fontSize(10).text("DATOS DEL SERVICIO", 320, startY, { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fillColor("#111827").fontSize(11).text(`Técnico:`, 320, doc.y, { continued: true }).font('Helvetica').text(` ${log.tech_name || 'N/A'}`);
            doc.font('Helvetica-Bold').text(`Tipo:`, { continued: true }).font('Helvetica').text(` ${log.log_type.toUpperCase()}`);
            doc.font('Helvetica-Bold').text(`Fecha:`, { continued: true }).font('Helvetica').text(` ${new Date(log.start_time).toLocaleDateString('es-CL')}`);
            doc.font('Helvetica-Bold').text(`H. Inicio:`, { continued: true }).font('Helvetica').text(` ${new Date(log.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
            if (log.end_time) {
                doc.font('Helvetica-Bold').text(`H. Término:`, { continued: true }).font('Helvetica').text(` ${new Date(log.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
            }
            doc.font('Helvetica-Bold').text(`ID Reporte:`, { continued: true }).font('Helvetica').text(` #LOG-${log.id.toString().padStart(5, '0')}`);
            doc.moveDown(2);
            doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(1.5);
            if (log.log_type === 'mantenimiento') {
                doc.font('Helvetica-Bold').fillColor(cyan).fontSize(12).text("DETALLE DE REVISIÓN POR EQUIPO");
                doc.moveDown();
                const tableTop = doc.y;
                doc.rect(50, tableTop, 495, 20).fill(cyan);
                doc.fillColor("#FFFFFF").fontSize(10).font('Helvetica-Bold').text("EQUIPO / COMPONENTE", 60, tableTop + 5);
                doc.text("ESTADO", 350, tableTop + 5);
                doc.text("OBSERVACIONES", 430, tableTop + 5);
                doc.moveDown(0.8);
                details.forEach((d, i) => {
                    const y = doc.y;
                    if (i % 2 === 0) {
                        doc.rect(50, y - 2, 495, 24).fill("#F9FAFB");
                    }
                    doc.fillColor("#111827").fontSize(10).font('Helvetica').text(d.equipment_name || 'Equipo', 60, y + 5);
                    const statusText = d.status.toUpperCase();
                    const statusColor = d.status === "fail" ? "#DC2626" : (d.status === "ok" ? "#059669" : "#4B5563");
                    doc.fillColor(statusColor).font('Helvetica-Bold').text(statusText, 350, y + 5);
                    doc.fillColor("#4B5563").fontSize(9).font('Helvetica').text(d.observations || "Sin observaciones", 430, y + 5, { width: 110 });
                    doc.moveDown(1.2);
                    if (doc.y > 700) {
                        doc.addPage();
                    }
                });
            }
            else {
                doc.font('Helvetica-Bold').fillColor(cyan).fontSize(12).text("DESCRIPCIÓN DEL PROBLEMA");
                doc.moveDown(0.5);
                doc.font('Helvetica').fillColor("#111827").fontSize(10).text(log.problem_description || "No especificado", { width: 495 });
                doc.moveDown(2);
                doc.font('Helvetica-Bold').fillColor(cyan).fontSize(12).text("ACCIONES REALIZADAS");
                doc.moveDown(0.5);
                doc.font('Helvetica').fillColor("#111827").fontSize(10).text(log.actions_taken || "No especificado", { width: 495 });
            }
            const footerY = 750;
            doc.strokeColor("#0047AB").lineWidth(2).moveTo(50, footerY).lineTo(545, footerY).stroke();
            doc.fillColor("#666666").fontSize(8).font('Helvetica').text("Este documento es un comprobante oficial de la mantención realizada por Portería Virtual.", 50, footerY + 10, { align: "center" });
            doc.text(`Generado el ${new Date().toLocaleString('es-CL')} | Página 1 de 1`, 50, footerY + 22, { align: "center" });
            doc.end();
        }
        catch (err) {
            reject(err);
        }
    });
};
async function seedUsers() {
    try {
        const defaultUsers = [
            { email: 'contacto@porteriavirtual.cl', name: 'Administrador', role: 'admin', pass: 'admin123' },
            { email: 'jose.bravo@porteriavirtual.cl', name: 'José Bravo', role: 'tech', pass: 'tech123' },
            { email: 'supervisor01@porteriavirtual.cl', name: 'Supervisor Operador', role: 'operator', pass: 'operador123' }
        ];
        for (const u of defaultUsers) {
            const [existing] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [u.email]);
            if (existing.length === 0) {
                console.log(`Seeding ${u.role} user: ${u.email}...`);
                const hashedPassword = await bcrypt.hash(u.pass, 10);
                await db.execute(`
          INSERT INTO users (email, password, name, role, must_change_password)
          VALUES (?, ?, ?, ?, FALSE)
        `, [u.email, hashedPassword, u.name, u.role]);
            }
        }
        // Legacy admin check
        const legacyAdmin = 'contacto@porteriavirtual.cl';
        const [legacy] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [legacyAdmin]);
        if (legacy.length === 0) {
            const hp = await bcrypt.hash('admin123', 10);
            await db.execute('INSERT INTO users (email, password, name, role, must_change_password) VALUES (?, ?, ?, ?, FALSE)', [legacyAdmin, hp, 'Administrador', 'admin']);
        }
        console.log("Seeding process complete.");
    }
    catch (err) {
        console.error("Unexpected error during seeding:", err);
    }
}
const startServer = async () => {
    process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });
    process.on("uncaughtException", (err) => {
        console.error("Uncaught Exception thrown:", err);
    });
    console.log("Starting server initialization...");
    const app = express();
    app.use(express.json());
    console.log("Initializing PostgreSQL/Supabase...");
    try {
        await initDb();
        console.log("Seeding demo users...");
        await seedUsers();
        console.log("Seeding check complete.");
    }
    catch (dbErr) {
        console.error("Database initialization failed. Check your Supabase (PostgreSQL) credentials.", dbErr);
    }
    app.use((req, res, next) => {
        console.log(`[REQUEST] ${req.method} ${req.url}`);
        next();
    });
    const authenticate = (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1] || req.query.token;
        if (!token)
            return res.status(401).json({ error: "Unauthorized" });
        try {
            req.user = jwt.verify(token, JWT_SECRET);
            next();
        }
        catch (e) {
            res.status(401).json({ error: "Invalid token" });
        }
    };
    app.get("/api/health", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            dbConnected: !!process.env.DATABASE_URL
        });
    });
    app.post("/api/login", async (req, res) => {
        const { email } = req.body;
        try {
            // Login Simplificado: Solo buscamos al usuario por email en nuestra DB.
            // Bypass de contraseñas para facilitar el uso y demos.
            const [users] = await db.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
            const user = users[0];
            if (!user) {
                return res.status(401).json({ error: "Usuario no encontrado" });
            }
            const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
            res.json({
                token,
                user: {
                    id: user.id,
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    mustChangePassword: false
                }
            });
        }
        catch (err) {
            console.error("Login error:", err);
            res.status(500).json({ error: "Error interno: " + err.message });
        }
    });
    app.get("/api/condos", authenticate, async (req, res) => {
        const user = req.user;
        try {
            if (user.role === 'admin') {
                const [condos] = await db.execute(`
          SELECT c.*, 
          (SELECT COUNT(*) FROM condo_equipment WHERE condo_id = c.id) as equipment_count,
          (SELECT COUNT(*) FROM tech_condos tc JOIN users u ON tc.user_id = u.id WHERE tc.condo_id = c.id AND u.role = 'tech') as tech_count,
          (SELECT COUNT(*) FROM tech_condos tc JOIN users u ON tc.user_id = u.id WHERE tc.condo_id = c.id AND u.role = 'operator') as operator_count,
          (SELECT COALESCE(JSON_AGG(user_id), '[]') FROM tech_condos WHERE condo_id = c.id) as user_ids
          FROM condos c
        `);
                res.json(condos);
            }
            else {
                const [condos] = await db.execute(`
          SELECT c.*,
          (SELECT COUNT(*) FROM condo_equipment WHERE condo_id = c.id) as equipment_count,
          (SELECT COUNT(*) FROM tech_condos tc JOIN users u ON tc.user_id = u.id WHERE tc.condo_id = c.id AND u.role = 'tech') as tech_count,
          (SELECT COUNT(*) FROM tech_condos tc JOIN users u ON tc.user_id = u.id WHERE tc.condo_id = c.id AND u.role = 'operator') as operator_count
          FROM condos c
          JOIN tech_condos tc ON c.id = tc.condo_id
          WHERE tc.user_id = ?
        `, [user.id]);
                res.json(condos);
            }
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.post("/api/condos", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const { name, address, equipmentIds, userIds } = req.body;
        try {
            const [result] = await db.execute('INSERT INTO condos (name, address) VALUES (?, ?) RETURNING id', [name, address]);
            const condoId = result[0].id;
            if (equipmentIds && Array.isArray(equipmentIds)) {
                for (const id of equipmentIds) {
                    await db.execute('INSERT INTO condo_equipment (condo_id, equipment_id) VALUES (?, ?)', [condoId, id]);
                }
            }
            if (userIds && Array.isArray(userIds)) {
                for (const userId of userIds) {
                    await db.execute('INSERT INTO tech_condos (user_id, condo_id) VALUES (?, ?)', [Number(userId), condoId]);
                    // Notify user
                    sendPushNotification(Number(userId), {
                        title: "Nuevo Condominio Asignado",
                        body: `Se te ha asignado el condominio: ${name}`,
                        url: "/condos"
                    });
                }
            }
            res.json({ id: condoId });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.put("/api/condos/:id", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const { name, address, equipmentIds, userIds } = req.body;
        const condoId = req.params.id;
        try {
            await db.execute('UPDATE condos SET name = ?, address = ? WHERE id = ?', [name, address, condoId]);
            await db.execute('DELETE FROM condo_equipment WHERE condo_id = ?', [condoId]);
            if (equipmentIds && Array.isArray(equipmentIds)) {
                for (const id of equipmentIds) {
                    await db.execute('INSERT INTO condo_equipment (condo_id, equipment_id) VALUES (?, ?)', [condoId, id]);
                }
            }
            await db.execute('DELETE FROM tech_condos WHERE condo_id = ?', [condoId]);
            if (userIds && Array.isArray(userIds)) {
                for (const userId of userIds) {
                    await db.execute('INSERT INTO tech_condos (user_id, condo_id) VALUES (?, ?)', [Number(userId), condoId]);
                    // Notify user
                    sendPushNotification(Number(userId), {
                        title: "Condominio Reasignado",
                        body: `Se te ha asignado el condominio: ${name}`,
                        url: "/condos"
                    });
                }
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.delete("/api/condos/:id", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const condoId = req.params.id;
        try {
            await db.execute('DELETE FROM condo_equipment WHERE condo_id = ?', [condoId]);
            await db.execute('DELETE FROM tech_condos WHERE condo_id = ?', [condoId]);
            await db.execute('DELETE FROM condos WHERE id = ?', [condoId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.get("/api/equipment", authenticate, async (req, res) => {
        try {
            const [types] = await db.execute('SELECT * FROM equipment ORDER BY name ASC');
            res.json(types);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.post("/api/equipment", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const { name } = req.body;
        try {
            const [result] = await db.execute('INSERT INTO equipment (name) VALUES (?) RETURNING id', [name]);
            res.json({ id: result[0].id, name });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.delete("/api/equipment/:id", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const typeId = req.params.id;
        try {
            await db.execute('DELETE FROM condo_equipment WHERE equipment_id = ?', [typeId]);
            await db.execute('DELETE FROM equipment WHERE id = ?', [typeId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.get("/api/condos/:id/equipment", authenticate, async (req, res) => {
        try {
            const [equipment] = await db.execute(`
        SELECT et.* FROM equipment et
        JOIN condo_equipment ce ON et.id = ce.equipment_id
        WHERE ce.condo_id = ?
      `, [req.params.id]);
            res.json(equipment);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.post("/api/logs/start", authenticate, async (req, res) => {
        const { condoId, logType } = req.body;
        const user = req.user;
        try {
            const [result] = await db.execute('INSERT INTO maintenance_logs (condo_id, tech_id, log_type) VALUES (?, ?, ?) RETURNING id', [condoId, user.id, logType || 'mantenimiento']);
            const logId = result[0].id;
            if (logType === 'correctiva') {
                const [condos] = await db.execute('SELECT name FROM condos WHERE id = ?', [condoId]);
                const condoName = condos[0]?.name || "Condominio";
                // Notify all admins about critical incident
                const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin'");
                admins.forEach((admin) => {
                    sendPushNotification(admin.id, {
                        title: "INCIDENCIA CRÍTICA",
                        body: `Se ha iniciado una mantención correctiva en ${condoName}`,
                        url: "/history"
                    });
                });
            }
            res.json({ id: logId });
        }
        catch (error) {
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
                    await db.execute('INSERT INTO log_details (log_id, equipment_id, status, observations) VALUES (?, ?, ?, ?)', [logId, d.equipment_id, d.status, d.observations]);
                }
            }
            const [logs] = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name, u.email as tech_email
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [logId]);
            const log = logs[0];
            const [logDetails] = await db.execute(`
        SELECT ld.*, et.name as equipment_name
        FROM log_details ld
        JOIN equipment et ON ld.equipment_id = et.id
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
            }
            catch (e) {
                console.error("Email error:", e);
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.delete("/api/logs/:id", authenticate, async (req, res) => {
        const logId = req.params.id;
        const user = req.user;
        try {
            const [logs] = await db.execute('SELECT * FROM maintenance_logs WHERE id = ?', [logId]);
            const log = logs[0];
            if (!log)
                return res.status(404).json({ error: "Log not found" });
            if (user.role !== 'admin' && log.tech_id !== user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }
            if (log.status === 'completed') {
                return res.status(400).json({ error: "Cannot delete a completed log" });
            }
            await db.execute('DELETE FROM maintenance_logs WHERE id = ?', [logId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.put("/api/logs/:id/pause", authenticate, async (req, res) => {
        const logId = req.params.id;
        const user = req.user;
        try {
            const [logs] = await db.execute('SELECT * FROM maintenance_logs WHERE id = ?', [logId]);
            const log = logs[0];
            if (!log)
                return res.status(404).json({ error: "Log not found" });
            if (user.role !== 'admin' && log.tech_id !== user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }
            await db.execute("UPDATE maintenance_logs SET status = 'paused' WHERE id = ?", [logId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.put("/api/logs/:id/resume", authenticate, async (req, res) => {
        const logId = req.params.id;
        const user = req.user;
        try {
            const [logs] = await db.execute('SELECT * FROM maintenance_logs WHERE id = ?', [logId]);
            const log = logs[0];
            if (!log)
                return res.status(404).json({ error: "Log not found" });
            if (user.role !== 'admin' && log.tech_id !== user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }
            await db.execute("UPDATE maintenance_logs SET status = 'in_progress' WHERE id = ?", [logId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/api/logs/history", authenticate, async (req, res) => {
        const user = req.user;
        try {
            let logs;
            if (user.role === 'tech') {
                const [rows] = await db.execute(`
          SELECT l.*, c.name as condo_name, u.name as tech_name
          FROM maintenance_logs l
          JOIN condos c ON l.condo_id = c.id
          JOIN users u ON l.tech_id = u.id
          WHERE l.tech_id = ?
          ORDER BY l.start_time DESC
        `, [user.id]);
                logs = rows;
            }
            else {
                const [rows] = await db.execute(`
          SELECT l.*, c.name as condo_name, u.name as tech_name
          FROM maintenance_logs l
          JOIN condos c ON l.condo_id = c.id
          JOIN users u ON l.tech_id = u.id
          ORDER BY l.start_time DESC
        `);
                logs = rows;
            }
            res.json(logs);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/api/logs/:id", authenticate, async (req, res) => {
        try {
            const [logs] = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [req.params.id]);
            const log = logs[0];
            if (!log)
                return res.status(404).json({ error: "Log not found" });
            res.json(log);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/api/logs/:id/pdf", authenticate, async (req, res) => {
        console.log(`[PDF] Generating PDF for log ${req.params.id}`);
        try {
            const [logs] = await db.execute(`
        SELECT l.*, c.name as condo_name, u.name as tech_name
        FROM maintenance_logs l
        JOIN condos c ON l.condo_id = c.id
        JOIN users u ON l.tech_id = u.id
        WHERE l.id = ?
      `, [req.params.id]);
            const log = logs[0];
            if (!log) {
                console.error(`[PDF] Log ${req.params.id} not found`);
                return res.status(404).json({ error: "Log not found" });
            }
            const [logDetails] = await db.execute(`
        SELECT ld.*, et.name as equipment_name
        FROM log_details ld
        JOIN equipment et ON ld.equipment_id = et.id
        WHERE ld.log_id = ?
      `, [req.params.id]);
            console.log(`[PDF] Log found: ${log.condo_name}, details: ${logDetails.length}`);
            const pdfBuffer = await generateLogPDF(log, logDetails);
            console.log(`[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=Reporte_${log.id}.pdf`);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error(`[PDF] Error generating PDF: ${error.message}`);
            res.status(500).json({ error: "Error generating PDF", details: error.message });
        }
    });
    app.get("/api/users/techs", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const [techs] = await db.execute("SELECT id, email, name, role FROM users WHERE role IN ('tech', 'operator')");
        res.json(techs);
    });
    app.post("/api/users", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const { email, password, name, role } = req.body;
        try {
            // 1. Crear usuario en Supabase Auth
            // Usamos admin.createUser para que el administrador pueda crear usuarios directamente
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name }
            });
            if (authError) {
                // Si el error es que el usuario ya existe en Auth, intentamos seguir adelante
                // para sincronizar con nuestra DB si es necesario, o devolvemos error.
                if (authError.message.includes("already registered")) {
                    // Continuar para ver si está en nuestra DB
                }
                else {
                    return res.status(400).json({ error: "Error en Supabase Auth: " + authError.message });
                }
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await db.execute('INSERT INTO users (email, password, name, role, must_change_password) VALUES (?, ?, ?, ?, TRUE) RETURNING id', [email, hashedPassword, name, role]);
            res.json({ id: result[0].id });
        }
        catch (error) {
            if (error.code === '23505') { // Unique violation en Postgres
                res.status(400).json({ error: "El correo electrónico ya está registrado en la base de datos" });
            }
            else {
                res.status(400).json({ error: "Error al crear usuario: " + error.message });
            }
        }
    });
    app.put("/api/users/:id", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        const { email, name, password } = req.body;
        try {
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await db.execute('UPDATE users SET email = ?, name = ?, password = ? WHERE id = ?', [email, name, hashedPassword, req.params.id]);
            }
            else {
                await db.execute('UPDATE users SET email = ?, name = ? WHERE id = ?', [email, name, req.params.id]);
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: "Error al actualizar usuario" });
        }
    });
    app.post("/api/users/change-password", authenticate, async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        try {
            const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
            const user = users[0];
            // 1. Actualizar en Supabase Auth
            // Nota: Para actualizar la contraseña de otro usuario se requiere admin, 
            // pero aquí el usuario está autenticado y cambia la suya propia.
            // Sin embargo, como estamos en el servidor, podemos usar el cliente admin para forzarlo por email.
            const { error: authError } = await supabase.auth.admin.updateUserById(
            // Necesitaríamos el UUID de Supabase. Si no lo tenemos, lo buscamos por email.
            await (async () => {
                const { data } = await supabase.auth.admin.listUsers();
                const foundUser = data.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());
                return foundUser?.id;
            })() || "", { password: newPassword });
            // No bloqueamos si falla Supabase Auth (podría ser un usuario antiguo no migrado)
            // pero lo intentamos.
            if (currentPassword && user.password !== 'SUPABASE_AUTH_MANAGED' && !(await bcrypt.compare(currentPassword, user.password))) {
                return res.status(400).json({ error: "La contraseña actual es incorrecta" });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hashedPassword, userId]);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.get("/api/users/:id/condos", authenticate, async (req, res) => {
        const [condos] = await db.execute(`
      SELECT c.* FROM condos c
      JOIN tech_condos tc ON c.id = tc.condo_id
      WHERE tc.user_id = ?
    `, [req.params.id]);
        res.json(condos);
    });
    app.post("/api/users/:id/condos", authenticate, async (req, res) => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/api/incidents", authenticate, async (req, res) => {
        const user = req.user;
        try {
            let query = `
        SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name
        FROM incidents i
        JOIN condos c ON i.condo_id = c.id
        JOIN equipment et ON i.equipment_id = et.id
        JOIN users u ON i.operator_id = u.id
      `;
            let params = [];
            if (user.role === 'tech') {
                query += ` JOIN tech_condos tc ON i.condo_id = tc.condo_id WHERE tc.user_id = ? `;
                params.push(user.id);
            }
            else if (user.role === 'operator') {
                query += ` WHERE i.operator_id = ? `;
                params.push(user.id);
            }
            query += " ORDER BY i.created_at DESC";
            const [incidents] = await db.execute(query, params);
            res.json(incidents);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.post("/api/incidents", authenticate, async (req, res) => {
        const { condoId, equipmentId, description, priority } = req.body;
        const user = req.user;
        if (user.role !== 'operator' && user.role !== 'admin')
            return res.status(403).json({ error: "Forbidden" });
        try {
            const [result] = await db.execute('INSERT INTO incidents (condo_id, equipment_id, operator_id, description, priority) VALUES (?, ?, ?, ?, ?) RETURNING id', [condoId, equipmentId, user.id, description, priority || 'Media']);
            const incidentId = result[0].id;
            // Notify the technician assigned to this condo
            const [techs] = await db.execute('SELECT user_id FROM tech_condos WHERE condo_id = ?', [condoId]);
            const [condos] = await db.execute('SELECT name FROM condos WHERE id = ?', [condoId]);
            const condoName = condos[0]?.name || "Condominio";
            techs.forEach((t) => {
                sendPushNotification(t.user_id, {
                    title: "Nueva Incidencia Reportada",
                    body: `Se ha reportado un problema en ${condoName}`,
                    url: "/tech/incidents"
                });
            });
            // Send email with PDF
            try {
                if (process.env.SMTP_USER && process.env.SMTP_USER !== "mock@example.com") {
                    const [incidentData] = await db.execute(`
            SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name
            FROM incidents i
            JOIN condos c ON i.condo_id = c.id
            JOIN equipment et ON i.equipment_id = et.id
            JOIN users u ON i.operator_id = u.id
            WHERE i.id = ?
          `, [incidentId]);
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
            }
            catch (e) {
                console.error("Incident Email error:", e);
            }
            res.json({ id: incidentId });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.put("/api/incidents/:id/status", authenticate, async (req, res) => {
        const { status } = req.body;
        const incidentId = req.params.id;
        const user = req.user;
        try {
            if (status === 'resolved') {
                await db.execute('UPDATE incidents SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?', [status, user.id, incidentId]);
                // Notify operator that incident is resolved
                const [incidents] = await db.execute(`
          SELECT i.*, et.name as equipment_name, u.name as tech_name 
          FROM incidents i 
          JOIN equipment et ON i.equipment_id = et.id 
          LEFT JOIN users u ON i.resolved_by = u.id
          WHERE i.id = ?
        `, [incidentId]);
                if (incidents[0]) {
                    sendPushNotification(incidents[0].operator_id, {
                        title: "Incidencia Resuelta",
                        body: `El problema con ${incidents[0].equipment_name} ha sido solucionado por ${incidents[0].tech_name || 'un técnico'}.`,
                        url: "/operator/history"
                    });
                }
            }
            else {
                await db.execute('UPDATE incidents SET status = ? WHERE id = ?', [status, incidentId]);
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.get("/api/incidents/:id/pdf", authenticate, async (req, res) => {
        console.log(`[PDF] Generating PDF for incident ${req.params.id}`);
        try {
            const [incidents] = await db.execute(`
        SELECT i.*, c.name as condo_name, et.name as equipment_name, u.name as operator_name, t.name as tech_name
        FROM incidents i
        JOIN condos c ON i.condo_id = c.id
        JOIN equipment et ON i.equipment_id = et.id
        JOIN users u ON i.operator_id = u.id
        LEFT JOIN users t ON i.resolved_by = t.id
        WHERE i.id = ?
      `, [req.params.id]);
            const incident = incidents[0];
            if (!incident) {
                console.error(`[PDF] Incident ${req.params.id} not found`);
                return res.status(404).json({ error: "Incident not found" });
            }
            console.log(`[PDF] Incident found: ${incident.condo_name}`);
            const pdfBuffer = await generateIncidentPDF(incident);
            console.log(`[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=Incidencia_${incident.id}.pdf`);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error(`[PDF] Error generating PDF: ${error.message}`);
            res.status(500).json({ error: "Error generating PDF", details: error.message });
        }
    });
    app.get("/api/notifications/vapid-public-key", (req, res) => {
        res.json({ publicKey: vapidPublicKey });
    });
    app.post("/api/notifications/subscribe", authenticate, async (req, res) => {
        const { subscription } = req.body;
        const user = req.user;
        try {
            // Check if subscription already exists for this user
            const [existing] = await db.execute("SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription = ?", [user.id, JSON.stringify(subscription)]);
            if (existing.length === 0) {
                await db.execute("INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)", [user.id, JSON.stringify(subscription)]);
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.all("/api/*", (req, res) => {
        res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
    });
    app.use((err, req, res, next) => {
        console.error("Global error handler:", err);
        res.status(500).json({ error: "Internal server error" });
    });
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
        app.use(vite.middlewares);
    }
    else {
        // Serve static files from the dist directory
        app.use(express.static(path.join(__dirname, "dist")));
        // Serve index.html for all other routes (SPA)
        app.get("*", (req, res, next) => {
            // Don't intercept API routes
            if (req.path.startsWith("/api/")) {
                return next();
            }
            res.sendFile(path.join(__dirname, "dist", "index.html"));
        });
    }
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};
startServer();
