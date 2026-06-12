import cron from "node-cron";
import Stock from "../models/Stock.js";
import { store10min, generateStockPrice } from "./stockUtils.js";

const holidays = ["2025-08-26", "2025-11-16"];

// Check if current time is within trading hours
const isTradingHour = () => {
    const now = new Date();

    const dayOfWeek = now.getDay();
    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;

    const isTradingTime =
        (now.getHours() === 9 && now.getMinutes() >= 30) ||
        (now.getHours() === 15 && now.getMinutes() <= 30) ||
        (now.getHours() > 9 && now.getHours() < 15);

    const currentDate = now.toISOString().split("T")[0];

    // return true; // Temporarily bypassed for testing
    return isWeekday && isTradingTime && !holidays.includes(currentDate);
};

// Check if today is a valid trading day
const isNewTradeDay = () => {
    const now = new Date();

    const dayOfWeek = now.getDay();
    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;

    const currentDate = now.toISOString().split("T")[0];

    return isWeekday && !holidays.includes(currentDate);
};

// Reset stock data every trading day at 9:15 AM
const scheduleDayReset = () => {
    cron.schedule("15 9 * * 1-5", async () => {
        try {
            if (!isNewTradeDay()) return;

            await Stock.updateMany(
                {},
                [
                    {
                        $set: {
                            dayTimeSeries: [],
                            lastMinTimeSeries: [],

                            // Copy currentPrice into these fields
                            lastDayTradedPrice: "$currentPrice",
                            lastTradedPrice: "$currentPrice",

                            __v: 0,
                        },
                    },
                ],
                { updatePipeline: true }
            );

            console.log("Day reset completed at 9:15 AM");
        } catch (error) {
            console.error("Day reset failed:", error);
        }
    });
};

const update10minCandle = () => {
    cron.schedule("*/10 9-15 * * 1-5", async () => {
        try {
            if (!isTradingHour()) return;
            const stocks = await Stock.find({});
            for (const stock of stocks) {
                await store10min(stock.symbol);
            }
        } catch (error) {
            console.error("10min candle update failed:", error);
        }
    });
}

const generateRandomDataEverySecond = () => {
    // Note: Node-cron supports seconds as an optional first digit. '*/5 * * * * *' runs every 5 seconds.
    cron.schedule("*/5 * * * * *", async () => {
        try {
            if (!isTradingHour()) return;
            const stocks = await Stock.find({});
            for (const stock of stocks) {
                await generateStockPrice(stock.symbol);
            }
        } catch (error) {
            console.error("Stock price generation failed:", error);
        }
    });
}

export { isTradingHour, isNewTradeDay, scheduleDayReset, update10minCandle, generateRandomDataEverySecond };