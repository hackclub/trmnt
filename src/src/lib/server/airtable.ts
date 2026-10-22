import { AIRTABLE_BASEID, AIRTABLE_TOKEN } from '$app/env/private';

// The program's own Airtable base, made from Hack Club's "YSWS Project Submissions" component.
// Approved projects become records here; its "Automation - Submit to Unified YSWS" checkbox then
// sends them on to the Unified YSWS database.
const TABLE = 'YSWS Project Submission';

export const airtableEnabled = Boolean(AIRTABLE_BASEID && AIRTABLE_TOKEN);

/** Creates a record from field names to values, and returns its ID */
export async function createSubmissionRecord(fields: Record<string, unknown>): Promise<string> {
	if (!airtableEnabled) throw new Error('Airtable isn’t set up');

	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASEID}/${encodeURIComponent(TABLE)}`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
			// Airtable leaves out fields set to null, and typecast fits plain values to field types
			body: JSON.stringify({ fields, typecast: true })
		}
	);
	if (!response.ok) {
		throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
	}
	const record: { id: string } = await response.json();
	return record.id;
}
