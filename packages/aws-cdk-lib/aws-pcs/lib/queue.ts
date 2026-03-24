import * as constructs from 'constructs';
import { Cluster, ICluster } from './cluster';
import { IComputeNodeGroup } from './compute-node-group';
import { CfnQueue } from './pcs.generated';
import { QueueSlurmConfigurationProps, SlurmConfiguration } from './slurm-configuration';
import * as cdk from '../../core';

/**
 * Error thrown when an invalid queue ARN is provided
 */
class InvalidQueueArnError extends Error {
  constructor(arn: string) {
    super(`Invalid queue ARN: ${arn}`);
    this.name = 'InvalidQueueArnError';
  }
}

/**
 * Configuration for associating a compute node group with a queue
 */
export interface ComputeNodeGroupConfiguration {
  /**
   * The compute node group to associate with the queue
   */
  readonly computeNodeGroup: IComputeNodeGroup;
}

/**
 * Properties for defining a PCS Queue
 */
export interface QueueProps {
  /**
   * The name that identifies the queue
   *
   * @default - A name is automatically generated
   */
  readonly queueName?: string;

  /**
   * The cluster this queue belongs to
   */
  readonly cluster: ICluster;

  /**
   * The compute node groups to associate with this queue
   *
   * @default - No compute node groups associated
   */
  readonly computeNodeGroupConfigurations?: ComputeNodeGroupConfiguration[];

  /**
   * Slurm-specific configuration options for the queue
   * @default - No Slurm configuration
   */
  readonly slurmConfiguration?: QueueSlurmConfigurationProps;

  /**
   * Policy to apply when the queue is removed from the stack.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * Tags to apply to the queue
   *
   * @default - No tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Represents a PCS Queue
 */
export interface IQueue extends cdk.IResource {
  /**
   * The ARN of the queue
   * @attribute
   */
  readonly queueArn: string;

  /**
   * The ID of the queue
   * @attribute
   */
  readonly queueId: string;

  /**
   * The name of the queue
   * @attribute
   */
  readonly queueName: string;

  /**
   * The cluster this queue belongs to
   */
  readonly cluster: ICluster;
}

/**
 * Properties for importing an existing queue
 */
export interface QueueAttributes {
  /**
   * The ARN of the queue
   */
  readonly queueArn: string;

  /**
   * The ID of the queue
   */
  readonly queueId: string;

  /**
   * The name of the queue
   */
  readonly queueName: string;

  /**
   * The cluster this queue belongs to
   */
  readonly cluster: ICluster;
}

/**
 * A PCS Queue for managing job scheduling in an HPC cluster
 */
export class Queue extends cdk.Resource implements IQueue {
  /**
   * Import an existing queue by specifying its attributes
   */
  public static fromQueueAttributes(scope: constructs.Construct, id: string, attrs: QueueAttributes): IQueue {
    class Import extends cdk.Resource implements IQueue {
      public readonly queueArn = attrs.queueArn;
      public readonly queueId = attrs.queueId;
      public readonly queueName = attrs.queueName;
      public readonly cluster = attrs.cluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing queue by its ARN
   *
   * The ARN is expected to be in the format:
   * `arn:aws:pcs:region:account:queue/cluster-id/queue-id`
   *
   * The cluster reference is automatically parsed from the ARN.
   * For full control over the cluster reference, use `fromQueueAttributes` instead.
   */
  public static fromQueueArn(scope: constructs.Construct, id: string, queueArn: string): IQueue {
    const arnParts = cdk.Arn.split(queueArn, cdk.ArnFormat.SLASH_RESOURCE_NAME);
    const resourceName = arnParts.resourceName;

    if (!resourceName) {
      throw new InvalidQueueArnError(queueArn);
    }

    // PCS queue ARNs have the format: queue/cluster-id/queue-id
    const parts = resourceName.split('/');
    if (parts.length !== 2) {
      throw new InvalidQueueArnError(queueArn);
    }

    const [clusterId, queueId] = parts;

    // Build the cluster ARN from the same ARN components
    const clusterArn = cdk.Arn.format({
      service: arnParts.service,
      resource: 'cluster',
      resourceName: clusterId,
      arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
      partition: arnParts.partition,
      region: arnParts.region,
      account: arnParts.account,
    });

    const importedCluster = Cluster.fromClusterArn(scope, `${id}Cluster`, clusterArn);

    class Import extends cdk.Resource implements IQueue {
      public readonly queueArn = queueArn;
      public readonly queueId = queueId;
      public readonly queueName = queueId;
      public readonly cluster = importedCluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing queue by its ID and cluster
   *
   * @param scope The construct scope
   * @param id The construct ID
   * @param cluster The cluster this queue belongs to
   * @param queueId The ID of the queue
   */
  public static fromQueueId(scope: constructs.Construct, id: string, cluster: ICluster, queueId: string): IQueue {
    const stack = cdk.Stack.of(scope);
    const queueArn = cdk.Arn.format({
      service: 'pcs',
      resource: 'queue',
      resourceName: `${cluster.clusterId}/${queueId}`,
      arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
    }, stack);

    class Import extends cdk.Resource implements IQueue {
      public readonly queueArn = queueArn;
      public readonly queueId = queueId;
      public readonly queueName = queueId;
      public readonly cluster = cluster;
    }

    return new Import(scope, id);
  }

  public readonly queueArn: string;
  public readonly queueId: string;
  public readonly queueName: string;
  public readonly cluster: ICluster;

  private readonly cfnQueue: CfnQueue;
  private readonly computeNodeGroupConfigs: ComputeNodeGroupConfiguration[];

  constructor(scope: constructs.Construct, id: string, props: QueueProps) {
    super(scope, id, {
      physicalName: props.queueName,
    });

    this.cluster = props.cluster;
    this.computeNodeGroupConfigs = props.computeNodeGroupConfigurations || [];

    // Convert compute node group configurations
    const computeNodeGroupConfigurations = this.computeNodeGroupConfigs.map(config => ({
      computeNodeGroupId: config.computeNodeGroup.computeNodeGroupId,
    }));

    // Configure Slurm settings
    let slurmConfiguration;
    if (props.slurmConfiguration) {
      slurmConfiguration = SlurmConfiguration.forQueue(props.slurmConfiguration);
    }

    // Create the queue
    this.cfnQueue = new CfnQueue(this, 'Resource', {
      name: this.physicalName,
      clusterId: this.cluster.clusterId,
      computeNodeGroupConfigurations: computeNodeGroupConfigurations.length > 0 ? computeNodeGroupConfigurations : undefined,
      slurmConfiguration,
      tags: props.tags,
    });

    this.cfnQueue.applyRemovalPolicy(props.removalPolicy ?? cdk.RemovalPolicy.DESTROY);

    this.queueArn = this.cfnQueue.attrArn;
    this.queueId = this.cfnQueue.attrId;
    this.queueName = props.queueName || this.cfnQueue.attrId;
  }

  /**
   * Add a compute node group to this queue
   */
  public addComputeNodeGroup(computeNodeGroup: IComputeNodeGroup): void {
    this.computeNodeGroupConfigs.push({
      computeNodeGroup,
    });

    // Update the CloudFormation resource
    const currentConfigs = this.cfnQueue.computeNodeGroupConfigurations as any[] || [];
    currentConfigs.push({
      computeNodeGroupId: computeNodeGroup.computeNodeGroupId,
    });

    this.cfnQueue.computeNodeGroupConfigurations = currentConfigs;
  }

  /**
   * Add tags to the queue
   */
  public addTags(tags: Record<string, string>): void {
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  /**
   * Get the status of the queue
   */
  public get status(): string {
    return this.cfnQueue.attrStatus;
  }

  /**
   * Get error information if the queue failed to provision
   */
  public get errorInfo(): cdk.IResolvable {
    return this.cfnQueue.attrErrorInfo;
  }

  /**
   * Get the compute node groups associated with this queue
   */
  public get computeNodeGroups(): IComputeNodeGroup[] {
    return this.computeNodeGroupConfigs.map(config => config.computeNodeGroup);
  }
}
