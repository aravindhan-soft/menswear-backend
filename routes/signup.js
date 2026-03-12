const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { sql } = require("../config/dbconfig");

router.post("/signup", async (req, res) => {

  const { si_id, phonenumber, pass_word, confirm_pass_word } = req.body;

  if (!phonenumber || !pass_word || !confirm_pass_word) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (pass_word !== confirm_pass_word) {
    return res.status(400).json({ message: "Password mismatch" });
  }

  try {

    const check = await sql.query`
      SELECT * FROM dbo.signup WHERE phonenumber=${phonenumber}
    `;

    if (check.recordset.length > 0) {
      return res.status(400).json({ message: "Already registered" });
    }

    const hash = await bcrypt.hash(pass_word, 10);

    await sql.query`
      INSERT INTO dbo.signup (si_id, phonenumber, pass_word)
      VALUES (${si_id}, ${phonenumber}, ${hash})
    `;

    res.json({ success: true, message: "Signup successful" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
