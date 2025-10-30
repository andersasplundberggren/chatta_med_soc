# chatta_med_soc

# Juridisk Rådgivningschatbot

En AI-driven chatbot för juridisk information med inbyggt PII-skydd.

## Funktioner

- ✅ AI-genererade svar baserade på lagtext och hemsideinnehåll
- ✅ Dubbelt PII-skydd (frontend + backend)
- ✅ Språkanpassning (svarar på samma språk som användaren)
- ✅ Innehållsanpassning baserat på användarens kunskapsnivå
- ✅ RAG-implementation med embeddings
- ✅ Rate limiting

## Installation

### Förutsättningar
- Node.js (v16 eller senare)
- OpenAI API-nyckel

### Steg 1: Klona och installera
```bash
git clone https://github.com/dittanvändarnamn/legal-chatbot.git
cd legal-chatbot
cd backend
npm install
```

### Steg 2: Konfigurera environment
```bash
cp .env.example .env
# Redigera .env och lägg till din OpenAI API-nyckel
```

### Steg 3: Lägg till lagtexter
Placera dina lagtexter i `data/lagtexter/` och hemsideinnehåll i `data/hemsideinnehåll/`

### Steg 4: Generera embeddings
```bash
npm run generate-embeddings
```

### Steg 5: Starta servern
```bash
npm start
```

### Steg 6: Öppna frontend
Öppna `frontend/index.html` i din webbläsare.

## Användning

1. Skriv din fråga i textfältet
2. Systemet kontrollerar automatiskt om meddelandet innehåller personuppgifter
3. Om inga personuppgifter detekteras, genereras ett svar baserat på kunskapsbasen
4. Svaret anpassas automatiskt till ditt språk och kunskapsnivå

## Säkerhet

- API-nyckeln exponeras aldrig i frontend-kod
- Dubbel PII-validering (regex + AI)
- Rate limiting för att förhindra missbruk
- Ingen lagring av konversationer

## Kostnad

Använder OpenAI API som debiteras per token. Beräknad kostnad per konversation: ~$0.01-0.05

## Licens

MIT
