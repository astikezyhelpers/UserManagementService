import express from "express";
import authenticateJWT from "../middleware/protected.js";
import { registerUser,verifyEmail,loginUser, refreshAccessToken,getAllUsers,getUserById,updateUser,deleteUser,logoutUser } from "../authService/auth.controller.js";    
const router = express.Router();
router.post("/register", registerUser);
router.get("/verify/:token", verifyEmail); 
router.post("/login", loginUser);
router.post("/logout",logoutUser)
router.post("/refresh-token", refreshAccessToken); 
router.get('/users',authenticateJWT,getAllUsers);
router.get('/users/:id',authenticateJWT,getUserById);
router.put('/users/:id',authenticateJWT,updateUser);
router.delete('/users/:id',authenticateJWT,deleteUser);

export default router;

