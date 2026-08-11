const express = require('express');
const {
  generateAiQuestion,
  getAiControlSettings,
  updateAiControlSettings,
} = require('../controllers/adminAiController');
const { authenticateToken, requireSuperAdmin, requireTeacher } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/control-state', requireSuperAdmin, getAiControlSettings);
router.patch('/control-state', requireSuperAdmin, updateAiControlSettings);
router.post('/questions/generate', requireTeacher, generateAiQuestion);

module.exports = router;
