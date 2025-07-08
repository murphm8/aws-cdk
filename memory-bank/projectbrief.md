# AWS CDK Project Brief

## Project Overview
This is the **AWS Cloud Development Kit (AWS CDK)** - the official open-source repository maintained by Amazon Web Services. The CDK is a software development framework that allows developers to define cloud infrastructure using familiar programming languages instead of raw CloudFormation templates.

## Core Mission
Enable developers to define AWS cloud infrastructure imperatively using modern programming languages, providing a high-level object-oriented abstraction that encapsulates AWS best practices and reduces boilerplate complexity.

## Key Capabilities
- **Multi-language support**: TypeScript, JavaScript, Python, Java, .NET, Go
- **Construct-based architecture**: Reusable cloud components composed into stacks
- **CloudFormation integration**: Synthesizes to CloudFormation templates
- **Rich APIs**: Comprehensive library covering all AWS services
- **CLI tooling**: Complete command-line interface for deployment and management

## Repository Structure
- **Monorepo**: Uses Lerna workspace management
- **Packages**: Core libraries under `packages/` including `aws-cdk-lib` (main library)
- **Tools**: Build and development tools under `tools/`
- **Scripts**: Automation and utility scripts
- **Alpha packages**: Experimental features under `packages/@aws-cdk/*-alpha/`

## Build System
- **Primary**: Brazil build system (Amazon internal)
- **Package manager**: Yarn with workspaces
- **Languages**: TypeScript primary, with JSII for multi-language support

## Target Users
- Cloud developers and architects
- DevOps engineers
- Infrastructure as Code practitioners
- AWS customers wanting programmatic infrastructure definition

## Success Metrics
- Developer adoption across multiple languages
- Reduced infrastructure code complexity
- Community contributions and ecosystem growth
- Integration with AWS services and best practices
