# 🚀 AI 提示词工具

基于 Next.js 14 和 Firebase 构建的专业 AI 提示词管理平台。提供企业级功能，包括版本控制、AI 智能优化和完善的用户管理系统，让您轻松组织、优化和管理 AI 提示词。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/prompt-tools&env=NEXTAUTH_URL,NEXTAUTH_SECRET,FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY,ZHIPU_AI_KEY&envDescription=应用程序所需的环境变量&envLink=https://github.com/your-username/prompt-tools#environment-variables&project-name=prompt-tools&repository-name=prompt-tools)

## 📋 目录

- [功能特色](#功能特色)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [API 文档](#api-文档)
- [🚀 **部署到 Vercel**](#deploy-to-vercel) ⭐
- [开发指南](#开发指南)
- [贡献指南](#贡献指南)

## ✨ 功能特色

### 🎯 核心功能
- **提示词管理**：完整的 CRUD 操作，支持富文本编辑和批量管理
- **版本控制**：采用语义化版本管理 (major.minor.patch)，追踪每次修改
- **标签系统**：自定义标签分类，支持多级标签和智能推荐
- **搜索过滤**：高级搜索功能，支持标签过滤和多种排序方式
- **AI 智能优化**：接入智谱 AI，提供结构、清晰度和效果三种优化模式

### 🔐 用户管理
- **安全认证**：用户名密码认证，采用 bcrypt 哈希加密
- **用户中心**：完善的用户设置和个人资料管理
- **数据导出**：支持导出所有用户数据为 JSON 格式
- **账户管理**：完整的账户生命周期管理

### 🎨 用户体验
- **现代界面**：基于 Tailwind CSS 和 Radix UI 的清爽响应式设计
- **数据看板**：可视化统计数据和使用洞察
- **实时更新**：乐观更新机制，提供即时反馈
- **错误处理**：完善的错误边界和用户友好的提示信息
- **加载状态**：骨架屏加载和进度指示器

### 🏗️ 技术卓越
- **企业架构**：可扩展的 Next.js 14 App Router 架构
- **类型安全**：完整的 TypeScript 覆盖和 Zod 数据验证
- **数据库**：Firebase Firestore，优化查询和索引配置
- **表单处理**：React Hook Form 配合实时验证
- **安全性**：基于 JWT 的 NextAuth.js 会话管理

## 🛠️ 技术栈

### 前端技术
- **框架**：Next.js 14 (App Router)
- **开发语言**：TypeScript
- **样式方案**：Tailwind CSS + Radix UI 组件库
- **状态管理**：TanStack Query (React Query)
- **表单处理**：React Hook Form + Zod 验证
- **图标库**：Lucide React
- **消息通知**：Sonner Toast

### 后端技术
- **运行时**：Node.js + Next.js API Routes
- **数据库**：Firebase Firestore
- **身份认证**：NextAuth.js
- **AI 集成**：智谱 AI API
- **数据验证**：Zod 模式验证
- **安全加密**：bcryptjs 密码哈希

### 开发工具
- **包管理器**：npm
- **代码检查**：ESLint + Next.js 配置
- **类型检查**：TypeScript
- **CSS 处理**：PostCSS + Autoprefixer
- **构建工具**：Next.js 内置打包工具

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器
- Firebase 项目（启用 Firestore 数据库）
- 智谱 AI API 密钥（可选，用于 AI 优化功能）

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/your-username/prompt-tools.git
cd prompt-tools
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
在根目录创建 `.env.local` 文件：
```env
# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Firebase 配置
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# AI 优化功能（可选）
ZHIPU_AI_KEY=your-zhipu-ai-api-key
```

4. **Firebase 设置**
- 在 [Firebase 控制台](https://console.firebase.google.com/) 创建项目
- 启用 Firestore 数据库
- 生成服务账户密钥
- 部署 Firestore 索引：
```bash
firebase deploy --only firestore:indexes
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **打开浏览器**
访问 [http://localhost:3000](http://localhost:3000)

## 📚 项目结构

```
prompt-tools/
├── app/                    # Next.js App Router 路由
│   ├── api/               # API 路由
│   │   ├── auth/          # 身份认证端点
│   │   ├── prompts/       # 提示词 CRUD 操作
│   │   ├── user/          # 用户管理
│   │   └── ai/            # AI 优化功能
│   ├── auth/              # 认证页面
│   ├── dashboard/         # 主应用页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # 可复用 UI 组件
│   ├── layout/           # 布局组件
│   └── prompts/          # 提示词相关组件
├── lib/                   # 工具库
│   ├── firebase.ts       # Firebase 配置
│   ├── auth.ts           # NextAuth 配置
│   └── utils.ts          # 辅助函数
├── hooks/                 # 自定义 React Hooks
└── firestore.indexes.json # Firestore 索引配置
```

## 🔧 配置说明

### Firebase 配置
1. **Firestore 安全规则**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /prompts/{promptId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /versions/{versionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

2. **Firestore 索引**
项目包含优化的复合索引配置文件 `firestore.indexes.json`，使用以下命令部署：
```bash
firebase deploy --only firestore:indexes
```

### 环境变量说明
| 变量名 | 描述 | 必需 |
|--------|------|------|
| `NEXTAUTH_URL` | 应用程序 URL | 是 |
| `NEXTAUTH_SECRET` | NextAuth 加密密钥 | 是 |
| `FIREBASE_PROJECT_ID` | Firebase 项目 ID | 是 |
| `FIREBASE_CLIENT_EMAIL` | 服务账户邮箱 | 是 |
| `FIREBASE_PRIVATE_KEY` | 服务账户私钥 | 是 |
| `ZHIPU_AI_KEY` | 智谱 AI API 密钥 | 否 |

## 📖 API 文档

### 身份认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/[...nextauth]` - NextAuth 认证端点

### 提示词管理
- `GET /api/prompts` - 获取用户提示词列表（支持分页）
- `POST /api/prompts` - 创建新提示词
- `GET /api/prompts/[id]` - 获取提示词详情
- `PUT /api/prompts/[id]` - 更新提示词
- `DELETE /api/prompts/[id]` - 删除提示词

### AI 优化
- `POST /api/ai/optimize` - 使用 AI 优化提示词

### 用户管理
- `GET /api/user/stats` - 获取用户统计数据
- `PUT /api/user/profile` - 更新用户资料
- `PUT /api/user/password` - 修改密码
- `GET /api/user/export` - 导出用户数据
- `DELETE /api/user/delete` - 删除用户账户

## 🚀 部署指南

### Vercel 部署（推荐） {#deploy-to-vercel}

#### 方式一：一键部署
点击下面的按钮直接部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/prompt-tools&env=NEXTAUTH_URL,NEXTAUTH_SECRET,FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY,ZHIPU_AI_KEY&envDescription=应用程序所需的环境变量&envLink=https://github.com/your-username/prompt-tools#environment-variables&project-name=prompt-tools&repository-name=prompt-tools)

#### 方式二：手动部署

1. **克隆或 Fork 仓库**
   ```bash
   git clone https://github.com/your-username/prompt-tools.git
   cd prompt-tools
   ```

2. **连接到 Vercel**
   - 访问 [Vercel 控制面板](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 选择 "prompt-tools" 项目

3. **配置环境变量**
   在 Vercel 控制面板中，转到设置 → 环境变量并添加：
   ```env
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=your-nextauth-secret-key
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key-with-newlines"
   ZHIPU_AI_KEY=your-zhipu-ai-api-key
   ```

4. **部署**
   - 点击 "Deploy" 按钮
   - Vercel 将自动构建和部署你的应用程序
   - 你的应用将在 `https://your-app-name.vercel.app` 可用

#### Vercel 配置技巧

- **构建设置**：Vercel 自动检测 Next.js 项目
- **Node.js 版本**：默认使用 Node.js 18.x（兼容）
- **构建命令**：`npm run build`（自动检测）
- **输出目录**：`.next`（自动检测）
- **安装命令**：`npm install`（自动检测）

#### 环境变量设置
对于 `FIREBASE_PRIVATE_KEY`，确保：
1. 保留整个密钥周围的引号
2. 保留 `\n` 换行符
3. 示例格式：`"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

#### 自定义域名（可选）
1. 在 Vercel 项目设置中
2. 导航到 "Domains" 部分
3. 添加你的自定义域名
4. 将 `NEXTAUTH_URL` 更新为你的自定义域名
5. 按照 Vercel 指示配置 DNS 记录

### 其他平台
应用可部署到任何 Node.js 托管平台：
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

### 构建命令
```bash
# 生产构建
npm run build

# 启动生产服务器
npm run start

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

## 🧪 开发指南

### 代码质量
- **TypeScript**：严格模式下的完整类型安全
- **ESLint**：使用 Next.js 推荐规则进行代码检查
- **Prettier**：代码格式化（可根据需要配置）
- **Husky**：Git 钩子进行提交前验证（可选）

### 测试（后续增强）
- Jest 和 React Testing Library 进行单元测试
- Playwright 进行 E2E 测试
- Supertest 进行 API 测试

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. **Fork 仓库**
2. **创建功能分支**：`git checkout -b feature/amazing-feature`
3. **提交更改**：`git commit -m '添加了令人惊艳的功能'`
4. **推送分支**：`git push origin feature/amazing-feature`
5. **创建 Pull Request**

### 开发规范
- 遵循 TypeScript 最佳实践
- 编写有意义的提交信息
- 添加适当的错误处理
- 根据需要更新文档
- 充分测试你的更改

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 生产级 React 框架
- [Firebase](https://firebase.google.com/) - 后端即服务平台
- [Radix UI](https://www.radix-ui.com/) - 底层 UI 基础组件
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [智谱 AI](https://open.bigmodel.cn/) - AI 提示词优化服务

## 📞 技术支持

- **文档说明**：查看本 README 和代码注释
- **问题反馈**：通过 GitHub Issues 报告 Bug
- **社区讨论**：在 GitHub Discussions 参与讨论

---

**❤️ 由 Prompt Tools 团队精心打造**