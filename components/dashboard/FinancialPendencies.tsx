'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Send, Calendar, ShieldAlert, Eye, Check, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Procedure } from '@/lib/procedures';

const MotionDiv = dynamic(() => import('framer-motion').then(mod => ({ default: mod.motion.div })), { ssr: false });

interface FinancialPendenciesProps {
  pendingSends: Procedure[];
  nearPayments: Procedure[];
  latePayments: Procedure[];
  onAction?: (action: string, procedureId?: string) => void;
}

export const FinancialPendencies: React.FC<FinancialPendenciesProps> = ({
  pendingSends,
  nearPayments,
  latePayments,
  onAction
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(true);

  React.useEffect(() => {
    const lastDismissed = localStorage.getItem('pendencies_dismissed_date');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastDismissed !== today) {
      setIsDismissed(false);
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pendencies_dismissed_date', today);
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300); // Aguarda animação
  };

  const hasPendencies = pendingSends.length > 0 || nearPayments.length > 0 || latePayments.length > 0;

  if (!hasPendencies || isDismissed) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -20 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : -20,
        height: isVisible ? 'auto' : 0
      }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="mb-8 relative group/section">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            Pendências e Alertas
          </h2>
          <button 
            onClick={handleDismiss}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded-lg font-bold uppercase transition-colors flex items-center gap-1"
          >
            <span>Fechar por hoje</span>
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
 
        <div className="flex flex-col gap-3 px-1">
          {/* Atrasos Críticos */}
          {latePayments.length > 0 && (
            <MotionDiv
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction?.('view_critical_delays')}
              className="relative overflow-hidden bg-white border-l-4 border-l-red-500 border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Crítico</span>
                    <h3 className="text-sm font-bold text-gray-900">Atrasos Graves</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-extrabold text-red-600 text-sm">{latePayments.length}</span> itens aguardando há mais de <span className="font-bold text-gray-900">90 dias</span>.
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* Próximos do vencimento */}
          {nearPayments.length > 0 && (
            <MotionDiv
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction?.('view_near_payments')}
              className="relative overflow-hidden bg-white border-l-4 border-l-blue-500 border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Previsão</span>
                    <h3 className="text-sm font-bold text-gray-900">Recebimentos</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-extrabold text-blue-600 text-sm">{nearPayments.length}</span> pagamentos previstos para os próximos <span className="font-bold text-gray-900">5 dias</span>.
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}
        </div>
      </div>
    </MotionDiv>
  );
};
