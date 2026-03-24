import { ICluster } from './cluster-base';
import * as cdk from '../../core';

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
 * Abstract base class for PCS Queue.
 *
 * Provides shared implementation for both owned and imported queues.
 */
export abstract class QueueBase extends cdk.Resource implements IQueue {
  /**
   * The ARN of the queue
   */
  public abstract readonly queueArn: string;

  /**
   * The ID of the queue
   */
  public abstract readonly queueId: string;

  /**
   * The name of the queue
   */
  public abstract readonly queueName: string;

  /**
   * The cluster this queue belongs to
   */
  public abstract readonly cluster: ICluster;
}
