// puls-academy-backend/controllers/paymentController.js

const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const Course = require("../models/Course"); // نحتاجه لجلب عنوان الكورس
const { deleteFile } = require('../config/storage'); // للتفاعل مع Cloudinary

class PaymentController {
  // إنشاء طلب دفع (للطالب)
  static async createPayment(req, res) {
    try {
      const { course_id, amount, method } = req.body;
      // الحصول على user_id من req.user الذي تم تعيينه بواسطة authMiddleware
      const user_id = req.user.user_id;

      // التحقق الأساسي من المدخلات
      if (!course_id || !amount || !method) {
        return res.status(400).json({ error: "معرف الكورس والمبلغ وطريقة الدفع مطلوبة" });
      }

      // التحقق من رفع ملف الصورة
      if (!req.file) {
        return res.status(400).json({ error: "صورة الإيصال مطلوبة" });
      }

      // الحصول على رابط الصورة والمعرف العام من Cloudinary (req.file يتم تعبئته بواسطة multer)
      const screenshot_url = req.file.path;
      const screenshot_public_id = req.file.filename; // أو req.file.public_id حسب إعدادات multer-storage-cloudinary

      // التأكد من وجود الكورس قبل إنشاء الدفع
       let course;
       try {
           course = await Course.findById(course_id);
       } catch (courseError) {
           // إذا كان الكورس غير موجود
           if (courseError.message === "الكورس غير موجود") {
               // حذف الصورة التي تم رفعها للتو لأن الدفع لن يتم
                if (screenshot_public_id) {
                    await deleteFile(screenshot_public_id);
                }
               return res.status(404).json({ error: "الكورس المطلوب غير موجود." });
           }
           throw courseError; // إرجاع أي خطأ آخر
       }


      // إنشاء سجل الدفع في قاعدة البيانات
      const payment = await Payment.create({
        user_id,
        course_id: parseInt(course_id),
        amount: parseFloat(amount),
        method,
        screenshot_url,
        screenshot_public_id, // حفظ المعرف العام للحذف لاحقاً
      });

      // إنشاء إشعار للطالب بأن الدفع قيد المراجعة
      // Course.findById تم استدعاؤه بالفعل
      await Notification.createPaymentPending(user_id, course.title);

      res.status(201).json({ message: "تم إرسال طلب الدفع بنجاح وهو قيد المراجعة", payment });
    } catch (error) {
      // التعامل مع الأخطاء العامة
      console.error("Error creating payment:", error);
      // محاولة حذف الصورة إذا حدث خطأ بعد رفعها وقبل حفظ الدفع (Best effort)
        if (req.file && req.file.filename) {
            try { await deleteFile(req.file.filename); } catch (delErr) { console.error("Error deleting orphaned upload:", delErr);}
        }
      res.status(400).json({ error: error.message || "حدث خطأ أثناء إنشاء طلب الدفع." });
    }
  }

  // الموافقة على الدفع (للأدمن)
  static async approvePayment(req, res) {
    try {
      const { paymentId } = req.params;

      // الحصول على بيانات الدفع قبل الموافقة للتأكد من وجودها وللحصول على screenshot_public_id
      const paymentToProcess = await Payment.findById(paymentId); // findById لم يتغير بشكل كبير

      // تحديث حالة الدفع إلى 'approved'
      await Payment.approve(paymentId); // approve لم يتغير
      const updatedPayment = await Payment.findById(paymentId); // جلب البيانات المحدثة

      // إنشاء سجل تسجيل للطالب في الكورس
      await Enrollment.create({ // create لم يتغير
        user_id: updatedPayment.user_id,
        course_id: updatedPayment.course_id,
        payment_id: updatedPayment.payment_id, // ربط التسجيل بالدفعة المعتمدة
        status: "active", // حالة التسجيل نشطة
      });

      // إرسال إشعار للطالب بأن الكورس تم فتحه
      await Notification.createPaymentApproved(
        updatedPayment.user_id,
        updatedPayment.course_title // العنوان يأتي من Payment.findById
      );

      // حذف صورة الإيصال من Cloudinary بعد الموافقة
      if (paymentToProcess.screenshot_public_id) {
        await deleteFile(paymentToProcess.screenshot_public_id);
      }

      res.json({
        message: "تم اعتماد الدفع وفتح الكورس للطالب بنجاح",
        payment: updatedPayment,
      });
    } catch (error) {
       if (error.message.includes("غير موجود")) {
            return res.status(404).json({ error: "طلب الدفع غير موجود" });
       }
       if (error.message.includes("معتمدة بالفعل")) {
           return res.status(400).json({ error: "هذه الدفعة معتمدة بالفعل." });
       }
      console.error("Error approving payment:", error);
      res.status(400).json({ error: error.message || "حدث خطأ أثناء الموافقة على الدفع." });
    }
  }

  // رفض الدفع (للأدمن)
  static async rejectPayment(req, res) {
    try {
      const { paymentId } = req.params;

      // الحصول على بيانات الدفع قبل الرفض
      const paymentToProcess = await Payment.findById(paymentId);

      // تحديث حالة الدفع إلى 'rejected'
      const payment = await Payment.reject(paymentId); // reject لم يتغير

      // إرسال إشعار للطالب بأن الدفع تم رفضه
      await Notification.createPaymentRejected(
        payment.user_id,
        payment.course_title
      );

      // حذف صورة الإيصال من Cloudinary بعد الرفض
      if (paymentToProcess.screenshot_public_id) {
        await deleteFile(paymentToProcess.screenshot_public_id);
      }

      res.json({
        message: "تم رفض طلب الدفع بنجاح",
        payment,
      });
    } catch (error) {
       if (error.message.includes("غير موجود")) {
            return res.status(404).json({ error: "طلب الدفع غير موجود" });
       }
        if (error.message.includes("مرفوضة بالفعل")) {
           return res.status(400).json({ error: "هذه الدفعة مرفوضة بالفعل." });
       }
      console.error("Error rejecting payment:", error);
      res.status(400).json({ error: error.message || "حدث خطأ أثناء رفض الدفع." });
    }
  }

  // جلب جميع المدفوعات (للأدمن، مع فلاتر)
  static async getPayments(req, res) {
    try {
      // الفلاتر تبقى كما هي
      const { status, user_id, course_id, method, limit, offset } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (user_id) filters.user_id = parseInt(user_id);
      if (course_id) filters.course_id = parseInt(course_id);
      if (method) filters.method = method;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const payments = await Payment.getAll(filters); // getAll لم يتغير
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // جلب دفعة معينة بالـ ID (للأدمن)
  static async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId); // findById لم يتغير
      res.json({ payment });
    } catch (error) {
        if (error.message === "الدفعة غير موجودة") {
            return res.status(404).json({ error: error.message });
        }
      console.error("Error fetching payment by ID:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // جلب مدفوعات المستخدم الحالي (للطالب)
  static async getUserPayments(req, res) {
    try {
      const userId = req.user.user_id; // من authMiddleware
      const payments = await Payment.getByUser(userId); // getByUser لم يتغير
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // جلب المدفوعات المعلقة (للأدمن)
  static async getPendingPayments(req, res) {
    try {
      const payments = await Payment.getPending(); // getPending لم يتغير
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // جلب إحصائيات المدفوعات (للأدمن)
  static async getPaymentStats(req, res) {
    try {
      const stats = await Payment.getStats(); // getStats لم يتغير
      res.json({ stats });
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // حذف دفعة معينة (للأدمن)
  static async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;
      // الحصول على بيانات الدفعة أولاً لحذف الصورة
      const paymentToDelete = await Payment.findById(paymentId);
      if (paymentToDelete && paymentToDelete.screenshot_public_id) {
          await deleteFile(paymentToDelete.screenshot_public_id);
      }
      // ثم حذف سجل الدفعة من قاعدة البيانات
      const result = await Payment.delete(paymentId); // delete لم يتغير
      res.json(result);
    } catch (error) {
        if (error.message === "الدفعة غير موجودة") {
            return res.status(404).json({ error: error.message });
        }
      console.error("Error deleting payment:", error);
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = PaymentController;