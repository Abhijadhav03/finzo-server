import { StatusCodes } from "http-status-codes";
import Stock from "../../models/Stock.js";
import { BadRequestError } from "../../errors/index.js";

const registerStock = async (req, res) => {
    const { symbol, companyName, currentPrice, lastDayTradedPrice, iconUrl } = req.body;
    if (!symbol || !companyName || !currentPrice || !lastDayTradedPrice || !iconUrl) {
        throw new BadRequestError("Please provide all the required fields");
    }
    try {
        const stockAlreadyExists = await Stock.findOne({ symbol });
        if (stockAlreadyExists) {
            throw new BadRequestError("stock already exists");
        }
        const stock = await Stock.create({
            symbol,
            companyName,
            currentPrice,
            lastDayTradedPrice,
            iconUrl
        })
        await stock.save();
        res.status(StatusCodes.CREATED).json({
            msg: "Stock added Successfully",
            data: stock
        });
    } catch (error) {
        console.log(error);
        throw new BadRequestError(error.message);
    }
};

const getAllStocks = async (req, res) => {
    try {
        const stocks = await Stock.find().select(
            "-dayTimeSeries -tenMinTimeSeries"
        );
        res.status(StatusCodes.OK).json({
            msg: "Stocks fetched successfully",
            count: stocks.length,
            data: stocks
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to retrieve stocks: " + error.message);
    }
};

const getSingleStock = async (req, res) => {
    const { symbol } = req.params;
    if (!symbol) {
        throw new BadRequestError("Please provide stock symbol")
    }
    try {
        const stock = await Stock.findOne({ symbol });
        if (!stock) {
            throw new BadRequestError("Stock not found")
        }
        res.status(StatusCodes.OK).json({
            msg: "Stock fetched successfully",
            data: stock
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to retrieve stock: " + error.message);
    }
};

const updateStockPrice = async (req, res) => {
    const { symbol } = req.params;
    const { currentPrice, lastDayTradedPrice } = req.body;

    if (!currentPrice || !lastDayTradedPrice) {
        throw new BadRequestError("Please provide updated price and last day traded price");
    }

    if (!symbol) {
        throw new BadRequestError("Please provide stock symbol")
    }

    try {
        const stock = await Stock.findOne({ symbol });

        if (!stock) {
            throw new BadRequestError("Stock not found")
        }

        const updatedStock = await Stock.findOneAndUpdate(
            { symbol },
            {
                currentPrice,
                lastDayTradedPrice
            },
            { new: true }
        );

        res.status(StatusCodes.OK).json({
            msg: "Stock updated successfully",
            data: updatedStock
        })

    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to update stock: " + error.message);
    }
};

export { registerStock, getAllStocks, getSingleStock, updateStockPrice };   