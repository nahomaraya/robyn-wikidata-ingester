import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WikidataService {
  private clientId: string;
  private clientSecret: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private wikidataUrl: string = 'https://www.wikidata.org/w/rest.php'

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('wikidata.clientId') ?? '';
    this.clientSecret = this.configService.get<string>('wikidata.clientSecret') ?? '';
  }

  private async fetchAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(
        this.wikidataUrl + '/oauth2/access_token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      return this.token!;

    } catch (error) {
      throw new HttpException('Failed to fetch access token', 500);
    }
  }

  async getItemStatements(itemId: string) {
    const accessToken = await this.fetchAccessToken();
    const url = this.wikidataUrl + `/wikibase/v1/entities/items/${itemId}/statements`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      throw new HttpException('Failed to fetch Wikidata item', 500);
    }
  }
}
