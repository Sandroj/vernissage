'use client'
import { Share2, Link2, X, Camera, Mail } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface ShareMenuProps {
  url: string
  title: string
}

export default function ShareMenu({ url, title }: ShareMenuProps) {
  const t = useTranslations('Share')
  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`

  function copyLink() {
    navigator.clipboard.writeText(fullUrl)
    toast(t('copied'))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Share2 size={15} /> {t('share')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink} className="gap-2">
          <Link2 size={15} /> {t('copyLink')}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`} target="_blank" rel="noopener noreferrer" />}
          className="gap-2"
        >
          <X size={15} /> {t('twitter')}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}`} />}
          className="gap-2"
        >
          <Mail size={15} /> {t('email')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(fullUrl); toast(t('copiedInstagram')) }}
          className="gap-2">
          <Camera size={15} /> {t('instagram')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
