import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SparqlService } from './sparql.service';

interface LocationInfo {
  locationName: string;
  latitude: string,
  longitude: string,
}

@Injectable()
export class WikidataService {
  private readonly logger = new Logger(WikidataService.name);
  private clientId: string;
  private clientSecret: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private wikidataUrl: string = 'https://www.wikidata.org/w/rest.php';


  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly sparqlService: SparqlService
  ) {
    this.clientId = this.configService.get<string>('wikidata.clientId') ?? '';
    this.clientSecret = this.configService.get<string>('wikidata.clientSecret') ?? '';
  }

  private async fetchAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      this.logger.debug('Using cached access token');
      return this.token;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.wikidataUrl}/oauth2/access_token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      // this.logger.log(`New access token fetched. Expires in ${response.data.expires_in}s`);

      return this.token!;
    } catch (error) {
      this.logger.error(`Failed to fetch access token: ${error.message}`);
      throw new HttpException('Failed to fetch access token', 500);
    }
  }

  // private async getItemDescription(qid: string): Promise<string | null> {
  //   try {
  //     const itemData = await this.wikidataService.getItemStatements(qid);

  //     // Fallback — some items may have descriptions from a different call
  //     const fullItem = await this.wikidataService.getItemName(qid);

  //     // Prefer the 'en' description if available
  //     return (
  //       itemData?.descriptions?.en?.value ??
  //       fullItem?.descriptions?.en?.value ??
  //       null
  //     );
  //   } catch (error) {
  //     this.logger.warn(`Failed to fetch description for ${qid}: ${error.message}`);
  //     return null;
  //   }
  // }

  async getItemDate(statements): Promise<string | null> {
    try {
      const datePropertyCandidates = [
        'P580', // start time
        'P582', // end time
        'P585', // point in time
        'P571', // inception
        'P569', // date of birth (for people)
        'P570', // date of death
        'P577'
      ];

      for (const propId of datePropertyCandidates) {
        const dateStatement = statements[propId]?.[0];
        const dateValue = dateStatement?.value?.content ?? null;
        if (dateValue) {
          const parsedDate = this.parseWikidataDate(dateValue);
          if (parsedDate) {
            return parsedDate.toISOString();
          }
        }
      }

      return null; // No date found
    } catch (error) {
      this.logger.warn(`Failed to fetch date for: ${error.message}`);
      return null;
    }
  }


  private parseWikidataDate(dateValue: any): Date | null {
    try {
      let timeString: string;

      // Wikidata encodes time as an object with a `time` field (e.g., { time: '+1917-01-01T00:00:00Z', precision: 9 })
      if (typeof dateValue === 'object' && dateValue.time) {
        timeString = dateValue.time;
      }
      // In some rare cases, it's just a plain string
      else if (typeof dateValue === 'string') {
        timeString = dateValue;
      }
      else {
        this.logger.warn(`Unexpected date value format: ${JSON.stringify(dateValue)}`);
        return null;
      }

      // Remove leading "+" if present
      let cleanDate = timeString.startsWith('+') ? timeString.substring(1) : timeString;

      // Replace invalid month/day zeros with defaults
      cleanDate = cleanDate.replace(/-00-/g, '-01-').replace(/-00T/g, '-01T');

      const date = new Date(cleanDate);
      if (isNaN(date.getTime())) {
        this.logger.warn(`Invalid date format: ${timeString}`);
        return null;
      }

      return date;
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${error.message}`);
      return null;
    }
  }


  async getItemLocation(statements): Promise<LocationInfo | null> {
    try {


      // Possible property IDs for location (expandable)
      const locationPropertyCandidates = [
        this.configService.get('wikidata.locationPropertyId'),   // e.g. P276
        'P17',  // country
        'P131', // located in the administrative territorial entity
        'P625', // coordinate location
        'P159', // headquarters location
        'P495', // country of origin
        'P1071',
      ].filter(Boolean);

      for (const propId of locationPropertyCandidates) {
        const locationStatement = statements[propId]?.[0];
        if (!locationStatement) continue;

        const locationId = locationStatement.value?.content ?? null;
        if (!locationId) continue;

        const locationName = await this.getItemName(locationId);
        const locationDetails = await this.getItemStatements(locationId);
        const coordinates =
          locationDetails[this.configService.get('wikidata.coordinatesPropertyId')]?.[0]
            ?.value?.content ?? null;

        if (coordinates) {
          return {
            locationName,
            latitude: coordinates.latitude?.toString() ?? '',
            longitude: coordinates.longitude?.toString() ?? '',
          };
        } else {
          // If coordinates not available, still return the name
          return {
            locationName,
            latitude: '',
            longitude: '',
          };
        }
      }

      return null; // No location found
    } catch (error) {
      this.logger.warn(`Failed to fetch location: ${error.message}`);
      return null;
    }
  }


  async getItemName(itemId: string): Promise<string> {
    const accessToken = await this.fetchAccessToken();
    const isProperty = itemId.startsWith('P');
    const url = isProperty
      ? `${this.wikidataUrl}/wikibase/v1/entities/properties/${itemId}`
      : `${this.wikidataUrl}/wikibase/v1/entities/items/${itemId}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const entity = response.data;
      // Labels are nested under entity.labels.<lang>.value
      const itemLabel =
        entity?.labels?.en ??
        entity?.labels?.[Object.keys(entity.labels || {})[0]] ??
        '';

      if (!itemLabel) {
        this.logger.warn(`No label found for item: ${itemId}`);
      }

      this.logger.log(itemLabel);
      return itemLabel;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata item label for ${itemId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(`Failed to fetch item label for ${itemId}`, 500);
    }
  }

  async getItemStatements(itemId: string) {
    const accessToken = await this.fetchAccessToken();
    const url = `${this.wikidataUrl}/wikibase/v1/entities/items/${itemId}/statements`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata item ${itemId}: ${error.message}`,
      );
      throw new HttpException('Failed to fetch Wikidata item', 500);
    }
  }

  async getPropertyStatements(propertyId: string) {
    try {
      if (!propertyId.startsWith('P')) {
        throw new Error(`Invalid property ID: ${propertyId}`);
      }

      // Use the old but stable entitydata endpoint
      const url = `https://www.wikidata.org/wiki/Special:EntityData/${propertyId}.json`;

      const response = await firstValueFrom(this.httpService.get(url));

      const data = response.data?.entities?.[propertyId];

      if (!data) {
        throw new Error(`No data found for property ${propertyId}`);
      }

      // Extract claims (statements) directly
      const statements = data.claims || {};

      this.logger.log(
        `Fetched ${Object.keys(statements).length} statements for property ${propertyId}`,
      );

      return statements;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata property ${propertyId}: ${error.message}`,
      );
      throw new HttpException('Failed to fetch Wikidata property', 500);
    }
  }



  async extractIdentifiers(statements: any): Promise<{ property: string; value: string; url?: string }[]> {
    const identifiers: { property: string; value: string; url?: string }[] = [];
    for (const [prop, values] of Object.entries(statements)) {
      for (const v of values as any[]) {
        // 1️⃣ Check if mainsnak itself is a URL
        if (v.mainsnak?.datatype === 'url') {
          const value = v.mainsnak?.datavalue?.value ?? '';
          let url: string | undefined;
          if (v.propertyInfo?.formatterUrl && value) {
            url = v.propertyInfo.formatterUrl.replace('$1', encodeURIComponent(value));
          }
          identifiers.push({ property: prop, value, url });
        }

        // 2️⃣ Extract URLs from references
        if (Array.isArray(v.references)) {
          for (const ref of v.references) {
            if (Array.isArray(ref.parts)) {
              for (const part of ref.parts) {
                if (part.property?.data_type === 'url') {
                  const urlValue = part.value?.content ?? '';
                  if (urlValue) {
                    identifiers.push({ property: prop, value: urlValue, url: urlValue });
                  }
                }
              }
            }
          }
        }
      }
    }

    return identifiers;
  }


  async getItemIdFromName(name: string, language: string = 'en'): Promise<string | null> {
    const url = `https://www.wikidata.org/w/api.php`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            action: 'wbsearchentities',
            search: name,
            language,
            format: 'json',
            type: 'item',
            limit: 1, // return top match only
          },
        }),
      );

      const searchResults = response.data?.search || [];

      if (searchResults.length === 0) {
        this.logger.warn(`No Wikidata entity found for name: "${name}"`);
        return null;
      }

      const itemId = searchResults[0].id; // e.g. "Q947667"
      this.logger.log(`Found Wikidata entity for "${name}": ${itemId}`);

      return itemId;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata itemId for "${name}": ${error.message}`,
        error.stack,
      );
      throw new HttpException('Failed to fetch Wikidata itemId from name', 500);
    }
  }

  async getMultiValueProperties(

    statements: Record<string, any[]>,
    itemId?: string,
  ): Promise<string[]> {
    try {
      if (!statements || typeof statements !== 'object') {
        this.logger.warn('Invalid statements input');
        return [];
      }

      const targetIds = ['Q18635217', 'Q18615777','Q22964785', 'Q51077473','P793', 'P1344','P155','P156']; // your list of target types

      // 🔹 Helper: check if entity is instance/subclass of *any* of these targets
      const isSubclassOrInstanceOf = async (
        entityId: string,
        targetIds: string[],
      ): Promise<boolean> => {
        try {
          // Use the unified entity fetcher (works for Qs or Ps)
          const entityStatements = await this.getPropertyStatements(entityId);

          const instanceOf = entityStatements['P31'] || []; // instance of
          const subclassOf = entityStatements['P279'] || []; // subclass of
          const subPropertyOf = entityStatements['P1647'] || [];

          const relatedIds = [
            ...instanceOf.map(v => v.mainsnak?.datavalue?.value?.id),
            ...subclassOf.map(v => v.mainsnak?.datavalue?.value?.id),
            ...subPropertyOf.map(v => v.mainsnak?.datavalue?.value?.id),
          ].filter(Boolean);

          // ✅ Check if any related ID matches any of the targets
          return relatedIds.some(id => targetIds.includes(id));
        } catch (e) {
          this.logger.warn(`Relation check failed for ${entityId}: ${e.message}`);
          return false;
        }
      };


      const multiValueProps: string[] = [];

      // 🔹 Loop through all properties in the statements
      for (const [propId] of Object.entries(statements)) {

        const isRelevant = await isSubclassOrInstanceOf(propId, targetIds);
        if (!isRelevant) continue;

        const values = await this.sparqlService.getValuesFromProperty(itemId ? itemId : '', propId);

        // Extract all entity QIDs from SPARQL bindings
        const entityIds = values
          .map(v => v.valueQID?.value)
          .filter((id): id is string => Boolean(id));

        // ✅ Step 3: Only add property if it has > 1 distinct entity values
        const distinctEntityIds = [...new Set(entityIds)];
        if (distinctEntityIds.length > 1) {
          multiValueProps.push(propId);
        }
      }
      return multiValueProps;
    } catch (error) {
      this.logger.error(`Failed to find multi-value properties: ${error.message}`, error.stack);
      return [];
    }
  }



}
