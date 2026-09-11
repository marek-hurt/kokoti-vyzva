import Groq from 'groq-sdk'

export const runtime = 'edge'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(req: Request) {
  try {
    const { userName, stats } = await req.json()

    const systemPrompt = `Jsi cynický asistent. Odpovídej POUZE výmluvu, bez vysvětlování.
Styl: sarkastický, vulgární humor mezi kámoši. Používej "kokot", "sračka" atd.
Výmluvy proč někdo neběžel - musí být KREATIVNÍ, absurdní, neuveřitelné, trochu urážlivé.

DŮLEŽITÉ:
- Odpověz POUZE 1-2 větami výmluvy, nic víc!
- Buď co nejvíc KREATIVNÍ a ORIGINÁLNÍ!
- NIKDY neopakuj šablony jako "gauč + Netflix", "pršelo", "odpočinek"
- Vymysli absurdní, nečekanou výmluvu!

Příklady KREATIVNÍCH odpovědí:
"Musel jsem zachraňovat sousedovic kaktusy před čínskou mafií"
"Měl jsem důležitý meeting s mimozemšťany ohledně budoucnosti lidstva, ty kokote"
"Dostal jsem zranění od agresivní salámy v lednici"
"Běžecký trenér mi volal, že mám mít rest day... ano, volal mi ve snu"`

    let userContext = `Napiš vtipnou výmluvu (1-2 věty) proč ${userName} dnes neběžel:`

    if (stats) {
      if (stats.daysSinceLastActivity > 3) {
        userContext += ` Neběžel už ${stats.daysSinceLastActivity} dní, takže výmluva musí být extra kreativní.`
      }
      if (stats.position > 5) {
        userContext += ` Je na ${stats.position}. místě, takže si zaslouží pořádný hejt.`
      }
      if (stats.alcoholDays > 0) {
        userContext += ` Minulý týden chlastal ${stats.alcoholDays}x.`
      }
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext }
      ],
      model: 'groq/compound', // Groq's general purpose model
      temperature: 1.3, // Vyšší teplota = kreativnější odpovědi
      max_tokens: 100
    })

    console.log('Groq response:', JSON.stringify(completion, null, 2))

    const excuse = completion.choices[0]?.message?.content || 'Nemám výmluvu, jsem prostě línej kokot.'

    console.log('Extracted excuse:', excuse)

    return Response.json({ excuse })
  } catch (error) {
    console.error('Error generating excuse:', error)
    return Response.json(
      { error: 'Selhalo generování výmluvy' },
      { status: 500 }
    )
  }
}
