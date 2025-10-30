const express = require('express');
const router = express.Router();
const piiDetectionService = require('../services/pii-detection.service');
const knowledgeBaseService = require('../services/knowledge-base.service');
const openaiService = require('../services/openai.service');

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Ogiltigt meddelande' });
        }
        
        // Backend PII-detektion (AI-baserad)
        const containsPII = await piiDetectionService.detectPII(message);
        
        if (containsPII) {
            return res.status(400).json({ 
                error: 'PII_DETECTED',
                message: 'Meddelandet innehåller personuppgifter'
            });
        }
        
        // Hämta relevant kontext från kunskapsbasen
        const context = await knowledgeBaseService.getRelevantContext(message);
        
        // Generera svar med OpenAI
        const response = await openaiService.generateResponse(message, context);
        
        res.json({ response });
        
    } catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).json({ 
            error: 'SERVER_ERROR',
            message: 'Ett fel uppstod vid bearbetning av meddelandet'
        });
    }
});

module.exports = router;
