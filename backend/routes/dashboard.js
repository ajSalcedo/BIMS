const express = require("express");
const pool = require("../config/database");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

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
