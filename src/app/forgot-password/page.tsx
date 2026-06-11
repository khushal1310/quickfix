"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, Lock, HelpCircle, Info, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [mobileNum, setMobileNum] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Form states
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNum.length < 10) {
      toastError('Please enter a valid mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobileNum }),
      });
      const data = await res.json();

      if (res.ok) {
        setSimulatedOtp(data.otp || null);
        toastSuccess('Password reset OTP generated!');
        setStep(2);
      } else {
        toastError(data.error || 'Failed to request reset.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      toastError('Please enter the 4-digit OTP.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toastError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobileNum,
          otpCode,
          newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        toastError(data.error || 'Password reset failed.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              Reset Password
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 1 
                ? 'Enter your registered mobile number to request a reset code.' 
                : 'Enter the verification code and choose a new password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              // Step 1: Input mobile number
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      className="pl-10"
                      value={mobileNum}
                      onChange={(e) => setMobileNum(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      Send Reset OTP
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              // Step 2: Input OTP & New Password
              <form onSubmit={handleResetSubmit} className="space-y-4">
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

                {/* OTP Code */}
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

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      className="pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Update Password
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
                  Request Code Again
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm border-t border-border pt-4">
            <span className="text-muted-foreground">
              Remembered your password?{' '}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Log In
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
