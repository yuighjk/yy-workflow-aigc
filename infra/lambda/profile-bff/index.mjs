const blockedRequestHeaders = new Set([
	"connection",
	"content-length",
	"host",
	"transfer-encoding",
]);
const blockedResponseHeaders = new Set([
	"connection",
	"content-length",
	"transfer-encoding",
]);

const baseUrl = process.env.PROFILE_GO_BASE_URL;

export const handler = async (event) => {
	if (!baseUrl) {
		return jsonResponse(500, {
			error: "PROFILE_GO_BASE_URL is not configured",
		});
	}

	const method = event.requestContext?.http?.method ?? "GET";
	const rawPath = event.rawPath ?? "/";
	const rawQuery = event.rawQueryString ? `?${event.rawQueryString}` : "";
	const targetUrl = `${baseUrl}${rawPath}${rawQuery}`;
	const headers = Object.fromEntries(
		Object.entries(event.headers ?? {}).filter(
			([name]) => !blockedRequestHeaders.has(name.toLowerCase())
		)
	);
	const body = decodeRequestBody(event);

	try {
		const response = await fetch(targetUrl, {
			body: method === "GET" || method === "HEAD" ? undefined : body,
			headers,
			method,
			signal: AbortSignal.timeout(12_000),
		});
		const responseHeaders = Object.fromEntries(
			[...response.headers.entries()].filter(
				([name]) => !blockedResponseHeaders.has(name.toLowerCase())
			)
		);

		return {
			body: await response.text(),
			headers: responseHeaders,
			isBase64Encoded: false,
			statusCode: response.status,
		};
	} catch (error) {
		console.error("profile-go request failed", {
			message: error instanceof Error ? error.message : "unknown error",
			path: rawPath,
		});
		return jsonResponse(502, { error: "profile-go is unavailable" });
	}
};

const decodeRequestBody = (event) => {
	if (!event.body) {
		return;
	}
	if (event.isBase64Encoded) {
		return Buffer.from(event.body, "base64");
	}
	return event.body;
};

const jsonResponse = (statusCode, body) => ({
	body: JSON.stringify(body),
	headers: { "content-type": "application/json; charset=utf-8" },
	isBase64Encoded: false,
	statusCode,
});
