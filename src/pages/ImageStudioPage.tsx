import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Sparkles, AlertCircle, Loader2, Edit2 } from 'lucide-react'
import { ImageUpload } from '../components/ImageUpload'
import { ImageEditor } from '../components/ImageEditor'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function ImageStudioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [editingImage, setEditingImage] = useState<string | null>(null)

  const analysisId = id

  // Toast helper
  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // Atualizar imagem atual quando imageUrls mudar
  useEffect(() => {
    if (imageUrls.length > 0) {
      setCurrentImageUrl(imageUrls[0])
    } else {
      setCurrentImageUrl(null)
    }
  }, [imageUrls])

  // Real-time subscription para atualizar imagem quando processada pelo n8n
  useEffect(() => {
    if (!analysisId) return

    const channel = supabase
      .channel(`generation-${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `id=eq.${analysisId}`,
        },
        (payload) => {
          const newImageUrl = payload.new.image_url
          if (newImageUrl) {
            setCurrentImageUrl((prevUrl) => {
              if (prevUrl !== newImageUrl) {
                setImageUrls((prevUrls) => {
                  if (prevUrls.length > 0) {
                    return [newImageUrl, ...prevUrls.slice(1)]
                  } else {
                    return [newImageUrl]
                  }
                })
                showToast('Imagem atualizada com sucesso!', 'success')
                return newImageUrl
              }
              return prevUrl
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [analysisId])

  // Processar Imagem (Remover Fundo)
  const handleProcessImageN8n = async () => {
    if (!currentImageUrl) {
      showToast('Adicione uma imagem primeiro', 'error')
      return
    }

    if (!analysisId) {
      showToast('Por favor, crie ou selecione uma análise primeiro', 'error')
      return
    }

    setLoadingImage(true)

    try {
      // Verificar se o usuário está autenticado
      if (!session?.access_token) {
        showToast('Você precisa estar autenticado para processar imagens', 'error')
        setLoadingImage(false)
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Enviar imagem original diretamente para a Edge Function
      // Usar o token JWT da sessão do usuário ao invés da anon key
      const edgeFunctionResponse = await fetch(
        `${supabaseUrl}/functions/v1/process-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            image_url: currentImageUrl,
            product_id: analysisId,
          }),
        }
      )

      if (!edgeFunctionResponse.ok) {
        const errorData = await edgeFunctionResponse.json()
        throw new Error(errorData.error || 'Erro ao processar imagem')
      }

      const result = await edgeFunctionResponse.json()
      
      // Atualizar a lista de imagens com a URL processada
      if (result.processed_image_url) {
        // Substituir a primeira imagem pela processada
        setImageUrls([result.processed_image_url, ...imageUrls.slice(1)])
        setCurrentImageUrl(result.processed_image_url)
        showToast('Imagem processada e salva com sucesso!', 'success')
      } else {
        showToast('Imagem processada, mas URL não retornada', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao processar imagem', 'error')
    } finally {
      setLoadingImage(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Estúdio de Imagem</h1>
          <p className="text-slate-400 mt-2">Edite e melhore as imagens do seu produto</p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Estúdio de Imagem */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <ImageIcon className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Estúdio de Imagem</h2>
          </div>

          <div className="space-y-6">
            {/* Upload de Imagens */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Upload de Imagens</h3>
              <div className={!analysisId ? 'opacity-50 pointer-events-none' : ''}>
                <ImageUpload 
                  images={imageUrls}
                  onImagesChange={setImageUrls}
                  generationId={analysisId}
                />
              </div>
              {!analysisId && (
                <p className="text-sm text-slate-400 text-center mt-4">
                  Por favor, crie ou selecione uma análise primeiro.
                </p>
              )}
            </div>

            {/* Imagem Atual */}
            {currentImageUrl && !editingImage && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Imagem Atual do Produto</h3>
                <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-4 mb-4">
                  <img
                    src={currentImageUrl}
                    alt="Produto"
                    className="w-full h-auto max-h-96 object-contain rounded-lg mx-auto"
                  />
                </div>
                <button
                  onClick={() => setEditingImage(currentImageUrl)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-5 h-5" />
                  Editar Imagem
                </button>
              </div>
            )}

            {/* Editor de Imagem */}
            {editingImage && (
              <div>
                <ImageEditor
                  imageUrl={editingImage}
                  onSave={(editedUrl) => {
                    // Atualizar a imagem editada
                    setImageUrls([editedUrl, ...imageUrls.slice(1)])
                    setEditingImage(null)
                    showToast('Imagem editada e salva!', 'success')
                  }}
                  onClose={() => setEditingImage(null)}
                />
              </div>
            )}

            {/* Botão de Processamento n8n */}
            <button
              onClick={handleProcessImageN8n}
              disabled={loadingImage || !currentImageUrl || !analysisId}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow-purple"
            >
              {loadingImage ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Remover Fundo
                </>
              )}
            </button>

            {!analysisId && (
              <p className="text-sm text-slate-400 text-center">
                Por favor, crie ou selecione uma análise primeiro.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

