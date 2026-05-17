const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const fileName = String(file.originalname || '').toLowerCase();

    const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    const documentMimes = [...imageMimes, 'application/pdf'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg'];
    const documentExtensions = [...imageExtensions, '.pdf'];

    const fieldName = String(file.fieldname || '');
    const allowedMimes = fieldName === 'profileImage' ? imageMimes : documentMimes;
    const allowedExtensions = fieldName === 'profileImage' ? imageExtensions : documentExtensions;
    const extensionMatch = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (allowedMimes.includes(mimeType) || (mimeType === 'application/octet-stream' && extensionMatch)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed formats are JPEG, JPG, PNG, SVG, and PDF for PAN/Aadhaar uploads. Professional photo supports JPEG, JPG, PNG, SVG.'));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit to allow high-res camera images before optimization/conversion
  }
});

module.exports = upload;
