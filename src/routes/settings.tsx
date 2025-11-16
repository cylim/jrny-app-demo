'use client'

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Github, Linkedin, Twitter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PrivacySettingsPanel } from '@/components/privacy/privacy-settings-panel'
import { BillingHistory } from '@/components/subscription/billing-history'
import { CancelSubscription } from '@/components/subscription/cancel-subscription'
import { SubscriptionStatus } from '@/components/subscription/subscription-status'
import { UpgradeButton } from '@/components/subscription/upgrade-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { User } from '@/types/user'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

/**
 * Render the Settings page that lets a signed-in user view and edit profile, privacy, and social link settings.
 *
 * Initializes form state from the current user, redirects to "/" when no user is available, and provides per-section save handlers that call API mutations and show inline success or error messages.
 *
 * @returns The JSX element for the Settings page.
 */
function SettingsPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useSuspenseQuery(
    convexQuery(api.users.getCurrentUser, {}),
  )

  const updateProfile = useMutation(api.users.updateProfile)
  const updateSocialLinks = useMutation(api.users.updateSocialLinks)

  // Type the current user
  const typedUser = currentUser as User | null

  // Profile fields
  const [name, setName] = useState(typedUser?.name || '')
  const [username, setUsername] = useState(typedUser?.username || '')
  const [bio, setBio] = useState(typedUser?.bio || '')

  // Social links
  const [github, setGithub] = useState(typedUser?.socialLinks?.github || '')
  const [x, setX] = useState(typedUser?.socialLinks?.x || '')
  const [linkedin, setLinkedin] = useState(
    typedUser?.socialLinks?.linkedin || '',
  )
  const [telegram, setTelegram] = useState(
    typedUser?.socialLinks?.telegram || '',
  )

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      navigate({ to: '/' })
    }
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateProfile({ name, username, bio })

      if (result && !result.success) {
        setError(result.error || 'Failed to update profile')
        setIsSaving(false)
        return
      }
      setSuccess('Profile updated successfully')
    } catch {
      setError('An error occurred while updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSocialLinks = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateSocialLinks({ github, x, linkedin, telegram })

      if (result && !result.success) {
        setError(result.error || 'Failed to update social links')
      } else {
        setSuccess('Social links updated successfully')
      }
    } catch {
      setError('An error occurred while updating social links')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, subscription, and privacy settings
        </p>
      </div>

      {error && (
        <div className="mb-4 kirby-rounded-sm bg-destructive/15 p-4 text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 kirby-rounded-sm bg-green-500/15 p-4 text-green-600">
          {success}
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
                <p className="text-xs text-muted-foreground">
                  3-20 characters, letters, numbers, underscores, and hyphens
                  only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>

              <Button
                variant="kirby"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Add links to your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                </Label>
                <Input
                  id="github"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="x" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />X (Twitter)
                </Label>
                <Input
                  id="x"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  placeholder="https://x.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/username"
                />
              </div>

              <Button
                variant="kirby"
                onClick={handleSaveSocialLinks}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Social Links'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription tier and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Current Plan</Label>
                <div className="mt-2">
                  <SubscriptionStatus />
                </div>
              </div>

              <div className="flex gap-2">
                <UpgradeButton />
                <CancelSubscription />
              </div>

              {/* Billing History */}
              <div className="border-t pt-6">
                <BillingHistory />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your travel information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrivacySettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
