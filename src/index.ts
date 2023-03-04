import { ToadScheduler, SimpleIntervalJob } from 'toad-scheduler';
import { getClient } from './notion/notion.utils';
import { cloneToChildTask } from './notion/tasks';

const parentDatabaseIdAssets = process.env['NOTION_PARENT_DB'];
const childDatabaseIdAssets = process.env['NOTION_CHILD_DB'];
const notionApiKeyAssets = process.env['NOTION_API_KEY'];

const parentDatabaseIdTasks = process.env['NOTION_2_PARENT_DB'];
const childDatabaseIdTasks = process.env['NOTION_2_CHILD_DB'];
const notionApiKeyTasks = process.env['NOTION_2_API_KEY'];

if (
	!parentDatabaseIdAssets ||
	!childDatabaseIdAssets ||
	!notionApiKeyAssets ||
	!parentDatabaseIdTasks ||
	!childDatabaseIdTasks ||
	!notionApiKeyTasks
)
	throw new Error('Missing env variables');

const scheduler = new ToadScheduler();

// const assets = new SimpleIntervalJob(
// 	{ runImmediately: true, seconds: 1 },
// 	cloneToChildTask({
// 		parentDatabaseId: parentDatabaseIdAssets,
// 		childDatabaseId: childDatabaseIdAssets,
// 		api: getClient(notionApiKeyAssets),
// 	}),
// 	{
// 		preventOverrun: true,
// 	},
// );

const tasks = new SimpleIntervalJob(
	{ runImmediately: true, seconds: 1 },
	cloneToChildTask({
		parentDatabaseId: parentDatabaseIdTasks,
		childDatabaseId: childDatabaseIdTasks,
		api: getClient(notionApiKeyTasks),
	}),
	{
		preventOverrun: true,
	},
);

// scheduler.addSimpleIntervalJob(assets);
scheduler.addSimpleIntervalJob(tasks);
