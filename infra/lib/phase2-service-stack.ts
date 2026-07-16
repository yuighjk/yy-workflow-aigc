// biome-ignore-all lint/performance/noNamespaceImport: CDK service modules are intentionally grouped by AWS namespace.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	CfnOutput,
	CfnParameter,
	Duration,
	RemovalPolicy,
	Stack,
	type StackProps,
} from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import type { Construct } from "constructs";

import type { Phase2SharedStack } from "./phase2-shared-stack.js";

interface Phase2ServiceStackProps extends StackProps {
	readonly shared: Phase2SharedStack;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export class Phase2ServiceStack extends Stack {
	constructor(scope: Construct, id: string, props: Phase2ServiceStackProps) {
		super(scope, id, props);

		const imageTag = new CfnParameter(this, "ImageTag", {
			default: "latest",
			description: "Existing profile-go ECR image tag to deploy",
			type: "String",
		});
		const databaseSecretArn = new CfnParameter(this, "DatabaseSecretArn", {
			description:
				"Complete ARN of a Secrets Manager JSON secret containing DATABASE_URL",
			type: "String",
		});
		const databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
			this,
			"DatabaseSecret",
			databaseSecretArn.valueAsString
		);
		const executionRole = new iam.Role(this, "EcsTaskExecutionRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
			description:
				"Pulls profile-go images, reads its startup secret, and writes logs",
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AmazonECSTaskExecutionRolePolicy"
				),
			],
			roleName: "yy-workflow-profile-ecs-execution",
		});
		const taskRole = new iam.Role(this, "EcsTaskRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
			description:
				"Runtime identity for profile-go; no AWS API access by default",
			roleName: "yy-workflow-profile-ecs-task",
		});
		databaseSecret.grantRead(executionRole);

		const logGroup = new logs.LogGroup(this, "ProfileGoLogGroup", {
			logGroupName: "/ecs/yy-workflow/profile-go",
			removalPolicy: RemovalPolicy.DESTROY,
			retention: logs.RetentionDays.ONE_WEEK,
		});

		const taskDefinition = new ecs.FargateTaskDefinition(
			this,
			"ProfileTaskDefinition",
			{
				cpu: 256,
				executionRole,
				family: "yy-workflow-profile-go",
				memoryLimitMiB: 512,
				runtimePlatform: {
					cpuArchitecture: ecs.CpuArchitecture.X86_64,
					operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
				},
				taskRole,
			}
		);
		const container = taskDefinition.addContainer("ProfileGo", {
			environment: {
				PORT: "8080",
				RDS_CA_PATH: "/etc/ssl/certs/rds-global-bundle.pem",
			},
			image: ecs.ContainerImage.fromEcrRepository(
				props.shared.repository,
				imageTag.valueAsString
			),
			logging: ecs.LogDrivers.awsLogs({
				logGroup,
				streamPrefix: "profile-go",
			}),
			secrets: {
				DATABASE_URL: ecs.Secret.fromSecretsManager(
					databaseSecret,
					"DATABASE_URL"
				),
			},
		});
		container.addPortMappings({
			containerPort: 8080,
			name: "http",
			protocol: ecs.Protocol.TCP,
		});

		const service = new ecs.FargateService(this, "ProfileService", {
			assignPublicIp: false,
			circuitBreaker: { rollback: true },
			cloudMapOptions: {
				cloudMapNamespace: props.shared.namespace,
				dnsRecordType: servicediscovery.DnsRecordType.A,
				dnsTtl: Duration.seconds(30),
				name: "profile-go",
			},
			cluster: props.shared.cluster,
			desiredCount: 1,
			healthCheckGracePeriod: Duration.seconds(60),
			maxHealthyPercent: 200,
			minHealthyPercent: 100,
			securityGroups: [props.shared.ecsSecurityGroup],
			serviceName: "profile-go",
			taskDefinition,
			vpcSubnets: { subnets: props.shared.privateSubnets },
		});

		const targetGroup = new elbv2.ApplicationTargetGroup(
			this,
			"ProfileTargetGroup",
			{
				healthCheck: {
					healthyHttpCodes: "200",
					interval: Duration.seconds(30),
					path: "/healthz",
					timeout: Duration.seconds(5),
				},
				port: 8080,
				protocol: elbv2.ApplicationProtocol.HTTP,
				targetType: elbv2.TargetType.IP,
				vpc: props.shared.vpc,
			}
		);
		targetGroup.addTarget(service);
		new elbv2.ApplicationListenerRule(this, "ProfileListenerRule", {
			action: elbv2.ListenerAction.forward([targetGroup]),
			conditions: [
				elbv2.ListenerCondition.pathPatterns([
					"/healthz",
					"/profile",
					"/profile/*",
				]),
			],
			listener: props.shared.albListener,
			// PR rules use 1001..49000 plus x-yy-pr-number. Stable Phase 2 is the fallback.
			priority: 49_999,
		});

		const bff = new lambda.Function(this, "ProfileBff", {
			code: lambda.Code.fromAsset(
				join(currentDirectory, "../lambda/profile-bff")
			),
			description:
				"Forwards profile API requests to the private profile-go ALB",
			environment: {
				PROFILE_GO_BASE_URL: `http://${props.shared.alb.loadBalancerDnsName}`,
			},
			handler: "index.handler",
			memorySize: 256,
			runtime: lambda.Runtime.NODEJS_22_X,
			securityGroups: [props.shared.bffSecurityGroup],
			timeout: Duration.seconds(15),
			vpc: props.shared.vpc,
			vpcSubnets: { subnets: props.shared.privateSubnets },
		});

		const httpApi = new apigwv2.HttpApi(this, "ProfileHttpApi", {
			apiName: "yy-workflow-profile-bff",
			corsPreflight: {
				allowHeaders: ["content-type", "authorization", "x-yy-pr-number"],
				allowMethods: [apigwv2.CorsHttpMethod.ANY],
				allowOrigins: ["*"],
			},
		});
		const bffIntegration = new integrations.HttpLambdaIntegration(
			"ProfileBffIntegration",
			bff
		);
		httpApi.addRoutes({
			integration: bffIntegration,
			methods: [apigwv2.HttpMethod.ANY],
			path: "/profile",
		});
		httpApi.addRoutes({
			integration: bffIntegration,
			methods: [apigwv2.HttpMethod.ANY],
			path: "/profile/{proxy+}",
		});
		httpApi.addRoutes({
			integration: bffIntegration,
			methods: [apigwv2.HttpMethod.GET],
			path: "/healthz",
		});

		new CfnOutput(this, "ProfileApiUrl", {
			value: httpApi.apiEndpoint,
		});
		new CfnOutput(this, "CloudMapServiceName", {
			value: `profile-go.${props.shared.namespace.namespaceName}`,
		});
		new CfnOutput(this, "EcsServiceName", {
			value: service.serviceName,
		});
	}
}
