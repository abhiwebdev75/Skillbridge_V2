const Task        = require('../models/Task');
const Application = require('../models/Application');
const User        = require('../models/User');
const Chat        = require('../models/Chat');

// GET all tasks — with filters
const getAllTasks = async (req, res) => {
  try {
    const { skill, difficulty, compensation, search, page = 1, limit = 12 } = req.query;
    const query = { status: 'open' };

    if (skill)         query.requiredSkills = { $in: [new RegExp(skill, 'i')] };
    if (difficulty)    query.difficulty     = difficulty;
    if (compensation)  query.compensation   = compensation;
    if (search)        query.title          = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Task.countDocuments(query);

    res.json({ tasks, total, page: Number(page),
      pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single task
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create task — recruiter/teacher only
const createTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const mongoUser = req.mongoUser;

    if (!mongoUser || (mongoUser.role !== 'recruiter' && mongoUser.role !== 'teacher')) {
      return res.status(403).json({ message: 'Only recruiters and teachers can post tasks' });
    }

    const task = await Task.create({
      ...req.body,
      postedBy: {
        userId:       uid,
        name:         mongoUser.name,
        role:         mongoUser.role,
        organization: mongoUser.organization,
      }
    });

    await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $push: { postedTasks: task._id } }
    );

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST apply for a task
const applyForTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const mongoUser = req.mongoUser;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'open') return res.status(400).json({ message: 'Task is not open' });

    const alreadyApplied = task.applicants.find(a => a.userId === uid);
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

    if (task.applicants.length >= task.maxApplicants) {
      return res.status(400).json({ message: 'Max applicants reached' });
    }

    // Add to task applicants
    task.applicants.push({
      userId:    uid,
      mongoId:   mongoUser._id,
      name:      mongoUser.name,
      status:    'pending',
      coverNote: req.body.coverNote || '',
    });
    await task.save();

    // Create Application record
    await Application.create({
      taskId:           task._id,
      applicantId:      uid,
      applicantMongoId: mongoUser._id,
      applicantName:    mongoUser.name,
      recruiterId:      task.postedBy.userId,
      coverNote:        req.body.coverNote || '',
      resumeUrl:        mongoUser.resumeUrl || '',
      portfolioUrl:     mongoUser.portfolioUrl || '',
      skills:           mongoUser.skills || [],
    });

    res.status(201).json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT accept or reject an applicant
const respondToApplication = async (req, res) => {
  try {
    const { id: taskId, userId: applicantId } = req.params;
    const { action, note } = req.body;  // action: 'accept' | 'reject'
    const { uid } = req.user;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.postedBy.userId !== uid) return res.status(403).json({ message: 'Not authorized' });

    const applicant = task.applicants.find(a => a.userId === applicantId);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

    applicant.status = action === 'accept' ? 'accepted' : 'rejected';
    if (action === 'accept') {
      task.acceptedApplicant = { userId: applicantId, name: applicant.name };
      task.status = 'in-progress';
    }
    await task.save();

    // Update Application record
    await Application.findOneAndUpdate(
      { taskId, applicantId },
      { status: action === 'accept' ? 'accepted' : 'rejected',
        recruiterNote: note || '', respondedAt: new Date() }
    );

    // If accepted — create chat room + update user's activeTasks
    if (action === 'accept') {
      const roomId = `${taskId}_${applicantId}`;
      const recruiter = req.mongoUser;

      await Chat.findOneAndUpdate(
        { roomId },
        {
          roomId,
          taskId:   task._id,
          taskTitle: task.title,
          participants: [
            { userId: uid,         name: recruiter.name,   role: recruiter.role },
            { userId: applicantId, name: applicant.name,   role: 'student'      },
          ],
          $setOnInsert: {
            messages: [{
              senderId:   'system',
              senderName: 'SkillBridge',
              text: `🎉 ${applicant.name} was accepted for "${task.title}". Chat is now open!`,
              type: 'system',
              timestamp: new Date(),
              readBy: [],
            }],
            isActive: true,
          }
        },
        { upsert: true }
      );

      await User.findOneAndUpdate(
        { firebaseUid: applicantId },
        { $addToSet: { activeTasks: task._id } }
      );
    }

    res.json({ message: `Application ${action}ed`, task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET recruiter's posted tasks
const getRecruiterTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ 'postedBy.userId': req.user.uid })
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET student's applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicantId: req.user.uid })
      .populate('taskId', 'title status deadline difficulty compensation postedBy')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT mark task as complete
const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = 'completed';
    await task.save();

    // Move from active to completed in user profile
    await User.findOneAndUpdate(
      { firebaseUid: task.acceptedApplicant?.userId },
      {
        $pull:     { activeTasks:    task._id },
        $addToSet: { completedTasks: task._id }
      }
    );

    res.json({ message: 'Task marked as completed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST upload file in task
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: req.file.path, name: req.file.originalname });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllTasks, getTaskById, createTask, applyForTask,
  respondToApplication, getRecruiterTasks,
  getMyApplications, completeTask, uploadFile
};