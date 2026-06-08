import User from "../../models/user";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { BadRequestError, UnauthenticatedError, UnauthrizedError } from "../../errors";
// import { attachCookiesToResponse } from "../../utils";
import bcrypt from "bcryptjs";

const updateProfile = async (req, res) => {
    const { name, gender, date_of_birth } = req.body;
    const accessToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const updatedFields = {};
    if (name) {
        updatedFields.name = name;
    }
    if (gender) {
        updatedFields.gender = gender;
    }
    if (date_of_birth) {
        updatedFields.date_of_birth = date_of_birth;
    }
    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
        new: true,
        runValidators: true,
        select: "-password -biometricKey -"
    });
    if (!updatedUser) {
        throw new BadRequestError("User not found");
    }
    res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
    })
}

const setLoginPinFirst = async (req, res) => {
    const { login_pin } = req.body;
    if (!login_pin || logon_pin.length !== 4) {
        throw new BadRequestError("Please provide a valid login pin");
    }
    const accessToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
        throw new BadRequestError("User not found");
    }
    // user.login_pin = login_pin;
    if (user.login_pin) {
        throw new BadRequestError("Login pin already set");
    }
    const salt = await bcrypt.genSalt(10);
    user.login_pin = await bcrypt.hash(login_pin, salt);
    const updateUser = await User.findByIdAndUpdate(userId, user, {
        new: true,
        runValidators: true,
        select: "-password -biometricKey -"
    });
    const access_token = await jwt.sign(
        { userId: userId },
        process.env.SOCKET_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    const refresh_token = await jwt.sign(
        { userId: userId },
        process.env.REFRESH_SOCKET_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY }
    );

    if (!updateUser) {
        throw new BadRequestError("User not found");
    }
    res.status(StatusCodes.OK).json({
        success: true,
        message: "Login pin set successfully",
        tokens: {
            socket_access_token: access_token,
            socket_refresh_token: refresh_token
        }
    })
}