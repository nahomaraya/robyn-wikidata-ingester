import { Injectable, Logger } from '@nestjs/common';
import { WikidataService} from 'src/wikidata/wikidata.service';
import { CommonsService, CommonsImageInfo } from 'src/wikidata/commons.service';
import { SparqlService } from 'src/wikidata/sparql.service';
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
    ) {}


    async queryItemsWithFilters(
        year?: number,
        statements: string[] = [], // array of conditions like "ps:P793:Q192623"
      ): Promise<any[]> {
        const filterYear = year ? `FILTER(YEAR(?time) = ${year})` : '';
      
        // Build dynamic statements
        const statementFilters = statements
          .map((s) => {
            const [propType, propId, valueId] = s.split(':');
            // e.g. "ps:P793:Q192623" -> ?statement ps:P793 wd:Q192623.
            return `?statement ${propType} wd:${valueId}.`;
          })
          .join('\n');
      
    
      
        return this.sparqlService.queryItemsWithFilters(statementFilters, filterYear);
      }
    
    async getLootedItems(): Promise<Collection[]> {
        const items = await this.sparqlService.queryItems();
        const itemPromises = items.map(async (item) => {
          try {
              const qid = item.item.value.split('/').pop(); // "Q135515584"
              const name = item.itemLabel?.value ?? '';
              const desc = item.itemDescription?.value ?? '';
  
              // Get full statements from Wikidata for this item
              const statements = await this.wikidataService.getItemStatements(qid);
  
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

      
}
