require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB } = require("./config/dbconfig");
const path = require("path");

// Routes
const signup = require("./routes/signup");
const login = require("./routes/login");
const forgetpassword = require("./routes/forgetpassword");
const resetPasswordRoute = require("./routes/forgetpassword2");
const uploadStock = require("./routes/uploadstock");
const availablestockRoute = require("./routes/availableStock");
const productRoutes = require("./routes/products");
const saveRoute = require("./routes/save");
const orderRoutes = require("./routes/order");
const orderFetchRoute = require("./routes/orderFetch");
const payment = require("./routes/payment");
const dashboardRoutes = require("./routes/dashboard");
const shopRegisterRoute = require("./routes/shopRegister");
const getShopsRoute = require("./routes/getShops");

const app = express();



app.use(cors({
  origin: [
    "http://localhost:5174",
    "http://localhost:5173",
    "https://menswear-coderead2026.netlify.app",
     "https://menswear-frontend.vercel.app"
  ]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());


// Register Routes
app.use("/api", signup);
app.use("/api", login);
app.use("/api", forgetpassword);
app.use("/api", resetPasswordRoute);
app.use("/api", uploadStock);
app.use("/", availablestockRoute);
app.use("/api", productRoutes);
app.use("/api", saveRoute);
app.use("/api/order", orderRoutes);
app.use("/api/order", orderFetchRoute);  
app.use("/api/payment", payment);
app.use("/dashboard", dashboardRoutes);
app.use("/api", shopRegisterRoute);
app.use("/upload", express.static(path.join(__dirname, "upload")));
app.use("/api", getShopsRoute);

// Start server 
const PORT = parseInt(process.env.PORT, 10) || 5000;
console.log("FINAL PORT =", PORT);
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
console.log("KEY:", process.env.RAZORPAY_KEY_ID);