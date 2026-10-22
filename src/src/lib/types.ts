// What pages receive from their server loads

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
