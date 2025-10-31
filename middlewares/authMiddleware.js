const jwt = require('jsonwebtoken');
const User = require('../models/User'); // سنستخدم User.findById و User.getActiveSessionByToken
const { JWT_SECRET } = require('../config/auth');

const authMiddleware = async (req, res, next) => {
    // 1. الحصول على توكن JWT من الـ Cookie
    const token = req.cookies.token;

    if (!token) {
        // لا يوجد توكن، المستخدم غير مصادق عليه
        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {
        // 2. التحقق من توقيع وصلاحية توكن JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        // decoded يحتوي الآن على: userId, email, role, sessionId, iat, exp

        // 3. التحقق من وجود المستخدم وحالته
        const user = await User.findById(decoded.userId);

        if (!user) {
            // المستخدم المرتبط بالتوكن لم يعد موجودًا
            res.clearCookie('token'); // مسح الكوكي غير الصالح
            return res.status(401).json({ error: 'المستخدم المرتبط بهذا التوكن غير موجود.' });
        }

        if (user.status === 'suspended') {
            // الحساب معلق
             res.clearCookie('token'); // مسح الكوكي للحساب المعلق
            return res.status(403).json({ error: 'هذا الحساب معلق.' });
        }

        // 4. التحقق من وجود الجلسة النشطة باستخدام sessionId من التوكن
        const activeSession = await User.getActiveSessionByToken(decoded.sessionId);

        if (!activeSession) {
            // الجلسة غير موجودة في قاعدة البيانات (ربما تم تسجيل الخروج أو تغيير كلمة المرور)
            res.clearCookie('token'); // مسح الكوكي غير الصالح
            return res.status(401).json({ error: 'الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.' });
        }

        // 5. تحديث وقت آخر ظهور للجلسة (اختياري ولكن جيد)
        // لا نحتاج لتحديثها هنا بالضرورة، يمكن تحديثها عند كل طلب إذا أردنا تتبع النشاط بدقة
        // await db.query('UPDATE ActiveSessions SET last_seen = CURRENT_TIMESTAMP WHERE session_id = $1', [activeSession.session_id]);


        // 6. إرفاق بيانات المستخدم الآمنة بالطلب
        req.user = user; // user هنا هو البيانات الآمنة التي تم إرجاعها من User.findById
        next(); // السماح للطلب بالمرور إلى الدالة التالية

    } catch (error) {
        // التعامل مع أخطاء التحقق من التوكن
        if (error.name === 'TokenExpiredError') {
            res.clearCookie('token'); // مسح الكوكي المنتهي
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
        }
        if (error.name === 'JsonWebTokenError') {
            res.clearCookie('token'); // مسح الكوكي غير الصالح
            return res.status(401).json({ error: 'التوكن غير صالح.' });
        }
        // لأي أخطاء أخرى غير متوقعة
        console.error("Authentication error:", error);
        res.status(500).json({ error: 'حدث خطأ أثناء المصادقة.' });
    }
};

module.exports = { authMiddleware };