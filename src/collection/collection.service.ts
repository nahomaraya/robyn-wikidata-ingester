import { Injectable, Logger, HttpException } from '@nestjs/common';
import { WikidataService } from '../wikidata/wikidata.service';
import { CommonsService, CommonsImageInfo } from '../wikidata/commons.service';
import { SparqlService } from '../wikidata/sparql.service';
import { Collection } from './collection.interface';
import { ConfigService } from '@nestjs/config';

interface LocationInfo {
  locationName: string;
  latitude: string,
  longitude: string,
}

@Injectable()
export class CollectionService {

  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly wikidataService: WikidataService,
    private readonly commonsService: CommonsService,
    private readonly sparqlService: SparqlService,
    private readonly configService: ConfigService
  ) { }

  private async getItemDetails(items: any[]): Promise<Collection[]> {
    const itemPromises = items.map(async (item) => {
      try {
        const qid = item.item.value.split('/').pop(); // "Q135515584"
        const name = item.itemLabel?.value ?? '';
        const desc = item.itemDescription?.value ?? '';

        // Get full statements from Wikidata for this item
        const statements = await this.wikidataService.getItemStatements(qid);
        const identifier = await this.getFirstItemIdentifier(qid, statements);
        const locationId = statements[this.configService.get('wikidata.locationPropertyId')]?.[0]?.value?.content ?? null;
        let location: LocationInfo | null = null;
        if (locationId) {
          const locationStatement = await this.wikidataService.getItemStatements(locationId);
          const locationName = await this.wikidataService.getItemName(locationId);
          const locationCoordinates = locationStatement[this.configService.get('wikidata.coordinatesPropertyId')]?.[0]?.value?.content ?? null;
          if (locationCoordinates) {
            location = {
              locationName,
              latitude: locationCoordinates.latitude.toString(),
              longitude: locationCoordinates.longitude.toString(),
            };
          }
        }

        // Extract P18 image name and resolve to Commons URLs
        const imageName = statements[this.configService.get('wikidata.imagePropertyId')]?.[0]?.value?.content ?? null;
        let imageInfo: CommonsImageInfo | { error: string } | null = null;
        if (imageName) {
          imageInfo = await this.commonsService.getImageByName(imageName);
        }

        return {
          id: qid,
          name,
          desc,
          location,
          image: imageInfo,
          identifier,
        };
      } catch (err) {
        this.logger.error(`Error ingesting item ${item.item.value}: ${err.message}`);
        return null; // or { error: err.message } if you want to keep track
      }
    });

    // Wait for all promises to resolve in parallel
    const results = await Promise.all(itemPromises);
    return results.filter((r) => r !== null);

  }

  private async getValueDetails(items: any[]): Promise<any[]> {
    const itemPromises = items.map(async (item) => {
      try {
        const qid = item.valueQID?.value ?? ''; // "Q135515584"
        const name = item.valueLabel?.value ?? '';
        const desc = item.valueDescription?.value ?? '';

        // Get full statements from Wikidata for this item
        const statements = await this.wikidataService.getItemStatements(qid);
        const identifier = await this.getFirstItemIdentifier(qid, statements);
        const location: LocationInfo | null = await this.wikidataService.getItemLocation(statements);
        const date = await this.wikidataService.getItemDate(statements);
        // Extract P18 image name and resolve to Commons URLs
        const imageName = statements[this.configService.get('wikidata.imagePropertyId')]?.[0]?.value?.content ?? null;
        let imageInfo: CommonsImageInfo | { error: string } | null = null;
        if (imageName) {
          imageInfo = await this.commonsService.getImageByName(imageName);
        }

        return {
          id: qid,
          name,
          desc,
          location,
          date,
          image: imageInfo,
          identifier,
        };
      } catch (err) {
        this.logger.error(`Error ingesting item ${item.item.value}: ${err.message}`);
        return null; // or { error: err.message } if you want to keep track
      }
    });

    // Wait for all promises to resolve in parallel
    const results = await Promise.all(itemPromises);
    const filtered = results.filter((r) => r !== null);

    // Sort by date (descending: newest first)
    filtered.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  return filtered;

  }

  private async getFirstItemIdentifier(qid: string, statements: any): Promise<string | null> {
    const identifiers = await this.wikidataService.extractIdentifiers(statements);

    // 1. Check identifiers directly for URLs
    const firstIdentifierWithUrl = identifiers.find(id => !!id.url);
    if (firstIdentifierWithUrl) {
      return firstIdentifierWithUrl.url!;
    }

    // 2. Look through sitelinks (if present)
    if ((identifiers as any)?.sitelinks) {
      const sitelinks = (identifiers as any).sitelinks;
      const firstSitelink = Object.values(sitelinks)[0] as any;
      if (firstSitelink?.url) {
        return firstSitelink.url;
      }
    }

    // 3. Scan statement values for plain string URLs
    for (const values of Object.values(statements)) {
      for (const v of values as any[]) {
        const val = v?.mainsnak?.datavalue?.value ?? v?.value?.content;
        if (typeof val === 'string' && val.startsWith('http')) {
          return val;
        }
      }
    }

    // 4. Also check references attached to statements for URLs
    for (const values of Object.values(statements)) {
      for (const v of values as any[]) {
        if (v?.references) {
          for (const ref of v.references) {
            for (const snakValues of Object.values(ref.snaks || {})) {
              for (const snak of snakValues as any[]) {
                const refVal = snak?.datavalue?.value;
                if (typeof refVal === 'string' && refVal.startsWith('http')) {
                  return refVal;
                }
              }
            }
          }
        }
      }
    }

    return null; // nothing found
  }

  async queryItemsWithFilters(
    year?: number,
    timePeriod?: string, // array of conditions like "ps:P793:Q192623"
  ): Promise<Collection[]> {

    const qid = await this.wikidataService.getItemIdFromName(timePeriod ?? '');
    if (qid === null) {
      throw new HttpException(`Wikidata item not found for time period: ${timePeriod}`, 404);
    }
    const items = this.sparqlService.queryItemsWithFilters(year ? year.toString() : undefined, qid);
    return this.getItemDetails(await items);
  }

  async getMultipleValue(itemId?: string, propertyId?: string){
    const items = await this.sparqlService.getValuesFromProperty(itemId??'', propertyId??'');
    return this.getValueDetails(items);
  }

  async getLootedItems(): Promise<Collection[]> {
    const items = await this.sparqlService.queryItems();
    return this.getItemDetails(items);
  }


}
