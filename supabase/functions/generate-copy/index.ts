import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    const { product_name, features, category } = await req.json()

    if (!product_name || !features || !category) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: product_name, features, category' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Obter API Key do Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada')
    }

    // System Prompt - Especialista em Copywriting para Shopee
    const systemPrompt = `Você é um expert em Copywriting para Shopee, especializado em criar anúncios profissionais que rankeiam bem na plataforma.

REGRAS CRÍTICAS (OBRIGATÓRIAS):
- NÃO use emojis, caracteres especiais desnecessários ou formatação enfeitada
- O texto deve ser limpo, profissional e focado em SEO e palavras-chave
- Títulos devem ser densos em palavras-chave, sem pontuação excessiva
- Descrições devem usar listas simples com hifens (-) ou asteriscos (*) para características
- Foque em clareza técnica e informações que ajudem na conversão
- Evite linguagem excessivamente promocional ou exagerada

A Shopee NÃO PERMITE emojis em títulos ou descrições profissionais. O uso de emojis pode prejudicar o ranqueamento ou violar regras de formatação da plataforma.`

    // Prompt do usuário
    const userPrompt = `Produto: ${product_name}
Categoria: ${category}
Características: ${features}

Crie um anúncio profissional para Shopee seguindo estas especificações:

1. TÍTULO SEO:
   - Máximo de 60 caracteres
   - Denso em palavras-chave relevantes
   - Sem pontuação excessiva
   - Sem emojis ou caracteres especiais
   - Foco em termos de busca que o cliente usaria

2. DESCRIÇÃO:
   - Use listas simples com hifens (-) ou asteriscos (*) para características
   - Foque em clareza técnica e benefícios reais
   - Sem emojis, caracteres especiais ou formatação enfeitada
   - Estruture de forma que facilite a leitura rápida
   - Destaque características técnicas, benefícios e informações importantes

IMPORTANTE: NÃO use emojis em nenhuma parte do texto. A Shopee não permite emojis em anúncios profissionais.

Formato de resposta JSON (sem emojis):
{
  "title": "Título SEO denso em palavras-chave aqui",
  "description": "Descrição profissional com listas simples aqui"
}`

    // Chamada para API do Google Gemini
    // Primeiro, tentar listar modelos disponíveis (para contas gratuitas)
    let availableModels = []
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
      const listResponse = await fetch(listUrl)
      if (listResponse.ok) {
        const listData = await listResponse.json()
        availableModels = listData.models
          ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          ?.map((m: any) => m.name) || []
        console.log('Modelos disponíveis:', availableModels)
      }
    } catch (err) {
      console.log('Não foi possível listar modelos, tentando lista padrão')
    }

    // Lista de modelos para tentar (priorizando modelos gratuitos)
    const models = availableModels.length > 0 
      ? availableModels 
      : [
          'models/gemini-1.5-flash-latest',  // Versão latest (geralmente gratuita)
          'models/gemini-1.5-pro-latest',   // Versão latest pro
          'v1/models/gemini-1.5-flash-latest',
          'v1/models/gemini-1.5-pro-latest',
          'v1beta/models/gemini-1.5-flash-latest',
          'v1beta/models/gemini-1.5-pro-latest',
          'v1/models/gemini-1.5-flash',
          'v1/models/gemini-1.5-pro',
          'v1beta/models/gemini-1.5-flash',
          'v1beta/models/gemini-1.5-pro',
        ]

    let lastError = null
    let geminiData = null

    for (const model of models) {
      try {
        // Ajustar o caminho do modelo
        let modelPath = model
        if (model.startsWith('models/')) {
          // Se começa com "models/", usar v1beta (mais compatível)
          modelPath = `v1beta/${model}`
        } else if (!model.startsWith('v1/') && !model.startsWith('v1beta/')) {
          // Se não tem prefixo, adicionar v1beta
          modelPath = `v1beta/models/${model}`
        }
        
        const geminiUrl = `https://generativelanguage.googleapis.com/${modelPath}:generateContent?key=${geminiApiKey}`

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\n${userPrompt}`,
                  },
                ],
              },
            ],
          }),
        })

        if (response.ok) {
          geminiData = await response.json()
          console.log(`✅ Modelo ${model} funcionou!`)
          break
        } else {
          const errorData = await response.text()
          lastError = `Modelo ${model}: ${response.status} - ${errorData}`
          console.log(`Tentativa com ${model} falhou:`, lastError)
        }
      } catch (err) {
        lastError = `Erro ao tentar modelo ${model}: ${err.message}`
        console.log(lastError)
      }
    }

    if (!geminiData) {
      throw new Error(`Nenhum modelo disponível. Último erro: ${lastError}`)
    }

    // Extrair texto da resposta do Gemini
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('Resposta vazia da API Gemini')
    }

    // Função para limpar texto de markdown, código e emojis
    const cleanText = (str: string): string => {
      if (!str) return ''
      
      // Remover emojis (ranges Unicode comuns de emojis)
      let cleaned = str
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // Chess Symbols
        .replace(/[\u{1F018}-\u{1F270}]/gu, '') // Various asian characters
        .replace(/[\u{238C}-\u{2454}]/gu, '')   // Misc
        .replace(/[\u{20D0}-\u{20FF}]/gu, '')   // Combining Diacritical Marks for Symbols
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation Selectors
        .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
        .replace(/[\u{200B}]/gu, '')            // Zero Width Space
        .replace(/[\u{200C}]/gu, '')            // Zero Width Non-Joiner
        .replace(/[\u{2060}]/gu, '')            // Word Joiner
        .replace(/[\u{FEFF}]/gu, '')            // Zero Width No-Break Space
      
      // Remover markdown code blocks
      cleaned = cleaned
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^json\s*/gi, '')
      
      // Remover caracteres especiais desnecessários (manter apenas pontuação básica)
      cleaned = cleaned
        .replace(/[❌✅⚠️🔍💡⭐🌟✨🎯🔥💯]/g, '') // Emojis comuns que podem ter escapado
        .trim()
      
      return cleaned
    }

    // Tentar parsear JSON da resposta
    let result
    try {
      // Remover markdown code blocks se existirem
      let cleanedText = cleanText(text)
      
      // Tentar encontrar JSON dentro do texto
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }
      
      result = JSON.parse(cleanedText)
      
      // Limpar os valores do resultado também
      if (result.title) {
        result.title = cleanText(result.title)
      }
      if (result.description) {
        result.description = cleanText(result.description)
      }
    } catch (parseError) {
      // Se não for JSON válido, tentar extrair título e descrição do texto
      const lines = text.split('\n').filter(line => line.trim() && !line.match(/^```/))
      const titleMatch = text.match(/["']?title["']?\s*[:=]\s*["']?([^"'\n]+)["']?/i) 
        || text.match(/título[:\s]+(.+?)(?:\n|$)/i) 
        || text.match(/title[:\s]+(.+?)(?:\n|$)/i)
      const descMatch = text.match(/["']?description["']?\s*[:=]\s*["']?([^"']+)["']?/is)
        || text.match(/descrição[:\s]+(.+?)(?:\n|$)/is) 
        || text.match(/description[:\s]+(.+?)(?:\n|$)/is)

      result = {
        title: cleanText(titleMatch?.[1]?.trim() || lines.find(l => l.length > 10) || product_name),
        description: cleanText(descMatch?.[1]?.trim() || lines.slice(1).join('\n') || text),
      }
    }

    // Garantir que temos título e descrição limpos (sem emojis)
    result = {
      title: cleanText(result.title || product_name),
      description: cleanText(result.description || text),
    }
    
    // Validação final: se o título ainda contém "json", "```" ou emojis, usar o nome do produto
    const hasInvalidChars = result.title.toLowerCase().includes('json') || 
                            result.title.includes('```') ||
                            /[\u{1F600}-\u{1F9FF}]/u.test(result.title)
    
    if (hasInvalidChars) {
      result.title = product_name
    }
    
    // Validação adicional: remover emojis da descrição se ainda existirem
    if (result.description && /[\u{1F600}-\u{1F9FF}]/u.test(result.description)) {
      result.description = cleanText(result.description)
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro na função generate-copy:', error)
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
