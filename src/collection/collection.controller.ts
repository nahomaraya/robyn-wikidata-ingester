import { Controller, Get, Query } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Controller('collection')
export class CollectionController {

    constructor(private readonly collectionService: CollectionService){}

    @Get('items')
    async getLootedItems() {
        return this.collectionService.getLootedItems();
    }

    @Get('filter')
    async getItemsWithFilters(
      @Query('year') year?: number,
      @Query('statement') statements?: string | string[], // handle single or multiple
    ) {
      const statementArray = Array.isArray(statements) ? statements : statements ? [statements] : [];
      return this.collectionService.queryItemsWithFilters(year, statementArray);
    }
}
