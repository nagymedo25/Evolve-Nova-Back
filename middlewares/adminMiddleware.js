



const adminMiddleware = (req, res, next) => {

    if (!req.user) {

        return res.status(401).json({ error: 'غير مصادق عليه' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه الصفحة (مطلوب صلاحيات أدمن)' });
    }

    next();

};

module.exports = { adminMiddleware };