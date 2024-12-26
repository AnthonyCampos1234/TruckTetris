'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import {
  Upload,
  ClipboardList,
} from 'lucide-react'

const routes = [
  {
    label: 'Upload Orders',
    icon: Upload,
    href: '/dashboard',
    color: "text-blue-500"
  },
  {
    label: 'Order Info',
    icon: ClipboardList,
    href: '/dashboard/orders',
    color: "text-green-500",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div 
      className="group/sidebar relative h-full bg-white dark:bg-gray-800 border-r transition-all duration-300 w-16 hover:w-64"
    >
      <div className="py-4 flex flex-col h-full">
        <div className="px-3 py-2">
          <Link href="/dashboard" className="flex items-center h-8 px-3 mb-8">
            <h1 className="font-bold text-lg">
              <span className="block absolute group-hover/sidebar:opacity-0 transition-opacity duration-300">
                TT
              </span>
              <span className="absolute opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                TruckTetris
              </span>
            </h1>
          </Link>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
                  pathname === route.href ? "text-primary bg-gray-100 dark:bg-gray-700" : "text-zinc-500",
                )}
              >
                <div className="flex items-center flex-1 relative">
                  <route.icon className={cn("h-5 w-5", route.color)} />
                  <span 
                    className="absolute left-8 text-sm opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden"
                    style={{ width: "150px" }}
                  >
                    {route.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 