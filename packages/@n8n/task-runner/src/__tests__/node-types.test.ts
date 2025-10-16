import type { INodeTypeDescription } from 'n8n-workflow';
import { TaskRunnerNodeTypes } from '../node-types';

const SINGLE_VERSIONED = { name: 'single-versioned', version: 1 };
const SINGLE_UNVERSIONED = { name: 'single-unversioned' };
const MULTI_VERSIONED = { name: 'multi-versioned', version: [1, 2] };
const SPLIT_VERSIONED = [
	{ name: 'split-versioned', version: 1 },
	{ name: 'split-versioned', version: 2 },
];

// AI Agent tool node types for testing
const AI_TOOL_CODE = { name: '@n8n/n8n-nodes-langchain.ToolCode', version: 1 };
const AI_TOOL_WORKFLOW = { name: '@n8n/n8n-nodes-langchain.ToolWorkflow', version: 1 };
const AI_TOOL_HTTP = { name: '@n8n/n8n-nodes-langchain.ToolHttpRequest', version: 1 };

const TYPES: INodeTypeDescription[] = [
	SINGLE_VERSIONED,
	SINGLE_UNVERSIONED,
	MULTI_VERSIONED,
	...SPLIT_VERSIONED,
] as INodeTypeDescription[];

const TYPES_WITH_AI_TOOLS: INodeTypeDescription[] = [
	...TYPES,
	AI_TOOL_CODE,
	AI_TOOL_WORKFLOW,
	AI_TOOL_HTTP,
] as INodeTypeDescription[];

describe('TaskRunnerNodeTypes', () => {
	describe('getByNameAndVersion', () => {
		let nodeTypes: TaskRunnerNodeTypes;

		beforeEach(() => {
			nodeTypes = new TaskRunnerNodeTypes(TYPES);
		});

		it('should return undefined if not found', () => {
			expect(nodeTypes.getByNameAndVersion('unknown', 1)).toBeUndefined();
		});

		it('should return highest versioned node type if no version is given', () => {
			expect(nodeTypes.getByNameAndVersion('split-versioned')).toEqual({
				description: SPLIT_VERSIONED[1],
			});
		});

		it('should return specified version for split version', () => {
			expect(nodeTypes.getByNameAndVersion('split-versioned', 1)).toEqual({
				description: SPLIT_VERSIONED[0],
			});
		});

		it('should throw error on unknown version', () => {
			expect(() => nodeTypes.getByNameAndVersion('split-versioned', 3)).toThrow(
				'Version 3 of node type \'split-versioned\' not found',
			);
		});

		it('should return specified version for multi version', () => {
			expect(nodeTypes.getByNameAndVersion('multi-versioned', 1)).toEqual({
				description: MULTI_VERSIONED,
			});

			expect(nodeTypes.getByNameAndVersion('multi-versioned', 2)).toEqual({
				description: MULTI_VERSIONED,
			});
		});

		it('should default to DEFAULT_NODETYPE_VERSION if no version specified', () => {
			expect(nodeTypes.getByNameAndVersion('single-unversioned', 1)).toEqual({
				description: SINGLE_UNVERSIONED,
			});
		});

		it('should throw specific error for missing AI Agent tool nodes', () => {
			expect(() =>
				nodeTypes.getByNameAndVersion('@n8n/n8n-nodes-langchain.ToolCode', 1),
			).toThrow('AI Agent tool node type');
			expect(() =>
				nodeTypes.getByNameAndVersion('@n8n/n8n-nodes-langchain.ToolCode', 1),
			).toThrow('not found');
		});
	});

	describe('addNodeTypeDescriptions', () => {
		it('should add new node types', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES);

			const nodeTypeDescriptions = [
				{ name: 'new-type', version: 1 },
				{ name: 'new-type', version: 2 },
			] as INodeTypeDescription[];

			nodeTypes.addNodeTypeDescriptions(nodeTypeDescriptions);

			expect(nodeTypes.getByNameAndVersion('new-type', 1)).toEqual({
				description: { name: 'new-type', version: 1 },
			});

			expect(nodeTypes.getByNameAndVersion('new-type', 2)).toEqual({
				description: { name: 'new-type', version: 2 },
			});
		});
	});

	describe('onlyUnknown', () => {
		it('should return only unknown node types', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES);
			const candidate = { name: 'unknown', version: 1 };

			expect(nodeTypes.onlyUnknown([candidate])).toEqual([candidate]);
			expect(nodeTypes.onlyUnknown([SINGLE_VERSIONED])).toEqual([]);
		});
	});

	describe('AI Agent tool node recognition', () => {
		let nodeTypes: TaskRunnerNodeTypes;

		beforeEach(() => {
			nodeTypes = new TaskRunnerNodeTypes(TYPES_WITH_AI_TOOLS);
		});

		it('should recognize AI Agent tool nodes', () => {
			expect(nodeTypes.getByNameAndVersion('@n8n/n8n-nodes-langchain.ToolCode', 1)).toEqual({
				description: AI_TOOL_CODE,
			});

			expect(
				nodeTypes.getByNameAndVersion('@n8n/n8n-nodes-langchain.ToolWorkflow', 1),
			).toEqual({
				description: AI_TOOL_WORKFLOW,
			});

			expect(
				nodeTypes.getByNameAndVersion('@n8n/n8n-nodes-langchain.ToolHttpRequest', 1),
			).toEqual({
				description: AI_TOOL_HTTP,
			});
		});

		it('should throw enhanced error for missing AI Agent tool nodes', () => {
			const nodeTypesWithoutTools = new TaskRunnerNodeTypes(TYPES);

			expect(() =>
				nodeTypesWithoutTools.getByNameAndVersion(
					'@n8n/n8n-nodes-langchain.ToolCalculator',
					1,
				),
			).toThrow('AI Agent tool node type');
		});
	});

	describe('hasNodeType', () => {
		let nodeTypes: TaskRunnerNodeTypes;

		beforeEach(() => {
			nodeTypes = new TaskRunnerNodeTypes(TYPES);
		});

		it('should return true for registered node types', () => {
			expect(nodeTypes.hasNodeType('single-versioned')).toBe(true);
			expect(nodeTypes.hasNodeType('single-versioned', 1)).toBe(true);
		});

		it('should return false for unregistered node types', () => {
			expect(nodeTypes.hasNodeType('unknown')).toBe(false);
			expect(nodeTypes.hasNodeType('unknown', 1)).toBe(false);
		});

		it('should return false for wrong version of registered node', () => {
			expect(nodeTypes.hasNodeType('single-versioned', 99)).toBe(false);
		});
	});

	describe('getAllNodeTypeNames', () => {
		it('should return all registered node type names', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES);
			const names = nodeTypes.getAllNodeTypeNames();

			expect(names).toContain('single-versioned');
			expect(names).toContain('single-unversioned');
			expect(names).toContain('multi-versioned');
			expect(names).toContain('split-versioned');
		});

		it('should return all node types including AI Agent tools', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES_WITH_AI_TOOLS);
			const names = nodeTypes.getAllNodeTypeNames();

			expect(names).toContain('@n8n/n8n-nodes-langchain.ToolCode');
			expect(names).toContain('@n8n/n8n-nodes-langchain.ToolWorkflow');
			expect(names).toContain('@n8n/n8n-nodes-langchain.ToolHttpRequest');
		});
	});

	describe('Edge cases for $node[] syntax with AI Agent tools', () => {
		let nodeTypes: TaskRunnerNodeTypes;

		beforeEach(() => {
			nodeTypes = new TaskRunnerNodeTypes(TYPES_WITH_AI_TOOLS);
		});

		it('should handle workflows with AI Agent tool nodes and $node[] references', () => {
			// Simulate a workflow where a Code node uses $node[] to reference an AI Agent tool
			const toolNodeName = '@n8n/n8n-nodes-langchain.ToolCode';
			const toolNode = nodeTypes.getByNameAndVersion(toolNodeName, 1);

			expect(toolNode).toBeDefined();
			expect(toolNode.description.name).toBe(toolNodeName);
		});

		it('should verify all AI Agent tool nodes are registered when needed', () => {
			const requiredTools = [
				{ name: '@n8n/n8n-nodes-langchain.ToolCode', version: 1 },
				{ name: '@n8n/n8n-nodes-langchain.ToolWorkflow', version: 1 },
				{ name: '@n8n/n8n-nodes-langchain.ToolHttpRequest', version: 1 },
			];

			const unknown = nodeTypes.onlyUnknown(requiredTools);
			expect(unknown).toEqual([]);
		});

		it('should identify missing AI Agent tool nodes in workflows', () => {
			const nodeTypesWithoutTools = new TaskRunnerNodeTypes(TYPES);

			const requiredTools = [
				{ name: '@n8n/n8n-nodes-langchain.ToolCode', version: 1 },
				{ name: '@n8n/n8n-nodes-langchain.ToolWorkflow', version: 1 },
			];

			const unknown = nodeTypesWithoutTools.onlyUnknown(requiredTools);
			expect(unknown).toHaveLength(2);
			expect(unknown).toContainEqual(requiredTools[0]);
			expect(unknown).toContainEqual(requiredTools[1]);
		});
	});
});
