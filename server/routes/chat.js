const router      = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const verifyToken = require('../middleware/verifyToken');
const Task        = require('../models/Task');
const User        = require('../models/User');
const Job         = require('../models/Job');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Tool definitions — what Gemini can DO ──────────────────
const tools = [{
  functionDeclarations: [
    {
      name: 'navigate_to_tasks',
      description: 'Navigate user to the task board with optional filters. Use when user wants to find, browse, or explore tasks.',
      parameters: {
        type: 'object',
        properties: {
          skill:       { type: 'string', description: 'Filter by skill e.g. react, python, design, node, frontend, backend' },
          difficulty:  { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Filter by difficulty level' },
          compensation:{ type: 'string', enum: ['paid', 'unpaid', 'certificate'], description: 'Filter by compensation type' },
          search:      { type: 'string', description: 'Search term for task title' },
        },
        required: [],
      }
    },
    {
      name: 'navigate_to_jobs',
      description: 'Navigate user to job listings with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          type:     { type: 'string', enum: ['full-time', 'part-time', 'remote', 'contract'], description: 'Job type filter' },
          search:   { type: 'string', description: 'Search term for job title' },
          location: { type: 'string', description: 'Location filter' },
        },
        required: [],
      }
    },
    {
      name: 'navigate_to_internships',
      description: 'Navigate user to internship listings.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search term' },
        },
        required: [],
      }
    },
    {
      name: 'navigate_to_page',
      description: 'Navigate user to a specific page on the platform.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: [
              'dashboard',
              'profile',
              'my-task-applications',
              'my-job-applications',
              'post-task',
              'recruiter-task-dashboard',
              'recruiter-job-dashboard',
            ],
            description: 'Which page to navigate to'
          }
        },
        required: ['page'],
      }
    },
    {
      name: 'search_tasks',
      description: 'Search for tasks in the database and show results to user.',
      parameters: {
        type: 'object',
        properties: {
          skill:      { type: 'string', description: 'Required skill' },
          difficulty: { type: 'string', description: 'Difficulty level' },
          keyword:    { type: 'string', description: 'Search keyword' },
        },
        required: [],
      }
    },
    {
      name: 'get_platform_stats',
      description: 'Get current platform statistics like number of open tasks, jobs available.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      }
    },
  ]
}];

// ── Execute tool calls ─────────────────────────────────────
const executeTool = async (name, args) => {
  switch (name) {

    case 'search_tasks': {
      const query = { status: 'open' };
      if (args.skill)      query.requiredSkills = { $in: [new RegExp(args.skill, 'i')] };
      if (args.difficulty) query.difficulty     = args.difficulty;
      if (args.keyword)    query.title          = { $regex: args.keyword, $options: 'i' };

      const tasks = await Task.find(query).limit(5).select('title difficulty compensation requiredSkills deadline postedBy');
      return {
        count: tasks.length,
        tasks: tasks.map(t => ({
          id:           t._id,
          title:        t.title,
          difficulty:   t.difficulty,
          compensation: t.compensation,
          skills:       t.requiredSkills.slice(0, 3),
          postedBy:     t.postedBy?.organization || t.postedBy?.name,
          deadline:     t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : 'No deadline',
        }))
      };
    }

    case 'get_platform_stats': {
      const [openTasks, activeJobs, totalUsers] = await Promise.all([
        Task.countDocuments({ status: 'open' }),
        Job.countDocuments({ status: 'active' }),
        User.countDocuments(),
      ]);
      return { openTasks, activeJobs, totalUsers };
    }

    case 'navigate_to_tasks': {
      const params = new URLSearchParams();
      if (args.skill)        params.set('skill',        args.skill);
      if (args.difficulty)   params.set('difficulty',   args.difficulty);
      if (args.compensation) params.set('compensation', args.compensation);
      if (args.search)       params.set('search',       args.search);
      const query  = params.toString();
      return { navigateTo: `/skillbridge/tasks${query ? '?' + query : ''}`, portal: 'skillbridge', filters: args };
    }

    case 'navigate_to_jobs': {
      const params = new URLSearchParams();
      if (args.type)     params.set('type',     args.type);
      if (args.search)   params.set('search',   args.search);
      if (args.location) params.set('location', args.location);
      const query = params.toString();
      return { navigateTo: `/jobs${query ? '?' + query : ''}`, portal: 'jobs', filters: args };
    }

    case 'navigate_to_internships': {
      const params = new URLSearchParams();
      if (args.search) params.set('search', args.search);
      const query = params.toString();
      return { navigateTo: `/jobs/internships${query ? '?' + query : ''}`, portal: 'jobs', filters: args };
    }

    case 'navigate_to_page': {
      const pageMap = {
        'dashboard':                '/dashboard',
        'profile':                  '/profile',
        'my-task-applications':     '/skillbridge/my-applications',
        'my-job-applications':      '/jobs/my-applications',
        'post-task':                '/skillbridge/post-task',
        'recruiter-task-dashboard': '/skillbridge/recruiter-dashboard',
        'recruiter-job-dashboard':  '/jobs/recruiter-dashboard',
      };
      const portalMap = {
        'my-task-applications':     'skillbridge',
        'post-task':                'skillbridge',
        'recruiter-task-dashboard': 'skillbridge',
        'my-job-applications':      'jobs',
        'recruiter-job-dashboard':  'jobs',
      };
      return {
        navigateTo: pageMap[args.page],
        portal:     portalMap[args.page] || null,
      };
    }

    default:
      return { error: 'Unknown tool' };
  }
};

// ── Chat route ─────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { messages, userContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001', // Use the standard production-ready string
      tools,
      systemInstruction: `You are SkillBot, an intelligent AI career assistant built into SkillBridge.

PLATFORM:
- Skill Bridge: students apply for real tasks posted by recruiters/teachers → complete tasks → get job/internship offers
- Job Portal: job and internship listings

USER CONTEXT:
- Name: ${userContext?.name || 'User'}
- Role: ${userContext?.role || 'student'}
- Skills: ${userContext?.skills?.join(', ') || 'not specified'}
- Active tasks: ${userContext?.activeTasks || 0}
- Completed tasks: ${userContext?.completedTasks || 0}

BEHAVIOR:
- When user asks about tasks with any skill/category → USE navigate_to_tasks tool WITH that skill filter
- When user asks about jobs → USE navigate_to_jobs tool
- When user asks about internships → USE navigate_to_internships tool
- When user wants to go somewhere → USE navigate_to_page tool
- When user asks "what tasks are available" → USE search_tasks tool first, then show results
- When user asks about platform → USE get_platform_stats tool

STYLE:
- Be friendly and concise
- Always personalize using user name
- Under 80 words unless listing tasks
- Use bullet points for lists
- Always provide actionable next step`,
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat   = model.startChat({ history });
    let result   = await chat.sendMessage(lastMessage.content);
    let response = result.response;

    // ── Handle tool calls ──────────────────────────────────
    let action       = null;
    let toolResults  = [];
    let iterations   = 0;

    while (response.functionCalls()?.length > 0 && iterations < 3) {
      iterations++;
      const calls = response.functionCalls();

      for (const call of calls) {
        const toolResult = await executeTool(call.name, call.args);
        toolResults.push({ name: call.name, result: toolResult });

        if (toolResult.navigateTo) {
          action = {
            type:      'navigate',
            path:      toolResult.navigateTo,
            portal:    toolResult.portal,
            filters:   toolResult.filters || {},
            label:     getNavLabel(call.name, call.args),
          };
        }
      }

      // Send tool results back to Gemini
      const functionResponses = calls.map((call, i) => ({
        functionResponse: {
          name:     call.name,
          response: toolResults[i]?.result || {},
        }
      }));

      result   = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const text = response.text() || "I'm here to help! Ask me anything about SkillBridge.";

    res.json({ text, action, toolResults });

  } catch (err) {
    console.error('Gemini chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

const getNavLabel = (toolName, args) => {
  if (toolName === 'navigate_to_tasks') {
    const parts = [];
    if (args.skill)       parts.push(args.skill);
    if (args.difficulty)  parts.push(args.difficulty);
    if (args.search)      parts.push(args.search);
    return parts.length > 0
      ? `View ${parts.join(' ')} tasks →`
      : 'View all tasks →';
  }
  if (toolName === 'navigate_to_jobs')         return `View ${args.search || ''} jobs →`;
  if (toolName === 'navigate_to_internships')  return 'View internships →';
  if (toolName === 'navigate_to_page')         return `Go to ${args.page} →`;
  return 'Open →';
};

module.exports = router;