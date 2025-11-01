const User = require("../models/User");
const { generateToken, createSafeUserData } = require("../config/auth"); 
const jwt = require('jsonwebtoken'); 
const { JWT_SECRET } = require('../config/auth'); 

const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
  };
  res.cookie("token", token, cookieOptions);
};

class AuthController {
  static async register(req, res) {
    try {

      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "يرجى ملء حقول الاسم والبريد الإلكتروني وكلمة المرور." });
      }

      const user = await User.create({
        name,
        email,
        password,
      });

      return res.status(201).json({
        message: "تم إنشاء الحساب بنجاح",
        user: createSafeUserData(user) 
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

      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      }


      const result = await User.login(email, password); 


      if (result.status === 'success') {

        const jwtToken = generateToken(result.user, result.token); 
        sendTokenCookie(res, jwtToken); 
        return res.json({
          message: result.message,
          user: result.user, 
        });
      }


    } catch (error) {

      res.status(401).json({ error: error.message });
    }
  }

  static async getProfile(req, res) {

    res.json({ user: req.user });
  }

  static async updateProfile(req, res) {
    try {

      const { name, email } = req.body;
      const userId = req.user.user_id;

      const dataToUpdate = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (email !== undefined) dataToUpdate.email = email;

       if (Object.keys(dataToUpdate).length === 0) {
           return res.status(400).json({ error: "لا توجد بيانات لتحديثها. يمكنك تحديث الاسم أو البريد الإلكتروني." });
       }


      const updatedUser = await User.update(userId, dataToUpdate);

      res.json({
        message: "تم تحديث البيانات بنجاح",
        user: updatedUser, 
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

      const result = await User.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      };
      res.clearCookie('token', cookieOptions);


      res.json(result);
    } catch (error) {

      res.status(400).json({ error: error.message });
    }
  }

  static async logout(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.sessionId) {
            await User.deleteSessionByToken(decoded.sessionId); 
          }
        } catch (err) {

          console.error("Error decoding/verifying token on logout, proceeding to clear cookie:", err.message);
        }
      }

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