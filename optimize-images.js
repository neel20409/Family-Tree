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





// Fast image optimization settings
const optimizeImage = async (inputPath, outputPath) => {
    try {
        const baseOutputPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '');
        
        // Generate JPEG version with better quality
        await sharp(inputPath)
            .jpeg({ 
                quality: 85, // Increased quality for better visual fidelity
                progressive: true,
                optimizeScans: true,
                chromaSubsampling: '4:4:4' // Better color quality
            })
            .toFile(outputPath);
        
        // Generate WebP version with better quality
        await sharp(inputPath)
            .webp({ 
                quality: 85,
                effort: 6 // Higher effort for better compression
            })
            .toFile(baseOutputPath + '.webp');
        
        // Generate AVIF version with better quality
        await sharp(inputPath)
            .avif({ 
                quality: 85,
                effort: 6 // Higher effort for better compression
            })
            .toFile(baseOutputPath + '.avif');
        
        return true;
    } catch (error) {
        console.error(`Error optimizing ${inputPath}:`, error);
        return false;
    }
};

// Process all images in parallel
const processImages = async () => {
    const files = fs.readdirSync(photosDir);
    const imageFiles = files.filter(file => file.match(/\.(jpg|jpeg|png)$/i));
    
    console.log(`Processing ${imageFiles.length} images...`);
    
    // Process images in parallel batches
    const batchSize = 5;
    for (let i = 0; i < imageFiles.length; i += batchSize) {
        const batch = imageFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file) => {
            const inputPath = path.join(photosDir, file);
            const outputPath = path.join(optimizedDir, file.replace(/\.(png|jpeg)$/i, '.jpg'));
            await optimizeImage(inputPath, outputPath);
        }));
    }
    
    console.log('Image optimization complete!');
};

// Run the optimization
processImages().catch(console.error); 