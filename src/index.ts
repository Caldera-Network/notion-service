import { ToadScheduler, SimpleIntervalJob } from 'toad-scheduler';
import { cloneToChildTask } from './notion/tasks';

const parentDatabaseId = process.env['NOTION_PARENT_DB'];
const childDatabaseId = process.env['NOTION_CHILD_DB'];
const notionApiKey = process.env['NOTION_API_KEY'];

if (!parentDatabaseId || !childDatabaseId || !notionApiKey)
	throw new Error('Missing env variables');

const scheduler = new ToadScheduler();

const job = new SimpleIntervalJob(
	{ runImmediately: true, seconds: 1 },
	cloneToChildTask({
		parentDatabaseId,
		childDatabaseId,
	}),
	{
		preventOverrun: true,
	},
);

scheduler.addSimpleIntervalJob(job);
