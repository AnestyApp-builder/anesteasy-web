import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Stethoscope, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'Erro ao enviar email. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-500 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Link>
            
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-secondary-800 mb-2">
              Email Enviado!
            </h1>
            <p className="text-secondary-600 mb-8">
              Enviamos um link para redefinir sua senha para <strong>{email}</strong>
            </p>
            
            <Card>
              <div className="text-center space-y-4">
                <p className="text-secondary-600">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <p className="text-sm text-secondary-500">
                  Não recebeu o email? Verifique sua pasta de spam ou{' '}
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-primary-600 hover:text-primary-500 font-medium"
                  >
                    tente novamente
                  </button>
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Voltar ao Login
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-500 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Link>
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-secondary-800 mb-2">
            Esqueceu a senha?
          </h1>
          <p className="text-secondary-600">
            Digite seu email e enviaremos um link para redefinir sua senha
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary-600" />
              </div>
              <p className="text-sm text-secondary-600">
                Enviaremos as instruções para o seu email
              </p>
            </div>
            
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Lembrou da senha?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Voltar ao login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
