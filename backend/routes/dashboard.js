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
        `SELECT tracking_number, service_type, status, payment_status,
                submitted_at, updated_at
         FROM service_requests
         WHERE resident_id = ?
         ORDER BY submitted_at DESC, request_id DESC
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
