# Natural Voice Chat

## Get started

```bash
cp .env.example .env
# Make sure you add endpoints and API keys in the newly created .env file.

npm install
npm start
```

Visit `http://localhost:3000` in your browser.

## Dev mode

Dev mode allow hot reload for both server and client changes.

```bash
npm run dev
```

Visit `http://localhost:3004` in your browser.

## Notes

- The Speech SDK does not appear to work on mobile devices. The feature flagged url `http://localhost:3000/?iphone` will call mobile compabitible APIs, but it currently does not work.
- Anyone visiting the app will gain access to Speech API and Azure OpenAI API. Additional authentication is needed for real-world implementation. For demo purpose:
  - Server trades Speech API key for a short-lived token
  - Server injects API key to OpenAI API calls
