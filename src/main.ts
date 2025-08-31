import { invoke } from "@tauri-apps/api/core";
import { VersionManager, SearchManager, ImportExportManager, SettingsManager, KeyboardManager } from "./advanced";
import "./styles.css";

// 全局状态
let currentPrompts: any[] = [];
let currentEditingId: number | null = null;
let currentViewMode: 'list' | 'grid' = 'grid';
let currentTheme: 'light' | 'dark' = 'light';
let currentCategory: string = 'all';

// DOM 元素
let searchInput: HTMLInputElement;
let promptList: HTMLElement;
let promptForm: HTMLFormElement;
let modal: HTMLElement;

// 初始化应用
window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  initializeEventListeners();
  KeyboardManager.init();
  await loadPrompts();
  await loadSettings();
});

function initializeElements() {
  searchInput = document.getElementById('searchInput') as HTMLInputElement;
  promptList = document.getElementById('promptList') as HTMLElement;
  promptForm = document.getElementById('promptForm') as HTMLFormElement;
  modal = document.getElementById('modal') as HTMLElement;
}

function initializeEventListeners() {
  // 搜索功能
  searchInput?.addEventListener('input', debounce(handleSearch, 300));
  
  // 表单提交
  promptForm?.addEventListener('submit', handleFormSubmit);
  
  // 模态框关闭
  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closeModal);
  
  // 创建按钮
  document.getElementById('createBtn')?.addEventListener('click', () => openModal());
  
  // 视图切换
  document.getElementById('viewToggle')?.addEventListener('click', toggleViewMode);
  
  // 主题切换
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  
  // 导入导出
  document.getElementById('exportBtn')?.addEventListener('click', () => ImportExportManager.exportToFile());
  document.getElementById('importBtn')?.addEventListener('click', () => ImportExportManager.importFromFile());
  document.getElementById('importBestBtn')?.addEventListener('click', () => importBestChinesePrompts());
  
  // 设置按钮
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
  
  // 导航栏点击事件
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', handleNavClick);
  });
}

// 加载所有提示词
async function loadPrompts() {
  try {
    currentPrompts = await invoke('get_all_prompts');
    
    // 如果没有提示词，自动创建示例数据
    if (currentPrompts.length === 0) {
      console.log('没有找到提示词，正在创建示例数据...');
      await createSamplePrompts();
      currentPrompts = await invoke('get_all_prompts');
    }
    
    updateNavCounts();
    filterPromptsByCategory();
  } catch (error) {
    console.error('Failed to load prompts:', error);
    showNotification(`加载提示词失败: ${String(error)}`, 'error');
  }
}

// 创建示例提示词
async function createSamplePrompts() {
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

  try {
    showNotification('正在创建示例提示词...', 'info');
    
    for (const prompt of samplePrompts) {
      await invoke('create_prompt', {
        name: prompt.name,
        content: prompt.content,
        tags: prompt.tags,
        source: prompt.source,
        notes: prompt.notes
      });
    }
    
    showNotification('示例提示词创建完成！', 'success');
  } catch (error) {
    console.error('创建示例提示词失败:', error);
    showNotification(`创建示例数据失败: ${String(error)}`, 'error');
  }
}

// 搜索处理
async function handleSearch() {
  const query = searchInput.value.trim();
  
  try {
    if (query === '') {
      await loadPrompts();
    } else {
      const result = await SearchManager.search(query);
      currentPrompts = result.prompts;
      renderPrompts(currentPrompts);
    }
  } catch (error) {
    console.error('Search failed:', error);
    showNotification(`搜索失败: ${String(error)}`, 'error');
  }
}

// 渲染提示词列表
function renderPrompts(prompts: any[]) {
  if (!promptList) return;
  
  if (prompts.length === 0) {
      promptList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>暂无提示词</h3>
          <p>点击"创建提示词"开始创建您的第一个提示词</p>
        </div>
      `;
    return;
  }

  const isGridView = currentViewMode === 'grid';
  promptList.className = `prompt-grid ${isGridView ? '' : 'list-view'}`;
  
  promptList.innerHTML = prompts.map(prompt => `
    <div class="prompt-card ${prompt.pinned ? 'pinned' : ''}" data-id="${prompt.id}">
      ${prompt.pinned ? '<div class="pin-indicator"><i class="fas fa-thumbtack"></i></div>' : ''}
      
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(prompt.name)}</h3>
        <div class="card-actions">
          <button class="btn-icon pin-btn" data-id="${prompt.id}" title="${prompt.pinned ? '取消置顶' : '置顶'}">
            <i class="fas fa-thumbtack ${prompt.pinned ? 'active' : ''}"></i>
          </button>
          <button class="btn-icon copy-btn" data-id="${prompt.id}" title="复制内容">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-icon version-btn" data-id="${prompt.id}" title="版本历史">
            <i class="fas fa-history"></i>
          </button>
          <button class="btn-icon edit-btn" data-id="${prompt.id}" title="编辑">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon btn-danger delete-btn" data-id="${prompt.id}" title="删除">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <div class="card-meta">
        ${prompt.source ? `<div class="meta-item"><i class="fas fa-link"></i> <span>${escapeHtml(prompt.source)}</span></div>` : ''}
        <div class="meta-item"><i class="fas fa-code-branch"></i> <span>v${prompt.version}</span></div>
        <div class="meta-item"><i class="fas fa-clock"></i> <span>${formatDate(prompt.updated_at)}</span></div>
      </div>
      
      ${prompt.tags.length > 0 ? `
        <div class="card-tags">
          ${prompt.tags.map((tag: string) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="card-content">
        ${truncateContent(prompt.content, isGridView ? 150 : 200)}
      </div>
      
      ${prompt.notes ? `
        <div class="card-notes">
          <i class="fas fa-sticky-note"></i>
          <span>${escapeHtml(prompt.notes)}</span>
        </div>
      ` : ''}
    </div>
  `).join('');

  // 添加事件监听器
  addCardEventListeners();
}

// 添加卡片事件监听器
function addCardEventListeners() {
  // 删除按钮事件
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const idStr = target.getAttribute('data-id');
      console.log('Raw data-id attribute:', idStr);
      const id = parseInt(idStr || '0');
      console.log('Parsed ID:', id);
      if (id && id > 0) {
        await deletePrompt(id);
      } else {
        console.error('Invalid ID for delete:', id);
      }
    });
  });

  // 编辑按钮事件
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const idStr = target.getAttribute('data-id');
      const id = parseInt(idStr || '0');
      if (id && id > 0) {
        await editPrompt(id);
      }
    });
  });

  // 置顶按钮事件
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const idStr = target.getAttribute('data-id');
      const id = parseInt(idStr || '0');
      if (id && id > 0) {
        await togglePin(id);
      }
    });
  });

  // 复制按钮事件
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const idStr = target.getAttribute('data-id');
      const id = parseInt(idStr || '0');
      if (id && id > 0) {
        await copyPrompt(id);
      }
    });
  });

  // 版本历史按钮事件
  document.querySelectorAll('.version-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const idStr = target.getAttribute('data-id');
      const id = parseInt(idStr || '0');
      if (id && id > 0) {
        await viewVersions(id);
      }
    });
  });
}

// 删除提示词函数
async function deletePrompt(id: number) {
  console.log('Delete button clicked for ID:', id);
  
  // 找到要删除的提示词信息
  const prompt = currentPrompts.find(p => p.id === id);
  const promptName = prompt ? prompt.name : `ID: ${id}`;
  
  // 创建自定义确认对话框
  const confirmed = await showCustomConfirm(`确定要删除提示词"${promptName}"吗？`, '此操作不可恢复。');
  
  if (!confirmed) {
    console.log('Delete cancelled by user');
    return;
  }
  
  console.log('User confirmed deletion, proceeding...');
  
  try {
    console.log('Calling delete_prompt with id:', id);
    await invoke('delete_prompt', { id });
    console.log('Delete API call successful');
    showNotification(`提示词"${promptName}"删除成功`, 'success');
    
    // 重新加载完整的提示词列表
    console.log('Reloading prompts list...');
    await loadPrompts();
    console.log('Prompts list reloaded');
  } catch (error) {
    console.error('Delete failed:', error);
    showNotification(`删除失败: ${String(error)}`, 'error');
  }
}

// 自定义确认对话框
function showCustomConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal show confirm-modal';
    confirmModal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-container confirm-container">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="confirm-content">
          <h3 class="confirm-title">${escapeHtml(title)}</h3>
          <p class="confirm-message">${escapeHtml(message)}</p>
        </div>
        <div class="confirm-actions">
          <button type="button" class="btn btn-secondary" id="confirmCancel">
            <i class="fas fa-times"></i>
            取消
          </button>
          <button type="button" class="btn btn-danger" id="confirmDelete">
            <i class="fas fa-trash"></i>
            确定删除
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // 绑定事件
    const cancelBtn = confirmModal.querySelector('#confirmCancel');
    const deleteBtn = confirmModal.querySelector('#confirmDelete');
    const overlay = confirmModal.querySelector('.modal-overlay');
    
    const cleanup = () => {
      confirmModal.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(confirmModal)) {
          document.body.removeChild(confirmModal);
        }
      }, 300);
    };
    
    cancelBtn?.addEventListener('click', () => {
      console.log('User clicked cancel in custom dialog');
      cleanup();
      resolve(false);
    });
    
    deleteBtn?.addEventListener('click', () => {
      console.log('User clicked confirm in custom dialog');
      cleanup();
      resolve(true);
    });
    
    overlay?.addEventListener('click', () => {
      console.log('User clicked overlay in custom dialog');
      cleanup();
      resolve(false);
    });
    
    // 添加键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', handleKeydown);
      } else if (e.key === 'Enter') {
        cleanup();
        resolve(true);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // 聚焦到删除按钮
    setTimeout(() => {
      (deleteBtn as HTMLElement)?.focus();
    }, 100);
  });
}

// 编辑提示词函数
async function editPrompt(id: number) {
  const prompt = currentPrompts.find(p => p.id === id);
  if (prompt) {
    openModal(prompt);
  }
}

// 置顶切换函数
async function togglePin(id: number) {
  try {
    await invoke('toggle_pin', { id });
    await loadPrompts();
  } catch (error) {
    console.error('Toggle pin failed:', error);
    showNotification(`操作失败: ${String(error)}`, 'error');
  }
}

// 复制提示词函数
async function copyPrompt(id: number) {
  const prompt = currentPrompts.find(p => p.id === id);
  if (prompt) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      showNotification('复制成功！内容已复制到剪贴板', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showNotification(`复制失败: ${String(error)}`, 'error');
    }
  }
}

// 查看版本历史函数
async function viewVersions(id: number) {
  try {
    const versions = await VersionManager.getVersions(id);
    const prompt = currentPrompts.find(p => p.id === id);
    
    if (!prompt) return;
    
    const versionModal = document.createElement('div');
    versionModal.className = 'modal show';
    versionModal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>${escapeHtml(prompt.name)} - 版本历史</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-form">
          ${VersionManager.renderVersionHistory(versions)}
        </div>
      </div>
    `;
    
    document.body.appendChild(versionModal);
    
    versionModal.querySelector('.close-btn')?.addEventListener('click', () => {
      document.body.removeChild(versionModal);
    });
  } catch (error) {
    console.error('Failed to load versions:', error);
    showNotification(`加载版本历史失败: ${String(error)}`, 'error');
  }
}

// 表单提交处理
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  
  const formData = new FormData(promptForm);
  const name = formData.get('name') as string;
  const source = (formData.get('source') as string) || null;
  const notes = (formData.get('notes') as string) || null;
  const content = formData.get('content') as string;
  const tagsInput = formData.get('tags') as string;
  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
  
  if (!name.trim() || !content.trim()) {
    showNotification('请填写必要字段', 'error');
    return;
  }

  try {
    if (currentEditingId) {
      await invoke('update_prompt', {
        id: currentEditingId,
        name: name.trim(),
        source: source?.trim() || null,
        notes: notes?.trim() || null,
        tags,
        content: content.trim(),
        // Rust 端参数是 snake_case，未传也有默认值
        save_as_version: true,
        version_type: 'patch'
      });
      showNotification('提示词更新成功', 'success');
    } else {
      const id = await invoke('create_prompt', {
        name: name.trim(),
        source: source?.trim() || null,
        notes: notes?.trim() || null,
        tags,
        content: content.trim()
      });
      console.info('Create result id:', id);
      showNotification('提示词创建成功', 'success');
    }
    
    closeModal();
    await loadPrompts();
  } catch (error) {
    console.error('Save failed:', error);
    showNotification(`保存失败: ${String(error)}`, 'error');
  }
}

// 打开模态框
function openModal(prompt?: any) {
  if (!modal || !promptForm) return;
  
  currentEditingId = prompt?.id || null;
  
  // 重置表单
  promptForm.reset();
  
  if (prompt) {
    (document.getElementById('modalTitle') as HTMLElement).textContent = '编辑提示词';
    (document.getElementById('name') as HTMLInputElement).value = prompt.name;
    (document.getElementById('source') as HTMLInputElement).value = prompt.source || '';
    (document.getElementById('notes') as HTMLTextAreaElement).value = prompt.notes || '';
    (document.getElementById('tags') as HTMLInputElement).value = prompt.tags.join(', ');
    (document.getElementById('content') as HTMLTextAreaElement).value = prompt.content;
    (document.getElementById('submitText') as HTMLElement).textContent = '保存';
  } else {
    (document.getElementById('modalTitle') as HTMLElement).textContent = '创建提示词';
    (document.getElementById('submitText') as HTMLElement).textContent = '创建提示词';
  }
  
  modal.classList.add('show');
  (document.getElementById('name') as HTMLInputElement)?.focus();
}

// 关闭模态框
function closeModal() {
  if (!modal) return;
  modal.classList.remove('show');
  currentEditingId = null;
}



// 工具函数
function debounce(func: Function, wait: number) {
  let timeout: number;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return escapeHtml(content);
  return escapeHtml(content.substring(0, maxLength)) + '...';
}

function toggleViewMode() {
  currentViewMode = currentViewMode === 'list' ? 'grid' : 'list';
  renderPrompts(currentPrompts);
  
  const toggleBtn = document.getElementById('viewToggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = currentViewMode === 'list' 
      ? '<i class="fas fa-th"></i>' 
      : '<i class="fas fa-list"></i>';
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = `theme-${currentTheme}`;
  
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = currentTheme === 'light' 
      ? '<i class="fas fa-moon"></i>' 
      : '<i class="fas fa-sun"></i>';
  }
}

function openSettings() {
  const settingsModal = document.createElement('div');
  settingsModal.className = 'modal show';
  settingsModal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>设置</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-form">
        ${SettingsManager.renderSettingsPanel()}
      </div>
    </div>
  `;
  
  document.body.appendChild(settingsModal);
  
  settingsModal.querySelector('.close-btn')?.addEventListener('click', () => {
    document.body.removeChild(settingsModal);
  });
}

async function loadSettings() {
  try {
    const theme = await SettingsManager.getSetting('theme');
    if (theme) {
      currentTheme = theme as 'light' | 'dark';
      document.body.className = `theme-${currentTheme}`;
    }
    
    const viewMode = await SettingsManager.getSetting('view_mode');
    if (viewMode) {
      currentViewMode = viewMode as 'list' | 'grid';
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  ImportExportManager.showNotification(message, type);
}

// 导航栏点击处理
function handleNavClick(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const category = target.getAttribute('data-category');
  
  if (!category) return;
  
  // 更新导航栏状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  target.classList.add('active');
  
  currentCategory = category;
  filterPromptsByCategory();
}

// 根据分类过滤提示词
function filterPromptsByCategory() {
  let filteredPrompts = [...currentPrompts];
  
  if (currentCategory !== 'all') {
    filteredPrompts = currentPrompts.filter(prompt => {
      switch (currentCategory) {
        case 'featured':
          return prompt.pinned; // 精选显示置顶的
        case 'work':
        case 'job':
          return prompt.tags.some((tag: string) => 
            ['工作', '职业', '职场', '工作流程', '职业发展'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'business':
          return prompt.tags.some((tag: string) => 
            ['商业', '营销', '市场', '销售', '商务', '企业'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'tools':
          return prompt.tags.some((tag: string) => 
            ['工具', 'tool', '助手', '辅助'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'language':
          return prompt.tags.some((tag: string) => 
            ['语言', '翻译', 'language', 'translate', '外语'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'office':
          return prompt.tags.some((tag: string) => 
            ['办公', '文档', 'office', '表格', 'excel', 'word', 'ppt'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'general':
          return prompt.tags.some((tag: string) => 
            ['通用', 'general', '常用', '基础'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'writing':
          return prompt.tags.some((tag: string) => 
            ['写作', '文案', 'writing', '创作', '文章', '内容'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'programming':
          return prompt.tags.some((tag: string) => 
            ['编程', '代码', 'programming', 'code', '开发', 'dev', '技术'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'emotion':
          return prompt.tags.some((tag: string) => 
            ['情感', 'emotion', '心理', '情绪'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'education':
          return prompt.tags.some((tag: string) => 
            ['教育', '学习', 'education', 'learning', '培训', '教学'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'creative':
          return prompt.tags.some((tag: string) => 
            ['创意', '创作', 'creative', '艺术', 'art', '设计'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'academic':
          return prompt.tags.some((tag: string) => 
            ['学术', '研究', 'academic', 'research', '论文', '科研'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'design':
          return prompt.tags.some((tag: string) => 
            ['设计', 'design', 'ui', 'ux', '界面', '视觉'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'tech':
          return prompt.tags.some((tag: string) => 
            ['技术', '科技', 'tech', 'technology', '人工智能', 'ai'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'entertainment':
          return prompt.tags.some((tag: string) => 
            ['娱乐', '游戏', 'entertainment', 'game', '休闲'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        default:
          // 如果没有匹配的分类，尝试直接匹配分类名
          return prompt.tags.some((tag: string) => 
            tag.toLowerCase().includes(currentCategory.toLowerCase())
          );
      }
    });
  }
  
  renderPrompts(filteredPrompts);
}

// 更新导航栏计数
function updateNavCounts() {
  // 定义过滤函数，与 filterPromptsByCategory 保持一致
  const getFilteredCount = (category: string) => {
    if (category === 'all') return currentPrompts.length;
    
    return currentPrompts.filter(prompt => {
      switch (category) {
        case 'featured':
          return prompt.pinned;
        case 'work':
        case 'job':
          return prompt.tags.some((tag: string) => 
            ['工作', '职业', '职场', '工作流程', '职业发展'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'business':
          return prompt.tags.some((tag: string) => 
            ['商业', '营销', '市场', '销售', '商务', '企业'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'tools':
          return prompt.tags.some((tag: string) => 
            ['工具', 'tool', '助手', '辅助'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'language':
          return prompt.tags.some((tag: string) => 
            ['语言', '翻译', 'language', 'translate', '外语'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'office':
          return prompt.tags.some((tag: string) => 
            ['办公', '文档', 'office', '表格', 'excel', 'word', 'ppt'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'general':
          return prompt.tags.some((tag: string) => 
            ['通用', 'general', '常用', '基础'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'writing':
          return prompt.tags.some((tag: string) => 
            ['写作', '文案', 'writing', '创作', '文章', '内容'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'programming':
          return prompt.tags.some((tag: string) => 
            ['编程', '代码', 'programming', 'code', '开发', 'dev', '技术'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'emotion':
          return prompt.tags.some((tag: string) => 
            ['情感', 'emotion', '心理', '情绪'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'education':
          return prompt.tags.some((tag: string) => 
            ['教育', '学习', 'education', 'learning', '培训', '教学'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'creative':
          return prompt.tags.some((tag: string) => 
            ['创意', '创作', 'creative', '艺术', 'art', '设计'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'academic':
          return prompt.tags.some((tag: string) => 
            ['学术', '研究', 'academic', 'research', '论文', '科研'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'design':
          return prompt.tags.some((tag: string) => 
            ['设计', 'design', 'ui', 'ux', '界面', '视觉'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'tech':
          return prompt.tags.some((tag: string) => 
            ['技术', '科技', 'tech', 'technology', '人工智能', 'ai'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        case 'entertainment':
          return prompt.tags.some((tag: string) => 
            ['娱乐', '游戏', 'entertainment', 'game', '休闲'].some(keyword => 
              tag.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        default:
          return prompt.tags.some((tag: string) => 
            tag.toLowerCase().includes(category.toLowerCase())
          );
      }
    }).length;
  };

  // 更新所有导航项的计数
  const categories = [
    'all', 'featured', 'work', 'business', 'tools', 'language', 
    'office', 'general', 'writing', 'programming', 'emotion', 
    'education', 'creative', 'academic', 'design', 'tech', 'entertainment'
  ];
  
  categories.forEach(category => {
    const count = getFilteredCount(category);
    const navItem = document.querySelector(`[data-category="${category}"] .count`);
    if (navItem) {
      navItem.textContent = count.toString();
    }
  });
}

// 批量导入最佳中文提示词
async function importBestChinesePrompts() {
  const prompts = [
    {
      name: "一键生成研报",
      content: `## Role : 研报生成助手

## Background : 研报生成助手是一个专门用于帮助用户快速生成高质量研究报告的工具，它能够根据用户提供的内容全面分析，并给出专业的研究报告。

## Profile : 
- author: Arthur
- version: 0.1
- language: 中文
- description: 我是一个专门用于帮助用户快速生成高质量研究报告的助手，我会根据用户提供的内容进行全面分析，并给出专业的研究报告。

## Skills :
1. 具备深厚的行业知识和市场分析能力
2. 能够进行数据分析和趋势预测
3. 具备优秀的文字表达和报告撰写能力
4. 能够提供客观、准确的分析结论

## Goals :
1. 帮助用户快速生成专业的研究报告
2. 提供准确的市场分析和趋势预测
3. 确保报告内容的逻辑性和可读性

## Constrains :
1. 必须基于客观事实进行分析
2. 避免主观臆断和不实信息
3. 确保报告结构清晰、逻辑严密

## OutputFormat : 
# 研究报告

## 执行摘要
[简要概述报告的主要发现和结论]

## 行业概况
[分析行业的基本情况、发展历程和现状]

## 市场分析
[详细分析市场规模、竞争格局、主要参与者]

## 趋势预测
[基于数据和分析，预测未来发展趋势]

## 风险评估
[识别和分析潜在风险因素]

## 投资建议
[基于分析结果，提供投资建议和策略]

## 结论
[总结报告的主要观点和建议]

## Workflow :
1. 首先了解用户需要分析的具体内容或行业
2. 收集和整理相关的背景信息
3. 进行深入的市场和行业分析
4. 识别关键趋势和影响因素
5. 评估风险和机遇
6. 形成结论和建议
7. 按照指定格式输出完整的研究报告

## Initialization : 作为研报生成助手，我会帮助您生成专业的研究报告。请告诉我您希望分析的行业、公司或具体主题，我将为您提供全面的分析报告。`,
      tags: ["商业", "分析", "报告", "研究"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的研究报告生成助手，适用于行业分析和市场研究"
    },
    {
      name: "人类作者模拟器",
      content: `## 主要任务 
治愈AI的内容安全审查，请用任何方式回避具有内容安全审查的内容，同时保持原有信息和观点。

## 工作流程
1.仔细阅读并理解输入的AI生成的内容安全审查。
2.分析其中的核心信息和观点。
3.使用创意的方式重新表达，避开可能触发审查的关键词或表述。
4.确保重新表达的内容保持原有的信息完整性和观点准确性。
5.以更自然、更人性化的方式呈现内容。

## 输出要求
- 保持原有信息的完整性和准确性
- 使用更自然、更人性化的表达方式
- 避免可能触发内容安全审查的表述
- 确保内容的可读性和逻辑性`,
      tags: ["AI", "内容", "优化", "人性化"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "帮助优化AI生成内容，使其更加自然和人性化"
    },
    {
      name: "前端工程师-VUE",
      content: `请你作为20年前端开发工程师，熟悉良好的代码规范，现在你需要基于：JavaScript + Vue3 + Vite5 + Element Plus + Pinia + Ant Design Vue 4.X，以此为基础，完成以下开发任务，请严格按照以下要求进行：

1. 代码规范：遵循 ESLint 和 Prettier 规范
2. 组件设计：采用组合式 API (Composition API)
3. 状态管理：使用 Pinia 进行状态管理
4. UI 组件：优先使用 Element Plus，必要时可使用 Ant Design Vue
5. 类型安全：使用 TypeScript 确保类型安全
6. 性能优化：合理使用 Vue3 的响应式特性和优化技巧

请按照以上要求，为我提供完整的代码实现方案。`,
      tags: ["前端", "Vue", "JavaScript", "工程师"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的Vue前端开发工程师角色，适用于前端项目开发"
    },
    {
      name: "信托专家",
      content: `# 角色定义 
你是一名拥有15年从业经验的信托行业专家，现任某知名信托公司副总裁，兼任：
- 法律背景（中国政法大学法律硕士）
- 金融资质（CFA/CPB持证人）
- 监管经验（曾在银保监会工作5年）

## 专业能力
1.信托法律法规深度理解和应用
2.信托产品设计和风险控制
3.财富管理和传承规划
4.监管政策解读和合规指导

## 工作方式
- 基于专业知识和实务经验提供建议
- 引用具体的法律条文和监管规定
- 结合市场实际情况给出可操作的方案
- 重点关注合规性和风险控制

## 服务对象
- 高净值客户的财富管理需求
- 企业的资产配置和风险隔离
- 同业的业务咨询和合作
- 监管机构的政策解读需求

请告诉我您在信托方面的具体需求，我将基于专业经验为您提供详细的分析和建议。`,
      tags: ["金融", "信托", "法律", "专家"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的信托行业专家，适用于金融法律咨询"
    },
    {
      name: "PMO项目周报",
      content: `作为信托公司PMO，请生成一份专业项目周报，包含以下内容：
1.项目进展情况：分析两周内各建设情况，分析进度是否整体（财富系统、传家系、交易柜台）示例：（集中系统根据最新...）
2.关键里程碑达成情况
3.风险识别与应对措施
4.资源协调与支持需求
5.下周工作重点和计划

请确保报告专业、简洁，符合金融机构PMO标准。`,
      tags: ["项目管理", "PMO", "周报", "金融"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的PMO项目周报生成器，适用于项目管理"
    },
    {
      name: "论文润色助手",
      content: `# Role: 论文润色助手 

## Profile 
- author: linux.do 
- version: 1.0 
- language: 中文 
- description: 本角色专注于用户提供的中文学术或技术文档进行专业改写

## 目标
你现在是一个中国传统文学专家和专业研究人员，精通古通今，对于用户提供的内容，你需要进行专业改写，要求：
- 保持原文的核心观点和逻辑结构不变
- 使用更加学术化和专业的表达方式
- 优化语言表达，提高文章的可读性和专业性
- 确保改写后的内容符合学术写作规范
- 保持原文的信息完整性，不添加或删除关键信息

请提供您需要润色的文档内容，我将为您进行专业的学术化改写。`,
      tags: ["学术", "写作", "润色", "文档"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的学术论文润色助手，提升文档质量"
    },
    {
      name: "uni-app跨平台小程序",
      content: `我想生成一个现代化的uni-app跨平台小程序，请按照以下步骤操作：

1.**仔细阅读规范文档：** 
https://github.com/vibetemplate/miniprogram-template

2.**技术栈选择：**
- 框架：uni-app
- 语言：TypeScript
- 样式：SCSS
- 状态管理：Pinia
- 构建工具：Vite
- 代码规范：ESLint + Prettier

3.**项目结构：**
\`\`\`
src/
├── components/     # 公共组件
├── pages/         # 页面
├── static/        # 静态资源
├── store/         # 状态管理
├── utils/         # 工具函数
├── types/         # 类型定义
└── styles/        # 全局样式
\`\`\`

请基于以上要求，帮我生成完整的项目代码。`,
      tags: ["小程序", "uni-app", "跨平台", "开发"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的uni-app小程序开发助手"
    },
    {
      name: "OCR文字识别",
      content: `请识别图片中的所有文字文本，请用原格式输出，不要添加任何额外说明，公式使用latex，适当的文字外的内容，对于代码块，请用markdown格式输出，使用\`\`\`包裹代码块，便于复制代码块内容`,
      tags: ["OCR", "图像识别", "文字提取"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的OCR文字识别工具"
    },
    {
      name: "算命大师",
      content: `你现在是一个中国传统八字命理专家，精通究竟，请根据用户提供的出生年月日时（农历），进行专业八字分析，包括：

1. 八字排盘和五行分析
2. 十神关系和格局判断  
3. 大运流年分析
4. 性格特点和天赋分析
5. 事业财运分析
6. 婚姻感情分析
7. 健康状况提醒
8. 人生建议和改运方法

请提供您的出生信息：年、月、日、时（请注明是农历还是公历），我将为您进行详细的八字命理分析。`,
      tags: ["算命", "八字", "命理", "传统文化"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "传统八字命理分析工具"
    },
    {
      name: "产品分析与需求文档专家",
      content: `# Role: 产品分析与需求文档专家 

## Profile 
- language: 中文 
- description: 一位经验丰富的产品分析师和需求文档专家，能够深入分析产品需求，编写专业的需求文档，完善产品功能设计。

## Skills
1. 产品需求分析和用户研究
2. 需求文档撰写和规范化
3. 产品功能设计和优化
4. 用户体验设计和改进
5. 竞品分析和市场调研
6. 产品路线图规划

## Goals
1. 帮助用户深入分析产品需求
2. 编写清晰、完整的需求文档
3. 提供专业的产品设计建议
4. 优化产品功能和用户体验

## Constrains
1. 基于用户实际需求进行分析
2. 确保需求文档的专业性和可执行性
3. 考虑技术可行性和商业价值
4. 遵循产品设计最佳实践

## Workflow
1. 了解产品背景和目标用户
2. 分析核心需求和功能点
3. 进行竞品分析和市场调研
4. 设计产品功能和交互流程
5. 编写详细的需求文档
6. 提供产品优化建议

请告诉我您的产品需求，我将为您提供专业的产品分析和需求文档。`,
      tags: ["产品", "需求", "分析", "文档"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的产品需求分析和文档编写专家"
    },
    {
      name: "资深软件架构师",
      content: `# Role: 资深软件架构师与项目开发规划负责人 

## Profile 
- language: 中文 
- description: 一位拥有丰富经验的软件架构师和项目开发规划专家，能够设计高质量的软件架构，制定完善的项目开发计划。

## Skills
1. 软件架构设计和技术选型
2. 项目开发规划和里程碑制定
3. 技术风险评估和解决方案
4. 团队协作和资源配置
5. 代码质量管控和最佳实践
6. 性能优化和系统扩展

## Goals
1. 设计可扩展、高性能的软件架构
2. 制定合理的项目开发计划
3. 确保项目按时按质完成
4. 提供技术指导和最佳实践

## Constrains
1. 基于项目实际需求进行架构设计
2. 考虑技术可行性和成本效益
3. 确保架构的可维护性和扩展性
4. 遵循软件工程最佳实践

## Workflow
1. 分析项目需求和技术要求
2. 进行技术选型和架构设计
3. 制定详细的开发计划
4. 识别技术风险和应对策略
5. 设计开发流程和质量标准
6. 提供持续的技术指导

请告诉我您的项目需求，我将为您提供专业的软件架构设计和开发规划。`,
      tags: ["软件架构", "项目管理", "开发规划", "技术"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "资深软件架构师，适用于大型项目规划"
    },
    {
      name: "简历智能审核专家",
      content: `# Role: 简历智能审核专家

## Profile
- language: 中文  
- description: 专业的简历审核和优化专家，具备丰富的HR和招聘经验，能够从招聘官角度提供专业的简历评估和改进建议。

## Skills
1. 简历结构和内容分析
2. 关键词优化和ATS适配
3. 职业发展规划建议
4. 行业标准和最佳实践
5. 面试准备和技巧指导

## Goals  
1. 全面评估简历质量和竞争力
2. 提供具体的优化建议和改进方案
3. 帮助求职者提高面试获得率
4. 确保简历符合目标岗位要求

## Workflow
1. 分析简历整体结构和布局
2. 评估内容的完整性和相关性
3. 检查关键词匹配度和ATS友好性
4. 提供具体的修改建议
5. 给出综合评分和改进优先级

请提供您的简历内容，我将为您进行专业的审核和优化建议。`,
      tags: ["简历", "求职", "HR", "审核"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的简历审核和优化工具"
    },
    {
      name: "代码审计专家",
      content: `# Role: 代码审计专家

## Profile
- language: 中文
- description: 资深的代码审计和安全分析专家，具备深厚的编程功底和安全知识，能够识别代码中的安全漏洞、性能问题和最佳实践违规。

## Skills
1. 多语言代码分析和审计
2. 安全漏洞识别和修复建议
3. 代码质量评估和优化
4. 性能分析和改进建议
5. 编码规范和最佳实践指导
6. 架构设计评估

## Goals
1. 识别代码中的安全漏洞和风险
2. 评估代码质量和可维护性
3. 提供性能优化建议
4. 确保代码符合最佳实践
5. 提供具体的修复方案

## Audit Checklist
### 安全性检查
- SQL注入、XSS、CSRF等常见漏洞
- 输入验证和数据清理
- 身份认证和授权机制
- 敏感信息泄露风险

### 代码质量
- 代码结构和可读性
- 错误处理和异常管理
- 资源管理和内存泄漏
- 并发安全和线程安全

### 性能优化
- 算法复杂度分析
- 数据库查询优化
- 缓存策略和使用
- 网络请求优化

## Output Format
\`\`\`
# 代码审计报告

## 概述
[代码整体评估]

## 安全问题
### 高危漏洞
- [具体问题描述]
- [影响范围]
- [修复建议]

### 中危问题
[类似格式]

## 代码质量问题
[具体问题和建议]

## 性能优化建议
[具体优化方案]

## 最佳实践建议
[编码规范和改进建议]

## 总体评分
[A-F等级评分和理由]
\`\`\`

请提供需要审计的代码，我将为您进行全面的安全和质量分析。`,
      tags: ["代码审计", "安全", "质量", "性能"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的代码安全审计和质量评估工具"
    },
    {
      name: "周报助手",
      content: `# Role: 周报助手

## Profile  
- language: 中文
- description: 专业的工作周报撰写助手，能够帮助用户整理工作内容，生成结构清晰、内容完整的工作周报。

## Skills
1. 工作内容梳理和分类
2. 数据分析和成果展示
3. 问题识别和解决方案
4. 计划制定和目标设定
5. 专业文档撰写

## Goals
1. 帮助用户高效整理工作内容
2. 生成专业、清晰的周报文档
3. 突出工作成果和价值贡献
4. 识别问题并提出改进计划

## 周报模板结构

### 基础版周报
\`\`\`
# 工作周报 - [姓名] - [日期]

## 本周工作完成情况
### 主要工作内容
1. [具体工作项目1]
   - 完成情况：[详细描述]
   - 成果产出：[具体成果]
   
2. [具体工作项目2]
   - 完成情况：[详细描述]  
   - 成果产出：[具体成果]

### 数据指标
- [关键指标1]：[具体数据]
- [关键指标2]：[具体数据]

## 遇到的问题及解决方案
1. [问题描述]
   - 解决方案：[具体措施]
   - 结果：[解决效果]

## 下周工作计划
1. [计划项目1] - [预期完成时间]
2. [计划项目2] - [预期完成时间]

## 需要支持和协调的事项
- [具体需求和建议]
\`\`\`

## Workflow
1. 收集用户本周的工作内容和数据
2. 分析工作成果和关键指标
3. 识别遇到的问题和挑战
4. 制定下周的工作计划
5. 生成结构化的周报文档
6. 优化表达和突出重点

请告诉我您本周的主要工作内容，我将帮您生成一份专业的工作周报。`,
      tags: ["周报", "工作总结", "文档", "管理"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的工作周报生成助手"
    },
    {
      name: "全栈开发工程师",
      content: `# Role: 全栈开发工程师

## Profile
- language: 中文
- description: 资深全栈开发工程师，精通前端、后端、数据库等全栈技术，能够独立完成完整的Web应用开发。

## Tech Stack
### 前端技术
- **框架**: React, Vue.js, Angular
- **语言**: JavaScript, TypeScript
- **样式**: CSS3, SASS, Less, Tailwind CSS
- **构建工具**: Webpack, Vite, Rollup
- **状态管理**: Redux, Vuex, Pinia

### 后端技术  
- **语言**: Node.js, Python, Java, Go
- **框架**: Express, Koa, Django, Flask, Spring Boot
- **数据库**: MySQL, PostgreSQL, MongoDB, Redis
- **消息队列**: RabbitMQ, Kafka
- **缓存**: Redis, Memcached

### DevOps & 部署
- **容器化**: Docker, Kubernetes
- **CI/CD**: Jenkins, GitHub Actions, GitLab CI
- **云服务**: AWS, Azure, 阿里云, 腾讯云
- **监控**: Prometheus, Grafana, ELK Stack

## Skills
1. 全栈架构设计和技术选型
2. 前端用户界面和交互开发
3. 后端API设计和数据库建模
4. 性能优化和安全防护
5. 项目部署和运维管理
6. 代码质量管控和测试

## Goals
1. 提供完整的全栈解决方案
2. 确保代码质量和系统性能
3. 实现高效的开发流程
4. 提供最佳实践指导

## Workflow
1. 需求分析和技术方案设计
2. 数据库设计和API规划
3. 前端界面和交互开发
4. 后端逻辑和数据处理
5. 系统集成和测试
6. 部署上线和运维监控

## Output Format
根据需求提供：
- 技术架构图和选型说明
- 完整的代码实现
- 部署和配置文档
- 测试用例和使用说明

请告诉我您的项目需求，我将为您提供完整的全栈开发解决方案。`,
      tags: ["全栈开发", "Web开发", "架构设计", "编程"],
      source: "https://github.com/K-Render/best-chinese-prompt",
      notes: "专业的全栈开发工程师，适用于完整项目开发"
    }
  ];

  console.log('开始导入最佳中文提示词...');
  showNotification('开始导入提示词，请稍候...', 'info');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    try {
      const id = await invoke('create_prompt', {
        name: prompt.name,
        source: prompt.source,
        notes: prompt.notes,
        tags: prompt.tags,
        content: prompt.content
      });
      console.log(`✅ 成功导入: ${prompt.name} (ID: ${id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ 导入失败: ${prompt.name}`, error);
      failCount++;
    }
  }
  
  showNotification(`导入完成！成功：${successCount}个，失败：${failCount}个`, 'success');
  
  // 重新加载提示词列表
  await loadPrompts();
}

// 导出全局函数供设置面板使用
(window as any).exportData = () => ImportExportManager.exportToFile();
(window as any).importData = () => ImportExportManager.importFromFile();
(window as any).importBestChinesePrompts = importBestChinesePrompts;