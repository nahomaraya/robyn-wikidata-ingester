import { Module } from '@nestjs/common';
import { WikidataController } from './wikidata.controller';
import { WikidataService } from './wikidata.service';
import { SparqlService } from './sparql.service';

@Module({
  providers: [WikidataService, SparqlService],
  controllers: [WikidataController],
  exports: [WikidataService, SparqlService],
})
export class WikidataModule {}
