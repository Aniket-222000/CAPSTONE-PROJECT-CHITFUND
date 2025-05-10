// src/App.tsx
import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './context/AuthContext';
import Profile from './pages/profile';
import EditProfile from './pages/EditProfile';
import MyGroups from './pages/MyGroups';
import ChitPlans from './pages/ChitPlans';
import GroupDetails from './pages/GroupDetails';
import GroupTransactions from './pages/GroupTransactions';
import PlanDetails from './pages/PlanDetails';
import MyTransaction from './pages/MyTransactions';
import MonthlyTracker from './pages/MonthlyTracker';
import AddTransaction from './pages/AddTransaction';
import GroupForm from './pages/GroupForm';
import MonthlyPlan from './pages/MonthPlan';
import AddPayment from './pages/AddPayment';
// import PlanDetails1 from './pages/PlanDetails1';
import Footer from './components/Footer';
import MonthPlan from './pages/MonthPlan';
import ViewUserTransactions from './pages/ViewUserTransactions';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import GroupManagement from './pages/GroupManagement';
import SystemStatistics from './pages/SystemStatistics';
import TransactionMonitoring from './pages/TransactionMonitoring';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="flex flex-col min-h-screen">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/register" element={<RegistrationPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/editProfile" element={<EditProfile />} />
                        <Route path="/mygroups" element={<MyGroups />} />
                        <Route path="/chitplans" element={<ChitPlans />} />
                        <Route path="/groups/:groupId" element={<GroupDetails />} />
                        <Route path="/groups/:groupId/transactions" element={<GroupTransactions />} />
                        <Route path="/plan" element={<PlanDetails />} />
                        <Route path="/mytransactions" element={<MyTransaction />} />
                        <Route path="/groups/:groupId/installments" element={<MonthlyTracker />} />
                        <Route path="/groups/:groupId/users/:userId" element={<AddTransaction />} />
                        <Route path="/create-group" element={<GroupForm />} />
                        {/* <Route path="/plan-month" element={<PlanDetails1/>} /> */}
                        <Route path="/groups/:groupId/plan" element={<MonthlyPlan />} />
                        <Route path="/plan-month" element={<MonthPlan />} />
                        <Route path="/add-payment" element={<AddPayment />} />
                        <Route path="transactions/:groupId/:userId" element={<ViewUserTransactions />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<UserManagement />} />
                        <Route path="/admin/groups" element={<GroupManagement />} /> {/* Fixed closing tag here */}
                        <Route path="/admin/statistics" element={<SystemStatistics />} />
                        <Route path="/admin/transactions" element={<TransactionMonitoring />} />
                    </Routes>
                    <Footer />
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
