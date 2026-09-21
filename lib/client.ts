export async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json"))
    throw new Error(
      response.status === 413
        ? "Файл слишком большой. Максимум — 16 МБ."
        : "Сервер временно недоступен. Попробуйте ещё раз.",
    );
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof TypeError || error instanceof SyntaxError
    ? "Сервер временно недоступен. Попробуйте ещё раз."
    : error instanceof Error
      ? error.message
      : "Сервер временно недоступен. Попробуйте ещё раз.";
}
