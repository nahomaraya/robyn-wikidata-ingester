import { Test, TestingModule } from '@nestjs/testing';
import { SparqlService } from '../wikidata/sparql.service';

describe('SparqlService', () => {
  let service: SparqlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SparqlService],
    }).compile();

    service = module.get<SparqlService>(SparqlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
