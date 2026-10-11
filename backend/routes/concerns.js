const express = require("express");
const pool = require("../config/database");
const { requireResident, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const CATEGORIES = ["Peace and Order", "Sanitation", "Infrastructure", "Environment", "Utilities", "Other"];
const STATUSES = ["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"];
const URGENCIES = ["Low", "Medium", "High"];

function makeTrackingNumber(id) {
  return `CON-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;
}

async function notify(connection, residentId, concernId, title, message) {
  await connection.execute(
    `INSERT INTO concern_notifications (resident_id, concern_id, title, message) VALUES (?, ?, ?, ?)`,
    [residentId, concernId, title, message]
  );
}

router.get("/categories", requireResident, (req, res) => {
  res.json({ categories: CATEGORIES, urgencies: URGENCIES });
});

router.post("/", requireResident, async (req, res) => {
  const { category, subject, description, location, urgency } = req.body;
  const residentId = req.session.residentUser.residentId;
  if (!CATEGORIES.includes(category) || !subject?.trim() || !description?.trim() || !location?.trim() || !URGENCIES.includes(urgency)) {
    return res.status(400).json({ message: "Please complete all required concern fields." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO community_concerns (tracking_number, resident_id, category, subject, description, location, urgency)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?)`,
      [residentId, category, subject.trim(), description.trim(), location.trim(), urgency]
    );
    const trackingNumber = makeTrackingNumber(result.insertId);
    await connection.execute("UPDATE community_concerns SET tracking_number = ? WHERE concern_id = ?", [trackingNumber, result.insertId]);
    await connection.execute(
      `INSERT INTO concern_status_history (concern_id, status, remarks) VALUES (?, 'Submitted', 'Concern submitted by resident.')`,
      [result.insertId]
    );
    await notify(connection, residentId, result.insertId, "Concern Submitted", `Your concern (${trackingNumber}) has been submitted and is now under review queue.`);
    await connection.commit();
    res.status(201).json({ message: "Concern submitted successfully.", trackingNumber });
  } catch (error) {
    await connection.rollback(); console.error(error); res.status(500).json({ message: "Unable to submit concern." });
  } finally { connection.release(); }
});

router.get("/mine", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT concern_id, tracking_number, category, subject, description, location, urgency, status, remarks, submitted_at, updated_at, resolved_at
       FROM community_concerns WHERE resident_id = ? ORDER BY submitted_at DESC`,
      [req.session.residentUser.residentId]
    );
    res.json({ concerns: rows });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load concerns." }); }
});

router.get("/mine/:trackingNumber", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT cc.*, CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name
       FROM community_concerns cc JOIN resident_profiles rp ON rp.resident_id = cc.resident_id
       WHERE cc.tracking_number = ? AND cc.resident_id = ?`,
      [req.params.trackingNumber, req.session.residentUser.residentId]
    );
    if (!rows.length) return res.status(404).json({ message: "Concern not found." });
    const [history] = await pool.execute(
      `SELECT csh.status, csh.remarks, csh.changed_at, au.full_name AS changed_by_name
       FROM concern_status_history csh LEFT JOIN admin_users au ON au.admin_id = csh.changed_by
       WHERE csh.concern_id = ? ORDER BY csh.changed_at ASC`, [rows[0].concern_id]
    );
    res.json({ concern: rows[0], history });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load concern." }); }
});

router.get("/notifications", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT notification_id, concern_id, title, message, is_read, created_at FROM concern_notifications
       WHERE resident_id = ? ORDER BY created_at DESC LIMIT 50`, [req.session.residentUser.residentId]
    );
    res.json({ notifications: rows });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load concern notifications." }); }
});

router.patch("/notifications/:id/read", requireResident, async (req, res) => {
  await pool.execute(`UPDATE concern_notifications SET is_read = TRUE WHERE notification_id = ? AND resident_id = ?`, [req.params.id, req.session.residentUser.residentId]);
  res.json({ message: "Notification marked as read." });
});

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT cc.*, CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name,
              rp.contact_number, rp.address, rp.purok, au.full_name AS assigned_to_name
       FROM community_concerns cc JOIN resident_profiles rp ON rp.resident_id = cc.resident_id
       LEFT JOIN admin_users au ON au.admin_id = cc.assigned_to ORDER BY cc.submitted_at DESC`
    );
    res.json({ concerns: rows });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load community concerns." }); }
});

router.get("/admin/:id", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT cc.*, CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name,
              rp.contact_number, rp.address, rp.purok, ru.username, au.full_name AS assigned_to_name
       FROM community_concerns cc JOIN resident_profiles rp ON rp.resident_id = cc.resident_id
       LEFT JOIN resident_users ru ON ru.resident_user_id = rp.resident_user_id
       LEFT JOIN admin_users au ON au.admin_id = cc.assigned_to WHERE cc.concern_id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Concern not found." });
    const [history] = await pool.execute(
      `SELECT csh.status, csh.remarks, csh.changed_at, au.full_name AS changed_by_name
       FROM concern_status_history csh LEFT JOIN admin_users au ON au.admin_id = csh.changed_by
       WHERE csh.concern_id = ? ORDER BY csh.changed_at ASC`, [req.params.id]
    );
    res.json({ concern: rows[0], history });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load concern." }); }
});

router.get("/admin/meta", requireAdmin, async (req, res) => {
  try {
    const [admins] = await pool.execute(`SELECT admin_id, full_name, role FROM admin_users WHERE account_status = 'Active' ORDER BY full_name`);
    res.json({ admins });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to load personnel." }); }
});

router.patch("/admin/:id", requireAdmin, async (req, res) => {
  const { status, assignedTo, remarks } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid concern status." });
  const assigned = assignedTo === "" || assignedTo === null || assignedTo === undefined ? null : Number(assignedTo);
  if (assigned !== null && (!Number.isInteger(assigned) || assigned < 1)) return res.status(400).json({ message: "Invalid assigned personnel." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`SELECT resident_id, tracking_number, subject FROM community_concerns WHERE concern_id = ? FOR UPDATE`, [req.params.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Concern not found." }); }
    const concern = rows[0];
    const resolvedAt = status === "Resolved" ? new Date() : null;
    await connection.execute(
      `UPDATE community_concerns SET status = ?, assigned_to = ?, remarks = ?, resolved_at = ? WHERE concern_id = ?`,
      [status, assigned, remarks ? String(remarks).trim() : null, resolvedAt, req.params.id]
    );
    await connection.execute(
      `INSERT INTO concern_status_history (concern_id, status, remarks, changed_by) VALUES (?, ?, ?, ?)`,
      [req.params.id, status, remarks ? String(remarks).trim() : null, req.session.adminUser.adminId]
    );
    let assignmentText = "";
    if (assigned !== null) {
      const [personnel] = await connection.execute(`SELECT full_name FROM admin_users WHERE admin_id = ? AND account_status = 'Active'`, [assigned]);
      if (!personnel.length) { await connection.rollback(); return res.status(400).json({ message: "Assigned personnel not found or inactive." }); }
      assignmentText = ` Assigned to ${personnel[0].full_name}.`;
    }
    await notify(connection, concern.resident_id, req.params.id, "Concern Updated", `Your concern (${concern.tracking_number}) is now ${status}.${assignmentText}${remarks ? ` ${remarks}` : ""}`);
    await connection.commit(); res.json({ message: "Concern updated successfully." });
  } catch (error) { await connection.rollback(); console.error(error); res.status(500).json({ message: "Unable to update concern." }); }
  finally { connection.release(); }
});

router.get("/reports/summary", requireAdmin, async (req, res) => {
  try {
    const [[totals]] = await pool.execute(`SELECT COUNT(*) total, SUM(status='Submitted') submitted, SUM(status='Under Review') under_review, SUM(status='In Progress') in_progress, SUM(status='Resolved') resolved, SUM(status='Rejected') rejected FROM community_concerns`);
    const [categories] = await pool.execute(`SELECT category, COUNT(*) total FROM community_concerns GROUP BY category ORDER BY total DESC, category`);
    const [recent] = await pool.execute(`SELECT DATE(submitted_at) date, COUNT(*) total FROM community_concerns WHERE submitted_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY DATE(submitted_at) ORDER BY date ASC`);
    res.json({ totals, categories, recent });
  } catch (error) { console.error(error); res.status(500).json({ message: "Unable to generate concern report." }); }
});

module.exports = router;
