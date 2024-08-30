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

## Caveats

- This does not seem to work on mobile devices. The feature flag `http://localhost:3000/?iphone` will supposedly only call mobile compabitible APIs, but it currently does not work.
