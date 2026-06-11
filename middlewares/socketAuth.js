import jwt from "jsonwebtoken";
import { UnauthenticatedError } from "../errors/index.js";

const SocketAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        throw new UnauthenticatedError('Authentication token missing or invalid')
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new UnauthenticatedError('Invalid token format');
    }
    try {
        const payload = jwt.verify(token, process.env.SOCKET_TOKEN_SECRET)
        req.user = {
            userId: payload.userId
        }
        next();
    } catch (error) {
        console.log(error);
        throw new UnauthenticatedError('Invalid token');
    }
}


export default SocketAuth