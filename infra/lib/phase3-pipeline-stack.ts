// biome-ignore-all lint/performance/noNamespaceImport: CDK service modules are intentionally grouped by AWS namespace.

import {
	CfnOutput,
	CfnParameter,
	Duration,
	Fn,
	RemovalPolicy,
	Stack,
	type StackProps,
} from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

import type { Phase2SharedStack } from "./phase2-shared-stack.js";

interface Phase3PipelineStackProps extends StackProps {
	readonly shared: Phase2SharedStack;
}

export class Phase3PipelineStack extends Stack {
	readonly codeBuildProject: codebuild.Project;
	readonly databaseSecret: secretsmanager.ISecret;
	readonly prEcsRole: iam.Role;
	readonly prLogGroup: logs.LogGroup;
	readonly sourceBucket: s3.Bucket;

	constructor(scope: Construct, id: string, props: Phase3PipelineStackProps) {
		super(scope, id, props);

		const databaseSecretArn = new CfnParameter(this, "DatabaseSecretArn", {
			description:
				"Complete ARN of the Secrets Manager JSON secret containing DATABASE_URL",
			type: "String",
		});
		const githubRepository = new CfnParameter(this, "GitHubRepository", {
			default: "yuighjk/yy-workflow-aigc",
			description: "GitHub owner/repository allowed to assume the OIDC role",
			type: "String",
		});
		this.databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
			this,
			"DatabaseSecret",
			databaseSecretArn.valueAsString
		);

		this.sourceBucket = new s3.Bucket(this, "PrSourceBucket", {
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			encryption: s3.BucketEncryption.S3_MANAGED,
			enforceSSL: true,
			lifecycleRules: [{ expiration: Duration.days(7), prefix: "sources/" }],
			removalPolicy: RemovalPolicy.RETAIN,
		});

		const githubProvider = new iam.CfnOIDCProvider(this, "GitHubOidcProvider", {
			clientIdList: ["sts.amazonaws.com"],
			url: "https://token.actions.githubusercontent.com",
		});
		const githubRole = new iam.Role(this, "GitHubOidcRole", {
			assumedBy: new iam.FederatedPrincipal(
				githubProvider.attrArn,
				{
					StringEquals: {
						"token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
					},
					StringLike: {
						"token.actions.githubusercontent.com:sub": `repo:${githubRepository.valueAsString}:*`,
					},
				},
				"sts:AssumeRoleWithWebIdentity"
			),
			description:
				"Allows this repository's GitHub Actions to build images and deploy PR stacks",
			maxSessionDuration: Duration.hours(1),
			roleName: "yy-workflow-github-oidc",
		});
		this.sourceBucket.grantReadWrite(githubRole, "sources/*");
		props.shared.repository.grantPullPush(githubRole);
		githubRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["ecr:BatchDeleteImage", "ecr:ListImages"],
				resources: [props.shared.repository.repositoryArn],
			})
		);
		githubRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["sts:AssumeRole"],
				resources: [
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-deploy-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-file-publishing-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-lookup-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
				],
			})
		);

		const codeBuildRole = new iam.Role(this, "CodeBuildServiceRole", {
			assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
			description:
				"Builds profile-go images, validates DB changes, and deploys/destroys PR stacks",
			roleName: "yy-workflow-phase3-codebuild",
		});
		this.sourceBucket.grantRead(codeBuildRole, "sources/*");
		props.shared.repository.grantPullPush(codeBuildRole);
		codeBuildRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["ecr:BatchDeleteImage", "ecr:ListImages"],
				resources: [props.shared.repository.repositoryArn],
			})
		);
		this.databaseSecret.grantRead(codeBuildRole);
		codeBuildRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					"ec2:CreateNetworkInterface",
					"ec2:CreateNetworkInterfacePermission",
					"ec2:DeleteNetworkInterface",
					"ec2:DescribeDhcpOptions",
					"ec2:DescribeNetworkInterfaces",
					"ec2:DescribeSecurityGroups",
					"ec2:DescribeSubnets",
					"ec2:DescribeVpcs",
				],
				resources: ["*"],
			})
		);
		codeBuildRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["sts:AssumeRole"],
				resources: [
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-deploy-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-file-publishing-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
					Stack.of(this).formatArn({
						account: Stack.of(this).account,
						region: "",
						resource: "role",
						resourceName: `cdk-hnb659fds-lookup-role-${Stack.of(this).account}-${Stack.of(this).region}`,
						service: "iam",
					}),
				],
			})
		);

		this.prEcsRole = new iam.Role(this, "PrEcsRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
			description:
				"Shared execution/runtime role for short-lived profile-go PR tasks",
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AmazonECSTaskExecutionRolePolicy"
				),
			],
			roleName: "yy-workflow-phase3-pr-ecs",
		});
		this.databaseSecret.grantRead(this.prEcsRole);
		this.prLogGroup = new logs.LogGroup(this, "PrLogGroup", {
			logGroupName: "/ecs/yy-workflow/pull-requests",
			removalPolicy: RemovalPolicy.DESTROY,
			retention: logs.RetentionDays.THREE_DAYS,
		});
		this.prLogGroup.grantWrite(this.prEcsRole);

		const codeBuildSecurityGroup = new ec2.SecurityGroup(
			this,
			"CodeBuildSecurityGroup",
			{
				allowAllOutbound: true,
				description:
					"Phase 3 CodeBuild outbound access through the existing NAT",
				securityGroupName: "yy-workflow-phase3-codebuild",
				vpc: props.shared.vpc,
			}
		);
		const auroraSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			"ExistingAuroraSecurityGroup",
			Fn.importValue("yy-workflow-server:AuroraSecurityGroupId")
		);
		auroraSecurityGroup.addIngressRule(
			codeBuildSecurityGroup,
			ec2.Port.tcp(5432),
			"Phase 3 CodeBuild Prisma migration diff to Aurora PostgreSQL"
		);

		this.codeBuildProject = new codebuild.Project(this, "PrBuildProject", {
			buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.phase3.yml"),
			cache: codebuild.Cache.local(
				codebuild.LocalCacheMode.CUSTOM,
				codebuild.LocalCacheMode.DOCKER_LAYER
			),
			description:
				"Builds and deploys isolated profile-go ECS services for pull requests",
			environment: {
				buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
				computeType: codebuild.ComputeType.SMALL,
				environmentVariables: {
					DATABASE_SECRET_ARN: {
						value: databaseSecretArn.valueAsString,
					},
					ECR_REPOSITORY_URI: {
						value: props.shared.repository.repositoryUri,
					},
				},
				privileged: true,
			},
			projectName: "yy-workflow-phase3-pr",
			role: codeBuildRole,
			securityGroups: [codeBuildSecurityGroup],
			source: codebuild.Source.s3({
				bucket: this.sourceBucket,
				path: "sources/bootstrap.zip",
			}),
			timeout: Duration.minutes(40),
			vpc: props.shared.vpc,
			subnetSelection: { subnets: props.shared.privateSubnets },
		});

		githubRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["codebuild:BatchGetBuilds", "codebuild:StartBuild"],
				resources: [this.codeBuildProject.projectArn],
			})
		);

		new CfnOutput(this, "GitHubOidcRoleArn", {
			value: githubRole.roleArn,
		});
		new CfnOutput(this, "SourceBucketName", {
			value: this.sourceBucket.bucketName,
		});
		new CfnOutput(this, "CodeBuildProjectName", {
			value: this.codeBuildProject.projectName,
		});
		new CfnOutput(this, "PrEcsRoleArn", {
			exportName: "yy-workflow-phase3:PrEcsRoleArn",
			value: this.prEcsRole.roleArn,
		});
		new CfnOutput(this, "DatabaseSecretArnOutput", {
			exportName: "yy-workflow-phase3:DatabaseSecretArn",
			value: databaseSecretArn.valueAsString,
		});
		new CfnOutput(this, "PrLogGroupName", {
			exportName: "yy-workflow-phase3:PrLogGroupName",
			value: this.prLogGroup.logGroupName,
		});
	}
}
