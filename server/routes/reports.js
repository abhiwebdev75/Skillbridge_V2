const router      = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const {
  submitReport, getReports, giveReportFeedback
} = require('../controllers/reportController');

router.post('/',              verifyToken, submitReport);
router.get('/:taskId',        verifyToken, getReports);
router.put('/:id/feedback',   verifyToken, giveReportFeedback);

module.exports = router;