const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(__dirname, 'uploads');
const subDirs = ['covers', 'pdfs', 'images', 'excel'];

console.log('--- Checking Directory Existence ---');
console.log(`Upload Dir: ${uploadDir} (${fs.existsSync(uploadDir) ? 'EXISTS' : 'MISSING'})`);

subDirs.forEach(dir => {
    const fullPath = path.join(uploadDir, dir);
    const exists = fs.existsSync(fullPath);
    console.log(`- ${dir}: ${fullPath} (${exists ? 'EXISTS' : 'MISSING'})`);
    
    if (exists) {
        const files = fs.readdirSync(fullPath);
        console.log(`  Files (${files.length}):`);
        files.forEach(file => console.log(`    - ${file}`));
    }
});
