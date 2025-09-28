import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WikidataController } from './wikidata.controller';
import { WikidataService } from './wikidata.service';
import { SparqlService } from './sparql.service';
import { CommonsService } from './commons.service';

@Module({
  imports: [HttpModule],
  providers: [WikidataService, SparqlService, CommonsService],
  controllers: [WikidataController],
  exports: [WikidataService, SparqlService, CommonsService],
})
export class MediawikiModule {}
