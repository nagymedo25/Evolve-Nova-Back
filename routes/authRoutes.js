// puls-academy-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
// استيراد middleware التحقق من الصحة (سنقوم بتعديله لاحقاً)
const { validateRegistration, validateLogin, validateProfileUpdate, validatePasswordChange } = require('../middlewares/validationMiddleware'); // افترض وجود هذه الدوال

// استخدام validateRegistration المعدل (سيتم تعديله لاحقاً)
router.post('/register', validateRegistration, AuthController.register);
// استخدام validateLogin المعدل (سيتم تعديله لاحقاً)
router.post('/login', validateLogin, AuthController.login);

// هذه المسارات تتطلب مصادقة (authMiddleware)
router.get('/profile', authMiddleware, AuthController.getProfile);
// استخدام validateProfileUpdate المعدل (سيتم تعديله لاحقاً)
router.put('/profile', authMiddleware, validateProfileUpdate, AuthController.updateProfile);
// استخدام validatePasswordChange المعدل (سيتم تعديله لاحقاً)
router.put('/change-password', authMiddleware, validatePasswordChange, AuthController.changePassword);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;