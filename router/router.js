import express from "express";
import { registerUser,verifyEmail,loginUser, refreshAccessToken,getAllUsers,getUserById,updateUser,deleteUser } from "../authService/controlle";    
const router = express.Router();
router.post("/register", registerUser);
router.get("/verify/:token", verifyEmail); 
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken); 
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;

