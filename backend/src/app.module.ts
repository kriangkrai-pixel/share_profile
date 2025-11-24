import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ContactModule } from './contact/contact.module';
import { LayoutModule } from './layout/layout.module';
import { WidgetsModule } from './widgets/widgets.module';
import { SettingsModule } from './settings/settings.module';
import { UploadModule } from './upload/upload.module';
import { EditHistoryModule } from './edit-history/edit-history.module';
import { ImagesModule } from './images/images.module';
import { ContentModule } from './content/content.module';
import { ThemeConfigModule } from './theme-config/theme-config.module';
import { ThemePreferencesModule } from './theme-preferences/theme-preferences.module';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProfileModule,
    ContactModule,
    LayoutModule,
    WidgetsModule,
    SettingsModule,
    UploadModule,
    EditHistoryModule,
    ImagesModule,
    ContentModule,
    ThemeConfigModule,
    ThemePreferencesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

