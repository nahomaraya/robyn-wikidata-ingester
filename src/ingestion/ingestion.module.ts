import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { HttpModule } from '@nestjs/axios';
import { WikidataModule } from 'src/wikidata/wikidata.module';

@Module({
  imports: [HttpModule, WikidataModule],
  providers: [IngestionService],
  controllers: [IngestionController],
  exports: [IngestionService]
})
export class IngestionModule {}
