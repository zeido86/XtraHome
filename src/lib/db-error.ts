export function dbErrorMessage(error: unknown, fallback: string) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : "";
  if (
    code === "P2021" ||
    /does not exist|RoomMember|relation .* does not exist/i.test(message)
  ) {
    return "Databasen saknar nya tabeller. Kör GitHub Actions → Database Sync med seed.";
  }
  return fallback;
}
