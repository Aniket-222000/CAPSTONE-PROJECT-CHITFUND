import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage: React.FC = () => {
    const [formData, setFormData] = useState({ userEmail: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(formData.userEmail, formData.password);
            
            // Check if the user is an admin
            const userInfo = localStorage.getItem('userRole');
            if (userInfo !== 'admin') {
                setError('Access denied. Only admins can login here.');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userRole');
                return;
            }
            
            setSuccess(true);
            setError(null);

            setTimeout(() => {
                setSuccess(false);
                navigate('/admin/dashboard');
            }, 1000);
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            setSuccess(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-800 to-indigo-900">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Admin Login</h2>
                
                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">Login successful! Redirecting...</span>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2" htmlFor="userEmail">Email</label>
                        <input 
                            type="email" 
                            name="userEmail" 
                            id="userEmail" 
                            value={formData.userEmail} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2" htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            id="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-blue-700 text-white p-3 rounded-md hover:bg-blue-600 transition duration-200"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;