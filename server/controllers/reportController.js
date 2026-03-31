const DailyReport = require('../models/DailyReport');

const submitReport = async (req, res) => {
  try {
    const { uid } = req.user;
    const mongoUser = req.mongoUser;
    const { taskId, summary, blockers, planForTomorrow, dayNumber } = req.body;

    const report = await DailyReport.create({
      taskId, studentId: uid,
      studentName: mongoUser.name,
      recruiterId: req.body.recruiterId,
      summary, blockers, planForTomorrow,
      dayNumber: dayNumber || 1,
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await DailyReport.find({ taskId: req.params.taskId })
      .sort({ dayNumber: 1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const giveReportFeedback = async (req, res) => {
  try {
    const report = await DailyReport.findByIdAndUpdate(
      req.params.id,
      {
        recruiterFeedback: req.body.feedback,
        feedbackGivenAt:   new Date(),
        status:            'reviewed'
      },
      { new: true }
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitReport, getReports, giveReportFeedback };