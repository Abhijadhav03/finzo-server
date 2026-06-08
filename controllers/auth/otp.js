import User from "../../models/User";
import OTP from '../../models/otp';
import jwt from 'jsonwebtoken'
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors";
import { generateOTP } from "../../services/mailSender";

const verifyOtp = async (req, res) => {
    const { email, otp, otp_type, data } = req.body
    if (!email || !otp || !otp_type) {
        throw new BadRequestError("please provide all values")
    } else if (otp_type !== "email" && !data) {
        throw new BadRequestError("please provide all values")
    }

    const otpRecord = await OTP.findOne({
        email, otp_type
    }).sort({ createdAt: -1 }).limit(1)

    if (!otpRecord) {
        throw new BadRequestError("You did not enter the OTP")
    }
    const isVerified = await otpRecord.compareOTP(otp)
    if (!isVerified) {
        throw new BadRequestError("Please enter correct OTP")
    }
    await OTP.findByIdAndDelete(otpRecord._id)

    switch (otp_type) {
        case "phone":
            await User.findOneAndUpdate({ email }, { phone_number: data });
            break;
        case "email":
            const user = await User.findOne({ email });
            user.email_verified = true;
            await user.save();
            break;
        case "reset_password":
            const user_reset = await User.findOne({ email });
            user_reset.password = data;
            await user_reset.save();
            break;
        case "reset_pin":
            const user_pin = await User.findOne({ email });
            user_pin.pin = data;
            await user_pin.save();
            break;
        default:
            throw new BadRequestError("Invalid OTP type")
    }
    const user = await User.findOne({ email });
    if (otp_type === "email" && !user) {
        const register_token = jwt.sign({ email }, process.env.REGISTER_SECRET, {
            expiresIn: process.env.REGISTER_SECRET_EXPIRY,
        })
        return res.status(StatusCodes.OK).json({
            msg: "OTP verified successfully",
            register_token
        })
    }
    return res.status(StatusCodes.OK).json({
        msg: "OTP verified successfully",
    })
};

const sendOtp = async (req, res) => {
    const { email, otp_type, data } = req.body;
    if (!email || !otp_type) {
        throw new BadRequestError("please provide all values ");

    }

    let user = await User.findOne({ email });

    if (!user && otp_type === "phone") {
        throw new BadRequestError("user not found");

    } else if (user && (otp_type === "email" || otp_type === "reset_password" || otp_type === "reset_pin")) {
        throw new BadRequestError("user already exists");

    }

    if (otp_type === "phone") {
        if (user.phone_number === data) {
            throw new BadRequestError("phone number already in use");

        }
    }

    const otp = await generateOTP();
    const otpPayload = { email, otp, otp_type };
    await Otp.create(otpPayload);
    res.status(StatusCodes.OK).json({
        msg: "OTP sent successfully",
    })

}

export { verifyOtp, sendOtp };

