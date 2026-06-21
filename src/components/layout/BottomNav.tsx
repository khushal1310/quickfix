"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Briefcase, Wallet, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated || !user) return null;

  const role = user.role;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-md sm:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Home Link */}
        <Link 
          href={`/${role}`} 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            pathname === `/${role}` ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </Link>

        {/* Customer Specific Action: Create Service Request */}
        {role === 'customer' && (
          <Link 
            href="/customer#create-request" 
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              pathname.includes('create-request') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Request</span>
          </Link>
        )}



        {/* Admin Specific Action: Dispute management */}
        {role === 'admin' && (
          <Link 
            href="/admin#disputes" 
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              pathname.includes('disputes') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Disputes</span>
          </Link>
        )}

        {/* Active Jobs/Orders */}
        <Link 
          href={`/${role}#orders`} 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            pathname.includes('orders') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">Orders</span>
        </Link>

        {/* Profile Settings */}
        <Link 
          href="/account" 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            pathname === '/account' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.fullName} 
              className="h-5 w-5 rounded-full object-cover border border-primary/20"
            />
          ) : (
            <Settings className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
