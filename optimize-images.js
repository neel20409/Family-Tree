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

// Helper to normalize filename
const normalizeFilename = (filename) => {
    // Remove any 'copy' or 'copy X' from filename
    const cleanName = filename.replace(/\s+copy(?:\s+\d+)?/i, '');
    // Keep original case but ensure extension is lowercase
    const nameWithoutExt = cleanName.replace(/\.(jpg|jpeg|png)$/i, '');
    const ext = filename.match(/\.(jpg|jpeg|png)$/i)[1].toLowerCase();
    return `${nameWithoutExt}.${ext}`;
};

// Helper to find case-insensitive file
const findCaseInsensitiveFile = (dir, filename) => {
    const files = fs.readdirSync(dir);
    const lowerFilename = filename.toLowerCase();
    return files.find(file => file.toLowerCase() === lowerFilename);
};

// Clean up duplicate files
const cleanupDuplicates = () => {
    const files = fs.readdirSync(optimizedDir);
    const seen = new Set();
    let removedCount = 0;

    files.forEach(file => {
        const normalized = normalizeFilename(file);
        if (seen.has(normalized.toLowerCase())) {
            fs.unlinkSync(path.join(optimizedDir, file));
            console.log(`Removed duplicate: ${file}`);
            removedCount++;
        } else {
            seen.add(normalized.toLowerCase());
        }
    });

    console.log(`Cleaned up ${removedCount} duplicate files`);
};

// Fast image optimization settings
const optimizeImage = async (inputPath, outputPath) => {
    try {
        const baseOutputPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '');
        await sharp(inputPath)
            .jpeg({ 
                quality: 60, // Slightly reduced quality for faster loading
                progressive: true,
                optimizeScans: true
            })
            .toFile(outputPath);
        
        // Generate WebP version
        await sharp(inputPath)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 60 })
            .toFile(baseOutputPath + '.webp');
        
        // Generate AVIF version
        await sharp(inputPath)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .avif({ quality: 60 })
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