const express = require('express');
const router = express.Router();
const { signIn, signUp, signUpDirect, verifyEmail, agreePolicy, getAllUsers, getUsersByRole, updateUserStatus, deleteUser } = require('../controllers/user.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Public routes
router.post('/direct', signUpDirect);
router.post('/register', signUp);
router.post('/login', signIn);
router.post('/verify-email', verifyEmail);

// Protected routes
router.get('/all', getAllUsers);
router.put('/update-status', updateUserStatus);
router.delete('/delete/:id', authenticate, deleteUser);
router.post('/agree-policy', agreePolicy);
// router.put('/profile', authenticate, controller.updateUser);
// router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;