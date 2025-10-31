// puls-academy-backend/middlewares/validationMiddleware.js

const { validatePasswordStrength } = require("../config/auth");
const { validateEmail } = require("../utils/helpers"); // نستورد فقط validateEmail

const validateRegistration = (req, res, next) => {
  try {
    // التحقق من الحقول الأساسية: name, email, password
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

    // استخدام التحقق المبسط من قوة كلمة المرور
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // إزالة التحقق من college و gender

    next();
  } catch (error) {
    console.error("Validation Error (Register):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات التسجيل" });
  }
};

const validateLogin = (req, res, next) => {
  try {
    // التحقق من email و password فقط
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }
     if (!validateEmail(email)) { // يمكن إضافة تحقق بسيط لصيغة الإيميل هنا أيضاً
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
    // التحقق من الحقول الأساسية للكورس الجديد
    const {
      title, description, category, price, thumbnail_url, preview_url,
      instructor, duration, level
    } = req.body;

    // جعل الحقول الوصفية الطويلة اختيارية في التحقق الأولي
    if (
      !title || !category || price === undefined || price === '' ||
      !instructor || !duration || !level || !thumbnail_url || !preview_url
    ) {
      return res
        .status(400)
        .json({ error: "العنوان، القسم، السعر، المدرب، المدة، المستوى، ورابط الصورة المصغرة والمعاينة مطلوبة" });
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
      if (typeof preview_url !== "string" || preview_url.trim().length === 0) {
          return res.status(400).json({ error: "رابط فيديو المعاينة مطلوب" });
      }


    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "السعر يجب أن يكون رقماً موجباً أو صفراً" });
    }

    // يمكن إضافة تحقق من original_price إذا تم إرساله
     if (req.body.original_price !== undefined) {
         const numericOriginalPrice = parseFloat(req.body.original_price);
         if (isNaN(numericOriginalPrice) || numericOriginalPrice < 0) {
             return res.status(400).json({ error: "السعر الأصلي يجب أن يكون رقماً موجباً أو صفراً" });
         }
     }


    // إزالة التحقق من college_type

    // التحقق من أن الحقول التي هي مصفوفات هي بالفعل مصفوفات إذا تم إرسالها
    ['what_you_learn', 'topics', 'requirements'].forEach(field => {
        if (req.body[field] !== undefined && !Array.isArray(req.body[field])) {
            return res.status(400).json({ error: `الحقل ${field} يجب أن يكون مصفوفة` });
        }
    });

    // التحقق من أن faqs مصفوفة كائنات إذا تم إرسالها
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

// يمكن استخدام نفس دالة الإنشاء للتحقق من التحديث، أو إنشاء دالة مخصصة أقل صرامة
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

         // يمكن إضافة تحقق مشابه لدالة الإنشاء للحقول الأخرى إذا أردت ضمان عدم إرسال قيم غير صالحة
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

    // التحقق من وجود ملف مرفق (يتم بواسطة multer، لكن يمكن إضافة تحقق هنا أيضاً)
    // if (!req.file) {
    //   return res.status(400).json({ error: "صورة الإيصال مطلوبة" });
    // }

    next();
  } catch (error) {
    console.error("Validation Error (Payment Create):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات الدفع" });
  }
};

const validateProfileUpdate = (req, res, next) => {
  try {
    const { name, email } = req.body; // فقط name و email

    if (name !== undefined && (typeof name !== "string" || name.trim().length < 3)) {
      return res
        .status(400)
        .json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
    }

    if (email !== undefined && !validateEmail(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }

    // إزالة التحقق من phone, college, gender

    next();
  } catch (error) {
    console.error("Validation Error (Profile Update):", error);
    res.status(500).json({ error: "خطأ في التحقق من بيانات تحديث الملف الشخصي" });
  }
};

// دالة تحقق جديدة لتغيير كلمة المرور
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

// دالة تحقق جديدة لتحديث حالة المستخدم (للأدمن)
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


// دالة تحقق جديدة لإنشاء درس
const validateLessonCreation = (req, res, next) => {
    try {
        const { title, video_url, duration } = req.body; // description, is_preview, order_index اختيارية
        if (!title || !video_url) {
            return res.status(400).json({ error: 'عنوان الدرس ورابط الفيديو مطلوبان' });
        }
        // يمكن إضافة تحقق إضافي على duration إذا أردت صيغة محددة
        next();
    } catch (error) {
        console.error("Validation Error (Lesson Create):", error);
        res.status(500).json({ error: "خطأ في التحقق من بيانات إنشاء الدرس" });
    }
};

// دالة تحقق جديدة لتحديث درس (تسمح بتحديث أي حقل)
const validateLessonUpdate = (req, res, next) => {
    // لا يوجد تحقق إلزامي هنا لأن أي حقل يمكن تحديثه بشكل منفصل
    // يمكن إضافة تحقق إذا تم إرسال حقل بقيمة غير صالحة (مثل is_preview ليست boolean)
    next();
};

// دالة تحقق جديدة لتحديث بيانات المستخدم بواسطة الأدمن
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



module.exports = {
  validateRegistration,
  validateLogin,
  validateCourseCreation,
  validatePaymentCreation,
  validateProfileUpdate,
  // إضافة الدوال الجديدة
  validatePasswordChange,
  validateStatusUpdate,
  validateLessonCreation,
  validateLessonUpdate,
  validateUserUpdate, // للتحقق عند تحديث المستخدم بواسطة الأدمن
  validateCourseUpdate, // دالة منفصلة لتحديث الكورس
};