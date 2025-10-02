# Robyn Wikidata Ingester

A NestJS service for ingesting cultural heritage data from Wikidata and Wikimedia Commons.

## Quick Start

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**
Create a `.env` file with:
```env
WIKIDATA_CLIENT_ID=your_wikidata_client_id
WIKIDATA_CLIENT_SECRET=your_wikidata_client_secret
WIKIDATA_LOCATION_PROPERTY_ID=P276
WIKIDATA_COORDINATES_PROPERTY_ID=P625
WIKIDATA_IMAGE_PROPERTY_ID=P18
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

3. **Run the project:**
```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

4. **Swagger Url:**
```bash
curl http://localhost:3000/api
