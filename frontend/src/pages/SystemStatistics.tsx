import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, 
  FaMoneyBillWave, 
  FaUserTie, 
  FaUserFriends,
  FaChartLine,
  FaExclamationTriangle
} from 'react-icons/fa';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SystemStats {
  totalUsers: number;
  totalGroups: number;
  totalTransactions: number;
  totalAmount: number;
  activeGroups: number;
  completedGroups: number;
  pendingGroups: number;
  usersByRole: {
    admin: number;
    organizer: number;
    participant: number;
  };
  transactionsByMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  groupsByStatus: {
    status: string;
    count: number;
  }[];
  recentTransactions: {
    transactionId: string;
    userId: string;
    userName: string;
    groupId: string;
    groupName: string;
    amount: number;
    type: string;
    date: string;
  }[];
  warningsByGroup: {
    groupId: string;
    groupName: string;
    warningCount: number;
  }[];
}

const SystemStatistics: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('month');

  useEffect(() => {
    // Check if user is admin
    if (user?.userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchStatistics();
  }, [user, navigate, timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3003/api/statistics?timeRange=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to fetch system statistics. Please try again later.');
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value);
  };

  // Prepare chart data
  const transactionChartData = {
    labels: stats?.transactionsByMonth.map(item => item.month) || [],
    datasets: [
      {
        label: 'Transaction Count',
        data: stats?.transactionsByMonth.map(item => item.count) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Transaction Amount (₹)',
        data: stats?.transactionsByMonth.map(item => item.amount) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };

  const groupStatusChartData = {
    labels: stats?.groupsByStatus.map(item => item.status) || [],
    datasets: [
      {
        label: 'Groups by Status',
        data: stats?.groupsByStatus.map(item => item.count) || [],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(53, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(53, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const userRoleChartData = {
    labels: ['Admin', 'Organizer', 'Participant'],
    datasets: [
      {
        label: 'Users by Role',
        data: stats ? [
          stats.usersByRole.admin,
          stats.usersByRole.organizer,
          stats.usersByRole.participant
        ] : [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Statistics</h1>
        <div className="flex items-center">
          <label htmlFor="timeRange" className="mr-2 text-gray-700">Time Range:</label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="p-2 border rounded-md"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800">
              <span className="text-2xl"><FaUsers /></span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 uppercase">Total Users</p>
              <p className="text-2xl font-semibold">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800">
              <span className="text-2xl"><FaUserFriends /></span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 uppercase">Total Groups</p>
              <p className="text-2xl font-semibold">{stats?.totalGroups || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800">
              <span className="text-2xl"><FaChartLine /></span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 uppercase">Total Transactions</p>
              <p className="text-2xl font-semibold">{stats?.totalTransactions || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800">
              <span className="text-2xl"><FaMoneyBillWave /></span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 uppercase">Total Amount</p>
              <p className="text-2xl font-semibold">₹{stats?.totalAmount?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Transaction Trends</h2>
          <div className="h-80">
            <Line 
              data={transactionChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Transaction Count'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                    title: {
                      display: true,
                      text: 'Amount (₹)'
                    }
                  },
                }
              }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Groups by Status</h2>
          <div className="h-80">
            <Pie 
              data={groupStatusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
          <div className="h-80">
            <Bar 
              data={userRoleChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  }
                }
              }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Warning Alerts by Group</h2>
          <div className="h-80 overflow-y-auto">
            {stats?.warningsByGroup && stats.warningsByGroup.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warning Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.warningsByGroup.map((group, index) => (
                    <tr key={index} className={group.warningCount > 5 ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.groupName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${group.warningCount > 5 ? 'bg-red-100 text-red-800' : 
                            group.warningCount > 2 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {group.warningCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <span className="text-3xl mb-2"><FaExclamationTriangle /></span>
                <p>No warning data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.transactionId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.groupName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{transaction.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${transaction.type === 'PAYMENT' ? 'bg-green-100 text-green-800' : 
                          transaction.type === 'WITHDRAWAL' ? 'bg-blue-100 text-blue-800' : 
                          transaction.type === 'PENALTY' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent transactions found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemStatistics;