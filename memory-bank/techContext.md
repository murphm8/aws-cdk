# Technical Context

## Technology Stack

### Primary Languages
- **TypeScript**: Core implementation language
- **JavaScript**: Runtime and CLI tooling
- **Python**: Code generation scripts and utilities
- **Shell**: Build automation and CI/CD scripts

### Supported Target Languages (via JSII)
- **TypeScript/JavaScript**: Native implementation
- **Python**: Generated bindings (`aws-cdk-lib`)
- **Java**: Generated bindings (`software.amazon.awscdk`)
- **C#/.NET**: Generated bindings (`Amazon.CDK.Lib`)
- **Go**: Generated bindings (`github.com/aws/aws-cdk-go`)

## Development Environment

### Required Software
- **Node.js**: >= 20.x (Active LTS recommended)
- **Python**: >= 3.8 (for scripts and Python bindings)
- **Java**: >= 8 (for Java bindings)
- **Maven**: >= 3.5.4 (for Java packaging)
- **Yarn**: Package management and workspace handling

### Build Tools
- **Brazil**: Amazon internal build system (primary)
- **Lerna**: Monorepo management and publishing
- **TypeScript**: Compilation and type checking
- **JSII**: Cross-language binding generation
- **Jest**: Testing framework
- **ESLint**: Code quality and style

### Key Configuration Files
- `lerna.json`: Monorepo configuration
- `package.json`: Root workspace and scripts
- `tsconfig.json`: TypeScript compilation settings
- `nx.json`: Nx workspace configuration for task orchestration

## Dependencies

### Core Runtime Dependencies
- **constructs**: Base construct framework (external)
- **jsii**: JavaScript interop interface
- **aws-cdk-lib**: Main CDK library (self-contained)

### Development Dependencies
- **jsii-pacmak**: Multi-language package generation
- **jsii-diff**: API compatibility validation
- **typescript**: TypeScript compiler
- **@types/node**: Node.js type definitions
- **ts-jest**: TypeScript Jest integration

### Build System Dependencies
- **@nx/workspace**: Task orchestration
- **conventional-changelog-cli**: Changelog generation
- **standard-version**: Release automation
- **aws-sdk-js-codemod**: SDK migration utilities

## Technical Constraints

### Language Compatibility
- **JSII limitations**: Only subset of TypeScript features supported
- **Type serialization**: Complex types must be JSII-compatible
- **Async limitations**: Limited async/await support in JSII context
- **Node.js binding**: Ultimately runs on Node.js runtime

### CloudFormation Constraints
- **Template limits**: 51,200 bytes max template size
- **Resource limits**: 500 resources per stack maximum
- **Property constraints**: Must adhere to CloudFormation property schemas
- **Deployment dependencies**: CloudFormation dependency ordering

### Version Compatibility
- **Node.js versions**: Must support LTS versions
- **AWS SDK compatibility**: Aligned with AWS service releases
- **Backward compatibility**: Semantic versioning for stable APIs

## Development Workflow

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/aws/aws-cdk.git
cd aws-cdk

# Install dependencies
yarn install

# Build all packages
./build.sh

# Run tests
yarn test
```

### Brazil Development (Amazon Internal)
```bash
# Build with Brazil
brazil-build

# Run tests with Brazil
bb test

# Package with Brazil
bb package
```

### Package Development
```bash
# Work on specific package
cd packages/aws-cdk-lib

# Build single package
yarn build

# Run package tests
yarn test

# Check API compatibility
yarn compat
```

## Testing Strategy

### Test Types
- **Unit tests**: Individual construct behavior
- **Template tests**: CloudFormation template validation
- **Integration tests**: Deploy to actual AWS resources
- **Compatibility tests**: API backward compatibility

### Testing Tools
- **Jest**: Primary testing framework
- **CDK assertions**: Template testing utilities
- **AWS CDK CLI**: Integration test execution
- **jsii-diff**: API compatibility validation

## Release Process

### Version Management
- **Semantic versioning**: Major.Minor.Patch for stable APIs
- **Alpha versioning**: Independent versioning for experimental packages
- **Coordinated releases**: All language bindings released together

### Automation
- **Conventional commits**: Automated changelog generation
- **Multi-language publishing**: JSII pacmak generates all language packages
- **CI/CD pipelines**: Automated testing and publishing
- **Version alignment**: All packages maintain version consistency

## Tool Usage Patterns

### CLI Development
```bash
# Install CDK CLI globally
npm install -g aws-cdk

# Initialize new project
cdk init app --language typescript

# Deploy stack
cdk deploy

# Generate CloudFormation
cdk synth
```

### Library Development
- **Construct authoring**: Follow construct pattern guidelines
- **Props interfaces**: Configuration through TypeScript interfaces
- **Resource grants**: Permission management through grant methods
- **Asset handling**: File and Docker image bundling support

## Integration Points

### AWS Services
- **CloudFormation**: Primary deployment backend
- **IAM**: Permission and role management
- **S3**: Asset storage and retrieval
- **ECR**: Docker image storage
- **Systems Manager**: Parameter storage

### External Tools
- **Docker**: Container image building and deployment
- **npm/PyPI/Maven/NuGet**: Package distribution
- **GitHub**: Source control and issue tracking
- **AWS CLI**: Credential management and AWS interaction
