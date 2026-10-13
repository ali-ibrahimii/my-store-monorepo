/** آیا مقدار متغیر محیطی جای‌نگهدار (نمونه) است؟ */
export function isPlaceholderValue(value: string | undefined | null): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return true;
  return (
    trimmed.includes("YOUR_PROJECT") ||
    trimmed.includes("your-anon-key") ||
    trimmed.includes("your-publishable-key") ||
    trimmed.includes("your-service-role-key") ||
    trimmed.includes("your-secret-key") ||
    trimmed === "change-me"
  );
}
