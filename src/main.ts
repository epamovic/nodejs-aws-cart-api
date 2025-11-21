import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import serverlessExpress from 'serverless-http';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

let cachedHandler: any;

async function bootstrap() {
  if (!cachedHandler) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    app.enableCors({
      origin: (req, callback) => callback(null, true),
    });
    app.use(helmet());

    await app.init();

    // Create serverless handler
    cachedHandler = serverlessExpress(expressApp);
  }
  return cachedHandler;
}

// Lambda handler that uses NestJS with serverless-http
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  console.log('Lambda event:', JSON.stringify(event, null, 2));

  try {
    const serverlessHandler = await bootstrap();
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
      }),
    };
  }
}

// For local development
export async function startLocal() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('APP_PORT') || 4000;

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(helmet());

  await app.listen(port, () => {
    console.log('App is running on %s port', port);
  });
}

// Only run local bootstrap if not in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  bootstrap();
}
