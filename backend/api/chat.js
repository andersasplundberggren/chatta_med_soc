// api/chat.js
import OpenAI from 'openai';

// PII-detektion regex
const PII_PATTERNS = {
    personnummer: /\b\d{6}[-\s]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    telefon: /\b0\d{1,3}[-\s]?\d{5,8}\b/g,
};

function containsPII(text) {
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
        const { message, lawTexts } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Ogiltigt meddelande' });
        }

        // Frontend PII check (dubbel säkerhet)
        if (containsPII(message)) {
            return res.status(400).json({ 
                error: 'PII_DETECTED',
                message: 'Meddelandet innehåller personuppgifter'
            });
        }

        // AI-baserad PII detektion
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const piiCheck = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Analysera texten och svara ENDAST med "JA" om den innehåller personuppgifter (personnummer, fullständiga namn, adresser, telefonnummer, e-post). Svara "NEJ" annars.`
                },
                { role: 'user', content: message }
            ],
            temperature: 0,
            max_tokens: 10
        });

        if (piiCheck.choices[0].message.content.trim().toUpperCase() === 'JA') {
            return res.status(400).json({ 
                error: 'PII_DETECTED',
                message: 'AI detekterade personuppgifter i meddelandet'
            });
        }

        // Bygg kontext från lagtexter
        let context = "Du är en hjälpsam juridisk rådgivningsassistent som svarar på svenska.\n\n";
        context += "VIKTIGA REGLER:\n";
        context += "- Basera dina svar på medföljande lagtexter\n";
        context += "- Anpassa språk och komplexitet efter användarens fråga\n";
        context += "- Var tydlig, koncis och pedagogisk\n";
        context += "- Detta är allmän information, inte juridisk rådgivning\n\n";

        if (lawTexts && Object.keys(lawTexts).length > 0) {
            context += "LAGTEXTER:\n\n";
            for (const [law, text] of Object.entries(lawTexts)) {
                context += `=== ${law.toUpperCase()} ===\n${text.substring(0, 4000)}\n\n`;
            }
        }

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

        return res.status(200).json({ response });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'SERVER_ERROR',
            message: 'Ett fel uppstod vid bearbetning'
        });
    }
}
