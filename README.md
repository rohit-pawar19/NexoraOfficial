# Nexora website

The five site pages are rendered with React and built with Vite. Page markup is in `src/content/`; shared rendering and script initialization are in `src/main.jsx`.

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`. The local Vite server also serves the reviews API. Run `npm run build` to create the production site in `dist/`, or `npm run preview` to inspect that build. Netlify uses the same build command and its existing reviews function.
