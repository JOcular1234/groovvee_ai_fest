"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Country-select + dial-code phone input, themed via .phone-field in
// globals.css. `international` renders the "+1" prefix inside the input, so
// the element's value already carries the country code — FormData picks up a
// full international number with no hidden field. Server-side validation
// (isValidPhoneNumber) is still the authority.
export function PhoneField({
  id,
  name,
  required,
  value,
  onChange,
  invalid,
  errorId,
}: {
  id: string;
  name: string;
  required?: boolean;
  // Optional controlled mode — pass value/onChange so the field survives a
  // failed server-action submit (uncontrolled fields get reset).
  value?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  errorId?: string;
}) {
  return (
    <PhoneInput
      id={id}
      name={name}
      international
      countryCallingCodeEditable={false}
      defaultCountry="US"
      autoComplete="tel"
      required={required}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      className="phone-field"
    />
  );
}
