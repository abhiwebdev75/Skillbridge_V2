const router     = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const {
  registerUser,
  getMe,
  updateProfile,
  saveFcmToken
} = require('../controllers/authController');

router.post('/register',  verifyToken, registerUser);
router.get('/me',         verifyToken, getMe);
router.put('/profile',    verifyToken, updateProfile);
router.post('/fcm-token', verifyToken, saveFcmToken);

module.exports = router;