const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");

router.post("/create", async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
 
  try {
    const { u_id, paymentMethod, product } = req.body;

    if (!u_id || !product?.pv_id || !product?.size) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const pv_id = product.pv_id;
    const quantity = parseInt(product.quantity);
    const perprize = parseInt(product.price);
    const total = quantity * perprize;
    const size = product.size;
    const si_id = product.shopId;

    console.log("Received shopId:", si_id);
    // Convert image
    let imageBuffer = null;
    if (product.image) {
      imageBuffer = Buffer.from(
        product.image.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
    }

    await transaction.begin();

    // 🔹 Get latest address
    const addressResult = await new sql.Request(transaction)
      .input("u_id", sql.VarChar, u_id)
      .query(`
        SELECT TOP 1 ad_id 
        FROM address 
        WHERE u_id = @u_id 
        ORDER BY ad_id DESC
      `);

    if (addressResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Address not found"
      });
    }

    const ad_id = addressResult.recordset[0].ad_id;

    // 🔻 CHECK STOCK
    const stockCheck = await new sql.Request(transaction)
      .input("pv_id", sql.VarChar, pv_id)
      .input("size", sql.VarChar, size)
      .query(`
        SELECT quantity 
        FROM product_sku
        WHERE pv_id = @pv_id AND size = @size
      `);

    if (stockCheck.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Selected size not available"
      });
    }

    const availableStock = stockCheck.recordset[0].quantity;

    if (availableStock < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Not enough stock available"
      });
    }

    // 🔻 REDUCE STOCK
    await new sql.Request(transaction)
      .input("pv_id", sql.VarChar, pv_id)
      .input("size", sql.VarChar, size)
      .input("quantity", sql.Int, quantity)
      .query(`
        UPDATE product_sku
        SET quantity = quantity - @quantity
        WHERE pv_id = @pv_id AND size = @size
      `);

    // 🔹 INSERT ORDER
   await new sql.Request(transaction)
  .input("u_id", sql.VarChar, u_id)
  .input("ad_id", sql.VarChar, ad_id)
  .input("si_id", sql.VarChar, si_id)   // ✅ FIXED
  .input("pv_id", sql.VarChar, pv_id)
  .input("image", sql.VarBinary(sql.MAX), imageBuffer)
  .input("quantity", sql.Int, quantity)
  .input("perprize", sql.Int, perprize)
  .input("total", sql.Int, total)
  .input("size", sql.VarChar, size)
  .query(`
    INSERT INTO orders
    (u_id, ad_id, pv_id, si_id, image, quantity, perprize, total, orderstatus, size)
    VALUES
    (@u_id, @ad_id, @pv_id, @si_id, @image, @quantity, @perprize, @total, 'PLACED', @size)
  `);

    // 🔹 GET ORDER ID
    const orderResult = await new sql.Request(transaction)
      .input("u_id", sql.VarChar, u_id)
      .query(`
        SELECT TOP 1 or_id
        FROM orders
        WHERE u_id = @u_id
        ORDER BY ordertime DESC
      `);

    const or_id = orderResult.recordset[0].or_id;

    // 🔹 INSERT PAYMENT
    await new sql.Request(transaction)
      .input("or_id", sql.VarChar, or_id)
      .input("amount", sql.Int, total)
      .input("deliverycharge", sql.Int, 100)
      .input("paymentmethod", sql.VarChar, paymentMethod)
      .input("paymentstatus", sql.VarChar, "SUCCESS")
      .input("transactionid", sql.VarChar, null)
      .query(`
        INSERT INTO payment
        (or_id, amount, deliverycharge, paymentmethod, paymentstatus, transactionid)
        VALUES
        (@or_id, @amount, @deliverycharge, @paymentmethod, @paymentstatus, @transactionid)
      `);

    await transaction.commit();

    res.json({
      success: true,
      or_id,
      totalAmount: total
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.get("/customer/:phonenumber", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { phonenumber } = req.params;

    const result = await pool.request()
      .input("phonenumber", sql.VarChar, phonenumber)
      .query(`
        SELECT 
          o.or_id,
          o.size,
          o.perprize,
          o.ordertime,
          o.image,
          c.category,
          p.product,
          pay.paymentmethod AS paymentType
        FROM orders o
        JOIN user1 u ON o.u_id = u.u_id
        JOIN product_variant pv ON o.pv_id = pv.pv_id
        JOIN product p ON pv.p_id = p.p_id
        LEFT JOIN category c ON pv.c_id = c.c_id
        LEFT JOIN payment pay ON o.or_id = pay.or_id
        WHERE u.phonenumber = @phonenumber
        ORDER BY o.ordertime DESC
      `);

    const orders = result.recordset.map(o => ({
      ...o,
      image: o.image
        ? `data:image/jpeg;base64,${o.image.toString("base64")}`
        : null
    }));

    res.json({
      success: true,
      orders
    });

  } catch (err) {
    console.log("CUSTOMER ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


module.exports = router;