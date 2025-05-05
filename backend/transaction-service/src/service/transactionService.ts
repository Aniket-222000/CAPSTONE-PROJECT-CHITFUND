// import axios from "axios";
// import transaction from "../models/transaction";

// export class TransactionService {
    
//     async getAllTransactions() {
//         return transaction.find({});
//     }

//     async getTransactionById(transactionId: string) {
//         return transaction.findOne({ transactionId });
//     }

//     async getTransactionsByUserId(userId: string) {
//         return transaction.find({ userId: userId });
//     }

//     async getTransactionsByGroupId(groupId: string) {
//         return transaction.find({ groupId: groupId });
//     }

//     async getTransactionsByType(transactionType: string) {
//         return transaction.find({ transactionType: transactionType });
//     }

//     // Utility function to generate a unique transaction ID
//     private generateTransactionId(): string {
//         return `txn_${Date.now()}_${Math.floor(Math.random() * 10000)}`; // Simple unique ID
//     }

//     async createTransaction(transactionData: any) {
//         const { userId, groupId, transactionAmount, transactionType, transactionDate, transactionFrom, transactionTo } = transactionData;
        
//         // Generate a unique transaction ID if not provided
//         const transactionId = transactionData.transactionId || this.generateTransactionId();

//         console.log("Transaction Data:", transactionData);
        
//         // Step 1: Create Debit Transaction for Participant
//         const debitTransaction = new transaction({
//             userId,
//             groupId,
//             transactionAmount,
//             transactionType: 'debit',
//             transactionDate,
//             transactionId: transactionId, // Use the generated or provided transaction ID
//             transactionFrom, // Added field for sender
//             transactionTo: transactionTo || '', // Default to empty if not provided
//         });
//         console.log("Debit Transaction:", debitTransaction);
//         await debitTransaction.save();

//         // Step 2: Fetch Organizer ID from Group Service
//         // const groupServiceUrl = `http://localhost:3003/api/groups/getOrganizer/${groupId}`; // Adjust the port and path as necessary
//         // const response = await axios.get(groupServiceUrl);
        
//         // if (!response.data.organizerId) {
//         //     throw new Error('Organizer not found for this group');
//         // }
//         // const organizerId = response.data.organizerId;
//         // console.log("Organizer ID:", organizerId);
        
//         // Step 3: Create Credit Transaction for Organizer
//         const creditTransaction = new transaction({
//             userId: transactionTo, // Organizer ID
//             groupId,
//             transactionAmount,
//             transactionType: 'credit',
//             transactionDate,
//             transactionId: this.generateTransactionId(), // Generate a new transaction ID for the credit transaction
//             transactionFrom: transactionFrom|| '', // Default to empty if not provided
//             transactionTo: transactionTo, // The organizer will be the recipient in the credit transaction
//         });
//         console.log("Credit Transaction:", creditTransaction);
//         await creditTransaction.save();

//         return { message: 'Transaction created successfully' };
//     }
// }

// export default TransactionService;

import dotenv from 'dotenv';
import axios from 'axios';
import TransactionModel, { ITransaction } from '../models/transaction';
import { sendEmail } from '../utils/mailer';
import { logActivity } from '../utils/auditLogger';

dotenv.config();

export class TransactionService {
  private groupsUrl = process.env.GROUPS_SERVICE_URL!;
  private usersUrl = process.env.USERS_SERVICE_URL!;

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async getAllTransactions(): Promise<ITransaction[]> {
    logActivity('FETCH_ALL_TXNS', 'Fetched all transactions', 'system', '');
    return TransactionModel.find({});
  }

  async getTransactionById(id: string): Promise<ITransaction | null> {
    logActivity('FETCH_TXN', `Fetched transaction ${id}`, 'system', '');
    return TransactionModel.findOne({ transactionId: id });
  }

  async getTransactionsByUserId(userId: string): Promise<ITransaction[]> {
    logActivity('FETCH_TXNS_USER', `Fetched transactions for user ${userId}`, userId, '');
    return TransactionModel.find({ userId });
  }

  async getTransactionsByGroupId(groupId: string): Promise<ITransaction[]> {
    logActivity('FETCH_TXNS_GROUP', `Fetched transactions for group ${groupId}`, 'system', groupId);
    return TransactionModel.find({ groupId });
  }

  async getTransactionsByType(type: string): Promise<ITransaction[]> {
    logActivity('FETCH_TXNS_TYPE', `Fetched transactions of type ${type}`, 'system', '');
    return TransactionModel.find({ transactionType: type });
  }

  async createTransaction(data: {
    userId: string;
    groupId: string;
    transactionAmount: number;
    transactionDate?: Date;
    transactionFrom: string;
  }): Promise<{ debit: ITransaction; credit: ITransaction }> {
    const { userId, groupId, transactionAmount, transactionDate, transactionFrom } = data;

    // Fetch organizer
    const grpRes = await axios.get(`${this.groupsUrl}/getOrganizer/${groupId}`);
    const organizerId = grpRes.data.organizerId;
    if (!organizerId) throw new Error('Organizer not found');

    const txDate = transactionDate || new Date();
    const debitId = this.generateTransactionId();
    const creditId = this.generateTransactionId();

    // Create debit
    const debit = await TransactionModel.create({
      transactionId: debitId,
      transactionAmount,
      transactionDate: txDate,
      transactionType: 'debit',
      userId,
      groupId,
      transactionFrom: userId,
      transactionTo: groupId,
    });
    logActivity('CREATE_DEBIT', `Created debit ${debitId}`, userId, groupId);

    // Create credit
    const credit = await TransactionModel.create({
      transactionId: creditId,
      transactionAmount,
      transactionDate: txDate,
      transactionType: 'credit',
      userId: organizerId,
      groupId,
      transactionFrom: groupId,
      transactionTo: organizerId,
    });
    logActivity('CREATE_CREDIT', `Created credit ${creditId}`, organizerId, groupId);

    // Notify user
    const userRes = await axios.get(`${this.usersUrl}/id/${userId}`);
    await sendEmail(userRes.data.userEmail, 'Contribution Received', `Your payment of ₹${transactionAmount} is recorded.`);

    // Notify organizer
    const orgRes = await axios.get(`${this.usersUrl}/id/${organizerId}`);
    await sendEmail(orgRes.data.userEmail, 'New Contribution', `User ${userRes.data.userName} paid ₹${transactionAmount}.`);

    return { debit, credit };
  }
}

export default TransactionService;