import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_url, product_id } = await req.json()

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: image_url' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: product_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

