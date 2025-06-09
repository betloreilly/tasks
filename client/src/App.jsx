import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = '/api'

function App() {
  const [tasks, setTasks] = useState([])
  const [rewardSummary, setRewardSummary] = useState({
    totalEarned: 0,
    totalUsed: 0,
    balance: 0,
    tasksCompleted: 0,
    timeEarned: 0,
    timeUsed: 0,
    timeBalance: 0
  })
  const [newTask, setNewTask] = useState({ description: '', reward: '', timeReward: '' })
  const [spendAmount, setSpendAmount] = useState('')
  const [spendDescription, setSpendDescription] = useState('')
  const [spendTime, setSpendTime] = useState('')
  const [timeActivity, setTimeActivity] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Fetch data on component mount
  useEffect(() => {
    fetchTasks()
    fetchRewardSummary()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks`)
      setTasks(response.data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      showMessage('Error fetching tasks', 'error')
    }
  }

  const fetchRewardSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE}/rewards/summary`)
      console.log('💰 Reward summary response:', response.data)
      setRewardSummary(response.data)
    } catch (error) {
      console.error('Error fetching reward summary:', error)
      showMessage('Error fetching reward summary', 'error')
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    
    if (!newTask.description) {
      showMessage('Please enter a task description', 'error')
      return
    }
    
    const pointReward = parseInt(newTask.reward) || 0
    const timeReward = parseInt(newTask.timeReward) || 0
    
    if (pointReward <= 0 && timeReward <= 0) {
      showMessage('Please enter at least one reward (points or time)', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/tasks`, newTask)
      setTasks([...tasks, response.data])
      setNewTask({ description: '', reward: '', timeReward: '' })
      showMessage('Task added successfully!')
    } catch (error) {
      console.error('Error adding task:', error)
      showMessage(error.response?.data?.error || 'Error adding task', 'error')
    }
    setLoading(false)
  }

  const handleCompleteTask = async (taskId) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/tasks/${taskId}/complete`, {})
      setTasks(tasks.map(task => 
        task._id === taskId ? response.data : task
      ))
      await fetchRewardSummary()
      showMessage('Task completed! Points earned!')
    } catch (error) {
      console.error('Error completing task:', error)
      showMessage(error.response?.data?.error || 'Error completing task', 'error')
    }
    setLoading(false)
  }

  const handleSpendRewards = async (e) => {
    e.preventDefault()
    if (!spendAmount || spendAmount <= 0) {
      showMessage('Please enter a valid amount', 'error')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API_BASE}/rewards/use`, {
        amount: parseInt(spendAmount),
        description: spendDescription || 'Reward spent'
      })
      await fetchRewardSummary()
      setSpendAmount('')
      setSpendDescription('')
      showMessage('Points spent successfully!')
    } catch (error) {
      console.error('Error spending rewards:', error)
      showMessage(error.response?.data?.error || 'Error spending rewards', 'error')
    }
    setLoading(false)
  }

  const handleSpendTime = async (e) => {
    e.preventDefault()
    if (!spendTime || spendTime <= 0) {
      showMessage('Please enter a valid time amount', 'error')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API_BASE}/rewards/use-time`, {
        minutes: parseInt(spendTime),
        activity: timeActivity || 'Free time'
      })
      await fetchRewardSummary()
      setSpendTime('')
      setTimeActivity('')
      showMessage(`Successfully spent ${spendTime} minutes on ${timeActivity || 'free time'}!`)
    } catch (error) {
      console.error('Error spending time:', error)
      showMessage(error.response?.data?.error || 'Error spending time', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎯 Task & Reward Tracker</h1>
          <p>Complete tasks, earn points, spend rewards!</p>
        </header>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Reward Summary */}
        <div className="summary-card">
          <h2>💰 Your Rewards & Progress</h2>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Tasks Completed</span>
              <span className="stat-value completed">×{rewardSummary.tasksCompleted}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Points Earned</span>
              <span className="stat-value earned">+{rewardSummary.totalEarned}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Points Balance</span>
              <span className="stat-value balance">{rewardSummary.balance}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Time Earned</span>
              <span className="stat-value time-earned">+{rewardSummary.timeEarned}m</span>
            </div>
            <div className="stat">
              <span className="stat-label">Time Balance</span>
              <span className="stat-value time-balance">{rewardSummary.timeBalance}m</span>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* Add New Task */}
          <div className="card">
            <h2>➕ Add New Task</h2>
            <form onSubmit={handleAddTask}>
              <input
                type="text"
                placeholder="Task description (e.g., Read a book)"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="input"
              />
              <div className="reward-inputs">
                <input
                  type="number"
                  placeholder="Points reward (optional)"
                  value={newTask.reward}
                  onChange={(e) => setNewTask({...newTask, reward: e.target.value})}
                  className="input reward-input"
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Time reward in minutes (optional)"
                  value={newTask.timeReward}
                  onChange={(e) => setNewTask({...newTask, timeReward: e.target.value})}
                  className="input reward-input"
                  min="1"
                />
              </div>
              <p className="helper-text">* At least one reward (points or time) is required.</p>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </form>
          </div>

          {/* Task List */}
          <div className="card">
            <h2>📋 Your Tasks</h2>
            <div className="task-list">
              {tasks.length === 0 ? (
                <p className="empty-state">No tasks yet. Add your first task!</p>
              ) : (
                tasks.map(task => (
                  <div key={task._id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-content">
                      <span className="task-description">{task.description}</span>
                      <div className="task-rewards">
                        {task.reward > 0 && (
                          <span className="task-reward points">+{task.reward} pts</span>
                        )}
                        {task.timeReward > 0 && (
                          <span className="task-reward time">+{task.timeReward}m</span>
                        )}
                      </div>
                    </div>
                    {!task.completed ? (
                      <button
                        onClick={() => handleCompleteTask(task._id)}
                        disabled={loading}
                        className="btn btn-success"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="completed-badge">✅ Done</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Spend Rewards */}
          <div className="card">
            <h2>💸 Spend Points</h2>
            <form onSubmit={handleSpendRewards}>
              <input
                type="number"
                placeholder="Points to spend"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                className="input"
                min="1"
                max={rewardSummary.balance}
              />
              <input
                type="text"
                placeholder="What are you buying? (optional)"
                value={spendDescription}
                onChange={(e) => setSpendDescription(e.target.value)}
                className="input"
              />
              <button type="submit" disabled={loading || rewardSummary.balance <= 0} className="btn btn-secondary">
                {loading ? 'Spending...' : 'Spend Points'}
              </button>
              {rewardSummary.balance <= 0 && (
                <p className="hint">Complete tasks to earn points first!</p>
              )}
            </form>
          </div>

          {/* Spend Time */}
          <div className="card">
            <h2>⏰ Spend Time</h2>
            <form onSubmit={handleSpendTime}>
              <input
                type="number"
                placeholder="Minutes to spend"
                value={spendTime}
                onChange={(e) => setSpendTime(e.target.value)}
                className="input"
                min="1"
                max={rewardSummary.timeBalance}
              />
              <input
                type="text"
                placeholder="Activity (e.g., Watch TV, Play games)"
                value={timeActivity}
                onChange={(e) => setTimeActivity(e.target.value)}
                className="input"
              />
              <button type="submit" disabled={loading || rewardSummary.timeBalance <= 0} className="btn btn-time">
                {loading ? 'Spending...' : 'Spend Time'}
              </button>
              {rewardSummary.timeBalance <= 0 && (
                <p className="hint">Complete tasks to earn time first!</p>
              )}
            </form>
          </div>
        </div>

        {/* All Tasks History */}
        <div className="history-section">
          <h2>📊 Task History</h2>
          <div className="task-table">
            {tasks.length === 0 ? (
              <p className="empty-state">No tasks yet. Add your first task!</p>
            ) : (
              <div className="table-container">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Points</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task._id} className={task.completed ? 'completed-row' : 'pending-row'}>
                        <td className="task-desc">{task.description}</td>
                        <td className="task-points">{task.reward > 0 ? `+${task.reward} pts` : '-'}</td>
                        <td className="task-time">{task.timeReward > 0 ? `+${task.timeReward}m` : '-'}</td>
                        <td className="task-status">
                          {task.completed ? (
                            <span className="status-badge completed">✅ Completed</span>
                          ) : (
                            <span className="status-badge pending">⏳ Pending</span>
                          )}
                        </td>
                        <td className="task-date">
                          {new Date(task.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="task-date">
                          {task.completedAt ? (
                            new Date(task.completedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          ) : (
                            <span className="not-completed">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 