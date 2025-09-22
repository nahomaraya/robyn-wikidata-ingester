import { registerAs } from '@nestjs/config';

export default registerAs('wikidata', () => ({
  // clientId: process.env.WIKIDATA_CLIENT_ID,
  // clientSecret: process.env.WIKIDATA_CLIENT_SECRET,
  clientId: "1355d0ca1f69c38ac0770985fbf367ac",
  clientSecret: "080de0aa66e9a989f4b130c210c582a74be5dabd",
}));
