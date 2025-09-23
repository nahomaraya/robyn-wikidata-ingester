import { Controller, Get, Param, Logger } from '@nestjs/common';
import { WikidataService } from './wikidata.service';
import { SparqlService } from './sparql.service';

@Controller('wikidata')
export class WikidataController {
  private readonly logger = new Logger(WikidataController.name);
  constructor(private readonly wikidataService: WikidataService, private readonly sparqlService: SparqlService) {}

  @Get('item/:id')
  async getItem(@Param('id') id: string) {
    this.logger.log('Getting single item');
    return this.wikidataService.getItemStatements(id);
  }
  @Get('items')
  async getItems() {
    this.logger.log('Getting items');
    return this.sparqlService.queryItems();
  }
}
