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
      
      <div class="card-usage">
        <div class="usage-title">去使用这个提示词</div>
        <div class="usage-platforms">
          <div class="platform-item" data-platform="deepseek" data-prompt-id="${prompt.id}" title="DeepSeek">
            <img src="https://chat.deepseek.com/favicon.ico" alt="DeepSeek" class="platform-icon">
            <span>DeepSeek</span>
          </div>
          <div class="platform-item" data-platform="doubao" data-prompt-id="${prompt.id}" title="豆包">
            <img src="https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png" alt="豆包" class="platform-icon">
            <span>豆包</span>
          </div>
          <div class="platform-item" data-platform="gemini" data-prompt-id="${prompt.id}" title="Gemini">
            <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="platform-icon">
            <span>Gemini</span>
          </div>
          <div class="platform-item" data-platform="claude" data-prompt-id="${prompt.id}" title="Claude">
            <img src="https://claude.ai/favicon.ico" alt="Claude" class="platform-icon">
            <span>Claude</span>
          </div>
          <div class="platform-item" data-platform="chatgpt" data-prompt-id="${prompt.id}" title="ChatGPT">
            <img src="https://chat.openai.com/favicon-32x32.png" alt="ChatGPT" class="platform-icon">
            <span>ChatGPT</span>
          </div>
          <div class="platform-item" data-platform="grok" data-prompt-id="${prompt.id}" title="Grok">
            <img src="https://x.ai/favicon.ico" alt="Grok" class="platform-icon">
            <span>Grok</span>
          </div>
        </div>
      </div>
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

  // 平台使用按钮事件
  document.querySelectorAll('.platform-item').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const platform = target.getAttribute('data-platform');
      const promptIdStr = target.getAttribute('data-prompt-id');
      const promptId = parseInt(promptIdStr || '0');
      
      if (platform && promptId > 0) {
        await usePlatform(platform, promptId);
      }
    });
  });
}

// 使用平台功能
async function usePlatform(platform: string, promptId: number) {
  const prompt = currentPrompts.find(p => p.id === promptId);
  if (!prompt) return;

  const platformUrls: { [key: string]: string } = {
    'deepseek': 'https://chat.deepseek.com/',
    'doubao': 'https://www.doubao.com/chat/',
    'gemini': 'https://gemini.google.com/',
    'claude': 'https://claude.ai/',
    'chatgpt': 'https://chat.openai.com/',
    'grok': 'https://x.ai/grok'
  };

  try {
    // 复制提示词内容到剪贴板
    await navigator.clipboard.writeText(prompt.content);
    
    // 打开对应平台
    const url = platformUrls[platform];
    if (url) {
      window.open(url, '_blank');
      showNotification(`已复制提示词内容并打开${platform.toUpperCase()}`, 'success');
    }
  } catch (error) {
    console.error('Failed to use platform:', error);
    showNotification(`操作失败: ${String(error)}`, 'error');
  }
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