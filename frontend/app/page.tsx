import Link from 'next/link'
import { Mail, MessageSquare, BarChart3, Users, Zap, Shield, Clock, CheckCircle, ArrowRight, Star } from 'lucide-react'

const features = [
  {
    icon: Mail,
    title: 'Email Campaigns',
    description: 'Send beautifully formatted email campaigns with templates, personalization, and HTML support.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: MessageSquare,
    title: 'Bulk SMS',
    description: 'Reach customers instantly with bulk SMS campaigns through Twilio and Termii providers.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track delivery, open, and click rates in real time with comprehensive dashboards.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Import, organize, and segment contacts with CSV import and list management.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    description: 'Schedule campaigns for the perfect moment with our built-in scheduling engine.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Enterprise-grade security with unsubscribe management and delivery compliance.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
]

const stats = [
  { label: 'Messages delivered', value: '50M+' },
  { label: 'Active campaigns', value: '12K+' },
  { label: 'Delivery rate', value: '98.6%' },
  { label: 'Uptime SLA', value: '99.9%' },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For getting started',
    features: ['100 SMS / month', '500 emails / month', 'Basic analytics', '1 contact list'],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    description: 'For growing businesses',
    features: ['25,000 SMS / month', '100,000 emails / month', 'Full analytics suite', 'Unlimited lists', 'API access', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large scale operations',
    features: ['Unlimited SMS & Email', 'White-label option', 'Dedicated account manager', 'SLA guarantee', 'Custom integrations', '24/7 phone support'],
    cta: 'Contact sales',
    highlighted: false,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#020817]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#020817]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">BulkNotifs</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sign in</Link>
          </div>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 dark:opacity-20" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-950/20 dark:to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6">
            <Star className="h-3 w-3" />
            Trusted by 2,000+ businesses worldwide
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6 text-balance">
            Send smarter
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              bulk messages
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto text-balance">
            The all-in-one platform for bulk SMS and email campaigns. Schedule, personalize, and track every message with real-time analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3 text-base font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required &bull; Free plan available</p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to reach your audience
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From email to SMS, templates to analytics — all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Get started in minutes</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-14">Three simple steps to your first campaign.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Import contacts', desc: 'Upload your contact lists via CSV or add them manually.' },
              { step: '02', title: 'Create a campaign', desc: 'Choose a template, write your message, and set your schedule.' },
              { step: '03', title: 'Track results', desc: 'Monitor delivery, opens, and clicks in your analytics dashboard.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-extrabold text-indigo-100 dark:text-indigo-950 mb-3">{s.step}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 dark:text-gray-400">Start free. Scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  p.highlighted
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 scale-105'
                    : 'border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-0.5 text-xs font-bold text-white">
                    Most popular
                  </div>
                )}
                <div className={`text-sm font-medium mb-2 ${p.highlighted ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {p.description}
                </div>
                <h3 className={`text-xl font-bold mb-1 ${p.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {p.name}
                </h3>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${p.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {p.price}
                  </span>
                  {p.price !== 'Custom' && (
                    <span className={`text-sm ml-1 ${p.highlighted ? 'text-indigo-200' : 'text-gray-400'}`}>/month</span>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${p.highlighted ? 'text-indigo-200' : 'text-green-500'}`} />
                      <span className={p.highlighted ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${
                    p.highlighted
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-10" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to grow your reach?</h2>
          <p className="text-indigo-200 mb-8">Join thousands of businesses already using BulkNotifs to connect with their customers.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-indigo-700 hover:bg-indigo-50 shadow-lg transition-all hover:-translate-y-0.5"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">BulkNotifs</span>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} BulkNotifs. All rights reserved.</p>
          <div className="flex gap-5 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Terms</a>
            <Link href="/login" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
