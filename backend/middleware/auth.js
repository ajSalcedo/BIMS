function requireResident(req, res, next) {
  if (!req.session.residentUser) {
    return res.status(401).json({ message: "Resident login required." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin login required." });
  }
  next();
}

module.exports = { requireResident, requireAdmin };
