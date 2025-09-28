import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { HttpModule } from '@nestjs/axios';
import { MediawikiModule } from 'src/mediawiki/mediawiki.module';

@Module({
  imports: [HttpModule, MediawikiModule],
  providers: [CollectionService],
  controllers: [CollectionController],
  exports: [CollectionService]
})
export class CollectionModule {}
