// puls-academy-backend/middlewares/adminMiddleware.js

// إزالة استيراد isAdmin لأنه لم يعد موجوداً
// const { isAdmin } = require('../config/auth');

const adminMiddleware = (req, res, next) => {
    // نفترض أن authMiddleware قد قام بالفعل بتعبئة req.user
    if (!req.user) {
        // حالة احتياطية إذا لم يتم استدعاء authMiddleware قبله لسبب ما
        return res.status(401).json({ error: 'غير مصادق عليه' });
    }

    // التحقق مباشرة من دور المستخدم
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه الصفحة (مطلوب صلاحيات أدمن)' });
    }

    // إذا كان المستخدم أدمن، اسمح له بالمرور
    next();

    // إزالة كتلة try...catch السابقة لأن التحقق أصبح بسيطاً
};

module.exports = { adminMiddleware };