import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import fs from "fs";
import InlineCss from "inline-css";


export const mailSender = async (email, otp, otp_type) => {
    let htmlContent = fs.readFileSync('otp_template.html', 'utf-8');

    htmlContent = htmlContent.replace('TradingApp_otp', otp);
    htmlContent = htmlContent.replace('TradingApp_otp_type', otp_type);
    htmlContent = htmlContent.replace('TradingApp_otp_expiry', "10 minutes");
    const options = {
        url: ' ',
    }
    htmlContent = await InlineCss(htmlContent, options);

    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            }
        });

        let info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: `${otp_type} OTP for TradingApp`,
            html: htmlContent,
        });

        console.log("OTP Email Info:", info);
        return info;
    } catch (error) {
        console.error("Error sending OTP email:", error);
        return error;
    }
}

export const generateOTP = () => {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });
}