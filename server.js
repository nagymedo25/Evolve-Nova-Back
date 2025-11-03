
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
const app = express();

const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initializeDatabase } = require('./config/db');
const errorHandler = require('./utils/errorHandler');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');



const corsOptions = {
  origin: ['https://evolve-nova.vercel.app', 'http://localhost:5001'], 
  credentials: true, 
};
app.use(cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "res.cloudinary.com"], 


      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, 
  })
);


app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser()); 

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 150, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جدًا من هذا الـ IP، يرجى المحاولة مرة أخرى بعد دقيقة واحدة' },
});
app.use('/api/', apiLimiter); 

app.use('/api/auth', authRoutes); 
app.use('/api/courses', courseRoutes); 
app.use('/api/payments', paymentRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/notifications', notificationRoutes); 


app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Evolve/Nova API', 
    status: 'Running successfully',
    version: '1.0.0-simplified'
  });
});


app.use((req, res, next) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000; 

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {

    await initializeDatabase();
    console.log('Database initialization completed (or skipped if already done).');
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1); 
  }
});
