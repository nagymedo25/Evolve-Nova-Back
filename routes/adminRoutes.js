// puls-academy-backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// استيراد middleware التحقق (سنقوم بتعديله لاحقاً)
const { validateUserUpdate, validateStatusUpdate } = require('../middlewares/validationMiddleware'); // افترض وجود هذه الدوال

// --- مسارات الأدمن الرئيسية ---
router.get('/dashboard', authMiddleware, adminMiddleware, AdminController.getDashboardStats); // إحصائيات لوحة التحكم

// --- مسارات إدارة المستخدمين (الطلاب) ---
router.get('/users', authMiddleware, adminMiddleware, AdminController.getAllUsers); // جلب كل الطلاب
router.get('/users/search', authMiddleware, adminMiddleware, AdminController.searchUsers); // البحث عن طالب
router.get('/users/:userId', authMiddleware, adminMiddleware, AdminController.getUserDetails); // تفاصيل طالب
// استخدام validateUserUpdate المعدل
router.put('/users/:userId', authMiddleware, adminMiddleware, validateUserUpdate, AdminController.updateUser); // تحديث بيانات طالب (اسم، ايميل، كلمة مرور)
// استخدام validateStatusUpdate المعدل
router.patch('/users/:studentId/status', authMiddleware, adminMiddleware, validateStatusUpdate, AdminController.updateStudentStatus); // تغيير حالة الطالب (active/suspended)
router.delete('/users/:studentId', authMiddleware, adminMiddleware, AdminController.deleteStudent); // حذف طالب


// --- المسارات المحذوفة ---
// تم حذف مسارات إدارة الكورسات والمدفوعات من هنا (موجودة في ملفاتها الخاصة)
// تم حذف مسارات الرسائل، المخالفات، الأجهزة، التقارير، الحذف الجماعي.


module.exports = router;