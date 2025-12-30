import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Sparkles, Copy, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ImageUpload } from '../components/ImageUpload'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [productName, setProductName] = useState('')
  const [features, setFeatures] = useState('')
  const [category, setCategory] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState('')

  const convertImagesToBase64 = async (files: File[]): Promise<string[]> => {
    const promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })
    return Promise.all(promises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Converter imagens para base64 se houver
      const imageBase64Array = images.length > 0 
        ? await convertImagesToBase64(images)
        : []

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
            images: imageBase64Array,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar copy')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar copy')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Valida AI</h1>
            <p className="text-slate-400">Olá, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors border border-slate-800"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Criar Copy</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Produto
                </label>
                <input
                  id="productName"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
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
                  required
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
                  required
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
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow-blue"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Copy
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side - Image Upload & Result */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-4">Upload de Imagens</h3>
              <ImageUpload images={images} onImagesChange={setImages} />
            </div>

            {/* Result */}
            {result && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                      <Copy className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Copy Gerado</h2>
                  </div>
                  <button
                    onClick={() => setResult(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Título SEO
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white">
                      {result.title}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descrição
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {result.description}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const text = `${result.title}\n\n${result.description}`
                      navigator.clipboard.writeText(text)
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Copy Completo
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
