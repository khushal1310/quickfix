"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { User, Shield, Phone, Lock, Sparkles, CheckCircle, Info, Loader2, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
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

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, verifyOtp, login, user, isAuthenticated } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(`/${user.role}`);
    }
  }, [isAuthenticated, user, router]);

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [mobileNum, setMobileNum] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [oauthModal, setOauthModal] = useState<'google' | 'apple' | null>(null);

  const selectOAuthAccount = async (mobile: string) => {
    setOauthModal(null);
    setLoading(true);
    try {
      const res = await login(mobile, 'password123');
      if (res.success) {
        toastSuccess('Simulated native signup and login successful!');
        const userJson = localStorage.getItem('qf_user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          router.push(`/${userObj.role}`);
        } else {
          router.push('/');
        }
      } else {
        toastError(res.error || 'Simulated signup failed.');
      }
    } catch (err: any) {
      toastError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  // OTP input state
  const [otpCode, setOtpCode] = useState('');

  // Form handling
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer' as 'customer' | 'provider',
      serviceCategory: 'Cleaning',
    }
  });

  const selectedRole = watch('role');

  const onRegisterSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      toastError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(
        data.fullName,
        data.mobileNumber,
        data.password,
        data.role,
        data.role === 'provider' ? data.serviceCategory : undefined,
        data.email
      );

      if (res.success) {
        setMobileNum(data.mobileNumber);
        setSimulatedOtp(res.otp || null);
        toastSuccess('Registration initiated! OTP code sent.');
        setStep(2); // Go to OTP screen
      } else {
        toastError(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      toastError('Please enter the 4-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(mobileNum, otpCode);
      if (res.success && res.user) {
        toastSuccess('Account verified and logged in successfully!');
        router.push(`/${res.user.role}`);
      } else {
        toastError(res.error || 'Invalid OTP.');
      }
    } catch (err: any) {
      toastError(err.message || 'Verification error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 text-center relative">
            {/* Back Button */}
            <button 
              type="button"
              onClick={() => router.push('/')} 
              className="absolute left-1.5 top-1.5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              title="Go to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {step === 1 ? 'Create Account' : 'Verify Email'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 1 
                ? 'Join QuickFix as a customer or local service provider.' 
                : `Enter the 4-digit verification code sent to your email.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              // Step 1: Input details
              <>
                <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter full name"
                      className="pl-10"
                      required
                      {...register('fullName')}
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      className="pl-10"
                      required
                      {...register('mobileNumber')}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      className="pl-10"
                      required
                      {...register('email')}
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border border-border cursor-pointer transition-all duration-200 ${selectedRole === 'customer' ? 'bg-primary/5 border-primary text-primary font-bold' : 'bg-background hover:bg-muted text-foreground'}`}>
                      <input 
                        type="radio" 
                        value="customer" 
                        className="sr-only" 
                        {...register('role')} 
                      />
                      <span>Customer</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border border-border cursor-pointer transition-all duration-200 ${selectedRole === 'provider' ? 'bg-primary/5 border-primary text-primary font-bold' : 'bg-background hover:bg-muted text-foreground'}`}>
                      <input 
                        type="radio" 
                        value="provider" 
                        className="sr-only" 
                        {...register('role')} 
                      />
                      <span>Provider</span>
                    </label>
                  </div>
                </div>

                {/* Service Category (for providers only) */}
                {selectedRole === 'provider' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Category</label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      {...register('serviceCategory')}
                    >
                      <option value="Cleaning">Cleaning</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Appliance Repair">Appliance Repair</option>
                      <option value="Painting">Painting</option>
                      <option value="Pest Control">Pest Control</option>
                    </select>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      className="pl-10"
                      required
                      {...register('password')}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Repeat password"
                      className="pl-10"
                      required
                      {...register('confirmPassword')}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold mt-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
              
              {/* OR Separator */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/80"></div>
                <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">or</span>
                <div className="flex-grow border-t border-border/80"></div>
              </div>

              {/* Social Signups */}
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => setOauthModal('apple')}
                  className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
                >
                  <svg className="h-4 w-4 fill-current text-foreground" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.97.08 2.15-.52 2.81-1.33z"/>
                  </svg>
                  Continue with Apple
                </Button>

                <Button
                  type="button"
                  onClick={() => setOauthModal('google')}
                  className="w-full rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted font-bold h-11 flex items-center justify-center gap-2.5 transition-all text-sm"
                >
                  <svg className="h-4 w-4 fill-current text-red-500" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.706 0 3.24.68 4.363 1.774l3.076-3.076C19.488 2.802 16.035 1 11.99 1 5.92 1 11.99s4.92 10.99 10.99 10.99c5.967 0 10.983-4.29 10.983-10.99 0-.727-.08-1.282-.236-1.705H12.24z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </>
          ) : (
              // Step 2: OTP screen
              <form onSubmit={onOtpSubmit} className="space-y-4">
                {simulatedOtp && (
                  <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 p-4 border border-blue-500/20">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-500">SMS Simulator Panel</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use this code to verify: <span className="font-mono font-bold text-blue-500 text-sm select-all">{simulatedOtp}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Code</label>
                  <Input
                    type="text"
                    maxLength={4}
                    placeholder="Enter 4-digit OTP"
                    className="text-center text-lg font-mono font-bold tracking-widest"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
                      <CheckCircle className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full rounded-xl text-muted-foreground"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back to Registration
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm border-t border-border pt-4">
            <span className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Log In
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
              Sign up with {oauthModal === 'google' ? 'Google' : 'Apple'}
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
