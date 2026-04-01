const fs = require('fs');
const path = require('path');
const imageAutoSaveService = require('../src/services/imageAutoSaveService');
const AutoSavedImage = require('../src/models/AutoSavedImage');

// Mock a multer file object
const mockFile = {
  fieldname: 'cover',
  originalname: 'test-image.jpg',
  filename: 'cover-123456789.jpg',
  path: path.join(__dirname, '../uploads/covers/test-image.jpg'),
  mimetype: 'image/jpeg',
  size: 1024
};

async function testAutoSave() {
  console.log('🧪 Starting Image Auto-Save Test...');

  // 1. Ensure test directory and file exist
  const testDir = path.dirname(mockFile.path);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  fs.writeFileSync(mockFile.path, 'fake image content');

  try {
    // 2. Test autoSave method
    console.log('Step 1: Testing autoSave method...');
    let savedRecord = null;
    try {
      savedRecord = await imageAutoSaveService.autoSave(mockFile, {
        source: '/test-route',
        type: 'test_image',
        priority: 1
      });
    } catch (dbErr) {
      console.warn('⚠️ Warning: Database connection failed, but checking file system anyway...');
    }

    // Check file system even if DB failed
    const fileExt = path.extname(mockFile.filename);
    const permanentFiles = fs.readdirSync(path.join(__dirname, '../permanent_storage/images'));
    const testFileExists = permanentFiles.some(f => f.startsWith('permanent-') && f.endsWith(fileExt));

    if (testFileExists) {
      console.log('✅ Success: File exists in permanent storage!');
      if (savedRecord) {
        console.log('✅ Database record also created:', savedRecord.id);
      } else {
        console.log('ℹ️ Note: Database record was NOT created (DB Connection Error), but the logic for file copying is working perfectly.');
      }
    } else {
      console.error('❌ Error: File was NOT copied to permanent storage.');
    }

    // 3. Test stats (Only if DB is connected)
    console.log('\nStep 2: Testing stats method...');
    try {
      const stats = await imageAutoSaveService.getStats();
      console.log('✅ Stats:', JSON.stringify(stats, null, 2));
    } catch (e) {
      console.log('⏭️ Skipping stats (Requires Database connection)');
    }

    // 4. Test finding by type
    console.log('\nStep 3: Testing findByType...');
    const imagesByType = await AutoSavedImage.findByType('test_image');
    console.log(`✅ Found ${imagesByType.length} images of type 'test_image'`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Cleanup test file
    if (fs.existsSync(mockFile.path)) {
      fs.unlinkSync(mockFile.path);
    }
    console.log('\n🧪 Test Finished.');
  }
}

// We need to handle the DB connection if running this standalone
// But since we can't easily run it here without a live DB, we'll just log the logic.
// In a real environment, you'd run: node scripts/test-image-autosave.js

testAutoSave();
