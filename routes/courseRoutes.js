const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// تأكد من استيراد دالة التحقق الخاصة بالتقييم
const { 
  validateCourseCreation, 
  validateLessonCreation, 
  validateCourseUpdate, 
  validateLessonUpdate,
  validateReviewCreation // <-- هذا السطر مهم
} = require('../middlewares/validationMiddleware');

// --- مسارات الكورسات والدروس (عامة) ---
router.get('/', CourseController.getAllCourses);
router.get('/:courseId', CourseController.getCourseById);

// --- ✨ المسارات الجديدة المضافة للتقييمات ✨ ---
// هذا المسار لجلب التقييمات
router.get('/:courseId/reviews', CourseController.getCourseReviews);
// هذا المسار لإضافة تقييم (وهو الذي يسبب الخطأ 404 حالياً)
router.post('/:courseId/reviews', authMiddleware, validateReviewCreation, CourseController.createReview);
// --- نهاية المسارات الجديدة ---

// --- مسارات الدروس (للطالب المسجل) ---
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- مسارات إدارة الكورسات (للأدمن) ---
router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, validateCourseUpdate, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// --- مسارات إدارة الدروس (للأدمن) ---
router.post('/:courseId/lessons', authMiddleware, adminMiddleware, validateLessonCreation, CourseController.addLessonToCourse);
router.put('/lessons/:lessonId', authMiddleware, adminMiddleware, validateLessonUpdate, CourseController.updateLesson);
router.delete('/lessons/:lessonId', authMiddleware, adminMiddleware, CourseController.deleteLesson);
router.get('/:courseId/lessons-admin', authMiddleware, adminMiddleware, CourseController.getAdminCourseLessons);

module.exports = router;