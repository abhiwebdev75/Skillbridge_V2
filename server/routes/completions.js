const router      = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const TaskCompletion = require('../models/TaskCompletion');
const { makeOffer, respondToOffer, getMyOffers } = require('../controllers/jobController');

router.get('/my-offers',        verifyToken, getMyOffers);
router.post('/offer',           verifyToken, makeOffer);
router.put('/offer/:id/respond',verifyToken, respondToOffer);


// Recruiter submits final review
router.post('/review', verifyToken, async (req, res) => {
  try {
    const {
      taskId, studentId, studentName,
      workRating, recruiterReview, decision
    } = req.body;

    const mongoUser = req.mongoUser;

    const completion = await TaskCompletion.findOneAndUpdate(
      { taskId, studentId },
      {
        taskId, studentId, studentName,
        recruiterId:   req.user.uid,
        recruiterName: mongoUser.name,
        workRating, recruiterReview, decision,
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(201).json(completion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET completion record for a task
router.get('/:taskId', verifyToken, async (req, res) => {
  try {
    const completion = await TaskCompletion.findOne({
      taskId: req.params.taskId
    }).populate('taskId', 'title');
    res.json(completion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;