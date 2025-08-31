const { invoke } = require('@tauri-apps/api/core');

// 示例提示词数据
const samplePrompts = [
  {
    name: "代码审查助手",
    content: "请作为一个资深的代码审查专家，仔细审查以下代码，并提供详细的反馈：\n\n1. 代码质量和可读性\n2. 潜在的bug和安全问题\n3. 性能优化建议\n4. 最佳实践建议\n\n请提供具体的改进建议和修改方案。",
    tags: ["编程", "代码审查", "质量"],
    source: "内置示例",
    notes: "用于代码审查和质量改进的提示词"
  },
  {
    name: "文案创作专家",
    content: "你是一位经验丰富的文案创作专家，擅长创作各种类型的营销文案。请根据以下要求创作文案：\n\n- 目标受众：[请描述]\n- 产品/服务：[请描述]\n- 文案类型：[广告文案/产品介绍/社交媒体等]\n- 风格要求：[正式/轻松/专业等]\n\n请创作吸引人且有说服力的文案。",
    tags: ["写作", "营销", "文案"],
    source: "内置示例",
    notes: "专业的营销文案创作助手"
  },
  {
    name: "学习计划制定师",
    content: "作为一名专业的学习规划师，请帮我制定一个详细的学习计划：\n\n学习目标：[请描述你想学习的内容]\n当前水平：[初学者/中级/高级]\n可用时间：[每天/每周可投入的时间]\n学习期限：[希望达成目标的时间]\n\n请提供：\n1. 分阶段的学习路径\n2. 具体的学习资源推荐\n3. 时间安排建议\n4. 学习效果评估方法",
    tags: ["教育", "学习", "规划"],
    source: "内置示例",
    notes: "帮助制定个性化学习计划"
  },
  {
    name: "翻译专家",
    content: "你是一位专业的翻译专家，精通多种语言。请按照以下要求进行翻译：\n\n原文语言：[请指定]\n目标语言：[请指定]\n翻译类型：[直译/意译/本地化]\n专业领域：[技术/商务/文学/日常等]\n\n请提供准确、流畅、符合目标语言习惯的翻译，并在必要时提供注释说明。",
    tags: ["语言", "翻译", "沟通"],
    source: "内置示例",
    notes: "专业的多语言翻译助手"
  },
  {
    name: "数据分析师",
    content: "作为一名资深的数据分析师，请帮我分析以下数据：\n\n[请提供数据或描述数据情况]\n\n分析要求：\n1. 数据清洗和预处理建议\n2. 关键指标和趋势分析\n3. 数据可视化建议\n4. 业务洞察和建议\n5. 后续行动计划\n\n请提供专业的分析报告和可执行的建议。",
    tags: ["数据分析", "商业", "洞察"],
    source: "内置示例",
    notes: "专业的数据分析和洞察工具"
  }
];

async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 创建示例提示词
    for (const prompt of samplePrompts) {
      try {
        const id = await invoke('create_prompt', {
          name: prompt.name,
          content: prompt.content,
          tags: prompt.tags,
          source: prompt.source,
          notes: prompt.notes
        });
        console.log(`✅ 创建提示词: ${prompt.name} (ID: ${id})`);
      } catch (error) {
        console.error(`❌ 创建提示词失败: ${prompt.name}`, error);
      }
    }
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('初始化数据库失败:', error);
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.initializeDatabase = initializeDatabase;
} else {
  // Node.js 环境
  initializeDatabase();
}