const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");


router.post("/save", async (req, res) => {
  const pool = await poolPromise;

  try {
    const {
      contact,
      firstname,
      lastname,
      country,
      streetname,
      apartment,
      city,
      state,
      pincode,
    } = req.body;

    let phone = null;
    let email = null;

    if (/^\d+$/.test(contact)) {
      phone = contact;
    } else {
      email = contact;
    }

    /* CHECK USER EXISTS */
    const checkUser = await pool
      .request()
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .query(`
        SELECT u_id FROM user1
        WHERE
        (@phone IS NOT NULL AND phonenumber = @phone)
        OR
        (@email IS NOT NULL AND email = @email)
      `);

    let u_id;

    if (checkUser.recordset.length > 0) {
      u_id = checkUser.recordset[0].u_id;
    } else {
      /* INSERT USER */
      await pool
        .request()
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .input("firstname", sql.VarChar, firstname)
        .input("lastname", sql.VarChar, lastname)
        .query(`
          INSERT INTO user1 (phonenumber, email, firstname, lastname)
          VALUES (@phone, @email, @firstname, @lastname)
        `);

      /* GET LAST INSERTED USER */
      const getUser = await pool
        .request()
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .query(`
          SELECT TOP 1 u_id
          FROM user1
          WHERE
          (@phone IS NOT NULL AND phonenumber = @phone)
          OR
          (@email IS NOT NULL AND email = @email)
          ORDER BY u_id DESC
        `);

      u_id = getUser.recordset[0].u_id;
    }

    /* CHECK ADDRESS EXISTS */
    const checkAddress = await pool
      .request()
      .input("u_id", sql.VarChar, u_id)
      .input("streetname", sql.VarChar, streetname)
      .input("apartment", sql.VarChar, apartment)
      .input("city", sql.VarChar, city)
      .input("state", sql.VarChar, state)
      .input("pincode", sql.VarChar, pincode)
      .query(`
        SELECT ad_id FROM address
        WHERE
        u_id = @u_id
        AND streetname = @streetname
        AND apartment = @apartment
        AND city = @city
        AND state = @state
        AND pincode = @pincode
      `);

    if (checkAddress.recordset.length === 0) {
      await pool
        .request()
        .input("u_id", sql.VarChar, u_id)
        .input("streetname", sql.VarChar, streetname)
        .input("apartment", sql.VarChar, apartment)
        .input("country", sql.VarChar, country)
        .input("city", sql.VarChar, city)
        .input("state", sql.VarChar, state)
        .input("pincode", sql.VarChar, pincode)
        .query(`
          INSERT INTO address
          (u_id, streetname, apartment, country, city, state, pincode)
          VALUES
          (@u_id, @streetname, @apartment, @country, @city, @state, @pincode)
        `);
    }

    res.json({
      success: true,
      message: "Saved successfully",
      u_id,
    });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;