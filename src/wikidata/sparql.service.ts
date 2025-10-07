import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { StateService } from '../state/state.service';




@Injectable()
export class SparqlService {
  private readonly logger = new Logger(SparqlService.name);
  private sparqlUrl: string = 'https://query.wikidata.org/sparql';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly stateService: StateService
  ) { }

  /**
   * Generic SPARQL executor
   */
  private async runQuery(sparqlQuery: string): Promise<any[]> {
    const fullUrl = this.sparqlUrl + '?query=' + encodeURIComponent(sparqlQuery);

    try {
      const response = await firstValueFrom(
        this.httpService.get(fullUrl, {
          headers: { Accept: 'application/sparql-results+json' },
        }),
      );

      return response.data?.results?.bindings ?? [];
    } catch (error) {
      this.logger.error(`SPARQL query failed: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(
          `Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        `SPARQL query failed: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Default query for looted items in 1868 (Battle of Magdala)
   */
  async queryItems(): Promise<any[]> {
    const cacheKey = 'sparql:queryItems';

    // Try to get from cache first
    const cachedResult = await this.stateService.cacheGet<any[]>(cacheKey);
    if (cachedResult) {
      this.logger.log('Returning cached SPARQL query results');
      return cachedResult;
    }

    const sparqlQuery = `
      SELECT ?item ?itemLabel ?itemDescription
      WHERE {
        ?item p:P793 ?statement.
        ?statement ps:P793 wd:${this.configService.get('wikidata.lootingEventId')}.      # event = looting
        ?statement pq:P585 ?time.
        FILTER(YEAR(?time) = ${this.configService.get('wikidata.lootingEventYear')})
        ?statement pq:P2348 wd:${this.configService.get('wikidata.battleOfMagdalaId')}.     # Battle of Magdala
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `;

    const result = await this.runQuery(sparqlQuery);

    // Cache the result for 1 hour (3600 seconds)
    await this.stateService.cacheSet(cacheKey, result, 3600);
    this.logger.log('Cached SPARQL query results');

    return result;
  }

  /**
   * Dynamic query with filters
   */

  async queryItemsWithFilters(
    year?: string,
    timePeriod: string = 'Q947667', // default: Battle of Magdala
  ): Promise<any[]> {
    const cacheKey = `sparql:queryItems:${year || 'all'}:${timePeriod}`;

    // Try to get from cache first
    const cachedResult = await this.stateService.cacheGet<any[]>(cacheKey);
    if (cachedResult) {
      this.logger.log('Returning cached SPARQL query results with filters');
      return cachedResult;
    }

    const filterYear = year ? `FILTER(YEAR(?time) = ${year})` : '';

    const sparqlQuery = `
      SELECT ?item ?itemLabel ?itemDescription
      WHERE {
        ?item p:P793 ?statement.
        ?statement pq:P2348 wd:${timePeriod}.
        ?statement pq:P585 ?time.
        ${filterYear}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `;

    const result = await this.runQuery(sparqlQuery);

    // Cache the result for 1 hour (3600 seconds)
    await this.stateService.cacheSet(cacheKey, result, 3600);
    this.logger.log('Cached SPARQL query results with filters');

    return result;
  }


  async getItemName(itemId: string): Promise<string> {
    const cacheKey = `sparql:getItemName:${itemId}`;

    // Try to get from cache first
    const cachedResult = await this.stateService.cacheGet<string>(cacheKey);
    if (cachedResult) {
      this.logger.log(`Returning cached item name for ${itemId}`);
      return cachedResult;
    }

    const sparqlQuery = `
      SELECT ?itemLabel
      WHERE {
        VALUES ?item { wd:${itemId} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `;
    const bindings = await this.runQuery(sparqlQuery);
    const result = bindings[0]?.itemLabel?.value ?? '';

    // Cache the result for 24 hours (86400 seconds) since item names don't change often
    await this.stateService.cacheSet(cacheKey, result, 86400);
    this.logger.log(`Cached item name for ${itemId}`);

    return result;
  }

  async getValuesFromProperty(itemId: string, propertyId: string): Promise<any[]> {
    const sparqlQuery = `
       SELECT DISTINCT
  ?value ?valueLabel
  (STRAFTER(STR(?value), "entity/") AS ?valueQID)
  ?valueDescription
  ?start_time ?end_time ?point_in_time
WHERE {
  VALUES ?item { wd:${itemId} }   # your item
  VALUES ?prop { p:${propertyId} }        # your property (here: "has cause")

  # Find all statements for that property
  ?item ?prop ?statement .
  ?statement ps:${propertyId} ?value .
  
  OPTIONAL { ?value schema:description ?valueDescription. 
             FILTER(LANG(?valueDescription) = "en") }
#   # Extract time qualifiers (if present)
#   OPTIONAL { ?statement pq:P580 ?start_time. }     # start time
#   OPTIONAL { ?statement pq:P582 ?end_time. }       # end time
#   OPTIONAL { ?statement pq:P585 ?point_in_time. }  # point in time

  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
ORDER BY ASC(COALESCE(?point_in_time, ?start_time, ?end_time))
    `;

    const bindings = await this.runQuery(sparqlQuery);
    // const result = bindings[0]?.itemLabel?.value ?? '';
    return bindings;
  }
}
