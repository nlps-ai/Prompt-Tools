import { invoke } from '@tauri-apps/api/core';

// 高级功能模块
export interface Version {
  id: number;
  prompt_id: number;
  version: string;
  content: string;
  created_at: string;
  parent_version_id?: number;
}

export interface ExportData {
  prompts: any[];
  settings: Record<string, string>;
  export_time: string;
}

export interface SearchResult {
  prompts: any[];
  total: number;
  tags: string[];
  sources: string[];
}

// 版本管理功能
export class VersionManager {
  static async getVersions(promptId: number): Promise<Version[]> {
    return await invoke('get_prompt_versions', { promptId });
  }

  static async rollbackToVersion(promptId: number, versionId: number, versionType: string = 'patch'): Promise<void> {
    return await invoke('rollback_to_version', { promptId, versionId, versionType });
  }

  static renderVersionHistory(versions: Version[]): string {
    if (versions.length === 0) {
      return '<div class="empty-state">暂无版本历史</div>';
    }

    return `
      <div class="version-list">
        ${versions.map(version => `
          <div class="version-item" data-version-id="${version.id}">
            <div class="version-header">
              <div class="version-info">
                <span class="version-number">v${version.version}</span>
                <span class="version-date">${this.formatDate(version.created_at)}</span>
              </div>
              <div class="version-actions">
                <button class="btn-small" onclick="previewVersion(${version.id})">
                  <i class="fas fa-eye"></i> 预览
                </button>
                <button class="btn-small" onclick="rollbackVersion(${version.prompt_id}, ${version.id})">
                  <i class="fas fa-undo"></i> 回滚
                </button>
              </div>
            </div>
            <div class="version-content">
              ${this.truncateContent(version.content, 100)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }
}

// 搜索功能
export class SearchManager {
  static async search(query: string, tags: string[] = [], sources: string[] = []): Promise<SearchResult> {
    return await invoke('search_prompts', { query, tags, sources });
  }

  static async getAllTags(): Promise<string[]> {
    return await invoke('get_all_tags');
  }

  static async getAllSources(): Promise<string[]> {
    return await invoke('get_all_sources');
  }

  static renderSearchFilters(tags: string[], sources: string[], selectedTags: string[] = [], selectedSources: string[] = []): string {
    return `
      <div class="search-filters">
        <div class="filter-section">
          <h4>标签筛选</h4>
          <div class="filter-tags">
            ${tags.map(tag => `
              <label class="filter-tag">
                <input type="checkbox" value="${tag}" ${selectedTags.includes(tag) ? 'checked' : ''}>
                <span>${tag}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="filter-section">
          <h4>来源筛选</h4>
          <div class="filter-sources">
            ${sources.map(source => `
              <label class="filter-source">
                <input type="checkbox" value="${source}" ${selectedSources.includes(source) ? 'checked' : ''}>
                <span>${source}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

// 导入导出功能
export class ImportExportManager {
  static async exportData(): Promise<ExportData> {
    return await invoke('export_data');
  }

  static async importData(data: ExportData): Promise<void> {
    return await invoke('import_data', { data });
  }

  static async exportToFile(): Promise<void> {
    try {
      const data = await this.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification('数据导出成功', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('导出失败，请重试', 'error');
    }
  }

  static async importFromFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const text = await file.text();
          const data = JSON.parse(text);
          await this.importData(data);
          this.showNotification('数据导入成功', 'success');
          resolve();
        } catch (error) {
          console.error('Import failed:', error);
          this.showNotification('导入失败，请检查文件格式', 'error');
          reject(error);
        }
      };

      input.click();
    });
  }

  static showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }
}

// 设置管理
export class SettingsManager {
  static async getSetting(key: string): Promise<string | null> {
    return await invoke('get_setting', { key });
  }

  static async setSetting(key: string, value: string): Promise<void> {
    return await invoke('set_setting', { key, value });
  }

  static async getVersionCleanupThreshold(): Promise<number> {
    const value = await this.getSetting('version_cleanup_threshold');
    return value ? parseInt(value) : 200;
  }

  static async setVersionCleanupThreshold(threshold: number): Promise<void> {
    return await this.setSetting('version_cleanup_threshold', threshold.toString());
  }

  static renderSettingsPanel(): string {
    return `
      <div class="settings-panel">
        <div class="setting-group">
          <label for="versionThreshold">版本清理阈值</label>
          <input type="number" id="versionThreshold" min="1" max="1000" value="200">
          <small>每个提示词保留的最大版本数量</small>
        </div>
        <div class="setting-group">
          <label>数据管理</label>
          <div class="setting-actions">
            <button class="btn" onclick="exportData()">
              <i class="fas fa-download"></i> 导出数据
            </button>
            <button class="btn" onclick="importData()">
              <i class="fas fa-upload"></i> 导入数据
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// 键盘快捷键管理
export class KeyboardManager {
  static init(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.handleSave();
      }
      
      // Ctrl+N 新建
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.handleNew();
      }
      
      // Ctrl+F 搜索
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.handleSearch();
      }
      
      // Escape 关闭模态框
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });
  }

  static handleSave(): void {
    const form = document.getElementById('promptForm') as HTMLFormElement;
    if (form) {
      form.dispatchEvent(new Event('submit'));
    }
  }

  static handleNew(): void {
    const createBtn = document.getElementById('createBtn') as HTMLButtonElement;
    if (createBtn) {
      createBtn.click();
    }
  }

  static handleSearch(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  static handleEscape(): void {
    const modal = document.querySelector('.modal.show') as HTMLElement;
    if (modal) {
      // 兼容新的关闭按钮类名/ID
      const closeBtn = modal.querySelector('.close-modal, .close-btn, #closeModal') as HTMLButtonElement;
      if (closeBtn) closeBtn.click();
    }
  }
}

// Diff 对比功能
export class DiffManager {
  static generateWordDiff(oldText: string, newText: string): string {
    // 简单的词级对比实现
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    
    const result: string[] = [];
    let i = 0, j = 0;
    
    while (i < oldWords.length || j < newWords.length) {
      if (i >= oldWords.length) {
        result.push(`<span class="diff-add">${newWords[j]}</span>`);
        j++;
      } else if (j >= newWords.length) {
        result.push(`<span class="diff-remove">${oldWords[i]}</span>`);
        i++;
      } else if (oldWords[i] === newWords[j]) {
        result.push(oldWords[i]);
        i++;
        j++;
      } else {
        result.push(`<span class="diff-remove">${oldWords[i]}</span>`);
        result.push(`<span class="diff-add">${newWords[j]}</span>`);
        i++;
        j++;
      }
    }
    
    return result.join(' ');
  }

  static renderDiffView(leftVersion: Version, rightVersion: Version): string {
    const diffHtml = this.generateWordDiff(leftVersion.content, rightVersion.content);
    
    return `
      <div class="diff-container">
        <div class="diff-header">
          <div class="diff-version-info">
            <span class="version-label">v${leftVersion.version}</span>
            <span class="version-date">${VersionManager.formatDate(leftVersion.created_at)}</span>
          </div>
          <div class="diff-arrow">→</div>
          <div class="diff-version-info">
            <span class="version-label">v${rightVersion.version}</span>
            <span class="version-date">${VersionManager.formatDate(rightVersion.created_at)}</span>
          </div>
        </div>
        <div class="diff-content">
          ${diffHtml}
        </div>
      </div>
    `;
  }
}