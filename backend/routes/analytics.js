const express = require("express");
const pool = require("../config/database");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

function getMonthSequence(currentMonth, count) {
  const [year, month] = currentMonth.split("-").map(Number);
  const currentMonthIndex = year * 12 + month - 1;

  return Array.from({ length: count }, (_, index) => {
    const monthIndex = currentMonthIndex - count + index + 1;
    const monthYear = Math.floor(monthIndex / 12);
    const monthNumber = monthIndex % 12 + 1;
    return `${monthYear}-${String(monthNumber).padStart(2, "0")}`;
  });
}

router.get("/monthly", requireAdmin, async (req, res) => {
  try {
    const [[period]] = await pool.query(
      `SELECT DATE_FORMAT(CURDATE(), '%Y-%m') AS currentMonth,
              DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m') AS previousMonth`
    );
    const monthlyRange = `DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)`;
    const [residentRows, requestRows, concernRows, [serviceRows]] = await Promise.all([
      pool.query(
        `SELECT DATE_FORMAT(registration_date, '%Y-%m') AS month, COUNT(*) AS total
         FROM resident_profiles
         WHERE registration_date >= ${monthlyRange}
         GROUP BY month`
      ),
      pool.query(
        `SELECT DATE_FORMAT(submitted_at, '%Y-%m') AS month, COUNT(*) AS total
         FROM service_requests
         WHERE submitted_at >= ${monthlyRange}
         GROUP BY month`
      ),
      pool.query(
        `SELECT DATE_FORMAT(submitted_at, '%Y-%m') AS month, COUNT(*) AS total
         FROM community_concerns
         WHERE submitted_at >= ${monthlyRange}
         GROUP BY month`
      ),
      pool.query(
        `SELECT st.name AS service, COUNT(*) AS total
         FROM service_requests sr
         JOIN service_types st ON st.service_type_id = sr.service_type_id
         WHERE sr.submitted_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           AND sr.submitted_at < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
         GROUP BY st.service_type_id, st.name
         ORDER BY total DESC, st.name ASC
         LIMIT 1`
      )
    ]);

    const totalsByMonth = rows => new Map(
      rows.map(row => [row.month, Number(row.total)])
    );
    const residentsByMonth = totalsByMonth(residentRows[0]);
    const requestsByMonth = totalsByMonth(requestRows[0]);
    const concernsByMonth = totalsByMonth(concernRows[0]);
    const months = getMonthSequence(period.currentMonth, 12);
    const monthly = months.map(month => ({
      month,
      residents: residentsByMonth.get(month) || 0,
      requests: requestsByMonth.get(month) || 0,
      concerns: concernsByMonth.get(month) || 0
    }));
    const current = monthly[monthly.length - 1];
    const previous = monthly[monthly.length - 2];
    const mostRequestedService = serviceRows[0]
      ? { name: serviceRows[0].service, requests: Number(serviceRows[0].total) }
      : null;

    res.json({
      currentMonth: period.currentMonth,
      previousMonth: period.previousMonth,
      monthly,
      mostRequestedService,
      summary: {
        residents: { current: current.residents, previous: previous.residents },
        requests: { current: current.requests, previous: previous.requests },
        concerns: { current: current.concerns, previous: previous.concerns }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load monthly analytics." });
  }
});

module.exports = router;
