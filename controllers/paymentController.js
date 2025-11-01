const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const Course = require("../models/Course");
const { deleteFile } = require('../config/storage');

class PaymentController {
  static async createPayment(req, res) {
    try {
      const { course_id, amount, method } = req.body;
      const user_id = req.user.user_id;

      if (!course_id || !amount || !method) {
        return res.status(400).json({ error: "معرف الكورس والمبلغ وطريقة الدفع مطلوبة" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "صورة الإيصال مطلوبة" });
      }

      const screenshot_url = req.file.path;
      const screenshot_public_id = req.file.filename;

       let course;
       try {
           course = await Course.findById(course_id);
       } catch (courseError) {
           if (courseError.message === "الكورس غير موجود") {
                if (screenshot_public_id) {
                    await deleteFile(screenshot_public_id);
                }
               return res.status(404).json({ error: "الكورس المطلوب غير موجود." });
           }
           throw courseError;
       }


      const payment = await Payment.create({
        user_id,
        course_id: parseInt(course_id),
        amount: parseFloat(amount),
        method,
        screenshot_url,
        screenshot_public_id,
      });

      await Notification.createPaymentPending(user_id, course.title);

      res.status(201).json({ message: "تم إرسال طلب الدفع بنجاح وهو قيد المراجعة", payment });
    } catch (error) {
      console.error("Error creating payment:", error);
        if (req.file && req.file.filename) {
            try { await deleteFile(req.file.filename); } catch (delErr) { console.error("Error deleting orphaned upload:", delErr);}
        }
      res.status(400).json({ error: error.message || "حدث خطأ أثناء إنشاء طلب الدفع." });
    }
  }

  static async approvePayment(req, res) {
    try {
      const { paymentId } = req.params;

      const paymentToProcess = await Payment.findById(paymentId);

      await Payment.updateStatus(paymentId, 'approved');
      const updatedPayment = await Payment.findById(paymentId);

      await Enrollment.create({
        user_id: updatedPayment.user_id,
        course_id: updatedPayment.course_id,
        payment_id: updatedPayment.payment_id,
        status: "active",
      });

      const course = await Course.findById(paymentToProcess.course_id);

      await Notification.createPaymentApproved(
        updatedPayment.user_id,
        course.title
      );

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

  static async rejectPayment(req, res) {
    try {
      const { paymentId } = req.params;

      const paymentToProcess = await Payment.findById(paymentId);

      const payment = await Payment.updateStatus(paymentId, 'rejected');

      const course = await Course.findById(paymentToProcess.course_id);

      await Notification.createPaymentRejected(
        payment.user_id,
        course.title
      );

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

  static async getPayments(req, res) {
    try {
      const { status, user_id, course_id, method, limit, offset } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (user_id) filters.user_id = parseInt(user_id);
      if (course_id) filters.course_id = parseInt(course_id);
      if (method) filters.method = method;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const payments = await Payment.findAll(filters);
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId);
      res.json({ payment });
    } catch (error) {
        if (error.message === "الدفعة غير موجودة") {
            return res.status(404).json({ error: error.message });
        }
      console.error("Error fetching payment by ID:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getUserPayments(req, res) {
    try {
      const userId = req.user.user_id;
      const payments = await Payment.findByUserId(userId);
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendingPayments(req, res) {
    try {
      const payments = await Payment.findPending();
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentStats(req, res) {
    try {
      const stats = await Payment.getStats();
      res.json({ stats });
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const paymentToDelete = await Payment.findById(paymentId);
      if (paymentToDelete && paymentToDelete.screenshot_public_id) {
          await deleteFile(paymentToDelete.screenshot_public_id);
      }
      const result = await Payment.delete(paymentId);
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