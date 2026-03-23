import * as constructs from 'constructs';
import { Cluster, ICluster } from './cluster';
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
 * Error thrown when compute node group validation fails
 */
class ComputeNodeGroupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComputeNodeGroupValidationError';
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
   * The IAM instance profile for compute instances.
   *
   * The role contained in your instance profile must have
   * `pcs:RegisterComputeNodeGroupInstance` permissions and the role name
   * must start with `AWSPCS` or have the path `/aws-pcs/`.
   *
   * @see https://docs.aws.amazon.com/pcs/latest/userguide/security-instance-profiles.html
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
   * @default See SpotOptions
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
   *
   * The ARN is expected to be in the format:
   * `arn:aws:pcs:region:account:computenodegroup/cluster-id/cng-id`
   *
   * The cluster reference is automatically parsed from the ARN.
   * For full control over the cluster reference, use `fromComputeNodeGroupAttributes` instead.
   */
  public static fromComputeNodeGroupArn(scope: constructs.Construct, id: string, computeNodeGroupArn: string): IComputeNodeGroup {
    const arnParts = cdk.Arn.split(computeNodeGroupArn, cdk.ArnFormat.SLASH_RESOURCE_NAME);
    const resourceName = arnParts.resourceName;

    if (!resourceName) {
      throw new InvalidComputeNodeGroupArnError(computeNodeGroupArn);
    }

    // PCS compute node group ARNs have the format: computenodegroup/cluster-id/cng-id
    const parts = resourceName.split('/');
    if (parts.length !== 2) {
      throw new InvalidComputeNodeGroupArnError(computeNodeGroupArn);
    }

    const [clusterId, computeNodeGroupId] = parts;

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

    class Import extends cdk.Resource implements IComputeNodeGroup {
      public readonly computeNodeGroupArn = computeNodeGroupArn;
      public readonly computeNodeGroupId = computeNodeGroupId;
      public readonly computeNodeGroupName = computeNodeGroupId;
      public readonly cluster = importedCluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing compute node group by its ID and cluster
   *
   * @param scope The construct scope
   * @param id The construct ID
   * @param cluster The cluster this compute node group belongs to
   * @param computeNodeGroupId The ID of the compute node group
   */
  public static fromComputeNodeGroupId(scope: constructs.Construct, id: string, cluster: ICluster, computeNodeGroupId: string): IComputeNodeGroup {
    const stack = cdk.Stack.of(scope);
    const computeNodeGroupArn = cdk.Arn.format({
      service: 'pcs',
      resource: 'computenodegroup',
      resourceName: `${cluster.clusterId}/${computeNodeGroupId}`,
      arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
    }, stack);

    class Import extends cdk.Resource implements IComputeNodeGroup {
      public readonly computeNodeGroupArn = computeNodeGroupArn;
      public readonly computeNodeGroupId = computeNodeGroupId;
      public readonly computeNodeGroupName = computeNodeGroupId;
      public readonly cluster = cluster;
    }

    return new Import(scope, id);
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
      throw new ComputeNodeGroupValidationError('instanceConfigurations is required and must contain at least one configuration');
    }

    if (!props.scalingConfiguration) {
      throw new ComputeNodeGroupValidationError('scalingConfiguration is required');
    }

    // Get AMI ID from machine image if provided
    let amiId: string | undefined;
    if (props.machineImage) {
      amiId = props.machineImage.getImage(this).imageId;
    }

    // Validate scaling configuration bounds (skip validation for unresolved tokens)
    if (!cdk.Token.isUnresolved(props.scalingConfiguration.minInstanceCount)
      && props.scalingConfiguration.minInstanceCount < 0) {
      throw new ComputeNodeGroupValidationError('minInstanceCount must be >= 0');
    }

    if (!cdk.Token.isUnresolved(props.scalingConfiguration.maxInstanceCount)
      && props.scalingConfiguration.maxInstanceCount < 0) {
      throw new ComputeNodeGroupValidationError('maxInstanceCount must be >= 0');
    }

    if (!cdk.Token.isUnresolved(props.scalingConfiguration.minInstanceCount)
      && !cdk.Token.isUnresolved(props.scalingConfiguration.maxInstanceCount)
      && props.scalingConfiguration.minInstanceCount > props.scalingConfiguration.maxInstanceCount) {
      throw new ComputeNodeGroupValidationError('minInstanceCount cannot be greater than maxInstanceCount');
    }

    // Validate subnet IDs are provided
    if (!props.subnetIds || props.subnetIds.length === 0) {
      throw new ComputeNodeGroupValidationError('At least one subnet ID must be provided');
    }

    // Validate instance profile ARN format
    const profileArn = this.instanceProfile.instanceProfileArn;
    if (!cdk.Token.isUnresolved(profileArn)) {
      if (!profileArn.startsWith('arn:')) {
        throw new ComputeNodeGroupValidationError(
          `instanceProfile must have a valid ARN format, got: ${profileArn}. ` +
          'The role must start with "AWSPCS" or have path "/aws-pcs/".',
        );
      }
    }

    const subnetIds = props.subnetIds;
    const instanceConfigs = props.instanceConfigurations;
    const scalingConfig = props.scalingConfiguration;

    let slurmConfiguration;
    if (props.slurmConfiguration) {
      slurmConfiguration = SlurmConfiguration.forComputeNodeGroup(props.slurmConfiguration);
    }

    let spotOptions: SpotOptions | undefined = props.spotOptions;
    if (props.purchaseOption === PurchaseOption.SPOT && !spotOptions) {
      spotOptions = {
        allocationStrategy: SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED,
      };
    }

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
