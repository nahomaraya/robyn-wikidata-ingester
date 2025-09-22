import { registerAs } from '@nestjs/config';

export default registerAs('wikidata', () => ({
  clientId: process.env.WIKIDATA_CLIENT_ID,
  clientSecret: process.env.WIKIDATA_CLIENT_SECRET,
}));
