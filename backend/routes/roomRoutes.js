// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createRoom, 
  getRooms, 
  getRoomById, 
  joinRoom 
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRoom);
router.get('/', protect, getRooms);
router.get('/:id', protect, getRoomById);
router.post('/:id/join', protect, joinRoom);

module.exports = router;