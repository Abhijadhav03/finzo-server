import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NotFoundError, BadRequestError, UnauthenticatedError } from "../errors/index.js";
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email",],
    },
    password: {
        type: String,
        // required: true,
        match: [/^.{6,}$/, "Please enter a password with at least 6 characters",],
    },
    name: {
        type: String,
        maxlength: 50,
        minlength: 3,

    },
    login_pin: {
        type: String,
        minlength: 4,
        maxlength: 4,
    },
    phone_number: {
        type: String,
        match: [/^[0-9]{10}$/, "Please enter a valid phone number"],
        unique: true,
    },
    date_of_birth: Date,
    biometricKey: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'others']
    },
    wrong_pin_attempts: {
        type: Number,
        default: 0,

    },
    blocked_until_pin: {
        type: Date,
        default: null,
    },
    blocked_until_biometric: {
        type: Date,
        default: null,
    },
    balance: {
        type: Number,
        default: 50000.0,
    },
    wrong_password_attempts: {
        type: Number,
        default: 0,
    },

    blocked_until_password: {
        type: Date,
        default: null,
    },
    tokens: [
        {
            accessToken: String,
            refreshToken: String,
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],

}, { timestamps: true }
);

userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
    }
})

userSchema.pre("save", async function () {
    if (this.isModified("login_pin")) {
        const salt = await bcrypt.genSalt(10)
        this.login_pin = await bcrypt.hash(this.login_pin, salt)
    }
})

userSchema.statics.updatePIN = async function (email, newPIN) {
    try {
        const user = await this.findOne({ email })
        if (!user) {
            throw new NotFoundError("User not found")
        }
        const isSamePIN = user.login_pin ? await bcrypt.compare(newPIN, user.login_pin) : false
        if (isSamePIN) {
            throw new BadRequestError("New PIN cannot be same as old PIN")
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPIN = await bcrypt.hash(newPIN, salt);
        await this.findOneAndUpdate({ email }, { login_pin: hashedPIN, wrong_pin_attempts: 0, blocked_until_pin: null })
        console.log("PIN updated successfully")
        return { success: true, message: "PIN updated successfully" }
    } catch (error) {
        throw error
    }
}
userSchema.statics.updatePassword = async function (email, newPassword) {
    try {
        const user = await this.findOne({ email })
        if (!user) {
            throw new NotFoundError("User not found")
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password)
        if (isSamePassword) {
            throw new BadRequestError("New Password cannot be same as old Password")
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await this.findOneAndUpdate({ email }, { password: hashedPassword, wrong_password_attempts: 0, blocked_until_password: null })
        console.log("Password updated successfully")
        return { success: true, message: "Password updated successfully" }
    } catch (error) {
        throw error
    }
}
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (this.blocked_until_password && this.blocked_until_password > new Date()) {
        throw new UnauthenticatedError("invalid Login Attempts exceeded. please try again later")
    }
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    if (!isMatch) {
        this.wrong_password_attempts += 1;
        if (this.wrong_password_attempts >= 5) {
            this.blocked_until_password = Date.now() + 15 * 60 * 1000;
        }
        await this.save();
        throw new BadRequestError("Invalid password");
    }
    this.wrong_password_attempts = 0;
    this.blocked_until_password = null;
    await this.save();
    return true;
}
userSchema.methods.comparePIN = async function comparePIN(candidatePIN) {
    if (this.blocked_until_pin && this.blocked_until_pin > new Date()) {
        throw new UnauthenticatedError("invalid Login Attempts exceeded. please try again later")
    }
    const hashedPIN = this.login_pin
    console.log("candidatePIN", candidatePIN)
    console.log("hashedPIN", hashedPIN)
    const isMatch = await bcrypt.compare(candidatePIN, hashedPIN);
    console.log("isMatch", isMatch)
    if (!isMatch) {
        this.wrong_pin_attempts += 1;
        if (this.wrong_pin_attempts >= 5) {
            this.blocked_until_pin = Date.now() + 15 * 60 * 1000;
        }
        await this.save();
        throw new BadRequestError("Invalid PIN");
    }
    this.wrong_pin_attempts = 0;
    this.blocked_until_pin = null;
    await this.save();
    return true;
}
userSchema.methods.createAccessToken = function () {
    return jwt.sign({ userId: this._id, email: this.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    })
}
userSchema.methods.createRefreshToken = function () {
    return jwt.sign({ userId: this._id, email: this.email }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    })
}
const User = mongoose.model("User", userSchema);

export default User;