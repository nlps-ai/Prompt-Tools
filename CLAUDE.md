# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Prompt Tools is a modern web application for managing AI prompts, built with **Next.js 14** and **Firebase**. It provides a cloud-first approach to storing and organizing prompts with features like version control, AI-powered optimization, user authentication, and real-time collaboration.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Backend**: Next.js API Routes + Firebase Firestore
- **Database**: Firebase Firestore (NoSQL cloud database)
- **Authentication**: NextAuth.js with Credentials Provider
- **Styling**: Tailwind CSS + Radix UI Components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: npm

### Database Schema (Firebase Firestore)
The Firestore database contains the following collections:

**Users Collection**:
```typescript
interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}
```

**Prompts Collection**:
```typescript
interface Prompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
  category?: string;
  version: string; // semver format
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
}
```

**Prompt Versions Collection**:
```typescript
interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: string;
  changes?: string;
  createdAt: string;
  userId: string;
}
```

### Key Architectural Patterns
- **App Router**: Next.js 14 App Router with server components
- **API Routes**: RESTful endpoints using Next.js API routes
- **Cloud-First Storage**: All data stored in Firebase Firestore
- **Version Control**: Built-in semantic versioning for prompt evolution
- **Real-time Updates**: Optimistic updates with TanStack Query
- **Component Architecture**: Modular React components with TypeScript

## Development Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Development mode (starts Next.js dev server)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Environment Setup
Create `.env.local` file with required environment variables:
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

### Build Outputs
- **Development**: Next.js dev server on port 3000
- **Production**: Optimized build in `.next/` directory

## Code Organization

### App Router Structure (`app/`)
- **layout.tsx**: Root layout with providers
- **(auth)/**: Authentication routes (login, register)
- **dashboard/**: Main application pages
  - **page.tsx**: Dashboard home
  - **prompts/**: Prompt management pages
  - **settings/**: User settings pages
- **api/**: API route handlers
  - **auth/**: Authentication endpoints
  - **prompts/**: Prompt CRUD operations
  - **user/**: User management
  - **ai/**: AI optimization features

### Component Structure (`components/`)
- **ui/**: Reusable UI components (Radix UI based)
- **layout/**: Layout components (navbar, sidebar, footer)
- **prompts/**: Prompt-specific components

### Utility Libraries (`lib/`)
- **firebase.ts**: Firebase configuration and service methods
- **auth.ts**: NextAuth.js configuration
- **utils.ts**: Helper functions and utilities
- **validations.ts**: Zod schemas for validation

### Key Data Structures
```typescript
// Prompt service methods in lib/firebase.ts
export class FirebaseService {
  static async createPrompt(promptData: CreatePromptRequest): Promise<PromptDoc>
  static async getPromptsByUserId(userId: string, limit?: number): Promise<PromptDoc[]>
  static async updatePrompt(id: string, updates: Partial<PromptDoc>): Promise<void>
  static async deletePrompt(id: string): Promise<void>
  static async optimizePrompt(content: string, mode: 'structure' | 'clarity' | 'effectiveness'): Promise<string>
}
```

## Important Development Patterns

### API Route Implementation
All API routes follow Next.js 14 App Router pattern:
```typescript
// app/api/prompts/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const prompts = await FirebaseService.getPromptsByUserId(session.user.id);
    return NextResponse.json(prompts);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Client-Server Data Fetching
Uses TanStack Query for server state management:
```typescript
// hooks/use-prompts.ts
export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const response = await fetch('/api/prompts');
      if (!response.ok) throw new Error('Failed to fetch prompts');
      return response.json();
    },
  });
}
```

### Form Handling Pattern
React Hook Form with Zod validation:
```typescript
const form = useForm<CreatePromptSchema>({
  resolver: zodResolver(createPromptSchema),
  defaultValues: {
    title: '',
    content: '',
    tags: [],
  },
});

const onSubmit = async (data: CreatePromptSchema) => {
  await createPromptMutation.mutateAsync(data);
};
```

### Authentication Flow
NextAuth.js with Credentials Provider:
```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await FirebaseService.authenticateUser(
          credentials.username,
          credentials.password
        );
        return user || null;
      },
    }),
  ],
  // ... other options
};
```

## Testing and Quality

### Current State
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Zod validation for all API inputs
- Error boundaries for graceful error handling

### Before Committing
1. Run `npm run typecheck` to ensure TypeScript compliance
2. Run `npm run lint` to check code style
3. Test authentication flow
4. Verify Firebase Firestore operations
5. Check responsive design and UI components

## Database Operations

### Firebase Firestore Configuration
```typescript
// lib/firebase.ts
const adminDb = admin.firestore();

// Enable offline persistence for better UX
if (typeof window !== 'undefined') {
  import('firebase/firestore').then(({ enableNetwork, disableNetwork }) => {
    // Configure offline persistence
  });
}
```

### Firestore Security Rules
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

### Composite Indexes
The `firestore.indexes.json` file defines optimized indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "prompts",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "updatedAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

## UI Architecture

### Component System
Built on Radix UI primitives with custom styling:
- **Design System**: Consistent color palette and typography
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: ARIA compliant components from Radix UI
- **Theme Support**: Light/dark mode with next-themes

### Key UI Components
- **Button**: Various variants and sizes
- **Input**: Form inputs with validation states
- **Dialog**: Modal dialogs for forms and confirmations
- **DropdownMenu**: Context menus and action dropdowns
- **Separator**: Visual dividers and spacing
- **Toast**: Success/error notifications with Sonner

### Layout Structure
- **Navbar**: Top navigation with user menu
- **Sidebar**: Secondary navigation (if applicable)
- **Main Content**: Dashboard and feature pages
- **Footer**: Links and application info

## External Integrations

### AI Optimization Feature
Integration with Zhipu AI API for prompt optimization:
```typescript
// lib/firebase.ts
static async optimizePrompt(content: string, mode: OptimizationMode): Promise<string> {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ZHIPU_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'user',
          content: `Please optimize this prompt for ${mode}: ${content}`,
        },
      ],
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Common Debugging Tips

### Database Issues
- Check Firebase project configuration and credentials
- Verify Firestore security rules allow user operations
- Deploy composite indexes: `firebase deploy --only firestore:indexes`
- Monitor Firestore usage and quotas in Firebase console

### API Route Issues
- Check server logs in terminal during development
- Verify authentication middleware in protected routes
- Use proper HTTP status codes and error messages
- Test API routes independently with tools like Postman

### Frontend Issues
- Check browser console for React/TypeScript errors
- Verify TanStack Query cache invalidation
- Test form validation with various inputs
- Ensure proper loading and error states

### Authentication Issues
- Verify NextAuth.js configuration and environment variables
- Check session persistence across page refreshes
- Test login/logout flow thoroughly
- Ensure password hashing with bcrypt is working

## Deployment Notes

### Vercel Deployment (Recommended)
- Automatic deployments from Git repository
- Environment variables configured in Vercel dashboard
- Serverless functions for API routes
- Edge runtime support for global performance

### Environment Variables Required
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=production-secret-key
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ZHIPU_AI_KEY=your-ai-api-key
```

### Build Configuration
- Next.js optimized production builds
- Automatic code splitting and bundling
- Image optimization and static asset handling
- Serverless function deployment for API routes

### Performance Considerations
- Server-side rendering for initial page loads
- Client-side routing for subsequent navigation
- Optimistic updates for better perceived performance
- Image optimization and lazy loading
- Bundle analysis and code splitting optimization