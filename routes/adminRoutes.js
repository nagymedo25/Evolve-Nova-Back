const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { validateStatusUpdate, validateUserUpdate } = require('../middlewares/validationMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', AdminController.getDashboardStats);

router.get('/users', AdminController.getAllUsers);
router.get('/users/search', AdminController.searchUsers);
router.get('/users/:userId', AdminController.getUserById);
router.put('/users/:userId', validateUserUpdate, AdminController.updateUser);
router.patch('/users/:userId/status', validateStatusUpdate, AdminController.updateUserStatus);
router.delete('/users/:userId', AdminController.deleteUser);

router.delete('/payments/reset', AdminController.resetPayments);

module.exports = router;