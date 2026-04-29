import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';

/**
 * Represents a PCS Cluster
 */
export interface ICluster extends cdk.IResource, ec2.IConnectable {
  /**
   * The ARN of the cluster
   * @attribute
   */
  readonly clusterArn: string;

  /**
   * The ID of the cluster
   * @attribute
   */
  readonly clusterId: string;

  /**
   * The name of the cluster
   * @attribute
   */
  readonly clusterName: string;

  /**
   * Grant full access to this cluster (pcs:*).
   */
  grantFullAccess(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant read-only access to this cluster.
   */
  grantReadOnly(grantee: iam.IGrantable): iam.Grant;
}

/**
 * Abstract base class for PCS Cluster.
 *
 * Provides shared implementation of grant methods for both owned and imported clusters.
 */
export abstract class ClusterBase extends cdk.Resource implements ICluster {
  /**
   * The ARN of the cluster
   */
  public abstract readonly clusterArn: string;

  /**
   * The ID of the cluster
   */
  public abstract readonly clusterId: string;

  /**
   * The name of the cluster
   */
  public abstract readonly clusterName: string;

  /**
   * The network connections associated with this cluster.
   */
  public abstract readonly connections: ec2.Connections;

  /**
   * Grant full access to this cluster (pcs:*).
   */
  public grantFullAccess(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ['pcs:*'],
      resourceArns: [this.clusterArn],
    });
  }

  /**
   * Grant read-only access to this cluster.
   */
  public grantReadOnly(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: [
        'pcs:GetCluster',
        'pcs:GetComputeNodeGroup',
        'pcs:GetQueue',
        'pcs:ListClusters',
        'pcs:ListComputeNodeGroups',
        'pcs:ListQueues',
        'pcs:ListTagsForResource',
      ],
      resourceArns: [this.clusterArn],
    });
  }
}
