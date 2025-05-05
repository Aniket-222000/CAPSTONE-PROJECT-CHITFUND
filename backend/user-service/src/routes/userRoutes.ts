import { Router } from 'express';
import * as ctrl from '../controllers/userController';

const router = Router();
router.post('/register', ctrl.registerUser);
router.get('/all', ctrl.getAllUsers);
router.get('/:userId', ctrl.getUserById);
router.get('/email/:userEmail', ctrl.getUserByEmail);
router.get('/groups/:userEmail', ctrl.getListOfGroups);
router.put('/editprofile/:userEmail', ctrl.editUserProfile);
router.post('/:groupId/join-request/:userId', ctrl.respondToJoinRequest);
router.patch('/addGroup/:userEmail', ctrl.addGroups);
router.get('/name/:userName', ctrl.getIdByUserName);

export default router;