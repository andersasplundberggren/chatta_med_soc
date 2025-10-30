const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const piiWarning = document.getElementById('pii-warning');

const API_URL = 'http://localhost:3000/api/chat';

// Regex-mönster för personuppgifter
const PII_PATTERNS = {
    personnummer: /\b\d{6}[-\s]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    telefon: /\b0\d{1,3}[-\s]?\d{5,8}\b/g,
    // Mer avancerade mönster kan läggas till
};

// Frontend-validering av personuppgifter
function containsPII(text) {
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
        if (pattern.test(text)) {
            console.log(`PII detected: ${type}`);
            return true;
        }
    }
    return false;
}

function showPIIWarning() {
    piiWarning.classList.remove('hidden');
    setTimeout(() => {
        piiWarning.classList.add('hidden');
    }, 5000);
}

function addMessage(text, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message loading';
    loadingDiv.innerHTML = '<span>Tänker</span><span>.</span><span>.</span><span>.</span>';
    loadingDiv.id = 'loading-indicator';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeLoadingIndicator() {
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.remove();
}

async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Frontend PII-check
    if (containsPII(message)) {
        showPIIWarning();
        return;
    }
    
    // Visa användarens meddelande
    addMessage(message, false);
    userInput.value = '';
    
    // Visa laddningsindikator
    addLoadingIndicator();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        
        const data = await response.json();
        
        removeLoadingIndicator();
        
        if (data.error) {
            if (data.error === 'PII_DETECTED') {
                showPIIWarning();
                // Ta bort användarens meddelande från chatten
                chatContainer.lastChild.previousSibling.remove();
            } else {
                addMessage('Ett fel uppstod. Försök igen senare.', true);
            }
        } else {
            addMessage(data.response, true);
        }
    } catch (error) {
        removeLoadingIndicator();
        addMessage('Kunde inte ansluta till servern. Kontrollera din internetanslutning.', true);
        console.error('Error:', error);
    }
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
