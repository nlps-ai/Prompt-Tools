import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'

// DELETE /api/user/delete - Delete user account and all data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // Get all user's prompts
    const prompts = await FirebaseService.getPromptsByUserId(session.user.id, 1000)
    
    // Delete all prompt versions and prompts
    for (const prompt of prompts) {
      // Get all versions for this prompt
      const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
      
      // Delete all versions
      for (const version of versions) {
        await FirebaseService.deleteVersion(version.id)
      }
      
      // Delete the prompt
      await FirebaseService.deletePrompt(prompt.id)
    }

    // Delete the user account
    const deletedUser = await FirebaseService.deleteUser(session.user.id)
    
    if (!deletedUser) {
      return NextResponse.json({ error: '账户删除失败' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '账户及所有相关数据已成功删除',
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('删除用户账户失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}