import {
	ApplicationError,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypes,
	type IVersionedNodeType,
} from 'n8n-workflow';
import type { NeededNodeType } from './runner-types';

type VersionedTypes = Map<number, INodeTypeDescription>;

export const DEFAULT_NODETYPE_VERSION = 1;

// Common AI Agent tool node name patterns
const AI_AGENT_TOOL_PATTERNS = [
	'@n8n/n8n-nodes-langchain.tool',
	'@n8n/n8n-nodes-langchain.ToolCode',
	'@n8n/n8n-nodes-langchain.ToolWorkflow',
	'@n8n/n8n-nodes-langchain.ToolHttpRequest',
];

export class TaskRunnerNodeTypes implements INodeTypes {
	private nodeTypesByVersion: Map<string, VersionedTypes>;

	constructor(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypesByVersion = this.parseNodeTypes(nodeTypes);
	}

	private parseNodeTypes(nodeTypes: INodeTypeDescription[]): Map<string, VersionedTypes> {
		const versionedTypes = new Map<string, VersionedTypes>();

		for (const nt of nodeTypes) {
			const versions = Array.isArray(nt.version)
				? nt.version
				: [nt.version ?? DEFAULT_NODETYPE_VERSION];

			const versioned: VersionedTypes =
				versionedTypes.get(nt.name) ?? new Map<number, INodeTypeDescription>();

			for (const version of versions) {
				versioned.set(version, { ...versioned.get(version), ...nt });
			}

			versionedTypes.set(nt.name, versioned);
		}

		return versionedTypes;
	}

	// This isn't used in Workflow from what I can see
	getByName(_nodeType: string): INodeType | IVersionedNodeType {
		throw new ApplicationError('Unimplemented `getByName`', { level: 'error' });
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		const versions = this.nodeTypesByVersion.get(nodeType);

		if (!versions) {
			// Enhanced error handling for missing node types
			if (this.isAIAgentToolNode(nodeType)) {
				throw new ApplicationError(
					`AI Agent tool node type '${nodeType}' not found. Ensure tool nodes are properly registered.`,
					{ level: 'error', extra: { nodeType, version } },
				);
			}
			return undefined as unknown as INodeType;
		}

		const nodeVersion = versions.get(version ?? Math.max(...versions.keys()));

		if (!nodeVersion) {
			throw new ApplicationError(
				`Version ${version} of node type '${nodeType}' not found`,
				{ level: 'error', extra: { nodeType, version, availableVersions: Array.from(versions.keys()) } },
			);
		}

		return {
			description: nodeVersion,
		};
	}

	// This isn't used in Workflow from what I can see
	getKnownTypes(): IDataObject {
		throw new ApplicationError('Unimplemented `getKnownTypes`', { level: 'error' });
	}

	addNodeTypeDescriptions(nodeTypeDescriptions: INodeTypeDescription[]) {
		const newNodeTypes = this.parseNodeTypes(nodeTypeDescriptions);

		for (const [name, newVersions] of newNodeTypes.entries()) {
			if (!this.nodeTypesByVersion.has(name)) {
				this.nodeTypesByVersion.set(name, newVersions);
			} else {
				const existingVersions = this.nodeTypesByVersion.get(name)!;
				for (const [version, nodeType] of newVersions.entries()) {
					existingVersions.set(version, nodeType);
				}
			}
		}
	}

	/** Filter out node type versions that are already registered. */
	onlyUnknown(nodeTypes: NeededNodeType[]) {
		return nodeTypes.filter(({ name, version }) => {
			const existingVersions = this.nodeTypesByVersion.get(name);
			if (!existingVersions) return true;
			return !existingVersions.has(version);
		});
	}

	/** Check if a node type is an AI Agent tool node */
	private isAIAgentToolNode(nodeType: string): boolean {
		return AI_AGENT_TOOL_PATTERNS.some((pattern) => nodeType.startsWith(pattern));
	}

	/** Get all registered node types (useful for debugging) */
	getAllNodeTypeNames(): string[] {
		return Array.from(this.nodeTypesByVersion.keys());
	}

	/** Check if a specific node type is registered */
	hasNodeType(nodeType: string, version?: number): boolean {
		const versions = this.nodeTypesByVersion.get(nodeType);
		if (!versions) return false;
		if (version === undefined) return true;
		return versions.has(version);
	}
}
