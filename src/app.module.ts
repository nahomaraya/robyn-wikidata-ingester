import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonsService } from './commons/commons.service';
import { IngestionService } from './ingestion/ingestion.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { CommonsModule } from './commons/commons.module';
import { WikidataModule } from './wikidata/wikidata.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import authConfig from './config/auth.config';
import supabaseConfig from './config/supabase.config';
import wikidataConfig from './config/wikidata.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [authConfig, supabaseConfig, wikidataConfig],
      isGlobal: true,
    }),
    IngestionModule, CommonsModule, WikidataModule,  SupabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, CommonsService, IngestionService],
})
export class AppModule {}
