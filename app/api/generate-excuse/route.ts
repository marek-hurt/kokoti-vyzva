import Groq from 'groq-sdk'

export const runtime = 'edge'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(req: Request) {
  try {
    const { stats } = await req.json()

    const systemPrompt = `Vygeneruj absurdní, vtipnou výmluvu v první osobě (já/mně/musel jsem).

PRAVIDLA:
- Maximálně 1-2 věty
- Používej vulgární humor
- Výmluva musí být naprostý nesmysl, ale vtipný
- Každá odpověď musí být ÚPLNĚ JINÁ než předchozí s jiným základem PROČ

Formát: "Dnes jsem nešel běhat, protože [něco úplně absurdního]"`

    let userContext = `Vygeneruj výmluvu:`

    if (stats) {
      if (stats.daysSinceLastActivity > 2) {
        userContext += ` Neběžel už ${stats.daysSinceLastActivity} dní, takže výmluva musí být extra kreativní, vysvětlující, proč vynechal tolik dní. V tomto případě klidně i 5 vět.`
      }
      if (stats.position > 5) {
        userContext += ` Je na ${stats.position}. místě, takže by měl mít ještě absurdnější výmluvu.`
      }
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext }
      ],
      model: 'groq/compound', // Groq's general purpose model
      temperature: 1.8, // Extrémní náhodnost
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
