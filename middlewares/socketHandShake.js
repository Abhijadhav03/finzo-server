import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { UnauthenticatedError } from "../errors/index.js"

const authenticateSocketUser = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            throw new UnauthenticatedError('Authentication token missing or invalid');
        }

        const payload = jwt.verify(token, process.env.SOCKET_TOKEN_SECRET);
        const user = await User.findById(payload.userId).select('-password');
        if (!user) {
            throw new UnauthenticatedError('User not found');
        }

        socket.user = user;
        next();
    } catch (error) {
        console.log(error);
        next(error);
    }
}

export default authenticateSocketUser;
