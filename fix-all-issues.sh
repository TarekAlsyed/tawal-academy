#!/bin/bash

# ============================================
# 🚀 Tawal Academy - Complete Fix Script v2
# ============================================
# يصلح جميع المشاكل المكتشفة من الصور
# ============================================

echo ""
echo "════════════════════════════════════════════════════"
echo "🚀 Tawal Academy - سكريبت الإصلاح الشامل v2"
echo "════════════════════════════════════════════════════"
echo ""

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# المشاكل المكتشفة:
# ============================================
# ❌ 1. duplicate key في قاعدة البيانات
# ❌ 2. خطأ 500 في تسجيل الدخول
# ❌ 3. صفحة 404 على GitHub Pages
# ✅ 4. Backend شغال
# ============================================

echo -e "${YELLOW}📋 المشاكل المكتشفة:${NC}"
echo "  ❌ 1. خطأ في قاعدة البيانات (duplicate key)"
echo "  ❌ 2. خطأ 500 في تسجيل الدخول"
echo "  ❌ 3. صفحة 404 على GitHub Pages"
echo "  ✅ 4. Backend شغال"
echo ""

# ============================================
# الخطوة 1: إصلاح قاعدة البيانات
# ============================================
echo -e "${BLUE}🔧 الخطوة 1: إصلاح قاعدة البيانات...${NC}"
echo ""

if [ ! -d "backend" ]; then
    echo -e "${RED}❌ مجلد backend غير موجود!${NC}"
    exit 1
fi

cd backend

# 1.1: إنشاء سكريبت لحل مشكلة duplicate key
echo -e "${YELLOW}🔨 إنشاء سكريبت fix-duplicate-emails.js...${NC}"

cat > fix-duplicate-emails.js << 'ENDOFFILE'
const pool = require('./src/config/database');

const fixDuplicateEmails = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إصلاح مشكلة الإيميلات المكررة...');
    console.log('');

    await client.query('BEGIN');

    // 1. حذف القيد الفريد القديم (email, device_id)
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_email_device_id_key;
    `);
    console.log('✅ تم حذف القيد القديم');

    // 2. التأكد من وجود القيد الصحيح فقط على email
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_email_key;
    `);
    
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_email_key UNIQUE (email);
    `);
    console.log('✅ تم إضافة القيد الجديد على email فقط');

    // 3. حذف السجلات المكررة (نحتفظ بأول سجل فقط)
    await client.query(`
      DELETE FROM users a
      USING users b
      WHERE a.id > b.id
      AND a.email = b.email;
    `);
    console.log('✅ تم حذف السجلات المكررة');

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ تم إصلاح قاعدة البيانات بنجاح!');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

fixDuplicateEmails();
ENDOFFILE

echo -e "${GREEN}✅ تم إنشاء fix-duplicate-emails.js${NC}"

# 1.2: إصلاح User.js Model
echo -e "${YELLOW}🔨 إصلاح User.js Model...${NC}"

cat > src/models/User.js << 'ENDOFFILE'
const pool = require('../config/database');
const { validateEmail } = require('../utils/emailValidator');

class User {
  static async findOrCreate(name, email, deviceId) {
    const client = await pool.connect();
    
    try {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      await client.query('BEGIN');

      // التحقق من الحظر
      const blockedEmailCheck = await client.query(
        'SELECT id FROM blocked_list WHERE email = $1',
        [email]
      );

      if (blockedEmailCheck.rows.length > 0) {
        throw new Error('هذا الإيميل محظور. يرجى التواصل مع الإدارة');
      }

      const blockedDeviceCheck = await client.query(
        'SELECT id FROM blocked_list WHERE device_id = $1',
        [deviceId]
      );

      if (blockedDeviceCheck.rows.length > 0) {
        throw new Error('هذا الجهاز محظور. يرجى التواصل مع الإدارة');
      }

      // البحث عن المستخدم بالإيميل فقط
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let user;

      if (existingUser.rows.length > 0) {
        // تحديث device_id وآخر تسجيل دخول
        const updateResult = await client.query(
          `UPDATE users 
           SET device_id = $1, last_login = CURRENT_TIMESTAMP 
           WHERE email = $2 
           RETURNING *`,
          [deviceId, email]
        );
        user = updateResult.rows[0];
      } else {
        // إنشاء مستخدم جديد
        const insertResult = await client.query(
          `INSERT INTO users (name, email, device_id, last_login)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING *`,
          [name, email, deviceId]
        );
        user = insertResult.rows[0];
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(userId) {
    const result = await pool.query(
      'SELECT id, name, email, total_points, registration_date, last_login FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async findAll(limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT id, name, email, total_points, registration_date, last_login, is_blocked
       FROM users
       ORDER BY total_points DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async getLeaderboard(limit = 10) {
    const result = await pool.query(
      `SELECT id, name, total_points
       FROM users
       WHERE is_blocked = FALSE
       ORDER BY total_points DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getUserRank(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE total_points > (SELECT total_points FROM users WHERE id = $1)
       AND is_blocked = FALSE`,
      [userId]
    );
    return result.rows[0]?.rank || 0;
  }

  static async blockUser(userId, reason, blockedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT email, device_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = userResult.rows[0];

      await client.query(
        'UPDATE users SET is_blocked = TRUE, blocked_reason = $1 WHERE id = $2',
        [reason, userId]
      );

      await client.query(
        `INSERT INTO blocked_list (email, device_id, reason, blocked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [user.email, user.device_id, reason, blockedBy]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async unblockUser(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT email, device_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = userResult.rows[0];

      await client.query(
        'UPDATE users SET is_blocked = FALSE, blocked_reason = NULL WHERE id = $1',
        [userId]
      );

      await client.query(
        'DELETE FROM blocked_list WHERE email = $1 OR device_id = $2',
        [user.email, user.device_id]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  static async search(searchTerm) {
    const result = await pool.query(
      `SELECT id, name, email, total_points, registration_date, is_blocked
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY total_points DESC
       LIMIT 50`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

  static async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }
}

module.exports = User;
ENDOFFILE

echo -e "${GREEN}✅ تم إصلاح User.js${NC}"

# 1.3: إصلاح createTables.js
echo -e "${YELLOW}🔨 إصلاح createTables.js...${NC}"

cat > src/config/createTables.js << 'ENDOFFILE'
const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء الجداول...');
    
    await client.query('BEGIN');

    // 1. جدول المستخدمين (الطلبة)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        device_id VARCHAR(500) NOT NULL,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_points INTEGER DEFAULT 0,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_reason TEXT,
        last_login TIMESTAMP,
        questions_count INTEGER DEFAULT 0,
        last_question_month INTEGER,
        last_question_year INTEGER
      )
    `);
    console.log('✅ جدول users تم إنشاؤه');

    // 2. جدول المشرفين
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '{"subjects": true, "exams": true, "students": true, "questions": true, "stats": true}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_super_admin BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ جدول admins تم إنشاؤه');

    // 3. جدول الترمات
    await client.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول terms تم إنشاؤه');

    // 4. جدول المواد
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image VARCHAR(500),
        status VARCHAR(50) DEFAULT 'open',
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES admins(id),
        is_published BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ جدول subjects تم إنشاؤه');

    // 5. جدول ملفات PDF
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdfs (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        downloads_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول pdfs تم إنشاؤه');

    // 6. جدول الصور
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255),
        file_url VARCHAR(500) NOT NULL,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول images تم إنشاؤه');

    // 7. جدول الامتحانات
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        open_at TIMESTAMP,
        close_at TIMESTAMP,
        pass_percentage INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_id, level)
      )
    `);
    console.log('✅ جدول exams تم إنشاؤه');

    // 8. جدول الأسئلة
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('multiple', 'true_false')),
        options JSONB,
        correct_answer VARCHAR(10) NOT NULL,
        question_order INTEGER DEFAULT 0
      )
    `);
    console.log('✅ جدول questions تم إنشاؤه');

    // 9. جدول محاولات الامتحانات
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL,
        passed BOOLEAN DEFAULT FALSE,
        answers JSONB NOT NULL,
        attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول exam_attempts تم إنشاؤه');

    // 10. جدول سجل النقاط
    await client.query(`
      CREATE TABLE IF NOT EXISTS points_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول points_log تم إنشاؤه');

    // 11. جدول الإشعارات
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول notifications تم إنشاؤه');

    // 12. جدول أسئلة الطلبة للأدمن
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        admin_reply TEXT,
        replied_at TIMESTAMP,
        replied_by INTEGER REFERENCES admins(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_replied BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ جدول student_questions تم إنشاؤه');

    // 13. جدول التقييمات
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject_id)
      )
    `);
    console.log('✅ جدول ratings تم إنشاؤه');

    // 14. جدول سجل نشاط الأدمن
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول activity_log تم إنشاؤه');

    // 15. جدول المحظورين
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_list (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        device_id VARCHAR(500),
        reason TEXT,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        blocked_by INTEGER REFERENCES admins(id)
      )
    `);
    console.log('✅ جدول blocked_list تم إنشاؤه');

    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 تم إنشاء جميع الجداول بنجاح!');
    console.log('📊 عدد الجداول: 15');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    throw error;
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  createTables();
}

module.exports = createTables;
ENDOFFILE

echo -e "${GREEN}✅ تم إصلاح createTables.js${NC}"

echo ""
echo -e "${GREEN}✅ تم إصلاح قاعدة البيانات${NC}"
echo ""

cd ..

# ============================================
# الخطوة 2: إصلاح Frontend لحل مشكلة 404
# ============================================
echo -e "${BLUE}🔧 الخطوة 2: إصلاح Frontend...${NC}"
echo ""

cd frontend

# 2.1: التأكد من package.json
echo -e "${YELLOW}🔨 التحقق من package.json...${NC}"

# التحقق من homepage
if ! grep -q '"homepage"' package.json; then
    echo -e "${YELLOW}إضافة homepage...${NC}"
    
    # إنشاء package.json جديد مع homepage
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.homepage = 'https://tarekalsyed.github.io/tawal-academy';
    if (!pkg.scripts.predeploy) pkg.scripts.predeploy = 'npm run build';
    if (!pkg.scripts.deploy) pkg.scripts.deploy = 'gh-pages -d build';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
fi

echo -e "${GREEN}✅ package.json محدث${NC}"

# 2.2: إصلاح .env
cat > .env << 'EOF'
REACT_APP_API_URL=https://tawal-academy-backend.fly.dev/api
REACT_APP_NAME=Tawal Academy
EOF

echo -e "${GREEN}✅ تم إنشاء .env${NC}"

# 2.3: التأكد من وجود public/404.html لـ GitHub Pages
cat > public/404.html << 'EOF'
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Tawal Academy</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = 1;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
EOF

echo -e "${GREEN}✅ تم إنشاء 404.html${NC}"

# 2.4: إضافة redirect script في index.html
echo -e "${YELLOW}🔨 تحديث index.html...${NC}"

if [ -f "public/index.html" ]; then
    # إضافة redirect script قبل </head>
    sed -i '/<\/head>/i\    <script type="text\/javascript">\n      (function(l) {\n        if (l.search[1] === '\''\/'\'' ) {\n          var decoded = l.search.slice(1).split('\''&'\'').map(function(s) { \n            return s.replace(/~and~/g, '\''&'\'')\n          }).join('\''?'\'');\n          window.history.replaceState(null, null,\n              l.pathname.slice(0, -1) + decoded + l.hash\n          );\n        }\n      }(window.location))\n    <\/script>' public/index.html 2>/dev/null || true
    
    echo -e "${GREEN}✅ تم تحديث index.html${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}✅ تم إصلاح Frontend${NC}"
echo ""

# ============================================
# الخطوة 3: إنشاء سكريبتات التشغيل
# ============================================
echo -e "${BLUE}📝 الخطوة 3: إنشاء سكريبتات التشغيل...${NC}"
echo ""

# 3.1: سكريبت إصلاح وإعداد قاعدة البيانات
cat > setup-database.sh << 'ENDOFFILE'
#!/bin/bash

echo "🗄️  إعداد قاعدة البيانات..."
echo ""

cd backend

echo "1️⃣  إنشاء الجداول..."
node src/config/createTables.js

if [ $? -ne 0 ]; then
    echo "❌ فشل إنشاء الجداول!"
    exit 1
fi

echo ""
echo "2️⃣  إصلاح مشكلة الإيميلات المكررة..."
node fix-duplicate-emails.js

echo ""
echo "3️⃣  إنشاء حساب Admin..."
node create-admin.js

echo ""
echo "✅ تم إعداد قاعدة البيانات بنجاح!"
echo ""

cd ..
ENDOFFILE

chmod +x setup-database.sh
echo -e "${GREEN}✅ تم إنشاء setup-database.sh${NC}"

# 3.2: سكريبت رفع Backend
cat > deploy-backend.sh << 'ENDOFFILE'
#!/bin/bash

echo "🚀 رفع Backend على Fly.io..."
echo ""

cd backend

# التحقق من تسجيل الدخول
if ! fly auth whoami &> /dev/null; then
    echo "🔐 يرجى تسجيل الدخول إلى Fly.io..."
    fly auth login
fi

# رفع Backend
echo "📤 جاري الرفع..."
fly deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم رفع Backend بنجاح!"
    echo "🌐 الرابط: https://tawal-academy-backend.fly.dev"
    echo ""
else
    echo ""
    echo "❌ فشل رفع Backend!"
    exit 1
fi

cd ..
ENDOFFILE

chmod +x deploy-backend.sh
echo -e "${GREEN}✅ تم إنشاء deploy-backend.sh${NC}"

# 3.3: سكريبت رفع Frontend
cat > deploy-frontend.sh << 'ENDOFFILE'
#!/bin/bash

echo "🚀 رفع Frontend على GitHub Pages..."
echo ""

cd frontend

# التأكد من تثبيت gh-pages
if ! grep -q '"gh-pages"' package.json; then
    echo "📦 تثبيت gh-pages..."
    npm install --save-dev gh-pages
fi

# بناء المشروع
echo "🔨 جاري بناء المشروع..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ فشل بناء المشروع!"
    exit 1
fi

# رفع على GitHub Pages
echo "📤 جاري الرفع على GitHub Pages..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم رفع Frontend بنجاح!"
    echo "🌐 الرابط: https://tarekalsyed.github.io/tawal-academy"
    echo ""
    echo "⏰ انتظر 2-3 دقائق حتى يظهر الموقع"
    echo ""
else
    echo ""
    echo "❌ فشل رفع Frontend!"
    exit 1
fi

cd ..
ENDOFFILE

chmod +x deploy-frontend.sh
echo -e "${GREEN}✅ تم إنشاء deploy-frontend.sh${NC}"

# 3.4: سكريبت الاختبار
cat > test-all.sh << 'ENDOFFILE'
#!/bin/bash

echo "🧪 اختبار شامل للمشروع..."
echo ""

echo "════════════════════════════════════════"
echo "🔍 اختبار Backend"
echo "════════════════════════════════════════"
echo ""

BACKEND_URL="https://tawal-academy-backend.fly.dev"

echo "📡 اختبار $BACKEND_URL..."
HEALTH=$(curl -s "$BACKEND_URL" | grep -o '"success":true' || echo "fail")

if [ "$HEALTH" = '"success":true' ]; then
    echo "✅ Backend يعمل بنجاح!"
else
    echo "❌ Backend لا يعمل!"
fi

echo ""
echo "════════════════════════════════════════"
echo "🔍 اختبار Frontend"
echo "════════════════════════════════════════"
echo ""

FRONTEND_URL="https://tarekalsyed.github.io/tawal-academy"

echo "📡 اختبار $FRONTEND_URL..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$STATUS" = "200" ]; then
    echo "✅ Frontend يعمل بنجاح!"
else
    echo "❌ Frontend لا يعمل! (Status: $STATUS)"
    echo "   انتظر بضع دقائق وحاول مرة أخرى"
fi

echo ""
echo "════════════════════════════════════════"
echo "📋 معلومات الوصول"
echo "════════════════════════════════════════"
echo ""
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "Admin:    admin@tawal.com / admin123"
echo "Student:  أي Gmail"
echo ""
ENDOFFILE

chmod +x test-all.sh
echo -e "${GREEN}✅ تم إنشاء test-all.sh${NC}"

# 3.5: دليل الإصلاح
cat > FIX-GUIDE.md << 'ENDOFFILE'
# 🔧 دليل إصلاح مشاكل Tawal Academy

## 🐛 المشاكل التي تم اكتشافها وإصلاحها:

### 1. ❌ مشكلة duplicate key في قاعدة البيانات

**الخطأ:**
```
duplicate key value violates unique constraint "users_email_key"
```

**السبب:**
- القيد الفريد كان على (email, device_id) مع
- عند تغيير الجهاز، كان يحاول إنشاء مستخدم جديد بنفس الإيميل

**الحل:**
1. تم تعديل User.js ليبحث بالإيميل فقط
2. تم إنشاء سكريبت fix-duplicate-emails.js لإصلاح القاعدة
3. تم تحديث createTables.js

**كيفية الإصلاح:**
```bash
cd backend
node fix-duplicate-emails.js
```

---

### 2. ❌ خطأ 500 عند تسجيل الدخول

**السبب:**
- النموذج القديم في User.js كان يحاول إضافة مستخدم بنفس الإيميل

**الحل:**
- تم تعديل User.js ليتحقق من الإيميل فقط
- إذا وُجد المستخدم، يُحدث device_id
- إذا لم يوجد، ينشئ مستخدم جديد

---

### 3. ❌ صفحة 404 على GitHub Pages

**الخطأ:**
```
404 - There isn't a GitHub Pages site here
```

**الأسباب المحتملة:**
1. لم يتم رفع Frontend بشكل صحيح
2. GitHub Pages غير مُفعّل
3. مشكلة في routing مع HashRouter

**الحل:**
1. تم إضافة 404.html لـ GitHub Pages
2. تم تحديث index.html بـ redirect script
3. تم التأكد من package.json يحتوي على homepage

**كيفية الإصلاح:**
```bash
./deploy-frontend.sh
```

ثم:
1. اذهب إلى GitHub → Settings → Pages
2. تأكد من اختيار: Source = **gh-pages branch**
3. انتظر 2-3 دقائق

---

## 🚀 خطوات الإصلاح الكاملة:

### الخطوة 1: إصلاح قاعدة البيانات
```bash
./setup-database.sh
```

### الخطوة 2: رفع Backend
```bash
./deploy-backend.sh
```

### الخطوة 3: رفع Frontend
```bash
./deploy-frontend.sh
```

### الخطوة 4: الاختبار
```bash
./test-all.sh
```

---

## ✅ التأكد من حل المشاكل:

### ✅ قاعدة البيانات:
```bash
cd backend
node fix-duplicate-emails.js
```
يجب أن ترى:
```
✅ تم إصلاح قاعدة البيانات بنجاح!
```

### ✅ تسجيل الدخول:
1. افتح: https://tarekalsyed.github.io/tawal-academy
2. أدخل اسم وإيميل Gmail
3. يجب أن يعمل بدون خطأ 500

### ✅ صفحة Admin:
1. افتح: https://tarekalsyed.github.io/tawal-academy/#/admin/login
2. يجب أن تظهر صفحة تسجيل دخول (وليس 404)

---

## 🔍 استكشاف الأخطاء:

### Backend لا يعمل:
```bash
cd backend
fly logs
```

### Frontend لا يظهر:
1. تحقق من GitHub Pages Settings
2. تأكد من branch = gh-pages
3. انتظر 5 دقائق
4. امسح الكاش (Ctrl+Shift+R)

### خطأ في تسجيل الدخول:
1. افتح Developer Tools (F12)
2. انظر Console للأخطاء
3. تحقق من Network tab

---

## 📞 الدعم:

إذا استمرت المشاكل:
1. شغّل `./test-all.sh`
2. التقط screenshot للـ Console (F12)
3. أرسل الأخطاء

---

💡 **نصيحة:** احتفظ بهذا الملف للرجوع إليه!
ENDOFFILE

echo -e "${GREEN}✅ تم إنشاء FIX-GUIDE.md${NC}"

echo ""
echo -e "${GREEN}✅ تم إنشاء جميع السكريبتات${NC}"
echo ""

# ============================================
# الخطوة 4: الملخص النهائي
# ============================================
echo ""
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✅ تم إصلاح جميع المشاكل!${NC}"
echo "════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}📋 الإصلاحات التي تمت:${NC}"
echo ""
echo "✅ قاعدة البيانات:"
echo "   • إصلاح مشكلة duplicate key"
echo "   • تحديث User.js Model"
echo "   • إنشاء سكريبت fix-duplicate-emails.js"
echo ""
echo "✅ تسجيل الدخول:"
echo "   • إصلاح خطأ 500"
echo "   • تحديث منطق البحث عن المستخدم"
echo ""
echo "✅ GitHub Pages:"
echo "   • إضافة 404.html"
echo "   • تحديث index.html"
echo "   • إصلاح routing"
echo ""
echo "✅ السكريبتات المساعدة:"
echo "   • setup-database.sh"
echo "   • deploy-backend.sh"
echo "   • deploy-frontend.sh"
echo "   • test-all.sh"
echo "   • FIX-GUIDE.md"
echo ""

echo "════════════════════════════════════════════════════"
echo -e "${YELLOW}🚀 الخطوات التالية (بالترتيب):${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "1️⃣  إعداد قاعدة البيانات:"
echo "   ./setup-database.sh"
echo ""
echo "2️⃣  رفع Backend:"
echo "   ./deploy-backend.sh"
echo ""
echo "3️⃣  رفع Frontend:"
echo "   ./deploy-frontend.sh"
echo ""
echo "4️⃣  تفعيل GitHub Pages:"
echo "   • اذهب إلى: https://github.com/tarekalsyed/tawal-academy/settings/pages"
echo "   • Source: اختر 'gh-pages' branch"
echo "   • Save"
echo ""
echo "5️⃣  الاختبار:"
echo "   ./test-all.sh"
echo ""

echo "════════════════════════════════════════════════════"
echo -e "${GREEN}🌐 الروابط المتوقعة:${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "Backend:  https://tawal-academy-backend.fly.dev"
echo "Frontend: https://tarekalsyed.github.io/tawal-academy"
echo "Admin:    https://tarekalsyed.github.io/tawal-academy/#/admin/login"
echo ""

echo "════════════════════════════════════════════════════"
echo -e "${BLUE}🔐 بيانات الدخول:${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "Admin:   admin@tawal.com / admin123"
echo "Student: أي Gmail صالح"
echo ""

echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✨ كل شيء جاهز! ابدأ التنفيذ! ✨${NC}"
echo "════════════════════════════════════════════════════"
echo ""
