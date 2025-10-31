// puls-academy-backend/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// --- مسارات المستخدم ---
router.get('/', authMiddleware, NotificationController.getUserNotifications); // جلب إشعارات المستخدم الحالي
router.get('/unread-count', authMiddleware, NotificationController.getUnreadCount); // جلب عدد الإشعارات غير المقروءة
router.put('/:notificationId/read', authMiddleware, NotificationController.markAsRead); // تعليم إشعار كمقروء
router.put('/mark-all-read', authMiddleware, NotificationController.markAllAsRead); // تعليم الكل كمقروء
router.delete('/:notificationId', authMiddleware, NotificationController.deleteNotification); // حذف إشعار معين
router.delete('/all', authMiddleware, NotificationController.deleteAllUserNotifications); // حذف كل إشعارات المستخدم

// --- مسارات الأدمن ---
// قد لا نحتاج هذه إذا كانت الإشعارات تلقائية فقط
// router.get('/stats', authMiddleware, adminMiddleware, NotificationController.getNotificationStats);
// router.post('/', authMiddleware, adminMiddleware, NotificationController.createNotification);
// router.post('/bulk', authMiddleware, adminMiddleware, NotificationController.bulkCreateNotifications);


module.exports = router;