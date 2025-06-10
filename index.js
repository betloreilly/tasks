import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { DataAPIClient } from '@datastax/astra-db-ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Astra DB setup - Lazily initialized to work in serverless environments
let db;
let users;
let tasks;

async function ensureCollections() {
  if (db) return;
  
  try {
    console.log('🔄 Initializing Astra DB Client...');
    const client = new DataAPIClient();
    db = client.db(process.env.ASTRA_DB_API_ENDPOINT, { 
      token: process.env.ASTRA_DB_APPLICATION_TOKEN 
    });

    users = db.collection('users');
    tasks = db.collection('tasks');
    
    console.log('🔄 Checking database connection...');
    const collections = await db.listCollections();
    console.log('📋 Existing collections:', collections.map(c => c.name));
    
    const names = collections.map(c => c.name);
    
    if (!names.includes('users')) {
      console.log('👥 Creating users collection...');
      await db.createCollection('users');
    }
    
    if (!names.includes('tasks')) {
      console.log('📝 Creating tasks collection...');
      await db.createCollection('tasks');
    }
    
    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // In a serverless environment, we must throw to indicate a hard failure.
    // The process will be terminated and restarted on the next request.
    throw new Error('Failed to connect to or initialize the database.');
  }
}

// Helper: get or create user
async function getOrCreateUser(userId = 'default-user') {
  let user = await users.findOne({ _id: userId });
  if (!user) {
    user = {
      _id: userId,
      name: 'Default User',
      totalEarned: 0,
      totalUsed: 0,
      tasksCompleted: 0,
      timeEarned: 0,
      timeUsed: 0
    };
    await users.insertOne(user);
  }
  // Ensure fields are numbers (in case they're undefined/null in existing documents)
  user.totalEarned = Number(user.totalEarned) || 0;
  user.totalUsed = Number(user.totalUsed) || 0;
  user.tasksCompleted = Number(user.tasksCompleted) || 0;
  user.timeEarned = Number(user.timeEarned) || 0;
  user.timeUsed = Number(user.timeUsed) || 0;
  return user;
}

// API Routes

// GET /tasks - List all tasks for a user
app.get('/api/tasks', async (req, res) => {
  try {
    await ensureCollections();
    const userId = req.query.userId || 'default-user';
    const taskList = await tasks.find({ userId }).toArray();
    res.json(taskList);
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// POST /tasks - Add a new task
app.post('/api/tasks', async (req, res) => {
  try {
    await ensureCollections();
    const { description, reward, timeReward, userId = 'default-user' } = req.body;
    const pointReward = parseInt(reward) || 0;
    const timeRewardValue = parseInt(timeReward) || 0;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (pointReward <= 0 && timeRewardValue <= 0) {
      return res.status(400).json({ error: 'At least one reward (points or time) must be greater than 0' });
    }
    
    const newTask = {
      _id: uuidv4(),
      userId,
      description,
      reward: pointReward,
      timeReward: timeRewardValue,
      completed: false,
      createdAt: new Date().toISOString()
    };
    await tasks.insertOne(newTask);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error.message);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// POST /tasks/:id/complete - Mark task as completed
app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    await ensureCollections();
    const taskId = req.params.id;
    const userId = req.body.userId || 'default-user';
    
    console.log(`🔍 Completing task: ${taskId} for user: ${userId}`);
    
    const task = await tasks.findOne({ _id: taskId, userId });
    console.log(`📋 Found task:`, task);
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.completed) return res.status(400).json({ error: 'Task already completed' });
    
    // Update task
    const updateResult = await tasks.updateOne(
      { _id: taskId },
      { $set: { completed: true, completedAt: new Date().toISOString() } }
    );
    console.log(`✅ Task update result:`, updateResult);
    
    // Update user - award points and time based on task rewards
    const incrementUpdate = { tasksCompleted: 1 };
    
    // Only increment rewards that are actually set and > 0
    if (task.reward > 0) {
      incrementUpdate.totalEarned = task.reward;
    }
    if (task.timeReward > 0) {
      incrementUpdate.timeEarned = task.timeReward;
    }
    
    const userUpdateResult = await users.updateOne(
      { _id: userId },
      { $inc: incrementUpdate },
      { upsert: true }
    );
    console.log(`👤 User update result:`, userUpdateResult);
    
    const updatedTask = await tasks.findOne({ _id: taskId });
    console.log(`🔄 Updated task:`, updatedTask);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error completing task:', error.message);
    res.status(500).json({ error: 'Failed to complete task', details: error.message });
  }
});

// POST /rewards/use - Spend reward points
app.post('/api/rewards/use', async (req, res) => {
  try {
    await ensureCollections();
    const { amount, description, userId = 'default-user' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const user = await getOrCreateUser(userId);
    const balance = user.totalEarned - user.totalUsed;
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance', balance, requested: amount });
    }
    await users.updateOne(
      { _id: userId },
      { $inc: { totalUsed: amount } }
    );
    res.json({ message: 'Points spent successfully', spent: amount, newBalance: balance - amount });
  } catch (error) {
    console.error('Error spending rewards:', error.message);
    res.status(500).json({ error: 'Failed to spend rewards', details: error.message });
  }
});

// POST /rewards/use-time - Spend time rewards
app.post('/api/rewards/use-time', async (req, res) => {
  try {
    await ensureCollections();
    const { minutes, activity = 'Free time', userId = 'default-user' } = req.body;
    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Valid time amount is required' });
    }
    const user = await getOrCreateUser(userId);
    const timeBalance = user.timeEarned - user.timeUsed;
    if (timeBalance < minutes) {
      return res.status(400).json({ error: 'Insufficient time balance', timeBalance, requested: minutes });
    }
    await users.updateOne(
      { _id: userId },
      { $inc: { timeUsed: minutes } }
    );
    res.json({ 
      message: `${minutes} minutes spent on: ${activity}`, 
      spent: minutes, 
      newTimeBalance: timeBalance - minutes 
    });
  } catch (error) {
    console.error('Error spending time:', error.message);
    res.status(500).json({ error: 'Failed to spend time', details: error.message });
  }
});

// GET /rewards/summary - Show reward totals and balance
app.get('/api/rewards/summary', async (req, res) => {
  try {
    await ensureCollections();
    const userId = req.query.userId || 'default-user';
    const user = await getOrCreateUser(userId);
    const summary = {
      totalEarned: user.totalEarned,
      totalUsed: user.totalUsed,
      balance: user.totalEarned - user.totalUsed,
      tasksCompleted: user.tasksCompleted,
      timeEarned: user.timeEarned,
      timeUsed: user.timeUsed,
      timeBalance: user.timeEarned - user.timeUsed,
      user: { id: user._id, name: user.name }
    };
    res.json(summary);
  } catch (error) {
    console.error('Error fetching reward summary:', error.message);
    res.status(500).json({ error: 'Failed to fetch reward summary', details: error.message });
  }
});

// Admin endpoint to clean all data (use before publishing)
app.delete('/api/admin/cleanup', async (req, res) => {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Delete all tasks
    const tasksResult = await db.collection('tasks').deleteMany({});
    console.log(`🗑️ Deleted ${tasksResult.deletedCount} tasks`);
    
    // Delete all users (this will reset all balances and counters)
    const usersResult = await db.collection('users').deleteMany({});
    console.log(`👥 Deleted ${usersResult.deletedCount} user records`);
    
    console.log('✅ Database cleanup completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Database cleaned successfully',
      tasksDeleted: tasksResult.deletedCount,
      usersDeleted: usersResult.deletedCount
    });
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean database' 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await ensureCollections(); // Ensure DB is ready
    const collections = await db.listCollections();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'task-reward-tracker',
      database: {
        connected: true,
        collections: collections.map(c => c.name)
      },
      environment: {
        hasToken: !!process.env.ASTRA_DB_APPLICATION_TOKEN,
        hasEndpoint: !!process.env.ASTRA_DB_API_ENDPOINT
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      service: 'task-reward-tracker',
      database: {
        connected: false,
        error: error.message
      },
      environment: {
        hasToken: !!process.env.ASTRA_DB_APPLICATION_TOKEN,
        hasEndpoint: !!process.env.ASTRA_DB_API_ENDPOINT
      }
    });
  }
});

// Start server
// In a serverless environment, we don't call app.listen.
// The Vercel runtime handles invoking the exported app.
// We keep the listen call for local development.
app.listen(PORT, () => {
  console.log(`🚀 Task & Reward Tracker server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
}); 