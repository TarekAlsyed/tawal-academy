const ImageStorageService = require('../src/services/imageStorageService');
const pool = require('../src/config/database');
const path = require('path');
const fs = require('fs');

/**
 * Integration Test for Image Recovery
 */
const testRecovery = async () => {
    try {
        console.log('🧪 Starting Image Recovery Test...');

        // 1. Create a mock file
        const mockFileDir = path.join(__dirname, '../uploads/temp');
        if (!fs.existsSync(mockFileDir)) fs.mkdirSync(mockFileDir, { recursive: true });
        
        const mockFilePath = path.join(mockFileDir, 'test-image.jpg');
        fs.writeFileSync(mockFilePath, 'fake image data');
        const mockFile = { path: mockFilePath, originalname: 'test-image.jpg' };

        console.log('📤 Step 1: Uploading mock image...');
        const savedImage = await ImageStorageService.uploadAndSavePermanently(mockFile);
        console.log(`✅ Image uploaded with ID: ${savedImage.id} and URL: ${savedImage.cloudinary_url}`);

        // 2. Simulate broken Cloudinary URL
        // In a real test, we would break it, but here we'll simulate by manually changing the DB URL to a non-existent one
        console.log('❌ Step 2: Simulating broken Cloudinary URL in DB...');
        const originalUrl = savedImage.cloudinary_url;
        await pool.query('UPDATE permanent_images SET cloudinary_url = $1 WHERE id = $2', 
            ['https://res.cloudinary.com/dtsahjk8y/image/upload/v1/non-existent.jpg'], savedImage.id);

        // 3. Trigger recovery
        console.log('🔄 Step 3: Triggering recovery mechanism...');
        const recoveredImage = await ImageStorageService.recoverImage(savedImage.id);
        
        if (recoveredImage && recoveredImage.id !== savedImage.id) {
            console.log(`✅ Recovery SUCCESS! New Image ID: ${recoveredImage.id}`);
            console.log(`✅ Recovered URL: ${recoveredImage.cloudinary_url}`);
            
            // Check status of old image
            const oldStatus = await pool.query('SELECT status FROM permanent_images WHERE id = $1', [savedImage.id]);
            console.log(`✅ Old Image Status: ${oldStatus.rows[0].status}`);
        } else {
            console.error('❌ Recovery FAILED: No new image was created or same image returned.');
        }

        // Cleanup
        if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    } finally {
        // process.exit(0);
    }
};

testRecovery();
