import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        stockId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stock",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
        },

        price: {
            type: Number,
            required: true,
        },

        orderType: {
            type: String,
            enum: ["buy", "sell"],
            required: true,
        },

        orderStatus: {
            type: String,
            enum: ["pending", "completed", "cancelled"],
            default: "pending",
        },

        remainingBalance: {
            type: Number,
            required: true,
            set: (value) => parseFloat(value.toFixed(2)),
        },

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model("Order", OrderSchema);

export default Order;