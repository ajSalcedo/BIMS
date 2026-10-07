const path = require("path");
const express = require("express");
const session = require("express-session");
require("dotenv").config();

const residentAuth = require("./routes/residentAuth");
const adminAuth = require("./routes/adminAuth");
const residents = require("./routes/residents");
const dashboard = require("./routes/dashboard");
<<<<<<< HEAD
const requests = require("./routes/requests");
const concerns = require("./routes/concerns");
=======
>>>>>>> f306956f3c2100a930787040fe4b05e0bb925221

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
<<<<<<< HEAD
    secret: process.env.SESSION_SECRET || "my-kpop-bias-is-twice-jihyo",
=======
    secret: process.env.SESSION_SECRET || "development-secret-change-me",
>>>>>>> f306956f3c2100a930787040fe4b05e0bb925221
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
<<<<<<< HEAD
app.use("/api/requests", requests);
app.use("/api/concerns", concerns);
=======
>>>>>>> f306956f3c2100a930787040fe4b05e0bb925221

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
