/**
 * The scheduler software used by AWS PCS
 */
export enum SchedulerType {
  /**
   * Slurm workload manager
   */
  SLURM = 'SLURM',
}

/**
 * The size of the cluster
 */
export enum ClusterSize {
  /**
   * Small cluster configuration
   */
  SMALL = 'SMALL',

  /**
   * Medium cluster configuration
   */
  MEDIUM = 'MEDIUM',

  /**
   * Large cluster configuration
   */
  LARGE = 'LARGE',
}

/**
 * EC2 instance purchasing options
 */
export enum PurchaseOption {
  /**
   * On-Demand instances
   */
  ON_DEMAND = 'ONDEMAND',

  /**
   * Spot instances
   */
  SPOT = 'SPOT',

  /**
   * Amazon EC2 Capacity Blocks for ML
   * @see https://docs.aws.amazon.com/pcs/latest/userguide/capacity-blocks.html
   */
  CAPACITY_BLOCK = 'CAPACITY_BLOCK',
}

/**
 * Spot instance allocation strategies
 */
export enum SpotAllocationStrategy {
  /**
   * Lowest price strategy
   */
  LOWEST_PRICE = 'lowest-price',

  /**
   * Capacity optimized strategy
   */
  CAPACITY_OPTIMIZED = 'capacity-optimized',

  /**
   * Price capacity optimized strategy (default)
   */
  PRICE_CAPACITY_OPTIMIZED = 'price-capacity-optimized',
}

/**
 * Slurm accounting modes
 */
export enum AccountingMode {
  /**
   * No accounting enabled
   */
  NONE = 'NONE',

  /**
   * Standard accounting enabled
   */
  STANDARD = 'STANDARD',
}

/**
 * The IP address type for cluster networking
 */
export enum NetworkType {
  /**
   * IPv4 networking
   */
  IPV4 = 'IPV4',

  /**
   * IPv6 networking
   */
  IPV6 = 'IPV6',
}

/**
 * Mode for the Slurm REST API
 */
export enum SlurmRestMode {
  /**
   * Slurm REST API is enabled
   */
  STANDARD = 'STANDARD',

  /**
   * Slurm REST API is disabled
   */
  NONE = 'NONE',
}
