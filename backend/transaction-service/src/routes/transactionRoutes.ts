// import express from "express";
// import { createTransaction, getAllTransactions, getTransactionById, getTransactionsByGroupId, getTransactionsByType, getTransactionsByUserId } from "../controllers/transactionController";

// const router=express.Router();

// router.post('/', createTransaction as any);

// router.get('/all', getAllTransactions);

// router.get('/find/:transactionId', getTransactionById);

// router.get('/find/user/:userId', getTransactionsByUserId);

// router.get('/find/group/:groupId', getTransactionsByGroupId);

// router.get('/find/type/:transactionType', getTransactionsByType);

// export default router;

import { Router } from 'express';
import {
  getAllTransactions,
  getTransactionById,
  getTransactionsByUserId,
  getTransactionsByGroupId,
  getTransactionsByType,
  createTransaction
} from '../controllers/transactionController';

const router = Router();
router.get('/all', getAllTransactions);
router.get('/find/:transactionId', getTransactionById);
router.get('/find/user/:userId', getTransactionsByUserId);
router.get('/find/group/:groupId', getTransactionsByGroupId);
router.get('/find/type/:transactionType', getTransactionsByType);
router.post('/', createTransaction);

export default router;