import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_url, product_id } = await req.json()

    // Validação dos campos obrigatórios
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

    // Obter URL do Webhook do n8n
    const n8nWebhookUrl = Deno.env.get('N8N_IMAGE_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      throw new Error('N8N_IMAGE_WEBHOOK_URL não configurada')
    }

    // Enviar para o n8n e aguardar resposta
    console.log('📤 Enviando requisição para n8n...')
    
    const timeoutMs = 300000 // 5 minutos de timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image_url,
          product_id: product_id,
          task: "remove_background_studio"
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro na resposta do n8n: ${response.status} - ${errorText}`)
      }

      // Receber dados binários da imagem PNG do n8n
      console.log('📥 Recebendo dados binários do n8n...')
      const imageBuffer = await response.arrayBuffer()
      
      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error('Resposta do n8n está vazia ou inválida')
      }

      console.log(`✅ Imagem recebida do n8n: ${imageBuffer.byteLength} bytes`)

      // Criar cliente Supabase com service role key para fazer upload
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
      const fileName = `edited_${product_id}_${timestamp}_${randomId}.png`

      // Converter ArrayBuffer para Blob
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' })

      // Fazer upload para o bucket product-images
      console.log('📤 Fazendo upload para Supabase Storage...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageBlob, {
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

      // Atualizar a tabela generations com a nova URL da imagem
      if (product_id) {
        const { error: updateError } = await supabase
          .from('generations')
          .update({ image_url: processedImageUrl })
          .eq('id', product_id)

        if (updateError) {
          console.error('⚠️ Erro ao atualizar tabela generations:', updateError)
          // Não falhar a função se a atualização falhar, mas logar o erro
        } else {
          console.log('✅ Tabela generations atualizada com sucesso')
        }
      }

      // Retornar URL da imagem processada para o frontend
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: processedImageUrl,
          message: "Imagem processada e salva com sucesso"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('Timeout: O processamento demorou mais de 5 minutos')
      }
      
      console.error('❌ Erro ao processar com n8n:', error)
      throw error
    }
  } catch (error) {
    console.error('❌ Erro na função process-image-n8n:', error)
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

