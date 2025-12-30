/**
 * Comprime uma imagem usando Canvas HTML5
 * @param file - Arquivo de imagem a ser comprimido
 * @param maxWidth - Largura máxima em pixels (padrão: 800)
 * @param quality - Qualidade JPEG de 0 a 1 (padrão: 0.6)
 * @returns Promise<string> - Base64 da imagem comprimida
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo não é uma imagem'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        // Criar canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        // Desenhar imagem redimensionada no canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'))
          return
        }

        // Melhorar qualidade do redimensionamento
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.drawImage(img, 0, 0, width, height)

        // Converter para base64 com compressão
        try {
          // Converter para JPEG (sempre, para garantir compressão)
          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64)
        } catch (error) {
          reject(new Error('Erro ao comprimir imagem'))
        }
      }

      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'))
      }

      // Carregar imagem
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'))
    }

    // Ler arquivo como Data URL
    reader.readAsDataURL(file)
  })
}

/**
 * Comprime múltiplas imagens
 * @param files - Array de arquivos de imagem
 * @param maxWidth - Largura máxima em pixels (padrão: 800)
 * @param quality - Qualidade JPEG de 0 a 1 (padrão: 0.6)
 * @returns Promise<string[]> - Array de base64 das imagens comprimidas
 */
export async function compressImages(
  files: File[],
  maxWidth: number = 800,
  quality: number = 0.6
): Promise<string[]> {
  const promises = files.map(file => compressImage(file, maxWidth, quality))
  return Promise.all(promises)
}

/**
 * Calcula o tamanho aproximado de uma string base64 em KB
 * @param base64 - String base64
 * @returns Tamanho em KB
 */
export function getBase64SizeKB(base64: string): number {
  // Remover prefixo data:image/...;base64,
  const base64Data = base64.split(',')[1] || base64
  // Calcular tamanho: base64 é ~33% maior que o binário original
  const sizeInBytes = (base64Data.length * 3) / 4
  return sizeInBytes / 1024
}

