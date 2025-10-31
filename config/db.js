const { Pool } = require('pg');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`DROP TABLE IF EXISTS Users CASCADE`);
    await client.query(`
      CREATE TABLE Users (
          user_id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended'))
      )
    `);

    await client.query(`DROP TABLE IF EXISTS UserDevices CASCADE`);
    await client.query(`DROP TABLE IF EXISTS DeviceLoginRequests CASCADE`);
    await client.query(`DROP TABLE IF EXISTS Violations CASCADE`);

    await client.query(`DROP TABLE IF EXISTS ActiveSessions CASCADE`);
    await client.query(`
      CREATE TABLE ActiveSessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Courses CASCADE`);
    await client.query(`
      CREATE TABLE Courses (
          course_id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          price REAL NOT NULL,
          thumbnail_url TEXT,
          preview_url TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          instructor TEXT,
          rating REAL DEFAULT 0,
          reviews_count INTEGER DEFAULT 0,
          original_price REAL,
          duration TEXT,
          level TEXT,
          students_count INTEGER DEFAULT 0,
          detailed_description TEXT,
          what_you_learn TEXT[],
          topics TEXT[],
          requirements TEXT[],
          faqs JSONB
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Lessons CASCADE`);
    await client.query(`
      CREATE TABLE Lessons (
          lesson_id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          is_preview BOOLEAN DEFAULT FALSE,
          order_index INTEGER DEFAULT 0,
          duration TEXT
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Payments CASCADE`);
    await client.query(`
      CREATE TABLE Payments (
          payment_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          amount REAL NOT NULL,
          method TEXT NOT NULL CHECK(method IN ('vodafone_cash', 'instapay')),
          screenshot_url TEXT NOT NULL,
          screenshot_public_id TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Enrollments CASCADE`);
    await client.query(`
      CREATE TABLE Enrollments (
          enrollment_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          payment_id INTEGER REFERENCES Payments(payment_id) ON DELETE SET NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, course_id)
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Notifications CASCADE`);
    await client.query(`
      CREATE TABLE Notifications (
          notification_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`DROP TABLE IF EXISTS Messages CASCADE`);
    await client.query(`
      CREATE TABLE Messages (
          message_id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          message_content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE
      )
    `);

  } finally {
    client.release();
  }
};

const initializeDatabase = async () => {
  try {
    await createTables();
    console.log('Tables created/updated successfully');

    const bcrypt = require('bcrypt');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@evolve.com';
    const adminPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123', 10);

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO Users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        ['Admin User', adminEmail, adminPassword, 'admin']
      );
      console.log(`Admin user (${adminEmail}) ensured`);
    } finally {
      client.release();
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = {
  db: pool,
  initializeDatabase,
  generateSessionToken: () => uuidv4(),
};