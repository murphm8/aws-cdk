import { AccountingMode, SlurmRestMode } from './enums';
import { CfnCluster, CfnComputeNodeGroup, CfnQueue } from './pcs.generated';

/**
 * Properties for configuring Slurm accounting
 */
export interface SlurmAccountingProps {
  /**
   * The accounting mode
   *
   * @default AccountingMode.NONE
   */
  readonly mode?: AccountingMode;

  /**
   * The default purge time in days for accounting records
   *
   * @default -1 (no purge)
   */
  readonly defaultPurgeTimeInDays?: number;
}

/**
 * Properties for configuring Slurm authentication key
 */
export interface SlurmAuthKeyProps {
  /**
   * The ARN of the AWS Secrets Manager secret containing the Slurm auth key
   */
  readonly secretArn: string;

  /**
   * The version of the secret to use
   *
   * @default 'AWSCURRENT'
   */
  readonly secretVersion?: string;
}

/**
 * A Slurm custom setting parameter
 */
export interface SlurmCustomSetting {
  /**
   * The parameter name
   */
  readonly parameterName: string;

  /**
   * The parameter value
   */
  readonly parameterValue: string;
}

/**
 * Properties for configuring JWT authentication for Slurm
 */
export interface JwtAuthProps {
  /**
   * The ARN of the AWS Secrets Manager secret containing the JWT key
   */
  readonly secretArn: string;

  /**
   * The version of the secret to use
   * @default '1'
   */
  readonly secretVersion?: string;
}

/**
 * Properties for configuring the Slurm REST API
 */
export interface SlurmRestProps {
  /**
   * The mode for the Slurm REST API
   */
  readonly mode: SlurmRestMode;
}

/**
 * Properties for configuring Slurm settings on a cluster
 */
export interface ClusterSlurmConfigurationProps {
  /**
   * Slurm accounting configuration
   *
   * @default - No accounting configured
   */
  readonly accounting?: SlurmAccountingProps;

  /**
   * Slurm authentication key configuration
   *
   * @default - No auth key configured
   */
  readonly authKey?: SlurmAuthKeyProps;

  /**
   * The time before an idle node is scaled down (in seconds)
   *
   * @default 300 (5 minutes)
   */
  readonly scaleDownIdleTimeInSeconds?: number;

  /**
   * Additional custom Slurm settings
   *
   * @default - No custom settings
   */
  readonly customSettings?: SlurmCustomSetting[];

  /**
   * JWT authentication configuration for the Slurm scheduler
   * @default - No JWT auth configured
   */
  readonly jwtAuth?: JwtAuthProps;

  /**
   * Slurm REST API configuration
   * @default - No SlurmRest configured
   */
  readonly slurmRest?: SlurmRestProps;
}

/**
 * Properties for configuring Slurm settings on a compute node group
 */
export interface ComputeNodeGroupSlurmConfigurationProps {
  /**
   * Additional custom Slurm settings for the compute node group
   *
   * @default - No custom settings
   */
  readonly customSettings?: SlurmCustomSetting[];
}

/**
 * Properties for configuring Slurm settings on a queue
 */
export interface QueueSlurmConfigurationProps {
  /**
   * Additional custom Slurm settings for the queue
   * @default - No custom settings
   */
  readonly customSettings?: SlurmCustomSetting[];
}

/**
 * Helper class for building Slurm configurations
 */
export class SlurmConfiguration {
  /**
   * Creates a Slurm configuration for a cluster
   */
  public static forCluster(props: ClusterSlurmConfigurationProps): CfnCluster.SlurmConfigurationProperty {
    const result: any = {};

    if (props.accounting) {
      result.accounting = {
        mode: props.accounting.mode || AccountingMode.NONE,
        defaultPurgeTimeInDays: props.accounting.defaultPurgeTimeInDays ?? -1,
      };
    }

    if (props.authKey) {
      result.authKey = {
        secretArn: props.authKey.secretArn,
        secretVersion: props.authKey.secretVersion || 'AWSCURRENT',
      };
    }

    if (props.scaleDownIdleTimeInSeconds !== undefined) {
      result.scaleDownIdleTimeInSeconds = props.scaleDownIdleTimeInSeconds;
    }

    if (props.customSettings && props.customSettings.length > 0) {
      result.slurmCustomSettings = props.customSettings.map(setting => ({
        parameterName: setting.parameterName,
        parameterValue: setting.parameterValue,
      }));
    }

    if (props.jwtAuth) {
      result.jwtAuth = {
        jwtKey: {
          secretArn: props.jwtAuth.secretArn,
          secretVersion: props.jwtAuth.secretVersion ?? '1',
        },
      };
    }

    if (props.slurmRest) {
      result.slurmRest = {
        mode: props.slurmRest.mode,
      };
    }

    return result;
  }

  /**
   * Creates a Slurm configuration for a compute node group
   */
  public static forComputeNodeGroup(props: ComputeNodeGroupSlurmConfigurationProps): CfnComputeNodeGroup.SlurmConfigurationProperty {
    const result: any = {};

    if (props.customSettings && props.customSettings.length > 0) {
      result.slurmCustomSettings = props.customSettings.map(setting => ({
        parameterName: setting.parameterName,
        parameterValue: setting.parameterValue,
      }));
    }

    return result;
  }

  /**
   * Creates a Slurm configuration for a queue
   */
  public static forQueue(props: QueueSlurmConfigurationProps): CfnQueue.SlurmConfigurationProperty {
    const result: any = {};

    if (props.customSettings && props.customSettings.length > 0) {
      result.slurmCustomSettings = props.customSettings.map(setting => ({
        parameterName: setting.parameterName,
        parameterValue: setting.parameterValue,
      }));
    }

    return result;
  }

  /**
   * Creates a standard accounting configuration with reasonable defaults
   */
  public static standardAccounting(purgeTimeInDays?: number): SlurmAccountingProps {
    return {
      mode: AccountingMode.STANDARD,
      defaultPurgeTimeInDays: purgeTimeInDays ?? 30,
    };
  }

  /**
   * Creates common Slurm custom settings for HPC workloads
   */
  public static commonHpcSettings(): SlurmCustomSetting[] {
    return [
      {
        parameterName: 'SelectTypeParameters',
        parameterValue: 'CR_Core_Memory',
      },
    ];
  }
}
