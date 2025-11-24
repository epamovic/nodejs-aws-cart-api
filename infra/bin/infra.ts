#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CartServiceStack } from '../lib/cart-service/cart-service-stack';
import { HelloRdsStack } from '../example/hello-rds/hello-rds-stack';

const app = new cdk.App();

new CartServiceStack(app, 'CartServiceStack', {});

const envAPS = {
  account: '<your aws account number>',
  region: '<region code like us-east-1>',
};
// new HelloRdsStack(app, 'HelloRdsStack', { env: envAPS });
