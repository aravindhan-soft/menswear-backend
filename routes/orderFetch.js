const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");


// =====================================
// 📌 GET TODAY ORDERS
// =====================================
router.get("/today/:si_id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { si_id } = req.params;  // ✅ GET SHOP ID

    const result = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
SELECT  
  o.or_id,
  o.size,
  o.quantity,
  o.perprize,
  o.total,
  o.orderstatus,
  o.ordertime,
  o.image,
  u.firstname,
  u.lastname,
  u.phonenumber,
  a.streetname,
  a.city,
  a.state,
  a.pincode
FROM orders o
JOIN user1 u ON o.u_id = u.u_id
JOIN address a ON o.ad_id = a.ad_id
WHERE o.si_id = @si_id   -- ✅ IMPORTANT FILTER
AND o.ordertime >= CAST(GETDATE() AS DATE)
AND o.ordertime < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
ORDER BY o.ordertime DESC
      `);

    const orders = result.recordset.map(order => ({
      ...order,
      image: order.image
        ? `data:image/jpeg;base64,${order.image.toString("base64")}`
        : null
    }));

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (err) {
    console.error("TODAY ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// =====================================
// 📌 GET ALL ORDERS
// =====================================
// 🔥 ADMIN - ALL SHOPS
router.get("/today-all", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT  
        o.or_id,
        o.size,
        o.quantity,
        o.perprize,
        o.total,
        o.orderstatus,
        o.ordertime,
        o.image,
        u.firstname,
        u.lastname,
        u.phonenumber,
        a.streetname,
        a.city,
        a.state,
        a.pincode
      FROM orders o
      JOIN user1 u ON o.u_id = u.u_id
      JOIN address a ON o.ad_id = a.ad_id
      WHERE CAST(o.ordertime AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY o.ordertime DESC
    `);

    const orders = result.recordset.map(order => ({
      ...order,
      image: order.image
        ? `data:image/jpeg;base64,${order.image.toString("base64")}`
        : null
    }));

    res.json({ success: true, orders });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;