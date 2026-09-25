const readline = require("readline");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
  try {
    console.log("Create BIMS Admin Account\n");

    const username = (await ask("Username: ")).trim();
    const fullName = (await ask("Full name: ")).trim();
    const email = (await ask("Email (optional): ")).trim();
    const password = await ask("Password (minimum 8 characters): ");
    const roleInput = (await ask("Role (Administrator/Staff) [Administrator]: ")).trim();
    const role = roleInput || "Administrator";

    if (!username || !fullName || password.length < 8) {
      throw new Error("Username, full name, and a password of at least 8 characters are required.");
    }

    if (!["Administrator", "Staff"].includes(role)) {
      throw new Error("Role must be Administrator or Staff.");
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO admin_users (username, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, fullName, email || null, hash, role]
    );

    console.log("\nAdmin account created successfully.");
  } catch (error) {
    console.error("\nCould not create admin:", error.message);
  } finally {
    rl.close();
    await pool.end();
  }
})();
