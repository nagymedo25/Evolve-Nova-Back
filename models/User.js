const { db } = require("../config/db");
const { hashPassword, comparePassword } = require("../config/auth");
const { v4: uuidv4 } = require('uuid');

const createSafeUserData = (user) => {
  if (!user) return null;
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    status: user.status
  };
};

class User {
  static async create(userData) {
    const { name, email, password } = userData;
    const password_hash = await hashPassword(password);
    const sql = `
      INSERT INTO Users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING user_id
    `;
    try {
      const result = await db.query(sql, [name, email, password_hash]);
      return User.findById(result.rows[0].user_id);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error("البريد الإلكتروني مسجل بالفعل");
      }
      throw error;
    }
  }

  static async findById(userId) {
    const sql = "SELECT user_id, name, email, role, created_at, status FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    return createSafeUserData(result.rows[0]); 
  }

  static async findByEmail(email) {

    const sql = "SELECT * FROM Users WHERE email = $1";
    const result = await db.query(sql, [email]);
    return result.rows[0]; 
  }


  static async login(email, password) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    if (user.status === 'suspended') {
      throw new Error("هذا الحساب معلق.");
    }

    await this.deleteSession(user.user_id);
    const sessionToken = await this.createSession(user.user_id);

    return {
      status: 'success',
      message: 'تم تسجيل الدخول بنجاح',
      user: createSafeUserData(user),
      token: sessionToken, 
    };
  }

  static async createSession(userId) {
    const sessionToken = uuidv4();

    await db.query(
      'INSERT INTO ActiveSessions (user_id, session_token) VALUES ($1, $2)',
      [userId, sessionToken]
    );
    return sessionToken;
  }

  static async getActiveSessionByToken(sessionToken) {
    const result = await db.query('SELECT * FROM ActiveSessions WHERE session_token = $1', [sessionToken]);
    return result.rows[0];
  }

  static async deleteSession(userId) {

    await db.query('DELETE FROM ActiveSessions WHERE user_id = $1', [userId]);
  }

  static async deleteSessionByToken(sessionToken) {
      await db.query('DELETE FROM ActiveSessions WHERE session_token = $1', [sessionToken]);
  }



  static async update(userId, userData) {
    const { name, email, password } = userData;
    const updates = [];
    const values = [];
    let queryIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${queryIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${queryIndex++}`);
      values.push(email);
    }

    if (password) {
      const password_hash = await hashPassword(password);
      updates.push(`password_hash = $${queryIndex++}`);
      values.push(password_hash);
    }

    if (updates.length === 0) {

      const currentUserData = await this.findById(userId);
      if (!currentUserData) throw new Error("المستخدم غير موجود");
      return currentUserData; 
    }


    values.push(userId);
    const sql = `UPDATE Users SET ${updates.join(", ")} WHERE user_id = $${queryIndex} RETURNING user_id`;

    try {
      const result = await db.query(sql, values);
      if (result.rows.length === 0) {
        throw new Error("المستخدم غير موجود");
      }
      return User.findById(result.rows[0].user_id);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error("البريد الإلكتروني مسجل بالفعل");
      }
      throw error;
    }
  }

  static async updateStatus(userId, status) {
    if (!['active', 'suspended'].includes(status)) {
        throw new Error('الحالة غير صالحة.');
    }
    const sql = `UPDATE Users SET status = $1 WHERE user_id = $2 RETURNING user_id`;
    const result = await db.query(sql, [status, userId]);
    if (result.rowCount === 0) {
        throw new Error("المستخدم غير موجود");
    }

    if (status === 'suspended') {
        await this.deleteSession(userId);
    }
    return User.findById(result.rows[0].user_id);
  }

  static async getStats() {

    const sql = "SELECT COUNT(*) as total FROM Users WHERE role = 'student'";
    const result = await db.query(sql);
    return {
      total: parseInt(result.rows[0].total, 10)

    };
  }


  static async changePassword(userId, currentPassword, newPassword) {

    const userResult = await db.query("SELECT * FROM Users WHERE user_id = $1", [userId]);
    if (userResult.rows.length === 0) {
      throw new Error("المستخدم غير موجود");
    }
    const user = userResult.rows[0];

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    const newPasswordHash = await hashPassword(newPassword);
    const sql = "UPDATE Users SET password_hash = $1 WHERE user_id = $2";
    await db.query(sql, [newPasswordHash, userId]);

    await this.deleteSession(userId);
    return { message: "تم تغيير كلمة المرور بنجاح" };
  }

  static async delete(userId) {

    const sql = "DELETE FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    if (result.rowCount === 0) {
      throw new Error("المستخدم غير موجود");
    }
    return { message: "تم حذف المستخدم بنجاح" };
  }

  static async getAll(limit = 50, offset = 0) {

    const sql = `
        SELECT user_id, name, email, role, created_at, status
        FROM Users
        WHERE role = 'student'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        `;
    const result = await db.query(sql, [limit, offset]);
    return result.rows; 
  }

  static async getCount() {
    const sql = "SELECT COUNT(*) as total FROM Users WHERE role = 'student'";
    const result = await db.query(sql);
    return parseInt(result.rows[0].total, 10);
  }

  static async search(query, limit = 20) {

    const sql = `
        SELECT user_id, name, email, role, created_at, status
        FROM Users
        WHERE (name ILIKE $1 OR email ILIKE $1) AND role = 'student' -- إزالة البحث بالهاتف
        ORDER BY created_at DESC
        LIMIT $2
        `;
    const searchTerm = `%${query}%`;
    const result = await db.query(sql, [searchTerm, limit]);
    return result.rows;
  }
}

module.exports = User;