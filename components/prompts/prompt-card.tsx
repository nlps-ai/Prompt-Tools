'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  Pin, 
  Copy, 
  Edit, 
  Trash2, 
  Eye,
  GitBranch,
  Clock
} from 'lucide-react'
import { formatDateTime, truncate } from '@/lib/utils'
import { Prompt } from '@prisma/client'

interface PromptWithVersion extends Prompt {
  currentVersion?: {
    version: string
    content: string
  }
  _count: {
    versions: number
  }
}

interface PromptCardProps {
  prompt: PromptWithVersion
  onEdit: (prompt: PromptWithVersion) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onCopy: (content: string) => void
  onViewDetails: (prompt: PromptWithVersion) => void
}

export function PromptCard({ 
  prompt, 
  onEdit, 
  onDelete, 
  onTogglePin, 
  onCopy,
  onViewDetails 
}: PromptCardProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  const handleCopy = async () => {
    await onCopy(prompt.currentVersion?.content || prompt.content || '')
    setIsActionsOpen(false)
  }

  const handleEdit = () => {
    onEdit(prompt)
    setIsActionsOpen(false)
  }

  const handleDelete = () => {
    onDelete(prompt.id)
    setIsActionsOpen(false)
  }

  const handleTogglePin = () => {
    onTogglePin(prompt.id)
    setIsActionsOpen(false)
  }

  const content = prompt.currentVersion?.content || prompt.content || ''

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${prompt.pinned ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
      {/* 置顶指示器 */}
      {prompt.pinned && (
        <div className="absolute top-3 right-3 text-primary">
          <Pin className="h-4 w-4 fill-current" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary cursor-pointer"
              onClick={() => onViewDetails(prompt)}>
              {prompt.name}
            </CardTitle>
            {prompt.source && (
              <CardDescription className="flex items-center mt-1">
                <span className="text-xs text-muted-foreground">来源: {prompt.source}</span>
              </CardDescription>
            )}
          </div>

          {/* 操作菜单 */}
          <DropdownMenu open={isActionsOpen} onOpenChange={setIsActionsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(prompt)}>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                复制内容
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTogglePin}>
                <Pin className={`mr-2 h-4 w-4 ${prompt.pinned ? 'fill-current' : ''}`} />
                {prompt.pinned ? '取消置顶' : '置顶'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* 标签 */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {prompt.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {prompt.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{prompt.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 内容预览 */}
        <p className="text-sm text-muted-foreground line-clamp-3 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => onViewDetails(prompt)}>
          {truncate(content, 150)}
        </p>

        {/* 备注 */}
        {prompt.notes && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground line-clamp-2">
              📝 {truncate(prompt.notes, 80)}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <GitBranch className="mr-1 h-3 w-3" />
            <span>{prompt.currentVersion?.version || '1.0.0'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            <span>{formatDateTime(prompt.updatedAt)}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {prompt._count.versions} 个版本
        </div>
      </CardFooter>
    </Card>
  )
}