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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config();
const app = express()
app.use(express.json());
app.use(cors());

const httpServer = createServer(app)

app.get('/', (req, res) => {
    res.send('<h1>Trading Api</h1> <a href="/api-docs">API Docs</a>')
})

//swagger Api Docs

const swaggerDocument = YAML.load(path.join(__dirname, './docs/swagger.yaml'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))



// routes 
app.use('/auth', authRouter)
app.use("/stocks", auth, stockRouter);

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
    } catch (error) {
        console.log(error)
    }
}
start();