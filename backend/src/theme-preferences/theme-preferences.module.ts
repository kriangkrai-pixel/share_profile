import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThemePreferencesController } from './theme-preferences.controller';
import { ThemePreferencesService } from './theme-preferences.service';

@Module({
  imports: [PrismaModule],
  controllers: [ThemePreferencesController],
  providers: [ThemePreferencesService],
  exports: [ThemePreferencesService],
})
export class ThemePreferencesModule {}

