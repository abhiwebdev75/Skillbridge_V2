const User           = require('../models/User');
const TaskCompletion = require('../models/TaskCompletion');

// In-memory job store (backed by MongoDB via a simple Job model)
// We'll use TaskCompletion for offers and a Job collection for listings
const mongoose = require('mongoose');

// ── Inline Job schema (add to models/Job.js separately) ──
const jobSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, required: true },
  company:      String,
  location:     String,
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'internship', 'contract', 'remote'],
    default: 'full-time'
  },
  salary:       String,
  duration:     String,           // for internships e.g. "3 months"
  stipend:      String,           // for internships
  skills:       [String],
  experience:   String,
  postedBy: {
    userId:       String,
    name:         String,
    organization: String,
  },
  applicants: [{
    userId:       String,
    name:         String,
    resumeUrl:    String,
    coverNote:    String,
    status: {
      type: String,
      enum: ['pending','shortlisted','rejected','hired'],
      default: 'pending'
    },
    isFromTask:   Boolean,        // came through task pipeline
    taskId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    appliedAt:    { type: Date, default: Date.now }
  }],
  isFromTaskOffer: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  },
  openings: { type: Number, default: 1 },
  deadline: Date,
}, { timestamps: true });

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

// GET all jobs with filters
const getAllJobs = async (req, res) => {
  try {
    const {
      search, type, skill, location,
      page = 1, limit = 12
    } = req.query;

    const query = { status: 'active' };
    if (search)   query.title    = { $regex: search, $options: 'i' };
    if (type)     query.type     = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (skill)    query.skills   = { $in: [new RegExp(skill, 'i')] };

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      total,
      page:  Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single job
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create job listing
const createJob = async (req, res) => {
  try {
    const mongoUser = req.mongoUser;
    if (!mongoUser || (mongoUser.role !== 'recruiter' && mongoUser.role !== 'teacher')) {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }

    const job = await Job.create({
      ...req.body,
      postedBy: {
        userId:       req.user.uid,
        name:         mongoUser.name,
        organization: mongoUser.organization,
      }
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST apply for a job
const applyForJob = async (req, res) => {
  try {
    const { uid }   = req.user;
    const mongoUser = req.mongoUser;
    const job       = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const already = job.applicants.find(a => a.userId === uid);
    if (already) return res.status(400).json({ message: 'Already applied' });

    job.applicants.push({
      userId:    uid,
      name:      mongoUser.name,
      resumeUrl: mongoUser.resumeUrl || '',
      coverNote: req.body.coverNote || '',
      status:    'pending',
      isFromTask: false,
    });
    await job.save();

    res.status(201).json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET recruiter's job listings
const getRecruiterJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ 'postedBy.userId': req.user.uid })
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET student's job applications
const getMyJobApplications = async (req, res) => {
  try {
    const uid  = req.user.uid;
    const jobs = await Job.find({ 'applicants.userId': uid })
      .select('title company type location salary stipend duration postedBy applicants status createdAt');

    const applications = jobs.map(job => {
      const myApp = job.applicants.find(a => a.userId === uid);
      return {
        _id:       job._id,
        title:     job.title,
        company:   job.company || job.postedBy?.organization,
        type:      job.type,
        location:  job.location,
        salary:    job.salary,
        postedBy:  job.postedBy,
        status:    myApp?.status,
        appliedAt: myApp?.appliedAt,
        isFromTask: myApp?.isFromTask,
      };
    });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST recruiter makes an internship/job offer after task completion
const makeOffer = async (req, res) => {
  try {
    const {
      studentId, taskId, type,
      role, duration, stipend,
      startDate, location, message
    } = req.body;

    const mongoUser = req.mongoUser;

    // Create TaskCompletion offer record
    const completion = await TaskCompletion.findOneAndUpdate(
      { taskId, studentId },
      {
        taskId, studentId,
        recruiterId:   req.user.uid,
        recruiterName: mongoUser.name,
        decision:      `${type}-offer`,
        offerDetails: {
          type, role, duration,
          stipend, startDate, location
        },
        studentResponse: 'pending',
      },
      { upsert: true, new: true }
    );

    // Add to student's pending offers in User model
    await User.findOneAndUpdate(
      { firebaseUid: studentId },
      {
        $push: {
          offersPending: {
            taskId,
            type,
            from:      mongoUser.name,
            offeredAt: new Date(),
          }
        }
      }
    );

    // Also auto-create a job listing from this offer
    if (type === 'job' || type === 'internship') {
      await Job.create({
        title:       role,
        description: message || `Offer extended after successful task completion`,
        company:     mongoUser.organization,
        type:        type === 'internship' ? 'internship' : 'full-time',
        location:    location || 'Remote',
        salary:      type === 'job' ? stipend : undefined,
        stipend:     type === 'internship' ? stipend : undefined,
        duration:    duration,
        postedBy: {
          userId:       req.user.uid,
          name:         mongoUser.name,
          organization: mongoUser.organization,
        },
        applicants: [{
          userId:     studentId,
          name:       req.body.studentName,
          status:     'pending',
          isFromTask: true,
          taskId,
        }],
        isFromTaskOffer: true,
        status: 'active',
      });
    }

    res.status(201).json({ message: 'Offer sent', completion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT student accepts or declines offer
const respondToOffer = async (req, res) => {
  try {
    const { action } = req.body;  // 'accepted' | 'declined'
    const { uid }    = req.user;

    const completion = await TaskCompletion.findByIdAndUpdate(
      req.params.id,
      {
        studentResponse:    action,
        studentRespondedAt: new Date(),
      },
      { new: true }
    );

    // Remove from pending offers
    await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $pull: { offersPending: { taskId: completion.taskId } } }
    );

    res.json({ message: `Offer ${action}`, completion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET student's pending offers
const getMyOffers = async (req, res) => {
  try {
    const offers = await TaskCompletion.find({
      studentId:       req.user.uid,
      studentResponse: 'pending',
    }).populate('taskId', 'title');

    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const updateApplicantStatus = async (req, res) => {
  try {
    const { id: jobId, userId } = req.params;
    const { status }            = req.body;
    // status can be: 'shortlisted' | 'rejected' | 'hired'

    const validStatuses = ['pending', 'shortlisted', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only the recruiter who posted can update
    if (job.postedBy.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applicant = job.applicants.find(a => a.userId === userId);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

    applicant.status = status;
    await job.save();

    res.json({ message: `Applicant ${status}`, job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
module.exports = {
  getAllJobs, getJobById, createJob, applyForJob,
  getRecruiterJobs, getMyJobApplications,
  makeOffer, respondToOffer, getMyOffers, updateApplicantStatus
};