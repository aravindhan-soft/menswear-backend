const express = require("express");
const router = express.Router();
const { poolPromise, sql } = require("../config/dbconfig"); // <-- use your SQL config file

let otpStore = {}; // temporary store (no DB save)

// ✅ Step 1: Generate OTP only if phone exists in DB
router.post("/generate-otp", async (req, res) => {
  const { phonenumber } = req.body;

  if (!phonenumber)
    return res.status(400).json({ message: "Phone number required" });

  try {
    const pool = await poolPromise;

    // 🧩 Check if phone number exists in signup table
    const result = await pool
      .request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query("SELECT phonenumber FROM signup WHERE phonenumber = @phonenumber");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Phone number not registered ❌" });
    }

    // 🧩 Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🧩 Store temporarily (not in DB)
    otpStore[phonenumber] = { otp, expiresAt: Date.now() + 2 * 60 * 1000 };

    console.log(`✅ OTP for ${phonenumber}: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent successfully ✅",
      otp, // ⚠️ for testing only (remove in production)
    });
  } catch (error) {
    console.error("OTP Generate Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Step 2: Verify OTP
router.post("/verify-otp", (req, res) => {
  const { phonenumber, otp } = req.body;

  if (!phonenumber || !otp)
    return res.status(400).json({ message: "Phone number and OTP required" });

  const stored = otpStore[phonenumber];
  if (!stored)
    return res.status(400).json({ message: "No OTP generated for this number" });

  if (Date.now() > stored.expiresAt) {
    delete otpStore[phonenumber];
    return res.status(400).json({ message: "OTP expired ⏰" });
  }

  if (stored.otp !== otp)
    return res.status(400).json({ message: "Invalid OTP ❌" });

  delete otpStore[phonenumber];
  res.json({ success: true, message: "OTP verified successfully ✅" });
});

module.exports = router;
