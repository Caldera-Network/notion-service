import type { Client } from '@notionhq/client';
import type {
	GetDatabaseResponse,
	PageObjectResponse,
	PartialPageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

// For each database object in the list, update or create a child database object
export const insertOrUpdateChildDatabase = async (
	api: Client,
	childDatabaseId: string,
	databaseUpdates: PageObjectResponse[],
) => {
	console.log("Updating child database's content...");
	for (const databaseUpdateObject of databaseUpdates) {
		let results: (PageObjectResponse | PartialPageObjectResponse)[] = [];
		try {
			const response = await api.databases.query({
				database_id: childDatabaseId,
				filter: {
					property: 'Corresponding ID',
					type: 'rich_text',
					rich_text: {
						equals: databaseUpdateObject.id,
					},
				},
			});
			results = response.results;
		} catch {
			//
		}

		if (results.length > 0 && results[0] && 'properties' in results[0]) {
			if (!('Sync?' in databaseUpdateObject.properties)) continue;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const syncProperty = databaseUpdateObject.properties[
				'Sync?'
			] as any; // FIXME
			console.log('1c');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, unicorn/prefer-ternary
			if (syncProperty.checkbox) {
				await api.pages.update({
					page_id: results[0].id,
					archived: databaseUpdateObject.archived,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					properties: {
						...results[0].properties,
						...databaseUpdateObject.properties,
						'Last edited by': undefined,
						ID: undefined,
						'Sync?': undefined,
					} as any,
				});
			} else {
				await api.pages.update({
					page_id: results[0].id,
					archived: true,
				});
			}
		} else {
			// if parent sync? is true, create child database object
			// if parent sync? is false, do nothing
			if (!('Sync?' in databaseUpdateObject.properties)) continue;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const syncProperty = databaseUpdateObject.properties[
				'Sync?'
			] as any; // FIXME
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (syncProperty.checkbox) {
				console.log('2c');
				await api.pages.create({
					parent: {
						type: 'database_id',
						database_id: childDatabaseId,
					},
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					properties: {
						...databaseUpdateObject.properties,
						'Last edited by': undefined,
						ID: undefined,
						'Sync?': undefined,
					} as any,
				});
			}
		}
	}
};

export const propogateParentIdsToChildDatabase = async (
	api: Client,
	childDatabaseId: string,
	databaseUpdates: {
		parentId: string;
		childId: string;
	}[],
) => {
	console.log("Updating child database's Corresponding ID...");
	for (const databaseUpdateObject of databaseUpdates) {
		const response = await api.databases.query({
			database_id: childDatabaseId,
			filter: {
				property: 'ID',
				type: 'formula',
				formula: {
					string: {
						equals: databaseUpdateObject.childId,
					},
				},
			},
		});
		const results = response.results;

		if (results.length > 0 && results[0] && 'properties' in results[0]) {
			await api.pages.update({
				page_id: results[0].id,
				archived: results[0].archived,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				properties: {
					...results[0].properties,
					'Corresponding ID': {
						type: 'rich_text',
						rich_text: [
							{
								type: 'text',
								text: {
									content: databaseUpdateObject.parentId,
								},
							},
						],
					},
					'Last edited by': undefined,
					ID: undefined,
					'Sync?': undefined,
				} as any,
			});
		} else {
			console.error(
				`Could not find child page with ID ${databaseUpdateObject.childId} in child database ${childDatabaseId}.`,
			);
		}
	}
};

// if parent database has properties that do not exist in child database, add them
export const updatePropertiesChildDatabase = async (
	api: Client,
	parentDatabaseResponse: GetDatabaseResponse,
	childDatabaseResponse: GetDatabaseResponse,
	childDatabaseId: string,
) => {
	const parentDatabaseProperties = Object.keys(
		parentDatabaseResponse.properties,
	);
	const childDatabaseProperties = Object.keys(
		childDatabaseResponse.properties,
	);

	const propertiesToAdd = parentDatabaseProperties.filter(
		(property) => !childDatabaseProperties.includes(property),
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
		database_id: childDatabaseId,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		properties: {
			...childDatabaseResponse.properties,
			...propertiesToAddObject,
			'Corresponding ID': {
				type: 'rich_text',
				rich_text: {},
			},
			Status: undefined,
			'Related to Public Assets (Related to Tasks (1) (Related to Assets (1) (Related Tasks)))':
				undefined,
			'Last edited by': undefined,
			'Sync?': undefined,
			ID: undefined,
		} as any,
	});
};
