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
  MapPin, Plus, Trash, Image as ImageIcon, Loader2, Star, Check, Phone, MessageSquare, AlertTriangle, ShieldAlert, History
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'customer') {
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

  // Data states
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);

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

  const fetchCustomerData = async () => {
    if (!user) return;
    
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

    // 3. Fetch Completed Orders (COMPLETED, AUTOCOMPLETED, CANCELLED)
    const { data: compOrds } = await supabase
      .from('orders')
      .select('*, request:service_requests(*), provider:users(*)')
      .eq('customer_id', user.id)
      .in('status', ['COMPLETED', 'AUTOCOMPLETED', 'CANCELLED'])
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
        // Mock reverse geocoding for speed, but fully visual and operational
        setArea(`Sector 5 (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setCity('San Francisco');
        setFetchingLocation(false);
        toastSuccess('Location coordinates prefilled!');
      },
      (error) => {
        console.error(error);
        setArea('Tech District');
        setCity('San Francisco');
        setFetchingLocation(false);
        toastError('Location access denied. Manual entry loaded.');
      }
    );
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
      // 1. Insert Request record
      const { data: request, error: reqError } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user?.id,
          category_id: selectedCategory,
          description,
          area,
          city,
          budget: budget ? parseFloat(budget) : null,
          status: 'OPEN',
        })
        .select('*')
        .single();

      if (reqError) throw reqError;

      // 2. Upload images to Supabase Storage if selected
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${request.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('request-images')
            .upload(filePath, file);

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
  const handleConfirmCompletion = async (orderId: string) => {
    if (!confirm('Are you sure the provider has completed this work satisfactorily? This will release their payment.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ orderId, action: 'confirm' })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Order completed and funds released successfully!');
        fetchCustomerData();
      } else {
        toastError(data.error || 'Failed to confirm order completion.');
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

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Hello, {user.fullName}</h1>
            <p className="text-muted-foreground text-sm">Need help at home? Hire matching helpers instantly.</p>
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
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
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
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Area / Street"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          required
                        />
                        <Input
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget (USD, Optional)</label>
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
                            <Button
                              size="sm"
                              className="rounded-lg font-bold bg-primary text-white"
                              onClick={() => {
                                setSelectedRequest(req);
                                fetchAcceptancesForRequest(req.id);
                              }}
                            >
                              View Accepts ({req.acceptsCount})
                            </Button>
                          </div>
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
                    <p className="text-sm">No active orders. Select an accepted provider from your requests above.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <Card key={order.id} className="border-border bg-card overflow-hidden">
                        {/* Header details */}
                        <div className="bg-muted/30 p-5 flex flex-wrap justify-between items-center gap-2 border-b border-border">
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
                          <div className="flex gap-2">
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
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span>{order.provider?.role === 'provider' ? 'Professional' : 'Partner'}</span>
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
                      </Card>
                    ))}
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
                        {order.provider?.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{order.provider?.full_name}</h4>
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

      <BottomNav />
    </div>
  );
}
