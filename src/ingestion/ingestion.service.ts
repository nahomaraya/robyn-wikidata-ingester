import { Injectable, Logger } from '@nestjs/common';
import { WikidataService} from 'src/wikidata/wikidata.service';
import { CommonsService, CommonsImageInfo } from 'src/wikidata/commons.service';
import { SparqlService } from 'src/wikidata/sparql.service';


interface LocationInfo {
  locationName: string;
  latitude: string,
  longitude: string,
}

@Injectable()
export class IngestionService {

    private readonly logger = new Logger(IngestionService.name);

    constructor(
      private readonly wikidataService: WikidataService,
      private readonly commonsService: CommonsService,
      private readonly sparqlService: SparqlService
    ) {}
    
    async ingestItems(): Promise<any[]> {
        const items = await this.sparqlService.queryItems();
        const results: any[] = [];
    
        for (const item of items) {
          try {
            const qid = item.item.value.split('/').pop(); // "Q135515584"
            const name = item.itemLabel?.value ?? '';
            const desc = item.itemDescription?.value ?? '';
    
            // Get full statements from Wikidata for this item
            const statements = await this.wikidataService.getItemStatements(qid);
            const locationId = statements['P276']?.[0]?.value?.content ?? null
            const locationStatement = await this.wikidataService.getItemStatements(locationId);
            const locationName =  await this.wikidataService.getItemName(locationId);
            const locationCoordinates = locationStatement['P625']?.[0]?.value?.content ?? null;
            let location: LocationInfo | null = null;
            if (locationCoordinates) {
              location = {
                locationName: locationName,
                latitude: locationCoordinates.latitude.toString(),
                longitude: locationCoordinates.longitude.toString(),
              };
            }

            // Extract P18 image name and resolve to Commons URLs
            const imageName = statements['P18']?.[0]?.value?.content ?? null;
            let imageInfo: CommonsImageInfo | { error: string } | null = null;;
            if (imageName) {
              imageInfo = await this.commonsService.getImageByName(imageName);
            }
            results.push({
              id: qid,
              name,
              desc,
              location: location,
              image: imageInfo, // contains file + thumbnails
            });
          } catch (err) {
            this.logger.error(`Error ingesting item: ${err.message}`);
          }
        }
    
        return results;
      }
}
