# System Patterns

## Architecture Overview

### Monorepo Structure
- **Lerna-managed workspace**: Single repository containing multiple related packages
- **Hierarchical organization**: Core libraries, tools, and experimental packages
- **Shared build system**: Consistent build, test, and release processes across packages

### Core Package Architecture

#### aws-cdk-lib (Main Library)
- **Consolidated package**: Single npm package containing all stable AWS service modules
- **L1 Constructs**: Direct CloudFormation resource mappings (generated)
- **L2 Constructs**: Higher-level abstractions with sane defaults
- **L3 Constructs**: Opinionated patterns solving common use cases

#### Alpha Packages
- **Experimental features**: `packages/@aws-cdk/*-alpha/`
- **Separate versioning**: Independent of main library version
- **Migration path**: Eventually graduate to stable aws-cdk-lib

## Design Patterns

### Construct Pattern
```typescript
// Base pattern for all CDK constructs
export class MyConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id);
    // Implementation
  }
}
```

### Builder Pattern for Configuration
```typescript
// Fluent APIs for complex configurations
const table = new dynamodb.Table(this, 'MyTable', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

### Composition over Inheritance
- **Constructs compose other constructs** rather than extending base classes
- **Mixins and interfaces** for shared behavior
- **Props interfaces** for configuration injection

## Key Technical Decisions

### JSII (JavaScript Interop Interface)
- **Cross-language support**: Single TypeScript codebase generates bindings for multiple languages
- **Type safety**: Maintains type information across language boundaries
- **API consistency**: Same API surface across all supported languages

### CloudFormation as Backend
- **Template generation**: CDK synthesizes to CloudFormation templates
- **State management**: Leverages CloudFormation's declarative state management
- **AWS integration**: Native support for all CloudFormation features

### Node Tree Structure
- **Hierarchical scoping**: Every construct exists within a scope
- **Unique IDs**: Automatically generated logical IDs prevent conflicts
- **Metadata propagation**: Tags and other metadata flow down the tree

## Build System Integration

### Brazil Build System
- **Primary build system**: Amazon internal build system
- **Package management**: Integrated with Brazil package manager
- **NPM compatibility**: Transparent NPM command pass-through via bb

### Development Workflow
```bash
# Build entire monorepo
./build.sh

# Run specific package tests
bb test --scope @aws-cdk/aws-s3

# Lint all packages
yarn run pkglint

# Generate API compatibility reports
./scripts/check-api-compatibility.sh
```

## Component Relationships

### Core Library Dependencies
- **@aws-cdk/core** → **aws-cdk-lib/core**: Core construct framework
- **Service modules**: Each AWS service has dedicated module (e.g., aws-s3, aws-lambda)
- **Cross-service integration**: Modules can reference and integrate with each other

### Tool Dependencies
- **pkglint**: Package consistency checking
- **awslint**: AWS-specific API linting rules
- **jsii-diff**: API compatibility validation
- **cdk-build-tools**: Shared build utilities

## Implementation Patterns

### Resource Encapsulation
- **High-level constructs** hide implementation details
- **Sensible defaults** reduce configuration burden
- **Escape hatches** allow access to underlying CloudFormation properties

### Event-Driven Integration
- **Grant methods**: `bucket.grantRead(lambda)` sets up permissions
- **Event sources**: Easy integration between services
- **Implicit dependencies**: Constructs automatically set up required dependencies

### Testing Strategies
- **Template assertions**: Validate generated CloudFormation
- **Integration tests**: Deploy and test actual AWS resources
- **Unit tests**: Test individual construct behavior

## Critical Implementation Paths

### Code Generation Pipeline
1. **CFN spec ingestion**: CloudFormation specification → L1 construct generation
2. **JSII compilation**: TypeScript → multi-language bindings
3. **Package publishing**: Coordinated release across all language packages

### Synthesis Process
1. **App construction**: Build construct tree
2. **Template synthesis**: Convert constructs to CloudFormation
3. **Asset bundling**: Handle file assets and Docker images
4. **Template output**: Generate deployable CloudFormation templates
