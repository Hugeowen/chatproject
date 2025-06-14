// controllers/messageController.js
const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');

// 获取房间消息
const getRoomMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ room_id: req.params.roomId })
    .populate('user_id', 'username')
    .sort('created_at');
  
  res.json(messages);
});

module.exports = {
  getRoomMessages
};