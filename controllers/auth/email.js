import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthenticatedError } from "../../errors/index.js";
import jwt from "jsonwebtoken";
import { generateOTP } from "../../services/mailSender.js";
import Otp from "../../models/otp.js";


const checkEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequestError("email is required ");

    }

    let isExist = true;
    let user = await User.findOne({ email });

    if (!user) {
        isExist = false;
        const otp = await generateOTP();
        await Otp.create({ email, otp, otp_type: "email" });

    }
    res.status(StatusCodes.OK).json({
        isExist
    })
}

export { checkEmail }