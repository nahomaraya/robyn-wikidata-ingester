import { Controller, Get, Param } from '@nestjs/common';
import { WikidataService } from './wikidata.service';

@Controller('wikidata')
export class WikidataController {
  constructor(private readonly wikidataService: WikidataService) {}

  @Get(':id')
  async getItem(@Param('id') id: string) {
    return this.wikidataService.getItemStatements(id);
  }
}
