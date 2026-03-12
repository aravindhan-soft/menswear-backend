const express = require("express");
const router = express.Router();
const { poolPromise, sql } = require("../config/dbconfig");
const bcrypt = require("bcryptjs");

router.post("/reset-password", async (req, res) => {
  const { phonenumber, newpassword } = req.body;

  console.log("📩 Reset password request received:", req.body);

  if (!phonenumber || !newpassword) {
    console.log("❌ Missing phone number or password");
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const pool = await poolPromise;
    console.log("✅ Connected to SQL");

    // Check if user exists
    const check = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query("SELECT * FROM signup WHERE phonenumber = @phonenumber");

    console.log("🔍 User check result:", check.recordset);

    if (check.recordset.length === 0) {
      console.log("❌ User not found");
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }

    // Hash the password
    console.log("🔐 Hashing new password...");
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    console.log("✅ Password hashed:", hashedPassword.substring(0, 20) + "...");

    // Update password
    const result = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .input("pass_word", sql.NVarChar, hashedPassword)
      .query("UPDATE signup SET pass_word = @pass_word WHERE phonenumber = @phonenumber");

    console.log("✅ Password updated:", result.rowsAffected);

    return res.status(200).json({ success: true, message: "Password reset successful ✅" });

  } catch (error) {
    console.error("❌ Detailed backend error:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

module.exports = router;
