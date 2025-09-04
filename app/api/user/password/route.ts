import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, '当前密码至少6个字符'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
})

// PUT /api/user/password - Change user password
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = changePasswordSchema.parse(body)

    // Get current user data
    const userData = await FirebaseService.getUserById(session.user.id)
    if (!userData) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword, 
      userData.password
    )
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 12)

    // Update password
    const updatedUser = await FirebaseService.updateUser(session.user.id, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    })

    if (!updatedUser) {
      return NextResponse.json({ error: '密码更新失败' }, { status: 500 })
    }

    return NextResponse.json({ message: '密码已更新' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: '输入数据无效', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('更新密码失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}