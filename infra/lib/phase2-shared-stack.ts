// biome-ignore-all lint/performance/noNamespaceImport: CDK service modules are intentionally grouped by AWS namespace.
import {
	CfnOutput,
	Fn,
	RemovalPolicy,
	Stack,
	type StackProps,
} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import type { Construct } from "constructs";

const SAM_EXPORT_PREFIX = "yy-workflow-server";

export class Phase2SharedStack extends Stack {
	readonly alb: elbv2.ApplicationLoadBalancer;
	readonly albListener: elbv2.ApplicationListener;
	readonly albSecurityGroup: ec2.SecurityGroup;
	readonly bffSecurityGroup: ec2.SecurityGroup;
	readonly cluster: ecs.Cluster;
	readonly ecsSecurityGroup: ec2.SecurityGroup;
	readonly namespace: servicediscovery.PrivateDnsNamespace;
	readonly privateSubnets: ec2.ISubnet[];
	readonly repository: ecr.Repository;
	readonly vpc: ec2.IVpc;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const vpcId = Fn.importValue(`${SAM_EXPORT_PREFIX}:VpcId`);
		const privateSubnet1Id = Fn.importValue(
			`${SAM_EXPORT_PREFIX}:PrivateSubnet1Id`
		);
		const privateSubnet2Id = Fn.importValue(
			`${SAM_EXPORT_PREFIX}:PrivateSubnet2Id`
		);
		const privateSubnet1Az = Fn.importValue(
			`${SAM_EXPORT_PREFIX}:PrivateSubnet1Az`
		);
		const privateSubnet2Az = Fn.importValue(
			`${SAM_EXPORT_PREFIX}:PrivateSubnet2Az`
		);
		const privateRouteTableId = Fn.importValue(
			`${SAM_EXPORT_PREFIX}:PrivateRouteTableId`
		);

		this.privateSubnets = [
			ec2.Subnet.fromSubnetAttributes(this, "ExistingPrivateSubnet1", {
				availabilityZone: privateSubnet1Az,
				routeTableId: privateRouteTableId,
				subnetId: privateSubnet1Id,
			}),
			ec2.Subnet.fromSubnetAttributes(this, "ExistingPrivateSubnet2", {
				availabilityZone: privateSubnet2Az,
				routeTableId: privateRouteTableId,
				subnetId: privateSubnet2Id,
			}),
		];

		this.vpc = ec2.Vpc.fromVpcAttributes(this, "ExistingVpc", {
			availabilityZones: [privateSubnet1Az, privateSubnet2Az],
			privateSubnetIds: [privateSubnet1Id, privateSubnet2Id],
			privateSubnetRouteTableIds: [privateRouteTableId, privateRouteTableId],
			vpcId,
		});

		this.repository = new ecr.Repository(this, "ProfileGoRepository", {
			imageScanOnPush: true,
			lifecycleRules: [{ maxImageCount: 50 }],
			removalPolicy: RemovalPolicy.RETAIN,
			repositoryName: "yy-workflow/profile-go",
		});

		this.cluster = new ecs.Cluster(this, "ProfileCluster", {
			clusterName: "yy-workflow-profile",
			containerInsightsV2: ecs.ContainerInsights.ENABLED,
			vpc: this.vpc,
		});

		this.namespace = new servicediscovery.PrivateDnsNamespace(
			this,
			"ServiceNamespace",
			{
				name: "yy-workflow.internal",
				vpc: this.vpc,
			}
		);

		this.bffSecurityGroup = new ec2.SecurityGroup(this, "BffSecurityGroup", {
			allowAllOutbound: false,
			description: "Lambda BFF can call only the internal ALB",
			securityGroupName: "yy-workflow-profile-bff",
			vpc: this.vpc,
		});
		this.albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
			allowAllOutbound: false,
			description: "Internal ALB accepts traffic only from the Lambda BFF",
			securityGroupName: "yy-workflow-profile-alb",
			vpc: this.vpc,
		});
		this.ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSecurityGroup", {
			allowAllOutbound: true,
			description: "profile-go Fargate tasks",
			securityGroupName: "yy-workflow-profile-ecs",
			vpc: this.vpc,
		});

		this.albSecurityGroup.addIngressRule(
			this.bffSecurityGroup,
			ec2.Port.tcp(80),
			"Lambda BFF to internal ALB"
		);
		this.bffSecurityGroup.addEgressRule(
			this.albSecurityGroup,
			ec2.Port.tcp(80),
			"Lambda BFF to internal ALB"
		);
		this.ecsSecurityGroup.addIngressRule(
			this.albSecurityGroup,
			ec2.Port.tcp(8080),
			"Internal ALB to profile-go"
		);
		this.albSecurityGroup.addEgressRule(
			this.ecsSecurityGroup,
			ec2.Port.tcp(8080),
			"Internal ALB to profile-go"
		);

		const auroraSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			"ExistingAuroraSecurityGroup",
			Fn.importValue(`${SAM_EXPORT_PREFIX}:AuroraSecurityGroupId`)
		);
		auroraSecurityGroup.addIngressRule(
			this.ecsSecurityGroup,
			ec2.Port.tcp(5432),
			"profile-go Fargate tasks to Aurora PostgreSQL"
		);

		this.alb = new elbv2.ApplicationLoadBalancer(this, "InternalAlb", {
			internetFacing: false,
			loadBalancerName: "yy-workflow-profile-internal",
			securityGroup: this.albSecurityGroup,
			vpc: this.vpc,
			vpcSubnets: { subnets: this.privateSubnets },
		});
		this.albListener = this.alb.addListener("HttpListener", {
			defaultAction: elbv2.ListenerAction.fixedResponse(404, {
				contentType: "application/json",
				messageBody: '{"error":"route not found"}',
			}),
			open: false,
			port: 80,
			protocol: elbv2.ApplicationProtocol.HTTP,
		});

		new CfnOutput(this, "RepositoryUri", {
			exportName: "yy-workflow-phase2:RepositoryUri",
			value: this.repository.repositoryUri,
		});
		new CfnOutput(this, "ClusterName", {
			exportName: "yy-workflow-phase2:ClusterName",
			value: this.cluster.clusterName,
		});
		new CfnOutput(this, "InternalAlbDnsName", {
			exportName: "yy-workflow-phase2:InternalAlbDnsName",
			value: this.alb.loadBalancerDnsName,
		});
		new CfnOutput(this, "CloudMapNamespace", {
			exportName: "yy-workflow-phase2:CloudMapNamespace",
			value: this.namespace.namespaceName,
		});
	}
}
