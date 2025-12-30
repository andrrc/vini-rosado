import { useState, useRef, useEffect } from 'react'
import { RotateCw, ZoomIn, ZoomOut, Crop, Download, X, Sliders } from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onSave?: (editedImageUrl: string) => void
  onClose?: () => void
}

export function ImageEditor({ imageUrl, onSave, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isCropping, setIsCropping] = useState(false)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        imageRef.current = img
        drawImage()
      }
      img.src = imageUrl
    }
  }, [imageUrl, scale, brightness, contrast, saturation, rotation])

  const drawImage = () => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current
    canvas.width = img.width
    canvas.height = img.height

    ctx.save()
    
    // Aplicar rotação
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // Aplicar filtros
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'edited-image.png'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    if (onSave) {
      onSave(dataUrl)
    }
  }

  const resetFilters = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setRotation(0)
    setScale(1)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Editor de Imagem</h3>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-4 overflow-auto max-h-96">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto"
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Zoom */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <ZoomIn className="w-4 h-4" />
            Zoom: {Math.round(scale * 100)}%
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Brightness */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Brilho: {brightness}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={brightness}
            onChange={(e) => {
              setBrightness(parseInt(e.target.value))
              drawImage()
            }}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Contraste: {contrast}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={contrast}
            onChange={(e) => {
              setContrast(parseInt(e.target.value))
              drawImage()
            }}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Saturação: {saturation}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={saturation}
            onChange={(e) => {
              setSaturation(parseInt(e.target.value))
              drawImage()
            }}
            className="w-full"
          />
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Rotação: {rotation}°
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotation(rotation - 90)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCw className="w-4 h-4 text-white rotate-180" />
            </button>
            <input
              type="range"
              min="-180"
              max="180"
              step="90"
              value={rotation}
              onChange={(e) => {
                setRotation(parseInt(e.target.value))
                drawImage()
              }}
              className="flex-1"
            />
            <button
              onClick={() => setRotation(rotation + 90)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={resetFilters}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            Resetar
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-colors"
            >
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

