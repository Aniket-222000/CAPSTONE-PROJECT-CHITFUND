import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrash, FaEye, FaUserPlus, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface Group {
  _id: string;
  groupId: string;
  groupName: string;
  organizerId: string;
  description: string;
  participants: string[];
  totalAmount: number;
  duration: number;
  startDate: string;
  status: string;
}

interface Participant {
  userId: string;
  userName: string;
  userEmail: string;
  userMobileNum: string;
}

const GroupManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Check if user is admin
    if (user?.userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchGroups();
  }, [user, navigate]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3003/api/groups/all', {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      setGroups(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to fetch groups. Please try again later.');
      setLoading(false);
    }
  };

  const fetchParticipants = async (groupId: string) => {
    try {
      const response = await axios.get(`http://localhost:3003/api/groups/${groupId}/participants`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      setParticipants(response.data.participants);
      setShowParticipants(true);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to fetch participants. Please try again later.');
    }
  };

  const handleViewParticipants = (group: Group) => {
    setSelectedGroup(group);
    fetchParticipants(group.groupId);
  };

  const handleEditGroup = (group: Group) => {
    navigate(`/admin/groups/edit/${group.groupId}`, { state: { group } });
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await axios.delete(`http://localhost:3003/api/groups/${groupId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        });
        setGroups(groups.filter(group => group.groupId !== groupId));
      } catch (err) {
        console.error('Error deleting group:', err);
        setError('Failed to delete group. Please try again later.');
      }
    }
  };

  const handleCreateGroup = () => {
    navigate('/admin/groups/create');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.groupId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold text-gray-800">Group Management</h1>
        <button
          onClick={handleCreateGroup}
          className="bg-indigo-800 text-white px-4 py-2 rounded-md hover:bg-indigo-600 transition-colors"
        >
          Create New Group
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search by group name or ID..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div className="w-full md:w-1/2">
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            className="w-full p-2 border rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <tr key={group._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.groupId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.groupName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.participants.length}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{group.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.duration} months</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${group.status === 'active' ? 'bg-green-100 text-green-800' : 
                        group.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {group.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewParticipants(group)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Participants"
                      >
                        <span className="mr-1"><FaUsers /></span>
                      </button>
                      <button 
                        onClick={() => handleEditGroup(group)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Group"
                      >
                        <span className="mr-1"><FaEdit /></span>
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group.groupId)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Group"
                      >
                        <span className="mr-1"><FaTrash /></span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No groups found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Participants Modal */}
      {showParticipants && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Participants of {selectedGroup.groupName}
              </h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            {participants.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.userId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.userName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.userEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.userMobileNum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500">No participants in this group.</p>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowParticipants(false)}
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

export default GroupManagement;