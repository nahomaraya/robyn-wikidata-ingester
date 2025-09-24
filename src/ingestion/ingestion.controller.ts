import { Controller, Get, Query } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingest')
export class IngestionController {

    constructor(private readonly ingestionService: IngestionService){}

    @Get('items')
    async ingestItems() {
        return this.ingestionService.ingestItems();
    }
}
