import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors/index.js";
import Holding from "../../models/Holding.js";
import User from "../../models/User.js";
import Order from "../../models/order.js";
import Stock from "../../models/Stock.js";
import jwt from "jsonwebtoken";

const buyStock = async (req, res) => {
    const { stock_id, quantity } = req.body;

    if (!stock_id || !quantity) {
        throw new BadRequestError("Please provide stock_id and quantity")
    }

    try {
        const accessToken = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
        const userId = decodedToken.userId;

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            throw new BadRequestError("User not found")
        }

        const stock = await Stock.findById(stock_id);
        if (!stock) {
            throw new BadRequestError("Stock not found")
        }
        const buyPrice = stock.currentPrice;
        const totalPrice = buyPrice * quantity;

        if (currentUser.balance < totalPrice) {
            throw new BadRequestError("Insufficient balance")
        }
        currentUser.balance -= totalPrice;
        await currentUser.save();
        const newHolding = new Holding({
            user: userId,
            stock: stock_id,
            quantity,
            buyPrice
        });
        await newHolding.save();

        const newOrder = new Order({
            userId: userId,
            stockId: stock_id,
            quantity: quantity,
            price: stock.currentPrice,
            orderType: "buy",
            remainingBalance: currentUser.balance,

        })

        await newOrder.save();
        res.status(StatusCodes.CREATED).json({
            msg: "Stock bought successfully",
            data: newHolding
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to buy stock: " + error.message);
    }
};

const sellStock = async (req, res) => {
    const { holdingId, quantity } = req.body;

    if (!holdingId || !quantity) {
        throw new BadRequestError("Please provide holdingId and quantity")
    }

    try {
        const accessToken = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
        const userId = decodedToken.userId;

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            throw new BadRequestError("User not found")
        }

        const holding = await Holding.findById(holdingId);
        if (!holding) {
            throw new BadRequestError("Holding not found")
        }

        const stock = await Stock.findById(holding.stock);
        if (!stock) {
            throw new BadRequestError("Stock not found")
        }

        if (holding.quantity < quantity) {
            throw new BadRequestError("Insufficient quantity")
        }

        const sellPrice = stock.currentPrice;
        const totalPrice = sellPrice * quantity;

        currentUser.balance += totalPrice;
        await currentUser.save();

        holding.quantity -= quantity;
        await holding.save();

        const newOrder = new Order({
            userId: userId,
            stockId: holding.stock,
            quantity: quantity,
            price: sellPrice,
            orderType: "sell",
            remainingBalance: currentUser.balance,
        });

        await newOrder.save();
        res.status(StatusCodes.CREATED).json({
            msg: "Stock sold successfully",
            data: holding
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to sell stock: " + error.message);
    }
};

const getAllHoldings = async (req, res) => {
    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET)
    const userId = decodedToken.userId;
    try {
        const holdings = await Holding.find({ user: userId }).populate(
            {
                path: "stock",
                select: "-dayTimeSeries -tenMinTimeSeries"
            }
        );
        res.status(StatusCodes.OK).json({
            msg: "Holdings fetched successfully",
            data: holdings
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to fetch holdings: " + error.message);
    }
};


export { buyStock, sellStock, getAllHoldings };