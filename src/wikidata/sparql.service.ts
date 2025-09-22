import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SparqlService {

  private sparqlUrl: string = 'https://query.wikidata.org/sparql';

  async queryItems(): Promise<any> {
    const sparqlQuery = `
        SELECT ?item ?itemLabel
        WHERE {
          ?item p:P793 ?statement.            # items with significant event
          ?statement ps:P793 wd:Q192623.      # event = looting
          ?statement pq:P585 ?time.           # qualifier: point in time
          FILTER(YEAR(?time) = 1868)           # restrict to year 1868
          ?statement pq:P2348 wd:Q947667.      # qualifier: time period = Battle of Magdala
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
      `;

    const fullUrl = this.sparqlUrl + '?query=' + encodeURIComponent(sparqlQuery);

    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/sparql-results+json',
        },
      });

      return response.data;
    } catch (error) {
      throw new HttpException(`Failed to query SPARQL endpoint: ${error.message}`, 500);
    }
  }
}
