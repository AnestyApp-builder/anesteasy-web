export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AnestEasy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Gestão Financeira Inteligente para Anestesistas
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              Entrar
            </a>
            <a href="/register" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300">
              Cadastrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
