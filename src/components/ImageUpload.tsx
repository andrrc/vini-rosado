import { useRef, useState, useEffect } from 'react'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ImageUploadProps {
  images?: string[] // URLs públicas finais (opcional, não usado atualmente)
  onImagesChange: (urls: string[]) => void
}

interface ImageItem {
  file: File
  preview: string // URL local do preview
  publicUrl: string | null // URL pública após upload
  uploading: boolean
  error: string | null
}

export function ImageUpload({ onImagesChange }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [imageItems, setImageItems] = useState<ImageItem[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Limpar previews quando o componente for desmontado ou quando imagens forem removidas
  useEffect(() => {
    return () => {
      // Limpar todos os previews ao desmontar
      imageItems.forEach(item => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview)
        }
      })
    }
  }, [imageItems.length]) // Re-executar quando o número de itens mudar

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    // Gerar nome único para o arquivo
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${fileName}`

    // Fazer upload para o bucket 'video-assets'
    const { error: uploadError } = await supabase.storage
      .from('video-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
    }

    // Obter URL pública
    const { data } = supabase.storage
      .from('video-assets')
      .getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error('Não foi possível obter a URL pública da imagem')
    }

    return data.publicUrl
  }

  const handleImageAdd = async (files: File[]) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'))

    if (validFiles.length === 0) return

    // PASSO 1: Preview Instantâneo - Criar previews imediatamente
    const newItems: ImageItem[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file), // Preview instantâneo
      publicUrl: null,
      uploading: false,
      error: null,
    }))

    // PASSO 1: Adicionar novos itens ao estado (imagem aparece imediatamente)
    const currentLength = imageItems.length
    setImageItems(prev => [...prev, ...newItems])

    // PASSO 2: Upload em Background - Para cada imagem
    newItems.forEach((item, localIndex) => {
      const globalIndex = currentLength + localIndex
      
      // Marcar como fazendo upload
      setImageItems(prev => {
        const updated = [...prev]
        if (updated[globalIndex]) {
          updated[globalIndex] = { ...updated[globalIndex], uploading: true }
        }
        return updated
      })

      // Fazer upload
      uploadImageToStorage(item.file)
        .then(publicUrl => {
          // Sucesso: Atualizar com URL pública
          setImageItems(prev => {
            const updated = [...prev]
            if (updated[globalIndex]) {
              updated[globalIndex] = {
                ...updated[globalIndex],
                publicUrl,
                uploading: false,
                error: null,
              }
            }
            // Atualizar estado externo com todas as URLs públicas
            const allPublicUrls = updated
              .map(i => i.publicUrl)
              .filter((url): url is string => url !== null)
            onImagesChange(allPublicUrls)
            return updated
          })
          showToast('Imagem enviada com sucesso!', 'success')
        })
        .catch(error => {
          // Erro: Manter preview, mas mostrar erro
          console.error('Erro no upload:', error)
          setImageItems(prev => {
            const updated = [...prev]
            if (updated[globalIndex]) {
              updated[globalIndex] = {
                ...updated[globalIndex],
                uploading: false,
                error: error.message || 'Erro ao fazer upload',
              }
            }
            return updated
          })
          showToast(`Erro ao enviar imagem: ${error.message}`, 'error')
        })
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleImageAdd(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleImageAdd(files)

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const item = imageItems[index]
    
    // Revogar URL do preview se for blob
    if (item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview)
    }

    setImageItems(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Atualizar estado externo com URLs restantes
      const allPublicUrls = updated
        .map(i => i.publicUrl)
        .filter((url): url is string => url !== null)
      onImagesChange(allPublicUrls)
      return updated
    })
  }

  const retryUpload = async (index: number) => {
    const item = imageItems[index]
    
      setImageItems(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], uploading: true, error: null }
        return updated
      })

    try {
      const publicUrl = await uploadImageToStorage(item.file)
      setImageItems(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          publicUrl,
          uploading: false,
          error: null,
        }
        // Atualizar estado externo com todas as URLs públicas
        const allPublicUrls = updated
          .map(i => i.publicUrl)
          .filter((url): url is string => url !== null)
        onImagesChange(allPublicUrls)
        return updated
      })
      showToast('Imagem enviada com sucesso!', 'success')
    } catch (error: any) {
      setImageItems(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          uploading: false,
          error: error.message || 'Erro ao fazer upload',
        }
        return updated
      })
      showToast(`Erro ao enviar imagem: ${error.message}`, 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${
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

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10 shadow-glow-blue'
            : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${isDragging ? 'text-blue-400' : 'text-slate-500'}`} />
        <p className="text-sm sm:text-base text-slate-300 font-medium mb-2">
          Arraste suas fotos aqui
        </p>
        <p className="text-xs sm:text-sm text-slate-500">
          ou clique para selecionar
        </p>
      </div>

      {/* Image Previews */}
      {imageItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {imageItems.map((item, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 relative">
                {/* Imagem sempre visível (pública > preview) */}
                <img
                  src={item.publicUrl || item.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay de Upload */}
                {item.uploading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Enviando...</p>
                    </div>
                  </div>
                )}

                {/* Overlay de Erro */}
                {item.error && !item.uploading && (
                  <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center p-2">
                    <div className="text-center">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-xs text-red-300 mb-2">{item.error}</p>
                      <button
                        onClick={() => retryUpload(index)}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Remover */}
              <button
                onClick={() => removeImage(index)}
                disabled={item.uploading}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Status Badge */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-slate-300 bg-slate-900/80 rounded px-2 py-1 truncate">
                  {item.file.name}
                </p>
                {item.publicUrl && !item.error && (
                  <p className="text-xs text-green-400 bg-green-500/10 rounded px-2 py-1 mt-1">
                    ✓ Enviado
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
