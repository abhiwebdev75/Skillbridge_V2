const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // Ensure this config also uses module.exports
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 🔥 Upload Avatar (IMAGE)
router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only images are allowed' });
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'avatars',
      resource_type: 'image',
    });

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path); // delete temp file

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Avatar Upload Error:', err);
    res.status(500).json({ message: 'Avatar upload failed' });
  }
});

// 🔥 Upload Resume (PDF)
// 🔥 Upload Resume (PDF)
router.post('/resume', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    // FIX: Simplified the check. If it's NOT a pdf, error out.
    if (!file || file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'resumes',
      // Using 'raw' is fine, but 'auto' is smarter for PDF detection
      resource_type: 'auto', 
    });

    // Clean up temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary Error:', err);
    res.status(500).json({ message: 'Resume upload failed' });
  }
});
module.exports = router; // Change 'export default' to this