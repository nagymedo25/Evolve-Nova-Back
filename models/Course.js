const { db } = require("../config/db");

class Course {
  static async create(courseData) {
    // استقبال جميع الحقول الجديدة
    const {
      title, description, category, price, thumbnail_url, preview_url,
      instructor, rating, reviews_count, original_price, duration, level,
      students_count, detailed_description, what_you_learn, topics, requirements, faqs
    } = courseData;

    // تحويل المصفوفات الفارغة أو غير المعرفة إلى مصفوفات PostgreSQL فارغة
    const whatYouLearnArray = Array.isArray(what_you_learn) ? what_you_learn : [];
    const topicsArray = Array.isArray(topics) ? topics : [];
    const requirementsArray = Array.isArray(requirements) ? requirements : [];
    // تحويل faqs إلى JSON string أو null
    const faqsJson = faqs ? JSON.stringify(faqs) : null;

    const sql = `
      INSERT INTO Courses (
          title, description, category, price, thumbnail_url, preview_url,
          instructor, rating, reviews_count, original_price, duration, level,
          students_count, detailed_description, what_you_learn, topics, requirements, faqs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    const result = await db.query(sql, [
      title, description, category, price, thumbnail_url, preview_url,
      instructor, rating || 0, reviews_count || 0, original_price, duration, level,
      students_count || 0, detailed_description, whatYouLearnArray, topicsArray, requirementsArray, faqsJson
    ]);
    return result.rows[0];
  }

  static async findById(courseId) {
    // جلب جميع الحقول الجديدة
    const sql = `
        SELECT c.*,
               (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
        FROM Courses c
        WHERE c.course_id = $1
      `;
    const result = await db.query(sql, [courseId]);
    if (result.rows.length === 0) {
      throw new Error("الكورس غير موجود");
    }
    // تحويل faqs من JSON string مرة أخرى إلى كائن/مصفوفة
    const course = result.rows[0];
    if (course.faqs && typeof course.faqs === 'string') {
        try {
            course.faqs = JSON.parse(course.faqs);
        } catch (e) {
            console.error(`Error parsing FAQs for course ${courseId}:`, e);
            course.faqs = []; // أو null حسب التفضيل
        }
    } else if (!course.faqs) {
        course.faqs = []; // تأكد من أنها مصفوفة فارغة إذا كانت null
    }
    return course;
  }

  static async getAll(filters = {}) {
    // جلب الحقول الأساسية المطلوبة للعرض في قائمة الكورسات
    // يمكن إضافة الحقول الأخرى إذا لزم الأمر
    let sql = `
      SELECT
          course_id, title, description, category, price, thumbnail_url,
          instructor, rating, reviews_count, original_price, duration, level, students_count,
          (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
      FROM Courses c
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // إزالة الفلاتر القديمة (college_type, pharmacy_type)
    if (filters.category && filters.category !== 'الكل') { // إضافة تحقق من 'الكل'
      sql += ` AND c.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters.min_price !== undefined) {
      sql += ` AND c.price >= $${paramIndex++}`;
      params.push(filters.min_price);
    }
    if (filters.max_price !== undefined) {
      sql += ` AND c.price <= $${paramIndex++}`;
      params.push(filters.max_price);
    }
     // إضافة فلتر للبحث بالعنوان أو المدرب
     if (filters.searchTerm) {
      sql += ` AND (c.title ILIKE $${paramIndex} OR c.instructor ILIKE $${paramIndex})`;
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }


    sql += " ORDER BY c.created_at DESC";

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(sql, params);
    return result.rows;
  }

  // تم إزالة getAvailableForUser لأن منطقها القديم لم يعد صالحاً

  static async update(courseId, courseData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // قائمة بجميع الحقول القابلة للتحديث
    const allowedFields = [
      'title', 'description', 'category', 'price', 'thumbnail_url', 'preview_url',
      'instructor', 'rating', 'reviews_count', 'original_price', 'duration', 'level',
      'students_count', 'detailed_description', 'what_you_learn', 'topics', 'requirements', 'faqs'
    ];

    for (const key of allowedFields) {
        if (courseData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
            // معالجة خاصة للمصفوفات و JSON
            if (['what_you_learn', 'topics', 'requirements'].includes(key)) {
                values.push(Array.isArray(courseData[key]) ? courseData[key] : []);
            } else if (key === 'faqs') {
                values.push(courseData[key] ? JSON.stringify(courseData[key]) : null);
            } else {
                values.push(courseData[key]);
            }
        }
    }


    if (updates.length === 0) {
      // إرجاع البيانات الحالية إذا لم يكن هناك شيء لتحديثه لتجنب الخطأ
      return this.findById(courseId);
      // throw new Error("لا توجد بيانات لتحديثها"); // يمكن استخدام هذا بدلاً من ذلك
    }


    values.push(courseId);
    const sql = `UPDATE Courses SET ${updates.join(", ")} WHERE course_id = $${paramIndex} RETURNING course_id`; // إرجاع course_id يكفي
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الكورس غير موجود");
    }
    return this.findById(result.rows[0].course_id); // جلب البيانات المحدثة كاملة
  }

  static async delete(courseId) {
    // الحذف سيشمل الدروس والمدفوعات والتسجيلات المرتبطة بسبب ON DELETE CASCADE
    const result = await db.query("DELETE FROM Courses WHERE course_id = $1", [courseId]);
    if (result.rowCount === 0) {
        throw new Error("الكورس غير موجود");
    }
    return { message: "تم حذف الكورس وجميع بياناته المرتبطة بنجاح" };
  }

  // search, getStats, getTopSelling تبقى كما هي مبدئياً، قد تحتاج لتعديل SELECT لاحقاً
  static async search(query, filters = {}) {
    let sql = `
      SELECT
          course_id, title, description, category, price, thumbnail_url,
          instructor, rating, reviews_count, original_price, duration, level, students_count,
          (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
      FROM Courses c
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1 OR c.instructor ILIKE $1) -- البحث في اسم المدرب أيضاً
    `;
    const params = [`%${query}%`];
    let paramIndex = 2;

    if (filters.category && filters.category !== 'الكل') {
      sql += ` AND c.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    // إزالة الفلاتر القديمة

    sql += " ORDER BY c.created_at DESC";

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getStats() {
    // يمكن تبسيطها أو تعديلها لاحقاً
    const sql = `
      SELECT
          COUNT(*) as total_courses,
          SUM(price) as total_value,
          AVG(price) as average_price
          -- إزالة الإحصائيات الخاصة بـ pharmacy/dentistry/male/female
      FROM Courses
    `;
    const result = await db.query(sql);
    return result.rows[0];
  }

  static async getTopSelling(limit = 10) {
    // هذه الدالة تعتمد على جدول Enrollments، وهو ما زال موجوداً
    const sql = `
      SELECT c.course_id, c.title, c.thumbnail_url, c.price, c.instructor, c.rating,
             COUNT(e.enrollment_id) as enrollment_count
      FROM Courses c
      LEFT JOIN Enrollments e ON c.course_id = e.course_id AND e.status = 'active'
      GROUP BY c.course_id
      ORDER BY enrollment_count DESC
      LIMIT $1
    `;
    const result = await db.query(sql, [limit]);
    return result.rows;
  }
}

module.exports = Course;