import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class DatabaseConfigService {
  constructor(private configService: ConfigService) {}

  async getDbConfig() {
    const isAWS = !!this.configService.get('DB_SECRET_ARN');

    if (isAWS) {
      // In AWS Lambda environment, credentials are stored in Secrets Manager
      const client = new SecretsManagerClient({});
      const secretArn = this.configService.get('DB_SECRET_ARN');

      try {
        const command = new GetSecretValueCommand({
          SecretId: secretArn,
        });

        const response = await client.send(command);
        const credentials = JSON.parse(response.SecretString || '{}');

        return {
          type: 'postgres' as const,
          host: this.configService.get<string>('DB_HOST'),
          port: parseInt(this.configService.get<string>('DB_PORT') || '5432'),
          username: credentials.username,
          password: credentials.password,
          database: this.configService.get<string>('DB_NAME') || 'cartdb',
          ssl: {
            rejectUnauthorized: false,
          },
        };
      } catch (error) {
        console.error('Error retrieving database credentials from AWS:', error);
        throw error;
      }
    } else {
      // Local development environment
      return {
        type: 'postgres' as const,
        host: this.configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(this.configService.get<string>('DB_PORT') || '5432'),
        username: this.configService.get<string>('DB_USERNAME') || 'cartadmin',
        password: this.configService.get<string>('DB_PASSWORD') || 'password',
        database: this.configService.get<string>('DB_NAME') || 'cartdb',
        ssl: false,
      };
    }
  }
}
