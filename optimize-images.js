import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const photosDir = path.join(__dirname, 'public', 'photos');
const optimizedDir = path.join(__dirname, 'public', 'optimized');

// Create optimized directory if it doesn't exist
if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir);
}

// Image optimization settings
const optimizeImage = async (inputPath, outputPath) => {
    try {
        await sharp(inputPath)
            .resize(800, 800, { // Max dimensions
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ // Convert to JPEG with quality settings
                quality: 80,
                progressive: true
            })
            .toFile(outputPath);
        
        console.log(`Optimized: ${path.basename(inputPath)}`);
    } catch (error) {
        console.error(`Error optimizing ${inputPath}:`, error);
    }
};

// Process all images in photosDir
const processImages = async () => {
    const files = fs.readdirSync(photosDir);
    
    for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
            const inputPath = path.join(photosDir, file);
            const outputPath = path.join(optimizedDir, file.replace(/\.(jpg|jpeg|png)$/i, '.jpg'));
            await optimizeImage(inputPath, outputPath);
        }
    }
};

processImages().then(() => {
    console.log('Image optimization complete!');
}); 