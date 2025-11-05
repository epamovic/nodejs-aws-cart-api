#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CartServiceStack } from '../lib/cart-service/cart-service-stack';

const app = new cdk.App();

new CartServiceStack(app, 'CartServiceStack', {});
