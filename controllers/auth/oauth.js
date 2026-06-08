import User from "../../models/user.js";
import { StatusCodes } from "http-status-codes";
import {
    BadRequestError,
    UnauthenticatedError,
} from "../../errors/index.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const jwksClientInstance = jwksClient({
    jwksUri: "https://appleid.apple.com/auth/keys",
    timeout: 30000,
});

const getKey = async (kid) => {
    return new Promise((resolve, reject) => {
        jwksClientInstance.getSigningKey(kid, (err, key) => {
            if (err) {
                return reject(err);
            }

            resolve(key.getPublicKey());
        });
    });
};

const signInwithOauth = async (req, res) => {
    const { id_token, provider } = req.body;

    if (
        !id_token ||
        !provider ||
        !["google", "apple"].includes(provider)
    ) {
        throw new BadRequestError(
            "Please provide a valid id_token and provider"
        );
    }

    try {
        let email;

        // ================= GOOGLE =================
        if (provider === "google") {
            const ticket = await googleClient.verifyIdToken({
                idToken: id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();

            if (!payload?.email) {
                throw new BadRequestError(
                    "Email not found in Google token"
                );
            }

            email = payload.email;
        }

        // ================= APPLE =================
        if (provider === "apple") {
            const decoded = jwt.decode(id_token, {
                complete: true,
            });

            if (!decoded?.header?.kid) {
                throw new BadRequestError("Invalid Apple token");
            }

            const applePublicKey = await getKey(decoded.header.kid);

            const verifiedToken = jwt.verify(
                id_token,
                applePublicKey,
                {
                    algorithms: ["RS256"],
                    issuer: "https://appleid.apple.com",
                }
            );

            if (!verifiedToken?.email) {
                throw new BadRequestError(
                    "Email not found in Apple token"
                );
            }

            email = verifiedToken.email;
        }

        // ================= FIND OR CREATE USER =================
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                email_verified: true,
            });
        } else {
            if (!user.email_verified) {
                user.email_verified = true;
                await user.save();
            }
        }

        // ================= TOKENS =================
        const accessToken = user.createAccessToken();
        const refreshToken = user.createRefreshToken();

        // ================= FLAGS =================
        const phone_exist = !!user.phone_number;
        const login_pin_exist = !!user.login_pin;
        const is_login_biometric_set =
            !!user.is_login_biometric_set;

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "User logged in successfully",

            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
            },

            phone_exist,
            login_pin_exist,
            is_login_biometric_set,
        });
    } catch (error) {
        console.error("OAuth Login Error:", error);

        throw new UnauthenticatedError(
            error.message || "OAuth authentication failed"
        );
    }
};

export default signInwithOauth;