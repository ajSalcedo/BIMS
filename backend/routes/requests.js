const express = require("express");
const pool = require("../config/database");
const { requireResident, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const SERVICE_FEES = {
  "Certificate of Residency": 50,
  "Barangay Clearance": 100,
  "Certificate of Indigency": 0,
  "Barangay Certificate": 50,
  "Other": 0
};

function makeTrackingNumber(id) {
  const year = new Date().getFullYear();
  return `BRGY-${year}-${String(id).padStart(4, "0")}`;
}

async function addNotification(connection, residentId, requestId, title, message) {
  await connection.execute(
    `INSERT INTO notifications (resident_id, request_id, title, message)
     VALUES (?, ?, ?, ?)`,
    [residentId, requestId, title, message]
  );
}

router.get("/types", requireResident, async (req, res) => {
  res.json({
    services: Object.entries(SERVICE_FEES).map(([name, fee]) => ({ name, fee }))
  });
});

router.post("/", requireResident, async (req, res) => {
  const { serviceType, purpose, copies, paymentMethod } = req.body;
  const residentId = req.session.residentUser.residentId;
  const allowedTypes = Object.keys(SERVICE_FEES);

  if (!allowedTypes.includes(serviceType) || !purpose || !String(purpose).trim()) {
    return res.status(400).json({ message: "Please select a valid service and provide a purpose." });
  }

  const numberOfCopies = Math.max(1, Math.min(10, Number(copies) || 1));
  const fee = SERVICE_FEES[serviceType] * numberOfCopies;
  const method = paymentMethod === "Online Payment" ? "Online Payment" : "Pay at Barangay Hall";
  const paymentStatus = fee === 0 ? "Not Required" : "Unpaid";

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO service_requests
       (tracking_number, resident_id, service_type, purpose, copies, fee, payment_method, payment_status)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?)`,
      [residentId, serviceType, String(purpose).trim(), numberOfCopies, fee, method, paymentStatus]
    );

    const trackingNumber = makeTrackingNumber(result.insertId);
    await connection.execute(
      "UPDATE service_requests SET tracking_number = ? WHERE request_id = ?",
      [trackingNumber, result.insertId]
    );

    await connection.execute(
      `INSERT INTO request_status_history (request_id, status, remarks)
       VALUES (?, 'Pending', 'Request submitted by resident.')`,
      [result.insertId]
    );

    await addNotification(
      connection,
      residentId,
      result.insertId,
      "Request Submitted",
      `Your ${serviceType} request (${trackingNumber}) has been submitted and is now Pending.`
    );

    await connection.commit();
    res.status(201).json({ message: "Request submitted successfully.", trackingNumber });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Unable to submit request." });
  } finally {
    connection.release();
  }
});

router.get("/mine", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT request_id, tracking_number, service_type, purpose, copies, fee,
              payment_method, payment_status, status, remarks, submitted_at, updated_at, completed_at
       FROM service_requests
       WHERE resident_id = ?
       ORDER BY submitted_at DESC`,
      [req.session.residentUser.residentId]
    );
    res.json({ requests: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load requests." });
  }
});

router.get("/mine/:trackingNumber", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sr.*, CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name
       FROM service_requests sr
       JOIN resident_profiles rp ON rp.resident_id = sr.resident_id
       WHERE sr.tracking_number = ? AND sr.resident_id = ?`,
      [req.params.trackingNumber, req.session.residentUser.residentId]
    );
    if (!rows.length) return res.status(404).json({ message: "Request not found." });

    const [history] = await pool.execute(
      `SELECT status, remarks, changed_at FROM request_status_history
       WHERE request_id = ? ORDER BY changed_at ASC`,
      [rows[0].request_id]
    );

    res.json({ request: rows[0], history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load request." });
  }
});

router.get("/notifications", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT notification_id, request_id, title, message, is_read, created_at
       FROM notifications WHERE resident_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.session.residentUser.residentId]
    );
    res.json({ notifications: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

router.patch("/notifications/:id/read", requireResident, async (req, res) => {
  await pool.execute(
    `UPDATE notifications SET is_read = TRUE
     WHERE notification_id = ? AND resident_id = ?`,
    [req.params.id, req.session.residentUser.residentId]
  );
  res.json({ message: "Notification marked as read." });
});

// Admin request management
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sr.request_id, sr.tracking_number, sr.service_type, sr.purpose, sr.copies,
              sr.fee, sr.payment_method, sr.payment_status, sr.status, sr.remarks,
              sr.submitted_at, sr.updated_at,
              CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name,
              rp.contact_number, rp.address, rp.purok,
              au.full_name AS processed_by_name
       FROM service_requests sr
       JOIN resident_profiles rp ON rp.resident_id = sr.resident_id
       LEFT JOIN admin_users au ON au.admin_id = sr.processed_by
       ORDER BY sr.submitted_at DESC`
    );
    res.json({ requests: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load service requests." });
  }
});

router.get("/admin/:id", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sr.*, CONCAT(rp.first_name, ' ', COALESCE(CONCAT(rp.middle_name, ' '), ''), rp.last_name) AS resident_name,
              rp.contact_number, rp.address, rp.purok, ru.username
       FROM service_requests sr
       JOIN resident_profiles rp ON rp.resident_id = sr.resident_id
       LEFT JOIN resident_users ru ON ru.resident_user_id = rp.resident_user_id
       WHERE sr.request_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Request not found." });

    const [history] = await pool.execute(
      `SELECT rsh.status, rsh.remarks, rsh.changed_at, au.full_name AS changed_by_name
       FROM request_status_history rsh
       LEFT JOIN admin_users au ON au.admin_id = rsh.changed_by
       WHERE rsh.request_id = ? ORDER BY rsh.changed_at ASC`,
      [req.params.id]
    );
    res.json({ request: rows[0], history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load request." });
  }
});

router.patch("/admin/:id/status", requireAdmin, async (req, res) => {
  const allowedStatuses = ["Pending", "Processing", "Ready for Pickup", "Completed", "Rejected", "Cancelled"];
  const { status, remarks, paymentStatus } = req.body;
  if (!allowedStatuses.includes(status)) return res.status(400).json({ message: "Invalid request status." });
  if (paymentStatus && !["Unpaid", "Paid", "Not Required"].includes(paymentStatus)) {
    return res.status(400).json({ message: "Invalid payment status." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [requests] = await connection.execute(
      "SELECT resident_id, tracking_number, service_type FROM service_requests WHERE request_id = ? FOR UPDATE",
      [req.params.id]
    );
    if (!requests.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Request not found." });
    }

    const request = requests[0];
    const completedAt = status === "Completed" ? new Date() : null;
    await connection.execute(
      `UPDATE service_requests
       SET status = ?, remarks = ?, payment_status = COALESCE(?, payment_status),
           processed_by = ?, completed_at = ?
       WHERE request_id = ?`,
      [status, remarks ? String(remarks).trim() : null, paymentStatus || null,
       req.session.adminUser.adminId, completedAt, req.params.id]
    );

    await connection.execute(
      `INSERT INTO request_status_history (request_id, status, remarks, changed_by)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, status, remarks ? String(remarks).trim() : null, req.session.adminUser.adminId]
    );

    await addNotification(
      connection,
      request.resident_id,
      req.params.id,
      "Request Updated",
      `Your ${request.service_type} request (${request.tracking_number}) is now ${status}.${remarks ? ` ${remarks}` : ""}`
    );

    await connection.commit();
    res.json({ message: "Request status updated." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Unable to update request." });
  } finally {
    connection.release();
  }
});

module.exports = router;
