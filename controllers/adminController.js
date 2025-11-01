const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const { hashPassword } = require('../config/auth');

class AdminController {

    static async getAllUsers(req, res) {
        try {
            const users = await User.getAll();  
            res.json({ users });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async searchUsers(req, res) {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({ error: "Query parameter 'q' is required" });
            }
            const users = await User.searchStudents(query);
            res.json({ users });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    static async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'المستخدم غير موجود' });
            }
            res.json({ user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { name, email, password } = req.body;
            const userData = { name, email };

            if (password) {
                userData.password_hash = await hashPassword(password);
            }

            const updatedUser = await User.update(userId, userData);
            res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: updatedUser });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async updateUserStatus(req, res) {
        try {
            const { userId } = req.params;
            const { status } = req.body;
            const updatedUser = await User.updateStatus(userId, status);
            res.json({ message: 'تم تحديث حالة المستخدم بنجاح', user: updatedUser });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            await User.delete(userId);
            res.json({ message: 'تم حذف المستخدم بنجاح' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getDashboardStats(req, res) {
        try {
            const usersStats = await User.getStats();
            const coursesStats = await Course.getStats();
            const paymentsStats = await Payment.getStats();

            res.json({
                users: usersStats,
                courses: coursesStats,
                payments: paymentsStats
            });
        } catch (error) {
            res.status(500).json({ error: `Failed to get dashboard stats: ${error.message}` });
        }
    }

    static async resetPayments(req, res) {
        try {
            const result = await Payment.resetAllPayments();
            res.json({ message: "تم تصفير جميع المدفوعات بنجاح", ...result });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

}

module.exports = AdminController;