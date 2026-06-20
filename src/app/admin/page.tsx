"use client";

import React, { useEffect, useState } from 'react';
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
  ShieldAlert, Users, Wrench, DollarSign, AlertTriangle, Loader2, 
  Trash, Plus, Check, Ban, CheckCircle2, Sparkles, Search, Layers, RefreshCw, ArrowLeft, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminPanel() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'admin') {
      router.push(`/${user.role}`);
    }
  }, [isAuthenticated, user, authLoading]);

  // UI States
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'users' | 'disputes' | 'categories'>('stats');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // Analytics Metrics States
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalProviders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    pendingDisputes: 0,
  });

  // Data Lists
  const [usersList, setUsersList] = useState<any[]>([]);
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Category Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Wrench');

  // Dispute Resolution Dialog State
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  // Fetch admin dashboard details
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users lists
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      const usersArray = allUsers || [];
      const customersCount = usersArray.filter(u => u.role === 'customer').length;
      const providersCount = usersArray.filter(u => u.role === 'provider').length;
      setUsersList(usersArray);

      // 2. Fetch Active orders count
      const { count: ordsCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['SELECTED', 'IN_PROGRESS', 'DISPUTED']);

      // 3. Fetch Disputes
      const { data: disputes } = await supabase
        .from('disputes')
        .select('*, order:orders(*, request:service_requests(*), customer:users(*), provider:users(*))')
        .order('created_at', { ascending: false });
      
      const disputesArray = disputes || [];
      const pendingDisputesCount = disputesArray.filter(d => d.status === 'PENDING').length;
      setDisputesList(disputesArray);

      // 4. Fetch Revenue (sum of all platform fees in transactions)
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'Fee Deduction');
      
      const totalRev = txns?.reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;

      // Set metrics
      setMetrics({
        totalUsers: customersCount,
        totalProviders: providersCount,
        activeOrders: ordsCount || 0,
        totalRevenue: totalRev,
        pendingDisputes: pendingDisputesCount,
      });

      // 5. Fetch Categories
      const { data: cats } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      setCategoriesList(cats || []);

      // 6. Fetch All Service Requests & Orders for User Detail View
      const { data: allReqs } = await supabase
        .from('service_requests')
        .select('*, customer:users(*), category:service_categories(*), request_images(*)');
      setAllRequests(allReqs || []);

      const { data: allOrds } = await supabase
        .from('orders')
        .select('*, request:service_requests(*), customer:users(*), provider:users(*)');
      setAllOrders(allOrds || []);

    } catch (err: any) {
      toastError('Error pulling administrative statistics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Suspend / Unsuspend user account
  const handleToggleSuspension = async (targetUser: any) => {
    const nextStatus = !targetUser.is_suspended;
    const actionLabel = nextStatus ? 'suspend' : 'reactivate';

    if (!confirm(`Are you sure you want to ${actionLabel} account: ${targetUser.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: nextStatus })
        .eq('id', targetUser.id);

      if (error) throw error;
      toastSuccess(`Account ${targetUser.full_name} has been ${nextStatus ? 'suspended' : 'unsuspended'}!`);
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to update suspension status.');
    }
  };

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const { error } = await supabase
        .from('service_categories')
        .insert({
          name: newCatName,
          icon: newCatIcon,
        });

      if (error) throw error;
      toastSuccess('Category added successfully!');
      setNewCatName('');
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to add category.');
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? Service requests using this category may throw errors.')) return;

    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', catId);

      if (error) throw error;
      toastSuccess('Category deleted.');
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete category.');
    }
  };

  // Resolve Dispute
  const handleResolveDispute = async (decision: 'payout' | 'refund') => {
    if (!selectedDispute) return;
    setLoading(true);

    try {
      const order = selectedDispute.order;
      const budget = order?.request?.budget ? parseFloat(order.request.budget) : 150.00;
      const platformFee = Math.round((budget * 0.10) * 100) / 100;

      // 1. Update Dispute status to RESOLVED
      const { error: dispErr } = await supabase
        .from('disputes')
        .update({ status: 'RESOLVED' })
        .eq('id', selectedDispute.id);

      if (dispErr) throw dispErr;

      // 2. Fetch Wallet of provider
      const { data: wallet, error: wErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('provider_id', order.provider_id)
        .maybeSingle();

      if (wErr) console.error(wErr);

      if (decision === 'payout') {
        // Option A: Admin rules in favor of Provider (pays provider earnings, deducts platform fee)
        await supabase
          .from('orders')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
          .eq('id', order.id);

        await supabase
          .from('service_requests')
          .update({ status: 'COMPLETED' })
          .eq('id', order.request_id);

        if (wallet) {
          const providerEarnings = budget - platformFee;
          const newBalance = parseFloat(wallet.balance) + providerEarnings;
          const newAvailable = parseFloat(wallet.available_amount) + providerEarnings;
          const newHeld = Math.max(0, parseFloat(wallet.held_amount) - platformFee);

          // Update Wallet
          await supabase.from('wallets').update({
            balance: newBalance,
            available_amount: newAvailable,
            held_amount: newHeld,
          }).eq('id', wallet.id);

          // Add credit & fee deduction txns
          await supabase.from('wallet_transactions').insert([
            { wallet_id: wallet.id, type: 'Credit', amount: budget, description: `Job dispute payout earnings of ₹${budget}` },
            { wallet_id: wallet.id, type: 'Fee Deduction', amount: platformFee, description: `Dispute platform fee deduction of ₹${platformFee}` }
          ]);
        }
        toastSuccess('Dispute resolved: Provider paid.');
      } else {
        // Option B: Admin rules in favor of Customer (refunds customer, releases held platform fee from provider wallet without paying them)
        await supabase
          .from('orders')
          .update({ status: 'CANCELLED' })
          .eq('id', order.id);

        await supabase
          .from('service_requests')
          .update({ status: 'CANCELLED' })
          .eq('id', order.request_id);

        if (wallet) {
          const newHeld = Math.max(0, parseFloat(wallet.held_amount) - platformFee);
          
          // Release held platform fee back to provider limits
          await supabase.from('wallets').update({
            held_amount: newHeld,
          }).eq('id', wallet.id);

          // Record a Release transaction (nullifies the hold)
          await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            type: 'Release',
            amount: platformFee,
            description: `Held platform fee released on Cancelled Dispute: Order ID: ${order.id.slice(0, 8)}`,
          });
        }
        toastSuccess('Dispute resolved: Order cancelled and refunded.');
      }

      setSelectedDispute(null);
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to resolve dispute.');
    } finally {
      setLoading(false);
    }
  };

  // Filter users list based on query
  const filteredUsers = usersList.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.mobile_number.includes(searchQuery) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.custom_user_id && u.custom_user_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        {/* Header Title */}
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
              <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                <ShieldAlert className="h-8 w-8 text-primary" />
                Administrative Panel
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">System moderation, dispute overrides, and category configurations.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAdminData} className="rounded-xl flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Sync
            </Button>
            <Button 
              variant={activeSubTab === 'stats' ? 'default' : 'outline'} 
              onClick={() => setActiveSubTab('stats')}
              className="rounded-xl font-bold"
            >
              Stats
            </Button>
            <Button 
              variant={activeSubTab === 'users' ? 'default' : 'outline'} 
              onClick={() => setActiveSubTab('users')}
              className="rounded-xl font-bold"
            >
              Users ({usersList.length})
            </Button>
            <Button 
              variant={activeSubTab === 'disputes' ? 'default' : 'outline'} 
              onClick={() => setActiveSubTab('disputes')}
              className="rounded-xl font-bold"
            >
              Disputes ({disputesList.filter(d => d.status === 'PENDING').length})
            </Button>
            <Button 
              variant={activeSubTab === 'categories' ? 'default' : 'outline'} 
              onClick={() => setActiveSubTab('categories')}
              className="rounded-xl font-bold"
            >
              Categories ({categoriesList.length})
            </Button>
          </div>
        </div>

        {activeSubTab === 'stats' && (
          // System stats grids
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-border bg-card p-5">
                <Users className="h-6 w-6 text-primary mb-3" />
                <span className="text-xs font-bold text-muted-foreground block uppercase">Customers</span>
                <h2 className="text-3xl font-black text-foreground mt-1">{metrics.totalUsers}</h2>
              </Card>

              <Card className="border-border bg-card p-5">
                <Wrench className="h-6 w-6 text-secondary mb-3" />
                <span className="text-xs font-bold text-muted-foreground block uppercase">Providers</span>
                <h2 className="text-3xl font-black text-foreground mt-1">{metrics.totalProviders}</h2>
              </Card>

              <Card className="border-border bg-card p-5">
                <Layers className="h-6 w-6 text-yellow-500 mb-3" />
                <span className="text-xs font-bold text-muted-foreground block uppercase">Active Orders</span>
                <h2 className="text-3xl font-black text-foreground mt-1">{metrics.activeOrders}</h2>
              </Card>

              <Card className="border-border bg-card p-5">
                <DollarSign className="h-6 w-6 text-green-500 mb-3" />
                <span className="text-xs font-bold text-muted-foreground block uppercase">Platform Revenue</span>
                <h2 className="text-3xl font-black text-green-500 mt-1">{formatCurrency(metrics.totalRevenue)}</h2>
              </Card>

              <Card className="border-border bg-card p-5 col-span-2 lg:col-span-1">
                <AlertTriangle className="h-6 w-6 text-red-500 mb-3" />
                <span className="text-xs font-bold text-muted-foreground block uppercase">Open Disputes</span>
                <h2 className="text-3xl font-black text-red-500 mt-1">{metrics.pendingDisputes}</h2>
              </Card>
            </div>

            {/* Quick disputes panel */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Administrative logs are synced directly with the Supabase schema.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm space-y-2">
                <p>Ensure that the <code className="bg-muted px-1.5 py-0.5 rounded border border-border">SUPABASE_SERVICE_ROLE_KEY</code> is correctly loaded in Next.js Server environment variables for system triggers to run properly.</p>
                <p>Wallet deductions and holds are registered atomically. Suspending user accounts denies logins immediately.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSubTab === 'users' && (
          // Users list and suspension controls
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or role..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="border border-border bg-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
                ) : (
                  filteredUsers.map((target) => (
                    <div 
                      key={target.id} 
                      className="flex flex-wrap justify-between items-center p-4 hover:bg-muted/10 transition-colors gap-3 cursor-pointer"
                      onClick={() => setSelectedUser(target)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={target.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${target.full_name}`}
                          alt={target.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{target.full_name}</span>
                            {target.custom_user_id && (
                              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                                {target.custom_user_id}
                              </span>
                            )}
                            {target.is_suspended && (
                              <span className="text-[10px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded">
                                Suspended
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground block font-semibold mt-0.5">Phone: {target.mobile_number}</span>
                          {target.dob && (
                            <span className="text-xs text-muted-foreground block font-semibold mt-0.5">
                              DOB: {target.dob} (Age: {(() => {
                                const today = new Date();
                                const birthDate = new Date(target.dob);
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const m = today.getMonth() - birthDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                  age--;
                                }
                                return age;
                              })()})
                            </span>
                          )}
                          {target.selfie_url && (
                            <div 
                              className="mt-2 flex items-center gap-2.5 bg-muted/50 p-2 rounded-xl border border-border max-w-xs shadow-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img 
                                src={target.selfie_url} 
                                alt="Selfie Verification" 
                                className="h-11 w-11 rounded-lg object-cover border border-border cursor-zoom-in hover:scale-105 transition-transform"
                                onClick={() => setPreviewImage(target.selfie_url)}
                              />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-primary tracking-wider leading-none">Security Selfie</span>
                                <button 
                                  type="button"
                                  className="text-[9px] text-blue-500 hover:underline font-bold mt-1 text-left"
                                  onClick={() => setPreviewImage(target.selfie_url)}
                                >
                                  View Full Image
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs uppercase font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded border border-border">
                          {target.role}
                        </span>
                        
                        {target.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant={target.is_suspended ? 'outline' : 'ghost'}
                            className={`rounded-lg font-bold flex items-center gap-1.5 ${
                              target.is_suspended ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 hover:bg-red-500/10'
                            }`}
                            onClick={() => handleToggleSuspension(target)}
                          >
                            <Ban className="h-4 w-4" />
                            {target.is_suspended ? 'Reactivate' : 'Suspend'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'disputes' && (
          // Disputes resolution queue
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Disputes Resolution Queue</h3>

            {disputesList.length === 0 ? (
              <Card className="border-border bg-card p-12 text-center text-muted-foreground">
                <p className="text-sm">No disputes logged in the system.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {disputesList.map((disp) => (
                  <Card key={disp.id} className="border-border bg-card flex flex-col justify-between overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border p-5">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          disp.status === 'PENDING' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-green-500/10 text-green-500 border-green-500/20'
                        }`}>
                          {disp.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(disp.created_at)}</span>
                      </div>
                      <CardTitle className="text-base font-bold mt-2 text-red-500">Dispute: {disp.reason}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">{disp.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Order Summary</span>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{disp.order?.request?.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Reporter (Customer)</span>
                          <span className="text-xs font-bold text-foreground block">
                            {disp.order?.customer?.full_name || 'N/A'}
                          </span>
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 mt-1 inline-block">
                            ID: {disp.reporter_custom_id || disp.order?.customer?.custom_user_id || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Reported (Provider)</span>
                          <span className="text-xs font-bold text-foreground block">
                            {disp.order?.provider?.full_name || 'N/A'}
                          </span>
                          <span className="text-[9px] font-black text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20 mt-1 inline-block">
                            ID: {disp.reported_custom_id || disp.order?.provider?.custom_user_id || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    {disp.status === 'PENDING' && (
                      <CardFooter className="p-5 border-t border-border bg-muted/10">
                        <Button
                          className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold"
                          onClick={() => setSelectedDispute(disp)}
                        >
                          Moderate Dispute
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'categories' && (
          // Category manager
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Category form */}
            <div className="lg:col-span-1">
              <Card className="border-border bg-card shadow-xs">
                <CardHeader>
                  <CardTitle>Add Category</CardTitle>
                  <CardDescription>Insert a new service category category.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category Name</label>
                      <Input
                        placeholder="e.g. Carpentry"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lucide Icon Name</label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                      >
                        <option value="Wrench">Wrench (Plumbing)</option>
                        <option value="Zap">Zap (Electrician)</option>
                        <option value="Sparkles">Sparkles (Cleaning)</option>
                        <option value="Cpu">Cpu (Appliance)</option>
                        <option value="Paintbrush">Paintbrush (Painter)</option>
                        <option value="Bug">Bug (Pest Control)</option>
                        <option value="Hammer">Hammer (Carpenter)</option>
                        <option value="Home">Home (Maintenance)</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full rounded-xl bg-primary text-white font-bold">
                      Add Category
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List categories */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-foreground">Active Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categoriesList.map((cat) => (
                  <Card key={cat.id} className="border-border bg-card p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dispute Resolution Decision dialog modal */}
      <Dialog open={selectedDispute !== null} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-md border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-500">Moderate Dispute Resolution</DialogTitle>
            <DialogDescription>
              Select a ruling to resolve this case. This updates order statuses and unlocks wallet holds accordingly.
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="my-4 p-4 border border-border bg-muted/30 rounded-xl space-y-2 text-sm text-foreground">
              <p><strong>Dispute Reason:</strong> {selectedDispute.reason}</p>
              <p><strong>Details:</strong> {selectedDispute.description}</p>
              <p><strong>Order Budget:</strong> {formatCurrency(selectedDispute.order?.request?.budget || 150)}</p>
            </div>
          )}

          <DialogFooter className="grid grid-cols-2 gap-4">
            <Button
              className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold"
              onClick={() => handleResolveDispute('payout')}
              disabled={loading}
            >
              Payout Provider
            </Button>
            <Button
              className="w-full rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={() => handleResolveDispute('refund')}
              disabled={loading}
            >
              Refund Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive User Detail & History Dialog Modal */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl border-border bg-card p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl font-black text-foreground flex items-center gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedUser?.full_name}`}
                  alt={selectedUser?.full_name}
                  className="h-12 w-12 rounded-full object-cover border border-primary/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{selectedUser?.full_name}</span>
                    <span className="text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {selectedUser?.role}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold block mt-0.5">
                    {selectedUser?.custom_user_id || 'No Custom ID'}
                  </span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Mobile Number</span>
                  <span className="text-sm font-bold text-foreground select-all">{selectedUser.mobile_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Date of Birth</span>
                  <span className="text-sm font-bold text-foreground">{selectedUser.dob || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Joined On</span>
                  <span className="text-sm font-bold text-foreground">{formatDate(selectedUser.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Account Status</span>
                  <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border inline-block mt-0.5 ${
                    selectedUser.is_suspended ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                  }`}>
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
                {selectedUser.role === 'provider' && (
                  <>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Service Category</span>
                      <span className="text-sm font-bold text-foreground capitalize">{selectedUser.service_category || 'Cleaning'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Rating</span>
                      <span className="text-sm font-bold text-yellow-500">★ {selectedUser.rating || '5.0'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Security Selfie Verification */}
              {selectedUser.role === 'provider' && selectedUser.selfie_url && (
                <div className="border border-border p-4 bg-muted/20 rounded-2xl">
                  <span className="text-xs text-foreground uppercase block font-black mb-2">Aadhaar Security Selfie</span>
                  <div className="flex gap-3 items-center">
                    <img 
                      src={selectedUser.selfie_url} 
                      alt="Verification Selfie" 
                      className="h-20 w-20 rounded-xl object-cover border border-border cursor-zoom-in hover:scale-105 transition-transform shrink-0"
                      onClick={() => setPreviewImage(selectedUser.selfie_url)}
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold leading-normal">
                        This selfie was uploaded by the provider during Aadhaar verification to match details.
                      </p>
                      <Button 
                        size="xs" 
                        variant="outline" 
                        className="rounded-lg h-7 font-bold text-xs"
                        onClick={() => setPreviewImage(selectedUser.selfie_url)}
                      >
                        Preview Selfie Verification
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* History Section */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-black text-foreground mb-3">
                  {selectedUser.role === 'customer' ? 'Service Requests Created' : 'Jobs History'}
                </h4>

                <div className="space-y-3">
                  {selectedUser.role === 'customer' ? (
                    (() => {
                      const reqs = allRequests.filter(r => r.customer_id === selectedUser.id);
                      if (reqs.length === 0) {
                        return <p className="text-xs text-muted-foreground text-center py-4">No service requests found for this customer.</p>;
                      }
                      return reqs.map((req) => (
                        <div key={req.id} className="p-3 border border-border bg-background rounded-xl text-xs font-semibold space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-foreground line-clamp-1">{req.description}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                              req.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              req.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                            <span>Category: {req.category?.name || 'General'} | Budget: {req.budget ? formatCurrency(req.budget) : 'Open'}</span>
                            <span>{formatDate(req.created_at)}</span>
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    (() => {
                      const ords = allOrders.filter(o => o.provider_id === selectedUser.id);
                      if (ords.length === 0) {
                        return <p className="text-xs text-muted-foreground text-center py-4">No jobs assigned or completed yet.</p>;
                      }
                      return ords.map((order) => (
                        <div key={order.id} className="p-3 border border-border bg-background rounded-xl text-xs font-semibold space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-foreground line-clamp-1">{order.request?.description || 'Service Job'}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                              order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                            <span>Customer: {order.customer?.full_name || 'QuickFix User'} | Payout: {order.request?.budget ? formatCurrency(order.request.budget) : 'Open'}</span>
                            <span>{formatDate(order.started_at || order.created_at)}</span>
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={() => setSelectedUser(null)}
            >
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Image Preview Lightbox Overlay */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            type="button" 
            className="absolute top-4 right-4 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setPreviewImage(null)}
            aria-label="Close"
          >
            <XCircle className="h-7 w-7" />
          </button>
          
          <div 
            className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage} 
              alt="Enlarged reference preview" 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
          
          <div className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold hover:text-white"
              onClick={() => setPreviewImage(null)}
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
