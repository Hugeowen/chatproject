// server.js - 项目入口文件
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB 连接错误:'));
db.once('open', () => {
  console.log('MongoDB 连接成功');
});

// 导入模型
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// 中间件
app.use(cors());
app.use(express.json());

// 导入路由
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { data } = require('autoprefixer');

// 使用路由
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// server.js - Socket.IO 消息处理部分

// 连接处理
io.on('connection', (socket) => {
  console.log('新用户连接:', socket.id);

  // 加入房间
  socket.on('joinRoom', async ({ userId, roomId }) => {
    try {
      // 获取用户和房间信息
      const user = await User.findById(userId);
      const room = await Room.findById(roomId);
      
      if (!user || !room) {
        socket.emit('error', '用户或房间不存在');
        return;
      }
      
      // 加入房间（移除重复的事件监听）
      socket.join(roomId);
      console.log(`[后端] 用户 ${userId} 加入房间 ${roomId}`);
      
      // 获取房间消息历史
      const messages = await Message.find({ roomId })
        .populate('userId', 'username')
        .sort('createdAt');
      
      // 发送消息历史给用户
      socket.emit('messageHistory', messages);
      
      // 通知房间内其他用户
      socket.broadcast.to(roomId).emit('systemMessage', `${user.username} 加入了房间`);
      
      // 更新房间用户列表
      const usersInRoom = await getUsersInRoom(roomId);
      io.to(roomId).emit('roomUsers', usersInRoom);
      
    } catch (error) {
      console.error('加入房间错误:', error);
      socket.emit('error', '加入房间失败');
    }
  });

// 发送消息
socket.on('sendMessage', async ({ userId, roomId, content }) => {
  try {
    // 校验用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      console.error('用户不存在:', userId);
      socket.emit('error', '用户不存在');
      return;
    }
    
    // 校验房间是否存在
    const room = await Room.findById(roomId);
    if (!room) {
      console.error('房间不存在:', roomId);
      socket.emit('error', '房间不存在');
      return;
    }
    
    // 校验消息内容
    if (!content || content.trim().length === 0) {
      console.error('消息内容为空');
      socket.emit('error', '消息内容不能为空');
      return;
    }
    
    // 创建新消息
    const newMessage = new Message({
      userId,
      roomId,
      content,
      createdAt: new Date()
    });
    
    // 保存消息到数据库
    const savedMessage = await newMessage.save();
    console.log('消息保存成功:', savedMessage._id);
    
    // 关联用户信息
    const message = await Message.findById(savedMessage._id)
      .populate('userId', 'username');

    
    // 发送消息到房间
    const messageObj = message.toObject();
    messageObj.userId._id = messageObj.userId._id.toString();
    io.to(roomId).emit('newMessage', messageObj);
    
    console.log('[后端] 广播的消息对象:', message.toObject());
    //io.to(roomId).emit('newMessage', message);
    console.log(`消息已广播到房间 ${roomId}`);
    
  } catch (error) {
    console.error('发送消息错误:', error);
    
    // 区分不同类型的错误
    if (error.name === 'ValidationError') {
      socket.emit('error', '消息格式不正确: ' + error.message);
    } else {
      socket.emit('error', '发送消息失败: ' + error.message);
    }
  }
});

  // 用户断开连接
  socket.on('disconnect', async () => {
    // 从所有房间中移除用户
    const rooms = Object.keys(socket.rooms);
    
    rooms.forEach(async (roomId) => {
      if (roomId !== socket.id) {
        // 通知房间内其他用户
        socket.broadcast.to(roomId).emit('systemMessage', '一位用户离开了房间');
        
        // 更新房间用户列表
        const usersInRoom = await getUsersInRoom(roomId);
        io.to(roomId).emit('roomUsers', usersInRoom);
      }
    });
  });
});

const userSocketMap = new Map();

// 获取房间内的用户列表
async function getUsersInRoom(roomId) {

try {
    
    const room = await Room.findById(roomId).populate('created_by', 'username');
    
    if (!room) throw new Error('房间不存在');
    
    // 获取房间中的所有socket连接
    const roomSockets = io.sockets.adapter.rooms.get(roomId) || new Set();
    
    // 获取房间内的所有用户ID（从socket连接中提取）
    const userIds = [];
    roomSockets.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.data.userId) {
        userIds.push(socket.data.userId);
      }
    });
    
    // 去重
    const uniqueUserIds = [...new Set(userIds)];
    
    // 查询用户信息
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('username');
    
    return {
      roomId: room._id.toString(),
      roomName: room.name,
      createdBy: room.created_by.username, 
      userCount: roomSockets.size,
      users: users.map(user => ({
        userId: user._id.toString(),
        username: user.username
      }))
    };
  } catch (error) {
    console.error('获取房间用户列表失败:', error);
    return null;
  }
  
}

// 启动服务器
const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，尝试使用其他端口...`);
    
    // 尝试使用其他端口
    const newPort = PORT + 1;
    server.listen(newPort, () => {
      console.log(`服务器运行在备用端口 ${newPort}`);
    });
  } else {
    console.error('服务器启动错误:', error);
  }
});

server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

