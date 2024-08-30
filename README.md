# Natural Voice Chat

## Get started

```bash
# One time install of dependencies
npm install

# Dev server with hot reloading
npm run dev

# Build as static web app in /dist
npm run build
```

## Notes

- The Speech SDK does not appear to work on mobile devices. The feature flagged url `http://localhost:5173/?iphone` will call mobile compabitible APIs, but it currently does not work.
- Credentials are stored in browser `localStorage`. Production code should involve server side authentication
