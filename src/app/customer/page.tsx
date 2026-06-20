"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Sparkles, Wrench, Zap, Cpu, Paintbrush, Bug, 
  MapPin, Plus, Trash, Image as ImageIcon, Loader2, Star, Check, Phone, MessageSquare, AlertTriangle, ShieldAlert, History,
  Home, Briefcase, ArrowLeft, Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LeafletMap } from '@/components/ui/LeafletMap';

// Client-side image resizer and compressor to enable instant uploads
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800; // Limit size to 800px max
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7); // 70% quality compression
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

interface Category {
  id: string;
  name: string;
  icon: string;
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
  return null;
}

// Haversine formula to calculate distance in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

// Live tracking simulator component
function LiveTrackingSimulator({ order }: { order: any }) {
  // Provider's real location (fetched from DB)
  const currentLat = order.provider?.latitude || 23.0240;
  const currentLng = order.provider?.longitude || 72.5720;
  
  // Target location is the customer's request location
  const destLat = order.request?.latitude || 23.0225;
  const destLng = order.request?.longitude || 72.5714;

  const distance = getDistanceKm(currentLat, currentLng, destLat, destLng);
  // Estimate ETA at 30km/h (2 minutes per km)
  const etaMin = distance > 0.05 ? Math.max(1, Math.round(distance * 2)) : 0;
  const etaText = etaMin > 0 ? `${etaMin} mins away from you (${distance.toFixed(2)} km)` : 'Arrived at destination';
  
  return (
    <div className="space-y-4">
      {/* Map Header / Live Route Map */}
      <div className="relative mt-2">
        <LeafletMap
          providerLat={currentLat}
          providerLng={currentLng}
          customerLat={destLat}
          customerLng={destLng}
          orderId={order.id}
        />
        
        {/* Floating ETA Label Overlay */}
        <div className="absolute top-4 left-4 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-md z-[999] flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {etaText}
        </div>
      </div>

      {/* QuickFix Style Order details card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm text-left">
        
        {/* Card Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <div>
            <h4 className="text-base font-black text-foreground flex items-center gap-1.5">
              <span>QuickFix Partner</span>
              <span className="bg-green-600/10 border border-green-500/20 text-green-600 text-[10px] px-1.5 py-0.5 rounded font-black">
                {order.provider?.rating ? `${order.provider.rating}★` : 'New'}
              </span>
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Category: {order.request?.category?.name || 'Service provider'}</p>
          </div>
          <span className="text-[10px] font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
            Active Booking
          </span>
        </div>

        {/* Order Items */}
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-start">
              {/* Service Icon */}
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-black text-foreground block">
                  Service Type: {order.request?.category?.name || 'Service Task'}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-semibold">
                  {order.request?.description}
                </p>
                {/* Real photo if uploaded by customer */}
                {order.request?.request_images && order.request.request_images.length > 0 && (
                  <div className="flex gap-1.5 mt-2.5">
                    {order.request.request_images.map((img: any, i: number) => (
                      <img 
                        key={i} 
                        src={img.image_url} 
                        alt="reference" 
                        className="h-14 w-14 rounded-lg object-cover border border-border cursor-zoom-in"
                        onClick={() => window.open(img.image_url, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm font-bold text-foreground">
              {order.request?.budget ? formatCurrency(order.request.budget) : 'Open Budget'}
            </span>
          </div>

          <div className="h-[1px] bg-border/50" />

          {/* Delivery progress details */}
          <div className="space-y-3.5 text-xs font-semibold text-muted-foreground">
            
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-foreground font-black block">Arrival Status</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {distance > 2.0 ? 'Partner is driving towards your location...' :
                   distance > 0.05 ? 'Partner is nearby in your street...' :
                   'Partner has arrived at destination!'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-foreground font-black block">Service Location</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {order.request?.area}, {order.request?.city}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-foreground font-black block">Partner Details</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5 select-all">
                  Name: {order.provider?.full_name} | Mobile: {order.provider?.mobile_number}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <svg className="h-4 w-4 text-purple-500 shrink-0 mt-0.5 fill-current" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <div>
                <span className="text-foreground font-black block">Service Pricing Breakdown</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Total Budget: {order.request?.budget ? formatCurrency(order.request.budget) : 'Open Budget'} (Service Fee + Platform Charges Included)
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'customer' && user.role !== 'provider') {
      router.push(`/${user.role}`);
    }
  }, [isAuthenticated, user, authLoading]);

  // UI / Action states
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [loading, setLoading] = useState(false);

  // Create Request form states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Saved Addresses states
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');
  const [addressManagerOpen, setAddressManagerOpen] = useState(false);
  
  // Create Request Address Details states
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [reqLatitude, setReqLatitude] = useState<number | null>(null);
  const [reqLongitude, setReqLongitude] = useState<number | null>(null);

  // Automatically query user geolocation on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setReqLatitude(latitude);
          setReqLongitude(longitude);
          
          // Silently update user record in database
          if (user) {
            await supabase
              .from('users')
              .update({
                latitude,
                longitude
              })
              .eq('id', user.id);
          }
        },
        (err) => {
          console.warn('Auto-geolocation denied/failed.', err);
        }
      );
    }
  }, [user]);

  // Address Manager Add Form states
  const [mgrLabel, setMgrLabel] = useState('Home');
  const [mgrArea, setMgrArea] = useState('');
  const [mgrCity, setMgrCity] = useState('');
  const [mgrFlatNo, setMgrFlatNo] = useState('');
  const [mgrLandmark, setMgrLandmark] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  // Data states
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  
  // Feedback Modal states
  const [ratingOrder, setRatingOrder] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  
  // Dynamic tick for timers
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Selection Detail Dialog states
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [loadingAcceptances, setLoadingAcceptances] = useState(false);

  // Dispute Dialog states
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Load Categories & Realtime Data
  useEffect(() => {
    if (!user) return;
    
    // Fetch categories
    const fetchCategories = async () => {
      const { data } = await supabase.from('service_categories').select('*');
      if (data) {
        setCategories(data);
        if (data.length > 0) setSelectedCategory(data[0].id);
      }
    };
    fetchCategories();

    // Fetch customer requests & orders
    fetchCustomerData();

    // Realtime channel subscriptions
    const requestsChannel = supabase
      .channel('customer-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `customer_id=eq.${user.id}` }, () => {
        fetchCustomerData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_accepts' }, () => {
        // Refresh acceptances if modal is open
        if (selectedRequest) {
          fetchAcceptancesForRequest(selectedRequest.id);
        }
        fetchCustomerData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => {
        fetchCustomerData();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchCustomerData();
    }, 3000);

    return () => {
      supabase.removeChannel(requestsChannel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedRequest]);

  // Automatically cancel service requests that have been OPEN or ACCEPTED for more than 5 minutes (300 seconds)
  useEffect(() => {
    if (!user || activeRequests.length === 0) return;

    const checkAndCancelExpired = async () => {
      const expired = activeRequests.filter(req => {
        if (req.status !== 'OPEN' && req.status !== 'ACCEPTED') return false;
        
        // Calculate elapsed seconds since creation
        const elapsed = (Date.now() - new Date(req.created_at).getTime()) / 1000;
        return elapsed > 300; // 5 minutes
      });

      if (expired.length === 0) return;

      let updatedAny = false;
      for (const req of expired) {
        try {
          const { error } = await supabase
            .from('service_requests')
            .update({ status: 'CANCELLED' })
            .eq('id', req.id);
          
          if (!error) {
            updatedAny = true;
          }
        } catch (e) {
          console.error('[QuickFix AutoCancel] Error cancelling expired request:', e);
        }
      }

      if (updatedAny) {
        toastError('Your request was cancelled automatically as no provider accepted it within 5 minutes.');
        fetchCustomerData();
      }
    };

    const interval = setInterval(checkAndCancelExpired, 3000);
    return () => clearInterval(interval);
  }, [user, activeRequests]);

  const fetchCustomerData = async () => {
    if (!user) return;
    
    // Fetch latest user profile to get saved addresses
    const { data: profile } = await supabase
      .from('users')
      .select('addresses')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.addresses) {
      setSavedAddresses(profile.addresses);
    }
    
    // 1. Fetch Service Requests (OPEN / ACCEPTED / SELECTED)
    const { data: reqs } = await supabase
      .from('service_requests')
      .select('*, category:service_categories(*), request_images(*), provider_accepts(count)')
      .eq('customer_id', user.id)
      .in('status', ['OPEN', 'ACCEPTED', 'SELECTED'])
      .order('created_at', { ascending: false });

    if (reqs) {
      // Formulate custom acceptsCount join count
      const formattedReqs = reqs.map(r => ({
        ...r,
        acceptsCount: r.provider_accepts?.[0]?.count || 0
      }));
      setActiveRequests(formattedReqs);
    }

    // 2. Fetch Active Orders
    const { data: ords } = await supabase
      .from('orders')
      .select('*, request:service_requests(*), provider:users(*)')
      .eq('customer_id', user.id)
      .in('status', ['SELECTED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'])
      .order('started_at', { ascending: false });

    if (ords) {
      setActiveOrders(ords);
    }

    // 3. Fetch Completed Orders (AUTOCOMPLETED, CANCELLED)
    const { data: compOrds } = await supabase
      .from('orders')
      .select('*, request:service_requests(*), provider:users(*)')
      .eq('customer_id', user.id)
      .in('status', ['AUTOCOMPLETED', 'CANCELLED'])
      .order('completed_at', { ascending: false });

    if (compOrds) {
      // We filter down completed orders that are finished
      setCompletedOrders(compOrds);
    }
  };

  const fetchAcceptancesForRequest = async (requestId: string) => {
    setLoadingAcceptances(true);
    const { data, error } = await supabase
      .from('provider_accepts')
      .select('*, provider:users(*)')
      .eq('request_id', requestId)
      .eq('status', 'ACCEPTED');

    if (error) {
      console.error(error);
    } else {
      setAcceptances(data || []);
    }
    setLoadingAcceptances(false);
  };

  // Location Prefiller
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toastError('Geolocation is not supported by your browser.');
      return;
    }

    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setReqLatitude(latitude);
        setReqLongitude(longitude);
        try {
          // Query OpenStreetMap Nominatim for real-time reverse geocoding based on GPS coords
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            
            // Extract a clean neighborhood/street and city/town/state
            const road = addr.road || '';
            const neighborhood = addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.subdistrict || '';
            const county = addr.county || addr.district || '';
            
            // Build a clean, natural street and area address without coordinate numbers
            const parts = [road, neighborhood, county].filter(Boolean);
            const streetAndArea = parts.length > 0 ? parts.join(', ') : 'Local Area';
            const cityName = addr.city || addr.town || addr.municipality || addr.state || 'Local City';
            
            setArea(streetAndArea);
            setCity(cityName);
            toastSuccess('Location prefilled using GPS!');
          } else {
            throw new Error('Reverse geocoding response not OK');
          }
        } catch (e) {
          console.error(e);
          setArea('Local Street, Tech District');
          setCity('Local City');
          toastSuccess('GPS coordinates loaded!');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        setArea('Tech District');
        setCity('Local City');
        setFetchingLocation(false);
        toastError('Location access denied. Manual entry loaded.');
      }
    );
  };

  // Selection handler for Saved Addresses
  const handleSelectAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'custom') {
      setArea('');
      setCity('');
      setFlatNo('');
      setLandmark('');
    } else {
      const selected = savedAddresses.find(a => a.id === addrId);
      if (selected) {
        setArea(selected.area);
        setCity(selected.city);
        setFlatNo(selected.flatNo || '');
        setLandmark(selected.landmark || '');
      }
    }
  };

  // Add Address in Manager
  const handleAddManagerAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrArea || !mgrCity) {
      toastError('Please fill in both Area and City.');
      return;
    }

    setAddingAddress(true);
    try {
      const newAddr = {
        id: `addr-${Math.random().toString(36).substring(2, 9)}`,
        label: mgrLabel,
        flatNo: mgrFlatNo,
        area: mgrArea,
        city: mgrCity,
        landmark: mgrLandmark
      };
      const updated = [...savedAddresses, newAddr];
      const { error } = await supabase.from('users').update({ addresses: updated }).eq('id', user?.id);
      
      if (error) throw error;
      setSavedAddresses(updated);
      setMgrArea('');
      setMgrCity('');
      setMgrFlatNo('');
      setMgrLandmark('');
      toastSuccess('New address saved successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save address.');
    } finally {
      setAddingAddress(false);
    }
  };

  // Delete Address in Manager
  const handleDeleteManagerAddress = async (addrId: string) => {
    if (!confirm('Are you sure you want to delete this saved address?')) return;
    try {
      const updated = savedAddresses.filter(a => a.id !== addrId);
      const { error } = await supabase.from('users').update({ addresses: updated }).eq('id', user?.id);
      
      if (error) throw error;
      setSavedAddresses(updated);
      if (selectedAddressId === addrId) {
        setSelectedAddressId('custom');
        setArea('');
        setCity('');
        setFlatNo('');
        setLandmark('');
      }
      toastSuccess('Address deleted successfully.');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete address.');
    }
  };

  // Image Upload helper
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 3) {
        toastError('You can upload up to 3 images maximum.');
        return;
      }
      setImages(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Request Submission
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !description || !area || !city) {
      toastError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // If custom address is chosen and "Save address" checkbox is checked, save it to profile
      if (selectedAddressId === 'custom' && saveNewAddress && user) {
        const newAddressObj = {
          id: `addr-${Math.random().toString(36).substring(2, 9)}`,
          label: newAddressLabel || 'Home',
          flatNo: flatNo,
          area: area,
          city: city,
          landmark: landmark,
        };
        const updatedAddresses = [...savedAddresses, newAddressObj];
        
        // Update in MongoDB
        const { error: profileUpdateError } = await supabase
          .from('users')
          .update({ addresses: updatedAddresses })
          .eq('id', user.id);

        if (!profileUpdateError) {
          setSavedAddresses(updatedAddresses);
          setSelectedAddressId(newAddressObj.id);
          setSaveNewAddress(false);
        } else {
          console.error('Error saving user address:', profileUpdateError);
        }
      }

      let combinedArea = area;
      if (flatNo) {
        combinedArea = `${flatNo}, ${combinedArea}`;
      }
      if (landmark) {
        combinedArea = `${combinedArea} (Landmark: ${landmark})`;
      }

      // 1. Insert Request record
      const { data: request, error: reqError } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user?.id,
          category_id: selectedCategory,
          description,
          area: combinedArea,
          city,
          budget: budget ? parseFloat(budget) : null,
          status: 'OPEN',
          latitude: reqLatitude || 23.0225,
          longitude: reqLongitude || 72.5714,
        })
        .select('*')
        .single();

      if (reqError) throw reqError;

      // 2. Upload images to Supabase Storage if selected
      if (images.length > 0) {
        for (const file of images) {
          // Compress the image client-side to ensure instant uploads
          const compressed = await compressImage(file);
          const fileExt = 'jpg'; // force .jpg extension since we compress to JPEG quality
          const fileName = `${request.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('request-images')
            .upload(filePath, compressed);

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('request-images')
            .getPublicUrl(filePath);

          // Save URL in database
          await supabase.from('request_images').insert({
            request_id: request.id,
            image_url: publicUrl,
          });
        }
      }

      toastSuccess('Service Request created successfully!');
      // Reset form
      setDescription('');
      setArea('');
      setCity('');
      setBudget('');
      setImages([]);
      fetchCustomerData();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  // Select Provider action
  const handleSelectProvider = async (providerId: string, requestId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/select-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ requestId, providerId })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Provider selected! Order and chat room opened.');
        setSelectedRequest(null); // Close modal
        fetchCustomerData();
      } else {
        toastError(data.error || 'Failed to select provider.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Completion
  const handleConfirmCompletion = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (order) {
      setRatingOrder(order);
      setRatingValue(5);
      setRatingComment('');
    }
  };

  // Cancel Match (within 1 minute)
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this match? The request will be reopened for other providers.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Match cancelled! Request reopened for other providers.');
        fetchCustomerData();
      } else {
        toastError(data.error || 'Failed to cancel match.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Feedback & Complete Order
  const submitFeedbackAndComplete = async (orderId: string, rating: number, comment: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ orderId, action: 'confirm', rating, comment })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Order completed, funds released, and feedback submitted successfully!');
        setRatingOrder(null);
        fetchCustomerData();
      } else {
        toastError(data.error || 'Failed to complete order.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Raise Dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason || !disputeDesc || !disputeOrder) return;

    setSubmittingDispute(true);
    try {
      // 1. Update order status to DISPUTED
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'DISPUTED' })
        .eq('id', disputeOrder.id);

      if (orderError) throw orderError;

      // Update service request status as well
      await supabase
        .from('service_requests')
        .update({ status: 'DISPUTED' })
        .eq('id', disputeOrder.request_id);

      // 2. Insert Dispute row
      const { error: disputeError } = await supabase
        .from('disputes')
        .insert({
          order_id: disputeOrder.id,
          reason: disputeReason,
          description: disputeDesc,
          status: 'PENDING'
        });

      if (disputeError) throw disputeError;

      toastSuccess('Dispute raised successfully. Wallet hold locked.');
      setDisputeOrder(null);
      setDisputeReason('');
      setDisputeDesc('');
      fetchCustomerData();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit dispute.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 sm:pb-0">
      <Navbar />

      {user.role === 'provider' && (
        <div className="bg-amber-500 text-white font-bold py-2.5 px-4 text-center text-xs flex justify-center items-center gap-2 shadow-inner">
          <span>You are currently in Customer Mode (for booking services for yourself).</span>
          <button 
            type="button"
            onClick={() => router.push('/provider')}
            className="underline hover:text-amber-100 flex items-center gap-0.5"
          >
            Back to Provider Dashboard &rarr;
          </button>
        </div>
      )}

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => router.push('/')} 
                className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-all shrink-0"
                aria-label="Go Back"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-3xl font-black text-foreground">Hello, {user.fullName}</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Need help at home? Hire matching helpers instantly.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'dashboard' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('dashboard')}
              className="rounded-xl font-bold"
            >
              Dashboard
            </Button>
            <Button 
              variant={activeTab === 'history' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('history')}
              className="rounded-xl font-bold flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Service Request Column */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-border bg-card shadow-xs" id="create-request">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create Request
                  </CardTitle>
                  <CardDescription>Post a service request to nearby professionals.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateRequest} className="space-y-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Description</label>
                      <textarea
                        rows={3}
                        placeholder="Explain what needs to be done..."
                        className="flex w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    {/* Location Info */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Service Location</label>
                        <button 
                          type="button" 
                          onClick={() => setAddressManagerOpen(true)}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Manage Addresses
                        </button>
                      </div>
                      
                      {/* Horizontal Address Cards */}
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-border">
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleSelectAddress(addr.id)}
                              className={`flex-shrink-0 w-40 p-3 rounded-xl border text-left transition-all relative ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                  : 'border-border bg-card hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                {addr.label === 'Home' ? (
                                  <Home className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                ) : addr.label === 'Work' ? (
                                  <Briefcase className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                ) : (
                                  <MapPin className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                )}
                                <span className="text-sm font-semibold truncate text-foreground">{addr.label}</span>
                                {isSelected && (
                                  <span className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {addr.area}, {addr.city}
                              </p>
                            </button>
                          );
                        })}
                        
                        {/* Custom Address Card */}
                        <button
                          type="button"
                          onClick={() => handleSelectAddress('custom')}
                          className={`flex-shrink-0 w-40 p-3 rounded-xl border text-left transition-all relative ${
                            selectedAddressId === 'custom' 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                              : 'border-border bg-card hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Plus className={`h-4 w-4 ${selectedAddressId === 'custom' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm font-semibold text-foreground">Custom</span>
                            {selectedAddressId === 'custom' && (
                              <span className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Enter manual address or use GPS coordinates
                          </p>
                        </button>
                      </div>

                      {/* Address Fields / Info */}
                      {selectedAddressId === 'custom' ? (
                        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border mt-1 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Custom Address Details</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleGetLocation} 
                              className="h-7 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                              disabled={fetchingLocation}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              {fetchingLocation ? 'Fetching...' : 'Use GPS'}
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Flat / House No. / Building</label>
                              <Input
                                placeholder="e.g. Flat 402, Block A"
                                value={flatNo}
                                onChange={(e) => setFlatNo(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Street / Area / Locality</label>
                              <Input
                                placeholder="e.g. Shrinand Nagar, Sector 21"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Landmark (Optional)</label>
                              <Input
                                placeholder="e.g. Near Swaminarayan Temple"
                                value={landmark}
                                onChange={(e) => setLandmark(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">City</label>
                              <Input
                                placeholder="e.g. Gandhinagar"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          
                          {/* Save Address Option */}
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="saveNewAddress"
                                checked={saveNewAddress}
                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-card"
                              />
                              <label htmlFor="saveNewAddress" className="text-xs font-medium text-foreground cursor-pointer select-none">
                                Save this address for future use
                              </label>
                            </div>
                            
                            {saveNewAddress && (
                              <div className="flex items-center gap-2.5 pl-6 pt-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Label as:</span>
                                <div className="flex gap-1.5">
                                  {['Home', 'Work', 'Other'].map((lbl) => (
                                    <button
                                      key={lbl}
                                      type="button"
                                      onClick={() => setNewAddressLabel(lbl)}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                        newAddressLabel === lbl
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                          : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                                      }`}
                                    >
                                      {lbl}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl flex items-start justify-between gap-4 mt-1 shadow-sm">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                                savedAddresses.find(a => a.id === selectedAddressId)?.label === 'Home'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                                  : savedAddresses.find(a => a.id === selectedAddressId)?.label === 'Work'
                                  ? 'bg-purple-50 text-purple-600 border-purple-200'
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
                                {savedAddresses.find(a => a.id === selectedAddressId)?.label}
                              </span>
                              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Selected Location</span>
                            </div>
                            <div>
                              {savedAddresses.find(a => a.id === selectedAddressId)?.flatNo && (
                                <p className="text-sm font-bold text-foreground">
                                  {savedAddresses.find(a => a.id === selectedAddressId)?.flatNo}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-foreground/80 leading-snug">
                                {savedAddresses.find(a => a.id === selectedAddressId)?.area}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {savedAddresses.find(a => a.id === selectedAddressId)?.city}
                                {savedAddresses.find(a => a.id === selectedAddressId)?.landmark && (
                                  <span className="text-muted-foreground/70"> • Landmark: {savedAddresses.find(a => a.id === selectedAddressId)?.landmark}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAddress('custom')}
                            className="h-8 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg flex-shrink-0"
                          >
                            Change
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Budget */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget (₹, Optional)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 150"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                      />
                    </div>

                    {/* Upload Images */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Upload Reference Images (Max 3)
                      </label>
                      <div className="flex flex-wrap gap-2 items-center">
                        {images.map((file, idx) => (
                          <div key={idx} className="relative h-14 w-14 rounded-lg overflow-hidden border border-border">
                            <img
                              src={URL.createObjectURL(file)}
                              alt="reference"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg hover:bg-red-600"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                        ))}

                        {images.length < 3 && (
                          <label className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted cursor-pointer transition-all">
                            <Plus className="h-5 w-5 text-muted-foreground" />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="sr-only"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold shadow-sm" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Active Jobs & Requests Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Requests */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Active Requests ({activeRequests.length})
                </h3>

                {activeRequests.length === 0 ? (
                  <Card className="border-border bg-card p-8 text-center text-muted-foreground">
                    <p className="text-sm">No active service requests. Create one to get started!</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeRequests.map((req) => (
                      <Card key={req.id} className="border-border bg-card shadow-xs">
                        <CardHeader className="p-5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                              {req.category?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                          </div>
                          <CardTitle className="text-base font-bold mt-2 truncate">{req.description}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {req.area}, {req.city}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
                            <div>
                              <span className="text-xs text-muted-foreground block">Estimated Budget</span>
                              <span className="text-sm font-bold text-foreground">
                                {req.budget ? formatCurrency(req.budget) : 'N/A'}
                              </span>
                            </div>
                            {req.status !== 'OPEN' && req.status !== 'ACCEPTED' && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 py-1 bg-green-500/10 border border-green-500/20 px-3 rounded-full">
                                <Check className="h-3.5 w-3.5" />
                                Matched
                              </div>
                            )}
                          </div>
                          {(req.status === 'OPEN' || req.status === 'ACCEPTED') && (
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 p-2.5 rounded-xl animate-pulse w-full justify-center">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Searching for nearby providers within 1km...</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Orders */}
              <div className="space-y-4" id="orders">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-secondary" />
                  Ongoing Service Orders ({activeOrders.length})
                </h3>

                {activeOrders.length === 0 ? (
                  <Card className="border-border bg-card p-8 text-center text-muted-foreground">
                    <p className="text-sm">No active orders. Your matching providers will appear here once accepted.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map((order) => {
                      const createdAtTime = new Date(order.created_at).getTime();
                      const elapsedSec = Math.floor((Date.now() - createdAtTime) / 1000);
                      const remainingSec = Math.max(0, 60 - elapsedSec);

                      return (
                        <Card key={order.id} className="border-border bg-card overflow-hidden">
                          {/* Header details */}
                          <div className="bg-muted/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                            <div>
                              <span className="text-xs font-bold uppercase text-muted-foreground block">Order Status</span>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                                order.status === 'SELECTED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                order.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              {/* 1-Minute Cancellation */}
                              {order.status === 'SELECTED' && remainingSec > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="rounded-lg font-bold flex items-center gap-1 h-9 animate-pulse"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  Cancel Match ({remainingSec}s)
                                </Button>
                              )}

                              {/* Chat Button */}
                              <Link href={`/chat/${order.id}`}>
                                <Button size="sm" variant="outline" className="rounded-lg border-border text-foreground hover:bg-muted font-bold flex items-center gap-1.5">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  Live Chat
                                </Button>
                              </Link>

                              {/* Confirm Completion */}
                              {(order.status === 'COMPLETED' || order.status === 'IN_PROGRESS') && (
                                <Button 
                                  size="sm" 
                                  className="rounded-lg bg-green-500 text-white hover:bg-green-600 font-bold flex items-center gap-1"
                                  onClick={() => handleConfirmCompletion(order.id)}
                                >
                                  <Check className="h-4 w-4" />
                                  Confirm Completion
                                </Button>
                              )}

                              {/* Raise Dispute */}
                              {order.status !== 'DISPUTED' && order.status !== 'CANCELLED' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 font-bold flex items-center gap-1"
                                  onClick={() => setDisputeOrder(order)}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  Raise Dispute
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Order Body info */}
                          <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            {/* Provider Details (Revealed) */}
                            <div className="flex items-center gap-4">
                              <img
                                src={order.provider?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${order.provider?.full_name}`}
                                alt={order.provider?.full_name}
                                className="h-12 w-12 rounded-full border border-primary/20 object-cover"
                              />
                              <div>
                                <h4 className="text-base font-bold text-foreground">{order.provider?.full_name}</h4>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  {(() => {
                                    const badge = getProviderBadge(order.provider?.completed_orders_count || 0);
                                    if (!badge) return null;
                                    return (
                                      <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md border ${badge.color}`}>
                                        {badge.label}
                                      </span>
                                    );
                                  })()}
                                  <span className="text-border">|</span>
                                  <Phone className="h-3 w-3 text-green-500" />
                                  <span className="font-bold text-green-600 select-all">{order.provider?.mobile_number}</span>
                                </div>
                              </div>
                            </div>

                            {/* Task summary */}
                            <div className="text-left md:text-right">
                              <span className="text-xs text-muted-foreground block">Job Details</span>
                              <p className="text-sm font-semibold text-foreground line-clamp-1">{order.request?.description}</p>
                              <span className="text-xs text-muted-foreground">{order.request?.area}, {order.request?.city}</span>
                            </div>
                          </div>

                          {/* Live location tracking bar */}
                          {(order.status === 'SELECTED' || order.status === 'IN_PROGRESS') && (
                            <div className="px-5 pb-5 border-t border-border/50">
                              <LiveTrackingSimulator order={order} />
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // History tab
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Completed Jobs History ({completedOrders.length})
            </h3>

            {completedOrders.length === 0 ? (
              <Card className="border-border bg-card p-8 text-center text-muted-foreground">
                <p className="text-sm">No completed service requests found.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="border-border bg-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {(order.provider?.full_name || 'QP').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{order.provider?.full_name}</h4>
                          {(() => {
                            const badge = getProviderBadge(order.provider?.completed_orders_count || 0);
                            if (!badge) return null;
                            return (
                              <span className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded-md border ${badge.color}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-sm">{order.request?.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end text-left md:text-right">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 mb-1">
                        {order.status}
                      </span>
                      <span className="text-xs text-muted-foreground">Completed: {formatDate(order.completed_at || order.started_at)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Acceptances Modal Detail Dialog */}
      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Matching Providers</DialogTitle>
            <DialogDescription>
              Choose one provider to assign this job. Contact details will be unlocked.
            </DialogDescription>
          </DialogHeader>

          {loadingAcceptances ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : acceptances.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              Waiting for nearby providers to accept...
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto my-2">
              {acceptances.map((acc) => (
                <div key={acc.id} className="flex justify-between items-center p-3.5 border border-border bg-background rounded-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={acc.provider?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${acc.provider?.full_name}`}
                      alt={acc.provider?.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{acc.provider?.full_name}</h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span>4.8 Rating</span>
                        <span className="text-border">•</span>
                        <span>4+ yrs exp</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-lg bg-primary text-white hover:bg-primary-hover font-bold"
                    onClick={() => handleSelectProvider(acc.provider_id, acc.request_id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise Dispute Dialog */}
      <Dialog open={disputeOrder !== null} onOpenChange={(open) => !open && setDisputeOrder(null)}>
        <DialogContent className="max-w-md border-border bg-card p-6">
          <form onSubmit={handleRaiseDispute} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-5 w-5" />
                Raise Order Dispute
              </DialogTitle>
              <DialogDescription>
                This locks the wallet payments until administrators resolve the dispute manually.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Reason selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Reason</label>
                <select
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="Poor Quality">Poor quality work</option>
                  <option value="Incomplete Work">Unfinished/incomplete work</option>
                  <option value="Provider Absent">Provider did not show up</option>
                  <option value="Overcharged">Pricing/budget mismatch</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                <textarea
                  rows={4}
                  placeholder="Detail the issue..."
                  className="flex w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDisputeOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold" disabled={submittingDispute}>
                {submittingDispute ? 'Submitting...' : 'File Dispute'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Address Manager Dialog */}
      <Dialog open={addressManagerOpen} onOpenChange={setAddressManagerOpen}>
        <DialogContent className="max-w-md border-border bg-card p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Saved Addresses
            </DialogTitle>
            <DialogDescription>
              Manage and select your saved service locations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-2">
            {/* List of current addresses */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Saved Locations</span>
              {savedAddresses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No saved addresses found. Add a new location below!
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className="flex justify-between items-start p-4 border border-border bg-background rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                      <div className="space-y-1.5 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${
                            addr.label === 'Home'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : addr.label === 'Work'
                              ? 'bg-purple-50 text-purple-600 border-purple-200'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {addr.label}
                          </span>
                          {addr.label === 'Home' ? (
                            <Home className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : addr.label === 'Work' ? (
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          {addr.flatNo && <p className="text-sm font-bold text-foreground leading-snug">{addr.flatNo}</p>}
                          <p className="text-xs font-semibold text-muted-foreground truncate leading-relaxed">{addr.area}</p>
                          <p className="text-[11px] text-muted-foreground/80 leading-normal">
                            {addr.city}
                            {addr.landmark && <span className="text-muted-foreground/60"> • Landmark: {addr.landmark}</span>}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        onClick={() => handleDeleteManagerAddress(addr.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add address form */}
            <form onSubmit={handleAddManagerAddress} className="space-y-4 pt-4 border-t border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Add New Location</span>
              
              {/* Label as pills */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Label Address As</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setMgrLabel(lbl)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                        mgrLabel === lbl
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                          : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Flat / House No. / Building</label>
                  <Input
                    placeholder="e.g. Flat 402, Block A"
                    value={mgrFlatNo}
                    onChange={(e) => setMgrFlatNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Street / Area / Locality</label>
                  <Input
                    placeholder="e.g. Shrinand Nagar, Sector 21"
                    value={mgrArea}
                    onChange={(e) => setMgrArea(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Landmark (Optional)</label>
                  <Input
                    placeholder="e.g. Near Swaminarayan Temple"
                    value={mgrLandmark}
                    onChange={(e) => setMgrLandmark(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">City</label>
                  <Input
                    placeholder="e.g. Gandhinagar"
                    value={mgrCity}
                    onChange={(e) => setMgrCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold text-sm h-10 mt-2 shadow-sm"
                disabled={addingAddress}
              >
                {addingAddress ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : 'Save New Address'}
              </Button>
            </form>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="rounded-xl w-full" onClick={() => setAddressManagerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Rating / Feedback Modal */}
      <Dialog open={ratingOrder !== null} onOpenChange={(open) => !open && setRatingOrder(null)}>
        <DialogContent className="max-w-md border-border bg-card p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current animate-bounce" />
              Rate Your Experience
            </DialogTitle>
            <DialogDescription>
              Please rate the service provided by <span className="font-bold text-foreground">{ratingOrder?.provider?.full_name}</span>. Your feedback helps maintain high standards!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Star Rating Selectors */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Rating</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => {
                  const active = val <= ratingValue;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingValue(val)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star className={`h-9 w-9 ${active ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-foreground mt-1">
                {ratingValue === 5 ? 'Excellent Work! 🔥' :
                 ratingValue === 4 ? 'Very Good! 👍' :
                 ratingValue === 3 ? 'Satisfactory. OK.' :
                 ratingValue === 2 ? 'Needs Improvement.' :
                 'Very Unsatisfactory. 😡'}
              </span>
            </div>

            {/* Comment Area */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground block">Review Comment</label>
              <textarea
                rows={3}
                placeholder="Share your experience with this provider..."
                className="flex w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl w-full sm:w-auto"
              onClick={() => setRatingOrder(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl w-full sm:w-auto bg-green-500 text-white hover:bg-green-600 font-bold"
              onClick={() => {
                if (ratingOrder) {
                  submitFeedbackAndComplete(ratingOrder.id, ratingValue, ratingComment);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </span>
              ) : 'Submit & Release Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
