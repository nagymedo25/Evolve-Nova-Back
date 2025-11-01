

const { db } = require("../config/db");

class Review {
  static async create(data) {
    const { user_id, course_id, rating, comment } = data;
    const sql = `
      INSERT INTO Reviews (user_id, course_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(sql, [user_id, course_id, rating, comment]);
    return result.rows[0];
  }

  static async findByCourseId(courseId) {
    const sql = `
      SELECT r.*, u.name as user_name
      FROM Reviews r
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.course_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await db.query(sql, [courseId]);
    return result.rows;
  }

  static async findByUserAndCourse(userId, courseId) {
    const sql = `
      SELECT * FROM Reviews 
      WHERE user_id = $1 AND course_id = $2
    `;
    const result = await db.query(sql, [userId, courseId]);
    return result.rows[0];
  }

  static async delete(reviewId) {
    const result = await db.query("DELETE FROM Reviews WHERE review_id = $1", [reviewId]);
    if (result.rowCount === 0) {
      throw new Error("التقييم غير موجود");
    }
    return { message: "تم حذف التقييم بنجاح" };
  }
}

module.exports = Review;