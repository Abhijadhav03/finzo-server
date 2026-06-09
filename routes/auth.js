import express from "express";
import {
    login,
    logout,
    refreshToken,
    register,
} from "../controllers/auth/auth.js";
import auth from "../middlewares/authentication.js";
import signInwithOauth from "../controllers/auth/oauth.js";
import { checkEmail } from "../controllers/auth/email.js";
import { sendOtp, verifyOtp } from "../controllers/auth/otp.js";
import { getProfile, setLoginPinFirst, updateProfile, verifyPin } from "../controllers/auth/user.js";
import { uploadBiometrics, verifyBiometrics } from "../controllers/auth/biometrics.js";
const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", auth, logout);
router.post("/refresh-token", refreshToken);
router.post("/check-email", checkEmail);
router.post("/oauth", signInwithOauth);
router.post("/verify-otp", verifyOtp)
router.post("/send-otp", sendOtp);


router
    .route("/profile")
    .get(auth, getProfile)
    .put(auth, updateProfile)


router.post("/set-pin", auth, setLoginPinFirst);
router.post("/verify-pin", auth, verifyPin);
router.post("/upload-biometric", auth, uploadBiometrics);
router.post("/verify-biometric", auth, verifyBiometrics);

export default router;