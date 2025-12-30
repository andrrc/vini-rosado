import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Lista de origens permitidas para CORS (whitelist)
 * Adicione aqui os domínios que devem ter acesso às Edge Functions
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Desenvolvimento local (Vite padrão)
  'http://localhost:3000', // Desenvolvimento local (porta alternativa)
  // 'https://meu-app.com', // Descomente e adicione seu domínio de produção
]

/**
 * Função para gerar headers CORS baseados na origem da requisição
 * Retorna headers com Access-Control-Allow-Origin apenas se a origem estiver na whitelist
 * ou for um subdomínio da Vercel (.vercel.app)
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  // Verifica se a origem está na whitelist ou é um subdomínio da Vercel
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.vercel.app')
  )

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  // Se não estiver na whitelist, não adiciona o header Allow-Origin (bloqueado por padrão)

  return headers
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const { image_url, product_id, generation_id } = await req.json()

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: image_url' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Usar generation_id se fornecido, senão usar product_id
    const recordId = generation_id || product_id

    // Obter API Key da OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada')
    }

    // ============================================
    // PASSO 1: VISÃO (GPT-4o) - Descrever a imagem
    // ============================================
    console.log('🔍 Passo 1: Analisando imagem com GPT-4o Vision...')

    // Baixar a imagem para converter em base64
    const imageResponse = await fetch(image_url)
    if (!imageResponse.ok) {
      throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`

    // Chamada para GPT-4o Vision
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this product strictly visually in extreme detail (colors, materials, shape, textures) to guide a DALL-E 3 generation. Focus only on the product object itself. Output ONLY the description.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    })

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text()
      throw new Error(`Erro na API Vision: ${visionResponse.status} - ${errorData}`)
    }

    const visionData = await visionResponse.json()
    const productDescription = visionData.choices?.[0]?.message?.content

    if (!productDescription) {
      throw new Error('Resposta vazia da API Vision')
    }

    console.log('✅ Descrição gerada:', productDescription.substring(0, 100) + '...')

    // ============================================
    // PASSO 2: GERAÇÃO (DALL-E 3) - Gerar nova imagem
    // ============================================
    console.log('🎨 Passo 2: Gerando imagem com DALL-E 3...')

    const dallePrompt = `Professional commercial product photography of ${productDescription}. Clean white studio background, soft cinematic lighting, 4k resolution, hyperrealistic. The product is the main focus.`

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        size: '1024x1024',
        quality: 'hd',
        n: 1,
      }),
    })

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.text()
      throw new Error(`Erro na API DALL-E 3: ${dalleResponse.status} - ${errorData}`)
    }

    const dalleData = await dalleResponse.json()
    const generatedImageUrl = dalleData.data?.[0]?.url

    if (!generatedImageUrl) {
      throw new Error('URL da imagem gerada não encontrada na resposta')
    }

    console.log('✅ Imagem gerada:', generatedImageUrl)

    // ============================================
    // PASSO 3: PERSISTÊNCIA - Upload e atualização
    // ============================================
    console.log('💾 Passo 3: Fazendo upload para Supabase Storage...')

    // Baixar a imagem gerada
    const generatedImageResponse = await fetch(generatedImageUrl)
    if (!generatedImageResponse.ok) {
      throw new Error(`Erro ao baixar imagem gerada: ${generatedImageResponse.status}`)
    }

    const generatedImageBuffer = await generatedImageResponse.arrayBuffer()
    const generatedImageBlob = new Blob([generatedImageBuffer], { type: 'image/png' })

    // Criar cliente Supabase com service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileName = `processed_${recordId || 'img'}_${timestamp}_${randomId}.png`

    // Fazer upload para o bucket product-images
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, generatedImageBlob, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
    }

    // Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    const processedImageUrl = urlData.publicUrl

    console.log('✅ Upload concluído:', processedImageUrl)

    // Atualizar a tabela generations se generation_id foi fornecido
    if (generation_id) {
      const { error: updateError } = await supabase
        .from('generations')
        .update({ image_url: processedImageUrl })
        .eq('id', generation_id)

      if (updateError) {
        console.error('⚠️ Erro ao atualizar tabela generations:', updateError)
      } else {
        console.log('✅ Tabela generations atualizada com sucesso')
      }
    }

    // Atualizar a tabela products se product_id foi fornecido
    if (product_id && !generation_id) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ processed_image_url: processedImageUrl })
        .eq('id', product_id)

      if (updateError) {
        console.error('⚠️ Erro ao atualizar tabela products:', updateError)
        // Não falhar se a tabela não existir ou houver erro de atualização
      } else {
        console.log('✅ Tabela products atualizada com sucesso')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedUrl: processedImageUrl,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Erro na função process-image-openai:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})

