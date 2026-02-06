import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import cliConfig from './cli.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, cliConfig],
      envFilePath: '.env',
    }),
  ],
})
export class AppConfigModule {}
