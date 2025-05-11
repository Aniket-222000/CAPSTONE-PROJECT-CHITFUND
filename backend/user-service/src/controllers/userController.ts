// import { Request, Response, RequestHandler } from 'express';
// import UserService from '../services/userService';
// import User from '../models/User';
// import axios from 'axios';

// const userService = new UserService();



// export const registerUser: RequestHandler = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const user = await userService.register(req.body);
//       console.log(user);
//       res.status(201).json(user);
//     } catch (error: any) {
//       const errorMessage = error.message;
  
//       if (errorMessage.includes('Email already exists')) {
//          res.status(400).json({ message: 'Email already exists' });
//       }
  
//       if (errorMessage.includes('Username already exists')) {
//          res.status(400).json({ message: 'Username already exists' });
//       }
  
//       res.status(500).json({ message: errorMessage });
//     }
//   };
  

// export const getAllUsers: RequestHandler = async (req: Request, res: Response) => {
//     try {
//         const users = await userService.getAllUsers();
//         res.status(200).json(users);
//     } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//         res.status(500).json({ message: errorMessage });
//     }
// };

// export const getUserById: RequestHandler = async (req: Request, res: Response) => {
//     try {
//         const user = await userService.getUserById(req.params.userId);
//         if (user) {
//             res.status(200).json(user);
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//         res.status(500).json({ message: errorMessage });
//     }
// };




// export const getUserByEmail: RequestHandler = async (req: Request, res: Response) => {
//   try {
//     //   const user = await userService.getUserByEmail(req.params.userEmail);
//     const user = await User.findOne({ userEmail: req.params.userEmail })
//                        .select('+password');
//       if (user) {
//           res.status(200).json(user);
//       } else {
//           res.status(404).json({ message: 'User not found' });
//       }
//   } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//       res.status(500).json({ message: errorMessage });
//   }
// };

// export const getListOfGroups = async(req:Request, res:Response)=>{
//   try{
//       const groups= await userService.getListofGroups(req.params.userEmail);
//       if(!groups){
//         res.status(404).json({message:"Group not found"});
//       }
//     //   console.log(groups);
//       res.status(200).json(groups);
//   }catch(error){
//       res.status(400).json({message:error});
//   }
// }

// export const editUserProfile: RequestHandler = async (req: Request, res: Response) => {
//     try {
//         const userEmail = req.params.userEmail; // Get userId from the URL parameters
//         const userData = req.body; // Get updated user data from the request body
        
//         // Update the user using the userService
//         const updatedUser = await userService.editUserProfile(userEmail, userData);
//         console.log(updatedUser);
//         // Return the updated user data
//         res.status(200).json(updatedUser);
//     } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//         res.status(500).json({ message: errorMessage });
//     }
// };

// export const respondToJoinRequest = async (req: Request, res: Response) => {
//     const { groupId, userId } = req.params; // Get the groupId and userId from the params
//     const { action } = req.body; // Expecting 'accept' or 'reject'

//     try {
//         // console.log(groupId,userId,action);
//         const user = await userService.respondToJoinRequest(groupId,userId,action);
//         res.status(200).json({ message: `Request ${action}ed successfully` });
//     } catch (error) {
//         res.status(400).json({ message: error });
//     }
// };

// export const addGroups = async  (req: Request, res: Response) => {
//     const {userEmail} = req.params;
//     const {groupId} = req.body;
//     try {
//         // console.log(groupId,userId,action);
//         const user = await userService.addGroup(groupId,userEmail);
//         res.status(200).json(user);
//     } catch (error) {
//         res.status(400).json({ message: error });
//     }
// }

// export const getIdByUserName: RequestHandler = async (req: Request, res: Response) => {
//     try {
//         const user = await userService.getIdByUserName(req.params.userName);
//         if (user) {
//             res.status(200).json(user);
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//         res.status(500).json({ message: errorMessage });
//     }
//   };

import { Request, Response } from 'express';
import UserService from '../services/userService';
import { sendEmail } from '../utils/mailer';
import { logActivity } from '../utils/auditLogger';

const service = new UserService();

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.register(req.body);
    logActivity('REGISTER_USER', `User registered: ${user.userId}`, user.userId);
    await sendEmail(user.userEmail, 'Welcome', `Hello ${user.userName}, welcome!`);
    res.status(201).json(user);
    return;
  } catch (err: any) {
    if (err.message.includes('exists')) { res.status(400).json({ message: err.message });return;};
    res.status(500).json({ message: err.message });
    return;
  }
};

export const getAllUsers = async (_: Request, res: Response): Promise<void> => {
  const users = await service.getAllUsers(); res.status(200).json(users);
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.getUserById(req.params.userId);
    if (!user) { res.status(404).json({ message: 'User not found' });return;}
    res.status(200).json(user);return;
  } catch { res.status(500).json({ message: 'Error fetching user' });return; }
};

export const getUserByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.getUserByEmail(req.params.userEmail);
    if (!user) { res.status(404).json({ message: 'User not found' });return;}
    res.status(200).json(user);return;
  } catch { res.status(500).json({ message: 'Error fetching user' }); return;}
};

export const getListOfGroups = async (req: Request, res: Response): Promise<void> => {
  const groups = await service.getListofGroups(req.params.userEmail);
  res.status(200).json(groups);
};

export const editUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await service.editUserProfile(req.params.userEmail, req.body);
    logActivity('EDIT_PROFILE', `Profile edited: ${updated.userId}`, updated.userId);
    await sendEmail(updated.userEmail, 'Profile Updated', `Your profile was updated.`);
    res.status(200).json(updated);
    return;
  } catch (err: any) {
    res.status(500).json({ message: err.message });
    return;
  }
};

export const respondToJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body.action);
    console.log(req.params.groupName);
    console.log(req.params.userId);
    const result = await service.respondToJoinRequest(req.params.groupName, req.params.userId, req.body.action);
    logActivity('JOIN_RESPONSE', `Request ${req.body.action} for user ${req.params.userId}`, req.params.userId, req.params.groupId);
    const user = await service.getUserById(req.params.userId);
    const userEmail = user?.userEmail;
    if (userEmail) {
        await sendEmail(userEmail, 'Join Request', `Your request was ${req.body.action}.`);
    }
    res.status(200).json({ message: 'Done' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const addGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.addGroup(req.body.groupId, req.params.userEmail);
    logActivity('ADD_GROUP', `Added to group ${req.body.groupId}`, user.userId, req.body.groupId);
    await sendEmail(user.userEmail, 'Added to Group', `You joined group ${req.body.groupId}.`);
    res.status(200).json(user);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const getIdByUserName = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = await service.getIdByUserName(req.params.userName);
    res.status(200).json({ userId: id });
  } catch { res.status(404).json({ message: 'User not found' }); }
};