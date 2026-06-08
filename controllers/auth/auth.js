import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthenticatedError } from "../../errors/index.js";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    const { email, password, register_token } = req.body;

    if (!email || !password || !register_token) {
        throw new BadRequestError("Please provide all the required fields");
    }

    let payload;
    try {
        payload = jwt.verify(register_token, process.env.REGISTER_SECRET);
    } catch (error) {
        throw new UnauthenticatedError("Invalid or expired register token");
    }

    if (payload.email !== email) {
        throw new BadRequestError("Email does not match");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new BadRequestError("User already exists");
    }

    const newUser = new User({ email, password });

    const accessToken = newUser.createAccessToken();
    const refreshToken = newUser.createRefreshToken();

    newUser.tokens.push({ accessToken, refreshToken });

    await newUser.save();

    res.status(StatusCodes.CREATED).json({
        user: {
            id: newUser._id,
            email: newUser.email,
            name: newUser.name,
            phone_number: newUser.phone_number,
            date_of_birth: newUser.date_of_birth,
            gender: newUser.gender,
        },
        success: true,
        message: "User registered successfully",
        accessToken,
        refreshToken,
    });
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError("Please provide all the required fields");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new UnauthenticatedError("User not found");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        // throw new UnauthenticatedError("Invalid credentials");
        let message;

        if (user.blocked_until_password && user.blocked_until_password > Date.now()) {
            const remainingTime = Math.ceil((user.blocked_until_password - Date.now()) / 60000);
            message = `Invalid credentials. Please try again in ${remainingTime} minutes.`;
        }
        else {
            const attemptsRemaining = 5 - user.failed_login_attempts;

            message = attemptsRemaining > 1 ? `Invalid credentials. ${attemptsRemaining} attempts remaining.` : `Invalid credentials. ${attemptsRemaining} attempt remaining.`;
        }
        throw new UnauthenticatedError(message);
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();
    let phone_exist = false

    let login_pin_exist = false
    if (user.login_pin) {
        login_pin_exist = true
    }
    if (user.phone_number) {
        phone_exist = true
    }

    user.tokens.push({ accessToken, refreshToken });

    await user.save();

    res.status(StatusCodes.OK).json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone_number: user.phone_number,
            date_of_birth: user.date_of_birth,
            gender: user.gender,
            login_pin_exist,
            phone_exist
        },
        success: true,
        message: "User logged in successfully",
        tokens: {
            accessToken,
            refreshToken
        }
    });
};
const refreshToken = async (req, res) => {
    const { type, refresh_token } = req.body;
    if (!type || !["socket", "app", "web"].includes(type) || !refresh_token) {
        throw new BadRequestError("Please provide all the required fields")
    }
    const user = await User.findOne({ "tokens.refreshToken": refresh_token })
    if (!user) {
        throw new UnauthenticatedError("User not found")
    }
    try {
        let accessToken, newRefreshToken
        if (type === "socket" || type === "web" || type === "app") {
            ({ accessToken, newRefreshToken } = await generateAccessTokens(refresh_token,
                process.env.REFRESH_TOKEN_SECRET,
                process.env.REFRESH_TOKEN_EXPIRY,
                process.env.JWT_SECRET,
                process.env.ACCESS_TOKEN_EXPIRY))
        }
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Refresh token generated successfully",
            tokens: {
                accessToken,
                refreshToken: newRefreshToken
            }
        })
    } catch (error) {
        throw new UnauthenticatedError("Invalid or expired refresh token")
    }

}
async function generateRefreshTokens(token, refresh_secret, refresh_expiry, access_secret, access_expiry) {
    try {
        const decodedToken = jwt.verify(token, refresh_secret)
        const user = await User.findOne({ email: decodedToken.email })
        if (!user) {
            throw new UnauthenticatedError("User not found")
        }
        const accessToken = user.createAccessToken()
        const refreshToken = user.createRefreshToken()
        user.tokens.push({ accessToken, refreshToken })
        await user.save()
        return { accessToken, refreshToken }
    } catch (error) {
        throw new UnauthenticatedError("Invalid or expired refresh token")
    }
}

async function generateAccessTokens(token, refresh_secret, refresh_expiry, access_secret, access_expiry) {
    try {
        const decodedToken = jwt.verify(token, refresh_secret)
        const user = await User.findOne({ email: decodedToken.email })
        if (!user) {
            throw new UnauthenticatedError("User not found")
        }
        const accessToken = user.createAccessToken()
        const refreshToken = user.createRefreshToken()
        user.tokens.push({ accessToken, refreshToken })
        await user.save()
        return { accessToken, refreshToken }
    } catch (error) {
        throw new UnauthenticatedError("Invalid or expired refresh token")
    }
}

const logout = async (req, res) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        throw new UnauthenticatedError("No authorization token provided");
    }
    const accessToken = req.headers.authorization.split(' ')[1];
    const refreshToken = req.body.refresh_token;
    const decodedToken = jwt.decode(refreshToken);
    if (!decodedToken) {
        throw new UnauthenticatedError("Invalid or expired token");
    }
    const userId = decodedToken.user_id;
    const user = await User.findOneAndUpdate({ _id: userId, "tokens.refreshToken": refreshToken }, {
        $pull: {
            tokens: {
                refreshToken: refreshToken
            }
        },
        $unset: {
            fcm_token: "",
            platform: "",
            biometricKey: "",
            biometricSalt: ""
        }
    }, { new: true })
    if (!user) {
        throw new UnauthenticatedError("User not found");
    }
    res.status(StatusCodes.OK).json({
        success: true,
        message: "User logged out successfully",
    })
}

export { register, login, refreshToken, logout }