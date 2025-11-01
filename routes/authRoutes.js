

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const { validateRegistration, validateLogin, validateProfileUpdate, validatePasswordChange } = require('../middlewares/validationMiddleware'); 

router.post('/register', validateRegistration, AuthController.register);

router.post('/login', validateLogin, AuthController.login);

router.get('/profile', authMiddleware, AuthController.getProfile);

router.put('/profile', authMiddleware, validateProfileUpdate, AuthController.updateProfile);

router.put('/change-password', authMiddleware, validatePasswordChange, AuthController.changePassword);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;