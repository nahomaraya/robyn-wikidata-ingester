import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WikidataService {
  private readonly logger = new Logger(WikidataService.name);
  private clientId: string;
  private clientSecret: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private wikidataUrl: string = 'https://www.wikidata.org/w/rest.php';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('wikidata.clientId') ?? '';
    this.clientSecret = this.configService.get<string>('wikidata.clientSecret') ?? '';
  }

  private async fetchAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      this.logger.debug('Using cached access token');
      return this.token;
    }

    this.logger.log('Fetching new access token from Wikidata...');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.wikidataUrl}/oauth2/access_token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      this.logger.log(`New access token fetched. Expires in ${response.data.expires_in}s`);

      return this.token!;
    } catch (error) {
      this.logger.error(`Failed to fetch access token: ${error.message}`);
      throw new HttpException('Failed to fetch access token', 500);
    }
  }

  async getItemName(itemId: string): Promise<string> {
    const accessToken = await this.fetchAccessToken();
    const url = `${this.wikidataUrl}/wikibase/v1/entities/items/${itemId}`;
  
    this.logger.log(`Fetching Wikidata item label for ${itemId}`);
  
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
  
      const entity = response.data;
      // Labels are nested under entity.labels.<lang>.value
      const itemLabel =
      entity?.labels?.en ??
      entity?.labels?.[Object.keys(entity.labels || {})[0]] ??
      '';
  
      if (!itemLabel) {
        this.logger.warn(`No label found for item: ${itemId}`);
      }
  
      return itemLabel;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata item label for ${itemId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(`Failed to fetch item label for ${itemId}`, 500);
    }
  }
  
  async getItemStatements(itemId: string) {
    const accessToken = await this.fetchAccessToken();
    const url = `${this.wikidataUrl}/wikibase/v1/entities/items/${itemId}/statements`;

    this.logger.log(`Fetching Wikidata item statements for ${itemId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Wikidata item ${itemId}: ${error.message}`,
      );
      throw new HttpException('Failed to fetch Wikidata item', 500);
    }
  }
}
