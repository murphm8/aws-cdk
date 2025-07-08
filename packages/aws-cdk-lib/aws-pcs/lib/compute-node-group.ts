import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';
import * as constructs from 'constructs';
import { CfnComputeNodeGroup } from './pcs.generated';
import { PurchaseOption, SpotAllocationStrategy } from './enums';
import { ComputeNodeGroupSlurmConfigurationProps, SlurmConfiguration } from './slurm-configuration';
import { ICluster } from './cluster';

/**
 * Scaling configuration for a compute node group
 */
export interface ScalingConfiguration {
  /**
   * The minimum number of instances in the compute node group
   *
   * @default 0
   */
  readonly minInstanceCount?: number;

  /**
   * The maximum number of instances in the compute node group
   *
   * @default 10
   */
  readonly maxInstanceCount?: number;
}

/**
 * Instance configuration for a compute node group
 */
export interface InstanceConfiguration {
  /**
   * The EC2 instance type
   *
   * @default 'm5.large'
   */
  readonly instanceType?: ec2.InstanceType;
}

/**
 * Spot instance configuration
 */
export interface SpotConfiguration {
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
   * The subnets where compute instances will be launched
   *
   * @default - Private subnets of the cluster's VPC
   */
  readonly subnets?: ec2.SubnetSelection;

  /**
   * The AMI ID to use for compute instances
   *
   * @default - Use the AMI specified in the launch template
   */
  readonly amiId?: string;

  /**
   * Launch template configuration
   */
  readonly launchTemplate: LaunchTemplateConfiguration;

  /**
   * The IAM instance profile for compute instances
   *
   * @default - A new instance profile is created
   */
  readonly instanceProfile?: iam.IInstanceProfile;

  /**
   * Instance configurations for the compute node group
   *
   * @default - Single m5.large instance configuration
   */
  readonly instanceConfigurations?: InstanceConfiguration[];

  /**
   * How EC2 instances are purchased
   *
   * @default PurchaseOption.ON_DEMAND
   */
  readonly purchaseOption?: PurchaseOption;

  /**
   * Spot instance configuration (only used when purchaseOption is SPOT)
   *
   * @default - Default spot configuration
   */
  readonly spotConfiguration?: SpotConfiguration;

  /**
   * Scaling configuration for the compute node group
   *
   * @default - Scale from 0 to 10 instances
   */
  readonly scalingConfiguration?: ScalingConfiguration;

  /**
   * Slurm-specific configuration options
   *
   * @default - No Slurm configuration
   */
  readonly slurmConfiguration?: ComputeNodeGroupSlurmConfigurationProps;

  /**
   * Tags to apply to the compute node group
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
 * Properties for creating a basic launch template
 */
export interface BasicLaunchTemplateProps {
  /**
   * The VPC where the launch template will be used
   */
  readonly vpc: ec2.IVpc;

  /**
   * The instance type for the launch template
   *
   * @default ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE)
   */
  readonly instanceType?: ec2.InstanceType;

  /**
   * Security groups for the instances
   *
   * @default - A new security group is created
   */
  readonly securityGroups?: ec2.ISecurityGroup[];

  /**
   * The name of the key pair for SSH access
   *
   * @default - No key pair
   */
  readonly keyName?: string;

  /**
   * User data script for the instances
   *
   * @default - Basic HPC setup script
   */
  readonly userData?: ec2.UserData;
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
  public static fromComputeNodeGroupArn(scope: constructs.Construct, id: string, computeNodeGroupArn: string, cluster: ICluster): IComputeNodeGroup {
    const arnParts = cdk.Arn.split(computeNodeGroupArn, cdk.ArnFormat.SLASH_RESOURCE_NAME);
    const computeNodeGroupId = arnParts.resourceName;

    if (!computeNodeGroupId) {
      throw new Error(`Invalid compute node group ARN: ${computeNodeGroupArn}`);
    }

    class Import extends cdk.Resource implements IComputeNodeGroup {
      public readonly computeNodeGroupArn = computeNodeGroupArn;
      public readonly computeNodeGroupId = computeNodeGroupId!;
      public readonly computeNodeGroupName = computeNodeGroupId!;
      public readonly cluster = cluster;
    }

    return new Import(scope, id);
  }

  /**
   * Import an existing compute node group by its ID
   */
  public static fromComputeNodeGroupId(scope: constructs.Construct, id: string, computeNodeGroupId: string, cluster: ICluster): IComputeNodeGroup {
    const stack = cdk.Stack.of(scope);
    const computeNodeGroupArn = cdk.Arn.format({
      service: 'pcs',
      resource: 'compute-node-group',
      resourceName: computeNodeGroupId,
    }, stack);

    return ComputeNodeGroup.fromComputeNodeGroupArn(scope, id, computeNodeGroupArn, cluster);
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

    // Create instance profile if not provided
    if (props.instanceProfile) {
      this.instanceProfile = props.instanceProfile;
    } else {
      // Create a role for the compute instances
      const role = new iam.Role(this, 'InstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        description: 'IAM role for PCS compute node group instances',
      });

      // Add necessary permissions for PCS compute nodes
      role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

      // Add permission to register with PCS
      role.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'pcs:RegisterComputeNodeGroupInstance',
        ],
        resources: ['*'],
      }));

      this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
        role,
      });
    }

    // Select subnets
    const subnets = this.cluster.vpc.selectSubnets(props.subnets || {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });

    // Configure instance configurations
    const instanceConfigs = props.instanceConfigurations || [
      { instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE) },
    ];

    // Configure scaling
    const scalingConfig = props.scalingConfiguration || {
      minInstanceCount: 0,
      maxInstanceCount: 10,
    };

    // Configure Slurm settings
    let slurmConfiguration;
    if (props.slurmConfiguration) {
      slurmConfiguration = SlurmConfiguration.forComputeNodeGroup(props.slurmConfiguration);
    }

    // Configure spot options if needed
    let spotOptions;
    if (props.purchaseOption === PurchaseOption.SPOT) {
      spotOptions = {
        allocationStrategy: props.spotConfiguration?.allocationStrategy || SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED,
      };
    }

    // Create the compute node group
    this.cfnComputeNodeGroup = new CfnComputeNodeGroup(this, 'Resource', {
      name: props.computeNodeGroupName,
      clusterId: this.cluster.clusterId,
      amiId: props.amiId,
      customLaunchTemplate: {
        templateId: props.launchTemplate.launchTemplate.launchTemplateId,
        version: props.launchTemplate.version || '$Latest',
      },
      iamInstanceProfileArn: this.instanceProfile.instanceProfileArn,
      instanceConfigs: instanceConfigs.map(config => ({
        instanceType: config.instanceType?.toString(),
      })),
      purchaseOption: props.purchaseOption || PurchaseOption.ON_DEMAND,
      spotOptions,
      scalingConfiguration: {
        minInstanceCount: scalingConfig.minInstanceCount || 0,
        maxInstanceCount: scalingConfig.maxInstanceCount || 10,
      },
      slurmConfiguration,
      subnetIds: subnets.subnetIds,
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

  /**
   * Creates a basic launch template for HPC workloads
   */
  public static createBasicLaunchTemplate(scope: constructs.Construct, id: string, props: BasicLaunchTemplateProps): ec2.LaunchTemplate {
    // Create security group if not provided
    let securityGroups = props.securityGroups;
    if (!securityGroups || securityGroups.length === 0) {
      const sg = new ec2.SecurityGroup(scope, `${id}SecurityGroup`, {
        vpc: props.vpc,
        description: 'Security group for PCS compute instances',
        allowAllOutbound: true,
      });

      // Allow SSH access within VPC
      sg.addIngressRule(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(22),
        'SSH access'
      );

      securityGroups = [sg];
    }

    // Create basic user data for HPC nodes
    const userData = props.userData || ec2.UserData.forLinux();
    userData.addCommands(
      '# Basic setup for HPC compute node',
      'yum update -y',
      'yum install -y htop iotop'
    );

    return new ec2.LaunchTemplate(scope, id, {
      instanceType: props.instanceType || ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: securityGroups[0],
      keyName: props.keyName,
      userData,
    });
  }
}
