'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  // Real-time validation
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    switch (field) {
      case 'username':
        if (!value) {
          newErrors.username = '用户名不能为空'
        } else if (value.length < 3) {
          newErrors.username = '用户名至少需要3个字符'
        } else if (value.length > 20) {
          newErrors.username = '用户名不能超过20个字符'
        } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
          newErrors.username = '用户名只能包含字母、数字、下划线和中文字符'
        } else {
          delete newErrors.username
        }
        break

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!value) {
          newErrors.email = '邮箱不能为空'
        } else if (!emailRegex.test(value)) {
          newErrors.email = '邮箱格式不正确'
        } else {
          delete newErrors.email
        }
        break

      case 'password':
        if (!value) {
          newErrors.password = '密码不能为空'
        } else if (value.length < 6) {
          newErrors.password = '密码至少需要6个字符'
        } else if (value.length > 100) {
          newErrors.password = '密码不能超过100个字符'
        } else {
          delete newErrors.password
        }
        break

      case 'confirmPassword':
        if (value !== formData.password) {
          newErrors.confirmPassword = '密码确认不匹配'
        } else {
          delete newErrors.confirmPassword
        }
        break

      default:
        break
    }

    setErrors(newErrors)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  // Check username/email availability
  const checkAvailability = async (field: 'username' | 'email', value: string) => {
    if (!value || errors[field]) return

    try {
      setIsCheckingAvailability(true)
      const params = new URLSearchParams({ [field]: value })
      const response = await fetch(`/api/auth/register?${params}`)
      const data = await response.json()

      if (field === 'username' && !data.usernameAvailable) {
        setErrors(prev => ({ ...prev, username: '用户名已存在' }))
      } else if (field === 'email' && !data.emailAvailable) {
        setErrors(prev => ({ ...prev, email: '邮箱已存在' }))
      }
    } catch (error) {
      console.error('检查可用性失败:', error)
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    Object.keys(formData).forEach(field => {
      validateField(field, formData[field as keyof typeof formData])
    })

    if (Object.keys(errors).length > 0) {
      toast.error('请修正表单中的错误')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('密码确认不匹配')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name || formData.username,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('注册成功！请登录您的账户')
        router.push('/auth/signin')
      } else {
        toast.error(data.error || '注册失败，请重试')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('注册失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight">
            创建账户
          </h1>
          <p className="text-sm text-muted-foreground">
            注册 Prompt Tools 账户，开始您的 AI 提示词管理之旅
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">注册</CardTitle>
            <CardDescription>
              填写下方信息创建您的账户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Input
                    type="text"
                    placeholder="用户名"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    onBlur={(e) => checkAvailability('username', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {errors.username && (
                    <p className="text-sm text-red-500">{errors.username}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Input
                    type="email"
                    placeholder="邮箱地址"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onBlur={(e) => checkAvailability('email', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Input
                    type="text"
                    placeholder="显示名称（可选）"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Input
                    type="password"
                    placeholder="密码"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Input
                    type="password"
                    placeholder="确认密码"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isCheckingAvailability || Object.keys(errors).length > 0}
                >
                  {isLoading ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCheckingAvailability ? '检查中...' : '创建账户'}
                </Button>
              </div>
            </form>

            <div className="mt-4 text-center text-sm">
              已有账户？{' '}
              <Link
                href="/auth/signin"
                className="underline underline-offset-4 hover:text-primary"
              >
                立即登录
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="px-8 text-center text-sm text-muted-foreground">
          点击注册即表示您同意我们的{' '}
          <a
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            服务条款
          </a>{' '}
          和{' '}
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            隐私政策
          </a>
        </p>
      </div>
    </div>
  )
}