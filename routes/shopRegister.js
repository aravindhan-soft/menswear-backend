const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sql, poolPromise } = require("../config/dbconfig");

/* ---------- FIXED UPLOAD FOLDER ---------- */

// Full path to "upload" folder
const uploadPath = path.join(__dirname, "../upload");

// If folder does not exist → create automatically
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* ---------- MULTER STORAGE ---------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);   // use correct folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ---------- ROUTE ---------- */

router.post("/shopregister", upload.single("logo"), async (req, res) => {
  try {
    const { shopname, shopaddress, phonenumber, email, password } = req.body;

    if (!shopname || !shopaddress || !phonenumber || !email || !password) {
      return res.json({ error: "All fields are required" });
    }

    const logo = req.file ? req.file.filename : null;

    const pool = await poolPromise;

    await pool.request()
      .input("shopname", sql.NVarChar, shopname)
      .input("shopaddress", sql.NVarChar, shopaddress)
      .input("phonenumber", sql.VarChar, phonenumber)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password)
      .input("logo", sql.NVarChar, logo)
      .query(`
        INSERT INTO shop_register
        (shopname, shopaddress, phonenumber, email, password, shop_logo)
        VALUES
        (@shopname, @shopaddress, @phonenumber, @email, @password, @logo)
      `);

    res.json({ message: "Shop registered successfully" });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;