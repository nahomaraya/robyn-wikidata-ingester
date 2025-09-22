import { Module } from '@nestjs/common';
import { WikidataController } from './wikidata.controller';
import { WikidataService } from './wikidata.service';

@Module({
  providers: [WikidataService],
  controllers: [WikidataController],
  exports: [WikidataService],
})
export class WikidataModule {}
