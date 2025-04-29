import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as aws_ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as imagedeploy from "cdk-docker-image-deployment";
import { Construct } from "constructs";
import * as path from "path";
export interface MastraMcpOnEcsStackProps extends cdk.StackProps {
  allowIp: string[];
  mcpEnv: Record<string, string>;
  uniqueId: string;
}

export class MastraMcpOnEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MastraMcpOnEcsStackProps) {
    super(scope, id, props);

    const { allowIp, mcpEnv, uniqueId } = props;

    // If appSecrets is defined, create a SecretsManager secret and ECS secrets
    let appSecret: secretsmanager.Secret | undefined;
    let secrets: Record<string, ecs.Secret> | undefined;

    if (Object.keys(mcpEnv).length > 0) {
      appSecret = new secretsmanager.Secret(this, "appSecret", {
        secretName: `mastra-secrets-${uniqueId}`,
        secretStringValue: cdk.SecretValue.unsafePlainText(
          JSON.stringify(mcpEnv)
        ),
      });
      secrets = Object.fromEntries(
        Object.keys(mcpEnv).map((key) => [
          key,
          ecs.Secret.fromSecretsManager(appSecret!, key),
        ])
      );
    }

    // Create ECR Repository
    const repo = new ecr.Repository(this, "EcrRepository", {
      repositoryName: `mastra-repo-${uniqueId}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Build and Push Docker Image from Dockerfile to ECR
    new imagedeploy.DockerImageDeployment(this, "ImageDeploymentWithTag", {
      source: imagedeploy.Source.directory(path.join(__dirname, "../../web/"), {
        platform: aws_ecr_assets.Platform.LINUX_AMD64,
      }),
      destination: imagedeploy.Destination.ecr(repo, {
        tag: "latest",
      }),
    });

    // Create VPC and Subnet
    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `mastra-vpc-${uniqueId}`,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, "EcsCluster", {
      clusterName: `mastra-cluster-${uniqueId}`,
      vpc,
    });

    const image = ecs.ContainerImage.fromEcrRepository(repo, "latest");

    // Create ALB and ECS Fargate Service
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster,
        serviceName: `mastra-service-${uniqueId}`,
        loadBalancerName: `mastra-alb-${uniqueId}`,
        assignPublicIp: true,
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskImageOptions: {
          containerName: `mastra-container-${uniqueId}`,
          containerPort: 3000,
          image,
          ...(secrets ? { secrets } : {}),
        },
      }
    );

    // Add Managed Policy to Task Role
    service.taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonBedrockFullAccess")
    );

    // If appSecret is defined, grant read access to the secret
    if (appSecret) {
      appSecret.grantRead(service.taskDefinition.executionRole!);
    }

    // If ipAddress is defined, create WebACL
    if (allowIp.length > 0) {
      const ipSet = new wafv2.CfnIPSet(this, "IpSet", {
        name: `mastra-ipset-${uniqueId}`,
        scope: "REGIONAL",
        ipAddressVersion: "IPV4",
        addresses: allowIp,
      });

      const waf = new wafv2.CfnWebACL(this, "Waf", {
        name: `mastra-waf-${uniqueId}`,
        scope: "REGIONAL",
        rules: [
          {
            name: `ip-rule-${uniqueId}`,
            priority: 1,
            statement: {
              ipSetReferenceStatement: {
                arn: ipSet.attrArn,
              },
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `ip-rule-${uniqueId}`,
              sampledRequestsEnabled: true,
            },
            action: {
              allow: {},
            },
          },
        ],
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `mastra-waf-${uniqueId}`,
          sampledRequestsEnabled: true,
        },
        defaultAction: {
          block: {},
        },
      });

      new wafv2.CfnWebACLAssociation(this, "WebAclAssociation", {
        resourceArn: service.loadBalancer.loadBalancerArn,
        webAclArn: waf.attrArn,
      });
    }
  }
}
