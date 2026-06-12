import Stock from "../models/Stock.js";
import { NotFoundError } from "../errors/index.js";


const roundToTwoDecimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

const generateStockPrice = async (symbol) => {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
        throw new NotFoundError("Stock not found");
    }

    const now = new Date();
    const minChange = -0.02;
    const maxChange = 0.02;
    const trendChange = 0.005;
    let CurrentPrice = stock.currentPrice;


    const trendType = Math.random();
    let trendModifier = 0;

    if (trendType < 0.33) {
        trendModifier = 0;

    } else if (trendType < 0.66) {
        trendModifier = trendChange;
    } else {
        trendModifier = -trendChange;
    }
    const changePercentage = Math.random() * (maxChange - minChange) + minChange + trendModifier;
    let close = roundToTwoDecimals(stock.currentPrice * (1 + changePercentage))
    const patternType = Math.random();
    let high, low;

    if (patternType < 0.15) {
        //marubozu pattern
        high = Math.max(CurrentPrice, close);
        low = Math.min(CurrentPrice, close)
    }
    else if (patternType < 0.3) {
        //hammer pattern
        high = Math.max(CurrentPrice, close);
        low = Math.min(CurrentPrice, close) - Math.random() * 2;
    } else if (patternType < 0.45) {
        //hanging man pattern
        high = Math.max(CurrentPrice, close) + Math.random() * 2;
        low = Math.min(CurrentPrice, close);
    } else if (patternType < 0.6) {
        //doji pattern
        high = Math.max(CurrentPrice, close) + Math.random() * 2;
        low = Math.min(CurrentPrice, close) - Math.random() * 2;
    } else if (patternType < 0.75) {
        //spinning top pattern
        high = Math.max(CurrentPrice, close) + Math.random() * 1;
        low = Math.min(CurrentPrice, close) - Math.random() * 1;
    } else if (patternType < 0.9) {
        //shooting star pattern
        high = Math.max(CurrentPrice, close) + Math.random() * 2;
        low = Math.min(CurrentPrice, close);
    } else {
        //bearish engulfing pattern
        high = Math.max(CurrentPrice, close);
        low = Math.min(CurrentPrice, close) - Math.random() * 2;
    }

    if (low < 0) {
        low = 0;
    }
    high = roundToTwoDecimals(high);
    low = roundToTwoDecimals(low);
    close = roundToTwoDecimals(close);
    CurrentPrice = roundToTwoDecimals(CurrentPrice);
    const timestamp = now.toISOString();
    const time = now.getTime() / 1000;
    const lastItem = stock.dayTimeSeries[stock.dayTimeSeries.length - 1];

    // Create a new candle every 15 seconds to simulate a fast-moving trading chart
    if (!lastItem || (time - lastItem.time) >= 15) {
        stock.dayTimeSeries.push({
            timestamp,
            time,
            open: CurrentPrice,
            _internal_originalTime: time,
            _internal_originalOpen: CurrentPrice,
            close,
            high,
            low,
            lastDayTradedPrice: stock.lastDayTradedPrice,
            lastTradedPrice: stock.lastTradedPrice
        });
        if (stock.dayTimeSeries.length > 25) {
            stock.dayTimeSeries.shift();
        }
    } else {
        const updateHigh = Math.max(lastItem.high, close + Math.random() * 2.5);
        const updateLow = Math.min(lastItem.low, close - Math.random() * 2.5);
        const updateCandle = {
            timestamp: timestamp,
            time: time,
            open: lastItem.open,
            close: roundToTwoDecimals(close),
            high: roundToTwoDecimals(updateHigh),
            low: roundToTwoDecimals(updateLow),
            _internal_originalTime: time,
            _internal_originalOpen: CurrentPrice
        }
        stock.dayTimeSeries[stock.dayTimeSeries.length - 1] = updateCandle;
    }

    stock.dayTimeSeries = stock.dayTimeSeries.slice(-390);

    stock.currentPrice = close;
    try {
        await stock.save();
    } catch (error) {
        console.log("skippimg conflicts");

    }

}

const store10min = async (symbol) => {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
        throw new NotFoundError("Stock not found");
    }

    const now = new Date();
    const minute = now.getMinutes();

    if (minute % 10 !== 0) {
        return;
    }

    const CurrentPrice = stock.currentPrice;
    const close = roundToTwoDecimals(CurrentPrice);
    const timestamp = now.toISOString();
    const time = now.getTime() / 1000;
    const lastItem = stock.tenMinTimeSeries[stock.tenMinTimeSeries.length - 1];

    if (!lastItem || now - new Date(lastItem.timestamp * 1000).getTime() >= 10 * 60 * 1000) {
        stock.tenMinTimeSeries.push({
            timestamp,
            time,
            open: CurrentPrice,
            _internal_originalTime: time,
            _internal_originalOpen: CurrentPrice,
            close,
            high: close,
            low: close,
            lastDayTradedPrice: stock.lastDayTradedPrice,
            lastTradedPrice: stock.lastTradedPrice
        });
        if (stock.tenMinTimeSeries.length > 25) {
            stock.tenMinTimeSeries.shift();
        }
    } else {
        const updateHigh = Math.max(lastItem.high, close + Math.random() * 1);
        const updateLow = Math.min(lastItem.low, close - Math.random() * 1);
        const updateCandle = {
            timestamp: timestamp,
            time: time,
            open: lastItem.open,
            close: roundToTwoDecimals(close),
            high: roundToTwoDecimals(updateHigh),
            low: roundToTwoDecimals(updateLow),
            _internal_originalTime: time,
            _internal_originalOpen: CurrentPrice
        }
        stock.tenMinTimeSeries[stock.tenMinTimeSeries.length - 1] = updateCandle;
    }

    stock.tenMinTimeSeries = stock.tenMinTimeSeries.slice(-390);

    stock.currentPrice = close;
    try {
        await stock.save();
    } catch (error) {
        console.log("skippimg conflicts");

    }

}


export { generateStockPrice, store10min }