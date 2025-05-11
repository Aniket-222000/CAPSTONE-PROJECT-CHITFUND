import jwt from 'jsonwebtoken';
 import dotenv from 'dotenv';
 dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
export const verifyToken = (token: string) => {
    try {
        console.log('Verifying token:', token);
        console.log("secret key in api gateway",JWT_SECRET);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Verification successful');
        return decoded;
        
    } catch (error) {
        console.error("Verification failed:", error);
        throw new Error('Token verification failed');
        
    }
};