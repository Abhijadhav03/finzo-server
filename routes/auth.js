import express from "express";
import {
    login,
    logout,
    refresh_token,
    register,
} from "../controllers/auth/auth.js";
import auth from "../middlewares/authentication.js";
const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", auth, logout);
router.post("/refresh-token", refresh_token);

export default router;