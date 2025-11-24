import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CartEntity, CartItemEntity } from './cart/entities';
import { DatabaseConfigService } from './shared';

@Module({
  imports: [
    AuthModule,
    CartModule,
    OrderModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfigService = new DatabaseConfigService(configService);
        const dbConfig = await dbConfigService.getDbConfig();
        return {
          ...dbConfig,
          entities: [CartEntity, CartItemEntity],
          synchronize: configService.get<string>('NODE_ENV') !== 'production', // Only sync in development
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
