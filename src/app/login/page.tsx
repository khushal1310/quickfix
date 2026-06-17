"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Phone, Mail, Eye, EyeOff, Search, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(`/${user.role}`);
    }
  }, [isAuthenticated, user, router]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Login flow states
  const [oauthModal, setOauthModal] = useState<'google' | 'apple' | null>(null);
  const [loginMode, setLoginMode] = useState<'mobile' | 'email'>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginMode === 'mobile' ? mobileNumber : email;
    if (!identifier || !password) {
      toastError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(identifier, password);
      if (res.success) {
        toastSuccess('Logged in successfully!');
        const userJson = localStorage.getItem('qf_user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          router.push(`/${userObj.role}`);
        } else {
          router.push('/');
        }
      } else {
        setErrorMsg(res.error || 'Invalid credentials.');
        toastError(res.error || 'Login failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const selectOAuthAccount = async (mobile: string) => {
    setOauthModal(null);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(mobile, 'password123');
      if (res.success) {
        toastSuccess('Simulated native sign-in successful!');
        const userJson = localStorage.getItem('qf_user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          router.push(`/${userObj.role}`);
        } else {
          router.push('/');
        }
      } else {
        setErrorMsg(res.error || 'Simulated login failed.');
        toastError(res.error || 'Login failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setOauthModal('apple');
  };

  const handleGoogleSignIn = async () => {
    setOauthModal('google');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card p-4 rounded-2xl shadow-lg">
          <CardHeader className="space-y-2 text-center pb-4 relative">
            {/* Back Button */}
            <button 
              type="button"
              onClick={() => router.push('/')} 
              className="absolute left-1.5 top-1.5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              title="Go to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {/* QuickFix Rounded Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black shadow-md mb-2">
              <span className="text-xl font-black text-white tracking-wider">QF</span>
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              Get started with QuickFix
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Enter details below to manage service orders or requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-3">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-500 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Input Switch */}
              {loginMode === 'mobile' ? (
                /* Mobile Number input with simulated country selector */
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile number</label>
                  <div className="flex gap-2">
                    {/* Simulated Country Dropdown */}
                    <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-muted/20 text-foreground cursor-pointer select-none text-sm font-semibold">
                      <span>🇮🇳</span>
                      <svg className="h-3 w-3 text-muted-foreground fill-current" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                    </div>
                    {/* Input field with +91 prefix */}
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-3 text-sm font-bold text-foreground">+91</span>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="Enter 10-digit number"
                        className="pl-12 pr-10 text-sm font-semibold rounded-xl border border-border"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                      <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Email Address input */
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email address</label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10 pr-4 text-sm font-semibold rounded-xl border border-border"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    className="pl-10 pr-10 text-sm font-semibold rounded-xl border border-border"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full rounded-xl bg-black text-white hover:bg-black/90 font-bold h-11 transition-all mt-4" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Continuing...
                  </span>
                ) : 'Continue'}
              </Button>
            </form>

            {/* OR Separator */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/80"></div>
              <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">or</span>
              <div className="flex-grow border-t border-border/80"></div>
            </div>

            {/* Social Logins */}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleAppleSignIn}
                className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
              >
                <svg className="h-4 w-4 fill-current text-foreground" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.97.08 2.15-.52 2.81-1.33z"/>
                </svg>
                Continue with Apple
              </Button>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
              >
                <svg className="h-4 w-4 fill-current text-red-500" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.706 0 3.24.68 4.363 1.774l3.076-3.076C19.488 2.802 16.035 1 11.99 1 5.92 1 11.99s4.92 10.99 10.99 10.99c5.967 0 10.983-4.29 10.983-10.99 0-.727-.08-1.282-.236-1.705H12.24z"/>
                </svg>
                Continue with Google
              </Button>

              {loginMode === 'mobile' ? (
                <Button
                  type="button"
                  onClick={() => setLoginMode('email')}
                  className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
                >
                  <Mail className="h-4 w-4 text-foreground" />
                  Continue with Email
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setLoginMode('mobile')}
                  className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
                >
                  <Phone className="h-4 w-4 text-foreground" />
                  Continue with Mobile
                </Button>
              )}
            </div>

            {/* OR Separator */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/80"></div>
              <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">or</span>
              <div className="flex-grow border-t border-border/80"></div>
            </div>

            {/* Find Account / Forgot Password */}
            <Link 
              href="/forgot-password" 
              className="flex items-center justify-center gap-2 py-1 text-sm font-bold text-foreground hover:underline transition-all"
            >
              <Search className="h-4 w-4 text-foreground stroke-[3px]" />
              Find my account
            </Link>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-[10px] border-t border-border/60 pt-4 mt-2">
            <span className="text-muted-foreground leading-normal px-2">
              You consent to receive a verification code by text or Whatsapp. Message and data rates may apply.
            </span>
            <span className="text-muted-foreground font-semibold text-xs pt-1">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Sign Up
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* OAuth Selector Modal */}
      <Dialog open={oauthModal !== null} onOpenChange={(open) => !open && setOauthModal(null)}>
        <DialogContent className="max-w-md border-border bg-card p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-4">
            <div className="flex justify-center mb-3">
              {oauthModal === 'google' ? (
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20">
                  <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.706 0 3.24.68 4.363 1.774l3.076-3.076C19.488 2.802 16.035 1 11.99 1 5.92 1 11.99s4.92 10.99 10.99 10.99c5.967 0 10.983-4.29 10.983-10.99 0-.727-.08-1.282-.236-1.705H12.24z"/>
                  </svg>
                </div>
              ) : (
                <div className="p-3 bg-foreground/10 rounded-2xl text-foreground border border-foreground/20">
                  <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.97.08 2.15-.52 2.81-1.33z"/>
                  </svg>
                </div>
              )}
            </div>
            <DialogTitle className="text-xl font-extrabold text-center text-foreground">
              Sign in with {oauthModal === 'google' ? 'Google' : 'Apple'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
              Select one of the pre-linked accounts to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 max-h-72 overflow-y-auto pr-1">
            {[
              { name: 'Alice Customer', desc: 'Customer Account', email: 'customer@quickfix.com', mobile: '1111111111', avatar: 'Alice' },
              { name: 'Bob Provider', desc: 'Bronze Cleaning Provider', email: 'provider@quickfix.com', mobile: '2222222222', avatar: 'Bob' },
              { name: 'Charlie Silver', desc: 'Charlie Silver (Silver)', email: 'charlie@quickfix.com', mobile: '3333333333', avatar: 'Charlie' },
              { name: 'Daniel Gold', desc: 'Daniel Gold (Gold)', email: 'daniel@quickfix.com', mobile: '4444444444', avatar: 'Daniel' },
              { name: 'Edward Platinum', desc: 'Edward Platinum (Platinum)', email: 'edward@quickfix.com', mobile: '5555555555', avatar: 'Edward' },
              { name: 'Admin Moderation', desc: 'Administrator Account', email: 'admin@quickfix.com', mobile: '9999999999', avatar: 'Admin' }
            ].map((acc) => (
              <button
                key={acc.mobile}
                type="button"
                onClick={() => selectOAuthAccount(acc.mobile)}
                className="w-full flex items-center justify-between p-3 border border-border bg-muted/20 hover:bg-muted/80 rounded-xl text-left transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${acc.avatar}`}
                    alt={acc.name}
                    className="h-9 w-9 rounded-full bg-background border border-border object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{acc.name}</h4>
                    <span className="text-[10px] text-muted-foreground block font-medium">{acc.desc} • {acc.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider">Select</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
