// --- تهيئة التطبيق ---
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
const app = express();

// --- استيراد الحزم الأساسية ---
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- استيراد المكونات المخصصة ---
const { initializeDatabase } = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// --- استيراد المسارات (Routes) ---
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
// const messageRoutes = require('./routes/messageRoutes'); // إزالة استيراد مسارات الرسائل


const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5001', // أو العنوان الذي يستخدمه Vite
  credentials: true, // السماح بإرسال الكوكيز
};
app.use(cors(corsOptions));

// إعدادات Helmet (تبقى كما هي للسماح بصور Cloudinary)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "res.cloudinary.com"], // السماح بالصور من Cloudinary
        // قد تحتاج لإضافة connect-src للسماح بطلبات API إذا لزم الأمر
        // "connect-src": ["'self'", process.env.FRONTEND_URL || 'http://localhost:5000']
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // مهم لـ Cloudinary
  })
);


app.use(express.json()); // لتحليل JSON bodies
app.use(express.urlencoded({ extended: true })); // لتحليل URL-encoded bodies
app.use(cookieParser()); // لتحليل الكوكيز

// تحديد معدل الطلبات
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // دقيقة واحدة
  max: 150, // عدد الطلبات المسموح به لكل IP في الدقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جدًا من هذا الـ IP، يرجى المحاولة مرة أخرى بعد دقيقة واحدة' },
});
app.use('/api/', apiLimiter); // تطبيق المحدد على جميع مسارات API

// --- مسارات الـ API الرئيسية ---
app.use('/api/auth', authRoutes); // مسارات المصادقة
app.use('/api/courses', courseRoutes); // مسارات الكورسات
app.use('/api/payments', paymentRoutes); // مسارات المدفوعات
app.use('/api/admin', adminRoutes); // مسارات الأدمن
app.use('/api/notifications', notificationRoutes); // مسارات الإشعارات
// app.use('/api/messages', messageRoutes); // إزالة استخدام مسارات الرسائل

// مسار افتراضي للـ root
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Evolve/Nova API', // تحديث الرسالة
    status: 'Running successfully',
    version: '1.0.0-simplified'
  });
});

// --- معالجة الأخطاء (Error Handling) ---
// Middleware لمعالجة المسارات غير الموجودة (404)
app.use((req, res, next) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

// Middleware لمعالجة الأخطاء العامة (يجب أن يكون الأخير)
app.use(errorHandler);

// --- تشغيل الخادم ---
const PORT = process.env.PORT || 5000; // يمكن تغيير البورت الافتراضي إذا كان 5000 مستخدماً للفرونت

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    // التأكد من تهيئة قاعدة البيانات عند بدء التشغيل
    await initializeDatabase();
    console.log('Database initialization completed (or skipped if already done).');
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1); // إيقاف الخادم إذا فشلت تهيئة قاعدة البيانات
  }
});