const User = require("../models/User");
const { generateToken, createSafeUserData } = require("../config/auth"); // نحتاج createSafeUserData هنا فقط للإرجاع في register
const jwt = require('jsonwebtoken'); // نحتاج jwt لفك تشفير التوكن في logout
const { JWT_SECRET } = require('../config/auth'); // نحتاج JWT_SECRET لفك التشفير

// دالة لوضع التوكن في الكوكي
const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // مهم للأمان
    secure: process.env.NODE_ENV === "production", // يجب أن يكون true في الإنتاج (HTTPS)
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' يتطلب secure: true
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // صلاحية الكوكي (7 أيام كمثال)
  };
  res.cookie("token", token, cookieOptions);
};

class AuthController {
  static async register(req, res) {
    try {
      // استقبال name, email, password فقط
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "يرجى ملء حقول الاسم والبريد الإلكتروني وكلمة المرور." });
      }

      // لا حاجة لـ college, gender, pharmacy_type
      const user = await User.create({
        name,
        email,
        password,
      });

      // إرجاع بيانات المستخدم الآمنة بعد الإنشاء بنجاح
      return res.status(201).json({
        message: "تم إنشاء الحساب بنجاح",
        user: createSafeUserData(user) // استخدام الدالة المحدثة
      });

    } catch (error) {
      if (error.message.includes("مسجل بالفعل")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      // استقبال email و password فقط
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      }

      // إزالة deviceInfo و deviceFingerprint
      // استدعاء User.login المبسط
      const result = await User.login(email, password); // result يحتوي على status, message, user, token (session token UUID)

      // لا يوجد حالة pending_approval الآن

      if (result.status === 'success') {
        // إنشاء توكن JWT باستخدام بيانات المستخدم و session token (UUID)
        const jwtToken = generateToken(result.user, result.token); // result.token هو sessionId
        sendTokenCookie(res, jwtToken); // إرسال توكن JWT ككوكي
        return res.json({
          message: result.message,
          user: result.user, // result.user هو البيانات الآمنة بالفعل
        });
      }
      // نظرياً، يجب ألا نصل هنا إذا كان User.login يُرجع خطأ في حالة الفشل

    } catch (error) {
      // User.login يُرجع خطأ في حالة فشل المصادقة أو تعليق الحساب
      res.status(401).json({ error: error.message });
    }
  }

  static async getProfile(req, res) {
    // req.user يأتي من authMiddleware ويحتوي على البيانات الآمنة
    res.json({ user: req.user });
  }

  static async updateProfile(req, res) {
    try {
      // السماح بتحديث name و email فقط
      const { name, email } = req.body;
      const userId = req.user.user_id;

      // إنشاء كائن بالبيانات المراد تحديثها فقط
      const dataToUpdate = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (email !== undefined) dataToUpdate.email = email;

      // التأكد من وجود بيانات للتحديث
       if (Object.keys(dataToUpdate).length === 0) {
           return res.status(400).json({ error: "لا توجد بيانات لتحديثها. يمكنك تحديث الاسم أو البريد الإلكتروني." });
       }


      const updatedUser = await User.update(userId, dataToUpdate);

      res.json({
        message: "تم تحديث البيانات بنجاح",
        user: updatedUser, // User.update تُرجع بيانات آمنة
      });
    } catch (error) {
      if (error.message.includes("مسجل بالفعل")) {
        return res.status(409).json({ error: error.message });
      }
       if (error.message.includes("المستخدم غير موجود")) {
           return res.status(404).json({ error: error.message });
       }
      res.status(400).json({ error: error.message });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.user_id;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "كلمة المرور الحالية والجديدة مطلوبة" });
      }

      // User.changePassword تقوم بالتحقق وإنشاء الهاش وحذف الجلسات
      const result = await User.changePassword(
        userId,
        currentPassword,
        newPassword
      );

       // بعد تغيير كلمة المرور بنجاح، يجب مسح الكوكي من المتصفح أيضاً
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      };
      res.clearCookie('token', cookieOptions);


      res.json(result); // { message: "تم تغيير كلمة المرور بنجاح" }
    } catch (error) {
      // User.changePassword تُرجع خطأ إذا كانت كلمة المرور الحالية خاطئة أو المستخدم غير موجود
      res.status(400).json({ error: error.message });
    }
  }

  static async logout(req, res) {
    try {
      const token = req.cookies.token;

      // الخطوة 1: حذف الجلسة من قاعدة البيانات باستخدام sessionId من التوكن
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.sessionId) {
            await User.deleteSessionByToken(decoded.sessionId); // استخدام الدالة الجديدة
          }
        } catch (err) {
          // تجاهل الأخطاء إذا كان التوكن غير صالح أو منتهي الصلاحية، المهم هو حذف الكوكي
          console.error("Error decoding/verifying token on logout, proceeding to clear cookie:", err.message);
        }
      }

      // الخطوة 2: حذف الكوكي من المتصفح
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      };
      res.clearCookie('token', cookieOptions);

      res.json({ message: 'تم تسجيل الخروج بنجاح' });
    } catch (error) {
      console.error("Server error during logout:", error);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج' });
    }
  }
}

module.exports = AuthController;