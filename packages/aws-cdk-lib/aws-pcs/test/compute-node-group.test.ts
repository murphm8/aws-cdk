import { Template, Match } from '../../assertions';
import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';
import * as pcs from '../lib';

describe('PCS ComputeNodeGroup', () => {
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;
  let cluster: pcs.Cluster;
  let launchTemplate: ec2.LaunchTemplate;
  let instanceProfile: iam.InstanceProfile;

  beforeEach(() => {
    stack = new cdk.Stack(undefined, 'TestStack', {
      env: { account: '123456789012', region: 'us-west-2' },
    });
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', {
      vpc,
      description: 'Test security group',
    });
    cluster = new pcs.Cluster(stack, 'TestCluster', {
      subnetIds: [vpc.privateSubnets[0].subnetId],
      securityGroups: [securityGroup],
      size: pcs.ClusterSize.SMALL,
      scheduler: {
        type: pcs.SchedulerType.SLURM,
        version: '23.11.7',
      },
    });
    launchTemplate = new ec2.LaunchTemplate(stack, 'TestLT', {});
    const role = new iam.Role(stack, 'TestRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    instanceProfile = new iam.InstanceProfile(stack, 'TestInstanceProfile', {
      role,
    });
  });

  function createDefaultProps(overrides?: Partial<pcs.ComputeNodeGroupProps>): pcs.ComputeNodeGroupProps {
    return {
      cluster,
      subnetIds: [vpc.privateSubnets[0].subnetId],
      launchTemplate: { launchTemplate },
      instanceProfile,
      instanceConfigurations: [
        { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
      ],
      scalingConfiguration: {
        minInstanceCount: 0,
        maxInstanceCount: 10,
      },
      ...overrides,
    };
  }

  describe('basic compute node group creation', () => {
    test('creates compute node group with required properties', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps());

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        ClusterId: { 'Fn::GetAtt': [Match.stringLikeRegexp('TestCluster.*'), 'Id'] },
        ScalingConfiguration: {
          MinInstanceCount: 0,
          MaxInstanceCount: 10,
        },
        PurchaseOption: 'ONDEMAND',
      });
    });

    test('creates compute node group with custom name', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        computeNodeGroupName: 'my-compute-group',
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        Name: 'my-compute-group',
      });
    });

    test('creates compute node group with SPOT purchase option', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.SPOT,
        spotOptions: {
          allocationStrategy: pcs.SpotAllocationStrategy.CAPACITY_OPTIMIZED,
        },
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'SPOT',
        SpotOptions: {
          AllocationStrategy: 'capacity-optimized',
        },
      });
    });

    test('creates compute node group with tags', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        tags: { Environment: 'Test', Team: 'HPC' },
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        Tags: {
          Environment: 'Test',
          Team: 'HPC',
        },
      });
    });

    test('creates compute node group with multiple instance configurations', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        instanceConfigurations: [
          { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE) },
          { instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE2) },
        ],
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        InstanceConfigs: [
          { InstanceType: 'c5.xlarge' },
          { InstanceType: 'c5.2xlarge' },
        ],
      });
    });
  });

  describe('scaling configuration validation', () => {
    test('accepts minInstanceCount = 0', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 0, maxInstanceCount: 10 },
        }));
      }).not.toThrow();
    });

    test('accepts maxInstanceCount = 0', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 0, maxInstanceCount: 0 },
        }));
      }).not.toThrow();
    });

    test('accepts minInstanceCount equal to maxInstanceCount', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 5, maxInstanceCount: 5 },
        }));
      }).not.toThrow();
    });

    test('accepts minInstanceCount less than maxInstanceCount', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 1, maxInstanceCount: 100 },
        }));
      }).not.toThrow();
    });

    test.each([
      [0, 0],
      [0, 10],
      [5, 5],
      [1, 100],
      [10, 10],
      [0, 1],
    ])('accepts valid scaling config min=%d max=%d', (min, max) => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, `TestCNG-${min}-${max}`, createDefaultProps({
          scalingConfiguration: { minInstanceCount: min, maxInstanceCount: max },
        }));
      }).not.toThrow();
    });

    test('throws when minInstanceCount is negative', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: -1, maxInstanceCount: 10 },
        }));
      }).toThrow(/minInstanceCount must be >= 0/);
    });

    test('throws when maxInstanceCount is negative', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 0, maxInstanceCount: -1 },
        }));
      }).toThrow(/maxInstanceCount must be >= 0/);
    });

    test('throws when minInstanceCount is greater than maxInstanceCount', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 11, maxInstanceCount: 10 },
        }));
      }).toThrow(/minInstanceCount cannot be greater than maxInstanceCount/);
    });

    test('skips validation when minInstanceCount is a token', () => {
      const tokenMin = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 5 }));
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: tokenMin, maxInstanceCount: 10 },
        }));
      }).not.toThrow();
    });

    test('skips validation when maxInstanceCount is a token', () => {
      const tokenMax = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 100 }));
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: 5, maxInstanceCount: tokenMax },
        }));
      }).not.toThrow();
    });

    test('skips min>max validation when both are tokens', () => {
      const tokenMin = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 100 }));
      const tokenMax = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 1 }));
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: tokenMin, maxInstanceCount: tokenMax },
        }));
      }).not.toThrow();
    });

    test('skips negative validation when value is a token', () => {
      const tokenMin = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => -5 }));
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          scalingConfiguration: { minInstanceCount: tokenMin, maxInstanceCount: 10 },
        }));
      }).not.toThrow();
    });
  });

  describe('other validations', () => {
    test('throws when instanceConfigurations is empty', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          instanceConfigurations: [],
        }));
      }).toThrow(/instanceConfigurations is required and must contain at least one configuration/);
    });

    test('throws when subnetIds is empty', () => {
      expect(() => {
        new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
          subnetIds: [],
        }));
      }).toThrow(/At least one subnet ID must be provided/);
    });
  });

  describe('import methods', () => {
    test('fromComputeNodeGroupArn parses cluster from ARN', () => {
      const cngArn = 'arn:aws:pcs:us-west-2:123456789012:computenodegroup/cls-12345/cng-67890';

      const imported = pcs.ComputeNodeGroup.fromComputeNodeGroupArn(stack, 'ImportedCNG', cngArn);

      expect(imported.computeNodeGroupArn).toEqual(cngArn);
      expect(imported.computeNodeGroupId).toEqual('cng-67890');
      expect(imported.computeNodeGroupName).toEqual('cng-67890');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
      expect(imported.cluster.clusterArn).toEqual('arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');
      expect(imported.cluster.clusterName).toEqual('cls-12345');
    });

    test('fromComputeNodeGroupArn throws for invalid ARN with no resource name', () => {
      expect(() => {
        pcs.ComputeNodeGroup.fromComputeNodeGroupArn(stack, 'ImportedCNG', 'arn:aws:pcs:us-west-2:123456789012:computenodegroup');
      }).toThrow(/Invalid compute node group ARN/);
    });

    test('fromComputeNodeGroupArn throws for ARN missing cluster ID', () => {
      expect(() => {
        pcs.ComputeNodeGroup.fromComputeNodeGroupArn(stack, 'ImportedCNG', 'arn:aws:pcs:us-west-2:123456789012:computenodegroup/cng-only');
      }).toThrow(/Invalid compute node group ARN/);
    });

    test('fromComputeNodeGroupAttributes returns correct attributes', () => {
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster', 'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');

      const imported = pcs.ComputeNodeGroup.fromComputeNodeGroupAttributes(stack, 'ImportedCNG', {
        computeNodeGroupArn: 'arn:aws:pcs:us-west-2:123456789012:computenodegroup/cls-12345/cng-67890',
        computeNodeGroupId: 'cng-67890',
        computeNodeGroupName: 'my-compute-group',
        cluster: importedCluster,
      });

      expect(imported.computeNodeGroupId).toEqual('cng-67890');
      expect(imported.computeNodeGroupName).toEqual('my-compute-group');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
    });

    test('fromComputeNodeGroupId creates correct ARN with cluster', () => {
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster', 'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');

      const imported = pcs.ComputeNodeGroup.fromComputeNodeGroupId(stack, 'ImportedCNG', importedCluster, 'cng-67890');

      expect(imported.computeNodeGroupId).toEqual('cng-67890');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
      expect(imported.cluster.clusterArn).toEqual('arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');
      // When account/region are concrete, Arn.format inlines them rather than using Ref tokens
      const resolved = stack.resolve(imported.computeNodeGroupArn);
      expect(resolved).toEqual({
        'Fn::Join': ['', [
          'arn:',
          { Ref: 'AWS::Partition' },
          ':pcs:us-west-2:123456789012:computenodegroup/cls-12345/cng-67890',
        ]],
      });
    });
  });

  describe('purchase options', () => {
    test('creates compute node group with CAPACITY_BLOCK purchase option', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.CAPACITY_BLOCK,
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'CAPACITY_BLOCK',
      });
    });

    test('ON_DEMAND purchase option maps to ONDEMAND in CFN', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.ON_DEMAND,
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'ONDEMAND',
      });
    });

    test('applies default SpotOptions when SPOT purchase option without explicit spotOptions', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.SPOT,
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'SPOT',
        SpotOptions: {
          AllocationStrategy: 'price-capacity-optimized',
        },
      });
    });

    test('does not apply SpotOptions for ON_DEMAND purchase option', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.ON_DEMAND,
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'ONDEMAND',
        SpotOptions: Match.absent(),
      });
    });

    test('uses explicit SpotOptions when provided with SPOT', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        purchaseOption: pcs.PurchaseOption.SPOT,
        spotOptions: {
          allocationStrategy: pcs.SpotAllocationStrategy.LOWEST_PRICE,
        },
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        PurchaseOption: 'SPOT',
        SpotOptions: {
          AllocationStrategy: 'lowest-price',
        },
      });
    });
  });

  describe('slurm configuration', () => {
    test('creates compute node group with Slurm custom settings', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        slurmConfiguration: {
          customSettings: [
            { parameterName: 'Weight', parameterValue: '10' },
            { parameterName: 'Feature', parameterValue: 'gpu' },
          ],
        },
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        SlurmConfiguration: {
          SlurmCustomSettings: [
            { ParameterName: 'Weight', ParameterValue: '10' },
            { ParameterName: 'Feature', ParameterValue: 'gpu' },
          ],
        },
      });
    });
  });

  describe('launch template', () => {
    test('creates compute node group with explicit launch template version', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps({
        launchTemplate: { launchTemplate, version: '3' },
      }));

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        CustomLaunchTemplate: {
          Version: '3',
        },
      });
    });

    test('defaults to $Latest launch template version', () => {
      new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps());

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::ComputeNodeGroup', {
        CustomLaunchTemplate: {
          Version: '$Latest',
        },
      });
    });
  });

  describe('tags', () => {
    test('addTags adds tags to compute node group', () => {
      const cng = new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps());

      expect(() => {
        cng.addTags({ Environment: 'Production', Team: 'HPC' });
      }).not.toThrow();
    });
  });

  describe('attributes', () => {
    test('exposes status and errorInfo', () => {
      const cng = new pcs.ComputeNodeGroup(stack, 'TestCNG', createDefaultProps());

      expect(cng.status).toBeDefined();
      expect(cng.errorInfo).toBeDefined();
    });
  });
});
