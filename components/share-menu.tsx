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

interface ShareMenuProps {
  url: string
  title: string
}

export default function ShareMenu({ url, title }: ShareMenuProps) {
  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`

  function copyLink() {
    navigator.clipboard.writeText(fullUrl)
    toast('Link gekopieerd')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Share2 size={15} /> Delen
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink} className="gap-2">
          <Link2 size={15} /> Kopieer link
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`} target="_blank" rel="noopener noreferrer" />}
          className="gap-2"
        >
          <X size={15} /> Deel op Twitter/X
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}`} />}
          className="gap-2"
        >
          <Mail size={15} /> Deel via e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(fullUrl); toast('Link gekopieerd voor Instagram bio') }}
          className="gap-2">
          <Camera size={15} /> Kopieer voor Instagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
