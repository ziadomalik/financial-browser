# Financial Browser

### Dev Setup

1. Install dependencies (we use [pnpm](https://pnpm.io))

```bash
cd finanical-browser

pnpm install
```

2. Create a `.env` with the following variables:

```bash
SUPABASE_URL=""
SUPABASE_KEY=""
DATABASE_URL="" # Supabase Connection String
OPENAI_API_KEY=""

```

3. Run

```bash
pnpm dev
```