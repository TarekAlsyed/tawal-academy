# استخدام نسخة خفيفة من Node.js
FROM node:18-alpine

# تحديد مجلد العمل
WORKDIR /app

# نسخ ملفات التعريف وتثبيت المكاتب
COPY package*.json ./
RUN npm install --production

# نسخ باقي ملفات المشروع
COPY . .

# فتح البورت 8080 (المهم جداً)
EXPOSE 8080

# أمر التشغيل
CMD ["npm", "start"]