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
      @Query('timePeriod') timePeriod?: string, // handle single or multiple
    ) {
      return this.collectionService.queryItemsWithFilters(year, timePeriod);
    }
}
