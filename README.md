# 🎯 Task & Reward Tracker

A full-stack web application for tracking tasks and managing reward points, built with Node.js, React, and Astra DB.

## ✨ Features

- **Task Management**: Add tasks with custom reward point values
- **Progress Tracking**: Mark tasks as completed to earn points
- **Reward System**: Spend earned points on custom rewards
- **Dashboard**: View earnings, spending, and current balance
- **Data Persistence**: All data stored securely in Astra DB
- **Modern UI**: Beautiful, responsive design with glassmorphism effects

## 🏗️ Architecture

- **Backend**: Node.js with Express.js REST API
- **Frontend**: React with Vite
- **Database**: DataStax Astra DB (Document API)
- **Styling**: Modern CSS with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- DataStax Astra DB account

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-reward-tracker
```

### 2. Set Up Astra DB

1. Create a free account at [DataStax Astra](https://astra.datastax.com/)
2. Create a new database
3. Generate an Application Token
4. Note your Database API Endpoint

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cd server
cp env.example .env
```

Edit `.env` with your Astra DB credentials:

```env
ASTRA_DB_APPLICATION_TOKEN=your-astra-db-application-token-here
ASTRA_DB_API_ENDPOINT=https://your-db-id-region.apps.astra.datastax.com
PORT=5000
```

### 4. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 5. Run the Application

From the root directory:

```bash
# Run both frontend and backend concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Tasks

**GET `/tasks`**
- Get all tasks for a user
- Query params: `userId` (optional, defaults to 'default-user')
- Response: Array of task objects

**POST `/tasks`**
- Create a new task
- Body: `{ description: string, reward: number, userId?: string }`
- Response: Created task object

**POST `/tasks/:id/complete`**
- Mark a task as completed
- Body: `{ userId?: string }`
- Response: Updated task object

#### Rewards

**GET `/rewards/summary`**
- Get reward summary for a user
- Query params: `userId` (optional)
- Response: `{ totalEarned, totalUsed, balance, user }`

**POST `/rewards/use`**
- Spend reward points
- Body: `{ amount: number, description?: string, userId?: string }`
- Response: Spend confirmation with new balance

#### Health Check

**GET `/health`**
- Check server status
- Response: `{ status: string, timestamp: string }`

## 🗄️ Database Schema

### Collections

**users**
```json
{
  "_id": "user123",
  "name": "Alice",
  "totalEarned": 150,
  "totalUsed": 40
}
```

**tasks**
```json
{
  "_id": "task456",
  "userId": "user123",
  "description": "Do math homework",
  "reward": 10,
  "completed": false,
  "createdAt": "2023-12-01T12:00:00.000Z",
  "completedAt": "2023-12-01T13:00:00.000Z"
}
```

## 🚀 Deployment

### Vercel Deployment

1. **Prepare for deployment:**
   ```bash
   npm run build
   ```

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables in Vercel dashboard:**
   - `ASTRA_DB_APPLICATION_TOKEN`
   - `ASTRA_DB_API_ENDPOINT`

### Alternative Deployment Options

- **Netlify**: Deploy frontend to Netlify, backend to Railway/Render
- **Railway**: Full-stack deployment
- **Render**: Deploy both frontend and backend

## 🛠️ Development

### Project Structure

```
task-reward-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── App.css        # Styling
│   │   └── main.jsx       # React entry point
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json
├── server/                # Node.js backend
│   ├── index.js          # Express server
│   ├── env.example       # Environment variables template
│   └── package.json
├── package.json          # Root package configuration
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

**Connection Error to Astra DB**
- Verify your Application Token is correct
- Check that your API Endpoint URL is properly formatted
- Ensure your database is active in the Astra dashboard

**Frontend Can't Connect to Backend**
- Verify the backend server is running on port 5000
- Check the proxy configuration in `vite.config.js`

**CORS Issues**
- The server includes CORS middleware for all origins
- For production, consider restricting CORS to specific domains

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- DataStax Astra DB for the cloud-native database
- React and Vite for the modern frontend framework
- Express.js for the robust backend framework

---

**Built with ❤️ for productivity and motivation** 