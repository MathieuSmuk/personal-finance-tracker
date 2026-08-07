export function getApiErrorMessage(data, fallbackMessage) {
  if (Array.isArray(data?.errors)) {
    return data.errors.map((error) => error.message).join(" ");
  }

  return data?.message || fallbackMessage;
}
