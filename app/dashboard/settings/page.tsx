'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Lock,
  Shield,
  Database,
  Download,
  Trash2,
  Save,
  AlertTriangle,
  Settings as SettingsIcon,
} from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  bio: z.string().max(200, '简介不能超过200个字符').optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, '当前密码至少6个字符'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
  confirmPassword: z.string().min(6, '确认密码至少6个字符'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '新密码和确认密码不匹配',
  path: ['confirmPassword'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [userStats, setUserStats] = useState<{
    totalPrompts: number
    totalVersions: number
    accountCreated: string
  } | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
    } else {
      // Fetch user statistics
      fetchUserStats()
    }
  }, [session, router])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const stats = await response.json()
        setUserStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      bio: '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Load user data when session is available
  useEffect(() => {
    if (session?.user) {
      profileForm.setValue('name', session.user.name || '')
      profileForm.setValue('email', session.user.email || '')
    }
  }, [session, profileForm])

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      setIsProfileLoading(true)
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('个人资料已更新！')
        // Update session data
        await update({
          name: data.name,
          email: data.email,
        })
      } else {
        const error = await response.json()
        toast.error(error.error || '更新失败')
      }
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setIsProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setIsPasswordLoading(true)
      
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      if (response.ok) {
        toast.success('密码已更新！')
        passwordForm.reset()
      } else {
        const error = await response.json()
        toast.error(error.error || '密码更新失败')
      }
    } catch (error) {
      toast.error('密码更新失败')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/user/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('数据导出成功！')
      } else {
        toast.error('导出失败')
      }
    } catch (error) {
      toast.error('导出失败')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      '警告：此操作将永久删除您的账户和所有数据，且无法恢复。\n\n请输入 "DELETE" 来确认删除：'
    )

    if (confirmation !== 'DELETE') {
      return
    }

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('账户已删除')
        router.push('/auth/signin')
      } else {
        const error = await response.json()
        toast.error(error.error || '删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">账户设置</h1>
          <p className="mt-2 text-gray-600">
            管理您的个人资料、安全设置和账户偏好。
          </p>
        </div>

        {/* Account Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              账户概览
            </CardTitle>
            <CardDescription>
              您的账户基本信息和使用统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{userStats?.totalPrompts || 0}</p>
                <p className="text-sm text-gray-600">提示词总数</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{userStats?.totalVersions || 0}</p>
                <p className="text-sm text-gray-600">版本总数</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {userStats?.accountCreated || '未知'}
                </p>
                <p className="text-sm text-gray-600">注册时间</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              个人资料
            </CardTitle>
            <CardDescription>
              更新您的个人资料信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <Input
                  {...profileForm.register('name')}
                  placeholder="输入您的姓名"
                  disabled={isProfileLoading}
                />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址 *
                </label>
                <Input
                  {...profileForm.register('email')}
                  type="email"
                  placeholder="输入您的邮箱地址"
                  disabled={isProfileLoading}
                />
                {profileForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  个人简介（可选）
                </label>
                <Textarea
                  {...profileForm.register('bio')}
                  placeholder="介绍一下您自己..."
                  className="min-h-[80px]"
                  disabled={isProfileLoading}
                />
                {profileForm.formState.errors.bio && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.bio.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isProfileLoading}>
                  {isProfileLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  保存更改
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              安全设置
            </CardTitle>
            <CardDescription>
              更改您的登录密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前密码 *
                </label>
                <Input
                  {...passwordForm.register('currentPassword')}
                  type="password"
                  placeholder="输入当前密码"
                  disabled={isPasswordLoading}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码 *
                </label>
                <Input
                  {...passwordForm.register('newPassword')}
                  type="password"
                  placeholder="输入新密码"
                  disabled={isPasswordLoading}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码 *
                </label>
                <Input
                  {...passwordForm.register('confirmPassword')}
                  type="password"
                  placeholder="再次输入新密码"
                  disabled={isPasswordLoading}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  更新密码
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              数据管理
            </CardTitle>
            <CardDescription>
              导出或删除您的数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">导出数据</h4>
                  <p className="text-sm text-gray-600">
                    导出您的所有提示词和相关数据为 JSON 文件
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  导出数据
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">删除账户</h4>
                  <p className="text-sm text-red-600">
                    永久删除您的账户和所有数据。此操作无法撤销。
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除账户
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}