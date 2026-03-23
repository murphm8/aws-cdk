import { Template, Match } from '../../assertions';
import * as ec2 from '../../aws-ec2';
import * as cdk from '../../core';
import * as pcs from '../lib';

describe('PCS Queue', () => {
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;
  let cluster: pcs.Cluster;

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
  });

  describe('basic queue creation', () => {
    test('creates queue with required properties', () => {
      new pcs.Queue(stack, 'TestQueue', {
        cluster,
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Queue', {
        ClusterId: { 'Fn::GetAtt': [Match.stringLikeRegexp('TestCluster.*'), 'Id'] },
      });
    });

    test('creates queue with custom name', () => {
      new pcs.Queue(stack, 'TestQueue', {
        cluster,
        queueName: 'my-job-queue',
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Queue', {
        Name: 'my-job-queue',
      });
    });

    test('creates queue with tags', () => {
      new pcs.Queue(stack, 'TestQueue', {
        cluster,
        tags: { Environment: 'Test' },
      });

      Template.fromStack(stack).hasResourceProperties('AWS::PCS::Queue', {
        Tags: { Environment: 'Test' },
      });
    });
  });

  describe('import methods', () => {
    test('fromQueueArn parses cluster from ARN', () => {
      const queueArn = 'arn:aws:pcs:us-west-2:123456789012:queue/cls-12345/q-67890';

      const imported = pcs.Queue.fromQueueArn(stack, 'ImportedQueue', queueArn);

      expect(imported.queueArn).toEqual(queueArn);
      expect(imported.queueId).toEqual('q-67890');
      expect(imported.queueName).toEqual('q-67890');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
      expect(imported.cluster.clusterArn).toEqual('arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');
      expect(imported.cluster.clusterName).toEqual('cls-12345');
    });

    test('fromQueueArn throws for invalid ARN with no resource name', () => {
      expect(() => {
        pcs.Queue.fromQueueArn(stack, 'ImportedQueue', 'arn:aws:pcs:us-west-2:123456789012:queue');
      }).toThrow(/Invalid queue ARN/);
    });

    test('fromQueueArn throws for ARN missing cluster ID', () => {
      expect(() => {
        pcs.Queue.fromQueueArn(stack, 'ImportedQueue', 'arn:aws:pcs:us-west-2:123456789012:queue/q-only');
      }).toThrow(/Invalid queue ARN/);
    });

    test('fromQueueAttributes returns correct attributes', () => {
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster', 'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');

      const imported = pcs.Queue.fromQueueAttributes(stack, 'ImportedQueue', {
        queueArn: 'arn:aws:pcs:us-west-2:123456789012:queue/cls-12345/q-67890',
        queueId: 'q-67890',
        queueName: 'my-job-queue',
        cluster: importedCluster,
      });

      expect(imported.queueId).toEqual('q-67890');
      expect(imported.queueName).toEqual('my-job-queue');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
    });

    test('fromQueueId creates correct ARN with cluster', () => {
      const importedCluster = pcs.Cluster.fromClusterArn(stack, 'ImportedCluster', 'arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');

      const imported = pcs.Queue.fromQueueId(stack, 'ImportedQueue', importedCluster, 'q-67890');

      expect(imported.queueId).toEqual('q-67890');
      expect(imported.cluster.clusterId).toEqual('cls-12345');
      expect(imported.cluster.clusterArn).toEqual('arn:aws:pcs:us-west-2:123456789012:cluster/cls-12345');
      // When account/region are concrete, Arn.format inlines them rather than using Ref tokens
      const resolved = stack.resolve(imported.queueArn);
      expect(resolved).toEqual({
        'Fn::Join': ['', [
          'arn:',
          { Ref: 'AWS::Partition' },
          ':pcs:us-west-2:123456789012:queue/cls-12345/q-67890',
        ]],
      });
    });
  });
});
