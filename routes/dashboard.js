const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");

router.get("/stats/:si_id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { si_id } = req.params;

    // 🔹 TOTAL ORDERS (SHOP BASED)
    const totalOrders = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
        SELECT COUNT(*) AS totalOrders 
        FROM orders
        WHERE si_id = @si_id
      `);

    // 🔹 TODAY ORDERS (SHOP BASED)
    const todayOrders = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
        SELECT COUNT(*) AS todayOrders 
        FROM orders
        WHERE si_id = @si_id
        AND CAST(ordertime AS DATE) = CAST(GETDATE() AS DATE)
      `);

    // 🔹 TOTAL EARNINGS (SHOP BASED)
    const totalEarnings = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
        SELECT SUM(p.amount) AS totalEarnings 
        FROM payment p
        JOIN orders o ON p.or_id = o.or_id
        WHERE o.si_id = @si_id
        AND (p.paymentstatus = 'SUCCESS' OR p.paymentstatus = 'PENDING')
      `);

    // 🔹 TODAY EARNINGS (SHOP BASED)
    const todayEarnings = await pool.request()
      .input("si_id", sql.VarChar, si_id)
      .query(`
        SELECT SUM(p.amount) AS todayEarnings
        FROM payment p
        JOIN orders o ON p.or_id = o.or_id
        WHERE o.si_id = @si_id
        AND CAST(o.ordertime AS DATE) = CAST(GETDATE() AS DATE)
      `);

    res.json({
      totalOrders: totalOrders.recordset[0].totalOrders || 0,
      todayOrders: todayOrders.recordset[0].todayOrders || 0,
      totalEarnings: totalEarnings.recordset[0].totalEarnings || 0,
      todayEarnings: todayEarnings.recordset[0].todayEarnings || 0,
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


router.get("/stats-all", async (req, res) => {
  try {
    const pool = await poolPromise;

    const totalOrders = await pool.request().query(`
      SELECT COUNT(*) AS totalOrders FROM orders
    `);

    const todayOrders = await pool.request().query(`
      SELECT COUNT(*) AS todayOrders
      FROM orders
      WHERE CAST(ordertime AS DATE) = CAST(GETDATE() AS DATE)
    `);

    const totalEarnings = await pool.request().query(`
      SELECT SUM(amount) AS totalEarnings 
      FROM payment
      WHERE paymentstatus IN ('SUCCESS','PENDING')
    `);

    const todayEarnings = await pool.request().query(`
      SELECT SUM(p.amount) AS todayEarnings
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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;