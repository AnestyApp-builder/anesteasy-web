'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { getUserGroups, createGroup, getPendingInvites, acceptInvite } from '@/lib/groups'
import { supabase } from '@/lib/supabase'
import { Plus, Users, Settings, Bell, Check, X, Shield, Info } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'

export default function GruposPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [groups, setGroups] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6')
  const [newGroupType, setNewGroupType] = useState<'com_cotas' | 'sem_cotas'>('sem_cotas')
  const [newGroupBillingType, setNewGroupBillingType] = useState<'individual' | 'centralized'>('individual')
  const [newGroupCnpj, setNewGroupCnpj] = useState('')
  const [isPremium, setIsPremium] = useState(false)

  const handleCnpjChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14)
    let formatted = clean
    if (clean.length > 12) {
      formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`
    } else if (clean.length > 8) {
      formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`
    } else if (clean.length > 5) {
      formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
    } else if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`
    }
    setNewGroupCnpj(formatted)
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [userGroups, invites, { data: userData }] = await Promise.all([
        getUserGroups(),
        getPendingInvites(user!.id),
        supabase.from('subscriptions').select('id').eq('user_id', user!.id).eq('status', 'active').maybeSingle()
      ])
      setGroups(userGroups || [])
      setPendingInvites(invites || [])
      setIsPremium(!!userData)
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
      addToast({ title: 'Não foi possível carregar os grupos.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    try {
      await createGroup({
        name: newGroupName,
        color: newGroupColor,
        share_financials: false,
        type: newGroupType,
        billing_type: newGroupBillingType,
        cnpj: newGroupCnpj ? newGroupCnpj.replace(/\D/g, '') : null
      }, user!.id)
      
      addToast({ title: 'Grupo criado com sucesso!', variant: 'success' })
      setIsCreating(false)
      setNewGroupName('')
      setNewGroupType('sem_cotas')
      setNewGroupBillingType('individual')
      setNewGroupCnpj('')
      loadData()
    } catch (error) {
      addToast({ title: 'Erro ao criar grupo.', variant: 'error' })
    }
  }

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvite(inviteId)
      addToast({ title: 'Convite aceito!', variant: 'success' })
      loadData()
    } catch (error) {
      addToast({ title: 'Erro ao aceitar convite.', variant: 'error' })
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Meus Grupos</h1>
              <p className="text-slate-500 mt-1">Gerencie suas equipes e agendas compartilhadas.</p>
            </div>
            {(() => {
              const isAlreadyAdmin = groups.some(group => 
                group.group_members.some((m: any) => m.user_id === user?.id && m.role === 'admin')
              );
              
              if (isAlreadyAdmin) {
                return null; // Não mostra botão se já for admin de um grupo
              }

              return isPremium ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-teal-200"
                >
                  <Plus className="w-5 h-5" />
                  Criar Novo Grupo
                </button>
              ) : (
                <Link
                  href="/planos"
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-200"
                >
                  <Shield className="w-5 h-5" />
                  Assinar Premium para Criar Grupo
                </Link>
              );
            })()}
          </div>


          {/* Convites Pendentes */}
          {pendingInvites.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-amber-800">
                <Bell className="w-6 h-6 animate-bounce" />
                <h2 className="text-xl font-semibold">Convites Pendentes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: invite.groups.color }}
                      >
                        {invite.groups.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{invite.groups.name}</p>
                        <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">Convite de Grupo</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptInvite(invite.id)}
                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Aceitar"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Grupos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              // Skeletons
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white h-48 rounded-2xl border border-slate-100 animate-pulse shadow-sm"></div>
              ))
            ) : groups.length > 0 ? (
              groups.map((group) => (
                <Link 
                  key={group.id} 
                  href={`/grupos/${group.id}`}
                  className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[200px]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: group.color }}
                    >
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${group.type === 'com_cotas' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                        {group.type === 'com_cotas' ? 'Com Cotas' : 'Sem Cotas'}
                      </span>
                      <div className="p-2 text-slate-400 group-hover:text-teal-600 transition-colors">
                        <Settings className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-teal-600 transition-colors">
                    {group.name}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-teal-500" />
                      <span>{group.group_members.find((m: any) => m.user_id === user?.id)?.role === 'admin' ? 'Administrador' : 'Membro'}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>Ver detalhes</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Você ainda não tem grupos</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Crie um grupo para colaborar com outros anestesistas e gerenciar uma agenda unificada.
                </p>
                {isPremium ? (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-teal-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
                  >
                    Começar Agora
                  </button>
                ) : (
                  <Link
                    href="/planos"
                    className="inline-flex bg-amber-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-200"
                  >
                    Assinar Plano Premium
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Criação */}
        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Novo Grupo</h2>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Grupo</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                    placeholder="Ex: Equipe Central de Anestesia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Repasse</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewGroupType('sem_cotas')}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${newGroupType === 'sem_cotas' ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <span className="font-bold text-slate-900 text-xs">Sem Cotas</span>
                      <span className="text-[10px] text-slate-500 leading-snug mt-1">Repasse simples por procedimento realizado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupType('com_cotas')}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${newGroupType === 'com_cotas' ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <span className="font-bold text-slate-900 text-xs">Com Cotas</span>
                      <span className="text-[10px] text-slate-500 leading-snug mt-1">Divisão de faturamento do grupo com base em cotas (%)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quem paga pelas assinaturas?</label>
                  <select
                    value={newGroupBillingType}
                    onChange={(e: any) => setNewGroupBillingType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="individual">Individual (Cada um paga o seu)</option>
                    <option value="centralized">Centralizado (Grupo paga tudo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CNPJ do Grupo (Opcional)</label>
                  <input
                    type="text"
                    value={newGroupCnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cor do Grupo</label>
                  <div className="flex gap-3 flex-wrap">
                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGroupColor(color)}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${newGroupColor === color ? 'ring-4 ring-offset-2 ring-teal-500 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      >
                        {newGroupColor === color && <Check className="w-5 h-5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-teal-50 p-4 rounded-xl flex gap-3 text-teal-700 text-sm">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <p>Você será definido como o administrador deste grupo e poderá convidar outros membros.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-teal-200"
                >
                  Criar Grupo
                </button>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  )
}
