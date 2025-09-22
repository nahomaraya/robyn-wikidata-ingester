import { Controller, Get, Param } from '@nestjs/common';
import { WikidataService } from './wikidata.service';
import { SparqlService } from './sparql.service';

@Controller('wikidata')
export class WikidataController {
  constructor(private readonly wikidataService: WikidataService, private readonly sparqlService: SparqlService) {}

  @Get(':id')
  async getItem(@Param('id') id: string) {
    return this.wikidataService.getItemStatements(id);
  }
  @Get('items')
  async getItems() {
    return this.sparqlService.queryItems();
  }
}
