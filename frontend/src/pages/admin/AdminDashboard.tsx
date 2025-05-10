import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUsers, FaUsersCog, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';

interface DashboardStats {
  totalUsers: number;
  totalGroups: number;
  totalTransactions: number;
  totalAmount: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGroups: 0,
    totalTransactions: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Fetch users count
        const usersResponse = await axios.get('http://localhost:3000/api/users/all', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        // Fetch groups count
        const groupsResponse = await axios.get('http://localhost:3000/api/groups/all', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        // Fetch transactions
        const transactionsResponse = await axios.get('http://localhost:3000/api/transactions/all', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        // Calculate total amount from transactions
        const totalAmount = transactionsResponse.data.reduce(
          (sum: number, transaction: any) => sum + transaction.transactionAmount, 
          0
        );
        
        setStats({
          totalUsers: usersResponse.data.length,
          totalGroups: groupsResponse.data.length,
          totalTransactions: transactionsResponse.data.length,
          totalAmount
        });
        
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to fetch dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-2xl font-semibold text-blue-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <FaUsers className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="text-gray-500 text-sm">Total Users</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <FaUsersCog className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="text-gray-500 text-sm">Total Groups</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.totalGroups}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <FaMoneyBillWave className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="text-gray-500 text-sm">Total Transactions</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.totalTransactions}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <FaChartLine className="text-yellow-600 text-xl" />
            </div>
            <div>
              <h3 className="text-gray-500 text-sm">Total Amount</h3>
              <p className="text-2xl font-bold text-gray-800">${stats.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Quick Access Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button 
            onClick={() => navigate('/admin/users')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg shadow-md transition duration-200"
          >
            Manage Users
          </button>
          
          <button 
            onClick={() => navigate('/admin/groups')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg shadow-md transition duration-200"
          >
            Manage Groups
          </button>
          
          <button 
            onClick={() => navigate('/admin/transactions')}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg shadow-md transition duration-200"
          >
            View Transactions
          </button>
          
          <button 
            onClick={() => navigate('/admin/statistics')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg shadow-md transition duration-200"
          >
            System Statistics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;