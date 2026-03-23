import * as cdk from '../../core';
import * as pcs from '../lib';

describe('SlurmConfiguration', () => {
  describe('forCluster', () => {
    test('basic accounting config', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        accounting: {
          mode: pcs.AccountingMode.STANDARD,
        },
      });

      expect(config).toEqual({
        accounting: {
          mode: 'STANDARD',
          defaultPurgeTimeInDays: -1,
        },
      });
    });

    test('accounting with mode and purgeTime', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        accounting: {
          mode: pcs.AccountingMode.STANDARD,
          defaultPurgeTimeInDays: 90,
        },
      });

      expect(config).toEqual({
        accounting: {
          mode: 'STANDARD',
          defaultPurgeTimeInDays: 90,
        },
      });
    });

    test('authKey with secretArn and explicit secretVersion', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-key',
          secretVersion: 'v2',
        },
      });

      expect(config).toEqual({
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-key',
          secretVersion: 'v2',
        },
      });
    });

    test('authKey with default secretVersion', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-key',
        },
      });

      expect(config).toEqual({
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-key',
          secretVersion: 'AWSCURRENT',
        },
      });
    });

    test('scaleDownIdleTimeInSeconds passthrough', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        scaleDownIdleTimeInSeconds: 600,
      });

      expect(config).toEqual({
        scaleDownIdleTimeInSeconds: 600,
      });
    });

    test('customSettings array mapping', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        customSettings: [
          { parameterName: 'Param1', parameterValue: 'Value1' },
          { parameterName: 'Param2', parameterValue: 'Value2' },
        ],
      });

      expect(config).toEqual({
        slurmCustomSettings: [
          { parameterName: 'Param1', parameterValue: 'Value1' },
          { parameterName: 'Param2', parameterValue: 'Value2' },
        ],
      });
    });

    test('JwtAuth passthrough with explicit secretVersion', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        jwtAuth: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
          secretVersion: '3',
        },
      });

      expect(config).toEqual({
        jwtAuth: {
          jwtKey: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
            secretVersion: '3',
          },
        },
      });
    });

    test('JwtAuth with default secretVersion', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        jwtAuth: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
        },
      });

      expect(config).toEqual({
        jwtAuth: {
          jwtKey: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
            secretVersion: '1',
          },
        },
      });
    });

    test('SlurmRest with STANDARD mode', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        slurmRest: {
          mode: pcs.SlurmRestMode.STANDARD,
        },
      });

      expect(config).toEqual({
        slurmRest: {
          mode: 'STANDARD',
        },
      });
    });

    test('SlurmRest with NONE mode', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        slurmRest: {
          mode: pcs.SlurmRestMode.NONE,
        },
      });

      expect(config).toEqual({
        slurmRest: {
          mode: 'NONE',
        },
      });
    });

    test('full complex config with all properties', () => {
      const config = pcs.SlurmConfiguration.forCluster({
        accounting: {
          mode: pcs.AccountingMode.STANDARD,
          defaultPurgeTimeInDays: 30,
        },
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:auth-key',
          secretVersion: 'AWSCURRENT',
        },
        scaleDownIdleTimeInSeconds: 300,
        customSettings: [
          { parameterName: 'SelectTypeParameters', parameterValue: 'CR_Core_Memory' },
        ],
        jwtAuth: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
          secretVersion: '2',
        },
        slurmRest: {
          mode: pcs.SlurmRestMode.STANDARD,
        },
      });

      expect(config).toEqual({
        accounting: {
          mode: 'STANDARD',
          defaultPurgeTimeInDays: 30,
        },
        authKey: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:auth-key',
          secretVersion: 'AWSCURRENT',
        },
        scaleDownIdleTimeInSeconds: 300,
        slurmCustomSettings: [
          { parameterName: 'SelectTypeParameters', parameterValue: 'CR_Core_Memory' },
        ],
        jwtAuth: {
          jwtKey: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:jwt-key',
            secretVersion: '2',
          },
        },
        slurmRest: {
          mode: 'STANDARD',
        },
      });
    });

    test('empty config returns empty object', () => {
      const config = pcs.SlurmConfiguration.forCluster({});

      expect(config).toEqual({});
    });
  });

  describe('forCluster validations', () => {
    test('scaleDownIdleTimeInSeconds = 0 throws', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          scaleDownIdleTimeInSeconds: 0,
        });
      }).toThrow(/scaleDownIdleTimeInSeconds must be >= 1/);
    });

    test('scaleDownIdleTimeInSeconds = -1 throws', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          scaleDownIdleTimeInSeconds: -1,
        });
      }).toThrow(/scaleDownIdleTimeInSeconds must be >= 1/);
    });

    test('scaleDownIdleTimeInSeconds = 1 succeeds', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          scaleDownIdleTimeInSeconds: 1,
        });
      }).not.toThrow();
    });

    test('scaleDownIdleTimeInSeconds with Token skips validation', () => {
      const tokenValue = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 0 }));
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          scaleDownIdleTimeInSeconds: tokenValue,
        });
      }).not.toThrow();
    });

    test('defaultPurgeTimeInDays = 0 throws', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: 0,
          },
        });
      }).toThrow(/defaultPurgeTimeInDays cannot be 0/);
    });

    test('defaultPurgeTimeInDays = -2 throws', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: -2,
          },
        });
      }).toThrow(/defaultPurgeTimeInDays must be between -1 and 10000/);
    });

    test('defaultPurgeTimeInDays = 10001 throws', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: 10001,
          },
        });
      }).toThrow(/defaultPurgeTimeInDays must be between -1 and 10000/);
    });

    test('defaultPurgeTimeInDays = -1 succeeds (special: no purge)', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: -1,
          },
        });
      }).not.toThrow();
    });

    test('defaultPurgeTimeInDays = 1 succeeds', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: 1,
          },
        });
      }).not.toThrow();
    });

    test('defaultPurgeTimeInDays = 10000 succeeds', () => {
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: 10000,
          },
        });
      }).not.toThrow();
    });

    test('defaultPurgeTimeInDays with Token skips validation', () => {
      const tokenValue = cdk.Token.asNumber(cdk.Lazy.number({ produce: () => 0 }));
      expect(() => {
        pcs.SlurmConfiguration.forCluster({
          accounting: {
            defaultPurgeTimeInDays: tokenValue,
          },
        });
      }).not.toThrow();
    });
  });

  describe('forComputeNodeGroup', () => {
    test('custom settings mapping', () => {
      const config = pcs.SlurmConfiguration.forComputeNodeGroup({
        customSettings: [
          { parameterName: 'Weight', parameterValue: '10' },
        ],
      });

      expect(config).toEqual({
        slurmCustomSettings: [
          { parameterName: 'Weight', parameterValue: '10' },
        ],
      });
    });

    test('empty config returns empty object', () => {
      const config = pcs.SlurmConfiguration.forComputeNodeGroup({});

      expect(config).toEqual({});
    });
  });

  describe('forQueue', () => {
    test('custom settings mapping', () => {
      const config = pcs.SlurmConfiguration.forQueue({
        customSettings: [
          { parameterName: 'MaxTime', parameterValue: '24:00:00' },
        ],
      });

      expect(config).toEqual({
        slurmCustomSettings: [
          { parameterName: 'MaxTime', parameterValue: '24:00:00' },
        ],
      });
    });

    test('empty config returns empty object', () => {
      const config = pcs.SlurmConfiguration.forQueue({});

      expect(config).toEqual({});
    });
  });

  describe('standardAccounting', () => {
    test('with default purge time (30 days)', () => {
      const accounting = pcs.SlurmConfiguration.standardAccounting();

      expect(accounting).toEqual({
        mode: 'STANDARD',
        defaultPurgeTimeInDays: 30,
      });
    });

    test('with custom purge time', () => {
      const accounting = pcs.SlurmConfiguration.standardAccounting(90);

      expect(accounting).toEqual({
        mode: 'STANDARD',
        defaultPurgeTimeInDays: 90,
      });
    });
  });

  describe('commonHpcSettings', () => {
    test('returns expected settings', () => {
      const settings = pcs.SlurmConfiguration.commonHpcSettings();

      expect(settings).toEqual([
        {
          parameterName: 'SelectTypeParameters',
          parameterValue: 'CR_Core_Memory',
        },
      ]);
    });
  });
});
