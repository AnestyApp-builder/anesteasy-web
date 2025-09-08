import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Clock,
  DollarSign,
  User,
  Building2 as Hospital,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { useProcedures } from '@/hooks/useProcedures';

// Mock data para demonstração
const mockProcedures = [
  {
    id: '1',
    patient_name: 'Maria Silva Santos',
    procedure_name: 'Anestesia Geral para Cirurgia Cardíaca',
    procedure_type: 'Anestesia Geral',
    procedure_date: '2024-12-08',
    procedure_time: '08:00',
    duration_minutes: 180,
    procedure_value: 2500,
    payment_status: 'paid',
    hospital_clinic: 'Hospital do Coração',
    surgeon_name: 'Dr. João Cardiologista',
    room_number: 'Sala 3',
    patient_age: 65,
    patient_gender: 'F',
    notes: 'Paciente com histórico de hipertensão. Procedimento sem intercorrências.',
    created_at: '2024-12-08T08:00:00Z'
  },
  {
    id: '2',
    patient_name: 'João Pedro Costa',
    procedure_name: 'Raquidiana para Cesariana',
    procedure_type: 'Raquidiana',
    procedure_date: '2024-12-07',
    procedure_time: '14:30',
    duration_minutes: 45,
    procedure_value: 800,
    payment_status: 'pending',
    hospital_clinic: 'Maternidade Santa Maria',
    surgeon_name: 'Dra. Ana Obstetra',
    room_number: 'Sala 1',
    patient_age: 28,
    patient_gender: 'F',
    notes: 'Primeira gestação. Paciente ansiosa, tranquilizada antes do procedimento.',
    created_at: '2024-12-07T14:30:00Z'
  },
  {
    id: '3',
    patient_name: 'Carlos Mendes',
    procedure_name: 'Sedação para Endoscopia',
    procedure_type: 'Sedação',
    procedure_date: '2024-12-06',
    procedure_time: '10:15',
    duration_minutes: 30,
    procedure_value: 600,
    payment_status: 'paid',
    hospital_clinic: 'Clínica Gastro Center',
    surgeon_name: 'Dr. Paulo Gastro',
    room_number: 'Sala 2',
    patient_age: 45,
    patient_gender: 'M',
    notes: 'Exame de rotina. Paciente colaborativo.',
    created_at: '2024-12-06T10:15:00Z'
  },
];

interface ProcedureCardProps {
  procedure: any;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

const ProcedureCard: React.FC<ProcedureCardProps> = ({ procedure, onEdit, onDelete, onView }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary-100 text-primary-700 text-sm font-medium">
                {procedure.patient_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {procedure.patient_name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {procedure.procedure_name}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge(procedure.payment_status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView?.(procedure.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(procedure.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem 
                  onClick={() => onDelete?.(procedure.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{new Date(procedure.procedure_date).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{formatDuration(procedure.duration_minutes)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="font-medium">R$ {procedure.procedure_value.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Hospital className="w-4 h-4 text-gray-400" />
            <span className="truncate">{procedure.hospital_clinic}</span>
          </div>
        </div>

        <Separator />

        {/* Detalhes adicionais */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tipo:</span>
            <Badge variant="outline" className="text-xs">
              {procedure.procedure_type}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Cirurgião:</span>
            <span className="font-medium text-gray-900">{procedure.surgeon_name}</span>
          </div>
          {procedure.room_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sala:</span>
              <span className="text-gray-900">{procedure.room_number}</span>
            </div>
          )}
        </div>

        {procedure.notes && (
          <>
            <Separator />
            <div className="text-sm text-gray-600">
              <p className="line-clamp-2">{procedure.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por paciente, procedimento ou hospital..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Anestesia Geral">Anestesia Geral</SelectItem>
                <SelectItem value="Raquidiana">Raquidiana</SelectItem>
                <SelectItem value="Peridural">Peridural</SelectItem>
                <SelectItem value="Sedação">Sedação</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PremiumProceduresView: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Mock data - em produção, usar o hook useProcedures
  const [procedures] = useState(mockProcedures);

  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch = 
      procedure.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.hospital_clinic.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || procedure.payment_status === statusFilter;
    const matchesType = typeFilter === 'all' || procedure.procedure_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTabCount = (status: string) => {
    if (status === 'all') return procedures.length;
    return procedures.filter(p => p.payment_status === status).length;
  };

  const handleEdit = (id: string) => {
    console.log('Edit procedure:', id);
    // Implementar navegação para edição
  };

  const handleDelete = (id: string) => {
    console.log('Delete procedure:', id);
    // Implementar confirmação e exclusão
  };

  const handleView = (id: string) => {
    console.log('View procedure:', id);
    // Implementar modal ou navegação para visualização
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Procedimentos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todos os seus procedimentos anestésicos
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Procedimento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{procedures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pagos</p>
                <p className="text-2xl font-bold text-gray-900">{getTabCount('paid')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{getTabCount('pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {procedures.reduce((sum, p) => sum + p.procedure_value, 0).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="all">
            Todos ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Pagos ({getTabCount('paid')})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({getTabCount('pending')})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelados ({getTabCount('cancelled')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredProcedures.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum procedimento encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Tente ajustar os filtros ou criar um novo procedimento.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Procedimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProcedures.map((procedure) => (
                <ProcedureCard
                  key={procedure.id}
                  procedure={procedure}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
