# 🎯 Task & Reward Tracker

A full-stack task management application with a flexible reward system supporting both points and time rewards.

## ✨ Features

- **Task Management**: Create, complete, and track tasks
- **Flexible Rewards**: Award points, time (minutes), or both for completed tasks
- **Reward Spending**: Use earned points and time for various activities
- **Progress Tracking**: View comprehensive statistics and task history
- **Responsive Design**: Modern glassmorphism UI that works on all devices
- **Admin Tools**: Database cleanup endpoint for maintenance

## 🏗️ Architecture

- **Backend**: Node.js with Express.js REST API
- **Frontend**: React with Vite
- **Database**: DataStax Astra DB (Cassandra-based cloud database)
- **Styling**: Modern CSS with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- DataStax Astra DB account
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/betloreilly/tasks.git
   cd tasks
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies  
   cd server && npm install && cd ..
   
   # Install client dependencies
   cd client && npm install && cd ..
   ```

3. **Set up Astra DB**
   - Create a database at [Astra DB](https://astra.datastax.com/)
   - Generate an Application Token
   - Get your API Endpoint URL

4. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   
   Edit `server/.env` with your actual values:
   ```
   ASTRA_DB_APPLICATION_TOKEN=your_token_here
   ASTRA_DB_API_ENDPOINT=your_endpoint_here  
   ASTRA_DB_KEYSPACE=default_keyspace
   PORT=3001
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```
   
   This starts both the React frontend (http://localhost:5173) and Express backend (http://localhost:3001)

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Tasks

**GET `/api/tasks`**
- Get all tasks for a user
- Query params: `userId` (optional, defaults to 'default-user')
- Response: Array of task objects

**POST `/api/tasks`**
- Create a new task
- Body: `{ description: string, reward: number, userId?: string }`
- Response: Created task object

**PUT `/api/tasks/:id/complete`**
- Mark a task as completed
- Body: `{ userId?: string }`
- Response: Updated task object

#### Rewards

**GET `/api/rewards/summary`**
- Get reward summary for a user
- Query params: `userId` (optional)
- Response: `{ totalEarned, totalUsed, balance, user }`

**POST `/api/rewards/use-points`**
- Spend reward points
- Body: `{ amount: number, description?: string, userId?: string }`
- Response: Spend confirmation with new balance

**POST `/api/rewards/use-time`**
- Spend time
- Body: `{ time: number, description?: string, userId?: string }`
- Response: Spend confirmation with new balance

#### Admin

**DELETE `/api/admin/cleanup`**
- Clean all data (use before publishing)
- Response: Clean confirmation

**GET `/api/health`**
- Check server status
- Response: `{ status: string, timestamp: string }`

## 🗄️ Database Schema

### Collections

**users**
```json
{
  "_id": "default-user",
  "totalEarned": 0,
  "totalUsed": 0,
  "tasksCompleted": 0,
  "timeEarned": 0,
  "timeUsed": 0
}
```

**tasks**
```json
{
  "_id": "uuid",
  "userId": "default-user",
  "description": "Task description",
  "reward": 5,
  "timeReward": 10,
  "completed": false,
  "createdAt": "ISO date",
  "completedAt": "ISO date"
}
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**
   - Connect your GitHub repository to Vercel
   - Choose the root directory (`tasks`) when prompted

2. **Set Environment Variables**
   In Vercel Dashboard → Project → Settings → Environment Variables, add:
   ```
   ASTRA_DB_APPLICATION_TOKEN = [your actual token]
   ASTRA_DB_API_ENDPOINT = [your actual endpoint]
   ASTRA_DB_KEYSPACE = default_keyspace  
   PORT = 3001
   ```

3. **Deploy**
   - Push changes to trigger automatic deployment
   - Or manually redeploy from Vercel dashboard

### Alternative Deployment Options

- **Netlify**: Deploy frontend to Netlify, backend to Railway/Render
- **Railway**: Full-stack deployment
- **Render**: Deploy both frontend and backend

## 🛠️ Development

### Project Structure

```
tasks/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── App.css        # Styling with glassmorphism
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js     # Vite configuration
├── server/                # Express backend  
│   ├── index.js          # Main server file
│   ├── .env.example      # Environment template
│   └── package.json
├── vercel.json           # Vercel deployment config
├── package.json          # Root package.json
└── README.md
```

### Scripts

```bash
# Development
npm run dev          # Run frontend and backend
npm run server       # Run backend only
npm run client       # Run frontend only

# Production
npm run build        # Build frontend for production
npm start           # Start production server
```

### Adding New Features

1. **Backend**: Add new endpoints in `server/index.js`
2. **Frontend**: Create new components in `client/src/`
3. **Database**: Collections are created automatically by Astra DB

## 🔧 Troubleshooting

### Common Issues

**"UNAUTHENTICATED: Invalid token"**
- Check environment variables are set correctly
- Verify Astra DB token is valid and has proper permissions

**"Port already in use"**  
- Kill processes using port 3001: `lsof -ti:3001 | xargs kill`
- Or change PORT in environment variables

**404 Deployment Not Found (Vercel)**
- Ensure environment variables are set in Vercel dashboard
- Check build logs for errors
- Verify vercel.json configuration

**Database collections missing**
- Collections are auto-created on first use
- Check Astra DB dashboard for collection status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Test locally
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- DataStax Astra DB for the cloud-native database
- React and Vite for the modern frontend framework
- Express.js for the robust backend framework

---

**Built with ❤️ for productivity and motivation** 