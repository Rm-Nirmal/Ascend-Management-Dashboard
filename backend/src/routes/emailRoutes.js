import express from 'express';
import { sendEmailReceipt } from '../controllers/emailController.js';

const router = express.Router();

router.post('/send-email', sendEmailReceipt);

export default router;
