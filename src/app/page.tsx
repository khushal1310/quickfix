"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wrench, Zap, Sparkles, Cpu, Paintbrush, Bug, CheckCircle, ArrowRight, Star, HelpCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();

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
    <div className="flex min-h-screen flex-col bg-background pb-16 sm:pb-0">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 md:px-8 bg-linear-to-b from-primary/5 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-6"
          >
            <Sparkles className="h-4 w-4" />
            <span>Find Local Service Providers Instantly</span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight text-foreground"
          >
            Your Local Service Marketplace,{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              On Demand
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl"
          >
            Connect with background-verified professionals in real-time. Post a task, receive matches instantly, choose your helper, and unlock contact details securely.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
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
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 md:px-8 bg-card border-y border-border">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Explore Service Categories</h2>
            <p className="text-muted-foreground mt-2">Professional, background-verified help for all home services.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
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
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`flex flex-col items-center text-center p-6 rounded-2xl border bg-background/50 hover:bg-background cursor-pointer transition-all duration-200`}
                >
                  <div className={`p-4 rounded-xl border ${cat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="mt-4 font-bold text-sm text-foreground">{cat.name}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 md:px-8 bg-background">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">How QuickFix Works</h2>
            <p className="text-muted-foreground mt-2">Connecting customers and local helpers seamlessly in four simple steps.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Submit a Request', desc: 'Detail your service needs, area, city, and select a category. Set a budget and add up to 3 helper images.' },
              { step: '02', title: 'Providers Accept', desc: 'Nearby certified providers receive instant notifications and accept your requests in real-time.' },
              { step: '03', title: 'Choose Your Provider', desc: 'Compare providers based on rating, reviews, and experience. Selection is completed securely.' },
              { step: '04', title: 'Unlock & Complete', desc: 'Contact details unlock instantly. Chat, complete work, confirm, and pay securely through order updates.' }
            ].map((item, idx) => (
              <div key={idx} className="relative flex flex-col p-6 bg-card border border-border rounded-2xl shadow-xs">
                <span className="text-5xl font-black text-primary/10 absolute top-4 right-6 select-none">{item.step}</span>
                <h3 className="text-lg font-bold mt-4 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 md:px-8 bg-card border-t border-border">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Loved by Customers & Providers</h2>
            <p className="text-muted-foreground mt-2">Real testimonials from users who experience the speed of QuickFix.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Miller', role: 'Home Owner', review: 'QuickFix saved my weekend! I had a clogged sink and found a plumber who fixed it within 45 minutes of posting my request. The instant messaging and profile checks were seamless.', rating: 5 },
              { name: 'David Carter', role: 'Electrician Provider', review: 'As a provider, I love the wallet and notification system. I receive instant alerts of nearby jobs, accept them, and can start working immediately. Highly recommended!', rating: 5 },
              { name: 'Emma Watson', role: 'Property Manager', review: 'The dispute management and order tracking makes managing repairs across my properties so easy. The platform fee is fair and stays locked in hold until I confirm.', rating: 5 }
            ].map((test, idx) => (
              <div key={idx} className="p-6 bg-background border border-border rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-yellow-500 mb-4">
                    {Array.from({ length: test.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{test.review}&rdquo;</p>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">
                    {test.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{test.name}</h4>
                    <span className="text-xs text-muted-foreground">{test.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 md:px-8 bg-background">
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
              <div key={idx} className="p-5 border border-border bg-card rounded-2xl">
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

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-4 md:px-8 mt-auto">
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
