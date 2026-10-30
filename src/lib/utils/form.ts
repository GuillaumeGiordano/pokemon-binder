/** A text field of a submitted form ("" when missing). */
export const field = (form: FormData, name: string) => String(form.get(name) ?? '');
