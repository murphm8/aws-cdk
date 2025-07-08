import * as ec2 from '../../aws-ec2';
import * as cdk from '../../core';
import * as constructs from 'constructs';
import { CfnCluster } from './pcs.generated';
import { SchedulerType, ClusterSize } from './enums';
import { ClusterSlurmConfigurationProps, SlurmConfiguration } from './slurm-configuration';

/**
 * Scheduler configuration for a cluster
 */
export interface SchedulerConfiguration {
  /**
   * The scheduler type
   */
  readonly type: SchedulerType;

  /**
   * The scheduler version
   */
  readonly version: string;
}

/**
 * Properties for defining a PCS Cluster
 */
export interface ClusterProps {
  /**
   * The name that identifies the cluster
   */
  readonly clusterName?: string;

  /**
   * The VPC where the cluster will be deployed
   */
  readonly vpc: ec2.IVpc;

  /**
   * The subnets where the cluster control plane will be deployed
   */
  readonly subnets: ec2.SubnetSelection;

  /**
   * Security groups for the cluster control plane
   */
  readonly securityGroups: ec2.ISecurityGroup[];

  /**
   * The size of the cluster
   */
  readonly size: ClusterSize;

  /**
   * The scheduler type and version
   */
  readonly scheduler: SchedulerConfiguration;

  /**
   * Slurm-specific configuration options
   */
  readonly slurmConfiguration?: ClusterSlurmConfigurationProps;

  /**
   * Tags to apply to the cluster
   */
  readonly tags?: Record<string, string>;
}

/**
 * Represents a PCS Cluster
 */
export interface ICluster extends cdk.IResource {
  /**
   * The ARN of the cluster
   */
  readonly clusterArn: string;

  /**
   * The ID of the cluster
   */
  readonly clusterId: string;

  /**
   * The name of the cluster
   */
  readonly clusterName: string;

  /**
   * The VPC where the cluster is deployed
   */
  readonly vpc: ec2.IVpc;
}

/**
 * Properties for importing an existing cluster
 */
export interface ClusterAttributes {
  /**
   * The ARN of the cluster
   */
  readonly clusterArn: string;

  /**
   * The ID of the cluster
   */
  readonly clusterId: string;

  /**
   * The name of the cluster
   */
  readonly clusterName: string;

  /**
   * The VPC where the cluster is deployed
   */
  readonly vpc: ec2.IVpc;
}

/**
 * A PCS Cluster for high-performance computing workloads
 */
export class Cluster extends cdk.Resource implements ICluster {
  /**
   * Import an existing cluster by specifying its attributes
   */
  public static fromClusterAttributes(scope: constructs.Construct, id: string, attrs: ClusterAttributes): ICluster {
    class Import extends cdk.Resource implements ICluster {
      public readonly clusterArn = attrs.clusterArn;
      public readonly clusterId = attrs.clusterId;
      public readonly clusterName = attrs.clusterName;
      public readonly vpc = attrs.vpc;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing cluster by its ARN
   */
  public static fromClusterArn(scope: constructs.Construct, id: string, clusterArn: string): ICluster {
    const arnParts = cdk.Arn.split(clusterArn, cdk.ArnFormat.SLASH_RESOURCE_NAME);
    const clusterId = arnParts.resourceName;

    if (!clusterId) {
      throw new Error(`Invalid cluster ARN: ${clusterArn}`);
    }

    class Import extends cdk.Resource implements ICluster {
      public readonly clusterArn = clusterArn;
      public readonly clusterId = clusterId!;
      public readonly clusterName = clusterId!; // Best guess since we only have the ARN
      public readonly vpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', { isDefault: true });
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing cluster by its ID
   */
  public static fromClusterId(scope: constructs.Construct, id: string, clusterId: string): ICluster {
    const stack = cdk.Stack.of(scope);
    const clusterArn = cdk.Arn.format({
      service: 'pcs',
      resource: 'cluster',
      resourceName: clusterId,
    }, stack);

    return Cluster.fromClusterArn(scope, id, clusterArn);
  }

  public readonly clusterArn: string;
  public readonly clusterId: string;
  public readonly clusterName: string;
  public readonly vpc: ec2.IVpc;

  private readonly securityGroup: ec2.ISecurityGroup;
  private readonly cfnCluster: CfnCluster;

  constructor(scope: constructs.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    this.vpc = props.vpc;

    // Use the provided security group
    this.securityGroup = props.securityGroups[0];

    // Select subnets
    const subnets = this.vpc.selectSubnets(props.subnets);

    // Set up scheduler configuration
    const scheduler = props.scheduler;

    // Configure Slurm settings
    let slurmConfiguration;
    if (props.slurmConfiguration) {
      slurmConfiguration = SlurmConfiguration.forCluster(props.slurmConfiguration);
    }

    // Create the cluster
    this.cfnCluster = new CfnCluster(this, 'Resource', {
      name: props.clusterName,
      size: props.size,
      networking: {
        subnetIds: subnets.subnetIds,
        securityGroupIds: [this.securityGroup.securityGroupId],
      },
      scheduler: {
        type: scheduler.type,
        version: scheduler.version,
      },
      slurmConfiguration,
      tags: props.tags,
    });

    this.clusterArn = this.cfnCluster.attrArn;
    this.clusterId = this.cfnCluster.attrId;
    this.clusterName = this.cfnCluster.name || this.cfnCluster.attrId;
  }

  /**
   * Add tags to the cluster
   */
  public addTags(tags: Record<string, string>): void {
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  /**
   * Get the endpoints for connecting to the cluster scheduler
   */
  public get endpoints(): cdk.IResolvable {
    return this.cfnCluster.attrEndpoints;
  }

  /**
   * Get the status of the cluster
   */
  public get status(): string {
    return this.cfnCluster.attrStatus;
  }

  /**
   * Get error information if the cluster failed to provision
   */
  public get errorInfo(): cdk.IResolvable {
    return this.cfnCluster.attrErrorInfo;
  }
}
