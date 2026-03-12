const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { poolPromise, sql } = require("../config/dbconfig");

router.post("/login", async (req, res) => {
  try {
    const { phonenumber, pass_word } = req.body;

    const pool = await poolPromise;

    const result = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query("SELECT * FROM signup WHERE phonenumber=@phonenumber");

    if (!result.recordset.length)
      return res.status(404).json({ message: "User not found" });

    const user = result.recordset[0];

    const match = await bcrypt.compare(pass_word, user.pass_word);

    if (!match)
      return res.status(401).json({ message: "Wrong password" });

    res.json({
      message: "Login successful",
      username: user.phonenumber
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
