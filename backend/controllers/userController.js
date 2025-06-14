// controllers/userController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// 注册用户
const registerUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  const userExists = await User.findOne({ username });
  
  if (userExists) {
    res.status(400);
    throw new Error('用户名已存在');
  }
  
  const user = await User.create({
    username,
    password
  });
  
  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id)
    });
  } else {
    res.status(400);
    throw new Error('无效的用户数据');
  }
});

// 用户登录
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  const user = await User.findOne({ username });
  
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id)
    });
  } else {
    res.status(401);
    throw new Error('用户名或密码不正确');
  }
});

// 获取用户资料
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user) {
    res.json({
      _id: user._id,
      username: user.username
    });
  } else {
    res.status(404);
    throw new Error('用户未找到');
  }
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};