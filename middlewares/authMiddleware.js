const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const { JWT_SECRET } = require('../config/auth');

const authMiddleware = async (req, res, next) => {

    const token = req.cookies.token;

    if (!token) {

        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {

        const decoded = jwt.verify(token, JWT_SECRET);


        const user = await User.findById(decoded.userId);

        if (!user) {

            res.clearCookie('token'); 
            return res.status(401).json({ error: 'المستخدم المرتبط بهذا التوكن غير موجود.' });
        }

        if (user.status === 'suspended') {

             res.clearCookie('token'); 
            return res.status(403).json({ error: 'هذا الحساب معلق.' });
        }

        const activeSession = await User.getActiveSessionByToken(decoded.sessionId);

        if (!activeSession) {

            res.clearCookie('token'); 
            return res.status(401).json({ error: 'الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.' });
        }




        req.user = user; 
        next(); 

    } catch (error) {

        if (error.name === 'TokenExpiredError') {
            res.clearCookie('token'); 
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
        }
        if (error.name === 'JsonWebTokenError') {
            res.clearCookie('token'); 
            return res.status(401).json({ error: 'التوكن غير صالح.' });
        }

        console.error("Authentication error:", error);
        res.status(500).json({ error: 'حدث خطأ أثناء المصادقة.' });
    }
};

module.exports = { authMiddleware };