const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const router = express.Router();

router.post("/register", async (req, res) => {
  const {
    username, email, password,
    firstName, middleName, lastName, suffix,
    birthDate, sex, civilStatus, placeOfBirth,
    nationality, religion, address, purok, contactNumber,
    yearsOfResidency, employmentStatus, occupation,
    educationalAttainment, bloodType, disabilityStatus,
    voterStatus, relationshipToHead, emergencyContact,
    emergencyContactNumber
  } = req.body;

  if (!username || !password || !firstName || !lastName || !birthDate ||
      !sex || !civilStatus || !address || !purok) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT resident_user_id FROM resident_users WHERE username = ? OR (email IS NOT NULL AND email = ?)",
      [username, email || null]
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Username or email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [userResult] = await connection.execute(
      `INSERT INTO resident_users (username, email, password_hash)
       VALUES (?, ?, ?)`,
      [username, email || null, passwordHash]
    );

    const [profileResult] = await connection.execute(
      `INSERT INTO resident_profiles
      (resident_user_id, first_name, middle_name, last_name, suffix, birth_date,
       sex, civil_status, place_of_birth, nationality, religion, address, purok,
       contact_number, years_of_residency, employment_status, occupation,
       educational_attainment, blood_type, disability_status, voter_status,
       relationship_to_head, emergency_contact, emergency_contact_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId, firstName, middleName || null, lastName, suffix || null,
        birthDate, sex, civilStatus, placeOfBirth || null, nationality || null,
        religion || null, address, purok, contactNumber || null,
        yearsOfResidency || null, employmentStatus || null, occupation || null,
        educationalAttainment || null, bloodType || null,
        disabilityStatus || null, voterStatus || "Unknown",
        relationshipToHead || null, emergencyContact || null,
        emergencyContactNumber || null
      ]
    );

    await connection.commit();

    req.session.residentUser = {
      residentUserId: userResult.insertId,
      residentId: profileResult.insertId,
      username
    };

    res.status(201).json({
      message: "Resident account created successfully.",
      residentId: profileResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Unable to create resident account." });
  } finally {
    connection.release();
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ru.resident_user_id, ru.username, ru.password_hash, ru.account_status,
              rp.resident_id
       FROM resident_users ru
       LEFT JOIN resident_profiles rp ON rp.resident_user_id = ru.resident_user_id
       WHERE ru.username = ?`,
      [username]
    );

    if (!rows.length || rows[0].account_status !== "Active") {
      return res.status(401).json({ message: "Invalid resident login." });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid resident login." });
    }

    req.session.residentUser = {
      residentUserId: rows[0].resident_user_id,
      residentId: rows[0].resident_id,
      username: rows[0].username
    };

    res.json({ message: "Login successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to log in." });
  }
});

router.get("/me", async (req, res) => {
  if (!req.session.residentUser) {
    return res.status(401).json({ message: "Not logged in." });
  }

  res.json({ resident: req.session.residentUser });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

module.exports = router;
