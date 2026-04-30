const express = require("express");
const router = express.Router();
const { poolPromise, sql } = require("../config/dbconfig");

router.post("/login", async (req, res) => {
  try {
    const { phonenumber, pass_word } = req.body;
    const pool = await poolPromise;

    // 🔹 1. CHECK SHOP LOGIN
    const shopResult = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query(`
        SELECT si_id, shopname, password
        FROM shop_register
        WHERE phonenumber = @phonenumber
      `);

    if (shopResult.recordset.length > 0) {
      const shop = shopResult.recordset[0];

      if (shop.password !== pass_word) {
        return res.json({ success: false, message: "Wrong password" });
      }

      return res.json({
        success: true,
        role: "SHOP",
        shopid: shop.si_id,
        shopname: shop.shopname
      });
    }

    // 🔹 2. CHECK ADMIN LOGIN
    const adminResult = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query(`
        SELECT a_id, phonenumber, pass_word
        FROM admin
        WHERE phonenumber = @phonenumber
      `);

    if (adminResult.recordset.length > 0) {
      const admin = adminResult.recordset[0];

      if (admin.pass_word !== pass_word) {
        return res.json({ success: false, message: "Wrong password" });
      }

      return res.json({
        success: true,
        role: "ADMIN"
      });
    }

    return res.json({
      success: false,
      message: "User not found"
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;