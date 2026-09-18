# Reviews

## Vercel deployment

The Vercel function at `api/reviews.mjs` serves `/api/reviews`. Connect a private Vercel Blob store to the project in the Vercel Storage tab, include the Production environment, and redeploy. The connection supplies `BLOB_READ_WRITE_TOKEN`. Each review is saved as a separate blob, so concurrent submissions do not overwrite one another. Reviews already in the local `data/reviews.json` file are not migrated automatically.

## Local development

Run `npm run dev` and open `http://localhost:5173/`. Vite serves the local reviews API using `data/reviews.json`. `npm run preview` serves the production build with the same local API. `npm start` builds and serves the site through the Express server.

The page shows the latest 100 reviews and refreshes every 15 seconds. The local Express API can also stream updates. Review input is validated on the server and displayed as text.

Run `node --test reviews.test.js vercel-reviews.test.mjs` to check both review handlers.
