const fs = require('fs');
const path = require('path');
const { organizedPrompts, exportToJSON } = require('./organize-prompts.js');

// 数据库初始化SQL
const initSQL = `
-- 创建提示词表
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON数组格式
    source TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pinned BOOLEAN DEFAULT FALSE,
    version TEXT DEFAULT '1.0.0'
);

-- 创建版本历史表
CREATE TABLE IF NOT EXISTS prompt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version_type TEXT DEFAULT 'patch', -- major, minor, patch
    FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE
);

-- 创建设置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts(tags);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_prompts_pinned ON prompts(pinned);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
`;

// 生成插入提示词的SQL
function generateInsertSQL(prompts) {
  let sql = '\n-- 插入初始化提示词数据\n';
  
  prompts.forEach((prompt, index) => {
    const tagsJSON = JSON.stringify(prompt.tags);
    const name = prompt.name.replace(/'/g, "''");
    const content = prompt.content.replace(/'/g, "''");
    const source = prompt.source ? prompt.source.replace(/'/g, "''") : '';
    const notes = prompt.notes ? prompt.notes.replace(/'/g, "''") : '';
    
    sql += `INSERT OR IGNORE INTO prompts (name, content, tags, source, notes, pinned) VALUES (
  '${name}',
  '${content}',
  '${tagsJSON}',
  '${source}',
  '${notes}',
  ${index < 3 ? 'TRUE' : 'FALSE'}  -- 前3个设为置顶
);\n\n`;
  });
  
  return sql;
}

// 生成默认设置SQL
function generateSettingsSQL() {
  return `
-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('app_version', '1.0.0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('initialized', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_backup', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup', 'false');
`;
}

// 主函数
function main() {
  console.log('生成数据库初始化脚本...');
  
  // 生成完整的SQL脚本
  const promptsSQL = generateInsertSQL(organizedPrompts);
  const settingsSQL = generateSettingsSQL();
  const fullSQL = initSQL + promptsSQL + settingsSQL;
  
  // 保存SQL脚本
  const sqlPath = path.join(__dirname, 'init-database.sql');
  fs.writeFileSync(sqlPath, fullSQL, 'utf8');
  console.log(`数据库初始化脚本已保存到: ${sqlPath}`);
  
  // 生成JSON格式的初始化数据
  const exportData = exportToJSON(organizedPrompts);
  const jsonPath = path.join(__dirname, 'initial-prompts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`JSON格式初始化数据已保存到: ${jsonPath}`);
  
  // 生成统计信息
  console.log(`\n=== 初始化数据统计 ===`);
  console.log(`总提示词数量: ${organizedPrompts.length}`);
  
  const tagStats = {};
  organizedPrompts.forEach(prompt => {
    prompt.tags.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
  });
  
  console.log(`标签分布:`);
  Object.entries(tagStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count}`);
    });
  
  console.log(`\n初始化脚本生成完成！`);
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  initSQL,
  generateInsertSQL,
  generateSettingsSQL
};