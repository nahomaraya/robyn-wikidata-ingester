import { Injectable, Logger } from '@nestjs/common';
import { WikidataService} from 'src/wikidata/wikidata.service';
import { CommonsService, CommonsImageInfo } from 'src/wikidata/commons.service';
import { SparqlService } from 'src/wikidata/sparql.service';

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
    
            // Extract current location (P276)
            const location = statements['P276']?.[0]?.value?.content ?? null;
    
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
              current_location: location,
              image: imageInfo, // contains file + thumbnails
            });
          } catch (err) {
            this.logger.error(`Error ingesting item: ${err.message}`);
          }
        }
    
        return results;
      }
}
