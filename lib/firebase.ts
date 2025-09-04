import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import bcrypt from 'bcryptjs'

// Initialize Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

let app
if (!getApps().length) {
  app = initializeApp({
    credential: cert(firebaseAdminConfig),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
} else {
  app = getApps()[0]
}

export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)

// Firestore Collections
export const collections = {
  users: 'users',
  prompts: 'prompts',
  versions: 'versions', // subcollection under prompts
  tags: 'tags',
  userSettings: 'userSettings',
  globalSettings: 'globalSettings',
  auditLogs: 'auditLogs',
} as const

// Types for Firestore documents (matching Prisma schema)
export interface UserDoc {
  id: string
  email: string
  username?: string // For username/password auth
  hashedPassword?: string // For username/password auth
  name?: string
  image?: string
  authProvider?: 'oauth' | 'credentials' // Track auth method
  createdAt: Date
  updatedAt: Date
}

export interface PromptDoc {
  id: string
  name: string
  source?: string
  notes?: string
  tags: string[]
  pinned: boolean
  createdAt: Date
  updatedAt: Date
  currentVersionId?: string
  userId: string
}

export interface VersionDoc {
  id: string
  version: string
  content: string
  createdAt: Date
  parentVersionId?: string
  promptId: string
}

export interface TagDoc {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  usageCount: number
}

export interface UserSettingDoc {
  id: string
  key: string
  value: string
  userId: string
}

export interface GlobalSettingDoc {
  key: string
  value: string
}

export interface AuditLogDoc {
  id: string
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'PROMPT' | 'VERSION' | 'SETTING'
  entityId: string
  oldData?: any
  newData?: any
  createdAt: Date
}

// Helper functions for CRUD operations
export class FirebaseService {
  // User operations
  static async createUser(userData: Omit<UserDoc, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = adminDb.collection(collections.users).doc()
    const now = new Date()
    const user: UserDoc = {
      id: docRef.id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    }
    await docRef.set(user)
    return user
  }

  static async getUserById(id: string) {
    const doc = await adminDb.collection(collections.users).doc(id).get()
    return doc.exists ? { id: doc.id, ...doc.data() } as UserDoc : null
  }

  static async getUserByEmail(email: string) {
    const query = await adminDb.collection(collections.users)
      .where('email', '==', email)
      .limit(1)
      .get()
    
    return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() } as UserDoc
  }

  // Prompt operations
  static async createPrompt(promptData: Omit<PromptDoc, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = adminDb.collection(collections.prompts).doc()
    const now = new Date()
    const prompt: PromptDoc = {
      id: docRef.id,
      ...promptData,
      createdAt: now,
      updatedAt: now,
    }
    await docRef.set(prompt)
    return prompt
  }

  static async getPromptsByUserId(userId: string, limit = 50, lastDoc?: any) {
    try {
      // Try the optimized query with orderBy first
      let query = adminDb.collection(collections.prompts)
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(limit)

      if (lastDoc) {
        query = query.startAfter(lastDoc)
      }

      const snapshot = await query.get()
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptDoc))
    } catch (error: any) {
      // If the composite index doesn't exist, fallback to simple query
      console.warn('Index error detected, using fallback query:', error.message)
      const snapshot = await adminDb.collection(collections.prompts)
        .where('userId', '==', userId)
        .limit(limit)
        .get()
      
      // Sort in memory (not ideal for large datasets, but works for now)
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptDoc))
      return docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }
  }

  static async updatePrompt(id: string, updates: Partial<PromptDoc>) {
    const docRef = adminDb.collection(collections.prompts).doc(id)
    await docRef.update({
      ...updates,
      updatedAt: new Date(),
    })
    return this.getPromptById(id)
  }

  static async getPromptById(id: string) {
    const doc = await adminDb.collection(collections.prompts).doc(id).get()
    return doc.exists ? { id: doc.id, ...doc.data() } as PromptDoc : null
  }

  static async deletePrompt(id: string) {
    // Delete all versions first
    const versionsSnapshot = await adminDb.collection(collections.prompts)
      .doc(id)
      .collection(collections.versions)
      .get()
    
    const batch = adminDb.batch()
    versionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete the prompt
    batch.delete(adminDb.collection(collections.prompts).doc(id))
    await batch.commit()
  }

  // Version operations (subcollection under prompts)
  static async createVersion(promptId: string, versionData: Omit<VersionDoc, 'id' | 'createdAt' | 'promptId'>) {
    const docRef = adminDb.collection(collections.prompts)
      .doc(promptId)
      .collection(collections.versions)
      .doc()
    
    const version: VersionDoc = {
      id: docRef.id,
      ...versionData,
      promptId,
      createdAt: new Date(),
    }
    await docRef.set(version)
    return version
  }

  static async getVersionsByPromptId(promptId: string) {
    const snapshot = await adminDb.collection(collections.prompts)
      .doc(promptId)
      .collection(collections.versions)
      .orderBy('createdAt', 'desc')
      .get()
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VersionDoc))
  }

  // Search operations
  static async searchPrompts(userId: string, searchTerm: string, tags?: string[], limit = 20) {
    let query = adminDb.collection(collections.prompts).where('userId', '==', userId)
    
    if (tags && tags.length > 0) {
      query = query.where('tags', 'array-contains-any', tags)
    }

    const snapshot = await query.limit(limit * 3).get() // Get more to filter locally
    
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as PromptDoc))
      .filter(prompt => 
        searchTerm === '' || 
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, limit)

    return results
  }

  // Settings operations
  static async getUserSetting(userId: string, key: string) {
    const query = await adminDb.collection(collections.userSettings)
      .where('userId', '==', userId)
      .where('key', '==', key)
      .limit(1)
      .get()
    
    return query.empty ? null : query.docs[0].data().value
  }

  static async setUserSetting(userId: string, key: string, value: string) {
    const querySnapshot = await adminDb.collection(collections.userSettings)
      .where('userId', '==', userId)
      .where('key', '==', key)
      .limit(1)
      .get()
    
    if (querySnapshot.empty) {
      // Create new setting
      const docRef = adminDb.collection(collections.userSettings).doc()
      await docRef.set({
        id: docRef.id,
        userId,
        key,
        value,
      })
    } else {
      // Update existing setting
      await querySnapshot.docs[0].ref.update({ value })
    }
  }

  // Audit logging
  static async logAction(logData: Omit<AuditLogDoc, 'id' | 'createdAt'>) {
    const docRef = adminDb.collection(collections.auditLogs).doc()
    const auditLog: AuditLogDoc = {
      id: docRef.id,
      ...logData,
      createdAt: new Date(),
    }
    await docRef.set(auditLog)
    return auditLog
  }

  // Username/Password Authentication Methods
  static async getUserByUsername(username: string) {
    const query = await adminDb.collection(collections.users)
      .where('username', '==', username)
      .limit(1)
      .get()
    
    return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() } as UserDoc
  }

  static async createUserWithCredentials(userData: {
    username: string
    email: string
    password: string
    name?: string
  }) {
    // Check if username already exists
    const existingUserByUsername = await this.getUserByUsername(userData.username)
    if (existingUserByUsername) {
      throw new Error('用户名已存在')
    }

    // Check if email already exists
    const existingUserByEmail = await this.getUserByEmail(userData.email)
    if (existingUserByEmail) {
      throw new Error('邮箱已存在')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    const docRef = adminDb.collection(collections.users).doc()
    const now = new Date()
    
    const user: UserDoc = {
      id: docRef.id,
      email: userData.email,
      username: userData.username,
      hashedPassword,
      name: userData.name || userData.username,
      authProvider: 'credentials',
      createdAt: now,
      updatedAt: now,
    }
    
    await docRef.set(user)
    
    // Return user without password hash for security
    const { hashedPassword: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  static async verifyUserCredentials(usernameOrEmail: string, password: string) {
    // Try to find user by username first, then by email
    let user = await this.getUserByUsername(usernameOrEmail)
    
    if (!user) {
      user = await this.getUserByEmail(usernameOrEmail)
    }

    if (!user || !user.hashedPassword) {
      return null
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.hashedPassword)
    if (!isValid) {
      return null
    }

    // Return user without password hash for security
    const { hashedPassword: _, ...userWithoutPassword } = user
    return userWithoutPassword as Omit<UserDoc, 'hashedPassword'>
  }
}

// Authentication utility functions
export const AuthUtils = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  },

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  },

  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username || username.length < 3) {
      return { isValid: false, error: '用户名至少需要3个字符' }
    }
    
    if (username.length > 20) {
      return { isValid: false, error: '用户名不能超过20个字符' }
    }
    
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return { isValid: false, error: '用户名只能包含字母、数字、下划线和中文字符' }
    }
    
    return { isValid: true }
  },

  validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password || password.length < 6) {
      return { isValid: false, error: '密码至少需要6个字符' }
    }
    
    if (password.length > 100) {
      return { isValid: false, error: '密码不能超过100个字符' }
    }
    
    return { isValid: true }
  },

  validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email) {
      return { isValid: false, error: '邮箱不能为空' }
    }
    
    if (!emailRegex.test(email)) {
      return { isValid: false, error: '邮箱格式不正确' }
    }
    
    return { isValid: true }
  }
}