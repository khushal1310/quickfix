"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, LayoutDashboard, Wallet, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Initial theme check
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (dark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDark(true);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/60 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Branding Logo */}
        <motion.div whileHover={{ scale: 1.04 }} className="flex">
          <Link href={isAuthenticated && user ? `/${user.role}` : "/"} className="flex items-center gap-2 select-none">
            <motion.div whileHover={{ scale: 1.08, rotate: 5 }} whileTap={{ scale: 0.95 }} className="block shrink-0">
              <img src="/logo.png" alt="QuickFix Logo" className="h-8 w-8 rounded-lg shadow-sm object-cover" />
            </motion.div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              QuickFix
            </span>
          </Link>
        </motion.div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            className="rounded-full hover:bg-muted text-foreground"
            title="Toggle theme"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Dashboard redirection link */}
              <Link href={`/${user.role}`}>
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 rounded-xl text-foreground hover:bg-muted">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>



              {/* Profile Image / Initials */}
              <Link href="/account" className="flex items-center gap-2 hover:opacity-85 cursor-pointer">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.fullName}
                    className="h-8 w-8 rounded-full border border-primary/20 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {user.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-sm font-semibold text-foreground">
                  {user.fullName.split(' ')[0]}
                </span>
              </Link>

              {/* Logout Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-xl text-foreground hover:bg-muted">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-xl bg-primary text-white hover:bg-primary-hover shadow-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
