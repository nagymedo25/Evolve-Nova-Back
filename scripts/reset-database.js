

const dotenv = require('dotenv');
const { db, initializeDatabase } = require('../config/db'); 

dotenv.config();


const resetDatabase = async () => {
  const client = await db.connect();
  console.log('⚠️  تحذير: أنت على وشك حذف جميع الجداول وإعادة بنائها.');
  console.log('⏳  بدء عملية إعادة البناء الكاملة...');

  try {

    console.log('🗑️  جارٍ حذف جميع الجداول الحالية...');
    await client.query(`
        DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
    `);
    console.log('✅  تم حذف جميع الجداول بنجاح.');


    console.log('🏗️  جارٍ إعادة بناء الجداول وإنشاء حساب الأدمن...');
    await initializeDatabase(); 
    
    console.log('🎉  اكتملت عملية إعادة بناء قاعدة البيانات بنجاح!');

  } catch (error) {
    console.error('❌  فشلت عملية إعادة البناء.');
    console.error(error);
  } finally {
    client.release();
    db.end();
  }
};

resetDatabase();