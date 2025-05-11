import { Router } from "express";
import { placeBid, runDraw, repay, getWarnings, removeMember,
    lateralRequest, lateralApprove, lateralPayment,
    compensate, adjustBid, getStatus, getHistory,createGroup,getAllGroups,getParticipantMonthlySummaryByUserId, getParticipantMonthlySummary, getByGroupId,handleMissedPayment,updateGroup,deleteGroup, addParticipant, getParticipantsOfGroup, requestToJoinGroup, getAllRequests, calculateChit, getOrganizerOfGroup, displayMonthlyPlan, 
    generateReport} from "../controllers/grpController";



const router = Router();

router.post('/missed-payment', handleMissedPayment); // Route for handling missed payment

router.post('/',createGroup)

router.get('/all', getAllGroups);

router.get('/:groupId',getByGroupId as any);

router.put('/:groupId', updateGroup);

router.delete('/:groupName', deleteGroup);

router.get('/:groupName/participants/:userId', addParticipant as any);

router.post('/request',requestToJoinGroup as any);

router.get('/:groupId/requests',getAllRequests as any)

router.get('/:groupName/participants', getParticipantsOfGroup as any);

// New chit-fund features
router.post('/:groupId/bid', placeBid);
router.post('/:groupId/draw', runDraw);
router.post('/:groupId/repay', repay);
router.get('/:groupId/warnings', getWarnings);
router.delete('/:groupId/members/:userId', removeMember);

router.post('/:groupId/lateral/request', lateralRequest);
router.post('/:groupId/lateral/approve', lateralApprove);
router.post('/:groupId/lateral/payment', lateralPayment);

router.post('/:groupId/organizer/compensate', compensate);
router.post('/:groupId/organizer/adjust-bid', adjustBid);

router.get('/:groupId/status', getStatus);
router.get('/:groupId/history', getHistory);

// Utility & chit calculation
router.post('/calculateChit', calculateChit as any);
router.get('/getOrganizer/:groupId', getOrganizerOfGroup as any);
router.post('/:groupId/plan', displayMonthlyPlan as any);

// Add this route
router.post('/:groupId/report', generateReport);

//monthly summery
// In your routes file (likely groupRoutes.ts)
router.get('/:groupId/monthly-summary/:month', getParticipantMonthlySummary);

// Add this new route for user-specific monthly summary
router.get('/:groupId/monthly-summary/:month/user/:userId', getParticipantMonthlySummaryByUserId as any);
export default router;
