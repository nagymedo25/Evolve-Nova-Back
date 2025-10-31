const { db } = require("../config/db");

class Payment {
  static async create(paymentData) {
    const {
      user_id, course_id, amount, method, screenshot_url, screenshot_public_id
    } = paymentData;
    const sql = `
      INSERT INTO Payments (user_id, course_id, amount, method, screenshot_url, screenshot_public_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    const result = await db.query(sql, [
      user_id, course_id, amount, method, screenshot_url, screenshot_public_id
    ]);
    return result.rows[0];
  }

  static async findById(paymentId) {
    const sql = "SELECT * FROM Payments WHERE payment_id = $1";
    const result = await db.query(sql, [paymentId]);
    if (result.rows.length === 0) {
      throw new Error("بيانات الدفع غير موجودة");
    }
    return result.rows[0];
  }

  static async findByUserId(userId) {
     const sql = `
      SELECT p.*, c.title as course_title, c.thumbnail_url as course_thumbnail
      FROM Payments p
      JOIN Courses c ON p.course_id = c.course_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  }

  static async findPending() {
    const sql = `
      SELECT 
          p.payment_id, p.amount, p.method, p.screenshot_url, p.created_at,
          u.name as user_name, u.email as user_email,
          c.title as course_title
      FROM Payments p
      JOIN Users u ON p.user_id = u.user_id
      JOIN Courses c ON p.course_id = c.course_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `;
    const result = await db.query(sql);
    return result.rows;
  }

  static async updateStatus(paymentId, status) {
    const sql = "UPDATE Payments SET status = $1 WHERE payment_id = $2 RETURNING *";
    const result = await db.query(sql, [status, paymentId]);
    if (result.rows.length === 0) {
      throw new Error("بيانات الدفع غير موجودة");
    }
    return result.rows[0];
  }

  static async getStats() {
    const sql = `
      SELECT
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_revenue,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM Payments
    `;
    const result = await db.query(sql);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT 
          p.payment_id, p.amount, p.method, p.screenshot_url, p.created_at, p.status,
          u.name as user_name, u.email as user_email,
          c.title as course_title
      FROM Payments p
      JOIN Users u ON p.user_id = u.user_id
      JOIN Courses c ON p.course_id = c.course_id
    `;

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClauses.push(`p.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.user_id) {
      whereClauses.push(`p.user_id = $${paramIndex++}`);
      params.push(filters.user_id);
    }
     if (filters.course_id) {
      whereClauses.push(`p.course_id = $${paramIndex++}`);
      params.push(filters.course_id);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY p.created_at DESC";

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

   static async delete(paymentId) {
    const result = await db.query("DELETE FROM Payments WHERE payment_id = $1", [paymentId]);
    if (result.rowCount === 0) {
        throw new Error("بيانات الدفع غير موجودة");
    }
    return { message: "تم حذف سجل الدفع بنجاح" };
  }

  static async resetAllPayments() {
    const result = await db.query("DELETE FROM Payments");
    return { deleted_count: result.rowCount };
  }

}

module.exports = Payment;