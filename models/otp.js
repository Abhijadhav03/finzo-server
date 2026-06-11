import mongoose from "mongoose";
import bycrypt from "bcryptjs";
import { mailSender } from "../services/mailSender.js";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5,
    },
    otp_type: {
        type: String,
        required: true,
        enum: ["phone", "email", "reset_password", "reset_pin"],
    }
}, { timestamps: true });
otpSchema.pre("save", async function () {
    if (this.isNew) {
        const salt = await bycrypt.genSalt(10)
        await sendVerificationEmail(this.email, this.otp, this.otp_type);
        this.otp = await bycrypt.hash(this.otp, salt)
    }
})

async function sendVerificationEmail(email, otp, otp_type) {
    try {
        await mailSender(email, otp, otp_type);
    } catch (error) {
        console.log("Error sending verification email", error);
    }
}
otpSchema.methods.compareOTP = async function (otp) {
    return await bycrypt.compare(otp, this.otp);
}

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;