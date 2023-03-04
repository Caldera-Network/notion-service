import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { randomUUID } from 'node:crypto';
import { updatePropertiesChildDatabase } from './child-database';
import { updatePropertiesParentDatabase } from './parent-database';

let timeOfLastCheck = 0;
export const api = new Client({
	auth: process.env['NOTION_API_KEY'] || '',
});

const fetchUpdatedDatabase = async (
	database_id: string,
	time_since_last_check = 75_000, // TODO: 75_000 default?
) => {
	console.log(
		`Fetching updated database content... ${time_since_last_check}`,
	);
	const response = await api.databases.query({
		database_id,
		filter: {
			or: [
				{
					type: 'last_edited_time',
					timestamp: 'last_edited_time',
					last_edited_time: {
						on_or_after: new Date(
							Date.now() - time_since_last_check,
						).toISOString(),
					},
				},
				{
					type: 'created_time',
					timestamp: 'created_time',
					created_time: {
						on_or_after: new Date(
							Date.now() - time_since_last_check,
						).toISOString(),
					},
				},
			],
			and: [
				{
					property: 'Last edited by',
					last_edited_by: {
						does_not_contain:
							'67bc1c0e-9264-4d8f-9616-346bc7ae3d59',
					},
				},
			],
		},
	});
	return response.results;
};

/** Update Database Schemas */
export const updateDatabaseSchemas = async (parameters: {
	parentDatabaseId: string;
	childDatabaseId: string; // TODO: convert to array for one->many
}) => {
	console.log('Updating Database Schemas...');
	const { parentDatabaseId, childDatabaseId } = parameters;
	const parentDatabaseResponse = await api.databases.retrieve({
		database_id: parentDatabaseId,
	});
	const childDatabaseResponse = await api.databases.retrieve({
		database_id: childDatabaseId,
	});
	await updatePropertiesChildDatabase(
		parentDatabaseResponse,
		childDatabaseResponse,
		childDatabaseId,
	);
	await updatePropertiesParentDatabase(
		parentDatabaseResponse,
		childDatabaseResponse,
		childDatabaseId,
	);
};

export const mergeUpdatedItems = async (parameters: {
	parentDatabaseId: string;
	childDatabaseId: string;
}) => {
	const time = Date.now();
	const timeSinceTimeOfLastCheck = Date.now() - timeOfLastCheck;
	const parentUpdatedItems = await fetchUpdatedDatabase(
		parameters.parentDatabaseId,
		timeSinceTimeOfLastCheck,
	);
	const childUpdatedItems = await fetchUpdatedDatabase(
		parameters.childDatabaseId,
		timeSinceTimeOfLastCheck,
	);
	timeOfLastCheck = time;

	// Compare parentUpdatedItems and childUpdatedItems array
	// if item exists in both, compare update date and take newest
	// if item exists in one, completely take it for the opposite database array
	const parentForChild: PageObjectResponse[] = [];
	const childForParent: PageObjectResponse[] = [];
	for (const parentItem of parentUpdatedItems) {
		if (!('properties' in parentItem)) continue;
		const childItem = childUpdatedItems.find((childItem: any) => {
			if (!('properties' in childItem)) return false;
			try {
				return (
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					childItem.properties['Corresponding ID'] === parentItem.id
				);
			} catch {
				return false;
			}
		});
		if (childItem && 'properties' in childItem) {
			// Compare edited date
			if (parentItem.last_edited_time > childItem.last_edited_time) {
				// Take parent item
				parentForChild.push({
					...parentItem,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					properties: {
						...cleanupProperties(parentItem.properties),
						'Database Propagation': {
							type: 'rich_text',
							rich_text: [
								{
									type: 'text',
									text: {
										content: randomUUID(),
									},
								},
							],
						},
						'Corresponding ID': {
							type: 'rich_text',
							rich_text: [
								{
									type: 'text',
									text: {
										content: parentItem.id,
									},
								},
							],
						},
					} as any,
				});
				childForParent.push({
					...parentItem,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					properties: {
						...cleanupProperties(parentItem.properties),
						'Database Propagation': {
							type: 'rich_text',
							rich_text: [
								{
									type: 'text',
									text: {
										content: randomUUID(),
									},
								},
							],
						},
						'Corresponding ID': {
							type: 'rich_text',
							rich_text: [
								{
									type: 'text',
									text: {
										content: parentItem.id,
									},
								},
							],
						},
					} as any,
				});
			} else {
				// Take child item
				childForParent.push({
					...childItem,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					properties: {
						...cleanupProperties(childItem.properties),
						'Database Propagation': {
							type: 'rich_text',
							rich_text: [
								{
									type: 'text',
									text: {
										content: randomUUID(),
									},
								},
							],
						},
						'Sync?': {
							type: 'checkbox',
							checkbox: true, // NOTE: This is a vulnerability if a user can guess a parent's UUID and place it in the public database
						},
					} as any,
				});
			}
		} else {
			// Take parent item
			parentForChild.push({
				...parentItem,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...cleanupProperties(parentItem.properties),
					'Database Propagation': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: randomUUID(),
								},
							},
						],
					},
					'Corresponding ID': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: parentItem.id,
								},
							},
						],
					},
				} as any,
			});
			childForParent.push({
				...parentItem,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...cleanupProperties(parentItem.properties),
					'Database Propagation': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: randomUUID(),
								},
							},
						],
					},
					'Corresponding ID': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: parentItem.id,
								},
							},
						],
					},
				} as any,
			});
		}
	}
	for (const childItem of childUpdatedItems) {
		if (!('properties' in childItem)) continue;
		const parentItem = parentUpdatedItems.find(
			(parentItem) => parentItem.id === childItem.id,
		);
		if (!parentItem) {
			// Take child item
			childForParent.push({
				...childItem,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...cleanupProperties(childItem.properties),
					'Database Propagation': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: randomUUID(),
								},
							},
						],
					},
					'Sync?': {
						type: 'checkbox',
						checkbox: true, // NOTE: This is a vulnerability if a user can guess a parent's UUID and place it in the public database
					},
				} as any,
			});
		}
	}

	return { parentForChild, childForParent };
};

const cleanupProperties = (properties: PageObjectResponse['properties']) => {
	let temporaryProperties = { ...properties };
	temporaryProperties = removeRollupTypes(temporaryProperties);
	temporaryProperties = removeMultiSelectIds(temporaryProperties);
	return temporaryProperties;
};
const removeRollupTypes = (properties: PageObjectResponse['properties']) => {
	const temporaryProperties: Record<string, any> = { ...properties };
	for (const [key, value] of Object.entries(properties)) {
		if (value && value.type === 'rollup') {
			temporaryProperties[key] = undefined;
		}
	}
	return temporaryProperties;
};

const removeMultiSelectIds = (properties: PageObjectResponse['properties']) => {
	const temporaryProperties = { ...properties };
	for (const [key, value] of Object.entries(properties)) {
		if (value && value.type === 'multi_select') {
			temporaryProperties[key] = {
				...value,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				multi_select: value.multi_select.map((item: any) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						name: item.name,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						color: item.color,
					} as any;
				}),
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				id: undefined as any,
			};
		}
	}
	return temporaryProperties;
};
