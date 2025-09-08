'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '../components/layout/Layout';
import { ProcedureForm } from '../components/forms/ProcedureForm';
import { Procedure } from '../types';

export const ProcedimentoFormPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProcedure = async (procedureData: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui você faria a chamada para a API
      console.log('Novo procedimento:', procedureData);
      
      // Redirecionar para a lista de procedimentos
      router.push('/procedimentos');
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/procedimentos');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-800">Novo Procedimento</h1>
          <p className="text-secondary-600">Cadastre um novo procedimento anestésico</p>
        </div>
        
        <ProcedureForm
          onSubmit={handleCreateProcedure}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
};
