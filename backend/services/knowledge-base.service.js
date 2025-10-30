const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ladda embeddings från fil
let embeddingsData = null;

function loadEmbeddings() {
    if (!embeddingsData) {
        const embeddingsPath = path.join(__dirname, '../../embeddings/embeddings.json');
        embeddingsData = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
    }
    return embeddingsData;
}

// Beräkna cosine similarity
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

async function getRelevantContext(query, topK = 3) {
    try {
        // Skapa embedding för användarens fråga
        const queryEmbeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query
        });
        
        const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
        
        // Ladda alla embeddings
        const embeddings = loadEmbeddings();
        
        // Beräkna similarity för varje chunk
        const similarities = embeddings.map(item => ({
            ...item,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        }));
        
        // Sortera och ta top K
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topChunks = similarities.slice(0, topK);
        
        // Samla texten från de mest relevanta chunks
        const context = topChunks
            .map(chunk => `[Källa: ${chunk.source}]\n${chunk.text}`)
            .join('\n\n---\n\n');
        
        return context;
        
    } catch (error) {
        console.error('Error getting relevant context:', error);
        return '';
    }
}

module.exports = { getRelevantContext };
