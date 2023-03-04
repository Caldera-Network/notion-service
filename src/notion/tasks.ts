import { AsyncTask } from 'toad-scheduler';
import {
	insertOrUpdateChildDatabase,
	propogateParentIdsToChildDatabase,
} from './child-database';
import { insertOrUpdateParentDatabase } from './parent-database';
import { mergeUpdatedItems, updateDatabaseSchemas } from './notion.utils';

export const cloneToChildTask = (parameters: {
	parentDatabaseId: string;
	childDatabaseId: string;
}) => {
	return new AsyncTask('clone To Child Task', async () => {
		// Update Database Schemas
		await updateDatabaseSchemas(parameters);

		// Merge parentUpdatedItems and childUpdatedItems, creating two arrays of items to add to respective databases
		const { childForParent, parentForChild } = await mergeUpdatedItems(
			parameters,
		);

		// Update Parent Database and get any parentIds we need to update the child database with
		const parentIdsToPropagate = await insertOrUpdateParentDatabase(
			parameters.parentDatabaseId,
			childForParent,
		);

		// Propogate the parentIds down to child DB
		await propogateParentIdsToChildDatabase(
			parameters.childDatabaseId,
			parentIdsToPropagate,
		);
		// Propogate new data down to child DB
		await insertOrUpdateChildDatabase(
			parameters.childDatabaseId,
			parentForChild,
		);

		// TODO: Delete items from child DB that have a Corresponding ID that is not in the parent DB
	});
};
