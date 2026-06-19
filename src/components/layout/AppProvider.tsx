"use client";

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { DobPickerModal } from '../ui/DobPickerModal';

// Initialize TanStack query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, loadSession } = useAuth();

  // Initialize the authentication state from persistent storage
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleDobSaveSuccess = async (dob: string) => {
    const storedUser = localStorage.getItem('qf_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      u.dob = dob;
      localStorage.setItem('qf_user', JSON.stringify(u));
    }
    await loadSession();
  };

  const showDobModal = isAuthenticated && user && !user.dob && !isLoading;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDobModal && (
        <DobPickerModal 
          userId={user.id} 
          onSaveSuccess={handleDobSaveSuccess} 
        />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
