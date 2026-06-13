"use client";

import React, { useEffect, useState } from 'react';
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Branding Logo */}
        <Link href={isAuthenticated && user ? `/${user.role}` : "/"} className="flex items-center gap-2">
          <span className="insta-gradient p-1.5 rounded-lg text-white">
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0-1.1.9-2 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            QuickFix
          </span>
        </Link>

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

              {/* Provider Wallet display */}
              {user.role === 'provider' && (
                <Link href="/provider#wallet">
                  <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 rounded-xl border-border bg-card text-foreground hover:bg-muted">
                    <Wallet className="h-4 w-4 text-primary" />
                    Wallet
                  </Button>
                </Link>
              )}

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
