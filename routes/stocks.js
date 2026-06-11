import express from "express";
import auth from "../middlewares/authentication.js";
import {
    registerStock,
    getAllStocks,
    getSingleStock,
    updateStockPrice
} from "../controllers/stock/stock.js";
import { buyStock, sellStock, getAllHoldings } from "../controllers/stock/holding.js";
import { getAllOrders } from "../controllers/stock/order.js";
const router = express.Router();


router.post("/register", registerStock);
router.get("", getAllStocks);
router.get("/stock", getSingleStock);
router.post("/buy", buyStock);
router.post("/sell", sellStock);
router.get("/order", getAllOrders);
router.get("/holdings", getAllHoldings);
// router.put("/stocks/:symbol", updateStockPrice)



export default router;