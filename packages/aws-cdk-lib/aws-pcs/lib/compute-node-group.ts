import * as constructs from 'constructs';
import { ICluster } from './cluster';
import { PurchaseOption, SpotAllocationStrategy } from './enums';
import { CfnComputeNodeGroup } from './pcs.generated';
import { ComputeNodeGroupSlurmConfigurationProps, SlurmConfiguration } from './slurm-configuration';
import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';

/**
 * Error thrown when an invalid compute node group ARN is provided
 */
class InvalidComputeNodeGroupArnError extends Error {
  constructor(arn: string) {
    super(`Invalid compute node group ARN: ${arn}`);
    this.name = 'InvalidComputeNodeGroupArnError';
  }
}

/**
 * Error thrown when invalid compute node group configuration is provided
 */
class InvalidComputeNodeGroupConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidComputeNodeGroupConfigurationError';
  }
}

/**
 * Scaling configuration for a compute node group
 */
export interface ScalingConfiguration {
  /**
   * The lower bound of the number of instances allowed in the compute fleet
   *
   * @minimum 0
   */
  readonly minInstanceCount: number;

  /**
   * The upper bound of the number of instances allowed in the compute fleet
   *
   * @minimum 0
   */
  readonly maxInstanceCount: number;
}

/**
 * Instance configuration for a compute node group
 */
export interface InstanceConfiguration {
  /**
   * The EC2 instance type that AWS PCS can provision in the compute node group
   */
  readonly instanceType: ec2.InstanceType;
}

/**
 * Spot instance configuration
 */
export interface SpotOptions {
  /**
   * The allocation strategy for spot instances
   *
   * @default SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED
   */
  readonly allocationStrategy?: SpotAllocationStrategy;
}

/**
 * Launch template configuration
 */
export interface LaunchTemplateConfiguration {
  /**
   * The EC2 launch template to use
   */
  readonly launchTemplate: ec2.ILaunchTemplate;

  /**
   * The version of the launch template to use
   *
   * @default '$Latest'
   */
  readonly version?: string;
}

/**
 * Properties for defining a PCS ComputeNodeGroup
 */
export interface ComputeNodeGroupProps {
  /**
   * The name that identifies the compute node group
   *
   * @default - A name is automatically generated
   */
  readonly computeNodeGroupName?: string;

  /**
   * The cluster this compute node group belongs to
   */
  readonly cluster: ICluster;

  /**
   * The subnet IDs where compute instances will be launched
   *
   * The subnets must be in the same VPC as the cluster.
   */
  readonly subnetIds: string[];

  /**
   * The machine image to use for compute instances
   *
   * If not provided, AWS PCS uses the AMI ID specified in the custom launch template.
   *
   * @default - Use the AMI specified in the launch template
   */
  readonly machineImage?: ec2.IMachineImage;

  /**
   * Launch template configuration
   *
   * An Amazon EC2 launch template AWS PCS uses to launch compute nodes.
   */
  readonly launchTemplate: LaunchTemplateConfiguration;

  /**
   * The IAM instance profile for compute instances
   *
   * The Amazon Resource Name (ARN) of the IAM instance profile used to pass an IAM role when launching EC2 instances.
   * The role contained in your instance profile must have pcs:RegisterComputeNodeGroupInstance
   * permissions attached to provision instances correctly.
   */
  readonly instanceProfile: iam.IInstanceProfile;

  /**
   * Instance configurations for the compute node group
   *
   * A list of EC2 instance configurations that AWS PCS can provision in the compute node group.
   */
  readonly instanceConfigurations: InstanceConfiguration[];

  /**
   * How EC2 instances are purchased
   *
   * Specifies how EC2 instances are purchased on your behalf. AWS PCS supports On-Demand and Spot instances.
   *
   * @default PurchaseOption.ON_DEMAND
   */
  readonly purchaseOption?: PurchaseOption;

  /**
   * Additional configuration when you specify SPOT as the purchaseOption
   *
   * @default - No spot options specified
   */
  readonly spotOptions?: SpotOptions;

  /**
   * Scaling configuration for the compute node group
   *
   * Specifies the boundaries of the compute node group auto scaling.
   */
  readonly scalingConfiguration: ScalingConfiguration;

  /**
   * Slurm-specific configuration options
   *
   * Additional options related to the Slurm scheduler.
   *
   * @default - No Slurm configuration
   */
  readonly slurmConfiguration?: ComputeNodeGroupSlurmConfigurationProps;

  /**
   * Tags to apply to the compute node group
   *
   * 1 or more tags added to the resource. Each tag consists of a tag key and tag value.
   * The tag value is optional and can be an empty string.
   *
   * @default - No tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Represents a PCS ComputeNodeGroup
 */
export interface IComputeNodeGroup extends cdk.IResource {
  /**
   * The ARN of the compute node group
   * @attribute
   */
  readonly computeNodeGroupArn: string;

  /**
   * The ID of the compute node group
   * @attribute
   */
  readonly computeNodeGroupId: string;

  /**
   * The name of the compute node group
   * @attribute
   */
  readonly computeNodeGroupName: string;

  /**
   * The cluster this compute node group belongs to
   */
  readonly cluster: ICluster;
}

/**
 * Properties for importing an existing compute node group
 */
export interface ComputeNodeGroupAttributes {
  /**
   * The ARN of the compute node group
   */
  readonly computeNodeGroupArn: string;

  /**
   * The ID of the compute node group
   */
  readonly computeNodeGroupId: string;

  /**
   * The name of the compute node group
   */
  readonly computeNodeGroupName: string;

  /**
   * The cluster this compute node group belongs to
   */
  readonly cluster: ICluster;
}

/**
 * A PCS ComputeNodeGroup for managing compute resources in an HPC cluster
 */
export class ComputeNodeGroup extends cdk.Resource implements IComputeNodeGroup {
  /**
   * Import an existing compute node group by specifying its attributes
   */
  public static fromComputeNodeGroupAttributes(scope: constructs.Construct, id: string, attrs: ComputeNodeGroupAttributes): IComputeNodeGroup {
    class Import extends cdk.Resource implements IComputeNodeGroup {
      public readonly computeNodeGroupArn = attrs.computeNodeGroupArn;
      public readonly computeNodeGroupId = attrs.computeNodeGroupId;
      public readonly computeNodeGroupName = attrs.computeNodeGroupName;
      public readonly cluster = attrs.cluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing compute node group by its ARN
   */
  public static fromComputeNodeGroupArn(scope: constructs.Construct, id: string, computeNodeGroupArn: string): IComputeNodeGroup {
    const arnParts = cdk.Arn.split(computeNodeGroupArn, cdk.ArnFormat.HIERARCHICAL_SLASH_SEPARATED);
    const computeNodeGroupId = arnParts.resourceName;

    // Extract cluster ID from hierarchical ARN structure
    const clusterId = cdk.Arn.getHierarchicalResource(arnParts, 'cluster');

    if (!computeNodeGroupId || !clusterId) {
      throw new InvalidComputeNodeGroupArnError(computeNodeGroupArn);
    }

    class Import extends cdk.Resource implements IComputeNodeGroup {
      public readonly computeNodeGroupArn = computeNodeGroupArn;
      public readonly computeNodeGroupId = computeNodeGroupId!;
      public readonly computeNodeGroupName = computeNodeGroupId!;
      // Create a minimal cluster reference with extracted cluster ID
      public readonly cluster: ICluster = {
        clusterId: clusterId!,
        clusterArn: cdk.Arn.format({
          service: 'pcs',
          resource: 'cluster',
          resourceName: clusterId,
        }, cdk.Stack.of(scope)),
        clusterName: clusterId!,
      } as ICluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing compute node group by its ID
   */
  public static fromComputeNodeGroupId(scope: constructs.Construct, id: string, computeNodeGroupId: string): IComputeNodeGroup {
    // Note: fromComputeNodeGroupId requires additional context (cluster ID) to construct hierarchical ARN
    // Users should prefer fromComputeNodeGroupArn or fromComputeNodeGroupAttributes for better control
    const stack = cdk.Stack.of(scope);

    // Create a minimal hierarchical ARN with unknown cluster ID
    // This is a fallback - users should use fromComputeNodeGroupArn with full hierarchical ARN
    const computeNodeGroupArn = cdk.Arn.format({
      service: 'pcs',
      resource: 'cluster/unknown/computenodegroup',
      resourceName: computeNodeGroupId,
    }, stack);

    return ComputeNodeGroup.fromComputeNodeGroupArn(scope, id, computeNodeGroupArn);
  }

  public readonly computeNodeGroupArn: string;
  public readonly computeNodeGroupId: string;
  public readonly computeNodeGroupName: string;
  public readonly cluster: ICluster;

  private readonly instanceProfile: iam.IInstanceProfile;
  private readonly cfnComputeNodeGroup: CfnComputeNodeGroup;

  constructor(scope: constructs.Construct, id: string, props: ComputeNodeGroupProps) {
    super(scope, id);

    this.cluster = props.cluster;

    // Use the provided instance profile (now required)
    this.instanceProfile = props.instanceProfile;

    // Validate required parameters
    if (!props.instanceConfigurations || props.instanceConfigurations.length === 0) {
      throw new InvalidComputeNodeGroupConfigurationError('instanceConfigurations is required and must contain at least one configuration');
    }

    if (!props.scalingConfiguration) {
      throw new InvalidComputeNodeGroupConfigurationError('scalingConfiguration is required');
    }

    // Get AMI ID from machine image if provided
    let amiId: string | undefined;
    if (props.machineImage) {
      amiId = props.machineImage.getImage(this).imageId;
    }

    // Validate scaling configuration bounds
    if (props.scalingConfiguration.minInstanceCount < 0) {
      throw new InvalidComputeNodeGroupConfigurationError('minInstanceCount must be >= 0');
    }

    if (props.scalingConfiguration.maxInstanceCount < 0) {
      throw new InvalidComputeNodeGroupConfigurationError('maxInstanceCount must be >= 0');
    }

    if (props.scalingConfiguration.minInstanceCount > props.scalingConfiguration.maxInstanceCount) {
      throw new InvalidComputeNodeGroupConfigurationError('minInstanceCount cannot be greater than maxInstanceCount');
    }

    // Validate subnet IDs are provided
    if (!props.subnetIds || props.subnetIds.length === 0) {
      throw new InvalidComputeNodeGroupConfigurationError('At least one subnet ID must be provided');
    }

    const subnetIds = props.subnetIds;
    const instanceConfigs = props.instanceConfigurations;
    const scalingConfig = props.scalingConfiguration;

    let slurmConfiguration;
    if (props.slurmConfiguration) {
      slurmConfiguration = SlurmConfiguration.forComputeNodeGroup(props.slurmConfiguration);
    }

    let spotOptions = props.spotOptions;

    this.cfnComputeNodeGroup = new CfnComputeNodeGroup(this, 'Resource', {
      name: props.computeNodeGroupName,
      clusterId: this.cluster.clusterId,
      amiId: amiId,
      customLaunchTemplate: {
        templateId: props.launchTemplate.launchTemplate.launchTemplateId,
        version: props.launchTemplate.version || '$Latest',
      },
      iamInstanceProfileArn: this.instanceProfile.instanceProfileArn,
      instanceConfigs: instanceConfigs.map(config => ({
        instanceType: config.instanceType.toString(),
      })),
      purchaseOption: props.purchaseOption || PurchaseOption.ON_DEMAND,
      spotOptions: spotOptions,
      scalingConfiguration: {
        minInstanceCount: scalingConfig.minInstanceCount,
        maxInstanceCount: scalingConfig.maxInstanceCount,
      },
      slurmConfiguration,
      subnetIds: subnetIds,
      tags: props.tags,
    });

    this.computeNodeGroupArn = this.cfnComputeNodeGroup.attrArn;
    this.computeNodeGroupId = this.cfnComputeNodeGroup.attrId;
    this.computeNodeGroupName = this.cfnComputeNodeGroup.name || this.cfnComputeNodeGroup.attrId;
  }

  /**
   * Add tags to the compute node group
   */
  public addTags(tags: Record<string, string>): void {
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  /**
   * Get the status of the compute node group
   */
  public get status(): string {
    return this.cfnComputeNodeGroup.attrStatus;
  }

  /**
   * Get error information if the compute node group failed to provision
   */
  public get errorInfo(): cdk.IResolvable {
    return this.cfnComputeNodeGroup.attrErrorInfo;
  }
}
