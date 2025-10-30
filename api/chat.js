// api/chat.js
import OpenAI from 'openai';

// PII-detektion (Frontend backup)
const PII_PATTERNS = {
    personnummer: /\b(19|20)?\d{6}[-\s]?\d{4}\b/g,
    samordningsnummer: /\b(19|20)?\d{2}(0[1-9]|1[0-2])(6[1-9]|7[0-9]|8[0-9]|9[0-1])\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    telefon: /\b(0|\+46)[-\s]?\d{1,3}[-\s]?\d{5,8}\b/g,
    fullnamn: /\b[A-ZÅÄÖ][a-zåäö]+\s+[A-ZÅÄÖ][a-zåäö]+(\s+[A-ZÅÄÖ][a-zåäö]+)?\b/g,
    gatuadress: /\b[A-ZÅÄÖ][a-zåäö]+(?:gatan|vägen|stigen|gränden|plan|allén)\s+\d+[A-Za-z]?\b/gi,
    postnummer: /\b\d{3}\s?\d{2}\b/g
};

function containsPIIRegex(text) {
    for (const pattern of Object.values(PII_PATTERNS)) {
        if (pattern.test(text)) return true;
    }
    return false;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, sources } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Ogiltigt meddelande' });
        }

        // Regex PII-check (snabb första kontroll)
        if (containsPIIRegex(message)) {
            console.log('PII detected by regex');
            return res.status(400).json({ 
                error: 'PII_DETECTED',
                message: 'Meddelandet innehåller personuppgifter (regex)'
            });
        }

        // AI-baserad PII detektion (andra kontrollen)
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        console.log('Checking for PII with AI...');
        const piiCheck = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Du är en expertdetektor för personuppgifter enligt GDPR. 
                    
Analysera texten och svara ENDAST med "JA" om den innehåller NÅGON av följande:
- Personnummer eller samordningsnummer
- Fullständiga namn (förnamn + efternamn)
- Gatuadresser
- Telefonnummer
- E-postadresser
- Postnummer i kombination med annan identifierbar information
- Andra uppgifter som direkt kan identifiera en person

Svara "NEJ" om texten INTE innehåller personuppgifter.
Svara ENDAST med JA eller NEJ, inget annat.`
                },
                { role: 'user', content: message }
            ],
            temperature: 0,
            max_tokens: 10
        });

        const aiResponse = piiCheck.choices[0].message.content.trim().toUpperCase();
        console.log('AI PII check result:', aiResponse);

        if (aiResponse === 'JA') {
            console.log('PII detected by AI');
            return res.status(400).json({ 
                error: 'PII_DETECTED',
                message: 'AI detekterade personuppgifter i meddelandet'
            });
        }

        // Bygg kontext från alla källor
        let context = `Du är en hjälpsam assistent för Karlskoga kommuns socialtjänst.

VIKTIGA REGLER:
- Svara ALLTID på svenska
- Basera dina svar på tillgängliga källor nedan
- Gällande lag är nya Socialtjänstlagen (2025) som trädde i kraft maj 2025
- Prioritera lagtext framför annat material
- Referera till kommunens rutiner och riktlinjer när relevant
- Var tydlig, koncis och pedagogisk
- Skriv alla svar med ett enkelt språk
- Hänvisa till specifika källor och paragrafer när relevant
- Om frågan inte kan besvaras utifrån källorna, säg det ärligt
- Detta är allmän information, inte juridisk rådgivning
- Påminn ALDRIG användaren om att skriva personuppgifter

`;

        if (sources && Object.keys(sources).length > 0) {
            context += `TILLGÄNGLIGA KÄLLOR:\n\n`;
            
            // Begränsa total text för att hålla nere kostnader
            const MAX_TOTAL_CHARS = 12000;
            let currentChars = 0;
            
            // Konvertera sources till array och sortera efter längd (kortare först för att få med fler källor)
            const sourceEntries = Object.entries(sources).sort((a, b) => a[1].length - b[1].length);
            
            for (const [name, content] of sourceEntries) {
                const remainingChars = MAX_TOTAL_CHARS - currentChars;
                
                if (remainingChars <= 500) {
                    console.log(`Nått maxgräns för text, hoppar över: ${name}`);
                    break;
                }
                
                // Ta så mycket text som får plats
                const excerpt = content.substring(0, Math.min(content.length, remainingChars));
                context += `\n=== ${name.toUpperCase()} ===\n${excerpt}\n\n`;
                currentChars += excerpt.length;
            }
            
            console.log(`Använder ${currentChars} tecken från ${Object.keys(sources).length} källor`);
        } else {
            context += `\nOBS: Inga källor kunde laddas. Svara baserat på din allmänna kunskap om Socialtjänstlagen och socialtjänst.\n\n`;
        }

        console.log('Generating response...');
        // Generera svar
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: context },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = completion.choices[0].message.content;
        console.log('Response generated successfully');

        return res.status(200).json({ response });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'SERVER_ERROR',
            message: 'Ett fel uppstod vid bearbetning av meddelandet'
        });
    }
}
