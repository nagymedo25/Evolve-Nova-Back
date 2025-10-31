// puls-academy-backend/controllers/adminController.js

const User = require('../models/User');
const Course = require('../models/Course'); // نحتاجه لجلب الكورسات
const Payment = require('../models/Payment'); // نحتاجه للإحصائيات
const Enrollment = require('../models/Enrollment'); // نحتاجه لحذف بيانات المستخدم
const Notification = require('../models/Notification'); // نحتاجه لحذف بيانات المستخدم
const Lesson = require('../models/Lesson'); // نحتاجه لحذف الكورسات
const { db } = require('../config/db'); // قد نحتاجه لبعض الاستعلامات المباشرة (نحاول تجنبه)

class AdminController {
    // إحصائيات لوحة التحكم المبسطة
    static async getDashboardStats(req, res) {
        try {
            const [
                studentCountResult,
                courseStatsResult, // يستخدم Course.getStats المحدث
                paymentStatsResult, // يستخدم Payment.getStats (لم يتغير)
                pendingPaymentsResult
            ] = await Promise.all([
                User.getCount(), // يستخدم User.getCount المحدث
                Course.getStats(),
                Payment.getStats(),
                Payment.countByStatus('pending') // يستخدم Payment.countByStatus (لم يتغير)
            ]);

            res.json({
                users: {
                    total: studentCountResult || 0,
                },
                courses: {
                    total_courses: courseStatsResult.total_courses || 0,
                },
                payments: {
                    total_revenue: paymentStatsResult.total_revenue || 0,
                    pending_count: pendingPaymentsResult.count || 0
                }
            });

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            res.status(500).json({ error: "فشل في جلب إحصائيات لوحة التحكم: " + error.message });
        }
    }

     // تحديث حالة الطالب (active/suspended)
     static async updateStudentStatus(req, res) {
        const { studentId } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'الحالة غير صالحة. يجب أن تكون active أو suspended.' });
        }

        try {
            // استخدام دالة updateStatus المضافة حديثاً في User model
            const updatedUser = await User.updateStatus(studentId, status);

            res.json({
                message: `تم تحديث حالة الطالب بنجاح إلى '${status}'.`,
                user: updatedUser // User.updateStatus تُرجع بيانات آمنة
            });
        } catch (error) {
            if (error.message === "المستخدم غير موجود") {
                 return res.status(404).json({ error: error.message });
            }
            console.error(`Error updating status for user ${studentId}:`, error);
            res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة الطالب.' });
        }
    }


    // حذف طالب (مع بياناته المرتبطة)
    static async deleteStudent(req, res) {
        const { studentId } = req.params;
        try {
            // حذف البيانات المرتبطة أولاً (Enrollments, Payments, Notifications) عبر Cascade أو يدوياً
            // العلاقات في قاعدة البيانات (ON DELETE CASCADE) يجب أن تتكفل بهذا الآن.
            // await Enrollment.deleteByUser(studentId);
            // await Payment.deleteByUser(studentId);
            // await Notification.deleteByUser(studentId);
            // await Message.deleteConversation(studentId); // إذا كان جدول الرسائل موجوداً

            // ثم حذف المستخدم نفسه
            await User.delete(studentId); // يستخدم User.delete المحدث
            res.json({ message: 'تم حذف الطالب وجميع بياناته المرتبطة بنجاح.' });
        } catch (error) {
             if (error.message === "المستخدم غير موجود") {
                 return res.status(404).json({ error: error.message });
            }
            console.error(`Error deleting student ${studentId}:`, error);
            res.status(500).json({ error: 'حدث خطأ أثناء حذف الطالب.' });
        }
    }

     // جلب جميع المستخدمين (الطلاب)
     static async getAllUsers(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const users = await User.getAll(parseInt(limit), parseInt(offset)); // يستخدم User.getAll المحدث
            // جلب العدد الإجمالي للترقيم (pagination)
            const totalUsers = await User.getCount();
            res.json({ users, total: totalUsers });

        } catch (error) {
            console.error("Error fetching all users:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // البحث عن المستخدمين (الطلاب)
    static async searchUsers(req, res) {
        try {
            const { q, limit = 20 } = req.query;

            if (!q) {
                return res.status(400).json({ error: 'كلمة البحث مطلوبة' });
            }

            const users = await User.search(q, parseInt(limit)); // يستخدم User.search المحدث
            res.json({ users });

        } catch (error) {
            console.error("Error searching users:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // جلب تفاصيل مستخدم معين (طالب) مع بياناته المرتبطة
    static async getUserDetails(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId); // يستخدم User.findById المحدث

            if (!user) {
                 return res.status(404).json({ error: "المستخدم غير موجود" });
            }

            // جلب المدفوعات والتسجيلات والإشعارات المرتبطة
            const [payments, enrollments, notifications] = await Promise.all([
                Payment.getByUser(userId), // لم تتغير
                Enrollment.getByUser(userId), // لم تتغير
                Notification.getByUser(userId) // لم تتغير
            ]);

            res.json({
                user,
                payments,
                enrollments,
                notifications
            });

        } catch (error) {
            // User.findById يرجع null إذا لم يجد المستخدم، لذلك عالجنا الحالة أعلاه
            console.error(`Error fetching details for user ${req.params.userId}:`, error);
            res.status(500).json({ error: error.message });
        }
    }

     // تحديث بيانات طالب (اسم أو إيميل أو كلمة مرور)
     static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            // استقبال name, email, password فقط
            const { name, email, password } = req.body;

            const dataToUpdate = {};
             if (name !== undefined) dataToUpdate.name = name;
             if (email !== undefined) dataToUpdate.email = email;
             if (password) dataToUpdate.password = password; // User.update سيهتم بالـ hashing

             if (Object.keys(dataToUpdate).length === 0) {
                return res.status(400).json({ error: 'لا توجد بيانات لتحديثها (الاسم، البريد الإلكتروني، كلمة المرور)' });
             }


            const updatedUser = await User.update(userId, dataToUpdate); // يستخدم User.update المحدث

            res.json({
                message: "تم تحديث بيانات الطالب بنجاح",
                user: updatedUser, // User.update تُرجع بيانات آمنة
            });
        } catch (error) {
            if (error.message.includes("مسجل بالفعل")) {
                return res.status(409).json({ error: error.message });
            }
             if (error.message === "المستخدم غير موجود") {
                 return res.status(404).json({ error: error.message });
            }
            console.error(`Error updating user ${req.params.userId}:`, error);
            res.status(400).json({ error: error.message });
        }
    }


    // --- دوال الكورسات موجودة في courseController ---
    // --- دوال المدفوعات موجودة في paymentController ---

    // --- إزالة الدوال غير المطلوبة ---
    // getDeviceRequests, approveDeviceRequest, rejectDeviceRequest
    // getViolators, suspendUser, reactivateUser (تم استبدالها بـ updateStudentStatus)
    // getConversations, getMessagesWithUser, sendMessageToUser
    // getRevenueReport, getApprovedPayments, resetRevenue
    // bulkDeleteUsers, bulkDeleteCourses
    // getTopCourses, getTopStudents
    // getCourseEnrollments, getCoursePayments (يمكن إضافتها لاحقاً إذا احتجت عرض المسجلين/المدفوعات لكورس معين)

}

module.exports = AdminController;