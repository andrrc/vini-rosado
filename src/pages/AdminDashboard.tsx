import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProfileWithStats, GenerationWithUser } from '../types/database'
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  Shield, 
  Ban, 
  CheckCircle2,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    copiesToday: 0,
    errorRate: 0,
  })
  const [users, setUsers] = useState<ProfileWithStats[]>([])
  const [recentGenerations, setRecentGenerations] = useState<GenerationWithUser[]>([])
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadRecentGenerations(),
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Copys geradas hoje
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: copiesToday } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Taxa de erros
      const { count: totalGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
      
      const { count: errorGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'erro')

      const errorRate = totalGenerations && totalGenerations > 0
        ? Math.round((errorGenerations || 0) / totalGenerations * 100)
        : 0

      setStats({
        totalUsers: totalUsers || 0,
        copiesToday: copiesToday || 0,
        errorRate,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar contagem de gerações para cada usuário
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          const { count } = await supabase
            .from('generations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          return {
            ...user,
            total_generations: count || 0,
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const loadRecentGenerations = async () => {
    try {
      const { data: generationsData, error } = await supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Buscar perfis dos usuários
      const userIds = [...new Set((generationsData || []).map((g: any) => g.user_id))]
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', userIds)

      // Combinar dados
      const generations = (generationsData || []).map((gen: any) => {
        const profile = profilesData?.find((p) => p.id === gen.user_id)
        return {
          ...gen,
          profiles: profile || { email: 'Usuário desconhecido', name: null },
        }
      })

      setRecentGenerations(generations)
    } catch (error) {
      console.error('Erro ao carregar gerações recentes:', error)
    }
  }

  const toggleBanUser = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'desbanir' : 'banir'} este usuário?`)) {
      return
    }

    setUpdatingUser(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      await loadUsers()
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error)
      alert('Erro ao atualizar status do usuário. Tente novamente.')
    } finally {
      setUpdatingUser(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return (
          <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20">
            Concluído
          </span>
        )
      case 'erro':
        return (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20">
            Erro
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs border border-orange-500/20">
            Processando
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
              <span>Painel Administrativo</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400">
              Gerencie usuários e monitore o sistema
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
              <span className="sm:hidden">Voltar</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-slate-400 text-xs sm:text-sm font-medium">Total de Usuários</h3>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-slate-400 text-xs sm:text-sm font-medium">Copys Geradas Hoje</h3>
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.copiesToday}</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-slate-400 text-xs sm:text-sm font-medium">Taxa de Erros</h3>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.errorRate}%</p>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Usuários</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium">Usuário</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium">E-mail</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium hidden md:table-cell">Cadastro</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium">Gerações</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userProfile) => (
                    <tr key={userProfile.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm sm:text-base flex-shrink-0">
                            {userProfile.name?.[0]?.toUpperCase() || userProfile.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium text-xs sm:text-sm truncate">
                              {userProfile.name || 'Sem nome'}
                            </p>
                            {userProfile.is_admin && (
                              <span className="text-xs text-blue-400">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{userProfile.email}</td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm hidden md:table-cell">
                        {formatDate(userProfile.created_at)}
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-300 text-xs sm:text-sm">{userProfile.total_generations || 0}</td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        {userProfile.is_banned ? (
                          <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20 whitespace-nowrap">
                            Banido
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20 whitespace-nowrap">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <button
                          onClick={() => toggleBanUser(userProfile.id, userProfile.is_banned)}
                          disabled={updatingUser === userProfile.id}
                          className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-medium transition-colors ${
                            userProfile.is_banned
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          } disabled:opacity-50 whitespace-nowrap`}
                        >
                          {updatingUser === userProfile.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : userProfile.is_banned ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Desbanir</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              <span className="hidden sm:inline">Banir</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feed Global de Gerações */}
        <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Últimas Gerações</h2>
          <div className="space-y-3 sm:space-y-4">
            {recentGenerations.map((generation) => (
              <div
                key={generation.id}
                className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
                        {generation.profiles?.name?.[0]?.toUpperCase() || generation.profiles?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-xs sm:text-sm truncate">
                          {generation.profiles?.name || generation.profiles?.email || 'Usuário desconhecido'}
                        </p>
                        <p className="text-slate-400 text-xs truncate">{generation.profiles?.email}</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm mb-1 break-words">
                      <span className="text-slate-400">Produto:</span> {generation.product_name || 'N/A'}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {formatDate(generation.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
                    {getStatusBadge(generation.status)}
                    <button
                      onClick={() => navigate(`/app/analise/${generation.id}`)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium whitespace-nowrap"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {recentGenerations.length === 0 && (
              <p className="text-slate-400 text-center py-8">Nenhuma geração encontrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

