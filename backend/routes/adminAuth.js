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

router.get("/profile", async (req, res) => {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin login required." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT username, first_name, last_name, full_name, email, address, contact_number
       FROM admin_users WHERE admin_id = ?`,
      [req.session.adminUser.adminId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    const admin = rows[0];
    const nameParts = admin.full_name.trim().split(/\s+/);
    const fallbackFirstName = nameParts.shift() || "";
    const fallbackLastName = nameParts.join(" ");
    res.json({
      profile: {
        username: admin.username,
        firstName: admin.first_name || fallbackFirstName,
        lastName: admin.last_name || fallbackLastName,
        email: admin.email || "",
        address: admin.address || "",
        contactNumber: admin.contact_number || ""
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load admin profile." });
  }
});

router.put("/profile", async (req, res) => {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin login required." });
  }

  const body = req.body || {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const contactNumber = typeof body.contactNumber === "string" ? body.contactNumber.trim() : "";
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (!username || !firstName || !lastName) {
    return res.status(400).json({ message: "Username, first name, and last name are required." });
  }
  if (username.length > 80 || firstName.length > 75 || lastName.length > 75) {
    return res.status(400).json({ message: "Username and name fields are too long." });
  }
  if (fullName.length > 150 || email.length > 150 || address.length > 255 || contactNumber.length > 30) {
    return res.status(400).json({ message: "One or more profile fields are too long." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (newPassword && (
    !currentPassword ||
    newPassword.length < 8 ||
    Buffer.byteLength(newPassword, "utf8") > 72
  )) {
    return res.status(400).json({ message: "Enter your current password and a new password of 8 to 72 bytes." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT password_hash FROM admin_users WHERE admin_id = ?",
      [req.session.adminUser.adminId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Admin account not found." });
    }
    if (newPassword && !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(403).json({ message: "Current password is incorrect." });
    }

    const values = [username, firstName, lastName, fullName, email || null, address || null, contactNumber || null];
    let updateQuery =
      `UPDATE admin_users
       SET username = ?, first_name = ?, last_name = ?, full_name = ?, email = ?, address = ?, contact_number = ?`;

    if (newPassword) {
      updateQuery += ", password_hash = ?";
      values.push(await bcrypt.hash(newPassword, 12));
    }
    updateQuery += " WHERE admin_id = ?";
    values.push(req.session.adminUser.adminId);

    await pool.execute(updateQuery, values);
    req.session.adminUser.username = username;
    req.session.adminUser.fullName = fullName;
    res.json({ message: "Account details updated." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username or email is already in use." });
    }
    console.error(error);
    res.status(500).json({ message: "Unable to update admin account." });
  }
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
