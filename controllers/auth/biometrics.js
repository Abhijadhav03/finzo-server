import User from "../../models/user"
import { StatusCodes } from "http-status-codes"
import { BadRequestError, UnauthenticatedError } from "../../errors"
import jwt from "jsonwebtoken"
import NodeRSA from "node-rsa"


const uploadBiometrics = async (req, res) => {
    const { public_key } = req.body;
    if (!public_key) {
        throw new BadRequestError("Please provide public key")
    }
    const accessToken = req.headers.authotization.split(" ")(1);
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const updatedUser = await User.findByIdAndUpdate(userId, {
        biometricKey: public_key,
        isBiometricSet: true
    }, {
        new: true,
        runValidators: true
    });
    res.status(StatusCodes.OK).json({ updatedUser },
        { msg: "Biometrics uploaded successfully" }
    )

}


const verifyBiometrics = async (req, res) => {
    const { signature } = req.body;
    if (!signature) {
        throw new BadRequestError("Please provide signature")
    }
    const accessToken = req.headers.authotization.split(" ")(1);
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user.biometricKey) {
        throw new UnauthenticatedError("Biometrics not set")
    }
    const isVerifyingSignature = new VerifySignature(signature, user.id, user.biometricKey);
    if (!isVerifyingSignature) {
        throw new UnauthenticatedError("Biometrics verification failed")
    }
    // res.status(StatusCodes.OK).json({})
    const access_token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_LIFETIME }
    )
    const refresh_token = createJWT({
        payload: { userId: user._id }
    })
    res.status(StatusCodes.OK).json({
        msg: "Biometrics verification successful",
        access_token,
        refresh_token
    })
    user.blocked_until_pin = null;
    user.wrong_pin_attempts = 0;
    socket_tokens: {
        socket_access_token: access_token,
            socket_refresh_token: refresh_token
    }
    await user.save();
}


async function verifySignature(signature, payload, public_key) {
    const publicKeyBuffer = Buffer.from(public_key, "base64")
    const Key = new NodeRSA();
    const signedData = Key.importKey(publicKeyBuffer, 'public-der');
    const signatureVerified = signedData.verify(Buffer.from(payload), signature, 'utf8', 'base64')
    return signatureVerified;
}


export { uploadBiometrics, verifyBiometrics, verifySignature }