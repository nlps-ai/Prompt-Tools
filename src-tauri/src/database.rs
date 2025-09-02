use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: i64,
    pub name: String,
    pub source: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub content: String,
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
    pub current_version_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Version {
    pub id: i64,
    pub prompt_id: i64,
    pub version: String,
    pub content: String,
    pub created_at: String,
    pub parent_version_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePromptRequest {
    pub name: String,
    pub source: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePromptRequest {
    pub name: String,
    pub source: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub content: String,
    pub save_as_version: bool,
    pub version_type: String, // "patch", "minor", "major"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub prompts: Vec<PromptWithVersions>,
    pub settings: HashMap<String, String>,
    pub export_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromptWithVersions {
    pub id: i64,
    pub name: String,
    pub source: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
    pub current_version_id: Option<i64>,
    pub versions: Vec<Version>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResult {
    pub left_version: Version,
    pub right_version: Version,
    pub diff_html: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub prompts: Vec<Prompt>,
    pub total: usize,
    pub tags: Vec<String>,
    pub sources: Vec<String>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: std::path::PathBuf) -> SqliteResult<Self> {
        if let Some(parent) = db_path.parent() {
            // 确保数据库目录存在（否则 rusqlite 打开文件会失败）
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(&db_path)?;
        // 开启外键约束
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        let db = Database { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> SqliteResult<()> {
        // 提示词表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                source TEXT,
                notes TEXT,
                tags TEXT,
                pinned INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                current_version_id INTEGER
            )",
            [],
        )?;

        // 版本表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_id INTEGER NOT NULL,
                version TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                parent_version_id INTEGER,
                FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 设置表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // 插入默认设置
        self.conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES ('version_cleanup_threshold', '200')",
            [],
        )?;

        // 创建索引
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at)",
            [],
        )?;
        
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_versions_prompt_id ON versions(prompt_id)",
            [],
        )?;

        Ok(())
    }

    pub fn get_all_prompts(&self) -> SqliteResult<Vec<Prompt>> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.name, p.source, p.notes, p.tags, p.pinned, 
                    p.created_at, p.updated_at, p.current_version_id,
                    v.content, v.version
             FROM prompts p
             LEFT JOIN versions v ON v.id = p.current_version_id
             ORDER BY p.pinned DESC, p.updated_at DESC"
        )?;

        let prompt_iter = stmt.query_map([], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = if tags_str.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&tags_str).unwrap_or_else(|_| {
                    tags_str.split(',').map(|s| s.trim().to_string()).collect()
                })
            };

            Ok(Prompt {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                notes: row.get(3)?,
                tags,
                pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                current_version_id: row.get(8)?,
                content: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
                version: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "1.0.0".to_string()),
            })
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }
        Ok(prompts)
    }

    pub fn search_prompts(&self, query: &str, tags: &[String], sources: &[String]) -> SqliteResult<SearchResult> {
        let mut sql = String::from(
            "SELECT p.id, p.name, p.source, p.notes, p.tags, p.pinned, 
                    p.created_at, p.updated_at, p.current_version_id,
                    v.content, v.version
             FROM prompts p
             LEFT JOIN versions v ON v.id = p.current_version_id"
        );
        
        let mut conditions: Vec<String> = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if !query.is_empty() {
            conditions.push("(p.name LIKE ?1 OR p.source LIKE ?1 OR p.notes LIKE ?1 OR p.tags LIKE ?1 OR v.content LIKE ?1)".to_string());
            params.push(Box::new(format!("%{}%", query)));
        }

        if !tags.is_empty() {
            let tag_conditions: Vec<String> = tags.iter().enumerate().map(|(i, _)| {
                format!("p.tags LIKE ?{}", params.len() + i + 1)
            }).collect();
            let tag_condition = format!("({})", tag_conditions.join(" OR "));
            conditions.push(tag_condition);
            for tag in tags {
                params.push(Box::new(format!("%\"{}\":%", tag)));
            }
        }

        if !sources.is_empty() {
            let source_conditions: Vec<String> = sources.iter().enumerate().map(|(i, _)| {
                format!("p.source = ?{}", params.len() + i + 1)
            }).collect();
            let source_condition = format!("({})", source_conditions.join(" OR "));
            conditions.push(source_condition);
            for source in sources {
                params.push(Box::new(source.clone()));
            }
        }

        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }

        sql.push_str(" ORDER BY p.pinned DESC, p.updated_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let prompt_iter = stmt.query_map(&param_refs[..], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = if tags_str.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&tags_str).unwrap_or_else(|_| {
                    tags_str.split(',').map(|s| s.trim().to_string()).collect()
                })
            };

            Ok(Prompt {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                notes: row.get(3)?,
                tags,
                pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                current_version_id: row.get(8)?,
                content: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
                version: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "1.0.0".to_string()),
            })
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }

        // 获取所有标签和来源
        let all_tags = self.get_all_tags()?;
        let all_sources = self.get_all_sources()?;

        Ok(SearchResult {
            total: prompts.len(),
            prompts,
            tags: all_tags,
            sources: all_sources,
        })
    }

    pub fn get_all_tags(&self) -> SqliteResult<Vec<String>> {
        let mut stmt = self.conn.prepare("SELECT DISTINCT tags FROM prompts WHERE tags IS NOT NULL AND tags != ''")?;
        let rows = stmt.query_map([], |row| {
            let tags_str: String = row.get(0)?;
            Ok(tags_str)
        })?;

        let mut all_tags = std::collections::HashSet::new();
        for row in rows {
            let tags_str = row?;
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(&tags_str) {
                for tag in tags {
                    all_tags.insert(tag);
                }
            }
        }

        let mut tags: Vec<String> = all_tags.into_iter().collect();
        tags.sort();
        Ok(tags)
    }

    pub fn get_all_sources(&self) -> SqliteResult<Vec<String>> {
        let mut stmt = self.conn.prepare("SELECT DISTINCT source FROM prompts WHERE source IS NOT NULL AND source != ''")?;
        let rows = stmt.query_map([], |row| {
            let source: String = row.get(0)?;
            Ok(source)
        })?;

        let mut sources = Vec::new();
        for row in rows {
            sources.push(row?);
        }
        sources.sort();
        Ok(sources)
    }

    pub fn create_prompt(&self, req: CreatePromptRequest) -> SqliteResult<i64> {
        let now = Utc::now().to_rfc3339();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_default();

        // 创建提示词
        self.conn.execute(
            "INSERT INTO prompts (name, source, notes, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                req.name,
                req.source,
                req.notes,
                tags_json,
                now,
                now
            ],
        )?;

        let prompt_id = self.conn.last_insert_rowid();

        // 创建初始版本
        self.conn.execute(
            "INSERT INTO versions (prompt_id, version, content, created_at, parent_version_id)
             VALUES (?1, '1.0.0', ?2, ?3, NULL)",
            params![prompt_id, req.content, now],
        )?;

        let version_id = self.conn.last_insert_rowid();

        // 更新当前版本ID
        self.conn.execute(
            "UPDATE prompts SET current_version_id = ?1 WHERE id = ?2",
            params![version_id, prompt_id],
        )?;

        Ok(prompt_id)
    }

    pub fn update_prompt(&self, id: i64, req: UpdatePromptRequest) -> SqliteResult<()> {
        let now = Utc::now().to_rfc3339();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_default();

        // 更新基本信息
        self.conn.execute(
            "UPDATE prompts SET name = ?1, source = ?2, notes = ?3, tags = ?4, updated_at = ?5
             WHERE id = ?6",
            params![
                req.name,
                req.source,
                req.notes,
                tags_json,
                now,
                id
            ],
        )?;

        if req.save_as_version {
            // 获取当前版本号
            let current_version = self.conn.query_row(
                "SELECT v.version FROM versions v 
                 JOIN prompts p ON p.current_version_id = v.id 
                 WHERE p.id = ?1",
                params![id],
                |row| row.get::<_, String>(0)
            ).unwrap_or_else(|_| "1.0.0".to_string());

            // 计算新版本号
            let new_version = self.bump_version(&current_version, &req.version_type);

            // 创建新版本
            self.conn.execute(
                "INSERT INTO versions (prompt_id, version, content, created_at, parent_version_id)
                 VALUES (?1, ?2, ?3, ?4, (SELECT current_version_id FROM prompts WHERE id = ?1))",
                params![id, new_version, req.content, now],
            )?;

            let new_version_id = self.conn.last_insert_rowid();

            // 更新当前版本ID
            self.conn.execute(
                "UPDATE prompts SET current_version_id = ?1 WHERE id = ?2",
                params![new_version_id, id],
            )?;

            // 清理旧版本
            self.cleanup_old_versions(id)?;
        } else {
            // 仅更新当前版本内容
            self.conn.execute(
                "UPDATE versions SET content = ?1 
                 WHERE id = (SELECT current_version_id FROM prompts WHERE id = ?2)",
                params![req.content, id],
            )?;
        }

        Ok(())
    }

    fn bump_version(&self, current: &str, version_type: &str) -> String {
        let parts: Vec<&str> = current.split('.').collect();
        if parts.len() != 3 {
            return "1.0.0".to_string();
        }

        let major: u32 = parts[0].parse().unwrap_or(1);
        let minor: u32 = parts[1].parse().unwrap_or(0);
        let patch: u32 = parts[2].parse().unwrap_or(0);

        match version_type {
            "major" => format!("{}.0.0", major + 1),
            "minor" => format!("{}.{}.0", major, minor + 1),
            _ => format!("{}.{}.{}", major, minor, patch + 1), // patch
        }
    }

    fn cleanup_old_versions(&self, prompt_id: i64) -> SqliteResult<()> {
        let threshold: i32 = self.conn.query_row(
            "SELECT value FROM settings WHERE key = 'version_cleanup_threshold'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "200".to_string()).parse().unwrap_or(200);

        // 获取版本数量
        let count: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM versions WHERE prompt_id = ?1",
            params![prompt_id],
            |row| row.get(0)
        )?;

        if count > threshold {
            let to_delete = count - threshold;
            self.conn.execute(
                "DELETE FROM versions WHERE prompt_id = ?1 AND id IN (
                    SELECT id FROM versions WHERE prompt_id = ?1 
                    ORDER BY created_at ASC LIMIT ?2
                )",
                params![prompt_id, to_delete],
            )?;
        }

        Ok(())
    }

    pub fn get_prompt_versions(&self, prompt_id: i64) -> SqliteResult<Vec<Version>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, prompt_id, version, content, created_at, parent_version_id
             FROM versions WHERE prompt_id = ?1 ORDER BY created_at DESC"
        )?;

        let version_iter = stmt.query_map(params![prompt_id], |row| {
            Ok(Version {
                id: row.get(0)?,
                prompt_id: row.get(1)?,
                version: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
                parent_version_id: row.get(5)?,
            })
        })?;

        let mut versions = Vec::new();
        for version in version_iter {
            versions.push(version?);
        }
        Ok(versions)
    }

    pub fn rollback_to_version(&self, prompt_id: i64, version_id: i64, version_type: String) -> SqliteResult<()> {
        let now = Utc::now().to_rfc3339();
        
        // 获取目标版本内容
        let target_content: String = self.conn.query_row(
            "SELECT content FROM versions WHERE id = ?1 AND prompt_id = ?2",
            params![version_id, prompt_id],
            |row| row.get(0)
        )?;

        // 获取当前版本号
        let current_version = self.conn.query_row(
            "SELECT v.version FROM versions v 
             JOIN prompts p ON p.current_version_id = v.id 
             WHERE p.id = ?1",
            params![prompt_id],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "1.0.0".to_string());

        // 计算新版本号
        let new_version = self.bump_version(&current_version, &version_type);

        // 创建新版本
        self.conn.execute(
            "INSERT INTO versions (prompt_id, version, content, created_at, parent_version_id)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![prompt_id, new_version, target_content, now, version_id],
        )?;

        let new_version_id = self.conn.last_insert_rowid();

        // 更新当前版本ID和更新时间
        self.conn.execute(
            "UPDATE prompts SET current_version_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_version_id, now, prompt_id],
        )?;

        // 清理旧版本
        self.cleanup_old_versions(prompt_id)?;

        Ok(())
    }

    pub fn delete_prompt(&self, id: i64) -> SqliteResult<()> {
        // 开始事务确保数据一致性
        let tx = self.conn.unchecked_transaction()?;
        
        // 先删除所有相关版本
        tx.execute("DELETE FROM versions WHERE prompt_id = ?1", params![id])?;
        
        // 再删除提示词
        let rows_affected = tx.execute("DELETE FROM prompts WHERE id = ?1", params![id])?;
        
        // 提交事务
        tx.commit()?;
        
        println!("Successfully deleted prompt with id: {}, rows affected: {}", id, rows_affected);
        
        // 即使没有删除任何行也返回成功（可能记录已经不存在）
        Ok(())
    }

    pub fn toggle_pin(&self, id: i64) -> SqliteResult<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE prompts SET pinned = NOT pinned, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn export_data(&self) -> SqliteResult<ExportData> {
        let mut prompts_with_versions = Vec::new();
        
        // 获取所有提示词
        let mut stmt = self.conn.prepare(
            "SELECT id, name, source, notes, tags, pinned, created_at, updated_at, current_version_id
             FROM prompts ORDER BY id"
        )?;

        let prompt_iter = stmt.query_map([], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = if tags_str.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&tags_str).unwrap_or_else(|_| {
                    tags_str.split(',').map(|s| s.trim().to_string()).collect()
                })
            };

            Ok(PromptWithVersions {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                notes: row.get(3)?,
                tags,
                pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                current_version_id: row.get(8)?,
                versions: Vec::new(), // 稍后填充
            })
        })?;

        for prompt_result in prompt_iter {
            let mut prompt = prompt_result?;
            prompt.versions = self.get_prompt_versions(prompt.id)?;
            prompts_with_versions.push(prompt);
        }

        // 获取设置
        let mut settings = HashMap::new();
        let mut settings_stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let settings_iter = settings_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        for setting_result in settings_iter {
            let (key, value) = setting_result?;
            settings.insert(key, value);
        }

        Ok(ExportData {
            prompts: prompts_with_versions,
            settings,
            export_time: Utc::now().to_rfc3339(),
        })
    }

    pub fn import_data(&self, data: ExportData) -> SqliteResult<()> {
        // 开始事务
        let tx = self.conn.unchecked_transaction()?;

        // 清空现有数据
        tx.execute("DELETE FROM versions", [])?;
        tx.execute("DELETE FROM prompts", [])?;

        // 导入提示词和版本
        for prompt in data.prompts {
            // 插入提示词
            tx.execute(
                "INSERT INTO prompts (id, name, source, notes, tags, pinned, created_at, updated_at, current_version_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    prompt.id,
                    prompt.name,
                    prompt.source,
                    prompt.notes,
                    serde_json::to_string(&prompt.tags).unwrap_or_default(),
                    if prompt.pinned { 1 } else { 0 },
                    prompt.created_at,
                    prompt.updated_at,
                    prompt.current_version_id
                ],
            )?;

            // 插入版本
            for version in prompt.versions {
                tx.execute(
                    "INSERT INTO versions (id, prompt_id, version, content, created_at, parent_version_id)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        version.id,
                        version.prompt_id,
                        version.version,
                        version.content,
                        version.created_at,
                        version.parent_version_id
                    ],
                )?;
            }
        }

        // 导入设置
        for (key, value) in data.settings {
            tx.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                params![key, value],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> SqliteResult<Option<String>> {
        match self.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0)
        ) {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_category_counts(&self) -> SqliteResult<HashMap<String, i32>> {
        // 定义分类映射 - HTML中的分类对应的标签关键词
        let category_mappings = [
            ("work", vec!["职业", "工作", "职场", "career", "job"]),
            ("business", vec!["商业", "商务", "business", "marketing", "销售"]),
            ("tools", vec!["工具", "tool", "效率", "productivity"]),
            ("language", vec!["语言", "翻译", "language", "translate", "英语"]),
            ("office", vec!["办公", "office", "文档", "excel", "ppt"]),
            ("general", vec!["通用", "general", "日常", "常用"]),
            ("writing", vec!["写作", "文案", "writing", "content", "创作"]),
            ("programming", vec!["编程", "代码", "programming", "code", "开发"]),
            ("emotion", vec!["情感", "心理", "emotion", "情绪"]),
            ("education", vec!["教育", "学习", "education", "teaching", "培训"]),
            ("creative", vec!["创意", "创新", "creative", "设计思维"]),
            ("academic", vec!["学术", "研究", "academic", "论文"]),
            ("design", vec!["设计", "UI", "UX", "design", "视觉"]),
            ("tech", vec!["技术", "科技", "tech", "AI", "人工智能"]),
            ("entertainment", vec!["娱乐", "游戏", "entertainment", "fun"])
        ];

        // 获取所有提示词的标签
        let mut stmt = self.conn.prepare("SELECT tags FROM prompts WHERE tags IS NOT NULL AND tags != ''")?;
        let rows = stmt.query_map([], |row| {
            let tags_str: String = row.get(0)?;
            Ok(tags_str)
        })?;

        let mut category_counts: HashMap<String, i32> = HashMap::new();
        
        // 初始化所有分类计数为0
        for (category, _) in &category_mappings {
            category_counts.insert(category.to_string(), 0);
        }

        // 统计每个提示词属于哪些分类
        for row in rows {
            let tags_str = row?;
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(&tags_str) {
                for (category, keywords) in &category_mappings {
                    // 检查标签是否包含分类关键词
                    let matches = tags.iter().any(|tag| {
                        let tag_lower = tag.to_lowercase();
                        keywords.iter().any(|keyword| {
                            tag_lower.contains(&keyword.to_lowercase()) || 
                            keyword.to_lowercase().contains(&tag_lower)
                        })
                    });
                    
                    if matches {
                        *category_counts.entry(category.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
        
        Ok(category_counts)
    }

    pub fn get_prompts_by_category(&self, category: &str) -> SqliteResult<Vec<Prompt>> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.name, p.source, p.notes, p.tags, p.pinned, 
                    p.created_at, p.updated_at, p.current_version_id,
                    v.content, v.version
             FROM prompts p
             LEFT JOIN versions v ON v.id = p.current_version_id
             WHERE p.tags LIKE ?1
             ORDER BY p.pinned DESC, p.updated_at DESC"
        )?;

        let search_pattern = format!("%\"{}\":%", category);
        let prompt_iter = stmt.query_map(params![search_pattern], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = if tags_str.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&tags_str).unwrap_or_else(|_| {
                    tags_str.split(',').map(|s| s.trim().to_string()).collect()
                })
            };

            Ok(Prompt {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                notes: row.get(3)?,
                tags,
                pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                current_version_id: row.get(8)?,
                content: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
                version: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "1.0.0".to_string()),
            })
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }
        Ok(prompts)
    }
}