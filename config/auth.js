const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'puls-academy-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

const generateToken = (user, sessionId) => {
       try {
        const payload = {
            userId: user.user_id,
            email: user.email,
            role: user.role,
            sessionId: sessionId,
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
        return decoded;
    } catch (error) {
        throw error;
    }
};

const createSafeUserData = (user) => {
    if (!user) return null;
    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        status: user.status
    };
};

const validatePasswordStrength = (password) => {
    if (!password) {
        return { isValid: false, message: 'كلمة المرور مطلوبة' };
    }

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length < minLength) {
        return {
            isValid: false,
            message: `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`
        };
    }
    if (!hasLowerCase) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)'
        };
    }
    if (!hasUpperCase) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)'
        };
    }
    if (!hasNumbers) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)'
        };
    }
    if (!hasSpecialChar) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل: !@#$%^&*)'
        };
    }

    return {
        isValid: true,
        message: 'كلمة المرور قوية'
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    createSafeUserData,
    validatePasswordStrength,
    JWT_SECRET,
    JWT_EXPIRES_IN
};