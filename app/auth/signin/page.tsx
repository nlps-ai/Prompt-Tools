'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  // Show error message if present
  useState(() => {
    if (error === 'CredentialsSignin') {
      toast.error('用户名或密码错误，请重试')
    } else if (error) {
      toast.error('登录失败，请重试')
    }
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameOrEmail || !password) {
      toast.error('请输入用户名和密码')
      return
    }

    try {
      setIsLoading(true)
      const result = await signIn('credentials', {
        usernameOrEmail,
        password,
        redirect: false,
      })

      if (result?.ok) {
        toast.success('登录成功！')
        router.push(callbackUrl)
        router.refresh()
      } else {
        toast.error('用户名或密码错误，请重试')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight">
            欢迎回来
          </h1>
          <p className="text-sm text-muted-foreground">
            登录您的账户以继续使用 Prompt Tools
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">登录</CardTitle>
            <CardDescription>
              请输入您的用户名和密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Input
                    type="text"
                    placeholder="用户名或邮箱"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Input
                    type="password"
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !usernameOrEmail || !password}
                >
                  {isLoading ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  登录
                </Button>
              </div>
            </form>

            <div className="mt-4 text-center text-sm">
              还没有账户？{' '}
              <Link
                href="/auth/register"
                className="underline underline-offset-4 hover:text-primary"
              >
                立即注册
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="px-8 text-center text-sm text-muted-foreground">
          点击登录即表示您同意我们的{' '}
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