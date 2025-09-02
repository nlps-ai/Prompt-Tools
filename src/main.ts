import './styles.css';
import { invoke } from '@tauri-apps/api/core';

// 应用状态
let currentPrompts: any[] = [];
let currentCategory = 'all';
let isGridView = true;

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Prompt Tools 启动中...');
  
  // 初始化键盘快捷键
  initKeyboardShortcuts();
  
  // 绑定事件
  bindEvents();
  
  // 加载数据
  await loadPrompts();
  
  // 初始化主题
  initTheme();
});

// 绑定事件监听器
function bindEvents() {
  // 搜索功能
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // 分类导航
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', handleCategoryClick);
  });
  
  // 工具栏按钮
  document.getElementById('createBtn')?.addEventListener('click', () => openModal());
  document.getElementById('importBtn')?.addEventListener('click', handleImport);
  document.getElementById('exportBtn')?.addEventListener('click', handleExport);
  document.getElementById('importBestBtn')?.addEventListener('click', handleImportBest);
  document.getElementById('viewToggle')?.addEventListener('click', toggleView);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
  
  // 模态框
  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closeModal);
  document.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
  document.getElementById('promptForm')?.addEventListener('submit', handleFormSubmit);
}

// 加载提示词
async function loadPrompts() {
  try {
    const prompts = await invoke('get_all_prompts');
    currentPrompts = prompts as any[];
    console.log('加载的提示词:', currentPrompts);
    renderPrompts(currentPrompts);
    updateCategoryCounts();
  } catch (error) {
    console.error('加载提示词失败:', error);
    currentPrompts = [];
    renderPrompts([]);
  }
}

// 渲染提示词列表
function renderPrompts(prompts: any[]) {
  const promptList = document.getElementById('promptList');
  if (!promptList) return;
  
  if (prompts.length === 0) {
    promptList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-magic"></i>
        <h3>暂无提示词</h3>
        <p>点击"创建提示词"开始添加您的第一个提示词</p>
        <button class="btn btn-primary" onclick="document.getElementById('createBtn').click()">
          <i class="fas fa-plus"></i>
          创建提示词
        </button>
      </div>
    `;
    return;
  }
  
  promptList.innerHTML = prompts.map(prompt => `
    <div class="prompt-card" data-id="${prompt.id}">
      ${prompt.pinned ? '<div class="pin-indicator"><i class="fas fa-thumbtack"></i></div>' : ''}
      
      <div class="card-header">
        <h3 class="card-title">${prompt.name}</h3>
        <div class="card-actions">
          <button class="btn btn-icon" onclick="togglePin(${prompt.id})" title="${prompt.pinned ? '取消置顶' : '置顶'}">
            <i class="fas fa-thumbtack ${prompt.pinned ? 'pinned' : ''}"></i>
          </button>
          <button class="btn btn-icon" onclick="copyPrompt(${prompt.id})" title="复制">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn btn-icon" onclick="editPrompt(${prompt.id})" title="编辑">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-icon" onclick="deletePrompt(${prompt.id})" title="删除">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <div class="card-meta">
        ${prompt.source ? `
          <div class="meta-item">
            <i class="fas fa-link"></i>
            <span>${prompt.source}</span>
          </div>
        ` : ''}
        <div class="meta-item">
          <i class="fas fa-clock"></i>
          <span>${formatDate(prompt.updated_at)}</span>
        </div>
      </div>
      
      ${prompt.tags && prompt.tags.length > 0 ? `
        <div class="card-tags">
          ${prompt.tags.map((tag: string) => 
            `<span class="tag">${tag}</span>`
          ).join('')}
        </div>
      ` : ''}
      
      <div class="card-content">
        ${prompt.content.length > 200 ? prompt.content.substring(0, 200) + '...' : prompt.content}
      </div>
      
      ${prompt.notes ? `
        <div class="card-notes">
          <i class="fas fa-sticky-note"></i>
          <span>${prompt.notes}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// 创建分类项目
function createCategoryItem(category: string, displayName: string, count: number, isActive: boolean): HTMLElement {
  const item = document.createElement('div');
  item.className = `nav-item ${isActive ? 'active' : ''}`;
  item.setAttribute('data-category', category);
  item.innerHTML = `
    <span class="nav-text">${displayName}</span>
    <span class="count">${count}</span>
  `;
  item.addEventListener('click', handleCategoryClick);
  return item;
}

// 更新分类计数
async function updateCategoryCounts() {
  try {
    // 获取分类统计数据
    const categoryStats = await invoke('get_category_counts') as Record<string, number>;
    
    // 更新"全部"分类的计数
    const allNavItem = document.querySelector('[data-category="all"] .count');
    if (allNavItem) {
      allNavItem.textContent = currentPrompts.length.toString();
    }
    
    // 更新现有分类的计数
    const allNavItems = document.querySelectorAll('.nav-item[data-category]');
    allNavItems.forEach(item => {
      const category = item.getAttribute('data-category');
      if (category && category !== 'all' && category !== 'featured') {
        const countElement = item.querySelector('.count');
        if (countElement) {
          const count = categoryStats[category] || 0;
          countElement.textContent = count.toString();
          // 显示所有分类，即使计数为0
          (item as HTMLElement).style.display = 'flex';
        }
      }
    });
    
    console.log('分类统计更新完成:', categoryStats);
  } catch (error) {
    console.error('获取分类统计失败:', error);
    // 如果获取失败，至少更新"全部"分类
    const allNavItem = document.querySelector('[data-category="all"] .count');
    if (allNavItem) {
      allNavItem.textContent = currentPrompts.length.toString();
    }
  }
}

// 处理搜索
function handleSearch(e: Event) {
  const query = (e.target as HTMLInputElement).value.toLowerCase();
  const filteredPrompts = currentPrompts.filter(prompt => 
    prompt.name.toLowerCase().includes(query) ||
    prompt.content.toLowerCase().includes(query) ||
    (prompt.tags && prompt.tags.some((tag: string) => tag.toLowerCase().includes(query)))
  );
  renderPrompts(filteredPrompts);
}

// 处理分类点击
async function handleCategoryClick(e: Event) {
  const item = e.currentTarget as HTMLElement;
  const category = item.getAttribute('data-category');
  
  console.log('点击分类:', category);
  
  // 更新活跃状态
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.remove('active');
  });
  item.classList.add('active');
  
  currentCategory = category || 'all';
  
  try {
    let filteredPrompts = currentPrompts;
    
    if (category === 'all') {
      // 显示所有提示词
      filteredPrompts = currentPrompts;
    } else if (category === 'featured') {
      // 显示置顶的提示词
      filteredPrompts = currentPrompts.filter(prompt => prompt.pinned);
    } else {
      // 根据分类映射筛选
      const categoryMappings: Record<string, string[]> = {
        'work': ['职业', '工作', '职场', 'career', 'job'],
        'business': ['商业', '商务', 'business', 'marketing', '销售'],
        'tools': ['工具', 'tool', '效率', 'productivity'],
        'language': ['语言', '翻译', 'language', 'translate', '英语'],
        'office': ['办公', 'office', '文档', 'excel', 'ppt'],
        'general': ['通用', 'general', '日常', '常用'],
        'writing': ['写作', '文案', 'writing', 'content', '创作'],
        'programming': ['编程', '代码', 'programming', 'code', '开发'],
        'emotion': ['情感', '心理', 'emotion', '情绪'],
        'education': ['教育', '学习', 'education', 'teaching', '培训'],
        'creative': ['创意', '创新', 'creative', '设计思维'],
        'academic': ['学术', '研究', 'academic', '论文'],
        'design': ['设计', 'UI', 'UX', 'design', '视觉'],
        'tech': ['技术', '科技', 'tech', 'AI', '人工智能'],
        'entertainment': ['娱乐', '游戏', 'entertainment', 'fun']
      };
      
      const keywords = categoryMappings[category as string] || [];
      filteredPrompts = currentPrompts.filter(prompt => {
        if (!prompt.tags || prompt.tags.length === 0) return false;
        
        return prompt.tags.some((tag: string) => {
          const tagLower = tag.toLowerCase();
          return keywords.some((keyword: string) => 
            tagLower.includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(tagLower)
          );
        });
      });
    }
    
    console.log('筛选后的提示词数量:', filteredPrompts.length);
    renderPrompts(filteredPrompts);
  } catch (error) {
    console.error('筛选提示词失败:', error);
    renderPrompts(currentPrompts);
  }
}

// 打开模态框
function openModal(prompt?: any) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('promptForm') as HTMLFormElement;
  
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  if (prompt) {
    if (modalTitle) modalTitle.textContent = '编辑提示词';
    fillForm(prompt);
  } else {
    if (modalTitle) modalTitle.textContent = '创建提示词';
    if (form) form.reset();
  }
}

// 关闭模态框
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// 填充表单
function fillForm(prompt: any) {
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const sourceInput = document.getElementById('source') as HTMLInputElement;
  const tagsInput = document.getElementById('tags') as HTMLInputElement;
  const contentInput = document.getElementById('content') as HTMLTextAreaElement;
  const notesInput = document.getElementById('notes') as HTMLTextAreaElement;
  
  if (nameInput) nameInput.value = prompt.name || '';
  if (sourceInput) sourceInput.value = prompt.source || '';
  if (tagsInput) tagsInput.value = prompt.tags ? prompt.tags.join(', ') : '';
  if (contentInput) contentInput.value = prompt.content || '';
  if (notesInput) notesInput.value = prompt.notes || '';
}

// 处理表单提交
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  
  const formData = new FormData(e.target as HTMLFormElement);
  const name = formData.get('name') as string;
  const source = formData.get('source') as string;
  const tags = formData.get('tags') as string;
  const content = formData.get('content') as string;
  const notes = formData.get('notes') as string;
  
  try {
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    await invoke('create_prompt', {
      name,
      source: source || null,
      notes: notes || null,
      tags: tagsArray,
      content
    });
    
    showNotification('提示词创建成功！', 'success');
    closeModal();
    await loadPrompts();
  } catch (error) {
    console.error('创建失败:', error);
    showNotification('创建失败: ' + error, 'error');
  }
}

// 全局函数 - 确保这些函数在全局作用域中可用
(window as any).copyPrompt = async (id: number) => {
  try {
    const prompt = currentPrompts.find(p => p.id === id);
    if (prompt) {
      await navigator.clipboard.writeText(prompt.content);
      showNotification('已复制到剪贴板', 'success');
    }
  } catch (error) {
    console.error('复制失败:', error);
    showNotification('复制失败', 'error');
  }
};

(window as any).editPrompt = (id: number) => {
  const prompt = currentPrompts.find(p => p.id === id);
  if (prompt) {
    openModal(prompt);
  }
};

(window as any).deletePrompt = async (id: number) => {
  console.log('删除提示词:', id, '类型:', typeof id); // 调试日志
  
  // 使用自定义确认对话框
  const confirmed = await showConfirmDialog('确定要删除这个提示词吗？');
  console.log('用户确认结果:', confirmed); // 调试日志
  
  if (confirmed) {
    try {
      console.log('开始删除提示词:', id); // 调试日志
      const result = await invoke('delete_prompt', { id });
      console.log('删除操作返回结果:', result);
      showNotification('删除成功', 'success');
      await loadPrompts(); // 重新加载列表
    } catch (error) {
      console.error('删除失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      showNotification('删除失败: ' + error, 'error');
    }
  } else {
    console.log('用户取消了删除操作');
  }
};

(window as any).togglePin = async (id: number) => {
  try {
    await invoke('toggle_pin', { id });
    await loadPrompts();
  } catch (error) {
    console.error('置顶操作失败:', error);
    showNotification('操作失败', 'error');
  }
};

// 导入导出功能
async function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await invoke('import_data', { data });
      showNotification('导入成功！', 'success');
      await loadPrompts();
    } catch (error) {
      console.error('导入失败:', error);
      showNotification('导入失败: ' + error, 'error');
    }
  };
  input.click();
}

async function handleExport() {
  try {
    const data = await invoke('export_data');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('导出成功！', 'success');
  } catch (error) {
    console.error('导出失败:', error);
    showNotification('导出失败: ' + error, 'error');
  }
}

async function handleImportBest() {
  showNotification('精选提示词导入功能开发中...', 'info');
}

// 视图切换
function toggleView() {
  const promptList = document.getElementById('promptList');
  const viewToggle = document.getElementById('viewToggle');
  
  if (promptList && viewToggle) {
    isGridView = !isGridView;
    
    if (isGridView) {
      promptList.classList.remove('list-view');
      viewToggle.innerHTML = '<i class="fas fa-list"></i>';
    } else {
      promptList.classList.add('list-view');
      viewToggle.innerHTML = '<i class="fas fa-th"></i>';
    }
  }
}

// 主题切换
function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  
  if (body.classList.contains('theme-light')) {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', 'dark');
  } else {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', 'light');
  }
}

// 初始化主题
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  
  if (savedTheme === 'dark') {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// 设置面板
function openSettings() {
  showNotification('设置功能开发中...', 'info');
}

// 键盘快捷键
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: 新建提示词
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openModal();
    }
    
    // Ctrl/Cmd + F: 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    
    // Escape: 关闭模态框
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && modal.classList.contains('show')) {
        closeModal();
      }
    }
  });
}

// 工具函数
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

// 自定义确认对话框
function showConfirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 创建确认对话框HTML，使用现有样式
    const confirmModal = document.createElement('div');
    confirmModal.className = 'overlay confirm-modal';
    confirmModal.innerHTML = `
      <div class="confirm-container">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="confirm-content">
          <div class="confirm-title">确认操作</div>
          <div class="confirm-message">${message}</div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirmCancel">
            <i class="fas fa-times"></i>取消
          </button>
          <button class="btn btn-danger" id="confirmOk">
            <i class="fas fa-check"></i>确定
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // 添加事件监听器
    const cancelBtn = confirmModal.querySelector('#confirmCancel') as HTMLButtonElement;
    const okBtn = confirmModal.querySelector('#confirmOk') as HTMLButtonElement;
    
    const cleanup = () => {
      if (document.body.contains(confirmModal)) {
        document.body.removeChild(confirmModal);
      }
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    okBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    // 点击遮罩层取消
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        cleanup();
        resolve(false);
      }
    });
    
    // ESC键取消
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', handleKeydown);
        resolve(false);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
  });
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#3b82f6';
      break;
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}