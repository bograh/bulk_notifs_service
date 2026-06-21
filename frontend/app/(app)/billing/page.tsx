'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingAPI, type Plan, type Subscription, type Transaction } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Check, CreditCard, Loader2, Zap, ArrowRight, TrendingUp, Mail, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['100 SMS / month', '500 emails / month', 'Basic analytics', 'Email support', '1 contact list'],
  basic: ['5,000 SMS / month', '25,000 emails / month', 'Advanced analytics', 'Priority support', 'CSV import', 'Unlimited lists'],
  pro: ['25,000 SMS / month', '100,000 emails / month', 'Full analytics suite', 'Dedicated support', 'API access', 'Custom templates', 'Scheduling'],
  enterprise: ['100,000 SMS / month', '500,000 emails / month', 'White-label option', '24/7 phone support', 'SLA guarantee', 'Custom integrations', 'Dedicated IP'],
}

const PLAN_HIGHLIGHT = 'pro'

export default function BillingPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingAPI.getPlans().then((r) => r.data),
  })

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingAPI.getSubscription().then((r) => r.data),
  })

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['billing', 'transactions'],
    queryFn: () => billingAPI.getTransactions().then((r) => r.data),
  })

  const subscribeMutation = useMutation({
    mutationFn: (planName: string) => billingAPI.subscribe(planName),
    onSuccess: (data) => {
      if (data.data.checkout_url) {
        window.location.href = data.data.checkout_url
      }
    },
    onError: () => toast({ title: 'Error', description: 'Failed to start checkout', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => billingAPI.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast({ title: 'Subscription cancelled', description: 'You have been moved to the free plan' })
    },
  })

  const currentPlan = subscription?.plan_name || 'free'
  const smsUsagePct = subscription ? Math.min((subscription.sms_used / subscription.sms_quota) * 100, 100) : 0
  const emailUsagePct = subscription ? Math.min((subscription.email_used / subscription.email_quota) * 100, 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current plan + usage */}
      {subscription && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Current Plan</CardTitle>
                <Badge variant={subscription.status === 'active' ? 'success' : 'outline'} className="capitalize">
                  {subscription.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground capitalize">{currentPlan}</span>
                <span className="text-muted-foreground">
                  {subscription.price_per_month > 0 ? `$${subscription.price_per_month.toFixed(2)}/mo` : 'Free forever'}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-orange-500" /> SMS usage
                  </span>
                  <span className={smsUsagePct > 85 ? 'text-red-500 font-medium' : ''}>
                    {subscription.sms_used.toLocaleString()} / {subscription.sms_quota.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', smsUsagePct > 85 ? 'bg-red-500' : 'bg-orange-500')}
                    style={{ width: `${smsUsagePct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-blue-500" /> Email usage
                  </span>
                  <span className={emailUsagePct > 85 ? 'text-red-500 font-medium' : ''}>
                    {subscription.email_used.toLocaleString()} / {subscription.email_quota.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', emailUsagePct > 85 ? 'bg-red-500' : 'bg-blue-500')}
                    style={{ width: `${emailUsagePct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            {subscription.status === 'active' && currentPlan !== 'free' && (
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => {
                    if (confirm('Cancel your subscription? You will lose access to paid features at the end of your billing period.')) {
                      cancelMutation.mutate()
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel subscription
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardContent className="p-6 flex flex-col justify-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Zap className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold">Need more volume?</p>
                  <p className="text-xs text-muted-foreground">Upgrade to unlock higher quotas and more features</p>
                </div>
              </div>
              <Button size="sm" className="gap-2 w-fit" asChild>
                <a href="#plans">
                  <TrendingUp className="h-4 w-4" />
                  Compare plans
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans */}
      <div id="plans">
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => {
            const isCurrentPlan = currentPlan === plan.name
            const isHighlighted = plan.name === PLAN_HIGHLIGHT

            return (
              <Card
                key={plan.name}
                className={cn(
                  'relative flex flex-col',
                  isHighlighted ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary' : '',
                  isCurrentPlan && !isHighlighted ? 'border-green-500/50' : ''
                )}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-0.5 text-xs font-bold text-white whitespace-nowrap">
                    Most popular
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{plan.name}</CardTitle>
                    {isCurrentPlan && <Badge variant="success" className="text-xs">Current</Badge>}
                  </div>
                  <div className="mt-1">
                    <span className="text-3xl font-extrabold">${plan.price_per_month.toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {PLAN_FEATURES[plan.name]?.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>Current plan</Button>
                  ) : plan.price_per_month === 0 ? (
                    <Button className="w-full" variant="ghost" disabled>Free plan</Button>
                  ) : (
                    <Button
                      className={cn('w-full gap-2', isHighlighted ? '' : 'variant-outline')}
                      variant={isHighlighted ? 'default' : 'outline'}
                      onClick={() => subscribeMutation.mutate(plan.name)}
                      disabled={subscribeMutation.isPending}
                    >
                      {subscribeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Upgrade
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Transaction history */}
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Transaction history</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(tx.created_at), 'MMM d, yyyy')} &bull; {tx.provider}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <p className="font-semibold">${tx.amount.toFixed(2)}</p>
                    <Badge
                      variant={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'outline'}
                      className="text-xs capitalize"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
