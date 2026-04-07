const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

const uploadRoutes = require('./routes/upload');

const connectDB = require('./config/db');
connectDB();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/tasks',        require('./routes/tasks'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', require('./routes/chat'));

require('./socket/chatHandler')(io);

app.get('/', (req, res) => res.json({ status: 'SkillBridge API running' }));


httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});