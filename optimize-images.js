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
    return filename.toLowerCase().replace(/\.(jpg|jpeg|png)$/i, '.jpg');
};

// Helper to find case-insensitive file
const findCaseInsensitiveFile = (dir, filename) => {
    const files = fs.readdirSync(dir);
    const lowerFilename = filename.toLowerCase();
    return files.find(file => file.toLowerCase() === lowerFilename);
};

// Image optimization settings
const optimizeImage = async (inputPath, outputPath) => {
    try {
        console.log(`Processing: ${path.basename(inputPath)}`);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

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
        
        console.log(`✓ Optimized: ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`✗ Error optimizing ${inputPath}:`, error);
        return false;
    }
};

// Process all images in photosDir
const processImages = async () => {
    const files = fs.readdirSync(photosDir);
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Get list of all image files
    const imageFiles = files.filter(file => file.match(/\.(jpg|jpeg|png)$/i));
    
    console.log('\nFound images:', imageFiles.length);
    
    for (const file of imageFiles) {
        const inputPath = path.join(photosDir, file);
        const normalizedName = normalizeFilename(file);
        const outputPath = path.join(optimizedDir, normalizedName);
        
        // Check if file already exists in optimized directory
        const existingFile = findCaseInsensitiveFile(optimizedDir, normalizedName);
        if (existingFile) {
            console.log(`- Skipping ${file} (already optimized as ${existingFile})`);
            skippedCount++;
            continue;
        }
        
        try {
            const success = await optimizeImage(inputPath, outputPath);
            if (success) {
                processedCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error(`Failed to process ${file}:`, error);
            errorCount++;
        }
    }

    console.log('\nOptimization Summary:');
    console.log(`Total images found: ${imageFiles.length}`);
    console.log(`Files processed: ${processedCount}`);
    console.log(`Files skipped: ${skippedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
};

// Run the optimization
console.log('Starting image optimization...\n');
processImages().then(() => {
    console.log('\nImage optimization complete!');
}).catch(error => {
    console.error('Fatal error during optimization:', error);
    process.exit(1);
}); 