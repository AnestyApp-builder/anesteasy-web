'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

export type WorkspaceType = 'personal' | 'group'

export interface GroupWorkspace {
  id: string
  name: string
  color: string
}

interface WorkspaceContextData {
  workspaceType: WorkspaceType
  currentGroupId: string | null
  userGroups: GroupWorkspace[]
  setWorkspace: (type: WorkspaceType, groupId?: string | null) => void
  loadingGroups: boolean
}

const WorkspaceContext = createContext<WorkspaceContextData>({} as WorkspaceContextData)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<GroupWorkspace[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)

  // Load user groups for the context switcher
  const fetchGroups = useCallback(async () => {
    if (!user?.id) {
      setUserGroups([])
      setLoadingGroups(false)
      return
    }

    try {
      setLoadingGroups(true)
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .is('groups.deleted_at', null)

      if (error) throw error

      const groups = data
        .map(item => item.groups)
        .filter(g => g !== null) as unknown as GroupWorkspace[]
      
      setUserGroups(groups)
    } catch (e) {
      console.error('Error fetching user groups for workspace context:', e)
    } finally {
      setLoadingGroups(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups()
    } else {
      setWorkspaceType('personal')
      setCurrentGroupId(null)
      setUserGroups([])
    }
  }, [isAuthenticated, fetchGroups])

  // Optional: load saved workspace from localStorage on mount
  useEffect(() => {
    if (isAuthenticated) {
      const savedType = localStorage.getItem('anesteasy_workspace_type') as WorkspaceType | null
      const savedGroupId = localStorage.getItem('anesteasy_workspace_group')
      
      if (savedType === 'group' && savedGroupId) {
        setWorkspaceType('group')
        setCurrentGroupId(savedGroupId)
      } else {
        setWorkspaceType('personal')
        setCurrentGroupId(null)
      }
    }
  }, [isAuthenticated])

  const setWorkspace = (type: WorkspaceType, groupId: string | null = null) => {
    setWorkspaceType(type)
    setCurrentGroupId(groupId)
    
    // Save to localStorage
    localStorage.setItem('anesteasy_workspace_type', type)
    if (groupId) {
      localStorage.setItem('anesteasy_workspace_group', groupId)
    } else {
      localStorage.removeItem('anesteasy_workspace_group')
    }
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaceType,
      currentGroupId,
      userGroups,
      setWorkspace,
      loadingGroups
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
