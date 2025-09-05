import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: [
    'system-ui', 
    '-apple-system', 
    'BlinkMacSystemFont', 
    'Segoe UI', 
    'Roboto', 
    'Oxygen', 
    'Ubuntu', 
    'Cantarell', 
    'sans-serif'
  ],
})

export const metadata: Metadata = {
  title: {
    default: 'Prompt Tools - AI 提示词管理专家',
    template: '%s | Prompt Tools'
  },
  description: '专业的 AI 提示词管理平台，支持版本控制、智能分类、AI 优化等功能',
  keywords: ['AI', '提示词', 'Prompt', 'ChatGPT', '人工智能', '效率工具'],
  authors: [{ name: 'Prompt Tools Team' }],
  creator: 'Prompt Tools',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Prompt Tools - AI 提示词管理专家',
    description: '专业的 AI 提示词管理平台，支持版本控制、智能分类、AI 优化等功能',
    siteName: 'Prompt Tools',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Tools - AI 提示词管理专家',
    description: '专业的 AI 提示词管理平台，支持版本控制、智能分类、AI 优化等功能',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}