import express from 'express';
import { getRequest, deviceCmd, cdataPost, cdataGet, registry } from '../controllers/admsController.js';

const router = express.Router();

// Binds all ZKTeco ADMS endpoints
router.get('/getrequest', getRequest);
router.post('/devicecmd', deviceCmd);
router.post('/cdata', cdataPost);
router.get('/cdata', cdataGet);
router.post('/registry', registry);

export default router;
