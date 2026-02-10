import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { GenerateModule } from './generate/generate.module';
import { ConversationModule } from './conversation/conversation.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    GenerateModule,
    ConversationModule,
    HealthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
