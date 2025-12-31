import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Sparkles, Copy, X, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function CreateAnalysis() {
  const navigate = useNavigate()
  const [productName, setProductName] = useState('')
  const [features, setFeatures] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCopy, setLoadingCopy] = useState(false)
  const [result, setResult] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  // Toast helper
  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // Seção 1: Gerar Copy com IA
  const handleGenerateCopy = async () => {
    setError('')
    setResult(null)
    setLoadingCopy(true)

    try {
      // Validação básica
      if (!productName || !features || !category) {
        showToast('Preencha todos os campos obrigatórios', 'error')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-copy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            product_name: productName,
            features,
            category,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar copy')
      }

      const data = await response.json()
      
      // Limpar dados antes de usar
      const cleanTitle = (data.title || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/^json\s*/gi, '').trim()
      const cleanDescription = (data.description || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      
      // Se o título ainda contém "json" ou está vazio, usar o nome do produto
      const finalTitle = (cleanTitle && !cleanTitle.toLowerCase().includes('json') && !cleanTitle.includes('```'))
        ? cleanTitle
        : productName
      
      const finalData = {
        title: finalTitle,
        description: cleanDescription || data.description || '',
      }
      
      setResult(finalData)
      showToast('Copy gerada com sucesso!', 'success')

    } catch (err: any) {
      setError(err.message || 'Erro ao gerar copy')
      showToast(err.message || 'Erro ao gerar copy', 'error')
    } finally {
      setLoadingCopy(false)
    }
  }

  // Salvar geração completa e redirecionar para Estúdio de Imagem
  const handleSaveGeneration = async () => {
    if (!result) {
      showToast('Gere a copy primeiro', 'error')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Usuário não autenticado')

      const { data: newGeneration, error: createError } = await supabase
        .from('generations')
        .insert([{
          user_id: currentUser.id,
          title: result.title,
          description: result.description,
          product_name: productName,
          features,
          category,
          image_url: null,
          image_base64: null,
          status: 'concluido',
        }])
        .select()
        .single()

      if (createError) throw createError
      
      showToast('Análise salva com sucesso!', 'success')
      
      // Redirecionar para Estúdio de Imagem após salvar
      setTimeout(() => {
        navigate(`/app/estudio-imagem/${newGeneration.id}`)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar análise')
      showToast(err.message || 'Erro ao salvar análise', 'error')
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-white">Nova Análise</h1>
          <p className="text-slate-400 mt-2">Crie uma copy perfeita para seu produto</p>
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

        {/* Gerador de Copy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Gerador de Copy</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-slate-300 mb-2">
                Nome do Produto
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Ex: Smartphone XYZ Pro"
              />
            </div>

            <div>
              <label htmlFor="features" className="block text-sm font-medium text-slate-300 mb-2">
                Características
              </label>
              <textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Ex: Tela de 6.5 polegadas, 128GB de armazenamento, câmera tripla de 48MP..."
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                Categoria
              </label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Ex: Eletrônicos, Moda, Casa..."
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateCopy}
              disabled={loadingCopy}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow-blue"
            >
              {loadingCopy ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Descrição com IA
                </>
              )}
            </button>

            {/* Resultado da Copy */}
            {result && (
              <div className="mt-6 space-y-4 p-6 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Copy Gerada</h3>
                  <button
                    onClick={() => setResult(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título SEO
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white">
                    {result.title}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {result.description}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const text = `${result.title}\n\n${result.description}`
                      navigator.clipboard.writeText(text)
                      showToast('Copy copiada para a área de transferência!', 'success')
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-700 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    onClick={handleSaveGeneration}
                    disabled={loading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Análise'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

