const express = require("express");
const pool = require("../config/database");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/public", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const [[counts]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM resident_profiles WHERE status = 'Active') AS verifiedResidents,
         (SELECT COUNT(*) FROM service_requests WHERE status = 'Completed') AS completedRequests`
    );

    let latestRequest = null;
    if (req.session.residentUser?.residentId) {
      const [requests] = await pool.execute(
        `SELECT sr.tracking_number, st.name AS service_type, sr.status, sr.payment_status,
                sr.submitted_at, sr.updated_at
         FROM service_requests sr
         JOIN service_types st ON st.service_type_id = sr.service_type_id
         WHERE sr.resident_id = ?
         ORDER BY sr.submitted_at DESC, sr.request_id DESC
         LIMIT 1`,
        [req.session.residentUser.residentId]
      );
      latestRequest = requests[0] || null;
    }

    res.json({
      verifiedResidents: Number(counts.verifiedResidents),
      completedRequests: Number(counts.completedRequests),
      resident: Boolean(req.session.residentUser),
      latestRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load public dashboard data." });
  }
});

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const [[residentCount]] = await pool.query(
      "SELECT COUNT(*) AS count FROM resident_profiles WHERE status = 'Active'"
    );
    const [[householdCount]] = await pool.query(
      "SELECT COUNT(*) AS count FROM households WHERE status = 'Active'"
    );
    const [[adminCount]] = await pool.query(
      "SELECT COUNT(*) AS count FROM admin_users WHERE account_status = 'Active'"
    );

    res.json({
      residents: residentCount.count,
      households: householdCount.count,
      admins: adminCount.count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load dashboard." });
  }
});

module.exports = router;
