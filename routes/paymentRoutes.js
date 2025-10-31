// puls-academy-backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// استيراد middleware الرفع من storage.js (يستخدم Cloudinary)
const { uploadMiddleware } = require('../config/storage');
// استيراد middleware التحقق (سنقوم بتعديله لاحقاً)
const { validatePaymentCreation } = require('../middlewares/validationMiddleware');

// --- مسارات الطالب (تتطلب مصادقة) ---
router.get('/my-payments', authMiddleware, PaymentController.getUserPayments);
// استخدام validatePaymentCreation و uploadMiddleware
router.post('/', authMiddleware, uploadMiddleware.single('screenshot'), validatePaymentCreation, PaymentController.createPayment);


// --- مسارات الأدمن (تتطلب مصادقة + صلاحيات أدمن) ---
router.get('/', authMiddleware, adminMiddleware, PaymentController.getPayments); // جلب كل المدفوعات (مع فلاتر)
router.get('/pending', authMiddleware, adminMiddleware, PaymentController.getPendingPayments); // جلب المدفوعات المعلقة
router.get('/stats', authMiddleware, adminMiddleware, PaymentController.getPaymentStats); // إحصائيات المدفوعات
router.get('/:paymentId', authMiddleware, adminMiddleware, PaymentController.getPaymentById); // جلب دفعة معينة
router.put('/:paymentId/approve', authMiddleware, adminMiddleware, PaymentController.approvePayment); // الموافقة
router.put('/:paymentId/reject', authMiddleware, adminMiddleware, PaymentController.rejectPayment); // الرفض
router.delete('/:paymentId', authMiddleware, adminMiddleware, PaymentController.deletePayment); // الحذف


module.exports = router;