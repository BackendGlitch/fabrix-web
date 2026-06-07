'use client';

import { ArrowUpRight, Plus, Box, Zap, Wallet, Layers, Clock, Lock, Globe, Truck, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-lime/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 glass border-b border-primary/20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center font-bold text-primary-foreground text-xs">
                F
              </div>
              <span className="text-xl font-black text-glow-cyan tracking-tight">Fabrix</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
            </div>
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 sm:py-32 lg:py-48">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-block">
                <div className="glass border border-primary/30 rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-primary flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  On-Demand 3D Printing Network
                </div>
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter-hero leading-[0.95]">
                    <span className="block glitch-text" data-text="Your Model">
                      Your Model
                    </span>
                    <span className="block text-muted-foreground">Our Network</span>
                    <span className="block">
                      <span className="slant-highlight slant-highlight-lime text-black">Real Prints.</span>
                    </span>
                  </h1>
                </div>

                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Upload your STL file, connect with local makers, and get your 3D print delivered in 24 hours. No minimums. Transparent pricing. Real-time tracking.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-primary text-primary-foreground font-bold px-8 glow-cyan group hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    Start Printing
                    <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="px-8 font-bold border-primary/40 hover:border-primary/60 hover:bg-primary/10">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-16 max-w-2xl mx-auto">
                <div className="glass-strong rounded-lg p-4 border border-primary/20">
                  <p className="text-2xl sm:text-3xl font-black text-primary">500+</p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Active Makers</p>
                </div>
                <div className="glass-strong rounded-lg p-4 border border-accent/20">
                  <p className="text-2xl sm:text-3xl font-black text-accent">10k+</p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Prints Delivered</p>
                </div>
                <div className="glass-strong rounded-lg p-4 border border-lime/20">
                  <p className="text-2xl sm:text-3xl font-black text-lime">24h</p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Avg Delivery</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="relative py-20 sm:py-28 border-t border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter-hero leading-[0.95] mb-4">
                <span className="block">Simple</span>
                <span className="glitch-text" data-text="Three Steps">Three Steps</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From 3D model to finished print in minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {/* Step 1 */}
              <div className="group relative">
                <div className="glass-strong border border-primary/30 rounded-2xl p-8 hover:border-primary/60 hover:glow-cyan transition-all duration-300 h-full">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/20 border border-primary/40 text-primary mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">Upload Model</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Drop your STL file. Set material, color, and quality. Our system validates instantly and shows you available makers.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative md:mt-8">
                <div className="glass-strong border border-accent/30 rounded-2xl p-8 hover:border-accent/60 hover:glow-magenta transition-all duration-300 h-full">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-accent/20 border border-accent/40 text-accent mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">Pick Maker</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    See real-time quotes from local makers. Compare prices, delivery times, and printer specs. Choose who prints your model.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative md:mt-16">
                <div className="glass-strong border border-lime/30 rounded-2xl p-8 hover:border-lime/60 transition-all duration-300 h-full">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-lime/20 border border-lime/40 text-lime mb-6 group-hover:scale-110 transition-transform">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">Track & Collect</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monitor real-time progress. Get instant updates. Pick up locally or have it delivered. Done.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative py-20 sm:py-28 border-t border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter-hero leading-[0.95] mb-4">
                Why Fabrix
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for makers and customers. Fast. Transparent. Connected.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {[
                {
                  icon: DollarSign,
                  title: 'Transparent Pricing',
                  description: 'No hidden fees. See all costs upfront. Compare quotes from multiple makers in seconds.',
                  borderColor: 'border-primary/20'
                },
                {
                  icon: Zap,
                  title: 'Real-Time Updates',
                  description: 'Track your print progress live. Know exactly when it will be ready. Never wonder.',
                  borderColor: 'border-accent/20'
                },
                {
                  icon: Clock,
                  title: 'Lightning Fast',
                  description: 'Most prints complete within 24 hours. Local makers mean no shipping delays.',
                  borderColor: 'border-lime/20'
                },
                {
                  icon: Globe,
                  title: 'Local Network',
                  description: 'Support makers in your community. Reduce shipping costs and times dramatically.',
                  borderColor: 'border-primary/20'
                },
                {
                  icon: Lock,
                  title: 'Secure Payments',
                  description: 'Encrypted transactions. Pay only when your print is ready. Your data is protected.',
                  borderColor: 'border-accent/20'
                },
                {
                  icon: Layers,
                  title: 'Expert Makers',
                  description: 'Work with vetted makers who have proven track records. Quality guaranteed.',
                  borderColor: 'border-lime/20'
                }
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="group">
                    <div className={`glass-strong border ${feature.borderColor} rounded-xl p-8 hover:scale-105 transition-all duration-300 h-full`}>
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary flex-shrink-0 group-hover:scale-125 transition-transform">
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="relative py-20 sm:py-28 border-t border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter-hero leading-[0.95] mb-4">
                <span className="glitch-text" data-text="Pricing">Pricing</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Fair rates. No minimums. You only pay for what you print.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
              {[
                {
                  size: 'Tiny',
                  price: 'from 15 TND',
                  examples: ['Mini figurines', 'Phone stands', 'Cable clips'],
                  color: 'border-primary',
                  bg: 'bg-primary/5'
                },
                {
                  size: 'Medium',
                  price: 'from 50 TND',
                  examples: ['Mechanical parts', 'Organizers', 'Prototypes'],
                  color: 'border-lime',
                  bg: 'bg-lime/5',
                  featured: true
                },
                {
                  size: 'Large',
                  price: 'Custom',
                  examples: ['Props & cosplay', 'Models', 'Assemblies'],
                  color: 'border-accent',
                  bg: 'bg-accent/5'
                }
              ].map((tier, i) => (
                <div
                  key={i}
                  className={`glass-strong border ${tier.color} rounded-2xl p-8 transition-all ${
                    tier.featured ? 'scale-105 ring-2 ring-lime/30' : 'hover:scale-105'
                  }`}
                >
                  {tier.featured && (
                    <div className="inline-block px-3 py-1 bg-lime/20 text-lime text-xs font-bold rounded-full mb-4 border border-lime/40">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-black mb-2">{tier.size}</h3>
                  <p className={`text-4xl font-black mb-6 ${tier.featured ? 'text-lime' : 'text-primary'}`}>
                    {tier.price}
                  </p>
                  <ul className="space-y-3">
                    {tier.examples.map((example, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-12">
              Prices vary by material, quality, and maker availability.{' '}
              <Link href="/auth/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Get instant quotes →
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-20 sm:py-24 border-t border-primary/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter-hero leading-[0.95]">
                  Ready to<span className="block glitch-text" data-text="Start Printing?">Start Printing?</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of makers and customers already using Fabrix. Your first print is minutes away.
                </p>
              </div>

              <Link href="/auth/register">
                <Button size="lg" className="bg-primary text-primary-foreground font-bold px-8 glow-cyan group hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  Create Account
                  <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-primary/10 glass bg-background/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center font-bold text-primary-foreground text-xs">
                    F
                  </div>
                  <span className="font-black text-glow-cyan text-sm">Fabrix</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  3D printing, reimagined for makers everywhere.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 text-primary">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#features" className="hover:text-primary transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-primary transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      API
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 text-primary">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 text-primary">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-primary/10 pt-8">
              <p className="text-center text-sm text-muted-foreground">
                © 2026 Fabrix. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
