import { Module } from '@nestjs/common';
import { ThemeConfigController } from './theme-config.controller';
import { ThemeConfigService } from './theme-config.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ThemeConfigController],
  providers: [ThemeConfigService],
  exports: [ThemeConfigService],
})
export class ThemeConfigModule {}

