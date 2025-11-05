import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'node:path';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CartServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      'cartServiceLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'bootstrap',
        entry: path.join(__dirname, '../../dist/src/main.js'),
        bundling: {
          externalModules: [
            '@aws-sdk/*',
            '@smithy/*',
            '@nestjs/microservices',
            '@nestjs/websockets/socket-module',
            '@nestjs/microservices/microservices-module',
            'class-validator',
            'class-transformer',
          ],
          nodeModules: [
            '@nestjs/core',
            '@nestjs/common',
            '@nestjs/config',
            'helmet',
          ],
        },
      },
    );

    const api = new apigateway.RestApi(this, 'CartShopApi', {
      restApiName: 'Cart Service',
      description: 'This service serves a Cart application.',
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });
  }
}
