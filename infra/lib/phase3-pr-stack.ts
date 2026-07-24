// biome-ignore-all lint/performance/noNamespaceImport: CDK service modules are intentionally grouped by AWS namespace.

import {
	CfnOutput,
	Duration,
	Fn,
	Stack,
	type StackProps,
	Tags,
} from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import type { Construct } from "constructs";

import type { Phase2SharedStack } from "./phase2-shared-stack.js";

interface Phase3PrStackProps extends StackProps {
	readonly imageTag: string;
	readonly prNumber: number;
	readonly shared: Phase2SharedStack;
}

export class Phase3PrStack extends Stack {
	constructor(scope: Construct, id: string, props: Phase3PrStackProps) {
		super(scope, id, props);

		if (!Number.isInteger(props.prNumber) || props.prNumber < 1) {
			throw new Error("prNumber must be a positive integer");
		}
		if (props.prNumber > 48_000) {
			throw new Error("prNumber must be <= 48000 to fit ALB rule priorities");
		}

		const suffix = `pr-${props.prNumber}`;
		Tags.of(this).add("environment", "pull-request");
		Tags.of(this).add("pr-number", String(props.prNumber));
		Tags.of(this).add("managed-by", "aws-cdk");

		const prEcsRole = iam.Role.fromRoleArn(
			this,
			"PrEcsRole",
			Fn.importValue("yy-workflow-phase3:PrEcsRoleArn"),
			{ mutable: false }
		);
		const databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
			this,
			"DatabaseSecret",
			Fn.importValue("yy-workflow-phase3:DatabaseSecretArn")
		);
		const prLogGroup = logs.LogGroup.fromLogGroupName(
			this,
			"PrLogGroup",
			Fn.importValue("yy-workflow-phase3:PrLogGroupName")
		);

		const taskDefinition = new ecs.FargateTaskDefinition(
			this,
			"TaskDefinition",
			{
				cpu: 256,
				executionRole: prEcsRole,
				family: `yy-workflow-profile-${suffix}`,
				memoryLimitMiB: 512,
				runtimePlatform: {
					cpuArchitecture: ecs.CpuArchitecture.X86_64,
					operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
				},
				taskRole: prEcsRole,
			}
		);
		const container = taskDefinition.addContainer("ProfileGo", {
			environment: {
				PORT: "8080",
				RDS_CA_PATH: "/etc/ssl/certs/rds-global-bundle.pem",
				YY_PR_NUMBER: String(props.prNumber),
			},
			image: ecs.ContainerImage.fromEcrRepository(
				props.shared.repository,
				props.imageTag
			),
			logging: ecs.LogDrivers.awsLogs({
				logGroup: prLogGroup,
				streamPrefix: suffix,
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

		const service = new ecs.FargateService(this, "Service", {
			assignPublicIp: false,
			circuitBreaker: { rollback: true },
			cloudMapOptions: {
				cloudMapNamespace: props.shared.namespace,
				dnsRecordType: servicediscovery.DnsRecordType.A,
				dnsTtl: Duration.seconds(30),
				name: `profile-go-${suffix}`,
			},
			cluster: props.shared.cluster,
			desiredCount: 1,
			healthCheckGracePeriod: Duration.seconds(60),
			maxHealthyPercent: 200,
			minHealthyPercent: 100,
			securityGroups: [props.shared.ecsSecurityGroup],
			serviceName: `profile-go-${suffix}`,
			taskDefinition,
			vpcSubnets: { subnets: props.shared.privateSubnets },
		});

		const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
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
		});
		targetGroup.addTarget(service);
		new elbv2.ApplicationListenerRule(this, "ListenerRule", {
			action: elbv2.ListenerAction.forward([targetGroup]),
			conditions: [
				elbv2.ListenerCondition.httpHeader("x-yy-pr-number", [
					String(props.prNumber),
				]),
				elbv2.ListenerCondition.pathPatterns([
					"/health",
					"/healthz",
					"/profile",
					"/profile/*",
				]),
			],
			listener: props.shared.albListener,
			priority: 1000 + props.prNumber,
		});

		new CfnOutput(this, "RoutingHeader", {
			value: `x-yy-pr-number: ${props.prNumber}`,
		});
		new CfnOutput(this, "EcsServiceName", {
			value: service.serviceName,
		});
		new CfnOutput(this, "CloudMapServiceName", {
			value: `profile-go-${suffix}.${props.shared.namespace.namespaceName}`,
		});
	}
}
