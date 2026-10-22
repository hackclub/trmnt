import { TOKEN_ENCRYPTION_KEY } from '$app/env/private';

const IV_BYTES = 12;

let key: Promise<CryptoKey> | undefined;

function getKey() {
	key ??= crypto.subtle.importKey('raw', TOKEN_ENCRYPTION_KEY, 'AES-GCM', false, [
		'encrypt',
		'decrypt'
	]);
	return key;
}

/** AES-256-GCM, stored as base64 of the IV followed by the ciphertext (which ends in the auth tag) */
export async function encrypt(plaintext: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		await getKey(),
		new TextEncoder().encode(plaintext)
	);
	const stored = new Uint8Array(IV_BYTES + ciphertext.byteLength);
	stored.set(iv);
	stored.set(new Uint8Array(ciphertext), IV_BYTES);
	return stored.toBase64();
}

export async function decrypt(stored: string): Promise<string> {
	const bytes = Uint8Array.fromBase64(stored);
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: bytes.subarray(0, IV_BYTES) },
		await getKey(),
		bytes.subarray(IV_BYTES)
	);
	return new TextDecoder().decode(plaintext);
}

export function sha256(value: string): string {
	return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

/** 256 random bits, safe to put in a cookie */
export function randomToken(): string {
	return crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: 'base64url', omitPadding: true });
}
