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

// VPC with private subnets for PCS
const vpc = new ec2.Vpc(stack, 'Vpc', {
  maxAzs: 2,
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
  subnetIds: [vpc.privateSubnets[0].subnetId],
  securityGroups: [clusterSg],
  size: pcs.ClusterSize.SMALL,
  scheduler: {
    type: pcs.SchedulerType.SLURM,
    version: '24.11',
  },
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

// Launch Template - must include security group for PCS
const launchTemplate = new ec2.LaunchTemplate(stack, 'LaunchTemplate', {
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
  securityGroup: clusterSg,
});

// Compute Node Group
const computeNodeGroup = new pcs.ComputeNodeGroup(stack, 'ComputeNodeGroup', {
  computeNodeGroupName: 'integ-test-cng',
  cluster,
  subnetIds: [vpc.privateSubnets[0].subnetId],
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
});

// Queue
const queue = new pcs.Queue(stack, 'Queue', {
  queueName: 'integ-test-queue',
  cluster,
  computeNodeGroupConfigurations: [
    { computeNodeGroup },
  ],
});

// Outputs
new cdk.CfnOutput(stack, 'ClusterArn', { value: cluster.clusterArn });
new cdk.CfnOutput(stack, 'ClusterName', { value: cluster.clusterName });
new cdk.CfnOutput(stack, 'ComputeNodeGroupArn', { value: computeNodeGroup.computeNodeGroupArn });
new cdk.CfnOutput(stack, 'QueueArn', { value: queue.queueArn });

new IntegTest(app, 'PcsClusterIntegTest', {
  testCases: [stack],
});
