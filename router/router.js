import express from "express";
import authenticateJWT from "../middleware/protected.js";
import { registerUser,verifyEmail,loginUser, refreshAccessToken,getAllUsers,getUserById,updateUser,deleteUser,logoutUser } from "../authService/auth.controller.js";
import prisma from '../models/model.js';
const router = express.Router();

// Debug endpoint to test user lookup
router.post('/debug/lookup-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log('🔍 Debug: Looking up user by email:', email);
    
    // Try finding user with enhanced client
    const user = await prisma.findUserByEmail(email);
    
    if (user) {
      res.json({
        found: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified,
          isActive: user.is_active,
          hasPassword: !!user.password_hash
        },
        encryption: prisma.getEncryptionStatus()
      });
    } else {
      res.json({
        found: false,
        encryption: prisma.getEncryptionStatus()
      });
    }
    
  } catch (error) {
    console.error('❌ Debug lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

