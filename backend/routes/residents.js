const express = require("express");
const pool = require("../config/database");
const { requireResident, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const profileSelect = `
  SELECT
    rp.*,
    ru.username,
    ru.email,
    h.household_number,
    h.household_address,
    h.purok AS household_purok,
    h.status AS household_status
  FROM resident_profiles rp
  LEFT JOIN resident_users ru ON ru.resident_user_id = rp.resident_user_id
  LEFT JOIN households h ON h.household_id = rp.household_id
`;

router.get("/me/profile", requireResident, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `${profileSelect} WHERE rp.resident_id = ?`,
      [req.session.residentUser.residentId]
    );

    if (!rows.length) return res.status(404).json({ message: "Resident profile not found." });

    res.json({ profile: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load resident profile." });
  }
});

router.get("/me/household", requireResident, async (req, res) => {
  try {
    const [residentRows] = await pool.execute(
      "SELECT household_id FROM resident_profiles WHERE resident_id = ?",
      [req.session.residentUser.residentId]
    );

    if (!residentRows.length || !residentRows[0].household_id) {
      return res.json({ household: null, members: [] });
    }

    const householdId = residentRows[0].household_id;

    const [households] = await pool.execute(
      "SELECT * FROM households WHERE household_id = ?",
      [householdId]
    );

    const [members] = await pool.execute(
      `SELECT resident_id, first_name, middle_name, last_name, suffix,
              relationship_to_head, contact_number, status
       FROM resident_profiles
       WHERE household_id = ?
       ORDER BY relationship_to_head, last_name, first_name`,
      [householdId]
    );

    res.json({ household: households[0] || null, members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load household." });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();

  try {
    let sql = `
      SELECT
        rp.resident_id,
        CONCAT_WS(' ', rp.first_name, rp.middle_name, rp.last_name, rp.suffix) AS full_name,
        rp.address,
        rp.purok,
        rp.contact_number,
        rp.birth_date,
        rp.sex,
        rp.civil_status,
        rp.status
      FROM resident_profiles rp
    `;

    const params = [];

    if (q) {
      sql += `
        WHERE CONCAT_WS(' ', rp.first_name, rp.middle_name, rp.last_name, rp.suffix) LIKE ?
           OR CAST(rp.resident_id AS CHAR) LIKE ?
           OR rp.address LIKE ?
           OR rp.contact_number LIKE ?
      `;
      const term = `%${q}%`;
      params.push(term, term, term, term);
    }

    sql += " ORDER BY rp.last_name, rp.first_name LIMIT 100";

    const [rows] = await pool.execute(sql, params);
    res.json({ residents: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load residents." });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `${profileSelect} WHERE rp.resident_id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Resident not found." });

    const resident = rows[0];
    let household = null;
    let members = [];

    if (resident.household_id) {
      const [households] = await pool.execute(
        "SELECT * FROM households WHERE household_id = ?",
        [resident.household_id]
      );
      household = households[0] || null;

      [members] = await pool.execute(
        `SELECT resident_id,
                CONCAT_WS(' ', first_name, middle_name, last_name, suffix) AS full_name,
                relationship_to_head, contact_number, status
         FROM resident_profiles
         WHERE household_id = ?
         ORDER BY last_name, first_name`,
        [resident.household_id]
      );
    }

    res.json({ resident, household, members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load resident." });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const allowed = [
    "first_name", "middle_name", "last_name", "suffix", "birth_date", "sex",
    "civil_status", "place_of_birth", "nationality", "religion", "address",
    "purok", "contact_number", "years_of_residency", "employment_status",
    "occupation", "educational_attainment", "blood_type", "disability_status",
    "voter_status", "relationship_to_head", "emergency_contact",
    "emergency_contact_number", "status"
  ];

  const fields = [];
  const values = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      fields.push(`${key} = ?`);
      values.push(req.body[key] === "" ? null : req.body[key]);
    }
  }

  if (!fields.length) {
    return res.status(400).json({ message: "No fields to update." });
  }

  values.push(req.params.id);

  try {
    const [result] = await pool.execute(
      `UPDATE resident_profiles SET ${fields.join(", ")} WHERE resident_id = ?`,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Resident not found." });
    }

    res.json({ message: "Resident information updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update resident." });
  }
});

module.exports = router;
