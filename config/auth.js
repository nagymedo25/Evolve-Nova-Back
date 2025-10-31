const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'puls-academy-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // صلاحية توكن JWT

const hashPassword = async (password) => {
    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
};

const comparePassword = async (password, hashedPassword) => {
    try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error comparing password:', error);
        throw error;
    }
};

// تم تعديل هذه الدالة لتتضمن sessionId (توكن الجلسة UUID)
const generateToken = (user, sessionId) => {
       try {
        // نضع فقط البيانات الأساسية اللازمة للتحقق من المستخدم والجلسة في التوكن
        const payload = {
            userId: user.user_id,
            email: user.email, // Keep email for potential identification
            role: user.role,
            sessionId: sessionId, // Add the session UUID here
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });

        return token;
    } catch (error) {
        console.error('Error generating JWT:', error);
        throw error;
    }
};

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded; // Contains userId, email, role, sessionId, iat, exp
    } catch (error) {
        // لا نطبع الخطأ هنا بالضرورة، قد يكون توكن منتهي الصلاحية فقط
        // console.error('Error verifying token:', error);
        throw error; // Let the caller (e.g., authMiddleware) handle specific errors
    }
};

// تم إزالة generateRefreshToken, isAdmin, isStudent, canAccessCourse, canModifyUser

// دالة محدثة لإنشاء بيانات المستخدم الآمنة للعرض
const createSafeUserData = (user) => {
    if (!user) return null;
    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        status: user.status // Keep status for frontend UI logic if needed
    };
};

// تبقى دالة التحقق من قوة كلمة المرور كما هي
const validatePasswordStrength = (password) => {
    const minLength = 8;
    // تبسيط الشروط: طول فقط ورقم واحد على الأقل
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!password || password.length < minLength) {
        return {
            isValid: false,
            message: `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`
        };
    }

    // if (!hasUpperCase || !hasLowerCase) {
    //     return {
    //         isValid: false,
    //         message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة'
    //     };
    // }

    if (!hasNumbers) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'
        };
    }

    // if (!hasSpecialChar) {
    //     return {
    //         isValid: false,
    //         message: 'كلمة المرور يجب أن تحتوي على رموز خاصة'
    //     };
    // }

    return {
        isValid: true,
        message: 'كلمة المرور مقبولة'
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    createSafeUserData, // Updated function
    validatePasswordStrength, // Simplified validation
    JWT_SECRET,
    JWT_EXPIRES_IN
};