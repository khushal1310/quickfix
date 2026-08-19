"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Wrench, Zap, Sparkles, Cpu, Paintbrush, Bug, CheckCircle, ArrowRight, Star, HelpCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TiltCard } from '@/components/ui/TiltCard';

function HeroPhoneMockup() {
  const [matchState, setMatchState] = useState<'searching' | 'matched' | 'arriving'>('searching');
  const [eta, setEta] = useState(5);

  // Automatically cycle through states in mockup
  useEffect(() => {
    const interval = setInterval(() => {
      setMatchState((prev) => {
        if (prev === 'searching') return 'matched';
        if (prev === 'matched') return 'arriving';
        return 'searching';
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Animate scooter position when in 'arriving' state
  useEffect(() => {
    if (matchState !== 'arriving') {
      setEta(5);
      return;
    }
    const timer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) return 5; // loop ETA
        return prev - 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [matchState]);

  // Framer Motion 3D rotation values on hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-15, 15]);

  const smoothX = useSpring(rotateX, { damping: 20, stiffness: 150 });
  const smoothY = useSpring(rotateY, { damping: 20, stiffness: 150 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: smoothX,
        rotateY: smoothY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="relative mx-auto w-72 h-[510px] rounded-[38px] border-[8px] border-black bg-neutral-900 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-b-xl z-50 flex items-center justify-center">
        <div className="w-10 h-0.5 bg-neutral-800 rounded-full"></div>
      </div>

      {/* Screen Container */}
      <div className="relative flex-1 w-full bg-background rounded-[28px] p-3 pt-5 flex flex-col justify-between overflow-hidden">
        {/* App Bar */}
        <div className="flex items-center justify-between pb-1.5 border-b border-border">
          <div className="flex items-center gap-1">
            <div className="w-5.5 h-5.5 bg-primary rounded-md flex items-center justify-center text-[9px] font-black text-white">QF</div>
            <span className="text-[10px] font-black text-foreground">QuickFix</span>
          </div>
          <span className="text-[9px] font-bold text-green-500 flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-ping"></span> Live
          </span>
        </div>

        {/* Dynamic Display Area */}
        <div className="flex-1 w-full py-3 flex flex-col justify-center relative">
          {matchState === 'searching' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              {/* Pulsing Radar Ring */}
              <div className="relative w-28 h-28 rounded-full border border-primary/20 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full border border-primary/40 animate-ping"></div>
                <div className="absolute w-12 h-12 rounded-full border border-primary/60 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                  <Wrench className="h-4.5 w-4.5 animate-bounce" />
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-foreground">Finding Cleaning Helpers</h4>
                <p className="text-[8px] text-muted-foreground mt-0.5">Scanning 1.0 km radius...</p>
              </div>
            </div>
          )}

          {matchState === 'matched' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-foreground">Provider Matched!</h4>
                <p className="text-[8px] text-muted-foreground mt-0.5">Bob (Cleaning Expert) has accepted your job.</p>
              </div>
              {/* Mini Card */}
              <div className="w-full bg-muted/40 p-2 rounded-xl border border-border flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary">BP</div>
                <div>
                  <div className="text-[9px] font-black text-foreground">Bob Cleaning</div>
                  <div className="text-[7px] text-green-600 font-bold">🥇 Gold Partner</div>
                </div>
              </div>
            </div>
          )}

          {matchState === 'arriving' && (
            <div className="flex-1 w-full flex flex-col justify-between animate-in fade-in slide-in-from-bottom duration-300">
              {/* Simulated Map */}
              <div className="flex-1 bg-muted/30 rounded-xl border border-border relative overflow-hidden flex items-center justify-center min-h-[140px]">
                {/* Visual Dotted Line */}
                <svg className="absolute w-full h-full p-4">
                  <path d="M 20,100 Q 70,30 130,70" fill="none" stroke="#e1306c" strokeWidth="2" strokeDasharray="3" />
                </svg>
                {/* Customer Icon */}
                <div className="absolute top-10 right-6 flex flex-col items-center">
                  <span className="text-sm">🏠</span>
                  <span className="text-[7px] font-bold text-foreground bg-background px-0.5 border border-border rounded">Home</span>
                </div>
                {/* Scooter Marker */}
                <motion.div 
                  animate={{ 
                    x: eta === 5 ? -50 : eta === 4 ? -25 : eta === 3 ? 0 : eta === 2 ? 25 : 50,
                    y: eta === 5 ? 30 : eta === 4 ? 10 : eta === 3 ? 0 : eta === 2 ? 10 : -10
                  }}
                  transition={{ duration: 1 }}
                  className="absolute bottom-20 left-6 flex flex-col items-center"
                >
                  <span className="text-base">🛵</span>
                  <span className="text-[6px] font-bold text-white bg-primary px-0.5 rounded">Bob</span>
                </motion.div>
              </div>
              {/* ETA status */}
              <div className="mt-2 bg-primary/5 p-1.5 rounded-lg border border-primary/10 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">Estimated Arrival</span>
                  <span className="text-[10px] font-black text-primary block">{eta} Minutes</span>
                </div>
                <span className="text-[7px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">On the way</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Stat Row */}
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/80">
          <div className="bg-muted/30 p-1 rounded-lg text-center">
            <span className="text-[7px] text-muted-foreground block">Nearby</span>
            <span className="text-[9px] font-black text-foreground">14 Helpers</span>
          </div>
          <div className="bg-muted/30 p-1 rounded-lg text-center">
            <span className="text-[7px] text-muted-foreground block">Match Speed</span>
            <span className="text-[9px] font-black text-foreground">&lt; 15 Seconds</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();

  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [liveReviews, setLiveReviews] = useState<any[]>([]);

  useEffect(() => {
    fetchLiveReviews();
  }, []);

  const fetchLiveReviews = async () => {
    try {
      const { data } = await supabase
        .from('platform_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data && data.length > 0) {
        setLiveReviews(data);
      }
    } catch (err) {
      console.error('Error fetching live reviews:', err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('platform_reviews').insert({
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (error) throw error;
      setReviewSuccess(true);
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
      fetchLiveReviews(); // Refresh testimonials list instantly
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background pb-16 sm:pb-0 overflow-hidden">
      <Navbar />

      {/* Floating Background Blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/10 mix-blend-multiply filter blur-3xl animate-float-slow pointer-events-none z-0"></div>
      <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-secondary/10 mix-blend-multiply filter blur-3xl animate-float-reverse pointer-events-none z-0"></div>
      <div className="absolute bottom-60 left-1/4 w-96 h-96 rounded-full bg-accent/5 mix-blend-multiply filter blur-3xl animate-float-slow pointer-events-none z-0"></div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4 md:px-8 bg-linear-to-b from-primary/5 via-transparent to-transparent z-10">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
          
          {/* Hero Left Column: Text & CTAs */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary"
            >
              <Sparkles className="h-4 w-4" />
              <span>Find Local Service Providers Instantly</span>
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6, type: 'spring' }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-foreground"
            >
              Your Local Service Marketplace,{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent block md:inline">
                On Demand
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              Connect with background-verified professionals in real-time. Post a task, receive matches instantly, choose your helper, and unlock contact details securely.
            </motion.p>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              {isAuthenticated && user ? (
                <Link href={`/${user.role}`} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl font-bold bg-primary text-white hover:bg-primary-hover">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl font-bold bg-primary text-white hover:bg-primary-hover">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl border-border bg-card text-foreground hover:bg-muted font-bold">
                      Log In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>

          {/* Hero Right Column: 3D Smartphone Visual */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, type: 'spring', stiffness: 80 }}
            className="w-full flex justify-center z-10"
          >
            <HeroPhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 md:px-8 bg-card/60 backdrop-blur-md border-y border-border z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Explore Service Categories</h2>
            <p className="text-muted-foreground mt-2">Professional, background-verified help for all home services.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-6 gap-4"
          >
            {[
              { name: 'Cleaning', icon: Sparkles, color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
              { name: 'Plumbing', icon: Wrench, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
              { name: 'Electrician', icon: Zap, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
              { name: 'Appliance Repair', icon: Cpu, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
              { name: 'Painting', icon: Paintbrush, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
              { name: 'Pest Control', icon: Bug, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
            ].map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <TiltCard className="flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-background/50 hover:bg-background/80 cursor-pointer">
                    <div className={`p-4 rounded-xl border transition-transform duration-300 hover:rotate-12 ${cat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="mt-4 font-bold text-sm text-foreground">{cat.name}</span>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 md:px-8 bg-background/40 z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">How QuickFix Works</h2>
            <p className="text-muted-foreground mt-2">Connecting customers and local helpers seamlessly in four simple steps.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-4 gap-8"
          >
            {[
              { step: '01', title: 'Submit a Request', desc: 'Detail your service needs, area, city, and select a category. Set a budget and add up to 3 helper images.' },
              { step: '02', title: 'Providers Accept', desc: 'Nearby certified providers receive instant notifications and accept your requests in real-time.' },
              { step: '03', title: 'Instant Matching', desc: 'Once a nearby provider accepts, they are matched instantly. Enjoy location-based tracking in real-time.' },
              { step: '04', title: 'Unlock & Complete', desc: 'Contact details unlock instantly. Chat, complete work, confirm, and pay securely through order updates.' }
            ].map((item, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="relative flex flex-col p-6 bg-card border border-border rounded-2xl shadow-xs transition-shadow hover:shadow-lg"
              >
                <span className="text-5xl font-black text-primary/10 absolute top-4 right-6 select-none">{item.step}</span>
                <h3 className="text-lg font-bold mt-4 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 md:px-8 bg-card/60 backdrop-blur-md border-t border-border z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Loved by Customers & Providers</h2>
            <p className="text-muted-foreground mt-2">Real testimonials from users who experience the speed of QuickFix.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {(liveReviews.length > 0 ? liveReviews : [
              { name: 'Sarah Miller', role: 'Home Owner', comment: 'QuickFix saved my weekend! I had a clogged sink and found a plumber who fixed it within 45 minutes of posting my request. The instant messaging and profile checks were seamless.', rating: 5 },
              { name: 'David Carter', role: 'Electrician Provider', comment: 'As a provider, I love the wallet and notification system. I receive instant alerts of nearby jobs, accept them, and can start working immediately. Highly recommended!', rating: 5 },
              { name: 'Emma Watson', role: 'Property Manager', comment: 'The dispute management and order tracking makes managing repairs across my properties so easy. The platform fee is fair and stays locked in hold until I confirm.', rating: 5 }
            ]).map((test, idx) => (
              <motion.div key={idx} variants={itemVariants} className="h-full">
                <TiltCard className="p-6 bg-background/80 border border-border rounded-2xl flex flex-col justify-between h-full">
                  <div>
                    <div className="flex gap-1 text-yellow-500 mb-4">
                      {Array.from({ length: test.rating || 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{test.comment || test.review}&rdquo;</p>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm shrink-0">
                      {test.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{test.name}</h4>
                      <span className="text-xs text-muted-foreground">{test.role || 'Verified User'}</span>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 md:px-8 bg-background/40 z-10">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2">Everything you need to know about the QuickFix marketplace.</p>
          </div>

          <div className="space-y-4">
            {[
              { q: 'Is my phone number visible during requests?', a: 'No. To protect your privacy, contact details like phone numbers and exact addresses are hidden. They are only revealed to your selected provider after you confirm the selection.' },
              { q: 'How are platform fees managed in the Wallet?', a: 'When a customer selects a provider, the platform fee is moved to a Held state in the provider\'s wallet. It is only debited once the job is completed. If the job is cancelled, the hold is released.' },
              { q: 'What happens if a customer doesn\'t confirm completed work?', a: 'If a provider marks the job as complete and the customer does not respond within 12 hours, the platform automatically triggers an autocomplete cron job to release the earnings to the provider.' },
              { q: 'Can I raise a dispute if work is not satisfactory?', a: 'Yes. Customers can raise disputes on any active or completed orders by uploading proof. This locks the wallet transactions, and our administrators review and resolve disputes manually.' }
            ].map((faq, idx) => (
              <div key={idx} className="p-5 border border-border bg-card rounded-2xl shadow-xs transition-all hover:border-primary/20">
                <h3 className="font-bold flex items-center gap-2 text-foreground text-base">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-muted-foreground text-sm mt-2 pl-7 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Review Form */}
      <section className="py-20 px-4 md:px-8 bg-card/60 backdrop-blur-md border-t border-border z-10">
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Share Your Feedback</h2>
            <p className="text-muted-foreground mt-2 text-sm">We value your opinion! Let us know how we can make QuickFix even better.</p>
          </div>

          <form onSubmit={handleReviewSubmit} className="space-y-5 glass-card p-6 md:p-8 rounded-3xl shadow-xl">
            {reviewSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-4 text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                Thank you! Your feedback has been submitted successfully.
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Name</label>
              <input 
                type="text" 
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 px-4 rounded-xl border border-border bg-card/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-semibold transition-all hover:bg-card focus:bg-card"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rating</label>
              <div className="flex gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 focus:outline-none transition-transform active:scale-95"
                  >
                    <Star 
                      className={`h-7 w-7 transition-all ${
                        star <= reviewRating 
                          ? 'text-yellow-500 fill-yellow-500 scale-110 drop-shadow-md' 
                          : 'text-muted-foreground/30 hover:text-yellow-500/50 hover:scale-105'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comments / Suggestions</label>
              <textarea 
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Tell us what you think..."
                rows={4}
                className="w-full p-4 rounded-xl border border-border bg-card/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-semibold resize-none transition-all hover:bg-card focus:bg-card"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-xl py-3 font-bold bg-primary text-white hover:bg-primary/95 shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-4 md:px-8 mt-auto z-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="insta-gradient p-1 rounded-md text-white text-xs font-bold">QF</span>
            <span className="font-bold text-foreground">QuickFix Inc.</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 QuickFix. All rights reserved. Made with love for premium services.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-primary">Provider Login</Link>
            <Link href="/register" className="hover:text-primary">Join as Professional</Link>
            <Link href="/admin" className="hover:text-primary">Admin Access</Link>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
