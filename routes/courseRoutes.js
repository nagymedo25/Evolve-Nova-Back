const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { validateCourseCreation, validateLessonCreation, validateCourseUpdate, validateLessonUpdate } = require('../middlewares/validationMiddleware');

router.get('/', CourseController.getAllCourses);
router.get('/:courseId', CourseController.getCourseById);

router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, validateCourseUpdate, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

router.post('/:courseId/lessons', authMiddleware, adminMiddleware, validateLessonCreation, CourseController.addLessonToCourse);
router.put('/lessons/:lessonId', authMiddleware, adminMiddleware, validateLessonUpdate, CourseController.updateLesson);
router.delete('/lessons/:lessonId', authMiddleware, adminMiddleware, CourseController.deleteLesson);

router.get('/:courseId/lessons-admin', authMiddleware, adminMiddleware, CourseController.getAdminCourseLessons);

module.exports = router;