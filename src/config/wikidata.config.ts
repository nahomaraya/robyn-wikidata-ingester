import { registerAs } from '@nestjs/config';

export default registerAs('wikidata', () => ({
  clientId: process.env.WIKIDATA_CLIENT_ID,
  clientSecret: process.env.WIKIDATA_CLIENT_SECRET,
  lootingEventId: 'Q192623',
  battleOfMagdalaId: 'Q947667',
  locationPropertyId: 'P276',
  coordinatesPropertyId: 'P625',
  imagePropertyId: 'P18',
  lootingEventYear: '1868',
}));
