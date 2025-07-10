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

### Basic Usage

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as pcs from 'aws-cdk-lib/aws-pcs';

// Create VPC for the cluster
const vpc = new ec2.Vpc(this, 'HpcVpc', {
  maxAzs: 2,
  natGateways: 1,
});

// Create the PCS cluster
const cluster = new pcs.Cluster(this, 'HpcCluster', {
  clusterName: 'my-hpc-cluster',
  vpc: vpc,
  size: pcs.ClusterSize.SMALL,
  scheduler: {
    type: pcs.SchedulerType.SLURM,
    version: '23.11',
  },
});

// Create a launch template for compute nodes
const launchTemplate = pcs.ComputeNodeGroup.createBasicLaunchTemplate(this, 'LaunchTemplate', {
  vpc: vpc,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
});

// Create compute node group
const computeNodeGroup = new pcs.ComputeNodeGroup(this, 'ComputeNodes', {
  cluster: cluster,
  launchTemplate: {
    launchTemplate: launchTemplate,
  },
  scalingConfiguration: {
    minInstanceCount: 0,
    maxInstanceCount: 10,
  },
});

// Create a queue to manage jobs
const queue = new pcs.Queue(this, 'JobQueue', {
  cluster: cluster,
  computeNodeGroupConfigurations: [
    { computeNodeGroup: computeNodeGroup },
  ],
});
```

### Advanced Configuration

```typescript
// Advanced Slurm configuration
const advancedCluster = new pcs.Cluster(this, 'AdvancedCluster', {
  vpc: vpc,
  size: pcs.ClusterSize.LARGE,
  slurmConfiguration: {
    accounting: pcs.SlurmConfiguration.standardAccounting(30),
    scaleDownIdleTimeInSeconds: 300,
    customSettings: pcs.SlurmConfiguration.commonHpcSettings(),
  },
});

// Spot instance compute group
const spotComputeGroup = new pcs.ComputeNodeGroup(this, 'SpotCompute', {
  cluster: advancedCluster,
  launchTemplate: { launchTemplate: launchTemplate },
  purchaseOption: pcs.PurchaseOption.SPOT,
  spotConfiguration: {
    allocationStrategy: pcs.SpotAllocationStrategy.CAPACITY_OPTIMIZED,
  },
  scalingConfiguration: {
    minInstanceCount: 0,
    maxInstanceCount: 100,
  },
});
```

### Key Features

- **Sensible Defaults**: Minimal configuration required for common HPC use cases
- **Slurm Integration**: Built-in support for Slurm accounting and custom settings
- **Cost Optimization**: Spot instance support and auto-scaling capabilities
- **Security**: Automatic security group and IAM role creation
- **Import Support**: Import existing PCS resources using ARN or ID

### Available Constructs

#### L2 Constructs
- `Cluster` - High-level cluster construct with sensible defaults
- `ComputeNodeGroup` - Managed compute resources with scaling configuration
- `Queue` - Job queue management with compute node group associations

#### Helper Classes
- `SlurmConfiguration` - Builder for Slurm settings
- Enums for cluster sizes, purchase options, and allocation strategies

## L1 Constructs

You can also use the automatically generated L1 constructs, which correspond directly to CloudFormation resources:

- `CfnCluster` - AWS::PCS::Cluster
- `CfnComputeNodeGroup` - AWS::PCS::ComputeNodeGroup
- `CfnQueue` - AWS::PCS::Queue

For more information on the resources and properties available, see the [CloudFormation documentation for AWS::PCS](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_PCS.html).
