import { Injectable, Logger } from '@nestjs/common';
import { WikidataService} from 'src/mediawiki/wikidata.service';
import { CommonsService, CommonsImageInfo } from 'src/mediawiki/commons.service';
import { SparqlService } from 'src/mediawiki/sparql.service';
import { Collection } from './collection.interface';

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
      private readonly sparqlService: SparqlService
    ) {}
    
    async getLootedItems(): Promise<Collection[]> {
        const items = await this.sparqlService.queryItems();
        const itemPromises = items.map(async (item) => {
          try {
              const qid = item.item.value.split('/').pop(); // "Q135515584"
              const name = item.itemLabel?.value ?? '';
              const desc = item.itemDescription?.value ?? '';
  
              // Get full statements from Wikidata for this item
              const statements = await this.wikidataService.getItemStatements(qid);
  
              const locationId = statements['P276']?.[0]?.value?.content ?? null;
              let location: LocationInfo | null = null;
              if (locationId) {
                  const locationStatement = await this.wikidataService.getItemStatements(locationId);
                  const locationName = await this.wikidataService.getItemName(locationId);
                  const locationCoordinates = locationStatement['P625']?.[0]?.value?.content ?? null;
                  if (locationCoordinates) {
                      location = {
                          locationName,
                          latitude: locationCoordinates.latitude.toString(),
                          longitude: locationCoordinates.longitude.toString(),
                      };
                  }
              }
  
              // Extract P18 image name and resolve to Commons URLs
              const imageName = statements['P18']?.[0]?.value?.content ?? null;
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
