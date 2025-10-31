const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
// لا حاجة لـ Google Drive

class CourseController {
  // جلب جميع الكورسات (عام)
  static async getAllCourses(req, res) {
    try {
      // استقبال الفلاتر الجديدة category و searchTerm
      const { category, searchTerm, min_price, max_price, limit, offset } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (searchTerm) filters.searchTerm = searchTerm; // فلتر البحث
      if (min_price) filters.min_price = parseFloat(min_price);
      if (max_price) filters.max_price = parseFloat(max_price);
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      // استخدام دالة getAll المحدثة في Course model
      const courses = await Course.getAll(filters);
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // جلب كورس معين بالـ ID (عام)
  static async getCourseById(req, res) {
    try {
      const { courseId } = req.params;
      const course = await Course.findById(courseId); // findById المحدثة
      res.json({ course });
    } catch (error) {
      // إذا كان الخطأ "الكورس غير موجود"، أرجع 404
      if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  // تم إزالة getAvailableCourses

  // إنشاء كورس جديد (للأدمن)
  static async createCourse(req, res) {
    try {
      // استقبال جميع الحقول الجديدة المطلوبة
      const {
        title, description, category, price, thumbnail_url, preview_url,
        instructor, rating, reviews_count, original_price, duration, level,
        students_count, detailed_description, what_you_learn, topics, requirements, faqs
      } = req.body;

      // يمكن إضافة تحقق إضافي هنا إذا لزم الأمر

      const courseData = {
        title, description, category, price: parseFloat(price), thumbnail_url, preview_url,
        instructor, rating: rating ? parseFloat(rating) : 0, reviews_count: reviews_count ? parseInt(reviews_count) : 0,
        original_price: original_price ? parseFloat(original_price) : null,
        duration, level, students_count: students_count ? parseInt(students_count) : 0,
        detailed_description, what_you_learn, topics, requirements, faqs
      };

      const course = await Course.create(courseData); // create المحدثة

      res.status(201).json({ message: "تم إنشاء الكورس بنجاح", course });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // تحديث كورس (للأدمن)
  static async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const courseDataToUpdate = { ...req.body }; // استقبال جميع الحقول الممكنة

      // تحويل السعر إذا تم إرساله
      if (courseDataToUpdate.price !== undefined) {
        courseDataToUpdate.price = parseFloat(courseDataToUpdate.price);
      }
      if (courseDataToUpdate.original_price !== undefined) {
          courseDataToUpdate.original_price = parseFloat(courseDataToUpdate.original_price);
      }
      // يمكن إضافة تحويلات أخرى للحقول الرقمية مثل rating, reviews_count, students_count

      const updatedCourse = await Course.update(courseId, courseDataToUpdate); // update المحدثة

      res.json({ message: "تم تحديث الكورس بنجاح", course: updatedCourse });
    } catch (error) {
       if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  // حذف كورس (للأدمن)
  static async deleteCourse(req, res) {
    try {
      const { courseId } = req.params;
      // لا حاجة لحذف الدروس والتسجيلات يدوياً بسبب ON DELETE CASCADE
      const result = await Course.delete(courseId); // delete المحدثة

      res.json(result);
    } catch (error) {
       if (error.message === "الكورس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  // جلب دروس كورس معين (للطلاب المسجلين والأدمن)
  static async getCourseLessons(req, res) {
    try {
      const { courseId } = req.params;
      const user = req.user; // يأتي من authMiddleware

      // التحقق من وجود الكورس أولاً
      await Course.findById(courseId); // سيرمي خطأ إذا لم يكن الكورس موجوداً

      // getByCourseId المحدثة تتعامل مع صلاحيات الوصول
      const lessons = await Lesson.getByCourseId(courseId, user);
      res.json({ lessons });

    } catch (error) {
        if (error.message === "الكورس غير موجود") {
            return res.status(404).json({ error: error.message });
        }
      res.status(500).json({ error: error.message });
    }
  }

   // جلب درس معين بالـ ID (للطلاب المسجلين والأدمن)
   static async getLessonById(req, res) {
    try {
        const { lessonId } = req.params; // عادةً ما يكون lessonId في المسار
        // const { courseId } = req.params; // قد لا نحتاج courseId هنا
        const user = req.user; // يأتي من authMiddleware

        // checkAccess المحدثة تتحقق من المعاينة أو التسجيل أو دور الأدمن
        const lesson = await Lesson.checkAccess(user, lessonId);
        res.json({ lesson });
    } catch (error) {
        // checkAccess تُرجع خطأ 403 أو 404 مناسب
        const statusCode = error.message.includes("التسجيل في الكورس") || error.message.includes("تسجيل الدخول") ? 403 : (error.message.includes("غير موجود") ? 404 : 500);
        res.status(statusCode).json({ error: error.message });
    }
  }


  // إضافة درس جديد لكورس (للأدمن)
  static async addLessonToCourse(req, res) {
    try {
      const { courseId } = req.params;
      // استقبال duration مع باقي البيانات
      const { title, description, video_url, duration, is_preview, order_index } = req.body;

      // تحقق أساسي من البيانات المطلوبة
      if (!title || !video_url) {
         return res.status(400).json({ error: 'عنوان الدرس ورابط الفيديو مطلوبان' });
      }

      const newLesson = await Lesson.create({
        course_id: parseInt(courseId),
        title,
        description,
        video_url: video_url,
        duration, // إضافة duration
        is_preview,
        order_index
      });

      res.status(201).json({ message: "تمت إضافة الدرس بنجاح", lesson: newLesson });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // تحديث درس (للأدمن)
  static async updateLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const lessonDataToUpdate = { ...req.body }; // استقبال جميع الحقول الممكنة بما فيها duration

      const updatedLesson = await Lesson.update(lessonId, lessonDataToUpdate); // update المحدثة

      res.json({ message: "تم تحديث الدرس بنجاح", lesson: updatedLesson });
    } catch (error) {
       if (error.message === "الدرس غير موجود") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

   // حذف درس معين (للأدمن)
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


  // جلب درس المعاينة (عام)
  static async getPreviewLesson(req, res) {
    try {
      const { courseId } = req.params;
      const lesson = await Lesson.getPreviewLesson(courseId); // getPreviewLesson المحدثة

      if (!lesson) {
        return res
          .status(404)
          .json({ error: "لا يوجد درس معاينة لهذا الكورس" });
      }

      res.json({ lesson });
    } catch (error) {
        // قد يكون الكورس نفسه غير موجود
        if (error.message.includes("الكورس غير موجود")) {
             return res.status(404).json({ error: error.message });
        }
      res.status(500).json({ error: error.message });
    }
  }


  // --- الدوال الأخرى مثل searchCourses, getCourseStats, getTopSellingCourses تبقى كما هي ---
   static async searchCourses(req, res) {
    try {
      const { q, category, limit } = req.query; // إزالة college_type

      if (!q) {
        return res.status(400).json({ error: "كلمة البحث مطلوبة" });
      }

      const filters = {};
      if (category) filters.category = category;
      if (limit) filters.limit = parseInt(limit);

      const courses = await Course.search(q, filters); // search المحدثة
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCourseStats(req, res) {
    try {
      const stats = await Course.getStats(); // getStats المحدثة
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTopSellingCourses(req, res) {
    try {
      const { limit = 10 } = req.query;
      const courses = await Course.getTopSelling(parseInt(limit)); // getTopSelling تبقى كما هي
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // دالة إضافية لجلب دروس الكورس للأدمن فقط (بدون فحص التسجيل)
  static async getAdminCourseLessons(req, res) {
    try {
      const { courseId } = req.params;
      // استدعاء getByCourseId بدون تمرير المستخدم
      const lessons = await Lesson.getByCourseId(courseId, null); // تمرير null أو عدم تمرير الوسيط الثاني
       // أو يمكن إنشاء دالة مخصصة في Model إذا أردنا سلوكاً مختلفاً تماماً للأدمن
       // const lessons = await Lesson.getAllByCourseIdForAdmin(courseId);
      res.json({ lessons });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }


}

module.exports = CourseController;