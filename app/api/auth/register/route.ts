import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FirebaseService, AuthUtils } from '@/lib/firebase'

// Registration schema validation
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少需要3个字符').max(20, '用户名不能超过20个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要6个字符').max(100, '密码不能超过100个字符'),
  name: z.string().optional(),
})

// POST /api/auth/register - 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Additional validation using AuthUtils
    const usernameValidation = AuthUtils.validateUsername(validatedData.username)
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      )
    }

    const passwordValidation = AuthUtils.validatePassword(validatedData.password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    const emailValidation = AuthUtils.validateEmail(validatedData.email)
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      )
    }

    // Create user with credentials
    const user = await FirebaseService.createUserWithCredentials({
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
    })

    // Log the registration action
    await FirebaseService.logAction({
      userId: user.id,
      action: 'CREATE',
      entity: 'PROMPT', // Using PROMPT as entity type since we don't have USER
      entityId: user.id,
      newData: {
        username: user.username,
        email: user.email,
        authProvider: 'credentials',
      },
    })

    // Return user data without sensitive information
    const { hashedPassword, ...safeUser } = user as any
    
    return NextResponse.json({
      message: '注册成功',
      user: safeUser,
    }, { status: 201 })

  } catch (error: any) {
    console.error('用户注册失败:', error)

    // Handle specific error types
    if (error.message === '用户名已存在' || error.message === '邮箱已存在') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: '输入数据无效', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// GET /api/auth/register - 检查用户名/邮箱是否可用
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const email = searchParams.get('email')

    const result: { usernameAvailable?: boolean; emailAvailable?: boolean } = {}

    if (username) {
      const existingUser = await FirebaseService.getUserByUsername(username)
      result.usernameAvailable = !existingUser
    }

    if (email) {
      const existingUser = await FirebaseService.getUserByEmail(email)
      result.emailAvailable = !existingUser
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('检查用户信息失败:', error)
    return NextResponse.json(
      { error: '检查失败，请稍后重试' },
      { status: 500 }
    )
  }
}