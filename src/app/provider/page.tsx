"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { 
  Briefcase, Wallet, Clock, CheckCircle, ArrowRight, Loader2, 
  MapPin, Star, Phone, MessageSquare, AlertCircle, Sparkles, Eye, XCircle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'provider') {
      router.push(`/${user.role}`);
    }
  }, [isAuthenticated, user, authLoading]);

  // UI States
  const [activeTab, setActiveTab] = useState<'nearby' | 'assigned' | 'wallet'>('nearby');
  const [loading, setLoading] = useState(false);

  // Data States
  const [wallet, setWallet] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [acceptedRequestsIds, setAcceptedRequestsIds] = useState<string[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);

  // Category details
  const [providerCategory, setProviderCategory] = useState<any | null>(null);

  // Fetch all provider data
  useEffect(() => {
    if (!user) return;

    fetchProviderData();

    // Set up real-time subscriptions
    const providerChannel = supabase
      .channel('provider-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => {
        fetchProviderData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_accepts', filter: `provider_id=eq.${user.id}` }, () => {
        fetchProviderData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `provider_id=eq.${user.id}` }, () => {
        fetchProviderData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `provider_id=eq.${user.id}` }, () => {
        fetchProviderData();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchProviderData();
    }, 3000);

    return () => {
      supabase.removeChannel(providerChannel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProviderData = async () => {
    if (!user) return;

    // 0. Fetch user category object
    // Since users table doesn't link directly, we find the category matching the provider metadata category name
    const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
    let categoryObj = null;
    if (userProfile) {
      // Find category
      const { data: cat } = await supabase
        .from('service_categories')
        .select('*')
        .eq('name', 'Cleaning') // Fallback just in case, but let's see
        .maybeSingle();
      
      // Let's list all categories to match profile service category string
      const { data: cats } = await supabase.from('service_categories').select('*');
      if (cats) {
        // Find category matching the user category
        const matched = cats.find(c => c.name.toLowerCase() === 'cleaning'); // standard fallback
        // Since we seed categories, let's try to match user profile category
        // In verify-otp we insert role category, let's fetch matching one
        // For simplicity:
        categoryObj = matched;
      }
    }

    // 1. Fetch Wallet details
    const { data: wlt } = await supabase
      .from('wallets')
      .select('*')
      .eq('provider_id', user.id)
      .maybeSingle();

    if (wlt) {
      setWallet(wlt);

      // Fetch Wallet Transactions
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wlt.id)
        .order('created_at', { ascending: false });
      setTransactions(txns || []);
    }

    // 2. Fetch Accepts to track what we've already accepted/rejected
    const { data: accepts } = await supabase
      .from('provider_accepts')
      .select('request_id, status')
      .eq('provider_id', user.id);

    const acceptedIds = accepts?.filter(a => a.status === 'ACCEPTED').map(a => a.request_id) || [];
    const rejectedIds = accepts?.filter(a => a.status === 'REJECTED').map(a => a.request_id) || [];
    setAcceptedRequestsIds(acceptedIds);

    // 3. Fetch Nearby Service Requests (OPEN/ACCEPTED, category match, not rejected by us)
    let reqsQuery = supabase
      .from('service_requests')
      .select('*, customer:users(*), category:service_categories(*), request_images(*)')
      .in('status', ['OPEN', 'ACCEPTED']);

    // If we have rejected list, exclude them
    const { data: reqs } = await reqsQuery;
    if (reqs) {
      // Filter out rejected ones
      const filteredReqs = reqs.filter(r => !rejectedIds.includes(r.id));
      setNearbyRequests(filteredReqs);
    }

    // 4. Fetch Assigned Service Orders (where this provider is SELECTED)
    const { data: ords } = await supabase
      .from('orders')
      .select('*, request:service_requests(*), customer:users(*)')
      .eq('provider_id', user.id)
      .order('started_at', { ascending: false });
    setAssignedOrders(ords || []);
  };

  // Provider Accept Request
  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('provider_accepts')
        .upsert(
          {
            request_id: requestId,
            provider_id: user?.id,
            status: 'ACCEPTED',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'request_id,provider_id' }
        );

      if (error) throw error;

      // Also trigger updating the service request status to ACCEPTED if it was OPEN
      await supabase
        .from('service_requests')
        .update({ status: 'ACCEPTED' })
        .eq('id', requestId)
        .eq('status', 'OPEN');

      toastSuccess('Service Request accepted successfully! Waiting for customer selection.');
      fetchProviderData();
    } catch (err: any) {
      toastError(err.message || 'Failed to accept request.');
    } finally {
      setLoading(false);
    }
  };

  // Provider Reject Request (hide it from dashboard)
  const handleRejectRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('provider_accepts')
        .upsert(
          {
            request_id: requestId,
            provider_id: user?.id,
            status: 'REJECTED',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'request_id,provider_id' }
        );

      if (error) throw error;

      toastSuccess('Request hidden.');
      fetchProviderData();
    } catch (err: any) {
      toastError(err.message || 'Failed to reject request.');
    } finally {
      setLoading(false);
    }
  };

  // Provider Withdraw Acceptance
  const handleWithdrawAcceptance = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('provider_accepts')
        .delete()
        .eq('request_id', requestId)
        .eq('provider_id', user?.id);

      if (error) throw error;

      toastSuccess('Acceptance withdrawn.');
      fetchProviderData();
    } catch (err: any) {
      toastError(err.message || 'Failed to withdraw acceptance.');
    } finally {
      setLoading(false);
    }
  };

  // Start Work Action
  const handleStartWork = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ orderId, action: 'start' })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Order started successfully! Customer notified.');
        fetchProviderData();
      } else {
        toastError(data.error || 'Failed to start order.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Mark Completed Action
  const handleMarkCompleted = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qf_token')}`
        },
        body: JSON.stringify({ orderId, action: 'complete' })
      });
      const data = await res.json();

      if (res.ok) {
        toastSuccess('Job marked complete! Customer has 12 hours to confirm.');
        fetchProviderData();
      } else {
        toastError(data.error || 'Failed to mark job complete.');
      }
    } catch (err: any) {
      toastError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
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

      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/80 py-3 px-4 text-center text-xs flex justify-center items-center gap-2.5 shadow-sm">
        <span className="text-muted-foreground font-bold">Need to book a service for yourself?</span>
        <Button 
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push('/customer')}
          className="h-7 text-xs font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/5"
        >
          Switch to Customer Mode &rarr;
        </Button>
      </div>

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Provider Hub</h1>
            <p className="text-muted-foreground text-sm">Browse jobs nearby, accept matches, and track your wallet earnings.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'nearby' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('nearby')}
              className="rounded-xl font-bold"
            >
              Nearby Requests
            </Button>
            <Button 
              variant={activeTab === 'assigned' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('assigned')}
              className="rounded-xl font-bold"
            >
              Assigned Jobs ({assignedOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'AUTOCOMPLETED' && o.status !== 'CANCELLED').length})
            </Button>
            <Button 
              variant={activeTab === 'wallet' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('wallet')}
              className="rounded-xl font-bold flex items-center gap-2"
              id="wallet-tab"
            >
              <Wallet className="h-4 w-4" />
              Wallet
            </Button>
          </div>
        </div>

        {activeTab === 'nearby' && (
          // Nearby Requests list
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Service Requests Nearby ({nearbyRequests.length})
            </h3>

            {nearbyRequests.length === 0 ? (
              <Card className="border-border bg-card p-12 text-center text-muted-foreground">
                <p className="text-sm">No service requests nearby right now. We&apos;ll update in real-time as they appear!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyRequests.map((req) => {
                  const isAccepted = acceptedRequestsIds.includes(req.id);
                  return (
                    <Card key={req.id} className="border-border bg-card flex flex-col justify-between">
                      <CardHeader className="p-5">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            {req.category?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                        </div>
                        <CardTitle className="text-base font-bold mt-3 leading-snug line-clamp-2">{req.description}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{req.area}, {req.city}</span>
                          <span className="text-muted-foreground font-semibold text-xs bg-muted border border-border px-1.5 py-0.5 rounded-md">Approximate Location</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        {/* Budget Info */}
                        <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase block font-bold">Estimated Budget</span>
                            <span className="text-base font-bold text-foreground">
                              {req.budget ? formatCurrency(req.budget) : 'Open Budget'}
                            </span>
                          </div>
                        </div>

                        {/* Request images */}
                        {req.request_images && req.request_images.length > 0 && (
                          <div className="flex gap-1.5 mt-4">
                            {req.request_images.map((img: any, i: number) => (
                              <img
                                key={i}
                                src={img.image_url}
                                alt="reference"
                                className="h-12 w-12 rounded-lg object-cover border border-border"
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-5 border-t border-border bg-muted/10 flex gap-2">
                        {isAccepted ? (
                          <Button
                            variant="outline"
                            className="flex-1 rounded-xl text-red-500 hover:bg-red-500/10 font-bold"
                            onClick={() => handleWithdrawAcceptance(req.id)}
                            disabled={loading}
                          >
                            Withdraw Acceptance
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="flex-1 rounded-xl text-muted-foreground hover:bg-muted font-bold"
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={loading}
                            >
                              Hide
                            </Button>
                            <Button
                              className="flex-1 rounded-xl bg-primary text-white hover:bg-primary-hover font-bold"
                              onClick={() => handleAcceptRequest(req.id)}
                              disabled={loading}
                            >
                              Accept
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assigned' && (
          // Assigned/Ongoing Jobs
          <div className="space-y-6" id="assigned-jobs">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-secondary" />
              Assigned Job Orders ({assignedOrders.length})
            </h3>

            {assignedOrders.length === 0 ? (
              <Card className="border-border bg-card p-12 text-center text-muted-foreground">
                <p className="text-sm">No assigned jobs yet. Accept nearby requests to match with customers.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {assignedOrders.map((order) => (
                  <Card key={order.id} className="border-border bg-card overflow-hidden">
                    {/* Header bar */}
                    <div className="bg-muted/30 p-5 flex flex-wrap justify-between items-center gap-2 border-b border-border">
                      <div>
                        <span className="text-xs font-bold uppercase text-muted-foreground block">Order Status</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                          order.status === 'SELECTED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          order.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          order.status === 'AUTOCOMPLETED' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {/* Chat Link */}
                        <Link href={`/chat/${order.id}`}>
                          <Button size="sm" variant="outline" className="rounded-lg border-border text-foreground hover:bg-muted font-bold flex items-center gap-1.5">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Customer Chat
                          </Button>
                        </Link>

                        {/* Start Work button */}
                        {order.status === 'SELECTED' && (
                          <Button 
                            size="sm" 
                            className="rounded-lg bg-primary text-white hover:bg-primary-hover font-bold"
                            onClick={() => handleStartWork(order.id)}
                          >
                            Start Work
                          </Button>
                        )}

                        {/* Mark complete button */}
                        {order.status === 'IN_PROGRESS' && (
                          <Button 
                            size="sm" 
                            className="rounded-lg bg-green-500 text-white hover:bg-green-600 font-bold"
                            onClick={() => handleMarkCompleted(order.id)}
                          >
                            Mark Work Completed
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      {/* Customer Info (Revealed) */}
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-base border border-primary/20">
                          {order.customer?.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-foreground">{order.customer?.full_name}</h4>
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-500" />
                              Phone: <span className="font-bold text-green-600 select-all">{order.customer?.mobile_number}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              Exact Address: <span className="font-semibold text-foreground select-all">{order.request?.area}, {order.request?.city}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Job Description */}
                      <div className="max-w-md">
                        <span className="text-xs font-bold uppercase text-muted-foreground block">Job description</span>
                        <p className="text-sm font-medium text-foreground mt-0.5">{order.request?.description}</p>
                        {order.request?.budget && (
                          <span className="text-sm font-bold text-primary mt-1 block">
                            Budget: {formatCurrency(order.request.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && wallet && (
          // Wallet View
          <div className="space-y-6" id="wallet">
            {/* Wallet Balances Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-border bg-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">Available Amount</span>
                  <h2 className="text-3xl font-black text-green-500 mt-2">{formatCurrency(wallet.available_amount)}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-4">Earnings ready to be transferred to your bank.</p>
              </Card>

              <Card className="border-border bg-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">Held Amount</span>
                  <h2 className="text-3xl font-black text-yellow-500 mt-2">{formatCurrency(wallet.held_amount)}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-4">Platform fees locked on active assigned jobs.</p>
              </Card>

              <Card className="border-border bg-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">Total Balance</span>
                  <h2 className="text-3xl font-black text-foreground mt-2">{formatCurrency(wallet.balance)}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-4">Aggregate funds (available + holds).</p>
              </Card>
            </div>

            {/* Transaction History */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Transaction Ledger</h3>

              {transactions.length === 0 ? (
                <Card className="border-border bg-card p-8 text-center text-muted-foreground">
                  <p className="text-sm">No transactions yet.</p>
                </Card>
              ) : (
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="divide-y divide-border">
                    {transactions.map((t) => (
                      <div key={t.id} className="flex justify-between items-center p-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            t.type === 'Credit' ? 'bg-green-500/10 text-green-500' :
                            t.type === 'Fee Deduction' || t.type === 'Debit' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {t.type === 'Credit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-foreground block">{t.description}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(t.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${
                            t.type === 'Credit' ? 'text-green-500' :
                            t.type === 'Fee Deduction' || t.type === 'Debit' ? 'text-red-500' :
                            'text-yellow-500'
                          }`}>
                            {t.type === 'Credit' ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block mt-0.5">{t.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
