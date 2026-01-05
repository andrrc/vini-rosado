import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react'

export function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Se não estiver autenticado, redirecionar para login
        navigate('/login')
        return
      }

      // Verificar se realmente é primeiro acesso
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.is_first_access !== true) {
        // Se não for primeiro acesso, redirecionar para dashboard
        navigate('/app')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      // Atualizar senha e remover flag de primeiro acesso
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          is_first_access: false,
        },
      })

      if (updateError) throw updateError

      setSuccess(true)

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/app')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-white text-xl">Verificando...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-glow-blue-lg text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-500/10 rounded-full mb-3 sm:mb-4 border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Senha Definida!</h1>
            <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
              Sua senha foi atualizada com sucesso. Redirecionando...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">Valida AI</span>
          </div>
        </div>

        {/* Update Password Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-glow-blue-lg">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-full mb-3 sm:mb-4 border border-blue-500/20">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Definir Nova Senha</h1>
            <p className="text-sm sm:text-base text-slate-400">
              Esta é sua primeira vez aqui. Por favor, defina uma senha pessoal para sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Nova Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Digite a senha novamente"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-blue"
            >
              {loading ? 'Atualizando...' : 'Definir Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

