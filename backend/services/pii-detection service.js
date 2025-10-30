const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectPII(text) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Billigare modell för PII-detektion
            messages: [
                {
                    role: 'system',
                    content: `Du är en expertdetektor för personuppgifter (PII). 
                    Analysera texten och svara ENDAST med "JA" om den innehåller:
                    - Personnummer
                    - Fullständiga namn (för- och efternamn tillsammans)
                    - Adresser
                    - Telefonnummer
                    - E-postadresser
                    - Annan identifierbar personinformation
                    
                    Svara "NEJ" om texten INTE innehåller personuppgifter.
                    Svara ENDAST med JA eller NEJ, inget annat.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0,
            max_tokens: 10
        });
        
        const answer = response.choices[0].message.content.trim().toUpperCase();
        return answer === 'JA';
        
    } catch (error) {
        console.error('Error in PII detection:', error);
        // Vid fel, anta att det kan innehålla PII (säkrare)
        return true;
    }
}

module.exports = { detectPII };
