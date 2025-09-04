import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  bio: z.string().max(200, '简介不能超过200个字符').optional(),
})

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Check if email is already taken by another user
    if (validatedData.email !== session.user.email) {
      const existingUser = await FirebaseService.getUserByEmail(validatedData.email)
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 })
      }
    }

    // Update user profile
    const updatedUser = await FirebaseService.updateUser(session.user.id, {
      name: validatedData.name,
      email: validatedData.email,
      bio: validatedData.bio,
      updatedAt: new Date(),
    })

    if (!updatedUser) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({ message: '个人资料已更新' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: '输入数据无效', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('更新用户资料失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}