import cron from 'node-cron';
import axios from 'axios';
import Group from '../models/groups';
import { logActivity } from '../utils/auditLogger';
import { sendEmail } from '../utils/mailer';

/**
 * Service to handle scheduled tasks like checking for missed payments
 */
export class ScheduledTasksService {
  /**
   * Initialize all scheduled tasks
   */
  public initTasks(): void {
    // Run every day at midnight (0 0 * * *)
    // For testing, you can use a more frequent schedule like every minute: '* * * * *'
    cron.schedule('0 0 * * *', async () => {
      console.log('Running scheduled task: Check for missed payments');
      await this.checkMissedPayments();
    });
  }

  /**
   * Check for missed payments across all active groups
   */
  private async checkMissedPayments(): Promise<void> {
    try {
      // Get all active groups
      const groups = await Group.find({ status: { $ne: 'closed' } });
      
      for (const group of groups) {
        await this.processMissedPaymentsForGroup(group);
      }
      
      console.log(`Completed missed payment check for ${groups.length} groups`);
    } catch (error) {
      console.error('Error in checkMissedPayments:', error);
    }
  }

  /**
   * Process missed payments for a specific group
   */
  private async processMissedPaymentsForGroup(group: any): Promise<void> {
    try {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const currentYear = new Date().getFullYear();
      
      // Get expected payment date for current month
      const paymentDueDate = this.getPaymentDueDate(group, currentMonth, currentYear);
      
      // If payment due date hasn't passed yet, skip
      if (new Date() < paymentDueDate) {
        return;
      }
      
      // Check each participant for missed payment
      for (const userId of group.participants) {
        // Check if user has made payment for current month
        const hasPaid = group.contributions.some((c: any) => 
          c.userId === userId && c.month === currentMonth && c.year === currentYear
        );
        
        if (!hasPaid) {
          await this.applyPenaltyForMissedPayment(group, userId);
        }
      }
    } catch (error) {
      console.error(`Error processing missed payments for group ${group.groupId}:`, error);
    }
  }

  /**
   * Get the payment due date for a specific month
   */
  private getPaymentDueDate(group: any, month: number, year: number): Date {
    // Default to 5th of each month if not specified in group settings
    const paymentDay = group.paymentDay || 5;
    return new Date(year, month - 1, paymentDay);
  }

  /**
   * Apply penalty for missed payment
   */
  private async applyPenaltyForMissedPayment(group: any, userId: string): Promise<void> {
    try {
      // Calculate missed amount (monthly contribution amount)
      const missedAmount = group.contributionAmount;
      
      // Calculate penalty (10% of missed amount, capped at ₹2000)
      const penaltyRate = 0.1;
      const penaltyCap = 2000;
      let penalty = missedAmount * penaltyRate;
      penalty = Math.min(penalty, penaltyCap);
      
      // Record penalty
      group.penalties.push({ 
        userId, 
        penalty,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        date: new Date(),
        reason: 'Missed payment'
      });
      
      // Find existing warning or create new one
      const existingWarning = group.warnings.find((w: any) => w.userId === userId);
      if (existingWarning) {
        existingWarning.count = (existingWarning.count || 0) + 1;
      } else {
        group.warnings.push({ 
          userId, 
          count: 1, 
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
      }
      
      await group.save();
      
      // Log penalty activity
      logActivity(
        'PENALTY_APPLIED_AUTO',
        `Automatically applied penalty of ₹${penalty} to member ${userId} for missing ₹${missedAmount}`,
        'system',
        group.groupId
      );
      
      // Fetch member and organizer data
      try {
        const memberResp = await axios.get(`http://localhost:3002/api/users/${userId}`);
        const member = memberResp.data;
        const organizerResp = await axios.get(`http://localhost:3002/api/users/${group.organizerId}`);
        const organizer = organizerResp.data;
        
        // Notify member
        await sendEmail(
          member.userEmail,
          'Chit Fund: Missed Payment Penalty',
          `Hello ${member.userName},\n\nYou missed your contribution of ₹${missedAmount} for ${group.groupName}. A penalty of ₹${penalty} has been automatically applied to your account.\n\nPlease pay at the earliest to avoid further action.`
        );
        
        // Notify organizer
        await sendEmail(
          organizer.userEmail,
          'Chit Fund Alert: Member Missed Payment',
          `Hello ${organizer.userName},\n\nMember ${member.userName} (ID: ${userId}) missed their contribution of ₹${missedAmount} for ${group.groupName} and was automatically penalized ₹${penalty}.`
        );
      } catch (error) {
        console.error('Error sending notifications:', error);
        // Continue even if notifications fail
      }
    } catch (error) {
      console.error(`Error applying penalty for user ${userId} in group ${group.groupId}:`, error);
    }
  }
}

export default new ScheduledTasksService();