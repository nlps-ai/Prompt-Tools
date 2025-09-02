import { invoke } from "@tauri-apps/api/core";

// 全局变量
let currentPrompts = [];
let currentCategory = 'all';
let editingPromptId = null;

// 分类映射 - 将UI分类映射到数据库标签
const categoryMapping = {
    '职业': ['职业', '工作', '职场', '专业', 'career', 'job', 'professional', '工程师', '专家', '顾问'],
    '商业': ['商业', '业务', '营销', '销售', '管理', 'business', 'marketing', 'sales', 'management', '金融', '投资', '创业'],
    '工具': ['工具', '效率', '实用', 'tool', 'utility', 'productivity', '助手', 'helper', '自动化'],
    '语言': ['语言', '翻译', '英语', '中文', 'language', 'translation', 'english', 'chinese', '学习'],
    '办公': ['办公', '文档', '报告', '会议', 'office', 'document', 'report', 'meeting', '项目管理', 'PMO', '周报'],
    '通用': ['通用', '常用', '基础', 'general', 'common', 'basic', '日常'],
    '写作': ['写作', '文案', '内容', '创作', 'writing', 'content', 'copywriting', '文章', '博客'],
    '编程': ['编程', '代码', '开发', '技术', 'programming', 'coding', 'development', 'tech', '前端', 'Vue', 'JavaScript'],
    '情感': ['情感', '心理', '关系', 'emotion', 'psychology', 'relationship', '沟通'],
    '教育': ['教育', '学习', '培训', '教学', 'education', 'learning', 'training', 'teaching'],
    '创意': ['创意', '设计', '艺术', '想象', 'creative', 'design', 'art', 'imagination', '灵感'],
    '学术': ['学术', '研究', '论文', '分析', 'academic', 'research', 'paper', 'analysis', '研报'],
    '设计': ['设计', 'UI', 'UX', '界面', 'design', 'interface', '视觉', '美术'],
    '艺术': ['艺术', '绘画', '音乐', '文学', 'art', 'painting', 'music', 'literature'],
    '娱乐': ['娱乐', '游戏', '电影', '音乐', 'entertainment', 'game', 'movie', 'music', '休闲']
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('应用初始化开始');
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载提示词数据
    await loadPrompts();
    
    // 更新分类计数
    await updateCategoryCounts();
    
    console.log('应用初始化完成');
});

// 绑定事件监听器
function bindEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // 分类点击
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleCategoryClick);
    });
    
    // 添加提示词按钮
    const addBtn = document.getElementById('add-prompt-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openPromptModal());
    }
    
    // 模态框相关
    const modal = document.getElementById('prompt-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');
    const form = document.getElementById('prompt-form');
    
    if (closeBtn) closeBtn.addEventListener('click', closePromptModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closePromptModal);
    if (saveBtn) saveBtn.addEventListener('click', handleSavePrompt);
    if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSavePrompt();
    });
    
    // 点击模态框背景关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                closePromptModal();
            }
        });
    }
    
    // 字符计数
    const contentTextarea = document.getElementById('prompt-content');
    if (contentTextarea) {
        contentTextarea.addEventListener('input', updateCharacterCount);
    }
}

// 加载所有提示词
async function loadPrompts() {
    try {
        console.log('开始加载提示词...');
        const prompts = await invoke('get_all_prompts');
        currentPrompts = prompts || [];
        console.log(`加载了 ${currentPrompts.length} 个提示词`);
        renderPrompts(currentPrompts);
    } catch (error) {
        console.error('加载提示词失败:', error);
        currentPrompts = [];
        renderPrompts([]);
    }
}

// 更新分类计数
async function updateCategoryCounts() {
    try {
        console.log('开始更新分类计数...');
        
        // 更新"我的"分类计数
        const allNavItem = document.querySelector('[data-category="all"] .count');
        if (allNavItem) {
            allNavItem.textContent = currentPrompts.length.toString();
        }
        
        // 更新"精选"分类计数（置顶的提示词）
        const featuredCount = currentPrompts.filter(prompt => prompt.pinned).length;
        const featuredNavItem = document.querySelector('[data-category="featured"] .count');
        if (featuredNavItem) {
            featuredNavItem.textContent = featuredCount.toString();
        }
        
        // 更新其他分类计数
        Object.keys(categoryMapping).forEach(category => {
            const count = getPromptsByCategory(category).length;
            const navItem = document.querySelector(`[data-category="${category}"] .count`);
            if (navItem) {
                navItem.textContent = count.toString();
            }
        });
        
        console.log('分类计数更新完成');
    } catch (error) {
        console.error('更新分类计数失败:', error);
    }
}

// 根据分类获取提示词
function getPromptsByCategory(category) {
    if (category === 'all') {
        return currentPrompts;
    }
    
    if (category === 'featured') {
        return currentPrompts.filter(prompt => prompt.pinned);
    }
    
    const keywords = categoryMapping[category] || [];
    return currentPrompts.filter(prompt => {
        if (!prompt.tags || !Array.isArray(prompt.tags)) return false;
        
        return prompt.tags.some(tag => {
            const tagLower = tag.toLowerCase();
            return keywords.some(keyword => {
                const keywordLower = keyword.toLowerCase();
                return tagLower.includes(keywordLower) || keywordLower.includes(tagLower);
            });
        });
    });
}

// 处理分类点击
async function handleCategoryClick(e) {
    const item = e.currentTarget;
    const category = item.getAttribute('data-category');
    
    console.log('点击分类:', category);
    
    // 更新活跃状态
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    item.classList.add('active');
    
    // 更新当前分类
    currentCategory = category;
    
    // 筛选并显示提示词
    const filteredPrompts = getPromptsByCategory(category);
    console.log(`分类 ${category} 包含 ${filteredPrompts.length} 个提示词`);
    renderPrompts(filteredPrompts);
}

// 处理搜索
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        // 如果搜索为空，显示当前分类的所有提示词
        const filteredPrompts = getPromptsByCategory(currentCategory);
        renderPrompts(filteredPrompts);
        return;
    }
    
    // 在当前分类中搜索
    const categoryPrompts = getPromptsByCategory(currentCategory);
    const searchResults = categoryPrompts.filter(prompt => 
        prompt.name.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(query))) ||
        (prompt.source && prompt.source.toLowerCase().includes(query))
    );
    
    console.log(`搜索 "${query}" 找到 ${searchResults.length} 个结果`);
    renderPrompts(searchResults);
}

// 渲染提示词列表
function renderPrompts(prompts) {
    const grid = document.getElementById('prompt-grid');
    if (!grid) return;
    
    if (!prompts || prompts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i>📝</i>
                <h3>暂无提示词</h3>
                <p>点击上方"添加提示词"按钮开始创建您的第一个提示词</p>
            </div>
        `;
        return;
    }
    
    // 按置顶状态和创建时间排序
    const sortedPrompts = [...prompts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    grid.innerHTML = sortedPrompts.map(prompt => createPromptCard(prompt)).join('');
}

// 创建提示词卡片
function createPromptCard(prompt) {
    const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
    const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    return `
        <div class="prompt-card ${prompt.pinned ? 'pinned' : ''}" data-id="${prompt.id}">
            ${prompt.pinned ? '<div class="pin-indicator">📌</div>' : ''}
            
            <div class="card-header">
                <h3 class="card-title">${prompt.name}</h3>
                <div class="card-actions">
                    <button class="btn-icon" onclick="editPrompt(${prompt.id})" title="编辑">
                        <i>✏️</i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deletePrompt(${prompt.id})" title="删除">
                        <i>🗑️</i>
                    </button>
                </div>
            </div>
            
            <div class="card-meta">
                ${prompt.source ? `<div class="meta-item"><i>📍</i><span>${prompt.source}</span></div>` : ''}
                <div class="meta-item">
                    <i>📅</i>
                    <span>${new Date(prompt.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            ${tags.length > 0 ? `<div class="card-tags">${tagsHtml}</div>` : ''}
            
            <div class="card-content">${prompt.content}</div>
            
            ${prompt.notes ? `
                <div class="card-notes">
                    <i>💡</i>
                    <span>${prompt.notes}</span>
                </div>
            ` : ''}
        </div>
    `;
}

// 打开提示词模态框
function openPromptModal(prompt = null) {
    const modal = document.getElementById('prompt-modal');
    const title = document.getElementById('modal-title');
    
    if (prompt) {
        // 编辑模式
        editingPromptId = prompt.id;
        title.textContent = '编辑提示词';
        
        document.getElementById('prompt-name').value = prompt.name || '';
        document.getElementById('prompt-content').value = prompt.content || '';
        document.getElementById('prompt-tags').value = Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '';
        document.getElementById('prompt-source').value = prompt.source || '';
        document.getElementById('prompt-notes').value = prompt.notes || '';
        document.getElementById('prompt-pinned').checked = prompt.pinned || false;
    } else {
        // 添加模式
        editingPromptId = null;
        title.textContent = '添加提示词';
        
        document.getElementById('prompt-form').reset();
    }
    
    modal.classList.add('show');
    updateCharacterCount();
}

// 关闭提示词模态框
function closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    modal.classList.remove('show');
    editingPromptId = null;
}

// 处理保存提示词
async function handleSavePrompt() {
    const name = document.getElementById('prompt-name').value.trim();
    const content = document.getElementById('prompt-content').value.trim();
    const tagsInput = document.getElementById('prompt-tags').value.trim();
    const source = document.getElementById('prompt-source').value.trim();
    const notes = document.getElementById('prompt-notes').value.trim();
    const pinned = document.getElementById('prompt-pinned').checked;
    
    if (!name || !content) {
        alert('请填写名称和内容');
        return;
    }
    
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const promptData = {
        name,
        content,
        tags,
        source: source || null,
        notes: notes || null,
        pinned
    };
    
    try {
        if (editingPromptId) {
            // 更新现有提示词
            await invoke('update_prompt', { 
                id: editingPromptId, 
                ...promptData 
            });
            console.log('提示词更新成功');
        } else {
            // 添加新提示词
            await invoke('add_prompt', promptData);
            console.log('提示词添加成功');
        }
        
        closePromptModal();
        await loadPrompts();
        await updateCategoryCounts();
        
        // 重新筛选当前分类
        const filteredPrompts = getPromptsByCategory(currentCategory);
        renderPrompts(filteredPrompts);
        
    } catch (error) {
        console.error('保存提示词失败:', error);
        alert('保存失败: ' + error);
    }
}

// 编辑提示词
window.editPrompt = async function(id) {
    const prompt = currentPrompts.find(p => p.id === id);
    if (prompt) {
        openPromptModal(prompt);
    }
};

// 删除提示词
window.deletePrompt = async function(id) {
    if (!confirm('确定要删除这个提示词吗？')) {
        return;
    }
    
    try {
        await invoke('delete_prompt', { id });
        console.log('提示词删除成功');
        
        await loadPrompts();
        await updateCategoryCounts();
        
        // 重新筛选当前分类
        const filteredPrompts = getPromptsByCategory(currentCategory);
        renderPrompts(filteredPrompts);
        
    } catch (error) {
        console.error('删除提示词失败:', error);
        alert('删除失败: ' + error);
    }
};

// 更新字符计数
function updateCharacterCount() {
    const textarea = document.getElementById('prompt-content');
    const counter = document.getElementById('token-counter');
    
    if (textarea && counter) {
        const count = textarea.value.length;
        counter.textContent = `${count} 字符`;
    }
}