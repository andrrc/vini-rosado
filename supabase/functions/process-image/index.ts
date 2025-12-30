import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { User } from 'jsr:@supabase/supabase-js@2'

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

/**
 * Função auxiliar para validar autenticação JWT
 * Retorna o usuário autenticado ou uma Response de erro 401
 */
async function validateAuth(req: Request): Promise<{ user: User | null; error: Response | null }> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Token de autenticação vazio' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  // Criar cliente Supabase com anon key para validar token do usuário
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas')
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Erro de configuração do servidor' }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Validar token JWT
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    console.warn('⚠️ Tentativa de acesso com token JWT inválido ou expirado')
    console.warn(`   IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`)
    console.warn(`   User-Agent: ${req.headers.get('user-agent') || 'unknown'}`)
    
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  // Verificar se usuário está banido (usando service role para bypass RLS)
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (supabaseServiceKey) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      console.warn(`⚠️ Tentativa de acesso de usuário banido: ${user.email}`)
      return {
        user: null,
        error: new Response(
          JSON.stringify({ error: 'Usuário banido' }),
          {
            status: 403,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          }
        ),
      }
    }
  }

  console.log(`✅ Usuário autenticado: ${user.email} (${user.id})`)
  return { user, error: null }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // ============================================
    // VERIFICAÇÃO DE SEGURANÇA - Autenticação JWT
    // ============================================
    const { user, error: authError } = await validateAuth(req)
    
    if (authError) {
      return authError // Retorna 401 ou 403
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    const { image_url, product_id } = await req.json()

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: image_url' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: product_id' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Obter API Key do remove.bg
    const removeBgApiKey = Deno.env.get('REMOVE_BG_API_KEY')

    if (!removeBgApiKey) {
      throw new Error('REMOVE_BG_API_KEY não configurada')
    }

    // Baixar a imagem da image_url
    console.log('📥 Baixando imagem...')
    const imageResponse = await fetch(image_url)
    if (!imageResponse.ok) {
      throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBlob = new Blob([imageBuffer])

    // Criar FormData para a API do remove.bg
    const formData = new FormData()
    formData.append('image_file', imageBlob, 'image.png')
    formData.append('size', 'auto') // auto detecta o melhor tamanho

    // Chamada para API do remove.bg
    console.log('🔄 Removendo fundo da imagem com remove.bg...')
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': removeBgApiKey,
      },
      body: formData,
    })

    if (!removeBgResponse.ok) {
      const errorData = await removeBgResponse.text()
      throw new Error(`Erro na API remove.bg: ${removeBgResponse.status} - ${errorData}`)
    }

    // A API do remove.bg retorna a imagem PNG sem fundo diretamente (binary)
    const processedImageBuffer = await removeBgResponse.arrayBuffer()
    const processedImageBlob = new Blob([processedImageBuffer], { type: 'image/png' })

    console.log('✅ Fundo removido com sucesso')

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
    const fileName = `processed_${product_id}_${timestamp}_${randomId}.png`

    // Salvar no Supabase Storage (product-images)
    console.log('💾 Fazendo upload para Supabase Storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, processedImageBlob, {
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

    const finalImageUrl = urlData.publicUrl

    console.log('✅ Upload concluído:', finalImageUrl)

    // Atualizar o campo image_url na tabela generations
    // Nota: product_id na verdade é o generation_id
    const { error: updateError } = await supabase
      .from('generations')
      .update({ image_url: finalImageUrl })
      .eq('id', product_id)

    if (updateError) {
      console.error('⚠️ Erro ao atualizar tabela generations:', updateError)
      throw new Error(`Erro ao atualizar tabela generations: ${updateError.message}`)
    }

    console.log('✅ Tabela generations atualizada com sucesso')

    // Retorno
    return new Response(
      JSON.stringify({ 
        success: true,
        processed_image_url: finalImageUrl 
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Erro na função process-image:', error)
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

