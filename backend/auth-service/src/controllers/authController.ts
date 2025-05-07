import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { sendEmail } from '../utils/mailer';
import { logActivity } from '../utils/auditLogger';
import dotenv from 'dotenv';

dotenv.config();

const USER_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3002/api/users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName, userEmail, password, userMobileNum, userAddress, userRole } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = { userName, userEmail, password: hashedPassword, userMobileNum, userAddress, userRole };
    const response = await axios.post(`${USER_SERVICE_URL}/register`, userData);

    if (response.status === 201) {
      const savedUser = response.data;
      await logActivity('REGISTER_USER', `User registered: ${savedUser.userId}`, savedUser.userId);
      await sendEmail(
        savedUser.userEmail,
        'Welcome to Chit Fund System',
        `Hello ${savedUser.userName},\n\nThank you for registering!`
      );
      res.status(201).json({ message: 'User registered successfully' });
      return;
    }

    res.status(response.status).json({ message: response.data.message });
    return;
  } catch (error: any) {
    console.error('Error in register:', error.message || error);
    if (axios.isAxiosError(error) && error.response) {
      const msg = error.response.data?.message || 'Error registering user';
      const status = error.response.status || 500;
      res.status(msg.includes('exists') ? 400 : status).json({ message: msg });
      return;
    }
    res.status(500).json({ message: 'Unexpected server error' });
    return;
  }
};

// Login and generate JWT
export const login = async (req: Request, res: Response): Promise<void> => {
  let user;
  try {
    const { userEmail, password } = req.body;
    // Fetch user (including password) from user-service
    const response = await axios.get(`${USER_SERVICE_URL}/email/${userEmail}`);
    user = response.data;
  } catch (err: any) {
    console.error('Error fetching user:', err.message || err);
    if (axios.isAxiosError(err) && err.response) {
      const msg = err.response.data?.message || 'Error during login';
      const status = err.response.status || 500;
      res.status(status).json({ message: msg });
      return;
    }
    res.status(500).json({ message: 'Error during login' });
    return;
  }

  try {
    const passwordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.userId, userEmail: user.userEmail, userRole: user.userRole },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    try {
      await logActivity('USER_LOGIN', `User logged in: ${user.userId}`, user.userId);
      await sendEmail(
        user.userEmail,
        'New Login Notification',
        `Hello ${user.userName},\n\nYou have successfully logged in.`
      );
    } catch (notifyErr) {
      console.error('Notification/audit error:', notifyErr);
      // don't block login on logging/email failure
    }

    res.status(200).json({ message: 'Login successful', token });
    return;
  } catch (error: any) {
    console.error('Error during login process:', error.message || error);
    res.status(500).json({ message: 'Unexpected server error' });
    return;
  }
};
