import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Download, CheckCircle2, AlertCircle, Clock, Trash2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Generation } from '../types/database'

export function AnalysisDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadGeneration = useCallback(async () => {
    if (!id) return

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        navigate('/login')
        return
      }

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .single()

      if (error) throw error

      if (!data) {
        navigate('/app')
        return
      }

      setGeneration(data)
    } catch (error) {
      console.error('Erro ao carregar análise:', error)
      navigate('/app')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    loadGeneration()
  }, [loadGeneration])


  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-medium border border-green-500/20">
            <CheckCircle2 className="w-4 h-4" />
            Concluído
          </div>
        )
      case 'erro':
        return (
          <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-full text-sm font-medium border border-red-500/20">
            <AlertCircle className="w-4 h-4" />
            Erro
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-4 py-2 rounded-full text-sm font-medium border border-orange-500/20">
            <Clock className="w-4 h-4" />
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

  const handleCopy = () => {
    if (!generation) return

    const text = generation.title && generation.description
      ? `${generation.title}\n\n${generation.description}`
      : generation.title || generation.description || ''

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!generation) return

    const text = generation.title && generation.description
      ? `${generation.title}\n\n${generation.description}`
      : generation.title || generation.description || ''

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generation.product_name || 'analise'}-${generation.id.slice(0, 8)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!generation || !id) return

    setDeleting(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        navigate('/login')
        return
      }

      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id)

      if (error) throw error

      // Redirecionar para o histórico após exclusão
      navigate('/app')
    } catch (error) {
      console.error('Erro ao excluir análise:', error)
      alert('Erro ao excluir análise. Tente novamente.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  if (!generation) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Análise não encontrada</p>
          <button
            onClick={() => navigate('/app')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Voltar para o Histórico
          </button>
        </div>
      </div>
    )
  }

  const imageUrl = getImageUrl(generation)

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Detalhes da Análise</h1>
              <p className="text-sm sm:text-base text-slate-400">{formatDate(generation.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {getStatusBadge(generation.status)}
              <button
                onClick={() => navigate(`/app/estudio-imagem/${generation.id}`)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base whitespace-nowrap"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Estúdio de Imagem</span>
                <span className="sm:hidden">Estúdio</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-red-500/30 text-sm sm:text-base whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
                Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors border border-slate-700"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Image */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Imagem do Produto</h2>
              <button
                onClick={() => navigate(`/app/estudio-imagem/${generation.id}`)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <ImageIcon className="w-4 h-4" />
                Editar Imagem
              </button>
            </div>
            {imageUrl ? (
              <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt={generation.product_name || 'Produto'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-slate-950 rounded-xl flex flex-col items-center justify-center gap-4">
                <p className="text-slate-500">Sem imagem</p>
                <button
                  onClick={() => navigate(`/app/estudio-imagem/${generation.id}`)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Adicionar Imagem
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="space-y-4 sm:space-y-6">
            {/* Product Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informações do Produto</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Nome do Produto</label>
                  <p className="text-white font-medium">{generation.product_name || 'Não informado'}</p>
                </div>
                {generation.category && (
                  <div>
                    <label className="text-sm text-slate-400">Categoria</label>
                    <p className="text-white font-medium">{generation.category}</p>
                  </div>
                )}
                {generation.features && (
                  <div>
                    <label className="text-sm text-slate-400">Características</label>
                    <p className="text-white">{generation.features}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Copy */}
            {generation.status === 'concluido' && (generation.title || generation.description) && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Copy Gerada</h2>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCopy}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-slate-700"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {generation.title && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Título SEO
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white">
                      {generation.title}
                    </div>
                  </div>
                )}

                {generation.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descrição
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {generation.description}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Error State */}
            {generation.status === 'erro' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">Erro na Geração</h3>
                </div>
                <p className="text-slate-400">
                  Ocorreu um erro ao gerar a copy para este produto. Tente criar uma nova análise.
                </p>
              </div>
            )}

            {/* Processing State */}
            {generation.status === 'processando' && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-orange-400">Processando</h3>
                </div>
                <p className="text-slate-400">
                  A análise está sendo processada. Aguarde alguns instantes e atualize a página.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

