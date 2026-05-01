import * as cdk from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as pcs from 'aws-cdk-lib/aws-pcs';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-cdk-pcs-integ', {
  env: {
    region: 'us-east-1',
  },
});

cdk.Tags.of(stack).add('test', 'aws-pcs-integ');

// VPC with a single private subnet for PCS (PCS requires exactly 1 subnet per cluster)
const vpc = new ec2.Vpc(stack, 'Vpc', {
  maxAzs: 1,
  natGateways: 1,
});

// Security group for the cluster
const clusterSg = new ec2.SecurityGroup(stack, 'ClusterSG', {
  vpc,
  description: 'Security group for PCS cluster',
  allowAllOutbound: true,
});

// PCS requires at least one inbound rule on the cluster security group
clusterSg.addIngressRule(clusterSg, ec2.Port.allTraffic(), 'Allow cluster-internal traffic');

// PCS Cluster
const cluster = new pcs.Cluster(stack, 'Cluster', {
  clusterName: 'integ-test-cluster',
  vpc,
  securityGroups: [clusterSg],
  size: pcs.ClusterSize.SMALL,
  scheduler: {
    type: pcs.SchedulerType.SLURM,
    version: '24.11',
  },
  tags: { Environment: 'test', Service: 'pcs-integ' },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// IAM Role with proper PCS path
const nodeRole = new iam.Role(stack, 'NodeRole', {
  assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
  path: '/aws-pcs/',
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AWSPCSComputeNodePolicy'),
  ],
});

// Instance Profile
const instanceProfile = new iam.InstanceProfile(stack, 'NodeProfile', {
  role: nodeRole,
});

// PCS requires launch template userdata in MIME multipart format
const userData = new ec2.MultipartUserData();
userData.addUserDataPart(ec2.UserData.forLinux(), ec2.MultipartBody.SHELL_SCRIPT);

// Launch Template - must include security group and MIME multipart userdata for PCS
const launchTemplate = new ec2.LaunchTemplate(stack, 'LaunchTemplate', {
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
  securityGroup: clusterSg,
  userData,
});

// Compute Node Group
const computeNodeGroup = new pcs.ComputeNodeGroup(stack, 'ComputeNodeGroup', {
  computeNodeGroupName: 'integ-test-cng',
  cluster,
  vpc,
  launchTemplate: { launchTemplate },
  instanceProfile,
  instanceConfigurations: [
    { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
  ],
  scalingConfiguration: {
    minInstanceCount: 0,
    maxInstanceCount: 4,
  },
  purchaseOption: pcs.PurchaseOption.ON_DEMAND,
  tags: { Component: 'compute' },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Queue
const queue = new pcs.Queue(stack, 'Queue', {
  queueName: 'integ-test-queue',
  cluster,
  computeNodeGroupConfigurations: [
    { computeNodeGroup },
  ],
  tags: { Component: 'queue' },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Outputs
new cdk.CfnOutput(stack, 'ClusterArn', { value: cluster.clusterArn });
new cdk.CfnOutput(stack, 'ClusterName', { value: cluster.clusterName });
new cdk.CfnOutput(stack, 'ComputeNodeGroupArn', { value: computeNodeGroup.computeNodeGroupArn });
new cdk.CfnOutput(stack, 'QueueArn', { value: queue.queueArn });

new IntegTest(app, 'PcsClusterIntegTest', {
  testCases: [stack],
});
