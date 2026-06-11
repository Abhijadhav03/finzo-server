import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors/index.js";
import Order from "../../models/order.js";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";

const getAllOrders = async (req, res) => {
    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
    const userId = decodedToken.userId;

    try {
        const orders = await Order.find({ user: userId }).sort({
            createdAt: -1
        }).populate(
            {
                path: "user",
                select: "-password -biometricKey , -login_pin"
            }
        ).populate(
            {
                path: "stock",
                select: "-dayTimeSeries -tenMinTimeSeries"
            }
        )
        res.status(StatusCodes.OK).json({
            msg: "Orders fetched successfully",
            count: orders.length,
            data: orders
        })
    } catch (error) {
        console.log(error);
        throw new BadRequestError("Failed to fetch orders: " + error.message);
    }
};


export { getAllOrders };