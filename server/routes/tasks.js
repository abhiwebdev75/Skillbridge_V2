const router      = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const Chat        = require('../models/Chat');
const {
  getAllTasks, getTaskById, createTask,
  applyForTask, respondToApplication,
  getRecruiterTasks, getMyApplications,
  completeTask, uploadFile
} = require('../controllers/taskController');

router.get('/',                    verifyToken, getAllTasks);
router.get('/recruiter',           verifyToken, getRecruiterTasks);
router.get('/my-applications',     verifyToken, getMyApplications);
router.get('/:id',                 verifyToken, getTaskById);
router.post('/',                   verifyToken, createTask);
router.post('/:id/apply',          verifyToken, applyForTask);
router.put('/:id/respond/:userId', verifyToken, respondToApplication);
router.put('/:id/complete',        verifyToken, completeTask);
// router.post('/:id/upload',         verifyToken, uploadTaskFile.single('file'), uploadFile);

// Get chat room by roomId
router.get('/chat/:roomId', verifyToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({ roomId: req.params.roomId });
    if (!chat) return res.status(404).json({ message: 'Chat room not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;