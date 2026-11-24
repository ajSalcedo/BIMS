const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const pool = require("../config/database");

const router = express.Router();
const PASSWORD_MIN_LENGTH = 10;
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const PROOF_TYPES = new Set([
  "Utility Bill",
  "Barangay Certificate",
  "Lease / Rental Agreement",
  "Government-issued ID",
  "Other"
]);
const SEX_OPTIONS = new Set(["Male", "Female", "Other", "Prefer not to say"]);
const CIVIL_STATUS_OPTIONS = new Set(["Single", "Married", "Widowed", "Separated", "Other"]);
const NOTIFICATION_OPTIONS = new Set(["SMS", "Email", "Both"]);
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Proof of residency must be a JPG, PNG, or PDF file."));
    }
    callback(null, true);
  }
});

function parseProofUpload(req, res, next) {
  proofUpload.single("proofOfResidency")(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Proof of residency must be 5 MB or smaller." });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: "Unable to process the proof-of-residency upload." });
    }
    return res.status(400).json({ message: error.message });
  });
}

function normalizeMobileNumber(value) {
  let mobileNumber = value.replace(/[\s()-]/g, "");
  if (/^\+?639\d{9}$/.test(mobileNumber)) {
    mobileNumber = `0${mobileNumber.replace(/^\+?63/, "")}`;
  }
  return /^09\d{9}$/.test(mobileNumber) ? mobileNumber : null;
}

function getProofMimeType(file) {
  const { buffer, mimetype, originalname } = file;
  const extension = originalname.toLowerCase().split(".").pop();
  const signatures = [
    { mime: "image/jpeg", extension: ["jpg", "jpeg"], matches: buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { mime: "image/png", extension: ["png"], matches: buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mime: "application/pdf", extension: ["pdf"], matches: buffer.subarray(0, 5).toString("ascii") === "%PDF-" }
  ];
  return signatures.find(type =>
    type.mime === mimetype && type.extension.includes(extension) && type.matches
  )?.mime || null;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatAddress(address) {
  return [
    address.houseNumber,
    address.street,
    address.purok,
    address.barangay,
    address.cityMunicipality,
    address.province,
    address.zipCode,
    address.region
  ].filter(Boolean).join(", ");
}

function collectAddress(body, prefix) {
  const read = suffix => clean(body[`${prefix}${suffix}`]);
  return {
    region: read("Region"),
    province: read("Province"),
    cityMunicipality: read("CityMunicipality"),
    barangay: read("Barangay"),
    purok: read("Purok"),
    street: read("Street"),
    houseNumber: read("HouseNumber"),
    zipCode: read("ZipCode")
  };
}

function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= todayUtc;
}

router.post("/register", parseProofUpload, async (req, res) => {
  const body = req.body || {};
  const email = clean(body.email).toLowerCase();
  const mobileNumber = normalizeMobileNumber(clean(body.contactNumber));
  const password = body.password;
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const birthDate = clean(body.birthDate);
  const citizenship = clean(body.citizenship);
  const relationshipToHead = clean(body.relationshipToHead);
  const proofDocumentType = clean(body.proofDocumentType);
  const consented = body.privacyConsent === "true";
  const permanentAddress = collectAddress(body, "permanent");
  const samePresentAddress = body.presentAddressSameAsPermanent === "true";
  const presentAddress = samePresentAddress
    ? { ...permanentAddress }
    : collectAddress(body, "present");
  const presentAddressEntered = Object.values(presentAddress).some(Boolean);

  if (typeof password === "string" && typeof body.confirmPassword === "string" &&
      password !== body.confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  if (!mobileNumber || !firstName || !lastName || !isValidBirthDate(birthDate) ||
      !citizenship || !relationshipToHead ||
      !permanentAddress.region || !permanentAddress.province ||
      !permanentAddress.cityMunicipality || !permanentAddress.barangay ||
      !permanentAddress.purok || !proofDocumentType || !consented ||
      typeof password !== "string" || !password ||
      typeof body.confirmPassword !== "string" || password !== body.confirmPassword ||
      !PROOF_TYPES.has(proofDocumentType) || !req.file) {
    return res.status(400).json({
      message: "Complete all required registration fields, provide valid proof of residency, and accept the privacy notice."
    });
  }

  const fieldLimits = {
    firstName: 80,
    middleName: 80,
    lastName: 80,
    suffix: 20,
    citizenship: 100,
    relationshipToHead: 80,
    occupation: 100,
    landmark: 255,
    previousAddress: 1000,
    permanentRegion: 100,
    permanentProvince: 100,
    permanentCityMunicipality: 100,
    permanentBarangay: 100,
    permanentPurok: 100,
    permanentStreet: 150,
    permanentHouseNumber: 50,
    permanentZipCode: 20,
    presentRegion: 100,
    presentProvince: 100,
    presentCityMunicipality: 100,
    presentBarangay: 100,
    presentPurok: 100,
    presentStreet: 150,
    presentHouseNumber: 50,
    presentZipCode: 20
  };
  for (const [field, maximum] of Object.entries(fieldLimits)) {
    if (clean(body[field]).length > maximum) {
      return res.status(400).json({ message: `${field} must be ${maximum} characters or fewer.` });
    }
  }

  if (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (password.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({
      message: "Password must be at least 10 characters and include letters and numbers."
    });
  }

  const sex = clean(body.sex);
  const civilStatus = clean(body.civilStatus);
  if ((sex && !SEX_OPTIONS.has(sex)) ||
      (civilStatus && !CIVIL_STATUS_OPTIONS.has(civilStatus))) {
    return res.status(400).json({ message: "Select a valid sex and civil status, or leave them blank." });
  }

  if (!NOTIFICATION_OPTIONS.has(clean(body.preferredNotification)) && clean(body.preferredNotification)) {
    return res.status(400).json({ message: "Select a valid preferred notification method." });
  }

  const presentRequired = ["region", "province", "cityMunicipality", "barangay", "purok"];
  if (!samePresentAddress && presentAddressEntered &&
      presentRequired.some(field => !presentAddress[field])) {
    return res.status(400).json({
      message: "Complete the region, province, city/municipality, barangay, and purok for the present address."
    });
  }

  const address = formatAddress(permanentAddress);
  const currentAddress = presentAddressEntered ? formatAddress(presentAddress) : null;
  if (address.length > 255 || (currentAddress && currentAddress.length > 255)) {
    return res.status(400).json({ message: "Address is too long. Shorten the address details and try again." });
  }

  const yearsOfResidencyValue = clean(body.yearsOfResidency);
  const yearsOfResidency = yearsOfResidencyValue ? Number(yearsOfResidencyValue) : null;
  if (yearsOfResidency !== null &&
      (!Number.isFinite(yearsOfResidency) || yearsOfResidency < 0 || yearsOfResidency > 150)) {
    return res.status(400).json({ message: "Years of residency must be between 0 and 150." });
  }

  const householdSizeValue = clean(body.householdSize);
  const householdSize = householdSizeValue ? Number(householdSizeValue) : null;
  if (householdSize !== null &&
      (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 100)) {
    return res.status(400).json({ message: "Household size must be a whole number between 1 and 100." });
  }

  const proofMimeType = getProofMimeType(req.file);
  if (!proofMimeType) {
    return res.status(400).json({ message: "The uploaded file does not match an accepted JPG, PNG, or PDF format." });
  }

  const householdReferenceNumber = clean(body.householdReferenceNumber);
  if (householdReferenceNumber.length > 30) {
    return res.status(400).json({ message: "Household reference number must be 30 characters or fewer." });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existing] = await connection.execute(
      `SELECT ru.resident_user_id
       FROM resident_users ru
       LEFT JOIN resident_profiles rp ON rp.resident_user_id = ru.resident_user_id
       WHERE ru.email = ? OR rp.contact_number = ?
       LIMIT 1`,
      [email || null, mobileNumber]
    );

    if (existing.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ message: "Mobile number or email address is already registered." });
    }

    let householdId = null;
    if (householdReferenceNumber) {
      const [households] = await connection.execute(
        "SELECT household_id FROM households WHERE household_number = ?",
        [householdReferenceNumber]
      );
      if (!households.length) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ message: "Household reference number was not found." });
      }
      householdId = households[0].household_id;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.execute(
      "INSERT INTO resident_users (email, password_hash) VALUES (?, ?)",
      [email || null, passwordHash]
    );
    const [profileResult] = await connection.execute(
      `INSERT INTO resident_profiles
      (resident_user_id, household_id, first_name, middle_name, last_name, suffix, birth_date,
       sex, civil_status, citizenship, address, purok, contact_number, preferred_notification,
       years_of_residency, permanent_region, permanent_province, permanent_city_municipality,
       permanent_barangay, permanent_purok, permanent_street, permanent_house_number,
       permanent_zip_code, present_address_same_as_permanent, present_region, present_province,
       present_city_municipality, present_barangay, present_purok, present_street,
       present_house_number, present_zip_code, landmark, previous_address,
       household_reference_number, reported_household_size, occupation, relationship_to_head,
       voter_status, privacy_consent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unknown', ?)`,
      [
        userResult.insertId,
        householdId,
        firstName,
        clean(body.middleName) || null,
        lastName,
        clean(body.suffix) || null,
        birthDate,
        sex || null,
        civilStatus || null,
        citizenship,
        address,
        permanentAddress.purok,
        mobileNumber,
        clean(body.preferredNotification) || null,
        yearsOfResidency,
        permanentAddress.region,
        permanentAddress.province,
        permanentAddress.cityMunicipality,
        permanentAddress.barangay,
        permanentAddress.purok,
        permanentAddress.street || null,
        permanentAddress.houseNumber || null,
        permanentAddress.zipCode || null,
        samePresentAddress,
        presentAddressEntered ? presentAddress.region || null : null,
        presentAddressEntered ? presentAddress.province || null : null,
        presentAddressEntered ? presentAddress.cityMunicipality || null : null,
        presentAddressEntered ? presentAddress.barangay || null : null,
        presentAddressEntered ? presentAddress.purok || null : null,
        presentAddressEntered ? presentAddress.street || null : null,
        presentAddressEntered ? presentAddress.houseNumber || null : null,
        presentAddressEntered ? presentAddress.zipCode || null : null,
        clean(body.landmark) || null,
        clean(body.previousAddress) || null,
        householdReferenceNumber || null,
        householdSize,
        clean(body.occupation) || null,
        relationshipToHead,
        new Date()
      ]
    );

    await connection.execute(
      `INSERT INTO resident_proof_documents
       (resident_id, document_type, file_name, mime_type, file_size, file_data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        profileResult.insertId,
        proofDocumentType,
        req.file.originalname.replace(/[\\/]/g, "_").slice(0, 255),
        proofMimeType,
        req.file.size,
        req.file.buffer
      ]
    );

    await connection.commit();
    transactionStarted = false;
    req.session.residentUser = {
      residentUserId: userResult.insertId,
      residentId: profileResult.insertId
    };

    res.status(201).json({
      message: "Resident account created successfully.",
      residentId: profileResult.insertId
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Unable to roll back resident registration.", rollbackError);
      }
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Mobile number or email address is already registered." });
    }
    console.error(error);
    res.status(500).json({ message: "Unable to create resident account." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  const rawIdentifier = clean(identifier);
  const loginIdentifier = normalizeMobileNumber(rawIdentifier) || rawIdentifier;

  if (!loginIdentifier || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Mobile number and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ru.resident_user_id, ru.password_hash, ru.account_status, rp.resident_id
       FROM resident_users ru
       LEFT JOIN resident_profiles rp ON rp.resident_user_id = ru.resident_user_id
       WHERE ru.email = ? OR rp.contact_number = ?`,
      [loginIdentifier, loginIdentifier]
    );

    const matches = await Promise.all(rows.map(async row => ({
      row,
      validPassword: await bcrypt.compare(password, row.password_hash)
    })));
    const match = matches.find(({ row, validPassword }) =>
      validPassword && row.account_status === "Active" && row.resident_id
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

async function sendProofDocument(residentId, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT file_data, mime_type FROM resident_proof_documents WHERE resident_id = ?`,
      [residentId]
    );
    if (!rows.length) return res.status(404).json({ message: "Proof-of-residency document not found." });

    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf"
    }[rows[0].mime_type];
    res.set({
      "Content-Type": rows[0].mime_type,
      "Content-Disposition": `attachment; filename="proof-of-residency.${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    });
    res.send(rows[0].file_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load proof-of-residency document." });
  }
}

router.get("/me/proof-of-residency", (req, res) => {
  if (!req.session.residentUser) {
    return res.status(401).json({ message: "Resident login required." });
  }
  return sendProofDocument(req.session.residentUser.residentId, res);
});

router.get("/me", async (req, res) => {
  if (!req.session.residentUser) {
    return res.status(401).json({ message: "Not logged in." });
  }

  res.json({ resident: req.session.residentUser });
});

router.post("/logout", (req, res) => {
  req.session.destroy(error => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to log out." });
    }

    res.json({ message: "Logged out." });
  });
});

module.exports = router;
