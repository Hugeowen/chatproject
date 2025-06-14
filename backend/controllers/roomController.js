// controllers/roomController.js
const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const User = require('../models/User');

// 创建房间
const createRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;
  
  const room = await Room.create({
    name,
    created_by: req.user._id
  });
  
  if (room) {
    res.status(201).json(room);
  } else {
    res.status(400);
    throw new Error('无效的房间数据');
  }
});

// 获取所有房间
const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({}).populate('created_by', 'username');
  res.json(rooms);
});

// 获取单个房间
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('created_by', 'username');
  
  if (room) {
    res.json(room);
  } else {
    res.status(404);
    throw new Error('房间未找到');
  }
});

// 加入房间 (逻辑主要在Socket.IO中处理，这里可以做一些权限检查)
const joinRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  
  if (room) {
    res.json({ message: '成功加入房间', room });
  } else {
    res.status(404);
    throw new Error('房间未找到');
  }
});

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom
};