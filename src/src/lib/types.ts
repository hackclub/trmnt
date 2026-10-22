// What pages receive from their server loads

import type { ProjectType } from '#lib/projects.ts';

export interface User {
	name: string;
	/** In BFTs */
	balance: number;
}

export interface Project {
	id: string;
	name: string;
	/** Time logged on the project */
	hours: number;
	/** Screenshot of the project. Cards show an empty black frame without one. */
	thumbnail?: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

/** One of the signed-in person's own projects, with what submitting it starts from */
export interface OwnProject extends Project {
	type: ProjectType;
	hackatimeProjects: string[];
	repoUrl: string | null;
	demoUrl: string | null;
	description: string;
	/** How its latest submission went; null if it's never been submitted */
	status: SubmissionStatus | null;
	/** Why the latest submission was sent back or rejected */
	reason: string | null;
	/** What its approval awarded */
	bftsAwarded: number | null;
}
