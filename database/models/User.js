// database/models/User.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const config = require('../config');

class User {
  static async create(username, password) {
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const connection = await mysql.createConnection(config);
    const [result] = await connection.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    await connection.end();
    return result.insertId;
  }

  static async findByUsername(username) {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    await connection.end();
    return rows[0];
  }

  // 新增：通过ID查找用户
  static async findById(id) {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute(
      'SELECT id, username, created_at FROM users WHERE id = ?',
      [id]
    );
    await connection.end();
    return rows[0];
  }
}

module.exports = User;