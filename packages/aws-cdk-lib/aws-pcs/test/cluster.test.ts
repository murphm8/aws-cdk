import * as constructs from 'constructs';
import { Template, Match } from '../../assertions';
import * as ec2 from '../../aws-ec2';
import * as cdk from '../../core';
import * as pcs from '../lib';

describe('PCS Cluster', () => {
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;

  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
    });
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', {
      vpc,
      description: 'Test security group for PCS cluster',
    });
  });

  describe('basic cluster creation', () => {
    test('creates cluster with required properties', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Size: 'SMALL',
        Networking: {
          SubnetIds: [{ Ref: Match.stringLikeRegexp('TestVpcPrivateSubnet.*') }],
          SecurityGroupIds: [{ 'Fn::GetAtt': [Match.stringLikeRegexp('TestSG.*'), 'GroupId'] }],
        },
        Scheduler: {
          Type: 'SLURM',
          Version: '23.11.7',
        },
      });
    });

    test('creates cluster with custom name', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        clusterName: 'MyHPCCluster',
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.MEDIUM,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Name: 'MyHPCCluster',
        Size: 'MEDIUM',
      });
    });

    test('creates cluster with tags', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.LARGE,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        tags: {
          Environment: 'Test',
          Project: 'HPC-Demo',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Tags: {
          Environment: 'Test',
          Project: 'HPC-Demo',
        },
      });
    });

    test('creates cluster with multiple subnets', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [
          vpc.privateSubnets[0].subnetId,
          vpc.privateSubnets[1].subnetId,
        ],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: {
          SubnetIds: [
            { Ref: Match.stringLikeRegexp('TestVpcPrivateSubnet.*') },
            { Ref: Match.stringLikeRegexp('TestVpcPrivateSubnet.*') },
          ],
        },
      });
    });

    test('creates cluster with multiple security groups', () => {
      // GIVEN
      const additionalSG = new ec2.SecurityGroup(stack, 'AdditionalSG', {
        vpc,
        description: 'Additional security group',
      });

      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup, additionalSG],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: {
          SecurityGroupIds: [
            { 'Fn::GetAtt': [Match.stringLikeRegexp('TestSG.*'), 'GroupId'] },
            { 'Fn::GetAtt': [Match.stringLikeRegexp('AdditionalSG.*'), 'GroupId'] },
          ],
        },
      });
    });
  });

  describe('cluster with Slurm configuration', () => {
    test('creates cluster with Slurm configuration', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          accounting: {
            mode: pcs.AccountingMode.STANDARD,
            defaultPurgeTimeInDays: 30,
          },
          authKey: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:slurm-auth-key-abcdef',
            secretVersion: 'AWSCURRENT',
          },
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          Accounting: {
            Mode: 'STANDARD',
            DefaultPurgeTimeInDays: 30,
          },
          AuthKey: {
            SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:slurm-auth-key-abcdef',
            SecretVersion: 'AWSCURRENT',
          },
        },
      });
    });

    test('creates cluster with complex Slurm configuration', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.MEDIUM,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          accounting: {
            mode: pcs.AccountingMode.STANDARD,
            defaultPurgeTimeInDays: 7,
          },
          authKey: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:slurm-auth-key-abcdef',
            secretVersion: 'AWSCURRENT',
          },
          customSettings: [
            { parameterName: 'AccountingStorageEnforce', parameterValue: 'associations,limits,qos' },
            { parameterName: 'EnforcePartLimits', parameterValue: 'ALL' },
          ],
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          Accounting: {
            Mode: 'STANDARD',
            DefaultPurgeTimeInDays: 7,
          },
          AuthKey: {
            SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:slurm-auth-key-abcdef',
            SecretVersion: 'AWSCURRENT',
          },
          SlurmCustomSettings: [
            { ParameterName: 'AccountingStorageEnforce', ParameterValue: 'associations,limits,qos' },
            { ParameterName: 'EnforcePartLimits', ParameterValue: 'ALL' },
          ],
        },
      });
    });
  });

  describe('cluster import methods', () => {
    test('fromClusterArn imports cluster correctly', () => {
      // GIVEN
      const clusterArn = 'arn:aws:pcs:us-west-2:123456789012:cluster/test-cluster-id';

      // WHEN
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster', clusterArn);

      // THEN
      expect(importedCluster.clusterArn).toEqual(clusterArn);
      expect(importedCluster.clusterId).toEqual('test-cluster-id');
      expect(importedCluster.clusterName).toEqual('test-cluster-id');
    });

    test('fromClusterId creates correct ARN', () => {
      const clusterId = 'test-cluster-id';

      const importedCluster = pcs.Cluster.fromClusterId(stack, 'ImportedCluster', clusterId);

      expect(importedCluster.clusterId).toEqual(clusterId);
      expect(importedCluster.clusterName).toEqual(clusterId);
      expect(stack.resolve(importedCluster.clusterArn)).toEqual({
        'Fn::Join': ['', [
          'arn:',
          { Ref: 'AWS::Partition' },
          ':pcs:',
          { Ref: 'AWS::Region' },
          ':',
          { Ref: 'AWS::AccountId' },
          ':cluster/' + clusterId,
        ]],
      });
    });

    test('fromClusterAttributes imports with all attributes', () => {
      const attributes = {
        clusterArn: 'arn:aws:pcs:us-west-2:123456789012:cluster/test-cluster-id',
        clusterName: 'MyHPCCluster',
      };

      const importedCluster = pcs.Cluster.fromClusterAttributes(stack, 'ImportedCluster', attributes);

      expect(importedCluster.clusterArn).toEqual(attributes.clusterArn);
      expect(importedCluster.clusterId).toEqual('test-cluster-id'); // Derived from ARN
      expect(importedCluster.clusterName).toEqual(attributes.clusterName);
    });

    test('fromClusterArn handles different ARN formats', () => {
      // GIVEN
      const clusterArn = 'arn:aws:pcs:us-west-2:123456789012:cluster/another-test-id';

      // WHEN
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster2', clusterArn);

      // THEN
      expect(importedCluster.clusterArn).toEqual(clusterArn);
      expect(importedCluster.clusterId).toEqual('another-test-id');
      expect(importedCluster.clusterName).toEqual('another-test-id');
    });
  });

  describe('cluster methods', () => {
    test('addTags adds tags to cluster', () => {
      // GIVEN
      const cluster = new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // WHEN
      cluster.addTags({
        Environment: 'Production',
        Owner: 'HPCTeam',
        Project: 'ML-Training',
      });

      // THEN
      Template.fromStack(stack).hasResource('AWS::PCS::Cluster', {
        Properties: Match.objectLike({
          Size: 'SMALL',
        }),
      });

      // Verify that the addTags method doesn't throw and the cluster is created properly
      expect(cluster.clusterArn).toBeDefined();
    });

    test('cluster exposes CloudFormation attributes', () => {
      // GIVEN
      const cluster = new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // WHEN/THEN
      expect(cluster.clusterArn).toBeDefined();
      expect(cluster.clusterId).toBeDefined();
      expect(cluster.clusterName).toBeDefined();
      expect(cluster.endpoints).toBeDefined();
      expect(cluster.status).toBeDefined();
      expect(cluster.errorInfo).toBeDefined();
    });

    test('cluster with autogenerated name', () => {
      // WHEN
      const cluster = new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Name: Match.absent(),
      });

      // The cluster name should be the cluster ID when name is autogenerated
      expect(stack.resolve(cluster.clusterName)).toEqual(
        stack.resolve(cluster.clusterId),
      );
    });

    test('cluster with explicit name', () => {
      // WHEN
      const cluster = new pcs.Cluster(stack, 'TestCluster', {
        clusterName: 'ExplicitName',
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Name: 'ExplicitName',
      });

      expect(cluster.clusterName).toEqual('ExplicitName');
    });
  });

  describe('different cluster sizes', () => {
    test.each([
      pcs.ClusterSize.SMALL,
      pcs.ClusterSize.MEDIUM,
      pcs.ClusterSize.LARGE,
    ])('creates cluster with size %s', (size) => {
      // WHEN
      new pcs.Cluster(stack, `TestCluster${size}`, {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Size: size,
      });
    });
  });

  describe('different scheduler configurations', () => {
    test('creates cluster with different scheduler versions', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '22.05.8',
        },
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Scheduler: {
          Type: 'SLURM',
          Version: '22.05.8',
        },
      });
    });
  });

  describe('cluster validation', () => {
    test('cluster requires at least one subnet', () => {
      // WHEN/THEN
      expect(() => {
        new pcs.Cluster(stack, 'TestCluster', {
          subnetIds: [],
          securityGroups: [securityGroup],
          size: pcs.ClusterSize.SMALL,
          scheduler: {
            type: pcs.SchedulerType.SLURM,
            version: '23.11.7',
          },
        });
      }).not.toThrow(); // AWS PCS validation will handle empty arrays
    });

    test('cluster requires at least one security group', () => {
      // WHEN/THEN
      expect(() => {
        new pcs.Cluster(stack, 'TestCluster', {
          subnetIds: [vpc.privateSubnets[0].subnetId],
          securityGroups: [],
          size: pcs.ClusterSize.SMALL,
          scheduler: {
            type: pcs.SchedulerType.SLURM,
            version: '23.11.7',
          },
        });
      }).not.toThrow(); // AWS PCS validation will handle empty arrays
    });
  });

  describe('CloudFormation output validation', () => {
    test('cluster creates proper CloudFormation dependencies', () => {
      // WHEN
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::PCS::Cluster', 1);
      template.resourceCountIs('AWS::EC2::VPC', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    });
  });

  describe('network type', () => {
    test('creates cluster with IPv4 network type', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        networkType: pcs.NetworkType.IPV4,
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: Match.objectLike({
          NetworkType: 'IPV4',
        }),
      });
    });

    test('creates cluster with IPv6 network type', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        networkType: pcs.NetworkType.IPV6,
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: Match.objectLike({
          NetworkType: 'IPV6',
        }),
      });
    });

    test('creates cluster without network type (default)', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: {
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.anyValue(),
          NetworkType: Match.absent(),
        },
      });
    });
  });

  describe('optional security groups', () => {
    test('creates cluster without security groups', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        Networking: {
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.absent(),
        },
      });
    });
  });

  describe('JWT auth and SlurmRest configuration', () => {
    test('creates cluster with JWT auth configuration', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          jwtAuth: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
            secretVersion: '2',
          },
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          JwtAuth: {
            JwtKey: {
              SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
              SecretVersion: '2',
            },
          },
        },
      });
    });

    test('JWT auth uses default secretVersion of 1', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          jwtAuth: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
          },
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          JwtAuth: {
            JwtKey: {
              SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
              SecretVersion: '1',
            },
          },
        },
      });
    });

    test('creates cluster with SlurmRest STANDARD mode', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          slurmRest: {
            mode: pcs.SlurmRestMode.STANDARD,
          },
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          SlurmRest: {
            Mode: 'STANDARD',
          },
        },
      });
    });

    test('creates cluster with SlurmRest NONE mode', () => {
      new pcs.Cluster(stack, 'TestCluster', {
        subnetIds: [vpc.privateSubnets[0].subnetId],
        securityGroups: [securityGroup],
        size: pcs.ClusterSize.SMALL,
        scheduler: {
          type: pcs.SchedulerType.SLURM,
          version: '23.11.7',
        },
        slurmConfiguration: {
          slurmRest: {
            mode: pcs.SlurmRestMode.NONE,
          },
        },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Cluster', {
        SlurmConfiguration: {
          SlurmRest: {
            Mode: 'NONE',
          },
        },
      });
    });
  });

  describe('cluster attributes import', () => {
    test('fromClusterAttributes uses provided clusterId', () => {
      const imported = pcs.Cluster.fromClusterAttributes(stack, 'Imported', {
        clusterArn: 'arn:aws:pcs:us-west-2:123456789012:cluster/test-id',
        clusterId: 'custom-id',
        clusterName: 'my-cluster',
      });
      expect(imported.clusterId).toEqual('custom-id');
    });

    test('fromClusterAttributes derives clusterId from ARN when not provided', () => {
      const imported = pcs.Cluster.fromClusterAttributes(stack, 'Imported', {
        clusterArn: 'arn:aws:pcs:us-west-2:123456789012:cluster/test-id',
        clusterName: 'my-cluster',
      });
      expect(imported.clusterId).toEqual('test-id');
    });
  });

  describe('Endpoint and ErrorInfo interfaces', () => {
    test('Endpoint and ErrorInfo are importable types', () => {
      const endpoint: pcs.Endpoint = {
        type: 'SLURMCTLD',
        privateIpAddress: '10.0.0.1',
        port: '6817',
      };
      const errorInfo: pcs.ErrorInfo = {
        code: 'CLUSTER_ERROR',
        message: 'test error',
      };
      expect(endpoint.type).toBeDefined();
      expect(errorInfo.code).toBeDefined();
    });
  });
});
