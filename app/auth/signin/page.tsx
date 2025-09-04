'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState<'google' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading('google')
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      toast.error('登录失败，请重试')
    } finally {
      setIsLoading(null)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setIsLoading('email')
      const result = await signIn('email', { 
        email, 
        redirect: false 
      })
      
      if (result?.ok) {
        toast.success('验证邮件已发送，请查看您的邮箱')
        router.push('/auth/verify-request')
      } else {
        toast.error('发送验证邮件失败，请重试')
      }
    } catch (error) {
      toast.error('登录失败，请重试')
    } finally {
      setIsLoading(null)
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
              选择您喜欢的登录方式
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading === 'google'}
            >
              {isLoading === 'google' ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="mr-2 h-4 w-4" />
              )}
              使用 Google 登录
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或者
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailSignIn}>
              <div className="grid gap-4">
                <Input
                  type="email"
                  placeholder="输入您的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading === 'email'}
                />
                <Button
                  type="submit"
                  disabled={isLoading === 'email' || !email}
                >
                  {isLoading === 'email' ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.mail className="mr-2 h-4 w-4" />
                  )}
                  发送验证邮件
                </Button>
              </div>
            </form>
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