import { Router } from 'express';
import * as ctrl from '../controllers/appController';

const router = Router();

router.get('/version', ctrl.getVersion);

export default router;
