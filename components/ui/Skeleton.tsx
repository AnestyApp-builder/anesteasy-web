import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ 
  className, 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        variant === 'text' && 'h-4',
        variant === 'circular' && 'rounded-full',
        className
      )}
      style={{ width, height }}
      aria-label="Carregando..."
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  )
}

interface SkeletonProcedureListProps {
  count?: number
}

export function SkeletonProcedureList({ count = 5 }: SkeletonProcedureListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-4 animate-pulse"
        >
          <div className="flex flex-col gap-3">
            {/* Primeira linha: Nome + Status */}
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
            </div>
            {/* Segunda linha: Paciente + Valor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="space-y-1">
                  <Skeleton variant="text" width={120} height={16} />
                  <Skeleton variant="text" width={80} height={14} />
                </div>
              </div>
              <Skeleton variant="text" width={100} height={20} />
            </div>
            {/* Terceira linha: Data + Ações */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Skeleton variant="text" width={100} height={14} />
              <div className="flex gap-2">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface SkeletonStatsCardProps {
  showIcon?: boolean
}

export function SkeletonStatsCard({ showIcon = true }: SkeletonStatsCardProps) {
  return (
    <div className="min-w-[280px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="60%" height={16} />
        {showIcon && <Skeleton variant="circular" width={20} height={20} />}
      </div>
      <Skeleton variant="text" width="40%" height={32} />
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width="30%" height={14} />
      </div>
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
      <div className="h-48 sm:h-56 lg:h-64 w-full bg-gray-100 rounded-lg flex items-end justify-around p-4 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
        ))}
      </div>
    </div>
  )
}
