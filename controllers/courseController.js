const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");

class CourseController {
  static async getAllCourses(req, res) {
    try {
      const { category, searchTerm, min_price, max_price, limit, offset } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (searchTerm) filters.searchTerm = searchTerm;
      if (min_price) filters.min_price = parseFloat(min_price);
      if (max_price) filters.max_price = parseFloat(max_price);
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const courses = await Course.getAll(filters);
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCourseById(req, res) {
    try {
      const { courseId } = req.params;
      const course = await Course.findById(courseId);
      res.json({ course });
    } catch (error) {
      if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async createCourse(req, res) {
    try {
      const {
        title, description, category, price, thumbnail_url,
        instructor, rating, reviews_count, original_price, duration, level,
        students_count, detailed_description, what_you_learn, topics, requirements, faqs
      } = req.body;

      const courseData = {
        title, description, category, price: parseFloat(price), thumbnail_url,
        instructor, rating: rating ? parseFloat(rating) : 0, reviews_count: reviews_count ? parseInt(reviews_count) : 0,
        original_price: original_price ? parseFloat(original_price) : null,
        duration, level, students_count: students_count ? parseInt(students_count) : 0,
        detailed_description, what_you_learn, topics, requirements, faqs
      };

      const course = await Course.create(courseData);

      res.status(201).json({ message: "تم إنشاء الكورس بنجاح", course });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const courseDataToUpdate = { ...req.body };

      if (courseDataToUpdate.price !== undefined) {
        courseDataToUpdate.price = parseFloat(courseDataToUpdate.price);
      }
      if (courseDataToUpdate.original_price !== undefined) {
          courseDataToUpdate.original_price = parseFloat(courseDataToUpdate.original_price);
      }

      const updatedCourse = await Course.update(courseId, courseDataToUpdate);

      res.json({ message: "تم تحديث الكورس بنجاح", course: updatedCourse });
    } catch (error) {
       if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCourse(req, res) {
    try {
      const { courseId } = req.params;
      const result = await Course.delete(courseId);

      res.json(result);
    } catch (error) {
       if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async getCourseLessons(req, res) {
    try {
      const { courseId } = req.params;
      const user = req.user;

      await Course.findById(courseId);

      const lessons = await Lesson.getByCourseId(courseId, user);
      res.json({ lessons });

    } catch (error) {
        if (error.message === "الكورس غير موجود") {
            return res.status(404).json({ error: error.message });
        }
      res.status(500).json({ error: error.message });
    }
  }

   static async getLessonById(req, res) {
    try {
        const { lessonId } = req.params;
        const user = req.user;

        const lesson = await Lesson.checkAccess(user, lessonId);
        res.json({ lesson });
    } catch (error) {
        const statusCode = error.message.includes("التسجيل في الكورس") || error.message.includes("تسجيل الدخول") ? 403 : (error.message.includes("غير موجود") ? 404 : 500);
        res.status(statusCode).json({ error: error.message });
    }
  }

  static async addLessonToCourse(req, res) {
    try {
      const { courseId } = req.params;
      const { title, description, video_url, duration, order_index } = req.body;

      if (!title || !video_url) {
         return res.status(400).json({ error: 'عنوان الدرس ورابط الفيديو مطلوبان' });
      }

      const newLesson = await Lesson.create({
        course_id: parseInt(courseId),
        title,
        description,
        video_url: video_url,
        duration,
        order_index
      });

      res.status(201).json({ message: "تمت إضافة الدرس بنجاح", lesson: newLesson });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const lessonDataToUpdate = { ...req.body };

      const updatedLesson = await Lesson.update(lessonId, lessonDataToUpdate);

      res.json({ message: "تم تحديث الدرس بنجاح", lesson: updatedLesson });
    } catch (error) {
       if (error.message === "الدرس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

   static async deleteLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const result = await Lesson.delete(lessonId);
      res.json(result);
    } catch (error) {
       if (error.message === "الدرس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

   static async searchCourses(req, res) {
    try {
      const { q, category, limit } = req.query;

      if (!q) {
        return res.status(400).json({ error: "كلمة البحث مطلوبة" });
      }

      const filters = {};
      if (category) filters.category = category;
      if (limit) filters.limit = parseInt(limit);

      const courses = await Course.search(q, filters);
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCourseStats(req, res) {
    try {
      const stats = await Course.getStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTopSellingCourses(req, res) {
    try {
      const { limit = 10 } = req.query;
      const courses = await Course.getTopSelling(parseInt(limit));
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAdminCourseLessons(req, res) {
    try {
      const { courseId } = req.params;
      const lessons = await Lesson.getByCourseId(courseId, { role: 'admin' });
      res.json({ lessons });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CourseController;