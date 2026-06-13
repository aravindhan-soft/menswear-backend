const express = require("express");
const router = express.Router();

const { sql, poolPromise } = require("../config/dbconfig");


// ==================================================
// GET ALL SHOPS
// ==================================================
router.get("/shops", async (req, res) => {
  try {
    const pool = await poolPromise;

    if (!pool) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const result = await pool.request().query(`
      SELECT 
        si_id,
        shopname,
        shopaddress,
        shop_logo
      FROM shop_register
      ORDER BY created_at DESC
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error("🔥 Shops API Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==================================================
// GET PRODUCTS BASED ON SHOP
// ==================================================
router.get("/shopProducts/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input("shopId", sql.VarChar, shopId)
      .query(`
        SELECT 
          pv.pv_id,
          p.product,
          c.category,
          v.variety,
          co.color,
          ps.sku_id,
          ps.size,
          ps.price,
          ps.quantity,
          pv.bio,
          pv.image
        FROM product p
        JOIN category c ON p.p_id = c.p_id
        JOIN variety v ON c.c_id = v.c_id
        JOIN color co ON c.c_id = co.c_id
        JOIN product_variant pv 
            ON p.p_id = pv.p_id 
           AND c.c_id = pv.c_id
           AND v.v_id = pv.v_id
           AND co.co_id = pv.co_id
        JOIN product_sku ps ON pv.pv_id = ps.pv_id
        WHERE p.si_id = @shopId
      `);

    res.json(result.recordset);

  } catch (err) {
    console.log("Shop Product Error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router; 