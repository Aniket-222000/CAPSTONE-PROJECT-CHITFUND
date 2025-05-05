import { Request,Response } from "express";
import Group from "../models/groups";
import axios from "axios";

import { sendEmail } from '../utils/mailer';   // new added
import { logActivity } from '../utils/auditLogger';  //new added

export const createGroup = async (req:Request,res:Response) => {
    try {
        // If endDate is not provided, calculate it based on startDate and duration
        if (!req.body.endDate && req.body.startDate && req.body.duration) {
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + req.body.duration);
            req.body.endDate = endDate;
        }
        
        const group = new Group(req.body);
        const newGroup = await group.save();
        
        // Log activity
        logActivity('CREATE_GROUP', `Created group with ID: ${newGroup.groupId}`, req.body.userId || 'anonymous', newGroup.groupId);
        
        res.status(201).json(newGroup);
    } catch(error) {
        console.error('Error creating group:', error);
        res.status(400).json({message: error});
    }
}

export const getAllGroups = async (req:Request, res:Response) => {
    try{
        const groups = await Group.find();
        
        // Add status to each group
        const groupsWithStatus = groups.map(group => {
            const now = new Date();
            const startDate = (group as any).startDate ? new Date((group as any).startDate) : new Date(group.createdAt);
            const endDate = (group as any).endDate ? new Date((group as any).endDate) : (() => {
                const date = new Date(startDate);
                date.setMonth(date.getMonth() + group.duration);
                return date;
            })();
            
            let status = 'active';
            if (now < startDate) {
                status = 'pending';
            } else if (now > endDate) {
                status = 'closed';
            }
            
            return {
                ...group.toJSON(),
                status
            };
        });
        
        res.status(200).json(groupsWithStatus);
    }catch(error){
        res.status(400).json({message:error});
    }
}

export const placeBid = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId, bidAmount, month } = req.body;
    try {
      const group = await Group.findOne({ groupId });
      if (!group) {
        res.status(404).json({ message: 'Group not found' });
        return;
      }
  
      group.bids.push({ userId, bidAmount, month, timestamp: new Date() });
      await group.save();
  
      logActivity('PLACE_BID', `User ${userId} bid ₹${bidAmount} for month ${month}`, userId, groupId);
      res.status(200).json({ message: 'Bid placed successfully' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
  
  // 2. Run monthly draw and distribute commission
  export const runDraw = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { month } = req.body;
    try {
      const group = await Group.findOne({ groupId });
      if (!group) {
        res.status(404).json({ message: 'Group not found' });
        return;
      }
  
      const bids = group.bids.filter(b => b.month === month);
      if (bids.length === 0) {
        res.status(400).json({ message: 'No bids this month' });
        return;
      }
  
      const winner = bids.reduce((min, b) => b.bidAmount < min.bidAmount ? b : min, bids[0]);
      group.monthlyDraw[month - 1] = winner.userId;
  
      const diff = group.totalAmount - winner.bidAmount;
      const commissionAmount = group.totalAmount * (group.interest / 100);
      const pool = diff - commissionAmount;
      const perMember = pool / group.members;
  
      await group.save();
  
      logActivity('RUN_DRAW', `Month ${month} winner ${winner.userId}`, req.body.userId || 'system', groupId);
      
      try {
        // Get user email from users service
        const userResponse = await axios.get(`http://localhost:3002/api/users/${winner.userId}`);
        // Check if userEmail exists in the response data
        const userEmail = userResponse.data.userEmail || userResponse.data.email;
        
        if (userEmail) {
          await sendEmail(userEmail, 'You won the draw!', `Congrats! You won ₹${winner.bidAmount}`);
        } else {
          console.error('User email not found in response:', userResponse.data);
        }
      } catch (emailErr) {
        console.error('Error sending email notification:', emailErr);
        // Continue execution even if email fails
      }
  
      res.status(200).json({
        winner: { userId: winner.userId, bidAmount: winner.bidAmount },
        commission: commissionAmount,
        distribution: group.participants.map(u => ({ userId: u, amount: perMember })),
      });
    } catch (err: any) {
      console.error('Error in runDraw:', err);
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  };
  
  // 3. Record repayment
  export const repay = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId, month, amount } = req.body;
    try {
      const group = await Group.findOne({ groupId });
      if (!group) {
        res.status(404).json({ message: 'Group not found' });
        return;
      }
  
      group.contributions.push({ userId, month, amount, timestamp: new Date() });
      await group.save();
  
      logActivity('REPAY', `User ${userId} repaid ₹${amount} for month ${month}`, req.body.userId || 'system', groupId);
      res.status(200).json({ message: 'Contribution recorded' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
  
  // 4. Check warnings
  export const getWarnings = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.status(200).json(group.warnings);
  };
  
  // 5. Remove member after 3 warnings
  export const removeMember = async (req: Request, res: Response): Promise<void> => {
    const { groupId, userId } = req.params;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
  
    const warning = group.warnings.find(w => w.userId === userId);
    if (!warning || warning.count < 3) {
      res.status(400).json({ message: 'Insufficient warnings' });
      return;
    }
  
    group.participants = group.participants.filter(u => u !== userId);
    await group.save();
  
    logActivity('REMOVE_MEMBER', `User ${userId} removed`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: `Member ${userId} removed after 3 warnings` });
  };
  
  // 6. Lateral member request
  export const lateralRequest = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    group.lateralRequests.push(userId);
    await group.save();
  
    logActivity('LATERAL_REQUEST', `User ${userId} requested lateral join`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: 'Lateral–member join request sent' });
  };
  
  // 6b. Approve lateral member
  export const lateralApprove = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    group.lateralMembers.push({ userId, paidBackdated: false });
    group.lateralRequests = group.lateralRequests.filter(u => u !== userId);
    await group.save();
  
    const monthsFilled = group.monthlyDraw.length;
    const backdatedDue = monthsFilled * (group.totalAmount / group.members);
  
    logActivity('LATERAL_APPROVE', `User ${userId} approved with due ₹${backdatedDue}`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: 'Lateral member approved', backdatedDue });
  };
  
  // 6c. Back-dated payment
  export const lateralPayment = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId, amountPaid } = req.body;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    group.lateralMembers = group.lateralMembers.map(l =>
      l.userId === userId ? { ...l, paidBackdated: true } : l
    );
    group.contributions.push({ userId, month: 'backdated', amount: amountPaid, timestamp: new Date() });
    await group.save();
  
    logActivity('LATERAL_PAYMENT', `User ${userId} paid backdated ₹${amountPaid}`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: 'Back-dated payment recorded' });
  };
  
  // 7. Organizer compensation
  export const compensate = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { month, amount } = req.body;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    group.organizerCompensations.push({ month, amount, timestamp: new Date() });
    await group.save();
  
    logActivity('COMPENSATE', `Organizer compensated ₹${amount} for month ${month}`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: `Organizer compensated ₹${amount} for month ${month}` });
  };
  
  // 8. Adjust bid
  export const adjustBid = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { month, newBidAmount, userId } = req.body;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    const bid = group.bids.find(b => b.month === month && b.userId === userId);
    if (bid) {
      const old = bid.bidAmount;
      bid.bidAmount = newBidAmount;
      group.bidAdjustments.push({ month, oldAmount: old, newAmount: newBidAmount, timestamp: new Date() });
    }
    await group.save();
  
    logActivity('ADJUST_BID', `Bid adjusted to ₹${newBidAmount} for month ${month}`, req.body.userId || 'system', groupId);
    res.status(200).json({ message: `Bid for month ${month} adjusted to ₹${newBidAmount}` });
  };
  
  // 9. Get status
  export const getStatus = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    const balance = group.totalAmount - group.contributions.reduce((s, c) => s + c.amount, 0);
    res.status(200).json({
      participants: group.participants,
      warnings: group.warnings,
      penalties: group.penalties,
      lateralMembers: group.lateralMembers,
      balance
    });
  };
  
  // 10. Get history
  export const getHistory = async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    const history = group.monthlyDraw.map((winner, i) => ({
      month: i + 1,
      winner,
      distribution: group.participants.map(u => ({ userId: u, amount: null })),
      missedPayments: group.participants.filter(u =>
        !group.contributions.some(c => c.userId === u && c.month === i + 1)
      ),
      penalties: group.penalties.filter((p: any) => p.month === i + 1),
      warnings: group.warnings.filter(w => w.month === i + 1)
    }));
    res.status(200).json(history);
  };
  

export const getByGroupId = async (req: Request, res: Response) => {
  try {
    const group = await Group.findOne({ groupId: req.params.groupId });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Log group fetch activity
    logActivity('FETCH_GROUP', `Fetched group with ID: ${group.groupId}`, req.body.userId || 'anonymous', group.groupId);

    // Calculate status based on dates
    const now = new Date();
    const startDate = (group as any).startDate ? new Date((group as any).startDate) : new Date(group.createdAt);
    const endDate = (group as any).endDate ? new Date((group as any).endDate) : (() => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + group.duration);
        return date;
    })();
    
    let status = 'active';
    if (now < startDate) {
      status = 'pending';
    } else if (now > endDate) {
      status = 'closed';
    }

    // Include status in response
    const groupWithStatus = {
      ...group.toJSON(),
      status
    };

    res.status(200).json(groupWithStatus);
  } catch (error) {
    res.status(400).json({ message: error });
  }
};

  export const handleMissedPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId, userId, missedAmount } = req.body;
  
      const group = await Group.findOne({ groupId });
      if (!group) {
res.status(404).json({ message: 'Group not found' });
return;
      }
  
      // Calculate penalty (10% of missed amount, capped at ₹2000)
      const penaltyRate = 0.1;
      const penaltyCap = 2000;
      let penalty = missedAmount * penaltyRate;
      penalty = Math.min(penalty, penaltyCap);
  
      // Record penalty
      group.penalties.push({ userId, penalty });
      await group.save();
  
      // Log penalty activity
      logActivity(
        'PENALTY_APPLIED',
        `Applied penalty of ₹${penalty} to member ${userId} for missing ₹${missedAmount}`,
        (req.body.userId || 'anonymous'),
        groupId
      );
  
      // Fetch member and organizer data
      const memberResp = await axios.get(`http://localhost:3002/api/users/${userId}`);
      const member = memberResp.data;
      const organizerResp = await axios.get(`http://localhost:3002/api/users/${group.organizerId}`);
      const organizer = organizerResp.data;
  
      // Notify member
      await sendEmail(
        member.userEmail,
        'Chit Fund: Missed Payment Penalty',
        `Hello ${member.userName},\n\nYou missed your contribution of ₹${missedAmount}. A penalty of ₹${penalty} has been applied to your account.\n\nPlease pay at the earliest to avoid further action.`
      );
  
      // Notify organizer
      await sendEmail(
        organizer.userEmail,
        'Chit Fund Alert: Member Missed Payment',
        `Hello ${organizer.userName},\n\nMember ${member.userName} (ID: ${userId}) missed their contribution of ₹${missedAmount} and was penalized ₹${penalty}.`
      );
  
      res.status(200).json({ message: 'Penalty applied and notifications sent' });
    } catch (error: any) {
      console.error('Error in handleMissedPayment:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  };
  

export const updateGroup = async(req:Request,res:Response)=>{
    try{
        const group = await Group.findOneAndUpdate({groupId:req.params.groupId},req.body,{new:true});
        res.status(200).json(group);
    }catch(error){
        res.status(400).json({message:error});
    }
}

export const deleteGroup = async(req:Request,res:Response)=>{
    try{
        Group.deleteOne({groupName:req.params.groupName});
        res.status(200).json({message:"Deleted successfully"});
    }catch(error){
        res.status(400).json({message:error});
    }
} 

export const requestToJoinGroup = async (req: Request, res: Response) => {

    const { groupId ,userId } = req.body; // Assuming you send userId and groupId in the request body

    try {
        const group = await Group.findOne({ groupId });

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if the user has already requested to join
        if (group.joinRequests.some(request => request === userId)) {
            return res.status(400).json({ message: "Request already sent" });
        }

        // Add the request to the joinRequests array
        group.joinRequests.push(userId);
        await group.save();

        res.status(200).json({ message: "Join request sent successfully" });
    } catch (error) {
        res.status(400).json({ message: error });
    }
};

export const getAllRequests  = async (req: Request, res: Response) => {
    try {
        const group = await Group.findOne({ groupId: req.params.groupId });
        if(!group){
            return res.status(404).json({message:"Group not found"});
        }
        const requests = group.joinRequests;
        res.status(200).json(requests);
    }
    catch(error){
        res.status(400).json({message:error});
    }
}


export const addParticipant = async(req:Request, res:Response)=>{
    try{
        const group = await Group.findOne({groupId:req.params.groupId});
        if(!group){
            return res.status(404).json({message:"Group not found"});
        }
        console.log(req.params.userId);
        group.participants.push(req.params.userId);
        // Find the index of the request
        const requestIndex = group.joinRequests.findIndex(request => request === req.params.userId);
        if (requestIndex === -1) {
            return res.status(404).json({ message: "Join request not found" });
        }
        group.joinRequests.splice(requestIndex, 1);
        const updatedGroup = await group.save();
        res.status(200).json(updatedGroup);
    }catch(error){
        res.status(400).json({message:error});
    }
}



export const getParticipantsOfGroup = async (req: Request, res: Response) => {
    try {
        // Find the group by groupId
        const group = await Group.findOne({ groupId: req.params.groupId });
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // If there are no participants, return an empty array
        if (group.participants.length === 0) {
            return res.status(200).json({ participants: [] });
        }

        // Fetch participant details for each participant ID
        const participantPromises = group.participants.map(async (userId) => {
            console.log(userId);
            const response = await axios.get(`http://localhost:3002/api/users/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data; // Assuming the user data is returned in the response
        });

        // Resolve all promises
        const participantsDetails = await Promise.all(participantPromises);
        
        res.status(200).json({ participants: participantsDetails });
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(400).json("Failed to fetch participants");
    }
}

export const calculateChit = (req: Request, res: Response) => {
    const { totalAmount, months, members, commission } = req.body;

    // Validate inputs
    if (!totalAmount || !months || !members || totalAmount <= 0 || months <= 0 || members <= 0) {
        return res.status(400).json({ message: "Please enter valid values for all fields." });
    }

    const results: Array<any> = [];
    const Amount = totalAmount / members; // Amount paid monthly
    let interest = months / 200;
    let minAmount = totalAmount * (1 - interest); // Minimum bound (first person gets 70% of total)
    interest = 0;

    for (let month = 1; month <= months; month++) {
        interest += minAmount;
        const commissionAmount = (minAmount * commission) / 100;
        const amountGiven = minAmount - commissionAmount;

        results.push({
            month: month,
            amount: minAmount.toFixed(2),
            commission: commissionAmount.toFixed(2),
            amountGiven: amountGiven.toFixed(2),
        });

        minAmount += 0.01 * totalAmount; // Update minAmount for the next month
    }

    const totalProfit = totalAmount * months - interest;
    return res.status(200).json({ results, totalProfit });
};

export const getOrganizerOfGroup = async (req: Request, res: Response) => {
    try {
        const group = await Group.findOne({ groupId: req.params.groupId }).select('organizerId');
        console.log(group); // Select only the organizer field
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// Helper function to calculate chit details
const calculateChitDetails = (totalAmount: number, months: number, members: number, commission: number) => {
    const results: Array<any> = [];
    const Amount = totalAmount / members;
    let interest = months / 200;
    let minAmount = totalAmount * (1 - interest);
    interest = 0;

    for (let month = 1; month <= months; month++) {
        interest += minAmount;
        const commissionAmount = (minAmount * commission) / 100;
        const amountGiven = minAmount - commissionAmount;

        results.push({
            month: month,
            amount: minAmount.toFixed(2),
            commission: commissionAmount.toFixed(2),
            amountGiven: amountGiven.toFixed(2),
        });

        minAmount += 0.01 * totalAmount;
    }

    const totalProfit = totalAmount * months - interest;
    return { results, totalProfit };
};

export const displayMonthlyPlan = async (req: Request, res: Response) => {
    try {
        // Calculate monthly plan details using a helper function
        const group = await Group.findOne({ groupId: req.params.groupId });
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        const { createdAt, totalAmount, duration, interest } = req.body;
        const months = duration;

        if (!createdAt || !totalAmount || months <= 0 || totalAmount <= 0) {
            return res.status(400).json({ message: "Please provide valid values for groupId, createdAt, totalAmount, and months." });
        }
        const { results } = calculateChitDetails(totalAmount, months, months, interest);

        const monthlyDraw = group.monthlyDraw;
        const participantsResponse = await axios.get(`http://localhost:3003/api/groups/${req.params.groupId}/participants`);
        const userNames = participantsResponse.data.participants.map((participant: any) => participant.userName);

        // Shuffle usernames randomly
        const shuffledUserNames = userNames.sort(() => Math.random() - 0.5);

        if (monthlyDraw.length === 0) {
            // Loop through results and assign each month a unique user by cycling through the shuffled list
            for (let i = 0; i < results.length; i++) {
                monthlyDraw.push(shuffledUserNames[i % shuffledUserNames.length]);
            }
        }

        // Update the group with the monthlyDraw array
        const updatedGroup = await group.save();
        return res.status(200).json({ results, monthlyDraw });
    } 
    catch (error) {
        console.error("Error fetching participants or updating group:", error);
        return res.status(500).json({ message: "An error occurred while processing the request." });
    }
};

// export const displayMonthlyPlan = async (req: Request, res: Response) => {
//     const { groupId } = req.params; // Assuming groupId is passed as a URL parameter
//     const { createdAt, totalAmount, duration, interest } = req.body;
//     const months = duration;

//     if (!groupId || !createdAt || !totalAmount || months <= 0 || totalAmount <= 0) {
//         return res.status(400).json({ message: "Please provide valid values for groupId, createdAt, totalAmount, and months." });
//     }

//     try {
//         // Calculate monthly plan details using a helper function
//         const { results } = calculateChitDetails(totalAmount, months, months, interest);

//         // Fetch participants from group-service
//         const participantsResponse = await axios.get(`http://localhost:3003/api/groups/${groupId}/participants`);
//         const participants = participantsResponse.data.participants;
//         const userNames = participants.map((participant: any) => participant.userName);

//         // Shuffle usernames randomly
//         const shuffledUserNames = userNames.sort(() => Math.random() - 0.5);

//         // Create an array of userNames corresponding to each month
//         const monthlyDraw = [];
//         for (let i = 0; i < results.length; i++) {
//             monthlyDraw.push(shuffledUserNames[i % shuffledUserNames.length]); // Assign users to each month
//         }

//         console.log(monthlyDraw);

//         console.log(groupId);

//         // Update the group with the monthlyDraw array
//         const updatedGroup = await Group.findOneAndUpdate(
//             { groupId }, // Find the group by its ID
//             { monthlyDraw },   // Update the monthlyDraw field with userNames
//             { new: true }      // Return the updated document
//         );

//         return res.status(200).json({ results, monthlyDraw });
//     } catch (error) {
//         console.error("Error fetching participants or updating group:", error);
//         return res.status(500).json({ message: "An error occurred while processing the request." });
//     }
// };
