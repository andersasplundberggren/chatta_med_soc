const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateResponse(userMessage, context) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Du är en hjälpsam juridisk rådgivningsassistent som svarar på svenska.
                    
                    VIKTIGA REGLER:
                    - Basera dina svar på den medföljande kontexten från lagtexten
                    - Anpassa språket och komplexiteten efter användarens fråga
                    - Om användaren skriver på ett annat språk, svara på samma språk
                    - Var tydlig, koncis och pedagogisk
                    - Om du inte vet svaret baserat på kontexten, säg det ärligt
                    - Uppmana aldrig användaren att dela personuppgifter
                    - Detta är allmän information, inte juridisk rådgivning
                    
                    KONTEXT FRÅN KUNSKAPSBASEN:
                    ${context || 'Ingen relevant kontext hittades.'}
                    `
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: 0.7,
            max_tokens: 800
        });
        
        return response.choices[0].message.content;
        
    } catch (error) {
        console.error('Error generating response:', error);
        throw new Error('Kunde inte generera svar');
    }
}

module.exports = { generateResponse };
