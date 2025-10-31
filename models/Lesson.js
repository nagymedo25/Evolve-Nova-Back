const { db } = require("../config/db");

class Lesson {
  static async create(lessonData) {
    const {
      course_id, title, description, video_url, duration, // إضافة duration هنا
      is_preview = false, order_index = 0,
    } = lessonData;
    const sql = `
      INSERT INTO Lessons (course_id, title, description, video_url, is_preview, order_index, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await db.query(sql, [course_id, title, description, video_url, is_preview, order_index, duration]); // إضافة duration هنا
    return result.rows[0];
  }

  static async findById(lessonId) {
    // جلب duration مع باقي البيانات
    const sql = `
      SELECT l.*, c.title as course_title, c.category as course_category
      FROM Lessons l
      JOIN Courses c ON l.course_id = c.course_id
      WHERE l.lesson_id = $1
    `;
    const result = await db.query(sql, [lessonId]);
    if (result.rows.length === 0) {
      throw new Error("الدرس غير موجود");
    }
    return result.rows[0];
  }

  // تعديل بسيط لإزالة الاعتماد على user.college/gender غير الموجودة
   static async getByCourseId(courseId, user = null) {
      // التحقق من حالة التسجيل للمستخدم الحالي إذا تم تمريره
      const sql = `
          SELECT l.*,
                 CASE
                     WHEN l.is_preview = true THEN true -- دروس المعاينة متاحة دائماً
                     WHEN $1::integer IS NOT NULL THEN -- إذا كان هناك مستخدم مسجل دخوله
                         EXISTS (
                             SELECT 1 FROM Enrollments e
                             WHERE e.user_id = $1 AND e.course_id = l.course_id AND e.status = 'active'
                         )
                     ELSE false -- غير متاح للزوار (ما عدا المعاينة)
                 END as is_accessible
          FROM Lessons l
          WHERE l.course_id = $2
          ORDER BY l.order_index ASC, l.lesson_id ASC
      `;
      const params = [user ? user.user_id : null, courseId];
      const result = await db.query(sql, params);

      // فلترة النتائج في الكود لإخفاء الدروس غير المتاحة للزوار تماماً
       if (!user) {
            return result.rows.filter(lesson => lesson.is_preview);
       }

       // إذا كان المستخدم مسجل دخوله، الأدمن يرى كل شيء، الطالب يرى المتاح له
        if (user.role === 'admin') {
            // الأدمن يرى is_accessible لكنه يحصل على جميع الدروس
            return result.rows;
       } else {
           // الطالب المسجل يرى فقط الدروس التي يمكنه الوصول إليها (المعاينة + المسجل فيها)
           const enrollment = await db.query(
                'SELECT 1 FROM Enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
                [user.user_id, courseId, 'active']
            );
            if (enrollment.rowCount > 0) {
                return result.rows; // الطالب مسجل، يرى كل شيء
            } else {
                 return result.rows.filter(lesson => lesson.is_preview); // الطالب غير مسجل، يرى المعاينة فقط
            }
       }
  }


  static async getPreviewLesson(courseId) {
    // جلب duration
    const sql = `
      SELECT l.*, c.title as course_title
      FROM Lessons l
      JOIN Courses c ON l.course_id = c.course_id
      WHERE l.course_id = $1 AND l.is_preview = true
      ORDER BY l.order_index ASC
      LIMIT 1
    `;
    const result = await db.query(sql, [courseId]);
    return result.rows[0];
  }

  static async update(lessonId, lessonData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // إضافة duration للحقول القابلة للتحديث
    for (const key of ['title', 'description', 'video_url', 'is_preview', 'order_index', 'duration']) {
        if (lessonData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
            values.push(lessonData[key]);
        }
    }

    if (updates.length === 0) {
        return this.findById(lessonId); // إرجاع البيانات الحالية
    //   throw new Error("لا توجد بيانات لتحديثها");
    }

    values.push(lessonId);
    const sql = `UPDATE Lessons SET ${updates.join(", ")} WHERE lesson_id = $${paramIndex} RETURNING lesson_id`;
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الدرس غير موجود");
    }
    return this.findById(result.rows[0].lesson_id);
  }

  static async delete(lessonId) {
    const result = await db.query("DELETE FROM Lessons WHERE lesson_id = $1", [lessonId]);
    if (result.rowCount === 0) {
      throw new Error("الدرس غير موجود");
    }
    return { message: "تم حذف الدرس بنجاح" };
  }

  static async deleteByCourseId(courseId) {
    const result = await db.query("DELETE FROM Lessons WHERE course_id = $1", [courseId]);
    return { message: `تم حذف ${result.rowCount} درس بنجاح للكورس ${courseId}`, deletedCount: result.rowCount };
  }

  // التحقق من الوصول المبسط
  static async checkAccess(user, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("الدرس غير موجود");

    if (lesson.is_preview) {
      return lesson; // دروس المعاينة متاحة للجميع
    }

    // إذا لم يكن درس معاينة، يجب أن يكون المستخدم مسجلاً دخوله
    if (!user) {
        throw new Error("يجب تسجيل الدخول لمشاهدة هذا الدرس");
    }

    // الأدمن يمكنه الوصول لكل شيء
    if (user.role === 'admin') {
        return lesson;
    }

    // التحقق من تسجيل الطالب في الكورس
    const result = await db.query(
      'SELECT 1 FROM Enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [user.user_id, lesson.course_id, "active"]
    );
    if (result.rowCount === 0) {
      throw new Error("يجب التسجيل في الكورس لمشاهدة هذا الدرس");
    }
    return lesson;
  }
}

module.exports = Lesson;