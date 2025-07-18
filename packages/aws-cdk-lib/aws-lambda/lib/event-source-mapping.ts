import { Construct } from 'constructs';
import { IEventSourceDlq } from './dlq';
import { IFunction } from './function-base';
import { CfnEventSourceMapping } from './lambda.generated';
import { ISchemaRegistry } from './schema-registry';
import * as iam from '../../aws-iam';
import { IKey } from '../../aws-kms';
import * as cdk from '../../core';
import { ValidationError } from '../../core/lib/errors';
import { addConstructMetadata } from '../../core/lib/metadata-resource';
import { propertyInjectable } from '../../core/lib/prop-injectable';

/**
 * The type of authentication protocol or the VPC components for your event source's SourceAccessConfiguration
 * @see https://docs.aws.amazon.com/lambda/latest/dg/API_SourceAccessConfiguration.html#SSS-Type-SourceAccessConfiguration-Type
 */
export class SourceAccessConfigurationType {
  /**
   * (MQ) The Secrets Manager secret that stores your broker credentials.
   */
  public static readonly BASIC_AUTH = new SourceAccessConfigurationType('BASIC_AUTH');

  /**
   * The subnets associated with your VPC. Lambda connects to these subnets to fetch data from your Self-Managed Apache Kafka cluster.
   */
  public static readonly VPC_SUBNET = new SourceAccessConfigurationType('VPC_SUBNET');

  /**
   * The VPC security group used to manage access to your Self-Managed Apache Kafka brokers.
   */
  public static readonly VPC_SECURITY_GROUP = new SourceAccessConfigurationType('VPC_SECURITY_GROUP');

  /**
   * The Secrets Manager ARN of your secret key used for SASL SCRAM-256 authentication of your Self-Managed Apache Kafka brokers.
   */
  public static readonly SASL_SCRAM_256_AUTH = new SourceAccessConfigurationType('SASL_SCRAM_256_AUTH');

  /**
   * The Secrets Manager ARN of your secret key used for SASL SCRAM-512 authentication of your Self-Managed Apache Kafka brokers.
   */
  public static readonly SASL_SCRAM_512_AUTH = new SourceAccessConfigurationType('SASL_SCRAM_512_AUTH');

  /**
   * The Secrets Manager ARN of your secret key containing the certificate chain (X.509 PEM), private key (PKCS#8 PEM),
   * and private key password (optional) used for mutual TLS authentication of your MSK/Apache Kafka brokers.
   */
  public static readonly CLIENT_CERTIFICATE_TLS_AUTH = new SourceAccessConfigurationType('CLIENT_CERTIFICATE_TLS_AUTH');

  /**
   * The Secrets Manager ARN of your secret key containing the root CA certificate (X.509 PEM) used for TLS encryption of your Apache Kafka brokers.
   */
  public static readonly SERVER_ROOT_CA_CERTIFICATE = new SourceAccessConfigurationType('SERVER_ROOT_CA_CERTIFICATE');

  /**
   * The name of the virtual host in your RabbitMQ broker. Lambda uses this RabbitMQ host as the event source.
   */
  public static readonly VIRTUAL_HOST = new SourceAccessConfigurationType('VIRTUAL_HOST');

  /** A custom source access configuration property */
  public static of(name: string): SourceAccessConfigurationType {
    return new SourceAccessConfigurationType(name);
  }

  /**
   * The key to use in `SourceAccessConfigurationProperty.Type` property in CloudFormation
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-sourceaccessconfiguration.html#cfn-lambda-eventsourcemapping-sourceaccessconfiguration-type
   */
  public readonly type: string;

  private constructor(type: string) {
    this.type = type;
  }
}

/**
 * Specific settings like the authentication protocol or the VPC components to secure access to your event source.
 */
export interface SourceAccessConfiguration {
  /**
   * The type of authentication protocol or the VPC components for your event source. For example: "SASL_SCRAM_512_AUTH".
   */
  readonly type: SourceAccessConfigurationType;
  /**
   * The value for your chosen configuration in type.
   * For example: "URI": "arn:aws:secretsmanager:us-east-1:01234567890:secret:MyBrokerSecretName".
   * The exact string depends on the type.
   * @see SourceAccessConfigurationType
   */
  readonly uri: string;
}

/**
 * (Amazon MSK and self-managed Apache Kafka only) The provisioned mode configuration for the event source.
 */
export interface ProvisionedPollerConfig {
  /**
   * The minimum number of pollers that should be provisioned.
   *
   * @default - 1
   */
  readonly minimumPollers?: number;
  /**
   * The maximum number of pollers that can be provisioned.
   *
   * @default - 200
   */
  readonly maximumPollers?: number;
}

export interface EventSourceMappingOptions {
  /**
   * The Amazon Resource Name (ARN) of the event source. Any record added to
   * this stream can invoke the Lambda function.
   *
   * @default - not set if using a self managed Kafka cluster, throws an error otherwise
   */
  readonly eventSourceArn?: string;

  /**
   * The largest number of records that AWS Lambda will retrieve from your event
   * source at the time of invoking your function. Your function receives an
   * event with all the retrieved records.
   *
   * Valid Range: Minimum value of 1. Maximum value of 10000.
   *
   * @default - Amazon Kinesis, Amazon DynamoDB, and Amazon MSK is 100 records.
   * The default for Amazon SQS is 10 messages. For standard SQS queues, the maximum is 10,000. For FIFO SQS queues, the maximum is 10.
   */
  readonly batchSize?: number;

  /**
   * If the function returns an error, split the batch in two and retry.
   *
   * @default false
   */
  readonly bisectBatchOnError?: boolean;

  /**
   * An Amazon S3, Amazon SQS queue or Amazon SNS topic destination for discarded records.
   *
   * @default discarded records are ignored
   */
  readonly onFailure?: IEventSourceDlq;

  /**
   * Set to false to disable the event source upon creation.
   *
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * The position in the DynamoDB, Kinesis or MSK stream where AWS Lambda should
   * start reading.
   *
   * @see https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html#Kinesis-GetShardIterator-request-ShardIteratorType
   *
   * @default - no starting position
   */
  readonly startingPosition?: StartingPosition;

  /**
   * The time from which to start reading, in Unix time seconds.
   *
   * @default - no timestamp
   */
  readonly startingPositionTimestamp?: number;

  /**
   * Allow functions to return partially successful responses for a batch of records.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-ddb-batchfailurereporting
   *
   * @default false
   */
  readonly reportBatchItemFailures?: boolean;

  /**
   * The maximum amount of time to gather records before invoking the function.
   * Maximum of Duration.minutes(5)
   *
   * @default Duration.seconds(0)
   */
  readonly maxBatchingWindow?: cdk.Duration;

  /**
   * The maximum concurrency setting limits the number of concurrent instances of the function that an Amazon SQS event source can invoke.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-max-concurrency
   *
   * Valid Range: Minimum value of 2. Maximum value of 1000.
   *
   * @default - No specific limit.
   */
  readonly maxConcurrency?: number;

  /**
   * The maximum age of a record that Lambda sends to a function for processing.
   * Valid Range:
   * * Minimum value of 60 seconds
   * * Maximum value of 7 days
   *
   * @default - infinite or until the record expires.
   */
  readonly maxRecordAge?: cdk.Duration;

  /**
   * The maximum number of times to retry when the function returns an error.
   * Set to `undefined` if you want lambda to keep retrying infinitely or until
   * the record expires.
   *
   * Valid Range:
   * * Minimum value of 0
   * * Maximum value of 10000
   *
   * @default - infinite or until the record expires.
   */
  readonly retryAttempts?: number;

  /**
   * The number of batches to process from each shard concurrently.
   * Valid Range:
   * * Minimum value of 1
   * * Maximum value of 10
   *
   * @default 1
   */
  readonly parallelizationFactor?: number;

  /**
   * The name of the Kafka topic.
   *
   * @default - no topic
   */
  readonly kafkaTopic?: string;

  /**
   * The size of the tumbling windows to group records sent to DynamoDB or Kinesis
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-ddb-windows
   *
   * Valid Range: 0 - 15 minutes
   *
   * @default - None
   */
  readonly tumblingWindow?: cdk.Duration;

  /**
   * A list of host and port pairs that are the addresses of the Kafka brokers in a self managed "bootstrap" Kafka cluster
   * that a Kafka client connects to initially to bootstrap itself.
   * They are in the format `abc.example.com:9096`.
   *
   * @default - none
   */
  readonly kafkaBootstrapServers?: string[];

  /**
   * The identifier for the Kafka consumer group to join. The consumer group ID must be unique among all your Kafka event sources. After creating a Kafka event source mapping with the consumer group ID specified, you cannot update this value. The value must have a length between 1 and 200 and full the pattern '[a-zA-Z0-9-\/*:_+=.@-]*'. For more information, see [Customizable consumer group ID](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html#services-msk-consumer-group-id).
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-amazonmanagedkafkaeventsourceconfig.html
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-selfmanagedkafkaeventsourceconfig.html
   *
   * @default - none
   */
  readonly kafkaConsumerGroupId?: string;

  /**
   * Specific settings like the authentication protocol or the VPC components to secure access to your event source.
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-sourceaccessconfiguration.html
   *
   * @default - none
   */
  readonly sourceAccessConfigurations?: SourceAccessConfiguration[];

  /**
   * Add filter criteria to Event Source
   * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
   *
   * @default - none
   */
  readonly filters?: Array<{[key: string]: any}>;

  /**
   * Add Customer managed KMS key to encrypt Filter Criteria.
   * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
   * By default, Lambda will encrypt Filter Criteria using AWS managed keys
   * @see https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk
   *
   * @default - none
   */
  readonly filterEncryption?: IKey;

  /**
   * Check if support S3 onfailure destination(OFD). Kinesis, DynamoDB, MSK and self managed kafka event support S3 OFD
   * @default false
   */
  readonly supportS3OnFailureDestination?: boolean;

  /**
   * Configuration for provisioned pollers that read from the event source.
   * When specified, allows control over the minimum and maximum number of pollers
   * that can be provisioned to process events from the source.
   * @default - no provisioned pollers
   */
  readonly provisionedPollerConfig?: ProvisionedPollerConfig;

  /**
   * Configuration for enhanced monitoring metrics collection
   * When specified, enables collection of additional metrics for the stream event source
   *
   * @default - Enhanced monitoring is disabled
   */
  readonly metricsConfig?: MetricsConfig;

  /**
   * Specific configuration settings for a Kafka schema registry.
   *
   * @default - none
   */
  readonly schemaRegistryConfig?: ISchemaRegistry;
}

export enum MetricType {
  /**
   * Event Count metrics provide insights into the processing behavior of your event source mapping,
   * including the number of events successfully processed, filtered out, or dropped.
   * These metrics help you monitor the flow and status of events through your event source mapping.
   */
  EVENT_COUNT = 'EventCount',
}

/**
 * Configuration for collecting metrics from the event source
 */
export interface MetricsConfig {
  /**
   * List of metric types to enable for this event source
   */
  readonly metrics: MetricType[];
}

/**
 * Properties for declaring a new event source mapping.
 */
export interface EventSourceMappingProps extends EventSourceMappingOptions {
  /**
   * The target AWS Lambda function.
   */
  readonly target: IFunction;
}

/**
 * Represents an event source mapping for a lambda function.
 * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
 */
export interface IEventSourceMapping extends cdk.IResource {
  /**
   * The identifier for this EventSourceMapping
   * @attribute
   */
  readonly eventSourceMappingId: string;

  /**
   * The ARN of the event source mapping (i.e. arn:aws:lambda:region:account-id:event-source-mapping/event-source-mapping-id)
   */
  readonly eventSourceMappingArn: string;
}

/**
 * Defines a Lambda EventSourceMapping resource.
 *
 * Usually, you won't need to define the mapping yourself. This will usually be done by
 * event sources. For example, to add an SQS event source to a function:
 *
 * ```ts
 * import * as sqs from 'aws-cdk-lib/aws-sqs';
 * import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
 *
 * declare const handler: lambda.Function;
 * declare const queue: sqs.Queue;
 *
 * handler.addEventSource(new eventsources.SqsEventSource(queue));
 * ```
 *
 * The `SqsEventSource` class will automatically create the mapping, and will also
 * modify the Lambda's execution role so it can consume messages from the queue.
 */
@propertyInjectable
export class EventSourceMapping extends cdk.Resource implements IEventSourceMapping {
  /**
   * Uniquely identifies this class.
   */
  public static readonly PROPERTY_INJECTION_ID: string = 'aws-cdk-lib.aws-lambda.EventSourceMapping';

  /**
   * Import an event source into this stack from its event source id.
   */
  public static fromEventSourceMappingId(scope: Construct, id: string, eventSourceMappingId: string): IEventSourceMapping {
    const eventSourceMappingArn = EventSourceMapping.formatArn(scope,
      eventSourceMappingId,
    );
    class Import extends cdk.Resource implements IEventSourceMapping {
      public readonly eventSourceMappingId = eventSourceMappingId;
      public readonly eventSourceMappingArn = eventSourceMappingArn;
    }
    return new Import(scope, id);
  }

  private static formatArn(scope: Construct, eventSourceMappingId: string): string {
    return cdk.Stack.of(scope).formatArn({
      service: 'lambda',
      resource: 'event-source-mapping',
      resourceName: eventSourceMappingId,
      arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
    });
  }

  public readonly eventSourceMappingId: string;
  public readonly eventSourceMappingArn: string;

  constructor(scope: Construct, id: string, props: EventSourceMappingProps) {
    super(scope, id);
    // Enhanced CDK Analytics Telemetry
    addConstructMetadata(this, props);

    if (props.eventSourceArn == undefined && props.kafkaBootstrapServers == undefined) {
      throw new ValidationError('Either eventSourceArn or kafkaBootstrapServers must be set', this);
    }

    if (props.eventSourceArn !== undefined && props.kafkaBootstrapServers !== undefined) {
      throw new ValidationError('eventSourceArn and kafkaBootstrapServers are mutually exclusive', this);
    }

    if (props.provisionedPollerConfig) {
      const { minimumPollers, maximumPollers } = props.provisionedPollerConfig;
      if (minimumPollers != undefined) {
        if (minimumPollers < 1 || minimumPollers > 200) {
          throw new ValidationError('Minimum provisioned pollers must be between 1 and 200 inclusive', this);
        }
      }
      if (maximumPollers != undefined) {
        if (maximumPollers < 1 || maximumPollers > 2000) {
          throw new ValidationError('Maximum provisioned pollers must be between 1 and 2000 inclusive', this);
        }
      }
      if (minimumPollers != undefined && maximumPollers != undefined) {
        if (minimumPollers > maximumPollers) {
          throw new ValidationError('Minimum provisioned pollers must be less than or equal to maximum provisioned pollers', this);
        }
      }
    }

    if (props.kafkaBootstrapServers && (props.kafkaBootstrapServers?.length < 1)) {
      throw new ValidationError('kafkaBootStrapServers must not be empty if set', this);
    }

    if (props.maxBatchingWindow && props.maxBatchingWindow.toSeconds() > 300) {
      throw new ValidationError(`maxBatchingWindow cannot be over 300 seconds, got ${props.maxBatchingWindow.toSeconds()}`, this);
    }

    if (props.maxConcurrency && !cdk.Token.isUnresolved(props.maxConcurrency) && (props.maxConcurrency < 2 || props.maxConcurrency > 1000)) {
      throw new ValidationError('maxConcurrency must be between 2 and 1000 concurrent instances', this);
    }

    if (props.maxRecordAge && (props.maxRecordAge.toSeconds() < 60 || props.maxRecordAge.toDays({ integral: false }) > 7)) {
      throw new ValidationError('maxRecordAge must be between 60 seconds and 7 days inclusive', this);
    }

    props.retryAttempts !== undefined && cdk.withResolved(props.retryAttempts, (attempts) => {
      // Allow -1 for infinite retries, otherwise validate the 0-10000 range
      if (!(attempts === -1 || (attempts >= 0 && attempts <= 10000))) {
        throw new ValidationError(`retryAttempts must be -1 (for infinite) or between 0 and 10000 inclusive, got ${attempts}`, this);
      }
    });

    props.parallelizationFactor !== undefined && cdk.withResolved(props.parallelizationFactor, (factor) => {
      if (factor < 1 || factor > 10) {
        throw new ValidationError(`parallelizationFactor must be between 1 and 10 inclusive, got ${factor}`, this);
      }
    });

    if (props.tumblingWindow && !cdk.Token.isUnresolved(props.tumblingWindow) && props.tumblingWindow.toSeconds() > 900) {
      throw new ValidationError(`tumblingWindow cannot be over 900 seconds, got ${props.tumblingWindow.toSeconds()}`, this);
    }

    if (props.startingPosition === StartingPosition.AT_TIMESTAMP && !props.startingPositionTimestamp) {
      throw new ValidationError('startingPositionTimestamp must be provided when startingPosition is AT_TIMESTAMP', this);
    }

    if (props.startingPosition !== StartingPosition.AT_TIMESTAMP && props.startingPositionTimestamp) {
      throw new ValidationError('startingPositionTimestamp can only be used when startingPosition is AT_TIMESTAMP', this);
    }

    if (props.kafkaConsumerGroupId) {
      this.validateKafkaConsumerGroupIdOrThrow(props.kafkaConsumerGroupId);
    }

    if (props.filterEncryption !== undefined && props.filters == undefined) {
      throw new ValidationError('filter criteria must be provided to enable setting filter criteria encryption', this);
    }

    /**
     * Grants the Lambda function permission to decrypt data using the specified KMS key.
     * This step is necessary for setting up encrypted filter criteria.
     *
     * If the KMS key was created within this CloudFormation stack (via `new Key`), a Key policy
     * will be attached to the key to allow the Lambda function to access it. However, if the
     * Key is imported from an existing ARN (`Key.fromKeyArn`), no action will be taken.
     */
    if (props.filterEncryption !== undefined) {
      const lambdaPrincipal = new iam.ServicePrincipal('lambda.amazonaws.com');
      props.filterEncryption.grantDecrypt(lambdaPrincipal);
    }

    let destinationConfig;
    if (props.onFailure) {
      destinationConfig = {
        onFailure: props.onFailure.bind(this, props.target),
      };
    }

    let selfManagedEventSource;
    if (props.kafkaBootstrapServers) {
      selfManagedEventSource = { endpoints: { kafkaBootstrapServers: props.kafkaBootstrapServers } };
    }

    let kafkaConfig: any;
    if (props.kafkaConsumerGroupId || props.schemaRegistryConfig) {
      kafkaConfig = {};
      if (props.kafkaConsumerGroupId) {
        kafkaConfig.consumerGroupId = props.kafkaConsumerGroupId;
      }
      if (props.schemaRegistryConfig) {
        const schemaRegistry = props.schemaRegistryConfig.bind(this, props.target);
        kafkaConfig.schemaRegistryConfig = {
          schemaRegistryUri: schemaRegistry.schemaRegistryUri,
          eventRecordFormat: schemaRegistry.eventRecordFormat.value,
          accessConfigs: schemaRegistry?.accessConfigs?.map((o) => {return { type: o.type.type, uri: o.uri };}),
          schemaValidationConfigs: schemaRegistry.schemaValidationConfigs?.map((o) => {return { attribute: o.attribute.value };}),
        };
      }
    }

    const cfnEventSourceMapping = new CfnEventSourceMapping(this, 'Resource', {
      batchSize: props.batchSize,
      bisectBatchOnFunctionError: props.bisectBatchOnError,
      destinationConfig,
      enabled: props.enabled,
      eventSourceArn: props.eventSourceArn,
      functionName: props.target.functionName,
      startingPosition: props.startingPosition,
      startingPositionTimestamp: props.startingPositionTimestamp,
      functionResponseTypes: props.reportBatchItemFailures ? ['ReportBatchItemFailures'] : undefined,
      maximumBatchingWindowInSeconds: props.maxBatchingWindow?.toSeconds(),
      maximumRecordAgeInSeconds: props.maxRecordAge?.toSeconds(),
      maximumRetryAttempts: props.retryAttempts,
      parallelizationFactor: props.parallelizationFactor,
      topics: props.kafkaTopic !== undefined ? [props.kafkaTopic] : undefined,
      tumblingWindowInSeconds: props.tumblingWindow?.toSeconds(),
      scalingConfig: props.maxConcurrency ? { maximumConcurrency: props.maxConcurrency } : undefined,
      sourceAccessConfigurations: props.sourceAccessConfigurations?.map((o) => {return { type: o.type.type, uri: o.uri };}),
      selfManagedEventSource,
      filterCriteria: props.filters ? { filters: props.filters }: undefined,
      kmsKeyArn: props.filterEncryption?.keyArn,
      selfManagedKafkaEventSourceConfig: props.kafkaBootstrapServers ? kafkaConfig : undefined,
      amazonManagedKafkaEventSourceConfig: props.eventSourceArn ? kafkaConfig : undefined,
      provisionedPollerConfig: props.provisionedPollerConfig,
      metricsConfig: props.metricsConfig,
    });
    this.eventSourceMappingId = cfnEventSourceMapping.ref;
    this.eventSourceMappingArn = EventSourceMapping.formatArn(this, this.eventSourceMappingId);
  }

  private validateKafkaConsumerGroupIdOrThrow(kafkaConsumerGroupId: string) {
    if (cdk.Token.isUnresolved(kafkaConsumerGroupId)) {
      return;
    }

    if (kafkaConsumerGroupId.length > 200 || kafkaConsumerGroupId.length < 1) {
      throw new ValidationError('kafkaConsumerGroupId must be a valid string between 1 and 200 characters', this);
    }

    const regex = new RegExp(/[a-zA-Z0-9-\/*:_+=.@-]*/);
    const patternMatch = regex.exec(kafkaConsumerGroupId);
    if (patternMatch === null || patternMatch[0] !== kafkaConsumerGroupId) {
      throw new ValidationError('kafkaConsumerGroupId contains invalid characters. Allowed values are "[a-zA-Z0-9-\/*:_+=.@-]"', this);
    }
  }
}

/**
 * The position in the DynamoDB, Kinesis or MSK stream where AWS Lambda should start
 * reading.
 */
export enum StartingPosition {
  /**
   * Start reading at the last untrimmed record in the shard in the system,
   * which is the oldest data record in the shard.
   */
  TRIM_HORIZON = 'TRIM_HORIZON',

  /**
   * Start reading just after the most recent record in the shard, so that you
   * always read the most recent data in the shard
   */
  LATEST = 'LATEST',

  /**
   * Start reading from a position defined by a time stamp.
   * Only supported for Amazon Kinesis streams, otherwise an error will occur.
   * If supplied, `startingPositionTimestamp` must also be set.
   */
  AT_TIMESTAMP = 'AT_TIMESTAMP',
}
