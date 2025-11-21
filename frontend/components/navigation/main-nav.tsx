'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogoWithTransparentBg } from './logo-with-transparent-bg'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/alerts', label: 'Alerts' },
]

export const MainNav = () => {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-[#F8F8F8]">
      <div className="container mx-auto flex h-20 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-3">
          <LogoWithTransparentBg
            src="/logo.png"
            alt="LogiDog"
            width={90}
            height={90}
          />
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

