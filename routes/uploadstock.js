const express = require("express");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const { sql, poolPromise } = require("../config/dbconfig");

// ----------------
// AUTO ID GENERATOR
// ----------------
async function generateCode(table, prefix, idName) {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP 1 ${idName}
    FROM ${table}
    ORDER BY ${idName} DESC
  `);

  if (!result.recordset.length) return prefix + "001";

  const last = result.recordset[0][idName];
  const num = parseInt(last.replace(prefix, "")) + 1;

  return prefix + num.toString().padStart(3, "0");
}

// ----------------
// GET OR INSERT
// ----------------
async function getOrInsert(table, field, value, insertObj, idName, prefix) {
  const pool = await poolPromise;

  const found = await pool.request()
    .input("value", sql.VarChar, value)
    .query(`SELECT * FROM ${table} WHERE ${field}=@value`);

  if (found.recordset.length) return found.recordset[0][idName];

  const newId = await generateCode(table, prefix, idName);

  const req = pool.request();
  req.input(idName, sql.VarChar, newId);

  Object.keys(insertObj).forEach(k => {
    req.input(k, sql.VarChar, insertObj[k]);
  });

  await req.query(`
    INSERT INTO ${table} (${idName}, ${Object.keys(insertObj).join(",")})
    VALUES (@${idName}, ${Object.keys(insertObj).map(k => "@" + k).join(",")})
  `);

  return newId;
}

// ----------------
// UPLOAD STOCK
// ----------------
router.post("/upStock", upload.single("image"), async (req, res) => {
  try {
    const {
      product,
      category,
      variety,
      color,
      size,
      prize,
      quantity
    } = req.body;

    const bio = String(req.body.bio || "");
    console.log("BIO RECEIVED:", bio);

    if (!product || !category || !color || !size || !prize || !quantity) {
      return res.json({ success: false, message: "Missing fields" });
    }

    const imageBuffer = req.file ? req.file.buffer : null;
    const pool = await poolPromise;

    // PRODUCT
    const p_id = await getOrInsert("product", "product", product, { a_id: "A001", product }, "p_id", "P");

    // CATEGORY
    const c_id = await getOrInsert("category", "category", category, { p_id, category }, "c_id", "C");

    // VARIETY (Pant → NULL)
    let v_id = null;
    if (variety) {
      v_id = await getOrInsert("variety", "variety", variety, { c_id, variety }, "v_id", "V");
    }

    // COLOR
    const co_id = await getOrInsert("color", "color", color, { c_id, color }, "co_id", "CO");

    // ================================
    // 🔥 NULL SAFE EXIST CHECK
    // ================================
    const exist = await pool.request()
      .input("p_id", sql.VarChar, p_id)
      .input("c_id", sql.VarChar, c_id)
      .input("co_id", sql.VarChar, co_id)
      .input("v_id", sql.VarChar, v_id)
      .query(`
        SELECT pv_id FROM product_variant
        WHERE p_id=@p_id
          AND c_id=@c_id
          AND co_id=@co_id
          AND (
                (v_id = @v_id)
                OR (v_id IS NULL AND @v_id IS NULL)
              )
      `);

    let pv_id;

    // ================================
    // UPDATE IF EXISTS
    // ================================
    if (exist.recordset.length > 0) {

      pv_id = exist.recordset[0].pv_id;

      await pool.request()
        .input("pv_id", sql.VarChar, pv_id)
        .input("bio", sql.NVarChar(sql.MAX), bio)
        .query(`
          UPDATE product_variant
          SET bio = @bio
          WHERE pv_id = @pv_id
        `);
    }

    // ================================
    // INSERT IF NOT EXISTS
    // ================================
    else {

      pv_id = await generateCode("product_variant", "PV", "pv_id");

      await pool.request()
        .input("pv_id", sql.VarChar, pv_id)
        .input("p_id", sql.VarChar, p_id)
        .input("c_id", sql.VarChar, c_id)
        .input("v_id", sql.VarChar, v_id)
        .input("co_id", sql.VarChar, co_id)
        .input("bio", sql.NVarChar(sql.MAX), bio)
        .input("image", sql.VarBinary(sql.MAX), imageBuffer)
        .query(`
          INSERT INTO product_variant
          (pv_id,p_id,c_id,v_id,co_id,bio,image)
          VALUES(@pv_id,@p_id,@c_id,@v_id,@co_id,@bio,@image)
        `);
    }

    // ================================
    // SKU CHECK
    // ================================
    const skuCheck = await pool.request()
      .input("pv_id", sql.VarChar, pv_id)
      .input("size", sql.VarChar, size)
      .query(`
        SELECT sku_id FROM product_sku 
        WHERE pv_id=@pv_id AND size=@size
      `);

    if (skuCheck.recordset.length)
      return res.json({ success: false, message: "Size already exists" });

    const sku_id = await generateCode("product_sku", "SKU", "sku_id");

    await pool.request()
      .input("sku_id", sql.VarChar, sku_id)
      .input("pv_id", sql.VarChar, pv_id)
      .input("size", sql.VarChar, size)
      .input("prize", sql.Int, prize)
      .input("quantity", sql.Int, quantity)
      .query(`
        INSERT INTO product_sku
        (sku_id,pv_id,size,prize,quantity)
        VALUES(@sku_id,@pv_id,@size,@prize,@quantity)
      `);

    res.json({ success: true, message: "Stock uploaded successfully" });

  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
