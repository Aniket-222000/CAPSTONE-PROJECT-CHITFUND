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
    
    // Check if warnings array exists and has content
    if (!group.warnings || group.warnings.length === 0) {
      // Return empty array with proper structure instead of null
      res.status(200).json([]);
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
        
        // Find existing warning or create new one
        const existingWarning = group.warnings.find(w => w.userId === userId);
        if (existingWarning) {
          existingWarning.count = (existingWarning.count || 0) + 1;
        } else {
          group.warnings.push({ userId, count: 1, month: new Date().getMonth() + 1 });
        }
        
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

// export const calculateChit = (req: Request, res: Response) => {
//     const { totalAmount, months, members, commission } = req.body;

//     // Validate inputs
//     if (!totalAmount || !months || !members || totalAmount <= 0 || months <= 0 || members <= 0) {
//         return res.status(400).json({ message: "Please enter valid values for all fields." });
//     }

//     const results: Array<any> = [];
//     const Amount = totalAmount / members; // Amount paid monthly
//     let interest = months / 200;
//     let minAmount = totalAmount * (1 - interest); // Minimum bound (first person gets 70% of total)
//     interest = 0;

//     for (let month = 1; month <= months; month++) {
//         interest += minAmount;
//         const commissionAmount = (minAmount * commission) / 100;
//         const amountGiven = minAmount - commissionAmount;

//         results.push({
//             month: month,
//             amount: minAmount.toFixed(2),
//             commission: commissionAmount.toFixed(2),
//             amountGiven: amountGiven.toFixed(2),
//         });

//         minAmount += 0.01 * totalAmount; // Update minAmount for the next month
//     }

//     const totalProfit = totalAmount * months - interest;
//     return res.status(200).json({ results, totalProfit });
// };

// ... existing code ...

export const getParticipantMonthlySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, month,userId } = req.params;
    
    // Find the group
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    
    // Get all participants
    const participantIds = group.participants;
    
    // Prepare summary data for each participant
    const summaryPromises = participantIds.map(async (userId) => {
      try {
        // Get user details from user service
        const userResponse = await axios.get(`http://localhost:3002/api/users/${userId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        const userData = userResponse.data;
        
        // Check if user has paid for this month
        const hasPaid = group.contributions.some(
          c => c.userId === userId && c.month === parseInt(month)
        );
        
        // Get payment date if paid
        const payment = group.contributions.find(
          c => c.userId === userId && c.month === parseInt(month)
        );
        const datePaid = payment ? new Date(payment.timestamp).toISOString() : null;
        
        // Get warnings for this user
        const warningObj = group.warnings.find(w => w.userId === userId);
        const warningCount = warningObj ? warningObj.count : 0;
        
        // Calculate installment amount (total amount divided by duration)
        const installmentAmount = group.totalAmount / group.duration;
        
        // Calculate remaining balance
        // Sum all contributions by this user
        const totalPaid = group.contributions
          .filter(c => c.userId === userId)
          .reduce((sum, c) => sum + c.amount, 0);
        
        // Total expected payment up to this month
        const expectedPayment = installmentAmount * parseInt(month);
        
        // Remaining balance
        const remainingBalance = expectedPayment - totalPaid;
        
        return {
          userId,
          userName: userData.userName,
          hasPaid,
          datePaid,
          warningCount,
          installmentAmount,
          remainingBalance: remainingBalance > 0 ? remainingBalance : 0
        };
      } catch (error) {
        console.error(`Error fetching data for user ${userId}:`, error);
        return {
          userId,
          userName: "Unknown",
          hasPaid: false,
          datePaid: null,
          warningCount: 0,
          installmentAmount: group.totalAmount / group.duration,
          remainingBalance: group.totalAmount / group.duration
        };
      }
    });
    
    const summaryData = await Promise.all(summaryPromises);
    
    res.status(200).json({
      groupId,
      month,
      participants: summaryData
    });
    
  } catch (error) {
    console.error('Error generating participant monthly summary:', error);
    res.status(500).json({ 
      message: 'Failed to generate monthly summary',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

export const getParticipantMonthlySummaryByUserId = async (req: Request, res: Response) => {
  try {
    const { groupId, month, userId } = req.params;
    
    // Find the group
    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is a participant in the group
    if (!group.participants.includes(userId)) {
      return res.status(404).json({ message: "User is not a participant in this group" });
    }
    
    // Get user details
    const userResponse = await axios.get(`http://localhost:3002/api/users/${userId}`);
    const user = userResponse.data;
    
    // Get payment records for this month
    const paymentRecords = group.contributions || [];
    const monthlyRecords = paymentRecords.filter(record => 
      record.month === parseInt(month) && record.userId === userId
    );
    
    // Get warnings for this user
    const warnings = group.warnings || [];
    const userWarnings = warnings.filter(warning => warning.userId === userId);
    
    // Calculate installment amount
    const installmentAmount = group.totalAmount / group.duration;
    
    // Check if user has paid for this month
    const hasPaid = monthlyRecords.length > 0;
    const datePaid = hasPaid ? monthlyRecords[0].timestamp : null;
    
    // Calculate remaining balance
    const remainingBalance = hasPaid ? 0 : installmentAmount;
    
    const participantSummary = {
      userId: user._id,
      userName: user.userName,
      hasPaid,
      datePaid,
      warningCount: userWarnings.length,
      installmentAmount: parseFloat(installmentAmount.toFixed(2)),
      remainingBalance: parseFloat(remainingBalance.toFixed(2))
    };
    
    res.status(200).json({
      groupId,
      month,
      participant: participantSummary
    });
    
  } catch (error) {
    console.error('Error fetching participant monthly summary:', error);
    res.status(500).json({ message: "Failed to fetch participant monthly summary" });
  }
};
// ... existing code ...

export const calculateChit = async (req: Request, res: Response) => {
  try {
      const { totalAmount, months, members, commission } = req.body;
      const { groupId } = req.params;

      // Validate inputs
      if (!totalAmount || !months || !members || !commission || 
          totalAmount <= 0 || months <= 0 || members <= 0 || commission <= 0) {
          return res.status(400).json({ message: "Please enter valid values for all fields." });
      }

      // Fetch bid amount from the API
      const drawResponse = await axios.get(`http://localhost:3003/api/groups/${groupId}/draw`);
      
      if (!drawResponse.data || !drawResponse.data.winner || !drawResponse.data.winner.bidAmount) {
          return res.status(400).json({ message: "Could not retrieve bid amount from draw API." });
      }

      const bidAmount = drawResponse.data.winner.bidAmount;

      // Check if bid amount is less than total amount
      if (bidAmount >= totalAmount) {
          return res.status(400).json({ message: "Bid amount must be less than the fund value." });
      }

      // Calculate the difference between fund value and bid amount
      const totalDifference = totalAmount - bidAmount;
      
      // Calculate commission amount
      const totalCommission = (commission * totalDifference) / 100;
      
      // Calculate net amount to be distributed among members
      const netAmount = totalDifference - totalCommission;
      
      // Calculate individual share for each member
      const individualShare = netAmount / members;

      // Prepare the results
      const results = {
          fundValue: totalAmount,
          bidAmount: bidAmount,
          totalDifference: totalDifference,
          commissionPercentage: commission,
          totalCommission: totalCommission,
          netAmountDistributed: netAmount,
          numberOfMembers: members,
          individualShare: individualShare
      };

      return res.status(200).json(results);
  } catch (error) {
      console.error('Error calculating chit fund distribution:', error);
      return res.status(500).json({ 
          message: "Failed to calculate chit fund distribution", 
          error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
  }
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

// ... existing code ...

// ======================== for pdf report ===================
// // Add this import at the top
// import PDFDocument from 'pdfkit';
// import fs from 'fs';
// import path from 'path';

// // Add this new controller function
// export const generateReport = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { groupId } = req.params;
//     const { reportType, userId } = req.body;
    
//     // Find the group
//     const group = await Group.findOne({ groupId });
//     if (!group) {
//       res.status(404).json({ message: 'Group not found' });
//       return;
//     }
    
//     // Create a PDF document
//     const doc = new PDFDocument();
//     const fileName = `${groupId}_${reportType}_${Date.now()}.pdf`;
//     const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
    
//     // Ensure temp directory exists
//     if (!fs.existsSync(path.join(__dirname, '..', '..', 'temp'))) {
//       fs.mkdirSync(path.join(__dirname, '..', '..', 'temp'), { recursive: true });
//     }
    
//     // Pipe the PDF to a file
//     doc.pipe(fs.createWriteStream(filePath));
    
//     // Add content based on report type
//     doc.fontSize(25).text('Digital Fund Management System', { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(18).text(`${group.groupName} - ${reportType} Report`, { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
//     doc.moveDown();
    
//     // Different content based on report type
//     switch (reportType) {
//       case 'monthly-plan':
//         await addMonthlyPlanContent(doc, group);
//         break;
//       case 'transactions':
//         await addTransactionsContent(doc, group, userId);
//         break;
//       case 'member-status':
//         await addMemberStatusContent(doc, group);
//         break;
//       default:
//         doc.text('Invalid report type specified');
//     }
    
//     // Finalize the PDF
//     doc.end();
    
//     // Wait for the file to be created
//     setTimeout(() => {
//       // Send the file
//       res.download(filePath, fileName, (err) => {
//         if (err) {
//           console.error('Error sending file:', err);
//           res.status(500).json({ message: 'Error generating report' });
//         }
        
//         // Delete the file after sending
//         fs.unlink(filePath, (unlinkErr) => {
//           if (unlinkErr) console.error('Error deleting temporary file:', unlinkErr);
//         });
//       });
      
//       // Log activity
//       logActivity(
//         'GENERATE_REPORT',
//         `Generated ${reportType} report for group ${groupId}`,
//         req.body.userId || 'system',
//         groupId
//       );
//     }, 1000);
//   } catch (error: any) {
//     console.error('Error generating report:', error);
//     res.status(500).json({ message: error.message || 'Internal server error' });
//   }
// };

// // Helper functions for different report types
// async function addMonthlyPlanContent(doc: PDFKit.PDFDocument, group: any) {
//   doc.fontSize(16).text('Monthly Plan Details', { underline: true });
//   doc.moveDown();
  
//   // Calculate monthly plan if needed
//   const { results } = calculateChitDetails(group.totalAmount, group.duration, group.members, group.interest);
  
//   // Create a table-like structure
//   doc.fontSize(12);
//   doc.text('Month', 50, doc.y, { width: 100 });
//   doc.text('Amount', 150, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('Commission', 250, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('Amount Given', 350, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('Assigned User', 450, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.moveDown();
  
//   // Add a line
//   doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
//   doc.moveDown();
  
//   // Add each month's data
//   results.forEach((entry: any, index: number) => {
//     const userName = group.monthlyDraw[index] || 'N/A';
//     doc.text(entry.month, 50, doc.y, { width: 100 });
//     doc.text(entry.amount.toString(), 150, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.text(entry.commission.toString(), 250, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.text(entry.amountGiven.toString(), 350, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.text(userName, 450, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.moveDown();
//   });
// }

// async function addTransactionsContent(doc: PDFKit.PDFDocument, group: any, userId?: string) {
//   doc.fontSize(16).text('Transaction History', { underline: true });
//   doc.moveDown();
  
//   // Fetch transactions
//   let url = `http://localhost:3000/api/transactions/find/group/${group.groupId}`;
//   if (userId) {
//     url = `http://localhost:3000/api/transactions/find/user/${userId}?groupId=${group.groupId}`;
//   }
  
//   const response = await axios.get(url, {
//     headers: { 'Content-Type': 'application/json' }
//   });
  
//   const transactions = response.data;
  
//   // Create a table-like structure
//   doc.fontSize(12);
//   doc.text('Date', 50, doc.y, { width: 100 });
//   doc.text('Amount', 150, doc.y - doc.currentLineHeight(), { width: 80 });
//   doc.text('Type', 230, doc.y - doc.currentLineHeight(), { width: 80 });
//   doc.text('From', 310, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('To', 410, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.moveDown();
  
//   // Add a line
//   doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
//   doc.moveDown();
  
//   // Add each transaction
//   if (transactions.length === 0) {
//     doc.text('No transactions found');
//   } else {
//     transactions.forEach((transaction: any) => {
//       const date = new Date(transaction.transactionDate).toLocaleDateString();
//       doc.text(date, 50, doc.y, { width: 100 });
//       doc.text(transaction.transactionAmount.toString(), 150, doc.y - doc.currentLineHeight(), { width: 80 });
//       doc.text(transaction.transactionType, 230, doc.y - doc.currentLineHeight(), { width: 80 });
//       doc.text(transaction.transactionFrom, 310, doc.y - doc.currentLineHeight(), { width: 100 });
//       doc.text(transaction.transactionTo, 410, doc.y - doc.currentLineHeight(), { width: 100 });
//       doc.moveDown();
//     });
//   }
// }

// async function addMemberStatusContent(doc: PDFKit.PDFDocument, group: any) {
//   doc.fontSize(16).text('Member Status Report', { underline: true });
//   doc.moveDown();
  
//   // Fetch participants
//   const participantsResponse = await axios.get(`http://localhost:3003/api/groups/${group.groupId}/participants`, {
//     headers: { 'Content-Type': 'application/json' }
//   });
  
//   const participants = participantsResponse.data.participants;
  
//   // Create a table-like structure
//   doc.fontSize(12);
//   doc.text('Member Name', 50, doc.y, { width: 150 });
//   doc.text('Payments Made', 200, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('Warnings', 300, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.text('Penalties', 400, doc.y - doc.currentLineHeight(), { width: 100 });
//   doc.moveDown();
  
//   // Add a line
//   doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
//   doc.moveDown();
  
//   // Add each member's data
//   for (const participant of participants) {
//     // Count payments
//     const payments = group.contributions.filter((c: any) => c.userId === participant.userId).length;
    
//     // Get warnings
//     const warning = group.warnings.find((w: any) => w.userId === participant.userId);
//     const warningCount = warning ? warning.count : 0;
    
//     // Get penalties
//     const penalties = group.penalties.filter((p: any) => p.userId === participant.userId);
//     const penaltyTotal = penalties.reduce((sum: number, p: any) => sum + p.penalty, 0);
    
//     doc.text(participant.userName, 50, doc.y, { width: 150 });
//     doc.text(payments.toString(), 200, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.text(warningCount.toString(), 300, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.text(penaltyTotal.toString(), 400, doc.y - doc.currentLineHeight(), { width: 100 });
//     doc.moveDown();
//   }
// }

// ... existing code ...
///===========================================================

// Add these imports at the top
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
// axios is already imported at the top of the file

// Utility functions for better PDF formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// PDF Table Creation Helper
class PDFTable {
  private doc: PDFKit.PDFDocument;
  private options: any;
  private currentY: number;
  private rowHeight: number;
  private columns: { header: string, width: number, property: string, align?: string }[];
  private startX: number;
  private pageWidth: number;
  private tableWidth: number;
  private headerFilled: boolean;

  constructor(doc: PDFKit.PDFDocument, options: any = {}) {
    this.doc = doc;
    this.options = {
      padding: 10,
      headerFillColor: '#eeeeee',
      rowFillColor: '#f9f9f9',
      headerTextColor: '#333333',
      textColor: '#444444',
      alternateRowFillColor: '#ffffff',
      lineColor: '#dddddd',
      fontSize: 10,
      headerFontSize: 10,
      ...options
    };
    this.currentY = doc.y;
    this.rowHeight = this.options.rowHeight || 25;
    this.columns = [];
    this.startX = 50;
    this.pageWidth = doc.page.width - 100;
    this.tableWidth = this.pageWidth;
    this.headerFilled = false;
  }

  addColumns(columns: Array<{ header: string, width: number, property: string, align?: string }>) {
    this.columns = columns;
    this.tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    return this;
  }

  drawHeader() {
    // Add a title space before the header
    this.currentY = this.doc.y + 5;
    
    // Draw header background
    this.doc
      .rect(this.startX, this.currentY, this.tableWidth, this.rowHeight)
      .fill(this.options.headerFillColor);
    
    // Draw header text
    this.doc.fillColor(this.options.headerTextColor).fontSize(this.options.headerFontSize);
    
    let xPos = this.startX;
    this.columns.forEach(column => {
      const textOptions = { 
        width: column.width, 
        align: column.align || 'left' 
      };
      
      this.doc.text(
        column.header, 
        xPos + this.options.padding, 
        this.currentY + this.options.padding,
        { 
          width: column.width,
          align: column.align as 'left' | 'right' | 'center' | 'justify'
        }
      );
      
      xPos += column.width;
    });
    
    this.currentY += this.rowHeight;
    this.headerFilled = true;
    return this;
  }

  addRow(data: any, isAlternate: boolean = false) {
    // Check if we need to add a new page
    if (this.currentY + this.rowHeight > this.doc.page.height - 50) {
      this.doc.addPage();
      this.currentY = 50; // Reset Y position for new page
      
      // Re-draw header on new page
      if (this.headerFilled) {
        this.drawHeader();
      }
    }
    
    // Draw row background
    const fillColor = isAlternate ? this.options.alternateRowFillColor : this.options.rowFillColor;
    this.doc
      .rect(this.startX, this.currentY, this.tableWidth, this.rowHeight)
      .fill(fillColor);
    
    // Draw row text
    this.doc.fillColor(this.options.textColor).fontSize(this.options.fontSize);
    
    let xPos = this.startX;
    this.columns.forEach(column => {
      const value = data[column.property] !== undefined ? data[column.property].toString() : '';
      const textOptions = { 
        width: column.width, 
        align: column.align || 'left' 
      };
      
      this.doc.text(
        value, 
        xPos + this.options.padding, 
        this.currentY + this.options.padding,
{ 
  width: column.width,
  align: column.align as 'left' | 'right' | 'center' | 'justify'
}
      );
      
      xPos += column.width;
    });
    
    // Draw bottom border
    this.doc
      .moveTo(this.startX, this.currentY + this.rowHeight)
      .lineTo(this.startX + this.tableWidth, this.currentY + this.rowHeight)
      .strokeColor(this.options.lineColor)
      .stroke();
    
    this.currentY += this.rowHeight;
    return this;
  }

  addRows(dataRows: any[]) {
    dataRows.forEach((row, index) => {
      this.addRow(row, index % 2 === 0);
    });
    return this;
  }

  end() {
    this.doc.y = this.currentY + 10;
    return this;
  }
}

// Add document styling helper
const addDocumentStyling = (doc: PDFKit.PDFDocument, group: any, reportType: string) => {
  // Add logo placeholder
  doc.rect(50, 50, 100, 60).fillColor('#eeeeee').fill();
  doc.fillColor('#999999').fontSize(10).text('LOGO', 75, 75, { align: 'center' });
  
  // Add header
  doc.fillColor('#333333');
  doc.fontSize(18).text('Digital Fund Management System', 170, 50);
  doc.fontSize(12).text(`${group.groupName}`, 170, 75);
  doc.fontSize(14).text(`${reportType.toUpperCase()} REPORT`, 170, 95);
  
  // Add report info box
  doc.rect(400, 50, 150, 60).fillColor('#f9f9f9').fill();
  doc.fillColor('#666666').fontSize(9);
  doc.text('Report Generated:', 410, 55);
  doc.fillColor('#333333').fontSize(10);
  doc.text(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }), 410, 70);
  doc.fillColor('#666666').fontSize(9);
  doc.text('Group ID:', 410, 85);
  doc.fillColor('#333333').fontSize(10);
  doc.text(group.groupId, 410, 100);
  
  // Add separator line
  doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#dddddd').stroke();
  
  // Reset position for content
  doc.y = 150;
  
  return doc;
};

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { reportType, userId } = req.body;
    
    // Find the group
    const group = await Group.findOne({ groupId });
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    
    // Create a PDF document with better font and margins
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      info: {
        Title: `${group.groupName} - ${reportType} Report`,
        Author: 'Digital Fund Management System',
        Subject: `${reportType} Report for Group ${groupId}`
      }
    });
    
    const fileName = `${group.groupName.replace(/\s+/g, '_')}_${reportType}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'temp'))) {
      fs.mkdirSync(path.join(__dirname, '..', '..', 'temp'), { recursive: true });
    }
    
    // Pipe the PDF to a file
    doc.pipe(fs.createWriteStream(filePath));
    
    // Add document styling
    addDocumentStyling(doc, group, reportType);
    
    // Add page numbers after generating all content and before doc.end()
    // Different content based on report type
    switch (reportType) {
      case 'monthly-plan':
        await addMonthlyPlanContent(doc, group);
        break;
      case 'transactions':
        await addTransactionsContent(doc, group, userId);
        break;
      case 'member-status':
        await addMemberStatusContent(doc, group);
        break;
      default:
        doc.text('Invalid report type specified');
    }
    
    // Add page numbers to all pages
    const pageCount = doc.bufferedPageRange().count;
    if (pageCount > 0) {
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#aaaaaa').text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
        // Add footer
        doc.fontSize(8).fillColor('#999999')
          .text('© Digital Fund Management System. This is a computer-generated document and does not require a signature.',
            50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
      }
    }
    // Finalize the PDF
    doc.end();
    
    // Wait for the file to be created
    setTimeout(() => {
      // Send the file
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ message: 'Error generating report' });
        }
        
        // Delete the file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temporary file:', unlinkErr);
        });
      });
      
      // Log activity
      logActivity(
        'GENERATE_REPORT',
        `Generated ${reportType} report for group ${groupId}`,
        req.body.userId || 'system',
        groupId
      );
    }, 1000);
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Helper functions for different report types
async function addMonthlyPlanContent(doc: PDFKit.PDFDocument, group: any) {
  // Add report description
  doc.fontSize(11).fillColor('#666666')
    .text('This report shows the monthly plan details for this group, including the distribution of funds and assigned members.', 
          { align: 'justify' });
  doc.moveDown();
  
  // Add report summary
  doc.fontSize(12).fillColor('#333333');
  doc.text('Summary Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444444');
  doc.text(`Total Amount: ${formatCurrency(group.totalAmount)}`, { continued: true });
  doc.text(`   Duration: ${group.duration} months`, { continued: true });
  doc.text(`   Members: ${group.members}`, { continued: true });
  doc.text(`   Interest Rate: ${group.interest}%`);
  doc.moveDown(2);
  
  // Calculate monthly plan if needed
  const { results } = calculateChitDetails(group.totalAmount, group.duration, group.members, group.interest);
  
  // Create a table for monthly plan
  doc.fontSize(14).fillColor('#333333');
  doc.text('Monthly Distribution Plan', { underline: true });
  doc.moveDown();
  
  const table = new PDFTable(doc, {
    headerFillColor: '#4472C4',
    headerTextColor: '#ffffff',
    rowFillColor: '#E9EDF7',
    alternateRowFillColor: '#ffffff',
    lineColor: '#BFBFBF'
  });
  
  table.addColumns([
    { header: 'Month', property: 'month', width: 60, align: 'center' },
    { header: 'Contribution', property: 'amount', width: 90, align: 'right' },
    { header: 'Commission', property: 'commission', width: 90, align: 'right' },
    { header: 'Amount Given', property: 'amountGiven', width: 100, align: 'right' },
    { header: 'Assigned Member', property: 'userName', width: 150, align: 'left' }
  ])
  .drawHeader();
  
  // Add each month's data
  const tableData = results.map((entry: any, index: number) => ({
    month: entry.month,
    amount: formatCurrency(entry.amount),
    commission: formatCurrency(entry.commission),
    amountGiven: formatCurrency(entry.amountGiven),
    userName: group.monthlyDraw[index] || 'Not Assigned'
  }));
  
  table.addRows(tableData).end();
  
  // Add summary notes
  doc.moveDown();
  doc.fontSize(10).fillColor('#666666');
  // doc.text('Note: This plan is subject to change based on member participation and timely payments.', { align: 'left', italics: true });
}

async function addTransactionsContent(doc: PDFKit.PDFDocument, group: any, userId?: string) {
  // Add report description
  doc.fontSize(11).fillColor('#666666');
  if (userId) {
    doc.text(`This report shows the transaction history for user ID ${userId} in group "${group.groupName}".`, 
          { align: 'justify' });
  } else {
    doc.text(`This report shows the full transaction history for group "${group.groupName}".`, 
          { align: 'justify' });
  }
  doc.moveDown();
  
  // Fetch transactions
  let url = `http://localhost:3000/api/transactions/find/group/${group.groupId}`;
  if (userId) {
    url = `http://localhost:3000/api/transactions/find/user/${userId}?groupId=${group.groupId}`;
  }
  
  const response = await axios.get(url, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const transactions = response.data;
  
  // Add report summary
  doc.fontSize(12).fillColor('#333333');
  doc.text('Transaction Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444444');
  doc.text(`Total Transactions: ${transactions.length}`, { continued: true });
  
  if (transactions.length > 0) {
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + t.transactionAmount, 0);
    doc.text(`   Total Amount: ${formatCurrency(totalAmount)}`);
  } else {
    doc.text('');
  }
  doc.moveDown(2);
  
  // Create a table for transactions
  doc.fontSize(14).fillColor('#333333');
  doc.text('Transaction Details', { underline: true });
  doc.moveDown();
  
  const table = new PDFTable(doc, {
    headerFillColor: '#4472C4',
    headerTextColor: '#ffffff',
    rowFillColor: '#E9EDF7',
    alternateRowFillColor: '#ffffff',
    lineColor: '#BFBFBF'
  });
  
  table.addColumns([
    { header: 'Date', property: 'date', width: 80, align: 'left' },
    { header: 'Trans. ID', property: 'id', width: 70, align: 'center' },
    { header: 'Amount', property: 'amount', width: 80, align: 'right' },
    { header: 'Type', property: 'type', width: 80, align: 'center' },
    { header: 'From', property: 'from', width: 100, align: 'left' },
    { header: 'To', property: 'to', width: 100, align: 'left' }
  ])
  .drawHeader();
  
  // Add transaction data
  if (transactions.length === 0) {
    doc.text('No transactions found for the specified criteria.');
  } else {
    // Sort transactions by date (newest first)
    transactions.sort((a: any, b: any) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
    
    const tableData = transactions.map((transaction: any, index: number) => ({
      date: formatDate(transaction.transactionDate),
      id: transaction.transactionId ? transaction.transactionId.slice(-6) : String(index + 1),
      amount: formatCurrency(transaction.transactionAmount),
      type: transaction.transactionType,
      from: transaction.transactionFrom || '-',
      to: transaction.transactionTo || '-'
    }));
    
    table.addRows(tableData).end();
  }
  
  // Add notes
  doc.moveDown();
  doc.fontSize(10).fillColor('#666666');
  // doc.text('Note: All transaction times are recorded in your local timezone.', { align: 'left', italics: true });
}

async function addMemberStatusContent(doc: PDFKit.PDFDocument, group: any) {
  // Add report description
  doc.fontSize(11).fillColor('#666666')
    .text(`This report provides a detailed status of all members in the group "${group.groupName}", including their payment history and compliance status.`, 
          { align: 'justify' });
  doc.moveDown();
  
  // Fetch participants
  const participantsResponse = await axios.get(`http://localhost:3003/api/groups/${group.groupId}/participants`, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const participants = participantsResponse.data.participants;
  
  // Add report summary
  doc.fontSize(12).fillColor('#333333');
  doc.text('Group Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444444');
  doc.text(`Total Members: ${participants.length}`, { continued: true });
  doc.text(`   Active Since: ${formatDate(group.createdAt || Date.now())}`, { continued: true });
  doc.text(`   Current Cycle: ${group.currentCycle || 1}/${group.duration}`);
  doc.moveDown(2);
  
  // Create a table for member status
  doc.fontSize(14).fillColor('#333333');
  doc.text('Member Status Details', { underline: true });
  doc.moveDown();
  
  const table = new PDFTable(doc, {
    headerFillColor: '#4472C4',
    headerTextColor: '#ffffff',
    rowFillColor: '#E9EDF7',
    alternateRowFillColor: '#ffffff',
    lineColor: '#BFBFBF'
  });
  
  table.addColumns([
    { header: 'Member Name', property: 'name', width: 130, align: 'left' },
    { header: 'Role', property: 'role', width: 70, align: 'center' },
    { header: 'Payments Made', property: 'payments', width: 60, align: 'center' },
    { header: 'On Time %', property: 'onTimePercent', width: 60, align: 'center' },
    { header: 'Warnings', property: 'warnings', width: 60, align: 'center' },
    { header: 'Penalties ($)', property: 'penalties', width: 70, align: 'right' },
    { header: 'Status', property: 'status', width: 60, align: 'center' }
  ])
  .drawHeader();
  
  // Prepare and add member data
  const tableData = [];
  for (const participant of participants) {
    // Count payments
    const payments = group.contributions.filter((c: any) => c.userId === participant.userId).length;
    
    // Calculate on-time percentage
    const onTimePayments = group.contributions.filter(
      (c: any) => c.userId === participant.userId && c.onTime === true
    ).length;
    const onTimePercent = payments > 0 ? Math.round((onTimePayments / payments) * 100) : 0;
    
    // Get warnings
    const warning = group.warnings.find((w: any) => w.userId === participant.userId);
    const warningCount = warning ? warning.count : 0;
    
    // Get penalties
    const penalties = group.penalties.filter((p: any) => p.userId === participant.userId);
    const penaltyTotal = penalties.reduce((sum: number, p: any) => sum + p.penalty, 0);
    
    // Determine status
    let status = 'Good';
    if (warningCount >= 3) status = 'At Risk';
    if (penaltyTotal > 0) status = 'Penalized';
    
    // Determine role
    const role = participant.userId === group.groupAdmin ? 'Admin' : 'Member';
    
    tableData.push({
      name: participant.userName,
      role: role,
      payments: payments.toString(),
      onTimePercent: `${onTimePercent}%`,
      warnings: warningCount.toString(),
      penalties: formatCurrency(penaltyTotal),
      status: status
    });
  }
  
  table.addRows(tableData).end();
  
  // Add explanation of statuses
  doc.moveDown(2);
  doc.fontSize(12).fillColor('#333333');
  doc.text('Status Explanation', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444444');
  doc.text('• Good: Member is in compliance with group rules and payments.');
  doc.text('• At Risk: Member has received 3 or more warnings for late payments.');
  doc.text('• Penalized: Member has incurred financial penalties due to rule violations.');
  
  // Add notes
  doc.moveDown();
  doc.fontSize(10).fillColor('#666666');
  // doc.text('Note: Group administrators may take action on members with "At Risk" or "Penalized" status according to group bylaws.', 
  //         { align: 'left', italics: true });
}
