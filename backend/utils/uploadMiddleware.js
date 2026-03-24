const multer = require('multer');

// Store files in memory buffer initially
const storage = multer.memoryStorage();

// Accept only images
const itemImageUpload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB Limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

module.exports = {
    itemImageUpload
};
