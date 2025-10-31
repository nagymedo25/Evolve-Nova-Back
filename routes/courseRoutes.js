// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// استيراد middleware التحقق من الصحة (سيتم تعديله لاحقاً)
const { validateCourseCreation, validateLessonCreation, validateCourseUpdate, validateLessonUpdate } = require('../middlewares/validationMiddleware'); // افترض وجود هذه الدوال

// --- المسارات العامة ---
router.get('/', CourseController.getAllCourses); // جلب كل الكورسات (مع فلاتر)
router.get('/:courseId', CourseController.getCourseById); // جلب كورس معين
router.get('/:courseId/preview', CourseController.getPreviewLesson); // جلب درس المعاينة

// --- مسارات الطلاب (تتطلب مصادقة) ---
// تم إزالة /available
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons); // جلب دروس كورس (للأدمن أو الطالب المسجل)
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById); // جلب درس معين (للأدمن أو الطالب المسجل)

// --- مسارات الأدمن (تتطلب مصادقة + صلاحيات أدمن) ---
// استخدام validateCourseCreation المعدل
router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
// استخدام validateCourseUpdate المعدل
router.put('/:courseId', authMiddleware, adminMiddleware, validateCourseUpdate, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// استخدام validateLessonCreation المعدل
router.post('/:courseId/lessons', authMiddleware, adminMiddleware, validateLessonCreation, CourseController.addLessonToCourse);
// استخدام validateLessonUpdate المعدل
router.put('/lessons/:lessonId', authMiddleware, adminMiddleware, validateLessonUpdate, CourseController.updateLesson); // مسار لتحديث الدرس
router.delete('/lessons/:lessonId', authMiddleware, adminMiddleware, CourseController.deleteLesson); // مسار لحذف الدرس

// مسار إضافي للأدمن لجلب كل الدروس بدون فحص التسجيل (إذا لزم الأمر لواجهة الأدمن)
router.get('/:courseId/lessons-admin', authMiddleware, adminMiddleware, CourseController.getAdminCourseLessons);


module.exports = router;