import express from 'express';
import cors from 'cors';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tasks-one-psi.vercel.app', 'https://tasks-betloreilly.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

// Environment variables
const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
const PORT = process.env.PORT || 3001;

// Global variables for database connection (lazy initialization)
let client = null;
let db = null;
let tasks = null;
let users = null;

// Initialize database connection (lazy loading)
async function ensureCollections() {
  if (!client) {
    console.log('🔄 Initializing Astra DB Client...');
    client = new DataAPIClient(token);
    db = client.db(endpoint);
    
    console.log('🔄 Checking database connection...');
    const collections = await db.listCollections();
    console.log('📋 Existing collections:', collections.map(c => c.name));
    
    // Get collections (they should already exist from admin panel)
    tasks = db.collection('tasks');
    users = db.collection('users');
    
    console.log('✅ Database setup completed');
  }
  return { tasks, users };
}

async function getOrCreateUser(userId = 'default-user') {
  const existingUser = await users.findOne({ _id: userId });
  if (!existingUser) {
    const newUser = {
      _id: userId,
      name: userId === 'default-user' ? 'Default User' : userId,
      totalEarned: 0,
      totalUsed: 0,
      timeEarned: 0,
      timeUsed: 0,
      tasksCompleted: 0,
      createdAt: new Date().toISOString()
    };
    await users.insertOne(newUser);
    return newUser;
  }
  return existingUser;
}

// Routes
// GET /tasks - Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    await ensureCollections();
    const allTasks = await tasks.find({}).toArray();
    console.log(`📝 Found ${allTasks.length} tasks`);
    res.json(allTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// POST /tasks - Add a new task
app.post('/api/tasks', async (req, res) => {
  try {
    await ensureCollections();
    const { name, reward = 0, timeReward = 0, category = 'general', priority = 'medium', notes = '' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Task name is required' });
    }
    const task = {
      _id: uuidv4(),
      name,
      reward: Number(reward) || 0,
      timeReward: Number(timeReward) || 0,
      category,
      priority,
      notes,
      completed: false,
      createdAt: new Date().toISOString()
    };
    const result = await tasks.insertOne(task);
    console.log(`✅ Task created:`, task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error.message);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// PUT /tasks/:id - Update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    await ensureCollections();
    const taskId = req.params.id;
    const { name, reward = 0, timeReward = 0, category = 'general', priority = 'medium', notes = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const updateData = {
      name,
      reward: Number(reward) || 0,
      timeReward: Number(timeReward) || 0,
      category,
      priority,
      notes,
      updatedAt: new Date().toISOString()
    };

    const result = await tasks.updateOne(
      { _id: taskId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await tasks.findOne({ _id: taskId });
    console.log(`📝 Task updated:`, updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error.message);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// DELETE /tasks/:id - Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await ensureCollections();
    const taskId = req.params.id;
    const result = await tasks.deleteOne({ _id: taskId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    console.log(`🗑️ Task deleted: ${taskId}`);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error.message);
    res.status(500).json({ error: 'Failed to delete task', details: error.message });
  }
});

// POST /tasks/:id/complete - Mark task as completed and award points
app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    await ensureCollections();
    const taskId = req.params.id;
    const { userId = 'default-user' } = req.body;
    
    console.log(`🎯 Completing task ${taskId} for user ${userId}`);
    
    // Find the task
    const task = await tasks.findOne({ _id: taskId });
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

// Export the app for Vercel (no app.listen call)
export default app; 