'use client';

import React from 'react';
import { TrendingUp, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { FinancialSummary } from '@/lib/financial/types';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  onNavigate?: (status: string) => void;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ summary, onNavigate }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85; // card takes ~85% of width
    const newIndex = Math.round(scrollLeft / cardWidth);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const cards = [
    {
      title: 'Total Produzido',
      value: formatCurrency(summary.totalProduced),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      status: 'all'
    },
    {
      title: 'Total Recebido',
      value: formatCurrency(summary.totalReceived),
      icon: CheckCircle2,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      status: 'paid'
    },
    {
      title: 'Total Pendente',
      value: formatCurrency(summary.totalPending),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      status: 'pending'
    },
    {
      title: 'Total em Atraso',
      value: formatCurrency(summary.totalLate),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
      status: 'late'
    },
  ];

  return (
    <div className="w-full">
      {/* Mobile Carousel */}
      <div className="block sm:hidden">
        <div 
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          onScroll={handleScroll}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {cards.map((card, index) => (
            <Card 
              key={index} 
              className={`min-w-[55%] snap-center relative overflow-hidden border ${card.borderColor} shadow-sm active:scale-95 transition-all duration-200`}
              onClick={() => onNavigate?.(card.status)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`p-2 rounded-xl ${card.bgColor} mb-2`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {card.value}
                  </h3>
                </div>
                <ArrowRight className="absolute top-3 right-3 w-3 h-3 text-slate-300" />
              </CardContent>
              <div className={`absolute bottom-0 left-0 h-1 w-full ${card.color.replace('text', 'bg')} opacity-30`} />
            </Card>
          ))}
        </div>
        
        {/* Pagination Indicators */}
        <div className="flex justify-center gap-1 mt-1.5">
          {cards.map((_, index) => (
            <div 
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-5 bg-teal-600' : 'w-1 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            className={`relative overflow-hidden border ${card.borderColor} hover:shadow-md transition-all duration-300 cursor-pointer group`}
            onClick={() => onNavigate?.(card.status)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={`p-2.5 rounded-xl ${card.bgColor} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <ArrowRight className="absolute top-3 right-3 w-3 h-3 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
            </CardContent>
            <div className={`absolute bottom-0 left-0 h-1 w-full ${card.color.replace('text', 'bg')} opacity-30`} />
          </Card>
        ))}
      </div>
    </div>
  );
};
