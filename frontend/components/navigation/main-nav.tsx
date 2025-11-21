'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/alerts', label: 'Alerts' },
]

export const MainNav = () => {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LogiDog"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <span className="font-bold text-xl">LogiDog</span>
        </Link>
        <div className="flex gap-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={pathname === item.href ? 'default' : 'ghost'}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  )
}

