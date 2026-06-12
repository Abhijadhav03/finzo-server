import 'express-async-errors'
import express from 'express'
import dotenv from 'dotenv'
import { createServer } from 'http'
import cors from 'cors'
import YAML from 'yamljs'
import swaggerUi from 'swagger-ui-express'
import connectDB from './config/connect.js'
import errorHandleMiddleware from './middlewares/error-handler.js'
import notFoundMiddleware from './middlewares/not-found.js'
import authRouter from './routes/auth.js'
import stockRouter from "./routes/stocks.js"
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import path from 'path'
import auth from './middlewares/authentication.js'
import SocketAuth from './middlewares/socketAuth.js'
import { scheduleDayReset, generateRandomDataEverySecond, update10minCandle, isTradingHour } from './services/cronjob.js'
import Stock from './models/Stock.js';
import { Server } from 'socket.io'
import authenticateSocketUser from './middlewares/socketHandShake.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config();

scheduleDayReset();
update10minCandle();
generateRandomDataEverySecond();

const app = express()
app.use(express.json());
app.use(cors());

const httpServer = createServer(app)

const io = new Server({
    cors: {
        origin: "*", // Allows any origin to connect, useful for React Native / separate dev servers
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning", "Referer"],
        credentials: true,
        transports: ["websocket", "polling"]
    }
});

io.use(authenticateSocketUser);

app.get('/', (req, res) => {
    res.send('<h1>Trading Api</h1> <a href="/api-docs">API Docs</a>')
})

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id, "User ID:", socket.user._id);

    socket.on("subscribeToStocks", async (stockSymbol) => {
        console.log("Client subscribed to stockSymbol:", stockSymbol);
        const sendUpdates = async () => {
            try {
                const stock = await Stock.findOne({ symbol: stockSymbol });
                if (!stock) {
                    console.log(`Stock '${stockSymbol}' not found`);
                } else {
                    socket.emit(`${stockSymbol}`, stock);
                }
            } catch (error) {
                console.error("Error fetching stock data:", error);
            }
        };
        sendUpdates();

        const intervalId = setInterval(sendUpdates, 5000);

        if (!isTradingHour()) {
            clearInterval(intervalId);
        }
    });

    socket.on("subscribeToMultipleStocks", async (stockSymbols) => {
        console.log("Client subscribed to multiple stocks:", stockSymbols);
        const sendUpdates = async () => {
            try {
                const stocks = await Stock.find({ symbol: { $in: stockSymbols } });
                const stockData = stocks.map((stock) => ({
                    symbol: stock.symbol,
                    currentPrice: stock.currentPrice,
                    lastDayTradedPrice: stock.lastDayTradedPrice,
                }));
                socket.emit("multipleStocksData", stockData);
            } catch (error) {
                console.error("Error fetching stock data:", error);
            }
        };
        sendUpdates();

        const intervalId = setInterval(sendUpdates, 5000);

        if (!isTradingHour()) {
            clearInterval(intervalId);
        }
    });

    socket.on("disconnect", () => {
        console.log("A client disconnected");
    });
});
//swagger Api Docs

const swaggerDocument = YAML.load(path.join(__dirname, './docs/swagger.yaml'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))



// routes 
app.use('/auth', authRouter)
app.use("/stocks", SocketAuth, stockRouter);

app.use(notFoundMiddleware)
app.use(errorHandleMiddleware)

//start server
const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI)
        const PORT = process.env.PORT || 3000
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })

        const SOCKET_PORT = process.env.SOCKET_PORT || 4000;
        io.listen(SOCKET_PORT);
        console.log(`WebSocket server is running on port ${SOCKET_PORT}`);
    } catch (error) {
        console.log(error)
    }
}
start();