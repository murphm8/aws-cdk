# AWS Parallel Computing Service Construct Library
<!--BEGIN STABILITY BANNER-->

---

![cfn-resources: Stable](https://img.shields.io/badge/cfn--resources-stable-success.svg?style=for-the-badge)

> All classes with the `Cfn` prefix in this module ([CFN Resources]) are always stable and safe to use.
>
> [CFN Resources]: https://docs.aws.amazon.com/cdk/latest/guide/constructs.html#constructs_lib

---

<!--END STABILITY BANNER-->

This module is part of the [AWS Cloud Development Kit](https://github.com/aws/aws-cdk) project.

```ts nofixture
import * as pcs from 'aws-cdk-lib/aws-pcs';
```

## Overview

AWS Parallel Computing Service (PCS) provides managed high-performance computing (HPC) resources using the Slurm scheduler. This module provides both low-level CloudFormation constructs (L1) and higher-level abstractions (L2) for working with PCS resources.

### AWS PCS Components

- **Cluster**: The core HPC cluster with networking, scheduler, and Slurm configuration
- **ComputeNodeGroup**: Scalable compute nodes with instance configurations and launch templates
- **Queue**: Job queues that assign work to compute node groups

## L2 Constructs

### Creating a Cluster

A cluster requires subnet IDs, security groups, a size, and a scheduler configuration:

```ts
declare const vpc: ec2.IVpc;
declare const securityGroup: ec2.ISecurityGroup;

const cluster = new pcs.Cluster(this, 'HpcCluster', {
  clusterName: 'my-hpc-cluster',
  subnetIds: [vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds[0]],
  securityGroups: [securityGroup],
  size: pcs.ClusterSize.SMALL,
  scheduler: {
    type: pcs.SchedulerType.SLURM,
    version: '23.11',
  },
});
```

### Creating a ComputeNodeGroup

A compute node group requires a cluster, subnets, a launch template, an IAM instance profile,
instance configurations, and a scaling configuration:

```ts
declare const cluster: pcs.Cluster;
declare const vpc: ec2.IVpc;
declare const instanceProfile: iam.IInstanceProfile;

const launchTemplate = new ec2.LaunchTemplate(this, 'ComputeLT', {
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
});

const computeNodeGroup = new pcs.ComputeNodeGroup(this, 'ComputeNodes', {
  cluster,
  subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
  launchTemplate: {
    launchTemplate,
  },
  instanceProfile,
  instanceConfigurations: [
    { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
  ],
  scalingConfiguration: {
    minInstanceCount: 0,
    maxInstanceCount: 10,
  },
});
```

### Creating a Queue

A queue belongs to a cluster and can be associated with one or more compute node groups:

```ts
declare const cluster: pcs.Cluster;
declare const computeNodeGroup: pcs.ComputeNodeGroup;

const queue = new pcs.Queue(this, 'JobQueue', {
  queueName: 'main',
  cluster,
  computeNodeGroupConfigurations: [
    { computeNodeGroup },
  ],
});
```

You can also add compute node groups to a queue after creation:

```ts
declare const queue: pcs.Queue;
declare const anotherComputeNodeGroup: pcs.ComputeNodeGroup;

queue.addComputeNodeGroup(anotherComputeNodeGroup);
```

### Spot Instances

To use spot instances, set the `purchaseOption` and configure `spotOptions`:

```ts
declare const cluster: pcs.Cluster;
declare const vpc: ec2.IVpc;
declare const launchTemplate: ec2.LaunchTemplate;
declare const instanceProfile: iam.IInstanceProfile;

const spotComputeGroup = new pcs.ComputeNodeGroup(this, 'SpotCompute', {
  cluster,
  subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
  launchTemplate: { launchTemplate },
  instanceProfile,
  instanceConfigurations: [
    { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
    { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE2) },
  ],
  purchaseOption: pcs.PurchaseOption.SPOT,
  spotOptions: {
    allocationStrategy: pcs.SpotAllocationStrategy.CAPACITY_OPTIMIZED,
  },
  scalingConfiguration: {
    minInstanceCount: 0,
    maxInstanceCount: 100,
  },
});
```

### Slurm Configuration

Use the `SlurmConfiguration` helper class to configure cluster-level Slurm settings:

```ts
declare const vpc: ec2.IVpc;
declare const securityGroup: ec2.ISecurityGroup;

const cluster = new pcs.Cluster(this, 'AdvancedCluster', {
  subnetIds: [vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds[0]],
  securityGroups: [securityGroup],
  size: pcs.ClusterSize.LARGE,
  scheduler: {
    type: pcs.SchedulerType.SLURM,
    version: '23.11',
  },
  slurmConfiguration: {
    accounting: pcs.SlurmConfiguration.standardAccounting(30),
    scaleDownIdleTimeInSeconds: 300,
    customSettings: pcs.SlurmConfiguration.commonHpcSettings(),
  },
});
```

Compute node groups can also have Slurm-specific custom settings:

```ts
declare const cluster: pcs.Cluster;
declare const vpc: ec2.IVpc;
declare const launchTemplate: ec2.LaunchTemplate;
declare const instanceProfile: iam.IInstanceProfile;

const cng = new pcs.ComputeNodeGroup(this, 'ComputeNodes', {
  cluster,
  subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
  launchTemplate: { launchTemplate },
  instanceProfile,
  instanceConfigurations: [
    { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
  ],
  scalingConfiguration: { minInstanceCount: 0, maxInstanceCount: 10 },
  slurmConfiguration: {
    customSettings: [
      { parameterName: 'Weight', parameterValue: '1' },
    ],
  },
});
```

### Importing Existing Resources

You can import existing PCS resources by ARN, ID, or attributes:

```ts
// Import a cluster by ARN
const importedCluster = pcs.Cluster.fromClusterArn(this, 'ImportedCluster',
  'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345',
);

// Import a cluster by ID
const importedClusterById = pcs.Cluster.fromClusterId(this, 'ImportedCluster2', 'cls-12345');

// Import a cluster by attributes
const importedClusterByAttrs = pcs.Cluster.fromClusterAttributes(this, 'ImportedCluster3', {
  clusterArn: 'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345',
  clusterName: 'my-hpc-cluster',
});

// Import a compute node group by ARN (cluster is parsed from the ARN)
const importedCng = pcs.ComputeNodeGroup.fromComputeNodeGroupArn(this, 'ImportedCNG',
  'arn:aws:pcs:us-west-2:123456789012:computenodegroup/cls-12345/cng-67890',
);

// Import a compute node group by ID (requires cluster reference)
const importedCngById = pcs.ComputeNodeGroup.fromComputeNodeGroupId(
  this, 'ImportedCNG2', importedCluster, 'cng-67890',
);

// Import a queue by ARN (cluster is parsed from the ARN)
const importedQueue = pcs.Queue.fromQueueArn(this, 'ImportedQueue',
  'arn:aws:pcs:us-west-2:123456789012:queue/cls-12345/q-67890',
);

// Import a queue by ID (requires cluster reference)
const importedQueueById = pcs.Queue.fromQueueId(
  this, 'ImportedQueue2', importedCluster, 'q-67890',
);
```

### Key Features

- **Slurm Integration**: Built-in support for Slurm accounting, auth keys, and custom settings
- **Cost Optimization**: Spot instance support with configurable allocation strategies and auto-scaling
- **Import Support**: Import existing PCS resources using ARN, ID, or attributes

### Available Constructs

#### L2 Constructs
- `Cluster` - High-level cluster construct with networking and scheduler configuration
- `ComputeNodeGroup` - Managed compute resources with scaling configuration and launch templates
- `Queue` - Job queue management with compute node group associations

#### Helper Classes
- `SlurmConfiguration` - Builder for Slurm settings (accounting, auth keys, custom settings)
- Enums: `ClusterSize`, `SchedulerType`, `PurchaseOption`, `SpotAllocationStrategy`, `AccountingMode`

## L1 Constructs

You can also use the automatically generated L1 constructs, which correspond directly to CloudFormation resources:

- `CfnCluster` - AWS::PCS::Cluster
- `CfnComputeNodeGroup` - AWS::PCS::ComputeNodeGroup
- `CfnQueue` - AWS::PCS::Queue

For more information on the resources and properties available, see the [CloudFormation documentation for AWS::PCS](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_PCS.html).
