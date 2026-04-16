const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig"); // ✅ FIX

router.get("/getAvailableStock/:si_id", async (req, res) => {
  try {

    const si_id = req.params.si_id;

    const pool = await poolPromise; // ✅ FIX

    const result = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
        SELECT
          pv.pv_id,
          p.product,
          c.category,
          v.variety,
          co.color,
          pv.image,
          pv.bio,
          sku.size,
          sku.quantity,
          sku.prize
        FROM product_variant pv
        INNER JOIN product p ON pv.p_id = p.p_id
        LEFT JOIN category c ON pv.c_id = c.c_id
        LEFT JOIN variety v ON pv.v_id = v.v_id
        LEFT JOIN color co ON pv.co_id = co.co_id
        LEFT JOIN product_sku sku ON pv.pv_id = sku.pv_id
        WHERE p.si_id = @si_id
        ORDER BY pv.pv_id ASC
      `);

    let grouped = {};

    result.recordset.forEach(row => {
      if (!grouped[row.pv_id]) {
        grouped[row.pv_id] = {
          pv_id: row.pv_id,
          product: row.product,
          category: row.category,
          variety: row.variety,
          color: row.color,
          bio: row.bio,
          image: row.image
            ? "data:image/png;base64," + Buffer.from(row.image).toString("base64")
            : null,
          sizes: []
        };
      }

      if (row.size) {
        grouped[row.pv_id].sizes.push({
          size: row.size,
          quantity: row.quantity,
          prize: row.prize
        });
      }
    });

    res.json({
      success: true,
      data: Object.values(grouped)
    });

  } catch (error) {
    console.log("ADMIN STOCK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;