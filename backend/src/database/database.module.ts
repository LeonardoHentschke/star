import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from '../documents/infrastructure/persistence/document.orm-entity';
import { DocumentItemOrmEntity } from '../documents/infrastructure/persistence/document-item.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        host: config.get<string>('DB_HOST', 'db'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'star'),
        password: config.get<string>('DB_PASSWORD', 'starpassword'),
        database: config.get<string>('DB_NAME', 'star'),
        entities: [DocumentOrmEntity, DocumentItemOrmEntity],
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
