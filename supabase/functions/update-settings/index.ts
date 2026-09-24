import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Ověřit, že volající má platnou relaci z přihlášení do aplikace.
    // Samotný anon key sem nestačí - ten zná kdokoliv z JS bundlu.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token || token === anonKey) {
      return json({ error: 'Nejsi přihlášený' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return json({ error: 'Neplatná nebo vypršená relace' }, 401)
    }

    const { updates } = await req.json()

    if (!updates || typeof updates !== 'object') {
      return json({ error: 'Chybí updates' }, 400)
    }

    // Pustit dál jen sloupce, které nastavení opravdu má
    const allowed = ['challenge_start', 'challenge_end', 'sunny_day']
    const payload: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in updates) payload[key] = updates[key]
    }

    if (Object.keys(payload).length === 0) {
      return json({ error: 'Žádná povolená pole k úpravě' }, 400)
    }

    // Zápis přes service role (settings nemají write politiku pro authenticated)
    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin
      .from('settings')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', 'global')
      .select()
      .single()

    if (error) throw error

    return json({ data }, 200)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
