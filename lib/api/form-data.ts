// Usable on the server and in the browser

type FormValue =
  | string
  | number
  | boolean
  | bigint
  | Date
  | Blob
  | null
  | undefined
  | FormValue[]
  | { [key: string]: FormValue };

function isPlainObject(value: unknown): value is Record<string, FormValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function append(formData: FormData, key: string, value: unknown) {
  if (value === null || value === undefined) return;

  // File extends Blob
  if (value instanceof Blob) {
    formData.append(key, value);
  } else if (value instanceof Date) {
    formData.append(key, value.toISOString());
  } else if (typeof value === "boolean") {
    // Laravel's `boolean` rule rejects "true"/"false"
    formData.append(key, value ? "1" : "0");
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (isPlainObject(item) || Array.isArray(item)) {
        append(formData, `${key}[${index}]`, item);
      } else {
        append(formData, `${key}[]`, item);
      }
    });
  } else if (isPlainObject(value)) {
    for (const [child, childValue] of Object.entries(value)) {
      append(formData, `${key}[${child}]`, childValue);
    }
  } else {
    formData.append(key, String(value));
  }
}

// Builds multipart FormData using PHP/Laravel bracket notation:
// { tags: ["a"], items: [{ id: 1 }], meta: { a: 1 } }
// → tags[]=a, items[0][id]=1, meta[a]=1
export function toFormData(values: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    append(formData, key, value);
  }

  return formData;
}
