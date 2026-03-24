import { ICluster } from './cluster-base';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';

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

  /**
   * Grant permission to register a compute node instance with this group.
   */
  grantRegisterInstance(grantee: iam.IGrantable): iam.Grant;
}

/**
 * Abstract base class for PCS ComputeNodeGroup.
 *
 * Provides shared implementation of grant methods for both owned and imported compute node groups.
 */
export abstract class ComputeNodeGroupBase extends cdk.Resource implements IComputeNodeGroup {
  /**
   * The ARN of the compute node group
   */
  public abstract readonly computeNodeGroupArn: string;

  /**
   * The ID of the compute node group
   */
  public abstract readonly computeNodeGroupId: string;

  /**
   * The name of the compute node group
   */
  public abstract readonly computeNodeGroupName: string;

  /**
   * The cluster this compute node group belongs to
   */
  public abstract readonly cluster: ICluster;

  /**
   * Grant permission to register a compute node instance with this group.
   */
  public grantRegisterInstance(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ['pcs:RegisterComputeNodeGroupInstance'],
      resourceArns: [this.computeNodeGroupArn],
    });
  }
}
