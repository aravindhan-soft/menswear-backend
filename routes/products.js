const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../config/dbconfig");

router.get("/getproducts", (req, res) => {
  res.json({ message: "API working ✅" });
});
module.exports = router;