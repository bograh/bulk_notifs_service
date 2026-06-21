"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Moon,
  Sun,
  Zap,
  X,
  Menu,
  ChevronRight,
  Bell,
  Shield,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
]

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
      <span>{label}</span>
      {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary opacity-70" />}
    </Link>
  )
}

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-full items-center gap-4 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="md:hidden rounded-lg p-1.5 hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">BulkNotifs</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={toggleTheme}>
            {theme === "dark"
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <LogoutItem />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function LogoutItem() {
  const { logout } = useAuth()
  return (
    <button onClick={() => logout()} className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:text-destructive">
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  )
}

export function Sidebar() {
  const { user } = useAuth()

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  }

  const plan = user?.subscription?.plan_name || "free"
  const planClass = planColors[plan] || planColors.free

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:pt-14 border-r sidebar-bg">
      <div className="flex h-14 items-center border-b px-4 absolute top-0 left-0 right-0 sidebar-bg">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base">BulkNotifs</span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto scrollbar-none">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
            {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.first_name} {user?.last_name}
            </p>
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize", planClass)}>
              {plan}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 w-72 bg-background border-r animate-slide-in">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">BulkNotifs</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>
      </aside>
    </div>
  )
}
