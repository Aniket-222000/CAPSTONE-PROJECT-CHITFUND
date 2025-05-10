import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaFileDownload, FaEye } from 'react-icons/fa';

interface Transaction {
  _id: string;
  transactionId: string;
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

interface TransactionDetails {
  transaction: Transaction;
  user: {
    userName: string;
    userEmail: string;
    userMobileNum: string;
  };
  group: {
    groupName: string;
    organizerId: string;
    organizerName: string;
  };
}

const TransactionMonitoring: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  useEffect(() => {
    // Check if user is admin
    if (user?.userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchTransactions();
  }, [user, navigate, page, typeFilter, statusFilter, dateRange]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      let queryParams = `?page=${page}&limit=10`;
      if (typeFilter !== 'all') queryParams += `&type=${typeFilter}`;
      if (statusFilter !== 'all') queryParams += `&status=${statusFilter}`;
      if (dateRange.start) queryParams += `&startDate=${dateRange.start}`;
      if (dateRange.end) queryParams += `&endDate=${dateRange.end}`;
      
      const response = await axios.get(`http://localhost:3004/api/transactions${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      
      setTransactions(response.data.transactions);
      setTotalPages(response.data.totalPages);
      setTotalTransactions(response.data.totalCount);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again later.');
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleViewDetails = async (transactionId: string) => {
    try {
      const response = await axios.get(`http://localhost:3004/api/transactions/${transactionId}/details`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      setSelectedTransaction(response.data);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setError('Failed to fetch transaction details. Please try again later.');
    }
  };

  const handleExportCSV = async () => {
    try {
      // Build query parameters for export
      let queryParams = '';
      if (typeFilter !== 'all') queryParams += `&type=${typeFilter}`;
      if (statusFilter !== 'all') queryParams += `&status=${statusFilter}`;
      if (dateRange.start) queryParams += `&startDate=${dateRange.start}`;
      if (dateRange.end) queryParams += `&endDate=${dateRange.end}`;
      
      const response = await axios.get(`http://localhost:3004/api/transactions/export?format=csv${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
        withCredentials: true,
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting transactions:', err);
      setError('Failed to export transactions. Please try again later.');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    return transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.groupName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transaction Monitoring</h1>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
        >
          <span className="mr-2"><FaFileDownload /></span>
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Transaction ID, User, Group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pr-10 border rounded-md"
              />
              <span className="absolute right-3 top-2.5 text-gray-400">
                <FaSearch />
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All Types</option>
              <option value="contribution">Contribution</option>
              <option value="payout">Payout</option>
              <option value="penalty">Penalty</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-1/2 p-2 border rounded-md"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-1/2 p-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="bg-indigo-800 text-white px-4 py-2 rounded-md hover:bg-indigo-600 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-800"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.transactionId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.groupName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${transaction.type === 'contribution' ? 'bg-blue-100 text-blue-800' : 
                          transaction.type === 'payout' ? 'bg-green-100 text-green-800' : 
                          transaction.type === 'penalty' ? 'bg-red-100 text-red-800' : 
                          'bg-purple-100 text-purple-800'}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleViewDetails(transaction.transactionId)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Details"
                      >
                        <span className="mr-1"><FaEye /></span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{transactions.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * 10, totalTransactions)}
                </span>{' '}
                of <span className="font-medium">{totalTransactions}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  &larr;
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border ${
                      page === i + 1
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } text-sm font-medium`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Transaction Details
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">Transaction Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">ID:</span> {selectedTransaction.transaction.transactionId}</p>
                  <p><span className="font-medium">Amount:</span> ₹{selectedTransaction.transaction.amount.toLocaleString()}</p>
                  <p><span className="font-medium">Type:</span> {selectedTransaction.transaction.type}</p>
                  <p><span className="font-medium">Status:</span> {selectedTransaction.transaction.status}</p>
                  <p><span className="font-medium">Date:</span> {new Date(selectedTransaction.transaction.createdAt).toLocaleString()}</p>
                  <p><span className="font-medium">Description:</span> {selectedTransaction.transaction.description}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">User Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedTransaction.user.userName}</p>
                  <p><span className="font-medium">Email:</span> {selectedTransaction.user.userEmail}</p>
                  <p><span className="font-medium">Mobile:</span> {selectedTransaction.user.userMobileNum}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Group Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Group Name:</span> {selectedTransaction.group.groupName}</p>
                  <p><span className="font-medium">Organizer:</span> {selectedTransaction.group.organizerName}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMonitoring;