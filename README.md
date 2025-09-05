# 🚀 AI Prompt Tools

A professional AI prompt management platform built with Next.js 14 and Firebase. Organize, optimize, and manage your AI prompts with enterprise-grade features including version control, AI-powered optimization, and comprehensive user management.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/prompt-tools&env=NEXTAUTH_URL,NEXTAUTH_SECRET,FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY,ZHIPU_AI_KEY&envDescription=Required%20environment%20variables%20for%20the%20application&envLink=https://github.com/your-username/prompt-tools#environment-variables&project-name=prompt-tools&repository-name=prompt-tools)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [🚀 **Deploy to Vercel**](#deploy-to-vercel) ⭐
- [Development](#development)
- [Contributing](#contributing)

## ✨ Features

### 🎯 Core Functionality
- **Prompt Management**: Full CRUD operations for AI prompts with rich text editing
- **Version Control**: Track changes with semantic versioning (major.minor.patch)
- **Tag System**: Organize prompts with custom tags and categories
- **Search & Filter**: Advanced search with tag filtering and sorting options
- **AI Optimization**: Enhance prompts using Zhipu AI for structure, clarity, and effectiveness

### 🔐 User Management
- **Secure Authentication**: Username/password authentication with bcrypt hashing
- **User Profiles**: Comprehensive user settings and profile management
- **Data Export**: Export all user data in JSON format
- **Account Management**: Complete account lifecycle management

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with Tailwind CSS and Radix UI
- **Dashboard Analytics**: Visual statistics and usage insights
- **Real-time Updates**: Instant feedback with optimistic updates
- **Error Handling**: Comprehensive error boundaries and user-friendly messages
- **Loading States**: Skeleton loading and progress indicators

### 🏗️ Technical Excellence
- **Enterprise Architecture**: Scalable Next.js 14 App Router architecture
- **Type Safety**: Full TypeScript coverage with Zod validation
- **Database**: Firebase Firestore with optimized queries and indexing
- **Form Handling**: React Hook Form with real-time validation
- **Security**: JWT-based sessions with NextAuth.js

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI Components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner Toast

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: NextAuth.js
- **AI Integration**: Zhipu AI API
- **Validation**: Zod schemas
- **Security**: bcryptjs password hashing

### DevOps & Tools
- **Package Manager**: npm
- **Linting**: ESLint + Next.js Config
- **Type Checking**: TypeScript
- **CSS Processing**: PostCSS + Autoprefixer
- **Build Tool**: Next.js built-in bundler

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- npm or yarn package manager
- Firebase project with Firestore enabled
- Zhipu AI API key (optional, for AI optimization)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/prompt-tools.git
cd prompt-tools
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env.local` file in the root directory:
```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# AI Optimization (Optional)
ZHIPU_AI_KEY=your-zhipu-ai-api-key
```

4. **Firebase Setup**
- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Firestore Database
- Generate a service account key
- Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Project Structure

```
prompt-tools/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── prompts/       # Prompt CRUD operations
│   │   ├── user/          # User management
│   │   └── ai/            # AI optimization
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── prompts/          # Prompt-specific components
├── lib/                   # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── auth.ts           # NextAuth configuration
│   └── utils.ts          # Helper functions
├── hooks/                 # Custom React hooks
└── firestore.indexes.json # Firestore index configuration
```

## 🔧 Configuration

### Firebase Configuration
1. **Firestore Security Rules**
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

2. **Firestore Indexes**
The project includes a `firestore.indexes.json` file with optimized composite indexes. Deploy with:
```bash
firebase deploy --only firestore:indexes
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `ZHIPU_AI_KEY` | Zhipu AI API key | No |

## 📖 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Prompts
- `GET /api/prompts` - List user prompts with pagination
- `POST /api/prompts` - Create new prompt
- `GET /api/prompts/[id]` - Get prompt details
- `PUT /api/prompts/[id]` - Update prompt
- `DELETE /api/prompts/[id]` - Delete prompt

### AI Optimization
- `POST /api/ai/optimize` - Optimize prompt using AI

### User Management
- `GET /api/user/stats` - User statistics
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/password` - Change password
- `GET /api/user/export` - Export user data
- `DELETE /api/user/delete` - Delete user account

## 🚀 Deployment

### Vercel (Recommended) {#deploy-to-vercel}

#### Method 1: One-Click Deploy
Click the button below to deploy directly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/prompt-tools&env=NEXTAUTH_URL,NEXTAUTH_SECRET,FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY,ZHIPU_AI_KEY&envDescription=Required%20environment%20variables%20for%20the%20application&envLink=https://github.com/your-username/prompt-tools#environment-variables&project-name=prompt-tools&repository-name=prompt-tools)

#### Method 2: Manual Deployment

1. **Fork or Clone Repository**
   ```bash
   git clone https://github.com/your-username/prompt-tools.git
   cd prompt-tools
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select "prompt-tools" project

3. **Configure Environment Variables**
   In Vercel dashboard, go to Settings → Environment Variables and add:
   ```env
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=your-nextauth-secret-key
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key-with-newlines"
   ZHIPU_AI_KEY=your-zhipu-ai-api-key
   ```

4. **Deploy**
   - Click "Deploy" button
   - Vercel will automatically build and deploy your application
   - Your app will be available at `https://your-app-name.vercel.app`

#### Vercel Configuration Tips

- **Build Settings**: Vercel automatically detects Next.js projects
- **Node.js Version**: Uses Node.js 18.x by default (compatible)
- **Build Command**: `npm run build` (automatically detected)
- **Output Directory**: `.next` (automatically detected)
- **Install Command**: `npm install` (automatically detected)

#### Environment Variables Setup
For `FIREBASE_PRIVATE_KEY`, make sure to:
1. Keep the quotes around the entire key
2. Preserve the `\n` newline characters
3. Example format: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

#### Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Navigate to "Domains" section  
3. Add your custom domain
4. Update `NEXTAUTH_URL` to your custom domain
5. Configure DNS records as instructed by Vercel

### Other Platforms
The application can be deployed to any Node.js hosting platform:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

### Build Commands
```bash
# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🧪 Development

### Code Quality
- **TypeScript**: Full type safety with strict mode
- **ESLint**: Code linting with Next.js recommended rules
- **Prettier**: Code formatting (configure as needed)
- **Husky**: Git hooks for pre-commit validation (optional)

### Testing (Future Enhancement)
- Unit tests with Jest and React Testing Library
- E2E tests with Playwright
- API tests with Supertest

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add proper error handling
- Update documentation as needed
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Firebase](https://firebase.google.com/) - Backend-as-a-Service platform
- [Radix UI](https://www.radix-ui.com/) - Low-level UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zhipu AI](https://open.bigmodel.cn/) - AI-powered prompt optimization

## 📞 Support

- **Documentation**: Check this README and code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions in GitHub Discussions

---

**Built with ❤️ by the Prompt Tools Team**