require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Dela upp text i chunks
function chunkText(text, maxChunkSize = 1000) {
    const paragraphs = text.split('\n\n');
    const chunks = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// Läs alla filer från en mapp
function readFilesFromDirectory(directory) {
    const files = fs.readdirSync(directory);
    const documents = [];
    
    for (const file of files) {
        const filePath = path.join(directory, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = chunkText(content);
        
        chunks.forEach((chunk, index) => {
            documents.push({
                source: `${file} (del ${index + 1})`,
                text: chunk
            });
        });
    }
    
    return documents;
}

async function generateEmbeddings() {
    try {
        console.log('Läser filer från kunskapsbasen...');
        
        // Läs lagtexter
        const lagtexterPath = path.join(__dirname, '../data/lagtexter');
        const lagtexter = readFilesFromDirectory(lagtexterPath);
        
        // Läs hemsideinnehåll
        const hemsidePath = path.join(__dirname, '../data/hemsideinnehåll');
        const hemsideinnehåll = readFilesFromDirectory(hemsidePath);
        
        const allDocuments = [...lagtexter, ...hemsideinnehåll];
        
        console.log(`Totalt ${allDocuments.length} dokument att bearbeta...`);
        
        const embeddingsData = [];
        
        // Generera embeddings för varje dokument
        for (let i = 0; i < allDocuments.length; i++) {
            const doc = allDocuments[i];
            console.log(`Bearbetar ${i + 1}/${allDocuments.length}: ${doc.source}`);
            
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: doc.text
            });
            
            embeddingsData.push({
                source: doc.source,
                text: doc.text,
                embedding: response.data[0].embedding
            });
            
            // Liten paus för att inte överbelasta API:et
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Spara embeddings till fil
        const outputPath = path.join(__dirname, '../embeddings/embeddings.json');
        fs.writeFileSync(outputPath, JSON.stringify(embeddingsData, null, 2));
        
        console.log(`✅ Embeddings skapade och sparade till ${outputPath}`);
        console.log(`Totalt ${embeddingsData.length} embeddings genererade.`);
        
    } catch (error) {
        console.error('❌ Fel vid generering av embeddings:', error);
        process.exit(1);
    }
}

generateEmbeddings();
```

## 12. .gitignore
```
# Node modules
node_modules/

# Environment variables
.env

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Embeddings (stora filer)
embeddings/*.json

# Optional: kommentera ut om du vill inkludera embeddings i repo
# embeddings/
