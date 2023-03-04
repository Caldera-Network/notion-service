/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type {
	GetDatabaseResponse,
	PageObjectResponse,
	PartialPageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { api } from './notion.utils';

// For each database object in the list, update or create a child database object
export const insertOrUpdateParentDatabase = async (
	parentDatabaseId: string,
	databaseUpdates: PageObjectResponse[],
) => {
	console.log('Updating parent database content...');
	const childIdsToAddParentIds: { parentId: string; childId: string }[] = [];
	for (const databaseUpdateObject of databaseUpdates) {
		let results: (PageObjectResponse | PartialPageObjectResponse)[] = [];
		try {
			const response = await api.databases.query({
				database_id: parentDatabaseId,
				filter: {
					property: 'ID',
					type: 'formula',
					formula: {
						string: {
							equals: (
								(databaseUpdateObject.properties as any)[
									'Corresponding ID'
								].rich_text[0].text.content as string
							).replaceAll('-', ''),
						},
					},
				},
			});
			results = response.results;
		} catch {
			//
		}

		if (results.length > 0 && results[0] && 'properties' in results[0]) {
			// Already exists, do not need to do anything other than update it

			console.log('1p');
			await api.pages.update({
				page_id: results[0].id,
				archived: databaseUpdateObject.archived,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...results[0].properties,
					...databaseUpdateObject.properties,
					'Sync?': {
						...results[0].properties['Sync?'],
					},
					'Last edited by': undefined,
					'Corresponding ID': undefined,
					ID: undefined,
				} as any,
			});
		} else {
			// Does not already exist, we need to store the Corresponding ID and send it to the child database

			console.log('2p');
			const createPageResponse = await api.pages.create({
				parent: {
					type: 'database_id',
					database_id: parentDatabaseId,
				},
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...databaseUpdateObject.properties,
					'Sync?': {
						checkbox: true,
					},
					'Last edited by': undefined,
					'Corresponding ID': undefined,
					ID: undefined,
				} as any,
			});
			childIdsToAddParentIds.push({
				parentId: createPageResponse.id.replaceAll('-', ''),
				childId: databaseUpdateObject.id.replaceAll('-', ''),
			});
		}
	}
	return childIdsToAddParentIds;
};

// if child database has properties that do not exist in parent database, add them
export const updatePropertiesParentDatabase = async (
	parentDatabaseResponse: GetDatabaseResponse,
	childDatabaseResponse: GetDatabaseResponse,
	parentDatabaseId: string,
) => {
	const parentDatabaseProperties = Object.keys(
		parentDatabaseResponse.properties,
	);
	const childDatabaseProperties = Object.keys(
		childDatabaseResponse.properties,
	);

	const propertiesToAdd = childDatabaseProperties.filter(
		(property) => !parentDatabaseProperties.includes(property),
	);

	if (propertiesToAdd.length === 0) return;

	// eslint-disable-next-line unicorn/no-array-reduce, unicorn/prefer-object-from-entries
	const propertiesToAddObject = propertiesToAdd.reduce(
		(accumulator, property) => ({
			...accumulator,
			[property]: parentDatabaseResponse.properties[property],
		}),
		{},
	);

	await api.databases.update({
		database_id: parentDatabaseId,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		properties: {
			...parentDatabaseResponse.properties,
			...propertiesToAddObject,
			'Corresponding ID': undefined,
			'Last edited by': undefined,
			'Sync?': undefined,
			ID: undefined,
		} as any,
	});
};
