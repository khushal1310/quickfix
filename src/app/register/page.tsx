"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { User, Shield, Phone, Lock, Sparkles, CheckCircle, Info, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, verifyOtp } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [mobileNum, setMobileNum] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  
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
        data.role === 'provider' ? data.serviceCategory : undefined
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
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {step === 1 ? 'Create Account' : 'Verify Mobile'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 1 
                ? 'Join QuickFix as a customer or local service provider.' 
                : `Enter the 4-digit verification code sent to ${mobileNum}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              // Step 1: Input details
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
    </div>
  );
}
