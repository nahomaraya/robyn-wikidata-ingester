import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SparqlService {
  private readonly logger = new Logger(SparqlService.name);
  private sparqlUrl: string = 'https://query.wikidata.org/sparql';

  constructor(private readonly httpService: HttpService) {}

  
  
  
  async queryItems(): Promise<any> {
    this.logger.log('SPARQL method called');
    const sparqlQuery = `
        SELECT ?item ?itemLabel ?itemDescription
        WHERE {
          ?item p:P793 ?statement.            # items with significant event
          ?statement ps:P793 wd:Q192623.      # event = looting
          ?statement pq:P585 ?time.           # qualifier: point in time
          FILTER(YEAR(?time) = 1868)           # restrict to year 1868
          ?statement pq:P2348 wd:Q947667.     # qualifier: time period = Battle of Magdala
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
      `;

    const fullUrl = this.sparqlUrl + '?query=' + encodeURIComponent(sparqlQuery);
    this.logger.log(`SPARQL full URL: ${fullUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(fullUrl, {
          headers: {
            Accept: 'application/sparql-results+json',
          },
        }),
      );

      this.logger.log(`SPARQL response status: ${response.status}`);
      this.logger.log(`SPARQL response data: ${JSON.stringify(response.data)}`);

      return response.data["results"]["bindings"];
    } catch (error) {
      this.logger.error(`SPARQL query failed: ${error.message}`, error.stack);

      if (error.response) {
        this.logger.error(
          `Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        `Failed to query SPARQL endpoint: ${error.message}`,
        500,
      );
    }
  }

  async getItemName(itemId: string): Promise<string> {
    const sparqlQuery = `
      SELECT ?itemLabel
      WHERE {
        VALUES ?item { wd:${itemId} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `;

    const fullUrl = this.sparqlUrl + '?query=' + encodeURIComponent(sparqlQuery);

    try {
      const response = await firstValueFrom(
        this.httpService.get(fullUrl, {
          headers: { Accept: 'application/sparql-results+json' },
        }),
      );

      const bindings = response.data?.results?.bindings ?? [];
      if (bindings.length === 0) {
        this.logger.warn(`No label found for item: ${itemId}`);
        return '';
      }

      const itemLabel = bindings[0]?.itemLabel?.value ?? '';


      return itemLabel;
    } catch (error) {
      this.logger.error(`SPARQL query failed: ${error.message}`, error.stack);
      throw new HttpException(`Failed to fetch item label for ${itemId}`, 500);
    }
  }
}
