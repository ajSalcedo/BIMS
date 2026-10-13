const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const router = express.Router();

router.post("/register", async (req, res) => {
  const {
    email, password, householdNumber,
    firstName, middleName, lastName, suffix,
    birthDate, sex, civilStatus, placeOfBirth,
    nationality, religion, address, purok, contactNumber,
    yearsOfResidency, employmentStatus, occupation,
    educationalAttainment, bloodType, disabilityStatus,
    voterStatus, relationshipToHead, emergencyContact,
    emergencyContactNumber
  } = req.body;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedContactNumber = typeof contactNumber === "string" ? contactNumber.trim() : "";
  const normalizedHouseholdNumber = typeof householdNumber === "string" ? householdNumber.trim() : "";

  if ((!normalizedEmail && !normalizedContactNumber) ||
      typeof password !== "string" || !password ||
      !firstName || !lastName || !birthDate ||
      !sex || !civilStatus || !address || !purok) {
    return res.status(400).json({
      message: "Complete all required fields and provide an email address or contact number."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      `SELECT ru.resident_user_id
       FROM resident_users ru
       WHERE ru.email = ? OR ru.contact_number = ?
       LIMIT 1`,
      [normalizedEmail || null, normalizedContactNumber || null]
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Email or contact number is already registered." });
    }

    let householdId = null;
    if (normalizedHouseholdNumber) {
      const [households] = await connection.execute(
        "SELECT household_id FROM households WHERE household_number = ?",
        [normalizedHouseholdNumber]
      );
      if (!households.length) {
        await connection.rollback();
        return res.status(400).json({ message: "Household number was not found." });
      }
      householdId = households[0].household_id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [userResult] = await connection.execute(
      `INSERT INTO resident_users (email, contact_number, password_hash)
       VALUES (?, ?, ?)`,
      [normalizedEmail || null, normalizedContactNumber || null, passwordHash]
    );

    const [profileResult] = await connection.execute(
      `INSERT INTO resident_profiles
      (resident_user_id, household_id, first_name, middle_name, last_name, suffix, birth_date,
       sex, civil_status, place_of_birth, nationality, religion, address, purok,
       contact_number, years_of_residency, employment_status, occupation,
       educational_attainment, blood_type, disability_status, voter_status,
       relationship_to_head, emergency_contact, emergency_contact_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId, householdId, firstName, middleName || null, lastName, suffix || null,
        birthDate, sex, civilStatus, placeOfBirth || null, nationality || null,
        religion || null, address, purok, normalizedContactNumber || null,
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
      residentId: profileResult.insertId
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
  const { identifier, password } = req.body;
  const loginIdentifier = typeof identifier === "string" ? identifier.trim() : "";

  if (!loginIdentifier || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Email or contact number and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ru.resident_user_id, ru.password_hash, ru.account_status, rp.resident_id
       FROM resident_users ru
       LEFT JOIN resident_profiles rp ON rp.resident_user_id = ru.resident_user_id
       WHERE ru.email = ? OR ru.contact_number = ?`,
      [loginIdentifier, loginIdentifier]
    );

    const matches = await Promise.all(rows.map(async (row) => ({
      row,
      validPassword: await bcrypt.compare(password, row.password_hash)
    })));
    const match = matches.find(({ row, validPassword }) =>
      validPassword && row.account_status === "Active"
    );

    if (!match) {
      return res.status(401).json({ message: "Invalid resident login." });
    }

    req.session.residentUser = {
      residentUserId: match.row.resident_user_id,
      residentId: match.row.resident_id
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
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to log out." });
    }

    res.json({ message: "Logged out." });
  });
});

module.exports = router;
