const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const config = require('../config');

async function runMigrations() {
  // 创建数据库连接
  const connection = await mysql.createConnection({
    ...config,
    multipleStatements: true
  });

  try {
    console.log('Starting database migrations...');
    
    // 检查迁移表是否存在，不存在则创建
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 获取已执行的迁移
    const [executedMigrations] = await connection.query(
      'SELECT name FROM migrations'
    );
    const executedNames = executedMigrations.map(m => m.name);
    
    // 读取迁移目录中的所有文件
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // 执行未运行的迁移
    for (const file of migrationFiles) {
      if (!executedNames.includes(file)) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        console.log(`Running migration: ${file}`);
        await connection.query(sql);
        
        // 记录已执行的迁移
        await connection.query(
          'INSERT INTO migrations (name) VALUES (?)',
          [file]
        );
        
        console.log(`Migration ${file} completed`);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();