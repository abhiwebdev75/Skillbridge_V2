const router      = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const {
  getAllJobs, getJobById, createJob,
  applyForJob, getRecruiterJobs,
  getMyJobApplications, makeOffer,
  respondToOffer, getMyOffers,
  updateApplicantStatus              // ← add this
} = require('../controllers/jobController');

router.get('/',                       verifyToken, getAllJobs);
router.get('/recruiter',              verifyToken, getRecruiterJobs);
router.get('/my-applications',        verifyToken, getMyJobApplications);
router.get('/my-offers',              verifyToken, getMyOffers);
router.get('/:id',                    verifyToken, getJobById);
router.post('/',                      verifyToken, createJob);
router.post('/:id/apply',             verifyToken, applyForJob);
router.post('/offer',                 verifyToken, makeOffer);
router.put('/offer/:id/respond',      verifyToken, respondToOffer);
router.put('/:id/applicant/:userId',  verifyToken, updateApplicantStatus); // ← add this

module.exports = router;