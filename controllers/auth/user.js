import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import {
    BadRequestError,
    UnauthenticatedError,
} from "../../errors/index.js";
import bcrypt from "bcryptjs";

const updateProfile = async (req, res) => {
    const { name, gender, date_of_birth } = req.body;

    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
    ) {
        throw new UnauthenticatedError("Authentication invalid");
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET
    );

    const userId = decoded.userId;

    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (gender) updatedFields.gender = gender;
    if (date_of_birth) updatedFields.date_of_birth = date_of_birth;

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updatedFields,
        {
            new: true,
            runValidators: true,
            select: "-password -biometricKey -login_pin",
        }
    );

    if (!updatedUser) {
        throw new BadRequestError("User not found");
    }

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
    });
};

const setLoginPinFirst = async (req, res) => {
    const { login_pin } = req.body;

    if (!login_pin || !/^\d{4}$/.test(login_pin)) {
        throw new BadRequestError(
            "PIN must be exactly 4 digits"
        );
    }

    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
    ) {
        throw new UnauthenticatedError("Authentication invalid");
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET
    );

    const userId = decoded.userId;

    const user = await User.findById(userId);

    if (!user) {
        throw new BadRequestError("User not found");
    }

    if (user.login_pin) {
        throw new BadRequestError(
            "Login PIN already set"
        );
    }

    const salt = await bcrypt.genSalt(10);

    user.login_pin = await bcrypt.hash(
        login_pin,
        salt
    );

    await user.save();

    const socket_access_token = jwt.sign(
        { userId },
        process.env.SOCKET_TOKEN_SECRET,
        {
            expiresIn:
                process.env.REFRESH_TOKEN_EXPIRY,
        }
    );

    const socket_refresh_token = jwt.sign(
        { userId },
        process.env.REFRESH_SOCKET_TOKEN_SECRET,
        {
            expiresIn:
                process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
        }
    );

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Login PIN set successfully",
        tokens: {
            socket_access_token,
            socket_refresh_token,
        },
    });
};

const verifyPin = async (req, res) => {
    const { login_pin } = req.body;

    if (!login_pin) {
        throw new BadRequestError(
            "Please provide login PIN"
        );
    }

    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
    ) {
        throw new UnauthenticatedError("Authentication invalid");
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET
    );

    const userId = decoded.userId;

    const user = await User.findById(userId);

    if (!user) {
        throw new BadRequestError("User not found");
    }

    if (!user.login_pin) {
        throw new BadRequestError(
            "Login PIN not set"
        );
    }

    if (
        user.blocked_until_pin &&
        user.blocked_until_pin > new Date()
    ) {
        const blockedTime = Math.ceil(
            (user.blocked_until_pin.getTime() -
                Date.now()) /
            1000
        );

        throw new UnauthenticatedError(
            `Too many incorrect attempts. Please try again in ${blockedTime} seconds`
        );
    }

    const isVerifyingPin =
        await user.comparePIN(login_pin);

    if (!isVerifyingPin) {
        user.wrong_pin_attempts += 1;

        let message = `Invalid login PIN. ${3 - user.wrong_pin_attempts
            } attempts remaining`;

        if (user.wrong_pin_attempts >= 3) {
            user.blocked_until_pin = new Date(
                Date.now() + 30 * 60 * 1000
            );

            message =
                "Too many incorrect attempts. Please try again in 30 minutes";
        }

        await user.save();

        throw new UnauthenticatedError(message);
    }

    user.wrong_pin_attempts = 0;
    user.blocked_until_pin = null;

    await user.save();

    const socket_access_token = jwt.sign(
        { userId },
        process.env.SOCKET_TOKEN_SECRET,
        {
            expiresIn:
                process.env.REFRESH_TOKEN_EXPIRY,
        }
    );

    const socket_refresh_token = jwt.sign(
        { userId },
        process.env.REFRESH_SOCKET_TOKEN_SECRET,
        {
            expiresIn:
                process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
        }
    );

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Login PIN verified successfully",
        tokens: {
            socket_access_token,
            socket_refresh_token,
        },
    });
};

const getProfile = async (req, res) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
    ) {
        throw new UnauthenticatedError("Authentication invalid");
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET
    );

    const userId = decoded.userId;

    const user = await User.findById(userId).select(
        "-password -login_pin -biometricKey"
    );

    if (!user) {
        throw new BadRequestError("User not found");
    }

    const pinExists = !!user.login_pin;
    const phoneExists = !!user.phone_number;
    const dateOfBirthExists = !!user.date_of_birth;
    const genderExists = !!user.gender;

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile fetched successfully",
        user,
        pinExists,
        phoneExists,
        dateOfBirthExists,
        genderExists,
    });
};

export {
    updateProfile,
    setLoginPinFirst,
    verifyPin,
    getProfile,
};
