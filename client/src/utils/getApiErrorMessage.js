export function getApiErrorMessage(data, fallbackMessage) {
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((error) => error.message).join(" ");
  }

  return data?.message || fallbackMessage;
}
