import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CommonsService {
  private readonly logger = new Logger(CommonsService.name);

  constructor(private readonly httpService: HttpService) {}

  async getImageFromP18(statements: any) {
    // P18 contains the Wikimedia Commons filename
    const p18 = statements['P18']?.[0]?.value?.content;
    if (!p18) {
      this.logger.warn('No P18 property found for item');
      return { error: 'No image available' };
    }

    this.logger.log(`Fetching Commons image for: ${p18}`);

    // Commons API call
    const commonsUrl = `https://magnus-toolserver.toolforge.org/commonsapi.php?image=${encodeURIComponent(
      p18,
    )}`;

    try {
      const response = await lastValueFrom(
        this.httpService.get(commonsUrl, { responseType: 'json' }),
      );

      // API gives metadata including URL(s)
      const imageInfo = response.data?.image?.urls?.file;

      return {
        filename: p18,
        commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(
          p18,
        )}`,
        image_url: imageInfo,
      };
    } catch (error) {
      this.logger.error(`Error fetching Commons image: ${error.message}`);
      return { error: 'Failed to fetch image' };
    }
  }

  async getImageByName(name: any) {
    // P18 contains the Wikimedia Commons filename

    this.logger.log(`Fetching Commons image for: ${name}`);

    // Commons API call
    const commonsUrl = `https://magnus-toolserver.toolforge.org/commonsapi.php?image=${encodeURIComponent(
     name,
    )}`;

    try {
      const response = await lastValueFrom(
        this.httpService.get(commonsUrl, { responseType: 'json' }),
      );

      // API gives metadata including URL(s)
      const imageInfo = response.data?.image?.urls?.file;

      return {
        filename: name,
        commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(
          name,
        )}`,
        image_url: imageInfo,
      };
    } catch (error) {
      this.logger.error(`Error fetching Commons image: ${error.message}`);
      return { error: 'Failed to fetch image' };
    }
  }
}
