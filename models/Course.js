const { db } = require("../config/db");

class Course {
  static async create(courseData) {
    const {
      title, description, category, price, thumbnail_url,
      instructor, rating, reviews_count, original_price, duration, level,
      students_count, detailed_description, what_you_learn, topics, requirements, faqs
    } = courseData;

    const whatYouLearnArray = Array.isArray(what_you_learn) ? what_you_learn : [];
    const topicsArray = Array.isArray(topics) ? topics : [];
    const requirementsArray = Array.isArray(requirements) ? requirements : [];
    const faqsJson = faqs ? JSON.stringify(faqs) : null;

    const sql = `
      INSERT INTO Courses (
          title, description, category, price, thumbnail_url,
          instructor, rating, reviews_count, original_price, duration, level,
          students_count, detailed_description, what_you_learn, topics, requirements, faqs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    const result = await db.query(sql, [
      title, description, category, price, thumbnail_url,
      instructor, rating || 0, reviews_count || 0, original_price, duration, level,
      students_count || 0, detailed_description, whatYouLearnArray, topicsArray, requirementsArray, faqsJson
    ]);
    return result.rows[0];
  }

  static async findById(courseId) {
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
    const course = result.rows[0];
    if (course.faqs && typeof course.faqs === 'string') {
        try {
            course.faqs = JSON.parse(course.faqs);
        } catch (e) {
            console.error(`Error parsing FAQs for course ${courseId}:`, e);
            course.faqs = [];
        }
    } else if (!course.faqs) {
        course.faqs = [];
    }
    return course;
  }

  static async getAll(filters = {}) {
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

    if (filters.category && filters.category !== 'الكل') {
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

  static async update(courseId, courseData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'category', 'price', 'thumbnail_url',
      'instructor', 'rating', 'reviews_count', 'original_price', 'duration', 'level',
      'students_count', 'detailed_description', 'what_you_learn', 'topics', 'requirements', 'faqs'
    ];

    for (const key of allowedFields) {
        if (courseData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
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
      return this.findById(courseId);
    }

    values.push(courseId);
    const sql = `UPDATE Courses SET ${updates.join(", ")} WHERE course_id = $${paramIndex} RETURNING course_id`;
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الكورس غير موجود");
    }
    return this.findById(result.rows[0].course_id);
  }

  static async delete(courseId) {
    const result = await db.query("DELETE FROM Courses WHERE course_id = $1", [courseId]);
    if (result.rowCount === 0) {
        throw new Error("الكورس غير موجود");
    }
    return { message: "تم حذف الكورس وجميع بياناته المرتبطة بنجاح" };
  }

  static async search(query, filters = {}) {
    let sql = `
      SELECT
          course_id, title, description, category, price, thumbnail_url,
          instructor, rating, reviews_count, original_price, duration, level, students_count,
          (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
      FROM Courses c
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1 OR c.instructor ILIKE $1)
    `;
    const params = [`%${query}%`];
    let paramIndex = 2;

    if (filters.category && filters.category !== 'الكل') {
      sql += ` AND c.category = $${paramIndex++}`;
      params.push(filters.category);
    }

    sql += " ORDER BY c.created_at DESC";

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getStats() {
    const sql = `
      SELECT
          COUNT(*) as total_courses,
          SUM(price) as total_value,
          AVG(price) as average_price
      FROM Courses
    `;
    const result = await db.query(sql);
    return result.rows[0];
  }

static async getTopSelling(limit = 10) {
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

  static async recalculateRating(courseId) {
    try {
      const statsSql = `
        SELECT 
          COUNT(*) as reviews_count, 
          AVG(rating) as average_rating 
        FROM Reviews 
        WHERE course_id = $1
      `;
      const statsResult = await db.query(statsSql, [courseId]);
      
      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        const newRating = stats.average_rating ? parseFloat(stats.average_rating) : 0;
        const newReviewsCount = stats.reviews_count ? parseInt(stats.reviews_count) : 0;

        const updateSql = `
          UPDATE Courses 
          SET 
            rating = $1, 
            reviews_count = $2 
          WHERE course_id = $3
        `;
        await db.query(updateSql, [newRating, newReviewsCount, courseId]);
        
        return { rating: newRating, reviews_count: newReviewsCount };
      }
    } catch (error) {
      console.error(`Error recalculating rating for course ${courseId}:`, error);
      throw error;
    }
  }
}

module.exports = Course;