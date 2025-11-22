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
    <nav className="border-b border-teal-200 bg-white">
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
              className={
                pathname === item.href
                  ? 'bg-[#0F766E] hover:bg-[#0D9488] text-white'
                  : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50'
              }
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  )
}

