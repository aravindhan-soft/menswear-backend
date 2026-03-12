const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");

router.get("/stats", async (req, res) => {
  try {
    const pool = await poolPromise;

    // 🔹 TOTAL ORDERS
    const totalOrders = await pool.request().query(`
      SELECT COUNT(*) AS totalOrders FROM orders
    `);

    // 🔹 TODAY ORDERS
    const todayOrders = await pool.request().query(`
      SELECT COUNT(*) AS todayOrders 
      FROM orders
      WHERE CAST(ordertime AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // 🔹 TOTAL EARNINGS
    const totalEarnings = await pool.request().query(`
      SELECT SUM(amount) AS totalEarnings 
      FROM payment
      WHERE paymentstatus = 'PENDING' OR paymentstatus = 'SUCCESS'
    `);

    // 🔹 TODAY EARNINGS
    const todayEarnings = await pool.request().query(`
      SELECT SUM(amount) AS todayEarnings
      FROM payment p
      JOIN orders o ON p.or_id = o.or_id
      WHERE CAST(o.ordertime AS DATE) = CAST(GETDATE() AS DATE)
    `);

    res.json({
      totalOrders: totalOrders.recordset[0].totalOrders || 0,
      todayOrders: todayOrders.recordset[0].todayOrders || 0,
      totalEarnings: totalEarnings.recordset[0].totalEarnings || 0,
      todayEarnings: todayEarnings.recordset[0].todayEarnings || 0,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;