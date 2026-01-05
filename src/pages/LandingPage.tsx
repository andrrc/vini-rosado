import { Link } from 'react-router-dom'
import { Sparkles, Shield, FileText, AlertTriangle, Upload } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">Valida AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white transition-colors text-sm sm:text-base"
            >
              Entrar
            </Link>
            <Link
              to="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Banner */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
              <span className="text-xs sm:text-sm text-blue-300">Inteligência Artificial para Shopee</span>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-center mb-4 sm:mb-6 leading-tight px-2">
            Pare de Perder Vendas na Shopee por{' '}
            <span className="text-gradient">Anúncios Ruins</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-400 text-center max-w-2xl mx-auto mb-8 sm:mb-12 px-4">
            A inteligência artificial que valida e cria seus títulos e descrições. 
            Tenha segurança total antes de publicar seu produto.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-12 sm:mb-16 px-4">
            <Link
              to="/login"
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg flex items-center justify-center gap-2 transition-all hover:shadow-glow-blue"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
            >
              Área do Aluno
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg mb-3 sm:mb-4">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">10.000+</div>
              <div className="text-sm sm:text-base text-slate-400">Anúncios Validados</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg mb-3 sm:mb-4">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">2.500+</div>
              <div className="text-sm sm:text-base text-slate-400">Alunos Ativos</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg mb-3 sm:mb-4">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">47%</div>
              <div className="text-sm sm:text-base text-slate-400">Mais Conversões</div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-glow-blue-lg mb-12 sm:mb-20">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Valida AI - Dashboard</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl p-8 sm:p-12 text-center">
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-slate-400">Upload de Imagens</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-2">Arraste suas fotos aqui</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-6">
                <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Resultado Gerado</h4>
                <div className="space-y-2">
                  <div className="h-3 sm:h-4 bg-slate-800 rounded w-full"></div>
                  <div className="h-3 sm:h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems & Solutions */}
      <section className="py-20 px-6 bg-slate-950/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Seus Problemas,{' '}
            <span className="text-gradient">Nossa Solução</span>
          </h2>
          <p className="text-xl text-slate-400 text-center max-w-2xl mx-auto mb-16">
            Entendemos as dificuldades de criar anúncios que vendem. Nossa IA resolve cada uma delas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Insegurança no Título?</h3>
              <p className="text-slate-400">
                Nossa IA usa as palavras-chave mais buscadas para criar títulos que rankeiam.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Descrição Fraca?</h3>
              <p className="text-slate-400">
                Geramos textos persuasivos formatados que vendem mais.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Medo de Errar?</h3>
              <p className="text-slate-400">
                Valide seu anúncio com visão computacional antes de postar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 sm:py-8 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-base sm:text-lg font-bold text-white">Valida AI</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">© 2025 Todos os direitos reservados.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base text-slate-400">
            <Link to="/login" className="hover:text-white transition-colors">
              Área do Aluno
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
