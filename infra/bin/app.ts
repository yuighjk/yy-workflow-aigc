#!/usr/bin/env node
import { App, type Environment } from "aws-cdk-lib";

import { Phase2ServiceStack } from "../lib/phase2-service-stack.js";
import { Phase2SharedStack } from "../lib/phase2-shared-stack.js";

const app = new App();
const environment: Environment = {
	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
};

const shared = new Phase2SharedStack(app, "yy-workflow-phase2-shared", {
	env: environment,
	description:
		"Phase 2 shared container infrastructure; imports the network owned by yy-workflow-server",
});

new Phase2ServiceStack(app, "yy-workflow-phase2-service", {
	env: environment,
	description:
		"Phase 2 profile-go service, internal ALB integration, and Lambda BFF",
	shared,
});
