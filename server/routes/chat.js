
const router     = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const verifyToken = require('../middleware/verifyToken');
const Task        = require('../models/Task');
const User        = require('../models/User');

// ── Safely load Job model (may not exist yet) ──────────────
let Job;
try { Job = require('../models/Job'); } catch { Job = null; }

// ── Initialise Gemini client ───────────────────────────────
// API key loaded from environment — never hardcoded
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══════════════════════════════════════════════════════════
//  TOOL DEFINITIONS
//  These tell Gemini what real data functions it can call.
//  Gemini decides when to call them based on user intent.
// ═══════════════════════════════════════════════════════════
const tools = [{
  functionDeclarations: [

    // ── 1. Navigate to task board with optional filters ───
    {
      name: 'navigate_to_tasks',
      description: 'Navigate the user to the Skill Bridge task board. Use when user wants to find, browse, or explore tasks. Supports optional filters.',
      parameters: {
        type: 'object',
        properties: {
          skill: {
            type: 'string',
            description: 'Filter by skill keyword e.g. react, python, node, design, frontend, backend, flutter, ml'
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Filter by difficulty level'
          },
          compensation: {
            type: 'string',
            enum: ['paid', 'unpaid', 'certificate'],
            description: 'Filter by compensation type'
          },
          search: {
            type: 'string',
            description: 'Free text search term for task title'
          }
        },
        required: []
      }
    },

    // ── 2. Navigate to job listings ───────────────────────
    {
      name: 'navigate_to_jobs',
      description: 'Navigate the user to job listings. Use when user mentions jobs, careers, full-time, part-time, or remote work.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['full-time', 'part-time', 'remote', 'contract'],
            description: 'Job type filter'
          },
          search:   { type: 'string', description: 'Job title search' },
          location: { type: 'string', description: 'Location filter' }
        },
        required: []
      }
    },

    // ── 3. Navigate to internships ────────────────────────
    {
      name: 'navigate_to_internships',
      description: 'Navigate the user to internship listings. Use when user mentions internship, training, or short-term opportunity.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Internship search term' }
        },
        required: []
      }
    },

    // ── 4. Navigate to a specific platform page ───────────
    {
      name: 'navigate_to_page',
      description: 'Navigate the user to a specific page on the SkillBridge platform.',
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
            description: 'Target page identifier'
          }
        },
        required: ['page']
      }
    },

    // ── 5. Search real tasks from MongoDB ─────────────────
    {
      name: 'search_tasks',
      description: 'Search for real tasks in the MongoDB database and return results. Use when user asks what tasks are available or wants specific task recommendations.',
      parameters: {
        type: 'object',
        properties: {
          skill:      { type: 'string', description: 'Skill to filter by' },
          difficulty: { type: 'string', description: 'Difficulty level' },
          keyword:    { type: 'string', description: 'Keyword for title search' }
        },
        required: []
      }
    },

    // ── 6. Get live platform statistics from MongoDB ──────
    {
      name: 'get_platform_stats',
      description: 'Fetch real-time platform statistics including number of open tasks, active jobs, and total users from the live database.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  ]
}];

// ═══════════════════════════════════════════════════════════
//  TOOL EXECUTOR
//  Runs the actual MongoDB queries when Gemini calls a tool.
//  Returns real data from the live database.
// ═══════════════════════════════════════════════════════════
const executeTool = async (toolName, args) => {
  switch (toolName) {

    // ── Search tasks in MongoDB ───────────────────────────
    case 'search_tasks': {
      const query = { status: 'open' };
      if (args.skill)      query.requiredSkills = { $in: [new RegExp(args.skill, 'i')] };
      if (args.difficulty) query.difficulty = args.difficulty;
      if (args.keyword)    query.title = { $regex: args.keyword, $options: 'i' };

      const tasks = await Task.find(query)
        .limit(5)
        .select('title difficulty compensation requiredSkills deadline postedBy');

      return {
        count: tasks.length,
        tasks: tasks.map(t => ({
          id:           t._id,
          title:        t.title,
          difficulty:   t.difficulty,
          compensation: t.compensation,
          skills:       t.requiredSkills?.slice(0, 3) || [],
          postedBy:     t.postedBy?.organization || t.postedBy?.name || 'Unknown',
          deadline:     t.deadline
            ? new Date(t.deadline).toLocaleDateString('en-IN')
            : 'No deadline',
        }))
      };
    }

    // ── Get real platform stats from MongoDB ──────────────
    case 'get_platform_stats': {
      const [openTasks, totalUsers, activeJobs] = await Promise.all([
        Task.countDocuments({ status: 'open' }),
        User.countDocuments(),
        Job ? Job.countDocuments({ status: 'active' }) : Promise.resolve(0),
      ]);
      return { openTasks, totalUsers, activeJobs };
    }

    // ── Build navigation action for task board ────────────
    case 'navigate_to_tasks': {
      const params = new URLSearchParams();
      if (args.skill)        params.set('skill',        args.skill);
      if (args.difficulty)   params.set('difficulty',   args.difficulty);
      if (args.compensation) params.set('compensation', args.compensation);
      if (args.search)       params.set('search',       args.search);
      const qs = params.toString();
      return {
        navigateTo: `/skillbridge/tasks${qs ? '?' + qs : ''}`,
        portal:     'skillbridge',
        filters:    args,
      };
    }

    // ── Build navigation action for job listings ──────────
    case 'navigate_to_jobs': {
      const params = new URLSearchParams();
      if (args.type)     params.set('type',     args.type);
      if (args.search)   params.set('search',   args.search);
      if (args.location) params.set('location', args.location);
      const qs = params.toString();
      return {
        navigateTo: `/jobs${qs ? '?' + qs : ''}`,
        portal:     'jobs',
        filters:    args,
      };
    }

    // ── Build navigation action for internships ───────────
    case 'navigate_to_internships': {
      const params = new URLSearchParams();
      if (args.search) params.set('search', args.search);
      const qs = params.toString();
      return {
        navigateTo: `/jobs/internships${qs ? '?' + qs : ''}`,
        portal:     'jobs',
      };
    }

    // ── Build navigation action for specific pages ────────
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
        navigateTo: pageMap[args.page] || '/dashboard',
        portal:     portalMap[args.page] || null,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

// ── Helper: build readable button label ───────────────────
const buildLabel = (toolName, args) => {
  if (toolName === 'navigate_to_tasks') {
    const parts = [args.skill, args.difficulty, args.search].filter(Boolean);
    return parts.length > 0
      ? `View ${parts.join(' ')} tasks →`
      : 'View Task Board →';
  }
  if (toolName === 'navigate_to_jobs')        return `View ${args.search || ''} jobs →`.trim();
  if (toolName === 'navigate_to_internships') return 'View internships →';
  const labelMap = {
    'dashboard':                'Go to Dashboard →',
    'profile':                  'Open My Profile →',
    'my-task-applications':     'View My Applications →',
    'my-job-applications':      'View My Job Applications →',
    'post-task':                'Post a Task →',
    'recruiter-task-dashboard': 'Open Task Dashboard →',
    'recruiter-job-dashboard':  'Open Job Dashboard →',
  };
  return labelMap[args.page] || 'Open →';
};

// ═══════════════════════════════════════════════════════════
//  CHAT ROUTE
//  POST /api/chat
//  Protected by Firebase token verification middleware
// ═══════════════════════════════════════════════════════════
router.post('/', verifyToken, async (req, res) => {
  try {

    // ── Validate request ───────────────────────────────────
    const { messages, userContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages array is required' });
    }

    // ── Check Gemini API key is configured ─────────────────
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'GEMINI_API_KEY is not configured on the server. Add it to server/.env'
      });
    }

    // ── Build system prompt with real user context ─────────
    // User context comes from MongoDB (passed from frontend)
    const systemInstruction = `You are SkillBot, an intelligent AI career assistant built into SkillBridge.

PLATFORM KNOWLEDGE:
- Skill Bridge Portal: students and employees apply for real tasks posted by recruiters and teachers
- Tasks have difficulty levels (beginner/intermediate/advanced) and compensation types (paid/unpaid/certificate)
- Accepted applicants work through a Workspace with real-time chat and daily progress reports
- Completing tasks earns certificates and can lead to internship or job offers directly from the recruiter
- Job Portal: browse jobs and internships, with a direct offer pipeline from task completions

USER CONTEXT (real data from database):
- Name: ${userContext?.name || 'User'}
- Role: ${userContext?.role || 'student'}
- Skills: ${userContext?.skills?.join(', ') || 'not specified yet'}
- Active tasks: ${userContext?.activeTasks || 0}
- Completed tasks: ${userContext?.completedTasks || 0}

TOOL USAGE RULES:
- When user asks about tasks → call navigate_to_tasks with appropriate filters
- "Show frontend tasks" → navigate_to_tasks({ skill: "frontend" })
- "Show beginner React tasks" → navigate_to_tasks({ skill: "react", difficulty: "beginner" })
- "What tasks are available?" → call search_tasks first to show real results, then navigate_to_tasks
- "Platform stats" or "how many tasks" → call get_platform_stats
- "Find jobs", "remote jobs" → navigate_to_jobs
- "Internships" → navigate_to_internships
- "My profile", "edit profile" → navigate_to_page({ page: "profile" })
- "My applications" → navigate_to_page({ page: "my-task-applications" })
- "Dashboard", "home" → navigate_to_page({ page: "dashboard" })

RESPONSE STYLE:
- Be friendly, encouraging, and concise (under 80 words)
- Use the user's first name when you know it
- Always give a clear next step
- Use bullet points only for lists of 3+ items`;

    // ── Initialise Gemini model with tools ─────────────────
    const model = genAI.getGenerativeModel({
      model: 'gemini-2-flash',   // Fast, free, capable model
      tools,
      systemInstruction,
    });

    // ── Convert message history to Gemini format ───────────
    // Gemini uses 'model' instead of 'assistant' for role names
    const history = messages
  .slice(0, -1)
  .filter((m, index, arr) => {
    if (index === 0 && m.role === 'assistant') return false;
    return true;
  })
  .map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

    const lastMessage = messages[messages.length - 1];

    // ── Start chat and send message ────────────────────────
    const chat   = model.startChat({ history });
    let result   = await chat.sendMessage(lastMessage.content);
    let response = result.response;

    // ═══════════════════════════════════════════════════════
    //  TOOL CALL LOOP
    //  If Gemini decided to call tools, execute them with
    //  real MongoDB data, then feed results back to Gemini
    //  so it can compose a final informed response.
    // ═══════════════════════════════════════════════════════
    let action      = null;
    let toolResults = [];
    let iterations  = 0;
    const MAX_ITER  = 3; // Prevent infinite loops

    while (response.functionCalls()?.length > 0 && iterations < MAX_ITER) {
      iterations++;
      const calls = response.functionCalls();

      // Execute each tool call with real data
      for (const call of calls) {
        const result = await executeTool(call.name, call.args);
        toolResults.push({ name: call.name, result });

        // If a navigation tool was called, build the action object
        if (result.navigateTo) {
          action = {
            type:   'navigate',
            path:   result.navigateTo,
            portal: result.portal || null,
            label:  buildLabel(call.name, call.args),
          };
        }
      }

      // Send tool results back to Gemini for final response
      const functionResponses = calls.map((call, idx) => ({
        functionResponse: {
          name:     call.name,
          response: toolResults[idx]?.result || {},
        }
      }));

      result   = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // ── Extract final text response ────────────────────────
    const text = response.text()?.trim()
      || "I'm here to help! Ask me about tasks, jobs, or anything SkillBridge.";

    // ── Send response to client ────────────────────────────
    res.json({
      text,
      action,       // Navigation action (if any tool was called)
      toolResults,  // Raw tool results for frontend to render cards/stats
    });

  } catch (err) {
    // ── Structured error handling ──────────────────────────
    console.error('=== CHAT ROUTE ERROR ===');
    console.error('Message:', err.message);

    // Specific Gemini API errors
    if (err.message?.includes('API_KEY_INVALID')) {
      return res.status(401).json({ message: 'Invalid GEMINI_API_KEY. Check your server/.env file.' });
    }
    if (err.message?.includes('QUOTA_EXCEEDED')) {
      return res.status(429).json({ message: 'Gemini API quota exceeded. Try again later.' });
    }

    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

module.exports = router;