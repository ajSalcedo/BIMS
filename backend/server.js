const path = require("path");
const express = require("express");
const session = require("express-session");
require("dotenv").config();

const residentAuth = require("./routes/residentAuth");
const adminAuth = require("./routes/adminAuth");
const residents = require("./routes/residents");
const dashboard = require("./routes/dashboard");
const requests = require("./routes/requests");
const concerns = require("./routes/concerns");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "my-kpop-bias-is-twice-jihyo",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

app.use("/api/resident-auth", residentAuth);
app.use("/api/admin-auth", adminAuth);
app.use("/api/residents", residents);
app.use("/api/dashboard", dashboard);
app.use("/api/requests", requests);
app.use("/api/concerns", concerns);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "BIMS" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`BIMS running at http://localhost:${PORT}`);
});
