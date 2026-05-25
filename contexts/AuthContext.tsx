'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User, authService } from '@/lib/auth'
import { createClient } from '@/utils/supabase/client'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isEmailConfirmed: boolean
  isLoading: boolean
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<boolean>
  deleteAccount: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const loadUser = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null)
      setIsEmailConfirmed(false)
      setIsLoading(false)
      return
    }

    try {
      // Fetch profile data from API (to bypass RLS if needed, or use direct supabase if RLS is fixed)
      const fetchResponse = await fetch('/api/admin/get-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: sessionUser.id })
      })
      
      let userData = null
      if (fetchResponse.ok) {
        const fetchResult = await fetchResponse.json()
        if (fetchResult.exists && fetchResult.data) {
          userData = fetchResult.data
        }
      }

      const currentUser: User = {
        id: sessionUser.id,
        email: sessionUser.email || userData?.email || '',
        name: userData?.name || sessionUser.user_metadata?.name || 'Usuário',
        specialty: userData?.specialty || sessionUser.user_metadata?.specialty || 'Anestesiologia',
        crm: userData?.crm || sessionUser.user_metadata?.crm || '000000',
        gender: userData?.gender || null,
        phone: userData?.phone || null,
        trialEndsAt: userData?.trial_ends_at || null
      }

      setUser(currentUser)
      setIsEmailConfirmed(!!sessionUser.email_confirmed_at)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser(session?.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsEmailConfirmed(false)
        setIsLoading(false)
      }
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/secretary/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Erro ao efetuar logout da secretária:', error)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  const updateUser = React.useCallback(async (userData: Partial<User>) => {
    if (!user) return false
    try {
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id)
      
      if (!error) {
        setUser(prev => prev ? { ...prev, ...userData } : null)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }, [user, supabase])

  const deleteAccount = React.useCallback(async () => {
    if (!user) return false
    try {
      const result = await authService.deleteAccount(user.id)
      if (result.success) {
        await logout()
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }, [user, logout])

  const value = React.useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isEmailConfirmed,
    isLoading,
    logout,
    updateUser,
    deleteAccount
  }), [user, isEmailConfirmed, isLoading, logout, updateUser, deleteAccount])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
