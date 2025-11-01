const { validatePasswordStrength } = require("../config/auth");
const { validateEmail } = require("../utils/helpers");

const validateRegistration = (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور هي حقول مطلوبة" });
    }

    if (typeof name !== "string" || name.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    next();
  } catch (error) {
    console.error("Validation Error (Register):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات التسجيل" });
  }
};

const validateLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }
     if (!validateEmail(email)) {
         return res.status(400).json({ error: "صيغة البريد الإلكتروني غير صالحة" });
     }


    next();
  } catch (error) {
    console.error("Validation Error (Login):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات الدخول" });
  }
};

const validateCourseCreation = (req, res, next) => {
  try {
    const {
      title, description, category, price, thumbnail_url,
      instructor, duration, level
    } = req.body;

    if (
      !title || !category || price === undefined || price === '' ||
      !instructor || !duration || !level || !thumbnail_url
    ) {
      return res
        .status(400)
        .json({ error: "العنوان، القسم، السعر، المدرب، المدة، المستوى، ورابط الصورة المصغرة مطلوبة" });
    }

    if (typeof title !== "string" || title.trim().length < 3) {
      return res.status(400).json({ error: "عنوان الكورس يجب أن يكون 3 أحرف على الأقل" });
    }

     if (description && (typeof description !== "string" || description.trim().length < 5)) {
        return res.status(400).json({ error: "الوصف المختصر (إن وجد) يجب أن يكون 5 أحرف على الأقل" });
     }

    if (typeof category !== "string" || category.trim().length === 0) {
        return res.status(400).json({ error: "قسم الكورس مطلوب" });
    }
     if (typeof instructor !== "string" || instructor.trim().length === 0) {
         return res.status(400).json({ error: "اسم المدرب مطلوب" });
     }
      if (typeof duration !== "string" || duration.trim().length === 0) {
         return res.status(400).json({ error: "مدة الكورس مطلوبة" });
     }
      if (typeof level !== "string" || level.trim().length === 0) {
         return res.status(400).json({ error: "مستوى الكورس مطلوب" });
     }
      if (typeof thumbnail_url !== "string" || thumbnail_url.trim().length === 0) {
          return res.status(400).json({ error: "رابط الصورة المصغرة مطلوب" });
      }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "السعر يجب أن يكون رقماً موجباً أو صفراً" });
    }

     if (req.body.original_price !== undefined) {
         const numericOriginalPrice = parseFloat(req.body.original_price);
         if (isNaN(numericOriginalPrice) || numericOriginalPrice < 0) {
             return res.status(400).json({ error: "السعر الأصلي يجب أن يكون رقماً موجباً أو صفراً" });
         }
     }

    ['what_you_learn', 'topics', 'requirements'].forEach(field => {
        if (req.body[field] !== undefined && !Array.isArray(req.body[field])) {
            return res.status(400).json({ error: `الحقل ${field} يجب أن يكون مصفوفة` });
        }
    });

    if (req.body.faqs !== undefined) {
        if (!Array.isArray(req.body.faqs)) {
            return res.status(400).json({ error: `الحقل faqs يجب أن يكون مصفوفة` });
        }
        if (!req.body.faqs.every(item => typeof item === 'object' && item !== null && item.question && item.answer)) {
            return res.status(400).json({ error: `كل عنصر في faqs يجب أن يكون كائن يحتوي على question و answer` });
        }
    }


    next();
  } catch (error) {
    console.error("Validation Error (Course Create):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات الكورس" });
  }
};

const validateCourseUpdate = (req, res, next) => {
    try {
        const { price, original_price } = req.body;

        if (price !== undefined) {
             const numericPrice = parseFloat(price);
             if (isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({ error: "السعر يجب أن يكون رقماً موجباً أو صفراً" });
             }
        }
        if (original_price !== undefined) {
             const numericOriginalPrice = parseFloat(original_price);
             if (isNaN(numericOriginalPrice) || numericOriginalPrice < 0) {
                 return res.status(400).json({ error: "السعر الأصلي يجب أن يكون رقماً موجباً أو صفراً" });
             }
         }

         ['what_you_learn', 'topics', 'requirements'].forEach(field => {
            if (req.body[field] !== undefined && !Array.isArray(req.body[field])) {
                return res.status(400).json({ error: `الحقل ${field} يجب أن يكون مصفوفة` });
            }
        });
        if (req.body.faqs !== undefined) {
            if (!Array.isArray(req.body.faqs)) {
                return res.status(400).json({ error: `الحقل faqs يجب أن يكون مصفوفة` });
            }
             if (!req.body.faqs.every(item => typeof item === 'object' && item !== null && item.question && item.answer)) {
                 return res.status(400).json({ error: `كل عنصر في faqs يجب أن يكون كائن يحتوي على question و answer` });
             }
        }


        next();
    } catch (error) {
        console.error("Validation Error (Course Update):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات تحديث الكورس" });
    }
};


const validatePaymentCreation = (req, res, next) => {
  try {
    const { course_id, amount, method } = req.body;

    if (!course_id || !amount || !method) {
      return res.status(400).json({ error: "معرف الكورس والمبلغ وطريقة الدفع مطلوبة" });
    }

    const courseIdNum = parseInt(course_id);
    if (isNaN(courseIdNum) || courseIdNum <= 0) {
        return res.status(400).json({ error: "معرف الكورس غير صالح" });
    }


    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون رقماً موجباً" });
    }

    const validMethods = ["vodafone_cash", "instapay"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: "طريقة الدفع غير صالحة" });
    }

    next();
  } catch (error) {
    console.error("Validation Error (Payment Create):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات الدفع" });
  }
};

const validateProfileUpdate = (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (name !== undefined && (typeof name !== "string" || name.trim().length < 3)) {
      return res
        .status(400)
        .json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
    }

    if (email !== undefined && !validateEmail(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }

    next();
  } catch (error) {
    console.error("Validation Error (Profile Update):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات تحديث الملف الشخصي" });
  }
};

const validatePasswordChange = (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبة' });
        }
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: `كلمة المرور الجديدة غير قوية: ${passwordValidation.message}` });
        }
        next();
    } catch (error) {
        console.error("Validation Error (Password Change):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات تغيير كلمة المرور" });
    }
};

const validateStatusUpdate = (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status || !['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'الحالة غير صالحة. يجب أن تكون active أو suspended.' });
        }
        next();
    } catch (error) {
         console.error("Validation Error (Status Update):", error);
         res.status(500).json({ error: "خطأ في التحقق من بيانات تحديث الحالة" });
    }
};

const validateLessonCreation = (req, res, next) => {
    try {
        const { title, video_url } = req.body;
        if (!title || !video_url) {
            return res.status(400).json({ error: 'عنوان الدرس ورابط الفيديو مطلوبان' });
        }
        next();
    } catch (error) {
        console.error("Validation Error (Lesson Create):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات إنشاء الدرس" });
    }
};

const validateLessonUpdate = (req, res, next) => {
    next();
};

const validateUserUpdate = (req, res, next) => {
     try {
        const { name, email, password } = req.body;
        if (name !== undefined && (typeof name !== "string" || name.trim().length < 3)) {
          return res.status(400).json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
        }
        if (email !== undefined && !validateEmail(email)) {
            return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
        }
         if (password) {
             const passwordValidation = validatePasswordStrength(password);
             if (!passwordValidation.isValid) {
                 return res.status(400).json({ error: `كلمة المرور الجديدة غير قوية: ${passwordValidation.message}` });
             }
         }
        next();
      } catch (error) {
        console.error("Validation Error (Admin User Update):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات تحديث المستخدم" });
      }
};

// --- ✨ دالة جديدة: التحقق من التقييم ✨ ---
const validateReviewCreation = (req, res, next) => {
    try {
        const { rating, comment } = req.body;

        if (!rating) {
            return res.status(400).json({ error: 'التقييم (rating) مطلوب' });
        }
        
        const numericRating = parseInt(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
             return res.status(400).json({ error: 'التقييم يجب أن يكون رقماً بين 1 و 5' });
        }

        if (comment && typeof comment !== 'string') {
             return res.status(400).json({ error: 'التعليق يجب أن يكون نصاً' });
        }

        next();
    } catch (error) {
        console.error("Validation Error (Review Create):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات التقييم" });
    }
};
// --- نهاية الدالة الجديدة ---

module.exports = {
  validateRegistration,
  validateLogin,
  validateCourseCreation,
  validatePaymentCreation,
  validateProfileUpdate,
  validatePasswordChange,
  validateStatusUpdate,
  validateLessonCreation,
  validateLessonUpdate,
  validateUserUpdate,
  validateCourseUpdate,
  validateReviewCreation, 
};