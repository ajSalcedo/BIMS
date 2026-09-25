const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT admin_id, username, full_name, password_hash, role, account_status
       FROM admin_users WHERE username = ?`,
      [username]
    );

    if (!rows.length || rows[0].account_status !== "Active") {
      return res.status(401).json({ message: "Invalid admin login." });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid admin login." });
    }

    req.session.adminUser = {
      adminId: rows[0].admin_id,
      username: rows[0].username,
      fullName: rows[0].full_name,
      role: rows[0].role
    };

    res.json({ message: "Admin login successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to log in." });
  }
});

router.get("/me", (req, res) => {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Not logged in." });
  }
  res.json({ admin: req.session.adminUser });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

router.post("/users", async (req, res) => {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin login required." });
  }

  const { username, fullName, email, password, role } = req.body;

  if (!username || !fullName || !password || !role) {
    return res.status(400).json({ message: "Username, full name, password, and role are required." });
  }

  if (!["Administrator", "Staff"].includes(role)) {
    return res.status(400).json({ message: "Invalid admin role." });
  }

  if (req.session.adminUser.role !== "Administrator") {
    return res.status(403).json({ message: "Only an Administrator can create admin accounts." });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT admin_id FROM admin_users WHERE username = ? OR (email IS NOT NULL AND email = ?)",
      [username, email || null]
    );

    if (existing.length) {
      return res.status(409).json({ message: "Username or email is already in use." });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO admin_users (username, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, fullName, email || null, hash, role]
    );

    res.status(201).json({ message: "Admin account created." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create admin account." });
  }
});

module.exports = router;
