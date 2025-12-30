import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Plus, CheckCircle2, AlertCircle, Clock, Trash2, Shield, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Generation } from '../types/database'

export function HistoryDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadGenerations()
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setIsAdmin(data?.is_admin === true)
    } catch (error) {
      console.error('Erro ao verificar admin:', error)
    }
  }

  const loadGenerations = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) return

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setGenerations(data || [])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = [
      'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
      'jul', 'ago', 'set', 'out', 'nov', 'dez'
    ]
    return `${date.getDate()} de ${months[date.getMonth()]}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Concluído
          </div>
        )
      case 'erro':
        return (
          <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-medium border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            Erro
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-xs font-medium border border-orange-500/20">
            <Clock className="w-3 h-3" />
            Aguardando geração...
          </div>
        )
    }
  }

  const getImageUrl = (generation: Generation) => {
    if (generation.image_url) return generation.image_url
    if (generation.image_base64) return generation.image_base64
    return null
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }
  }

  const handleDelete = async (generationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir navegação ao clicar no botão

    if (!confirm('Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeletingId(generationId)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        navigate('/login')
        return
      }

      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      // Recarregar lista
      await loadGenerations()
    } catch (error) {
      console.error('Erro ao excluir análise:', error)
      alert('Erro ao excluir análise. Tente novamente.')
    } finally {
      setDeletingId(null)
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, bem-vindo! 👋
            </h1>
            <p className="text-slate-400">
              Crie anúncios perfeitos para seus produtos Shopee
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-500/30"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
            <div className="text-right">
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors border border-slate-800"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mb-8 flex justify-end gap-3">
          <button
            onClick={() => {
              // Se houver análises, navegar para o estúdio da primeira, senão mostrar mensagem
              if (generations.length > 0) {
                navigate(`/app/estudio-imagem/${generations[0].id}`)
              } else {
                alert('Crie uma análise primeiro para editar imagens')
              }
            }}
            disabled={generations.length === 0}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-5 h-5" />
            Editar Imagem
          </button>
          <button
            onClick={() => navigate('/app/nova-analise')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-glow-blue"
          >
            <Plus className="w-5 h-5" />
            Nova Análise
          </button>
        </div>

        {/* Histórico de Análises */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">Histórico de Análises</h2>
          
          {generations.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <p className="text-slate-400 mb-4">Nenhuma análise encontrada</p>
              <button
                onClick={() => navigate('/app/nova-analise')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Criar Primeira Análise
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generations.map((generation) => {
                const imageUrl = getImageUrl(generation)
                
                return (
                  <div
                    key={generation.id}
                    onClick={() => navigate(`/app/analise/${generation.id}`)}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    {/* Image */}
                    <div className="aspect-square bg-slate-950 relative group">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={generation.product_name || 'Produto'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-slate-500 text-sm">Sem imagem</div>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {getStatusBadge(generation.status)}
                      </div>

                      {/* Action Buttons - Aparecem no hover */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/app/estudio-imagem/${generation.id}`)
                          }}
                          className="w-8 h-8 bg-purple-500/90 hover:bg-purple-600 rounded-full flex items-center justify-center"
                          title="Estúdio de Imagem"
                        >
                          <ImageIcon className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(generation.id, e)}
                          disabled={deletingId === generation.id}
                          className="w-8 h-8 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir análise"
                        >
                          {deletingId === generation.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2 line-clamp-2 min-h-[3rem]">
                        {generation.status === 'concluido' && generation.title
                          ? generation.title
                          : generation.status === 'erro'
                          ? 'Título não disponível'
                          : 'Aguardando geração...'}
                      </h3>
                      
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                        <span className="text-xs text-slate-400">
                          {formatDate(generation.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

