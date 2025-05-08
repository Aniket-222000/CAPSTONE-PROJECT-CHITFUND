// import axios from 'axios';
// import User from '../models/User';

// class UserService {

//   // async register(userData: any) {
//   //   const user = new User(userData);
//   //   // return user.save();
    
//   // }

//   async register(userData: any) {
//     // Check for duplicate email
//     const existingEmail = await User.findOne({ userEmail: userData.userEmail });
//     if (existingEmail) {
//       throw new Error('Email already exists');
//     }
  
//     // Check for duplicate username
//     const existingUsername = await User.findOne({ userName: userData.userName });
//     if (existingUsername) {
//       throw new Error('Username already exists');
//     }
  
//     const user = new User(userData);
//     return user.save();
//   }
  

//   async login(userEmail: string) {
//     return User.findOne({ userEmail });
//   }

//   async getAllUsers() {
//     return User.find({});
//   }

//   async getUserById(userId: string) {
//     return User.findOne({ userId });
//   }

//   // async getUserByEmail(userEmail: string) {
//   //   return User.findOne({ userEmail });
//   // }

//   async getUserByEmail(email: string) {
//     return User.findOne({ userEmail: email })
//                .select('+password');
//   }

//   async getUsernameById(userId: string) {
//     const user = await User.findById(userId).select('userName'); // Adjust the field name as per your schema
//     if (!user) {
//       throw new Error('User not found');
//     }
//     return user.userName;
//   }

//   async getListofGroups(userEmail: string) {
//     const userGroupIds = await User.findOne({ userEmail }).select("groupIds");
//     if (!userGroupIds) {
//       return null;
//     }
//     var result: String[] = [];
//     for (const element of userGroupIds.groupIds) {
//       try {
//         const response = await axios.get(`http://localhost:3003/api/groups/${element}`)
//         result.push(response.data);
//       } catch (error) {
//         console.log(error);
//       }
//     };
//     // console.log(result);
//     return result;
//   }
//   // Other methods as needed

//   async editUserProfile(userEmail: string, updatedData: any): Promise<any> {
//     try {
//       // Log the updated data for debugging purposes
//       console.log('Updated Data:', updatedData);

//       // Use findOneAndUpdate to find the user by email and update their information
//       const updatedUser = await User.findOneAndUpdate(
//         { userEmail: userEmail },
//         { $set: updatedData }, // Use $set to update only specified fields
//         { new: true, runValidators: true } // Return the updated document and run validators
//       );

//       // Check if a user was found and updated
//       if (!updatedUser) {
//         throw new Error('User not found');
//       }

//       return updatedUser; // Return the updated user document
//     } catch (error) {
//       console.error('Error updating user profile:', error);
//       throw new Error('Error updating user profile');
//     }
//   }

//   async respondToJoinRequest(groupId: string, userId: string, action: any) {
//     try {
//       // Accept the request
//       if (action === 'accept') {
//         const group = await axios.get(`http://localhost:3003/api/groups/${groupId}/participants/${userId}`);
//         const user = await this.getUserById(userId);
//         user?.groupIds.push(groupId);
//         const updatedUser = await user?.save();
//         return updatedUser;

//       } else {
//         // Reject the request
//         const response = await axios.get(`http://localhost:3003/api/groups/${groupId}`);
//         const group = response.data;
//         // Find the index of the request
//         const requestIndex = group.joinRequests.findIndex((req: string) => req === userId);
//         if (requestIndex != -1) {
//           group.joinRequests.splice(requestIndex, 1);
//           try {
//             const updatedGroup = await axios.put(`http://localhost:3003/api/groups/${groupId}`, group);
//             return updatedGroup;
//           }
//           catch(error){
//             console.error('Error rejecting join request:', error);
//           }
//         }
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   }

//   async addGroup(groupId: any, userEmail: string) {
//     try{
//     const user=  await this.getUserByEmail(userEmail);
//     if(!user){
//       throw new Error('User not found');
//     }
//     user.groupIds.push(groupId);
//     return user.save();
//   }
//   catch(error){
//     console.error('Error adding group:', error);
//   }
// }

// async getIdByUserName(userName: string): Promise<any | null> {
//   try {
//     // Find user by userName and select only the userId field
//     const user = await User.findOne({ userName }).select('userId');
    
//     if (!user) {
//       throw new Error('User not found');
//     }

//     // Return the userId
//     return user.userId;
//   } catch (error) {
//     console.error('Error fetching user ID by userName:', error);
//     throw new Error('Error fetching user ID');
//   }
// }


// }


// export default UserService;

import axios from 'axios';
import User from '../models/User';

export default class UserService {
  async register(data: any) {
    const { userEmail, userName } = data;
    if (await User.findOne({ userEmail })) throw new Error('Email already exists');
    if (await User.findOne({ userName })) throw new Error('Username already exists');
    const user = new User(data);
    return user.save();
  }

  async getAllUsers() { return User.find(); }
  async getUserById(id: string) { return User.findOne({ userId: id }).select('-password'); }
  async getUserByEmail(email: string) { return User.findOne({ userEmail: email }).select('+password'); }

  async getListofGroups(email: string) {
    const usr = await User.findOne({ userEmail: email }).select('groupIds');
    return usr?.groupIds ?? [];
  }

  async editUserProfile(email: string, update: any) {
    return User.findOneAndUpdate({ userEmail: email }, update, { new: true, runValidators: true }).orFail();
  }

  async respondToJoinRequest(groupName: string, userId: string, action: string) {
    try {
      if (action === 'accept') {
        // Add user to group participants via group service
        await axios.post(`http://localhost:3003/api/groups/${groupName}/participants`, { userId });

        // Add group to user's groupIds
        const user = await User.findOne({ userId });
        if (user && !user.groupIds.includes(groupName)) {
          user.groupIds.push(groupName);
          await user.save();
        }

        // Remove join request from group
        await axios.delete(`http://localhost:3003/api/groups/${groupName}/joinRequests/${userId}`);

        return { message: 'User added to group and join request accepted.' };
      } else if (action === 'reject') {
        // Remove join request from group
        await axios.delete(`http://localhost:3003/api/groups/${groupName}/joinRequests/${userId}`);
        return { message: 'Join request rejected and removed.' };
      } else {
        throw new Error('Invalid action');
      }
    } catch (error) {
      console.error('Error responding to join request:', error);
      throw error;
    }
  }

  async addGroup(groupId: string, email: string) {
    const usr = await User.findOne({ userEmail: email }); if (!usr) throw new Error('User not found');
    usr.groupIds.push(groupId);
    return usr.save();
  }

  async getIdByUserName(name: string) {
    const usr = await User.findOne({ userName: name }).select('userId');
    if (!usr) throw new Error('User not found');
    return usr.userId;
  }
}