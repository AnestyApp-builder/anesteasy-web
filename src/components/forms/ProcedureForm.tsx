import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Procedure } from '../../types';
import { Calendar, User, DollarSign, FileText } from 'lucide-react';

interface ProcedureFormProps {
  procedure?: Procedure;
  onSubmit: (procedure: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProcedureForm: React.FC<ProcedureFormProps> = ({
  procedure,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: procedure?.name || '',
    description: procedure?.description || '',
    value: procedure?.value || 0,
    date: procedure?.date ? new Date(procedure.date).toISOString().split('T')[0] : '',
    patientName: procedure?.patientName || '',
    patientAge: procedure?.patientAge || 0,
    patientGender: procedure?.patientGender || 'F',
    status: procedure?.status || 'pending',
    notes: procedure?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'value' || name === 'patientAge' ? Number(value) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do procedimento é obrigatório';
    }

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Nome do paciente é obrigatório';
    }

    if (formData.value <= 0) {
      newErrors.value = 'Valor deve ser maior que zero';
    }

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (formData.patientAge <= 0 || formData.patientAge > 120) {
      newErrors.patientAge = 'Idade deve estar entre 1 e 120 anos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      name: formData.name,
      description: formData.description,
      value: formData.value,
      date: new Date(formData.date),
      patientName: formData.patientName,
      patientAge: formData.patientAge,
      patientGender: formData.patientGender as 'M' | 'F',
      status: formData.status as 'pending' | 'paid' | 'cancelled',
      notes: formData.notes
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Nome do Procedimento"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Ex: Anestesia Geral - Cirurgia Cardíaca"
              icon={<FileText className="w-5 h-5 text-secondary-400" />}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              placeholder="Descrição detalhada do procedimento..."
            />
          </div>

          <Input
            label="Valor (R$)"
            name="value"
            type="number"
            step="0.01"
            min="0"
            value={formData.value}
            onChange={handleChange}
            error={errors.value}
            placeholder="0,00"
            icon={<DollarSign className="w-5 h-5 text-secondary-400" />}
          />

          <Input
            label="Data do Procedimento"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            icon={<Calendar className="w-5 h-5 text-secondary-400" />}
          />

          <Input
            label="Nome do Paciente"
            name="patientName"
            value={formData.patientName}
            onChange={handleChange}
            error={errors.patientName}
            placeholder="Nome completo do paciente"
            icon={<User className="w-5 h-5 text-secondary-400" />}
          />

          <Input
            label="Idade do Paciente"
            name="patientAge"
            type="number"
            min="1"
            max="120"
            value={formData.patientAge}
            onChange={handleChange}
            error={errors.patientAge}
            placeholder="Idade"
          />

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Sexo do Paciente
            </label>
            <select
              name="patientGender"
              value={formData.patientGender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            >
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Status do Pagamento
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              placeholder="Observações adicionais sobre o procedimento..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : procedure ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
