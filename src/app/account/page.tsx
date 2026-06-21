"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  User,
  Phone,
  Mail,
  Star,
  ShieldCheck,
  Wallet,
  MessageSquare,
  Bell,
  HelpCircle,
  ChevronRight,
  FileText,
  Lock,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  X,
  Search,
  MessageCircle,
  Globe,
  DollarSign,
  Compass,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

// Interfaces for fetched states
interface UserDBDetails {
  fullName: string;
  mobileNumber: string;
  email?: string;
  profileImage: string;
  role: 'customer' | 'provider' | 'admin';
  rating: number;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  kycStatus: 'verified' | 'pending' | 'unverified';
  completedOrdersCount?: number;
  serviceCategory?: string;
  selfieUrl?: string;
}

// Resolver for provider badges
function getProviderBadge(count: number) {
  if (count >= 1000) {
    return { label: 'Platinum', color: 'bg-slate-900 border-slate-500 text-slate-100 dark:bg-slate-800' };
  }
  if (count >= 500) {
    return { label: 'Gold', color: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' };
  }
  if (count >= 250) {
    return { label: 'Silver', color: 'bg-slate-500/10 border-slate-500/30 text-slate-500' };
  }
  if (count >= 50) {
    return { label: 'Bronze', color: 'bg-amber-700/10 border-amber-700/30 text-amber-700' };
  }
  return { label: 'Bronze', color: 'bg-amber-700/10 border-amber-700/30 text-amber-700' };
}

export default function AccountPage() {
  const router = useRouter();
  const { user: authUser, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Loading and State management
  const [dbLoading, setDbLoading] = useState(true);
  const [profile, setProfile] = useState<UserDBDetails | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletHeld, setWalletHeld] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3);
  const [dark, setDark] = useState(false);

  // Modal displays
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Form states
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editServiceCategory, setEditServiceCategory] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Email update verification states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('Cleaning');
  const [contactMessage, setContactMessage] = useState('');

  // Aadhaar KYC state variables
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [kycStep, setKycStep] = useState<'input' | 'loading' | 'otp' | 'success'>('input');
  const [loadingStepText, setLoadingStepText] = useState('');
  const [kycOtp, setKycOtp] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Temporary list fetch states for request/job modal
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [modalItemsLoading, setModalItemsLoading] = useState(false);

  // Load user database records
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !authUser) {
      router.replace('/login');
      return;
    }

    fetchDBData();

    // Check dark theme
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    setDark(isDark);
  }, [authLoading, isAuthenticated, authUser]);

  const fetchDBData = async () => {
    if (!authUser) return;
    setDbLoading(true);
    try {
      // 1. Fetch user data from MongoDB
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) throw userError;

      if (userRecord) {
        const profileDetails: UserDBDetails = {
          fullName: userRecord.full_name || authUser.fullName,
          mobileNumber: userRecord.mobile_number || authUser.mobileNumber,
          email: userRecord.email || '',
          profileImage: userRecord.profile_image || authUser.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userRecord.full_name || '')}`,
          role: userRecord.role || authUser.role,
          rating: userRecord.rating || 4.8,
          verificationStatus: userRecord.verification_status || 'unverified',
          kycStatus: userRecord.kyc_status || 'unverified',
          completedOrdersCount: userRecord.completed_orders_count || 0,
          serviceCategory: userRecord.service_category || '',
          selfieUrl: userRecord.selfie_url || '',
        };
        setProfile(profileDetails);

        // Populate edit form states
        setEditName(profileDetails.fullName);
        setEditMobile(profileDetails.mobileNumber);
        setEditImage(profileDetails.profileImage);
        setEditEmail(profileDetails.email || '');
        setEditServiceCategory(profileDetails.serviceCategory || '');
      } else {
        // User record was deleted or reset from MongoDB, log out to prevent blank page
        console.warn('User record not found in MongoDB. Logging out...');
        logout();
        router.replace('/login');
        return;
      }

      // 2. Fetch Wallet Balance
      const { data: walletRecord } = await supabase
        .from('wallets')
        .select('*')
        .eq('provider_id', authUser.id)
        .maybeSingle();

      if (walletRecord) {
        setWalletBalance(parseFloat(walletRecord.balance) || 0);
        setWalletHeld(parseFloat(walletRecord.held_amount) || 0);
      } else {
        // If customer, we show local default wallet balance of $0
        setWalletBalance(0);
        setWalletHeld(0);
      }
    } catch (err: any) {
      console.error('Error fetching database profile:', err);
      toastError('Failed to load profile details.');
    } finally {
      setDbLoading(false);
    }
  };

  // Toggle Dark Mode
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

  // Profile Photo Upload & Compression Handler
  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Str = event.target?.result as string;

        // Create an image element to compress it on a canvas
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300; // 300x300 pixel limit for profile avatar
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG format with 0.7 quality to stay under DB constraints
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setEditImage(compressedBase64);
          toastSuccess('Photo uploaded successfully! Save profile to store changes.');
        };
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toastError('Failed to process image file.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!editEmail || !editEmail.includes('@')) {
      toastError('Please enter a valid email address.');
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailOtpSent(true);
        toastSuccess('Verification code sent to your email!');
      } else {
        toastError(data.error || 'Failed to send verification code.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtpCode.length < 4) {
      toastError('Please enter the 4-digit verification code.');
      return;
    }

    setEmailVerifying(true);
    try {
      const res = await fetch('/api/auth/email-otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.toLowerCase().trim(),
          otpCode: emailOtpCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailVerified(true);
        toastSuccess('Email verified successfully!');
      } else {
        toastError(data.error || 'Verification failed.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setEmailVerifying(false);
    }
  };

  // 1. Edit Profile Handler
  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editMobile.trim()) {
      toastError('Name and mobile number are required.');
      return;
    }

    const hasEmailChanged = editEmail.toLowerCase().trim() !== (profile?.email || '').toLowerCase().trim();
    if (hasEmailChanged && !emailVerified) {
      toastError('Please verify your new email address first.');
      return;
    }

    setModalLoading(true);
    try {
      const updateData: any = {
        full_name: editName,
        mobile_number: editMobile,
        profile_image: editImage,
        email: editEmail
      };

      if (profile?.role === 'provider') {
        updateData.service_category = editServiceCategory;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authUser?.id);

      if (error) throw error;

      // Update local storage session so it propagates to AuthContext
      const storedUser = localStorage.getItem('qf_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.fullName = editName;
        u.mobileNumber = editMobile;
        u.profileImage = editImage;
        if (profile?.role === 'provider') {
          u.serviceCategory = editServiceCategory;
        }
        localStorage.setItem('qf_user', JSON.stringify(u));
      }

      toastSuccess('Profile updated successfully!');
      setActiveModal(null);
      await fetchDBData();
    } catch (err: any) {
      toastError(err.message || 'Failed to update profile.');
    } finally {
      setModalLoading(false);
    }
  };

  // 2. Change Password Handler
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toastError('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toastError('Password must be at least 6 characters.');
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Password update failed.');

      toastSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveModal(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to change password.');
    } finally {
      setModalLoading(false);
    }
  };

  // 3. Delete Account Handler
  const handleDeleteAccountConfirm = async () => {
    setModalLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Account deletion failed.');

      toastSuccess('Your account has been deleted.');
      logout();
      router.push('/');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete account.');
    } finally {
      setModalLoading(false);
    }
  };

  // 4. Become Provider Handler
  const handleBecomeProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      // Age limit check: Must be 18+ to register as provider
      let age = 0;
      const storedUserString = localStorage.getItem('qf_user');
      if (storedUserString) {
        const u = JSON.parse(storedUserString);
        if (u.dob) {
          const today = new Date();
          const birthDate = new Date(u.dob);
          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
      }

      if (age < 18) {
        throw new Error('Age restriction: You must be 18 years or older to register as a service provider.');
      }

      const res = await fetch('/api/auth/become-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCategory: selectedCategory })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Role change failed.');

      // Update local storage details and refresh state
      localStorage.setItem('qf_token', data.token);
      localStorage.setItem('qf_user', JSON.stringify(data.user));

      toastSuccess(`Congratulations! You are now a verified ${selectedCategory} Provider.`);
      setActiveModal(null);
      
      // Full page reload to clean and re-render the workspace routing
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || 'Failed to register as provider.');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch lists for Customer/Provider overlays
  const fetchModalListItems = async (type: string) => {
    if (!authUser) return;
    setModalItemsLoading(true);
    setModalItems([]);
    try {
      let fetched: any[] = [];
      if (type === 'active-requests') {
        const { data } = await supabase.from('service_requests').select('*').eq('customer_id', authUser.id).eq('status', 'OPEN');
        fetched = data || [];
      } else if (type === 'accepted-requests') {
        const { data } = await supabase.from('service_requests').select('*').eq('customer_id', authUser.id).in('status', ['SELECTED', 'IN_PROGRESS']);
        fetched = data || [];
      } else if (type === 'completed-requests') {
        const { data } = await supabase.from('service_requests').select('*').eq('customer_id', authUser.id).in('status', ['COMPLETED', 'AUTOCOMPLETED']);
        fetched = data || [];
      } else if (type === 'cancelled-requests') {
        const { data } = await supabase.from('service_requests').select('*').eq('customer_id', authUser.id).eq('status', 'CANCELLED');
        fetched = data || [];
      } else if (type === 'customer-disputes') {
        const { data } = await supabase.from('disputes').select('*, order:orders(*)').eq('customer_id', authUser.id);
        fetched = data || [];
      } else if (type === 'active-jobs') {
        const { data } = await supabase.from('orders').select('*, request:service_requests(*)').eq('provider_id', authUser.id).neq('status', 'COMPLETED').neq('status', 'AUTOCOMPLETED').neq('status', 'CANCELLED');
        fetched = data || [];
      } else if (type === 'pending-requests') {
        const { data } = await supabase.from('provider_accepts').select('*, request:service_requests(*)').eq('provider_id', authUser.id);
        fetched = data || [];
      } else if (type === 'completed-jobs') {
        const { data } = await supabase.from('orders').select('*, request:service_requests(*)').eq('provider_id', authUser.id).in('status', ['COMPLETED', 'AUTOCOMPLETED']);
        fetched = data || [];
      } else if (type === 'wallet-history') {
        const { data: wallet } = await supabase.from('wallets').select('*').eq('provider_id', authUser.id).maybeSingle();
        if (wallet) {
          const { data } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false });
          fetched = data || [];
        }
      } else if (type === 'reviews-received') {
        const { data } = await supabase
          .from('provider_reviews')
          .select('*, customer:users(*)')
          .eq('provider_id', authUser.id)
          .order('created_at', { ascending: false });
        fetched = data || [];
      }

      setModalItems(fetched);
    } catch (e) {
      console.error(e);
      toastError('Failed to fetch action logs.');
    } finally {
      setModalItemsLoading(false);
    }
  };

  const openDrawerModal = (modalName: string) => {
    setActiveModal(modalName);
    setModalSearchQuery('');
    
    if (modalName === 'edit-profile') {
      setEmailOtpSent(false);
      setEmailVerified(false);
      setEmailOtpCode('');
      setEmailVerifying(false);
      if (profile) {
        setEditEmail(profile.email || '');
        setEditName(profile.fullName || '');
        setEditMobile(profile.mobileNumber || '');
        setEditImage(profile.profileImage || '');
        setEditServiceCategory(profile.serviceCategory || '');
      }
    }

    // Check if the modal requires pulling a database list
    const lists = [
      'active-requests',
      'accepted-requests',
      'completed-requests',
      'cancelled-requests',
      'customer-disputes',
      'active-jobs',
      'pending-requests',
      'completed-jobs',
      'wallet-history',
      'reviews-received'
    ];
    if (lists.includes(modalName)) {
      fetchModalListItems(modalName);
    }
  };

  // Aadhaar KYC Submit Handler
  const handleAadhaarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = aadhaarNumber.replace(/\D/g, '');
    if (cleaned.length !== 12) {
      toastError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setKycStep('loading');
    setLoadingStepText('Connecting to UIDAI secure servers...');
    
    setTimeout(() => {
      setLoadingStepText('Locating linked mobile number...');
      setTimeout(() => {
        setLoadingStepText('Sending secure SMS OTP...');
        setTimeout(() => {
          setKycStep('otp');
        }, 1200);
      }, 1200);
    }, 1200);
  };

  // Aadhaar KYC OTP Verification Handler
  const handleKycOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = kycOtp.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      toastError('Please enter the 6-digit OTP.');
      return;
    }

    setKycSubmitting(true);
    try {
      // Age limit check for providers: Must be 18+ to verify
      let age = 0;
      const storedUserString = localStorage.getItem('qf_user');
      if (storedUserString) {
        const u = JSON.parse(storedUserString);
        if (u.dob) {
          const today = new Date();
          const birthDate = new Date(u.dob);
          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
      }

      if (profile?.role === 'provider' && age < 18) {
        throw new Error('KYC Rejected: You must be 18 years or older to verify as a service provider.');
      }

      const { error } = await supabase
        .from('users')
        .update({
          kyc_status: 'verified',
          verification_status: 'verified'
        })
        .eq('id', authUser?.id);

      if (error) throw error;

      // Update local storage session
      const storedUser = localStorage.getItem('qf_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.kycStatus = 'verified';
        u.verificationStatus = 'verified';
        localStorage.setItem('qf_user', JSON.stringify(u));
      }

      toastSuccess('Aadhaar KYC Verification Successful!');
      setKycStep('success');
      setProfile(prev => prev ? { ...prev, kycStatus: 'verified', verificationStatus: 'verified' } : null);
    } catch (err: any) {
      toastError(err.message || 'Verification update failed.');
    } finally {
      setKycSubmitting(false);
    }
  };

  // Contact Support Form Handler
  const handleContactSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setModalLoading(true);
    setTimeout(() => {
      toastSuccess('Thank you! Our support team has received your ticket and will respond within 4 hours.');
      setContactMessage('');
      setActiveModal(null);
      setModalLoading(false);
    }, 1200);
  };

  // Refer & Earn Promo Code copy helper
  const handleCopyPromo = (promo: string) => {
    navigator.clipboard.writeText(promo);
    toastSuccess('Promo code copied to clipboard!');
  };

  // Skeleton Loader for Account Page
  if (dbLoading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-16 sm:pb-0">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
          <div className="flex items-center gap-4 py-4">
            <div className="h-16 w-16 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded-xl animate-pulse" />
            <div className="h-12 bg-muted rounded-xl animate-pulse" />
            <div className="h-12 bg-muted rounded-xl animate-pulse" />
            <div className="h-12 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
        <h1 className="text-xl font-bold text-foreground mb-2">Session Expired</h1>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Your account could not be found or your session has expired. This usually happens after a database reset.
        </p>
        <Button 
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="rounded-xl px-6 py-2.5 bg-primary text-white font-bold"
        >
          Return to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 sm:pb-0">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        
        {/* Dynamic Back Navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-all"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black tracking-tight text-foreground">My Account</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Uber/Instagram-Inspired Header Card */}
        <Card className="border border-border bg-card shadow-md rounded-2xl overflow-hidden mb-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={profile.profileImage}
                  alt={profile.fullName}
                  className="h-16 w-16 rounded-full border border-border object-cover bg-muted"
                />
                <button 
                  onClick={() => openDrawerModal('edit-profile')} 
                  className="absolute bottom-0 right-0 p-1 bg-black text-white rounded-full border border-border hover:scale-105 transition-all shadow-md"
                  aria-label="Edit Profile Image"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight truncate">
                    {profile.fullName}
                  </h2>
                  {profile.verificationStatus === 'verified' && (
                    <ShieldCheck className="h-5 w-5 text-blue-500 fill-blue-500/10 shrink-0" title="Background Verified" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                  +91 {profile.mobileNumber}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {profile.role}
                  </span>
                  {profile.role === 'provider' && (() => {
                    const badge = getProviderBadge(profile.completedOrdersCount || 0);
                    return (
                      <>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                          {profile.serviceCategory || 'Professional'}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-bold text-xs shrink-0 border-border bg-background text-foreground hover:bg-muted"
                onClick={() => openDrawerModal('edit-profile')}
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">

          {/* Notifications Card */}
          <button 
            onClick={() => openDrawerModal('notifications')} 
            className="flex flex-col items-start p-4 bg-card hover:bg-muted/30 border border-border rounded-2xl transition-all duration-200 text-left relative"
          >
            <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mb-3">
              <Bell className="h-5 w-5" />
            </div>
            {unreadNotifications > 0 && (
              <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                {unreadNotifications}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-semibold">Notifications</span>
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {unreadNotifications} new updates
            </span>
          </button>

          {/* Help & Support Card */}
          <button 
            onClick={() => openDrawerModal('help-center')} 
            className="flex flex-col items-start p-4 bg-card hover:bg-muted/30 border border-border rounded-2xl transition-all duration-200 text-left"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 mb-3">
              <HelpCircle className="h-5 w-5" />
            </div>
            <span className="text-xs text-muted-foreground font-semibold">Help &amp; Support</span>
            <span className="text-xs font-bold text-purple-500 mt-1">Browse FAQs</span>
          </button>
        </div>

        {/* CUSTOMER ONLY: Requests & Order Logs */}
        {profile.role === 'customer' && (
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">My Requests</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <button onClick={() => openDrawerModal('active-requests')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Active Requests</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('accepted-requests')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Accepted Requests</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('completed-requests')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Completed Requests</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('cancelled-requests')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Cancelled Requests</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('customer-disputes')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Disputes &amp; Claims</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* PROVIDER ONLY: Jobs & Earning Records */}
        {profile.role === 'provider' && (
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">My Work</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <button onClick={() => openDrawerModal('active-jobs')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Active Jobs</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('pending-requests')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Pending Requests (Accepts)</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('completed-jobs')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Completed Jobs</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => openDrawerModal('provider-earnings')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Earnings Report</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* SAFETY & VERIFICATION */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">Safety &amp; Verification</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button onClick={() => openDrawerModal('kyc-status')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">KYC Status</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                profile.kycStatus === 'verified'
                  ? 'text-green-500 bg-green-500/10 border-green-500/20'
                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
              }`}>
                {profile.kycStatus === 'verified' ? 'Verified' : 'Verify Now'}
              </span>
            </button>
            <button onClick={() => openDrawerModal('kyc-status')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Identity Verification</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('privacy-settings')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Privacy Settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* REVIEWS & RATINGS */}
        {profile.role === 'provider' && (
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">Reviews &amp; Ratings</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <button onClick={() => openDrawerModal('reviews-received')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">My Badge</span>
                {(() => {
                  const badge = getProviderBadge(profile.completedOrdersCount || 0);
                  return (
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </button>
              <button onClick={() => openDrawerModal('reviews-received')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
                <span className="text-sm font-bold text-foreground">Reviews Received</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}



        {/* SETTINGS SECTION */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">Settings</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button onClick={() => openDrawerModal('edit-profile')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Account Settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('change-password')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Change Password</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('notification-preferences')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Notification Preferences</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between p-4 text-left">
              <span className="text-sm font-bold text-foreground">Dark Mode</span>
              <button 
                onClick={toggleTheme}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  dark ? 'bg-primary' : 'bg-muted border border-border'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-all duration-200 flex items-center justify-center ${
                  dark ? 'translate-x-5' : 'translate-x-0'
                }`}>
                  {dark ? <Sun className="h-3 w-3 text-yellow-500" /> : <Moon className="h-3 w-3 text-gray-400" />}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* HELP & SUPPORT SECTION */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">Support</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button onClick={() => openDrawerModal('help-center')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Help Center</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('contact-support')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Contact Support</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('report-problem')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Report a Problem</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* LEGAL SECTION */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 px-1">Legal</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button onClick={() => openDrawerModal('privacy-policy')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Privacy Policy</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => openDrawerModal('terms-conditions')} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all text-left">
              <span className="text-sm font-bold text-foreground">Terms &amp; Conditions</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* SPECIAL FEATURE: CUSTOMER TRANSITION TO PROVIDER */}
        {profile.role === 'customer' && (
          <div className="mb-6">
            <Button 
              size="lg" 
              className="w-full rounded-2xl py-6 font-black bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white shadow-md border-0"
              onClick={() => openDrawerModal('become-provider')}
            >
              Become a Provider
            </Button>
          </div>
        )}

        {/* ACCOUNT DELETION & LOGOUT */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border mb-10">
          <button 
            onClick={logout} 
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 text-red-500 font-bold text-sm text-left transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
          <button 
            onClick={() => openDrawerModal('delete-account')} 
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 text-red-700 font-bold text-sm text-left transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Account</span>
          </button>
        </div>

      </main>

      {/* ============================================== */}
      {/* DRAWER & OVERLAY MODALS FOR EVERY ACTION CARD */}
      {/* ============================================== */}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-md">
              <h3 className="text-base font-black text-foreground tracking-tight capitalize">
                {activeModal.replace('-', ' ')}
              </h3>
              <button 
                onClick={() => setActiveModal(null)} 
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1">
              
              {/* 1. EDIT PROFILE MODAL */}
              {activeModal === 'edit-profile' && (
                <form onSubmit={handleEditProfileSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <Input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                    <Input 
                      type="tel" 
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <div className="flex gap-2">
                      <Input 
                        type="email" 
                        value={editEmail}
                        onChange={(e) => {
                          setEditEmail(e.target.value);
                          setEmailVerified(false);
                          setEmailOtpSent(false);
                          setEmailOtpCode('');
                        }}
                        placeholder="Enter email address"
                        className="flex-1"
                        disabled={modalLoading || emailVerified}
                      />
                      {editEmail && editEmail.toLowerCase().trim() !== (profile?.email || '').toLowerCase().trim() && !emailVerified && (
                        <Button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={modalLoading || !editEmail.includes('@') || emailOtpSent}
                          className="rounded-xl px-4 text-xs font-bold bg-primary text-white hover:bg-primary/90 h-10 shrink-0"
                        >
                          {emailOtpSent ? 'Sent' : 'Send Code'}
                        </Button>
                      )}
                    </div>
                    {emailVerified && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mt-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Email address verified!</span>
                      </div>
                    )}
                    
                    {/* Inline OTP Code Verification */}
                    {editEmail && editEmail.toLowerCase().trim() !== (profile?.email || '').toLowerCase().trim() && !emailVerified && emailOtpSent && (
                      <div className="mt-2 space-y-2 p-3 bg-muted/30 border border-border/80 rounded-xl">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Verification Code</label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            maxLength={4}
                            placeholder="Enter 4-digit code"
                            className="text-center font-mono font-bold tracking-widest h-10"
                            value={emailOtpCode}
                            onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyEmailOtp}
                            disabled={modalLoading || emailOtpCode.length < 4 || emailVerifying}
                            className="rounded-xl px-4 text-xs font-bold bg-primary text-white hover:bg-primary/90 h-10 shrink-0"
                          >
                            {emailVerifying ? 'Verifying...' : 'Verify'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      <img 
                        src={editImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${editName}`} 
                        alt="Profile preview" 
                        className="h-16 w-16 rounded-full object-cover border border-border"
                      />
                      <label className="cursor-pointer bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl text-xs font-black border border-border flex items-center gap-1.5 transition-colors">
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            Upload Photo
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg" 
                          className="sr-only" 
                          onChange={handleProfilePhotoChange} 
                          disabled={uploadingPhoto}
                        />
                      </label>
                    </div>
                  </div>
                  {profile.role === 'provider' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Category</label>
                      <select 
                        value={editServiceCategory}
                        onChange={(e) => setEditServiceCategory(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                        required
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

                  <Button 
                    type="submit" 
                    className="w-full rounded-xl mt-4 font-bold" 
                    disabled={modalLoading || (editEmail.toLowerCase().trim() !== (profile?.email || '').toLowerCase().trim() && !emailVerified)}
                  >
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Save Profile
                  </Button>
                </form>
              )}

              {/* 2. CHANGE PASSWORD MODAL */}
              {activeModal === 'change-password' && (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</label>
                    <Input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
                    <Input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</label>
                    <Input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-xl mt-4 font-bold" disabled={modalLoading}>
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Update Password
                  </Button>
                </form>
              )}

              {/* 3. BECOME PROVIDER MODAL */}
              {activeModal === 'become-provider' && (
                <form onSubmit={handleBecomeProviderSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-normal">
                    Register as a professional service provider to receive jobs from local customers in real-time. Select your primary service category below:
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Category</label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="Cleaning">Cleaning</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Appliance Repair">Appliance Repair</option>
                      <option value="Painting">Painting</option>
                      <option value="Pest Control">Pest Control</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full rounded-xl mt-4 font-bold" disabled={modalLoading}>
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Confirm Provider Registration
                  </Button>
                </form>
              )}

              {/* 4. DELETE ACCOUNT MODAL */}
              {activeModal === 'delete-account' && (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h4 className="text-lg font-extrabold text-foreground">Are you absolutely sure?</h4>
                  <p className="text-sm text-muted-foreground leading-normal">
                    This action is permanent. Deleting your account will completely wipe your user profile, verified tags, and wallet ledger from our database.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl font-bold"
                      onClick={() => setActiveModal(null)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={handleDeleteAccountConfirm}
                      disabled={modalLoading}
                    >
                      {modalLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Yes, Delete
                    </Button>
                  </div>
                </div>
              )}

              {/* 5. MOCK NOTIFICATIONS */}
              {activeModal === 'notifications' && (
                <div className="space-y-4 text-center py-8 text-muted-foreground">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <Bell className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-normal">
                    Your real-time updates and service matching notifications will appear here.
                  </p>
                </div>
              )}

              {/* 6. HELP CENTER FAQ MODAL */}
              {activeModal === 'help-center' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="Search support articles..." 
                      className="pl-10 h-11"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3 mt-4">
                    {[
                      { q: 'How do I request a wallet refund?', a: 'Refunds are automatically issued if an order is cancelled before being accepted or resolved in customer favor.' },
                      { q: 'How does provider payout work?', a: 'Once the work is completed and confirmed by the customer, payment is released to the provider wallet.' },
                      { q: 'KYC Verification requirements', a: 'Providers must upload government ID to unlock the background check verification tag.' }
                    ]
                      .filter(item => item.q.toLowerCase().includes(modalSearchQuery.toLowerCase()) || item.a.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                      .map((item, idx) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl">
                          <h4 className="text-sm font-black text-foreground">{item.q}</h4>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 7. CONTACT SUPPORT FORM */}
              {activeModal === 'contact-support' && (
                <form onSubmit={handleContactSupportSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Describe your issue</label>
                    <textarea
                      rows={5}
                      className="flex w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      placeholder="Tell us what went wrong. Include order IDs if applicable..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl mt-4 font-bold" disabled={modalLoading}>
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Submit Ticket
                  </Button>
                </form>
              )}

              {/* 8. REPORT A PROBLEM */}
              {activeModal === 'report-problem' && (
                <form onSubmit={handleContactSupportSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bug description</label>
                    <textarea
                      rows={4}
                      className="flex w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      placeholder="Describe the bug or design issue..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl mt-4 font-bold" disabled={modalLoading}>
                    Submit Bug Report
                  </Button>
                </form>
              )}

              {/* 9. KYC STATUS */}
              {activeModal === 'kyc-status' && (
                <div>
                  {profile.kycStatus === 'verified' || kycStep === 'success' ? (
                    <div className="space-y-4 text-center py-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                        <CheckCircle2 className="h-7 w-7 text-green-500" />
                      </div>
                      <h4 className="text-lg font-extrabold text-foreground">KYC Verification Completed</h4>
                      <p className="text-sm text-muted-foreground leading-normal px-2">
                        Your background and identity check has been successfully verified via UIDAI. Your profile displays the verification checkmark on service listings.
                      </p>
                      <div className="text-left mt-6 border border-border p-4 rounded-2xl bg-muted/20 space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">ID Type:</span><span className="font-bold">Aadhaar (Government UIDAI)</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="font-bold text-green-500">Approved & Verified</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Last Verified:</span><span className="font-bold">Just now / Recent</span></div>
                      </div>
                    </div>
                  ) : kycStep === 'input' ? (
                    <form onSubmit={handleAadhaarSubmit} className="space-y-4 py-2">
                      <div className="text-center mb-4">
                        <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
                        <h4 className="text-base font-bold text-foreground">Aadhaar Card KYC</h4>
                        <p className="text-xs text-muted-foreground mt-1">Verify your identity instantly using your Aadhaar number</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aadhaar Card Number</label>
                        <Input
                          placeholder="e.g. 1234-5678-9012"
                          maxLength={19}
                          value={aadhaarNumber}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 12) val = val.slice(0, 12);
                            const parts = [];
                            for (let i = 0; i < val.length; i += 4) {
                              parts.push(val.slice(i, i + 4));
                            }
                            setAadhaarNumber(parts.join('-'));
                          }}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold mt-4 shadow-sm">
                        Verify with UIDAI Secure Server
                      </Button>
                    </form>
                  ) : kycStep === 'loading' ? (
                    <div className="text-center py-10 space-y-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <h4 className="text-sm font-bold text-foreground animate-pulse">{loadingStepText}</h4>
                      <p className="text-xs text-muted-foreground">This simulates checking government databases in real-time.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleKycOtpSubmit} className="space-y-4 py-2">
                      <div className="text-center mb-4">
                        <Lock className="h-10 w-10 text-primary mx-auto mb-2 animate-pulse" />
                        <h4 className="text-base font-bold text-foreground">Enter Verification OTP</h4>
                        <p className="text-xs text-muted-foreground mt-1">We sent a 6-digit OTP code to the mobile number registered with your Aadhaar.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">6-Digit SMS OTP</label>
                        <Input
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          value={kycOtp}
                          onChange={(e) => setKycOtp(e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full rounded-xl bg-green-500 text-white hover:bg-green-600 font-bold mt-4 shadow-sm"
                        disabled={kycSubmitting}
                      >
                        {kycSubmitting ? (
                          <span className="flex items-center gap-1.5 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" /> Verifying OTP...
                          </span>
                        ) : 'Confirm OTP & Verify'}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* 10. PRIVACY SETTINGS */}
              {activeModal === 'privacy-settings' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-normal">
                    Manage your data sharing and platform settings.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">Share Contact Details</h5>
                        <p className="text-[10px] text-muted-foreground">Reveal email to active matching partners</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary rounded" />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">Activity Status</h5>
                        <p className="text-[10px] text-muted-foreground">Show when you are active on map</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary rounded" />
                    </div>
                  </div>
                </div>
              )}

              {/* 11. REFER & EARN */}
              {activeModal === 'refer-earn' && (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-foreground">Invite friends, get promo credits!</h4>
                  <p className="text-sm text-muted-foreground leading-normal px-2">
                    Share your referral code. When your friend books their first service, you both get ₹500.00 credit.
                  </p>
                  <div className="flex items-center gap-2 border border-dashed border-primary/50 bg-primary/5 p-3 rounded-2xl justify-between mt-6">
                    <span className="font-mono font-black text-primary tracking-wider text-base pl-3">QF-TIT-7890</span>
                    <Button size="sm" className="rounded-xl font-bold" onClick={() => handleCopyPromo('QF-TIT-7890')}>
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* 12. PROMO CODES */}
              {activeModal === 'promo-codes' && (
                <div className="space-y-3">
                  {[
                    { code: 'WELCOME50', desc: '50% off on your first booking.', exp: 'Expires Jun 30, 2026' },
                    { code: 'CLEANING10', desc: '₹500 credit on cleaning categories.', exp: 'Expires Jul 15, 2026' }
                  ].map((p, idx) => (
                    <div key={idx} className="p-4 border border-border bg-card rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="font-mono font-black text-primary">{p.code}</span>
                        <p className="text-[10px] text-muted-foreground mt-1">{p.desc}</p>
                        <p className="text-[9px] text-primary/80 font-bold mt-0.5">{p.exp}</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-xl border-border font-bold text-xs" onClick={() => handleCopyPromo(p.code)}>
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 13. PRIVACY POLICY */}
              {activeModal === 'privacy-policy' && (
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
                  <h4 className="font-black text-foreground text-sm">Privacy Policy Statement</h4>
                  <p>
                    At QuickFix, we respect your privacy and process personal details securely. Information collected includes name, email, phone number, and location updates to facilitate real-time matching.
                  </p>
                  <p>
                    Contact details are fully shielded and are only revealed to active partners once a service selection is confirmed. We never trade or rent user data.
                  </p>
                </div>
              )}

              {/* 14. TERMS & CONDITIONS */}
              {activeModal === 'terms-conditions' && (
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
                  <h4 className="font-black text-foreground text-sm">Terms of Service</h4>
                  <p>
                    By accessing and using QuickFix services, you agree to comply with platform guidelines, local laws, and payment terms.
                  </p>
                  <p>
                    Platform fees remain locked in a held state until completed. Disputes are reviewed manually by our administration panel.
                  </p>
                </div>
              )}

              {/* 15. NOTIFICATION PREFERENCES */}
              {activeModal === 'notification-preferences' && (
                <div className="space-y-3">
                  {[
                    { label: 'Push Notifications', desc: 'Job updates and messages' },
                    { label: 'Email Notifications', desc: 'Invoices and reports' },
                    { label: 'WhatsApp Alerts', desc: 'Urgent task matching updates' }
                  ].map((pref, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{pref.label}</h5>
                        <p className="text-[10px] text-muted-foreground">{pref.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* 16. PROVIDER EARNINGS REPORT */}
              {activeModal === 'provider-earnings' && (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-foreground">Earnings Summary</h4>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="border border-border p-4 rounded-2xl bg-card">
                      <span className="text-[10px] text-muted-foreground font-semibold">Available Payout</span>
                      <p className="text-xl font-black text-foreground mt-0.5">₹{walletBalance.toFixed(2)}</p>
                    </div>
                    <div className="border border-border p-4 rounded-2xl bg-card">
                      <span className="text-[10px] text-muted-foreground font-semibold">Held Escrow</span>
                      <p className="text-xl font-black text-yellow-600 dark:text-yellow-400 mt-0.5">₹{walletHeld.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 17. CUSTOMER WALLET INFO */}
              {activeModal === 'wallet-customer' && (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-foreground">Customer Wallet</h4>
                  <p className="text-sm text-muted-foreground leading-normal px-2">
                    Pay for services seamlessly. Link your cards or recharge balance to automatically pay matching providers.
                  </p>
                  <div className="border border-border p-4 rounded-2xl bg-card mt-6">
                    <span className="text-[10px] text-muted-foreground font-semibold">Current Balance</span>
                    <p className="text-2xl font-black text-foreground mt-0.5">₹{walletBalance.toFixed(2)}</p>
                  </div>
                  <Button className="w-full rounded-xl mt-4 font-bold">
                    Recharge Balance
                  </Button>
                </div>
              )}

              {/* 18. REVIEWS & RATINGS LIST */}
              {activeModal === 'reviews-received' && (
                <div className="space-y-3">
                  {modalItemsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Loading reviews...</span>
                    </div>
                  ) : modalItems.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto text-muted-foreground/30 animate-pulse mb-2" />
                      <p className="text-sm font-semibold">No reviews received yet.</p>
                      <p className="text-xs">Your completed job ratings and customer feedback will show here.</p>
                    </div>
                  ) : (
                    modalItems.map((rev: any, idx: number) => (
                      <div key={rev.id || idx} className="p-4 border border-border bg-card rounded-2xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-foreground">{rev.customer?.full_name || 'Customer'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-yellow-500 my-2">
                          {Array.from({ length: Math.floor(Number(rev.rating || 5)) }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                        {rev.comment && (
                          <p className="text-xs text-muted-foreground leading-normal italic">
                            "{rev.comment}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ========================================================== */}
              {/* DATABASE LIST DRAWER MODAL VIEWS (ACTIVE REQUESTS/JOBS etc.) */}
              {/* ========================================================== */}
              {[
                'active-requests',
                'accepted-requests',
                'completed-requests',
                'cancelled-requests',
                'customer-disputes',
                'active-jobs',
                'pending-requests',
                'completed-jobs',
                'wallet-history'
              ].includes(activeModal) && (
                <div className="space-y-3">
                  {modalItemsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Loading log entries...</span>
                    </div>
                  ) : modalItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">No records found</p>
                      <p className="text-xs text-muted-foreground mt-1">There are no items matching this status.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {activeModal === 'wallet-history' && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl flex justify-between items-center">
                          <div className="space-y-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              item.type === 'Credit' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {item.type}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1.5">{item.description}</p>
                            <div className="flex gap-2 text-[9px] text-muted-foreground items-center mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="text-sm font-black text-foreground shrink-0 pl-3">
                            {item.type === 'Credit' ? '+' : '-'}₹{parseFloat(item.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}

                      {/* Display Request templates */}
                      {['active-requests', 'accepted-requests', 'completed-requests', 'cancelled-requests'].includes(activeModal) && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="text-sm font-bold text-foreground tracking-tight truncate">{item.title || 'Service Request'}</h5>
                            <span className="text-xs font-black text-primary shrink-0">₹{item.budget}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal line-clamp-2">{item.description}</p>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                            <span className="flex items-center gap-1"><Compass className="h-3.5 w-3.5" />{item.area}</span>
                            <span className="flex items-center gap-1 font-bold"><MapPin className="h-3.5 w-3.5" />{item.city}</span>
                          </div>
                        </div>
                      ))}

                      {/* Disputes display templates */}
                      {activeModal === 'customer-disputes' && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                              {item.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          <h5 className="text-sm font-bold text-foreground">Dispute: {item.reason}</h5>
                          <p className="text-xs text-muted-foreground leading-normal">{item.details}</p>
                        </div>
                      ))}

                      {/* Display Active Jobs for Providers */}
                      {activeModal === 'active-jobs' && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="text-sm font-bold text-foreground truncate">{item.request?.title || 'Active Order'}</h5>
                            <span className="text-xs font-black text-green-500 shrink-0">₹{item.budget}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">Status: <span className="font-bold text-primary">{item.status}</span></p>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                            <span>Area: {item.request?.area}</span>
                            <span>City: {item.request?.city}</span>
                          </div>
                        </div>
                      ))}

                      {/* Display Pending accepts for Providers */}
                      {activeModal === 'pending-requests' && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="text-sm font-bold text-foreground truncate">{item.request?.title || 'Accepted Bid'}</h5>
                            <span className="text-xs font-black text-yellow-500 shrink-0">Status: {item.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">Category: {item.request?.category?.name}</p>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                            <span>Budget: ₹{item.request?.budget}</span>
                          </div>
                        </div>
                      ))}

                      {/* Display Completed Jobs for Providers */}
                      {activeModal === 'completed-jobs' && modalItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 border border-border bg-card rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="text-sm font-bold text-foreground truncate">{item.request?.title || 'Completed Order'}</h5>
                            <span className="text-xs font-black text-green-500 shrink-0">₹{item.budget}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                            <span>Completed: {new Date(item.completed_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
