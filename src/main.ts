import { NestFactory } from '@nestjs/core';

import helmet from 'helmet';

import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { CartController } from './cart/cart.controller';

export async function bootstrap() {
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

  return app; // Return the app instance
}
let nestApp: any;

// Lambda handler that accesses the NestJS app
export async function handler(event: any, context: any) {
  console.log('Lambda event:', JSON.stringify(event, null, 2));

  try {
    // Get the NestJS app (create it once and cache it)
    if (!nestApp) {
      nestApp = await bootstrap();
    }

    // Extract request details from Lambda event
    const method = event.httpMethod?.toLowerCase() || 'get';
    const path = event.path || '/';
    const headers = event.headers || {};
    const body = event.body ? JSON.parse(event.body) : null;
    const query = event.queryStringParameters || {};

    // Access NestJS controllers/services directly
    if (path === '/ping' || path === '/') {
      // Get AppController from the NestJS app using the class token
      const appController = nestApp.get(AppController);
      const result = appController.healthCheck();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result),
      };
    }

    if (path === '/api/auth/register' && method === 'post') {
      const appController = nestApp.get(AppController);
      const result = appController.register(body);

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result),
      };
    }

    if (path === '/api/profile/cart' && method === 'get') {
      const cartController = nestApp.get(CartController);
      // Note: You'd need to handle authentication here
      const mockReq = { user: { id: 'test-user' } };
      const result = cartController.findUserCart(mockReq);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result),
      };
    }

    // Default response for unmatched routes
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Route not found',
        path,
        method,
        availableRoutes: ['/ping', '/api/auth/register', '/api/profile/cart'],
      }),
    };
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

// Only run local bootstrap if not in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  bootstrap();
}
