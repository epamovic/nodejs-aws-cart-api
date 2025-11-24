import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CartServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create database credentials secret
    const dbCredentialsSecret = new secretsmanager.Secret(
      this,
      'CartDBCredentials',
      {
        secretName: 'CartDBCredentials',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'cartadmin',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      },
    );

    // Create VPC for database and lambda
    const vpc = new ec2.Vpc(this, 'CartVPC', {
      maxAzs: 2, // Use 2 availability zones
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create security group for database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'CartDBSecurityGroup', {
      vpc,
      description: 'Security group for Cart PostgreSQL database',
      allowAllOutbound: false,
    });

    // Create security group for lambda
    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'CartLambdaSecurityGroup',
      {
        vpc,
        description: 'Security group for Cart Lambda function',
        allowAllOutbound: true,
      },
    );

    // Allow lambda to connect to database
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to PostgreSQL database',
    );

    // Create PostgreSQL RDS instance
    const dbInstance = new rds.DatabaseInstance(
      this,
      'CartPostgreSQLInstance',
      {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15_4,
        }),
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MICRO,
        ),
        vpc,
        credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [dbSecurityGroup],
        multiAz: false,
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        allowMajorVersionUpgrade: false,
        autoMinorVersionUpgrade: true,
        backupRetention: cdk.Duration.days(7),
        deleteAutomatedBackups: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        deletionProtection: false,
        databaseName: 'cartdb',
      },
    );

    const lambdaFunction = new NodejsFunction(this, 'cartServiceLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      handler: 'handler',
      entry: path.join(__dirname, '../../../src/main.ts'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DB_HOST: dbInstance.instanceEndpoint.hostname,
        DB_PORT: dbInstance.instanceEndpoint.port.toString(),
        DB_NAME: 'cartdb',
        DB_SECRET_ARN: dbCredentialsSecret.secretArn,
      },
    });

    dbCredentialsSecret.grantRead(lambdaFunction);
    dbCredentialsSecret.grantWrite(lambdaFunction);

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
