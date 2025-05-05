// controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { sendEmail } from '../utils/mailer';
import { logActivity } from '../utils/auditLogger';
import env from 'dotenv';
env.config();

const USER_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3002/api/users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName, userEmail, password, userMobileNum, userAddress, userRole } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = { userName, userEmail, password: hashedPassword, userMobileNum, userAddress, userRole };

    // Create user via user-service
    const response = await axios.post(`${USER_SERVICE_URL}/register`, userData);

    if (response.status === 201) {
      // Audit and welcome email
      const savedUser = response.data;
      await logActivity('REGISTER_USER', `User registered: ${savedUser.userId}`, savedUser.userId);
      await sendEmail(
        savedUser.userEmail,
        'Welcome to Chit Fund System',
        `Hello ${savedUser.userName},\n\nThank you for registering!`
      );
       res.status(201).json({ message: 'User registered successfully' });
    } else {
       res.status(response.status).json({ message: response.data.message });
    }
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.message || 'Error registering user';
      const status = error.response?.status || 500;
      if (msg.includes('exists')) {
         res.status(400).json({ message: msg });
      }
       res.status(status).json({ message: msg });
    }
    console.error('Unexpected error in register:', error);
     res.status(500).json({ message: 'Unexpected server error' });
  }
};

// Login and generate JWT
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userEmail, password } = req.body;

    // Fetch user (including password) from user-service
    const response = await axios.get(`${USER_SERVICE_URL}/email/${userEmail}`);
    if (response.status !== 200) {
       res.status(response.status).json({ message: response.data.message });
    }
    const user = response.data;

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
       res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.userId, userEmail: user.userEmail, userRole: user.userRole },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Audit and login email
    await logActivity('USER_LOGIN', `User logged in: ${user.userId}`, user.userId);
    await sendEmail(
      user.userEmail,
      'New Login Notification',
      `Hello ${user.userName},\n\nYou have successfully logged in.`
    );

     res.status(200).json({ message: 'Login successful', token });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.message || 'Error during login';
      const status = error.response?.status || 500;
       res.status(status).json({ message: msg });
    }
    console.error('Unexpected error in login:', error);
     res.status(500).json({ message: 'Unexpected server error' });
  }
};
