const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");

router.get("/getproducts", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { category } = req.query;

    let query = `
      SELECT
        pv.pv_id,
        p.product,
        c.category,
        v.variety,
        ISNULL(pv.bio, '') AS bio,
        co.color,
        pv.image,
        sku.size,
        sku.prize,
        sku.quantity
      FROM product_variant pv
      JOIN product p ON pv.p_id = p.p_id
      LEFT JOIN category c ON pv.c_id = c.c_id
      LEFT JOIN variety v ON pv.v_id = v.v_id
      LEFT JOIN color co ON pv.co_id = co.co_id
      JOIN product_sku sku ON pv.pv_id = sku.pv_id
    `;

    if (category) {
      query += ` WHERE c.category = @category`;
    }

    query += ` ORDER BY pv.pv_id DESC`;

    const request = pool.request();

    if (category) {
      request.input("category", sql.VarChar, category);
    }

    const result = await request.query(query);

    const grouped = {};

    result.recordset.forEach(row => {
      if (!grouped[row.pv_id]) {
        grouped[row.pv_id] = {
          pv_id: row.pv_id,
          product: row.product,
          category: row.category,
          variety: row.variety,
          color: row.color,
          bio: row.bio, // now guaranteed to exist
          image: row.image
            ? "data:image/jpeg;base64," +
              Buffer.from(row.image).toString("base64")
            : null,
          sizes: []
        };
      }

      grouped[row.pv_id].sizes.push({
        size: row.size,
        prize: row.prize,
        quantity: row.quantity
      });
    });

    res.json({ success: true, data: Object.values(grouped) });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ success: false });
  }
});


module.exports = router;