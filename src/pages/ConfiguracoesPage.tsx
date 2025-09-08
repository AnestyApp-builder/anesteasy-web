import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  CreditCard,
  Save,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Edit,
  Plus,
  Download,
  Upload,
  Camera,
  Globe,
  Lock,
  Unlock,
  Stethoscope,
  ArrowUpRight,
  BarChart3,
  FileText,
  DollarSign,
  Activity
} from 'lucide-react';
import { LogoutButton } from '../components/auth/LogoutButton';

export const ConfiguracoesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: 'Dr. João Silva',
    email: 'joao.silva@email.com',
    specialty: 'Anestesiologia',
    crm: '12345-SP'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    paymentReminders: true,
    newProcedures: true,
    monthlyReports: true,
    systemUpdates: false
  });

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User, description: 'Informações pessoais' },
    { id: 'security', name: 'Segurança', icon: Shield, description: 'Senha e autenticação' },
    { id: 'notifications', name: 'Notificações', icon: Bell, description: 'Preferências de alertas' },
    { id: 'billing', name: 'Cobrança', icon: CreditCard, description: 'Plano e pagamentos' }
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Perfil atualizado:', profileData);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Senha atualizada');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      alert('Erro ao atualizar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Notificações atualizadas:', notificationSettings);
      alert('Preferências salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
      alert('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileTab = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações Pessoais</h3>
          <p className="text-sm text-gray-600">Atualize suas informações de perfil</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidade</label>
            <input
              type="text"
              value={profileData.specialty}
              onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder="Sua especialidade"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CRM</label>
            <input
              type="text"
              value={profileData.crm}
              onChange={(e) => setProfileData({ ...profileData, crm: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder="Seu CRM"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <form onSubmit={handlePasswordUpdate} className="space-y-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Alterar Senha</h3>
          <p className="text-sm text-gray-600">Mantenha sua conta segura com uma senha forte</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha Atual</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirme sua nova senha"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Atualizando...' : 'Atualizar Senha'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <div className="space-y-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Preferências de Notificação</h3>
          <p className="text-sm text-gray-600">Configure como você deseja receber notificações</p>
        </div>

        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Notificações por E-mail', description: 'Receber notificações importantes por e-mail' },
            { key: 'paymentReminders', label: 'Lembretes de Pagamento', description: 'Lembretes sobre pagamentos pendentes' },
            { key: 'newProcedures', label: 'Novos Procedimentos', description: 'Notificações quando novos procedimentos são cadastrados' },
            { key: 'monthlyReports', label: 'Relatórios Mensais', description: 'Receber relatórios mensais de performance' },
            { key: 'systemUpdates', label: 'Atualizações do Sistema', description: 'Notificações sobre atualizações e melhorias' }
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    [setting.key]: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleNotificationUpdate} 
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Preferências'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Plano Atual</h3>
          <p className="text-sm text-gray-600">Gerencie sua assinatura e cobrança</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-emerald-800">Plano Profissional</h4>
              <p className="text-sm text-emerald-600">Acesso completo a todas as funcionalidades</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-800">R$ 49,90</p>
              <p className="text-sm text-emerald-600">por mês</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <button className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
            Alterar Plano
          </button>
          <button className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
            Cancelar Assinatura
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Método de Pagamento</h3>
          <p className="text-sm text-gray-600">Gerencie seus métodos de pagamento</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-6 bg-blue-100 rounded flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">**** **** **** 1234</p>
                <p className="text-sm text-gray-600">Visa • Expira em 12/25</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200">
              Editar
            </button>
          </div>

          <button className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
            Adicionar Novo Cartão
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'billing':
        return renderBillingTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Sidebar Premium */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-10">
        {/* Logo Section */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AnestEasy
              </h1>
              <p className="text-sm text-gray-500 font-medium">Gestão Profissional</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <div className="space-y-3">
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Principal</p>
            </div>
            
            <a href="/dashboard" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Dashboard</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/procedimentos" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Procedimentos</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/financeiro" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Financeiro</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/relatorios" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Relatórios</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <div className="pt-6 border-t border-gray-100 mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configurações</p>
              <a href="/configuracoes" className="group flex items-center space-x-4 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg transform transition-all duration-200 hover:scale-[1.02]">
                <Settings className="w-5 h-5" />
                <span>Preferências</span>
                <div className="ml-auto w-2 h-2 bg-white/30 rounded-full"></div>
              </a>
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="text-emerald-600 font-bold text-lg">D</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">Dr. Usuário</p>
              <p className="text-sm text-gray-500 truncate">Anestesiologista</p>
            </div>
          </div>
          
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-72 flex-1 p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Configurações</h1>
            <p className="text-lg text-gray-600">Gerencie suas preferências e configurações da conta</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
              <Download className="w-4 h-4" />
              <span>Exportar Dados</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tabs.map((tab) => (
            <div 
              key={tab.id} 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white rounded-xl p-6 shadow-lg border ${
                activeTab === tab.id 
                  ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-200' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    activeTab === tab.id ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {tab.name}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {tab.description}
              </p>
              {activeTab === tab.id && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Ativo
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};