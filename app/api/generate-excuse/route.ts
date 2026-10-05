import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Groq průběžně vyřazuje modely - původní 'groq/compound' zmizel a endpoint
// začal vracet 404 model_not_found, čímž generátor přestal fungovat. Proto
// zkoušíme víc modelů po sobě. Aktuální seznam dostupných modelů:
// GET https://api.groq.com/openai/v1/models
//
// gpt-oss-120b tenhle prompt odmítá (8 z 8 pokusů na téma hospoda), proto
// tady není. Modely s reasoningem potřebují rezervu v max_tokens, jinak jim
// interní uvažování sežere celý budget a content přijde prázdný.
const MODELY = [
  { id: 'qwen/qwen3.8-27b' },
  { id: 'openai/gpt-oss-20b', reasoning_effort: 'low' as const }
]

const MAX_TOKENS = 400

// Pestrost držíme náhodným tématem, ne vysokou teplotou. Nad 1.0 začne model
// v češtině plodit rozbité znaky (neplatné UTF-8 náhrady).
const TEMPERATURE = 1

const TEMATA = [
  'zvířata', 'sousedi', 'technika a spotřebiče', 'jídlo', 'počasí',
  'práce a šéf', 'úřady a byrokracie', 'rodina', 'vesmír a věda',
  'sportovní vybavení', 'zdraví a lékaři', 'doprava', 'hospoda',
  'internet a sociální sítě', 'mystika a horoskopy', 'dětství'
]

const NAHRADNI_VYMLUVA = 'Nemám výmluvu, jsem prostě línej kokot.'

// Modely občas místo výmluvy vrátí anglické odmítnutí. Takovou odpověď
// nechceme ukázat, zkusíme další model v řadě.
const ODMITNUTI = [
  "i'm sorry", 'i am sorry', "i can't", 'i can’t', 'cannot comply',
  'can’t comply', "can't comply", "i won't", 'i will not', 'as an ai'
]

function jeOdmitnuti(text: string): boolean {
  const low = text.toLowerCase()
  return ODMITNUTI.some(x => low.includes(x))
}

// Modely rády obalí výmluvu do uvozovek, i když se jim to zakáže.
function uklid(text: string): string {
  return text
    .trim()
    .replace(/^["'„“»]+/, '')
    .replace(/["'“”«]+$/, '')
    .trim()
}

export async function POST(req: Request) {
  const { stats } = await req.json()

  const systemPrompt = `Vygeneruj absurdní, vtipnou výmluvu v první osobě (já/mně/musel jsem).

PRAVIDLA:
- Maximálně 1-2 věty
- Používej vulgární humor
- Výmluva musí být naprostý nesmysl, ale vtipný
- Odpověz POUZE tou výmluvou, nic nekomentuj a nedávej ji do uvozovek

Formát: "Dnes jsem nešel běhat, protože [něco úplně absurdního]"`

  const tema = TEMATA[Math.floor(Math.random() * TEMATA.length)]
  let userContext = `Vygeneruj výmluvu. Postav ji na tématu: ${tema}.`

  if (stats) {
    if (stats.daysSinceLastActivity > 2) {
      userContext += ` Neběžel už ${stats.daysSinceLastActivity} dní, takže výmluva musí být extra kreativní, vysvětlující, proč vynechal tolik dní. V tomto případě klidně i 5 vět.`
    }
    if (stats.position > 5) {
      userContext += ` Je na ${stats.position}. místě, takže by měl mít ještě absurdnější výmluvu.`
    }
  }

  for (const model of MODELY) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext }
        ],
        model: model.id,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        ...(model.reasoning_effort ? { reasoning_effort: model.reasoning_effort } : {})
      })

      const excuse = uklid(completion.choices[0]?.message?.content ?? '')

      if (!excuse) {
        console.warn(`${model.id}: prázdná odpověď`, {
          finish_reason: completion.choices[0]?.finish_reason,
          usage: completion.usage
        })
        continue
      }

      if (jeOdmitnuti(excuse)) {
        console.warn(`${model.id}: model odmítl prompt`)
        continue
      }

      return Response.json({ excuse })
    } catch (error) {
      console.error(`${model.id}: selhalo`, error)
    }
  }

  console.error('Žádný model nevrátil výmluvu')
  return Response.json({ excuse: NAHRADNI_VYMLUVA })
}
