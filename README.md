# Prompt Tools

一个基于 Tauri 的桌面应用程序。

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建
npm run tauri:build
```

## GitHub Actions 工作流

本项目包含三个 GitHub Actions 工作流：

### 1. 自动发布 (release.yml)
- **触发条件**: 推送 `v*` 标签时自动触发
- **支持平台**: 
  - Linux (Ubuntu 22.04) - AppImage, DEB, RPM
  - Windows (Windows 2022) - EXE, MSI
  - macOS Intel (macOS 13) - DMG, APP
  - macOS Apple Silicon (macOS 14) - DMG, APP
- **使用方法**: 
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

### 2. CI 测试 (ci.yml)
- **触发条件**: 
  - 推送到 `main` 或 `develop` 分支
  - 创建 Pull Request 到 `main` 分支
  - 手动触发
- **功能**:
  - 前端代码检查（类型检查、构建）
  - 后端代码检查（cargo check）
  - 可选的多平台构建测试

### 3. 手动发布 (manual-release.yml)
- **触发条件**: 手动触发
- **功能**: 
  - 可选择特定平台构建
  - 自定义版本号
  - 可标记为预发布版本

## 发布流程

### 自动发布
1. 确保代码已提交并推送到主分支
2. 创建并推送标签：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions 将自动构建所有平台并创建 Release

### 手动发布
1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Manual Release" 工作流
3. 点击 "Run workflow"
4. 填写版本号和选择平台
5. 运行工作流

## 构建产物

- **Linux**: `.AppImage`, `.deb`, `.rpm`
- **Windows**: `.exe`, `.msi`
- **macOS**: `.dmg`, `.app`

## 注意事项

1. 首次使用需要在 GitHub 仓库设置中启用 Actions
2. 如需代码签名，请在仓库 Secrets 中配置：
   - `TAURI_PRIVATE_KEY`: Tauri 私钥
   - `TAURI_KEY_PASSWORD`: 私钥密码
3. macOS 构建会生成 Intel 和 Apple Silicon 两个版本